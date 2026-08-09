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
        return { success: false, message: 'Failed to parse or restore backup file.' };
      }
    } catch (e: any) {
      return { success: false, message: `Import error: ${e.message || 'Invalid format'}` };
    }
  },
};
