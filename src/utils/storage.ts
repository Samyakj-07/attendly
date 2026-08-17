import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StudentProfile,
  Subject,
  TimetableSlot,
  AttendanceRecord,
  AcademicExam,
} from '../types';

const KEYS = {
  PROFILE: '@ipu_profile_v1',
  SUBJECTS: '@ipu_subjects_v1',
  TIMETABLE: '@ipu_timetable_v1',
  RECORDS: '@ipu_records_v1',
  EXAMS: '@ipu_exams_v1',
};

export const AppStorage = {
  async saveProfile(profile: StudentProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving profile:', e);
    }
  },

  async loadProfile(): Promise<StudentProfile | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading profile:', e);
      return null;
    }
  },

  async saveSubjects(subjects: Subject[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SUBJECTS, JSON.stringify(subjects));
    } catch (e) {
      console.error('Error saving subjects:', e);
    }
  },

  async loadSubjects(): Promise<Subject[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SUBJECTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading subjects:', e);
      return [];
    }
  },

  async saveTimetable(slots: TimetableSlot[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TIMETABLE, JSON.stringify(slots));
    } catch (e) {
      console.error('Error saving timetable:', e);
    }
  },

  async loadTimetable(): Promise<TimetableSlot[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TIMETABLE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading timetable:', e);
      return [];
    }
  },

  async saveRecords(records: AttendanceRecord[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving records:', e);
    }
  },

  async loadRecords(): Promise<AttendanceRecord[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.RECORDS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading records:', e);
      return [];
    }
  },

  async saveExams(exams: AcademicExam[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.EXAMS, JSON.stringify(exams));
    } catch (e) {
      console.error('Error saving exams:', e);
    }
  },

  async loadExams(): Promise<AcademicExam[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.EXAMS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading exams:', e);
      return [];
    }
  },

  async exportFullBackup(): Promise<string> {
    const [profile, subjects, timetable, records, exams] = await Promise.all([
      this.loadProfile(),
      this.loadSubjects(),
      this.loadTimetable(),
      this.loadRecords(),
      this.loadExams(),
    ]);

    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile,
      subjects,
      timetable,
      records,
      exams,
    };

    return JSON.stringify(backup, null, 2);
  },

  async importFullBackup(jsonString: string): Promise<boolean> {
    try {
      if (!jsonString || typeof jsonString !== 'string') return false;

      // 1. Clean markdown code fences and wrappers
      let cleaned = jsonString.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
      }

      // 2. Replace smart/curly quotes with standard quotes
      cleaned = cleaned
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'");

      // 3. Parse JSON
      let parsed = JSON.parse(cleaned);

      // Handle wrapper objects like { data: { ... } } or { backup: { ... } }
      if (!parsed.profile && !parsed.subjects && (parsed.data || parsed.backup)) {
        parsed = parsed.data || parsed.backup;
      }

      // 4. Restore entities with verification
      const promises: Promise<any>[] = [];
      if (parsed.profile && typeof parsed.profile === 'object') {
        promises.push(this.saveProfile(parsed.profile));
      }
      if (Array.isArray(parsed.subjects)) {
        promises.push(this.saveSubjects(parsed.subjects));
      }
      if (Array.isArray(parsed.timetable)) {
        promises.push(this.saveTimetable(parsed.timetable));
      }
      if (Array.isArray(parsed.records)) {
        promises.push(this.saveRecords(parsed.records));
      }
      if (Array.isArray(parsed.exams)) {
        promises.push(this.saveExams(parsed.exams));
      }

      if (promises.length === 0) {
        return false;
      }

      await Promise.all(promises);
      return true;
    } catch (e) {
      console.error('Error importing backup:', e);
      return false;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.PROFILE,
        KEYS.SUBJECTS,
        KEYS.TIMETABLE,
        KEYS.RECORDS,
        KEYS.EXAMS,
      ]);
    } catch (e) {
      console.error('Error clearing data:', e);
    }
  },
};
