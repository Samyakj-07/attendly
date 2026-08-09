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
      const parsed = JSON.parse(jsonString);
      if (parsed.profile) await this.saveProfile(parsed.profile);
      if (parsed.subjects) await this.saveSubjects(parsed.subjects);
      if (parsed.timetable) await this.saveTimetable(parsed.timetable);
      if (parsed.records) await this.saveRecords(parsed.records);
      if (parsed.exams) await this.saveExams(parsed.exams);
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
