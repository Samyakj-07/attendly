import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { AppStorage } from './storage';

export const BackupManager = {
  /**
   * Generates a backup JSON file and opens the native Share/Save sheet (Google Drive, iCloud, Files, etc.)
   */
  async exportBackupFile(collegeShort: string = 'IPU', studentName: string = 'Student'): Promise<boolean> {
    try {
      const backupJson = await AppStorage.exportFullBackup();
      const sanitizedName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `${collegeShort}_Attendance_Backup_${sanitizedName}_${dateStr}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      }

      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, backupJson, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: `Save ${fileName} to Google Drive / Files`,
          UTI: 'public.json',
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error exporting backup file:', error);
      return false;
    }
  },

  /**
   * Imports a backup from raw JSON string and restores all local entities.
   */
  async restoreFromJSON(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!jsonString || !jsonString.trim()) {
        return { success: false, message: 'Please provide valid backup data.' };
      }
      const success = await AppStorage.importFullBackup(jsonString.trim());
      if (success) {
        return { success: true, message: 'Semester backup restored successfully!' };
      } else {
        return { success: false, message: 'Failed to parse or restore backup file. Ensure the entire JSON code was copied.' };
      }
    } catch (e: any) {
      return { success: false, message: `Import error: ${e.message || 'Invalid format'}` };
    }
  },

  /**
   * Validates and inspects a JSON string without committing to storage.
   */
  inspectBackup(jsonString: string): {
    valid: boolean;
    error?: string;
    stats?: {
      studentName?: string;
      college?: string;
      subjectCount: number;
      slotCount: number;
      recordCount: number;
      examCount: number;
      exportedAt?: string;
    };
  } {
    try {
      if (!jsonString || !jsonString.trim()) {
        return { valid: false, error: 'Input is empty' };
      }
      let cleaned = jsonString.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
      }
      cleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

      let parsed = JSON.parse(cleaned);
      if (!parsed.profile && !parsed.subjects && (parsed.data || parsed.backup)) {
        parsed = parsed.data || parsed.backup;
      }

      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, error: 'Invalid JSON object structure' };
      }

      const subjectCount = Array.isArray(parsed.subjects) ? parsed.subjects.length : 0;
      const slotCount = Array.isArray(parsed.timetable) ? parsed.timetable.length : 0;
      const recordCount = Array.isArray(parsed.records) ? parsed.records.length : 0;
      const examCount = Array.isArray(parsed.exams) ? parsed.exams.length : 0;

      if (!parsed.profile && subjectCount === 0 && slotCount === 0 && recordCount === 0) {
        return { valid: false, error: 'JSON does not contain Attendly data (missing courses/timetable/records)' };
      }

      return {
        valid: true,
        stats: {
          studentName: parsed.profile?.name,
          college: parsed.profile?.collegeShort || parsed.profile?.college,
          subjectCount,
          slotCount,
          recordCount,
          examCount,
          exportedAt: parsed.exportedAt,
        },
      };
    } catch (e: any) {
      return { valid: false, error: e.message || 'Malformed JSON syntax' };
    }
  },
};
