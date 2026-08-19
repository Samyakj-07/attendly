import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StudentProfile,
  Subject,
  TimetableSlot,
  AttendanceRecord,
  AcademicExam,
  SubjectType,
  DayOfWeek,
  AttendanceStatus,
} from '../types';
import { getLocalDateString } from './ipuEngine';

const KEYS = {
  PROFILE: '@ipu_profile_v1',
  SUBJECTS: '@ipu_subjects_v1',
  TIMETABLE: '@ipu_timetable_v1',
  RECORDS: '@ipu_records_v1',
  EXAMS: '@ipu_exams_v1',
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const isDateString = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const isTimeString = (value: string): boolean => {
  const trimmed = value.trim();
  return /^([01]?\d|2[0-3]):[0-5]\d(\s?(AM|PM|am|pm))?$/.test(trimmed);
};

const sanitizeTime = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return isTimeString(trimmed) ? trimmed : fallback;
};

// ─── Runtime Schema Sanitizers & Validators ──────────────────────────────────

export function sanitizeProfile(data: any): StudentProfile | null {
  if (!data || typeof data !== 'object') return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 6 = July
  const defaultSession = currentMonth < 6
    ? `${currentYear - 1}–${currentYear.toString().slice(2)}`
    : `${currentYear}–${(currentYear + 1).toString().slice(2)}`;
  return {
    name: typeof data.name === 'string' ? data.name.trim() : 'Student',
    enrollmentNumber: typeof data.enrollmentNumber === 'string' ? data.enrollmentNumber.trim() : '',
    rollNumber: typeof data.rollNumber === 'string' ? data.rollNumber.trim() : '',
    college: typeof data.college === 'string' ? data.college.trim() : '',
    collegeShort: typeof data.collegeShort === 'string' ? data.collegeShort.trim() : 'IPU',
    programme: typeof data.programme === 'string' ? data.programme.trim() : 'B.Tech',
    branch: typeof data.branch === 'string' ? data.branch.trim() : 'CSE',
    semester: clampNumber(data.semester, 1, 1, 12),
    section: typeof data.section === 'string' ? data.section.trim() : 'A',
    academicSession: typeof data.academicSession === 'string' ? data.academicSession.trim() : defaultSession,
    targetAttendance: clampNumber(data.targetAttendance, 75, 1, 100),
    isIPUMode: typeof data.isIPUMode === 'boolean' ? data.isIPUMode : true,
    isOnboarded: typeof data.isOnboarded === 'boolean' ? data.isOnboarded : true,
  };
}


export function sanitizeSubjects(list: any[]): Subject[] {
  if (!Array.isArray(list)) return [];
  const validTypes: SubjectType[] = [
    'Theory',
    'Lab',
    'Practical',
    'Tutorial',
    'Elective',
    'Open Elective',
    'Skill Enhancement',
    'Project',
  ];

  return list
    .filter(s => s && typeof s === 'object' && typeof s.name === 'string' && s.name.trim().length > 0)
    .map((s, idx) => {
      const type: SubjectType = validTypes.includes(s.type) ? s.type : 'Theory';
      const attended = clampNumber(s.attended, 0, 0, 10000);
      const total = Math.max(attended, clampNumber(s.total, attended, 0, 10000));
      const isLab2x = typeof s.isLab2x === 'boolean' ? s.isLab2x : type === 'Lab';

      return {
        id: typeof s.id === 'string' && s.id.length > 0 ? s.id : `sub_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        name: s.name.trim(),
        code: typeof s.code === 'string' && s.code.trim().length > 0 ? s.code.trim().toUpperCase() : `SUB-${idx + 1}`,
        type,
        credits: clampNumber(s.credits, 4, 0, 20),
        ltp: typeof s.ltp === 'string' ? s.ltp : '3-0-0',
        faculty: typeof s.faculty === 'string' ? s.faculty.trim() : '',
        room: typeof s.room === 'string' ? s.room.trim() : '',
        targetRequirement: clampNumber(s.targetRequirement, 75, 1, 100),
        attended,
        total,
        cancelled: clampNumber(s.cancelled, 0, 0, 10000),
        od: clampNumber(s.od, 0, 0, 10000),
        isLab2x,
        colorAccent: typeof s.colorAccent === 'string' ? s.colorAccent : typeof s.color === 'string' ? s.color : '#38BDF8',
      };
    });
}

export function sanitizeTimetable(list: any[]): TimetableSlot[] {
  if (!Array.isArray(list)) return [];
  const validDays: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const validTypes: SubjectType[] = [
    'Theory',
    'Lab',
    'Practical',
    'Tutorial',
    'Elective',
    'Open Elective',
    'Skill Enhancement',
    'Project',
  ];

  return list
    .filter(t => t && typeof t === 'object' && validDays.includes(t.day))
    .map((t, idx) => ({
      id: typeof t.id === 'string' && t.id.length > 0 ? t.id : `slot_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      day: t.day as DayOfWeek,
      startTime: sanitizeTime(t.startTime, '09:30'),
      endTime: sanitizeTime(t.endTime, '10:30'),
      subjectId: typeof t.subjectId === 'string' ? t.subjectId : `sub_${idx}`,
      subjectName: typeof t.subjectName === 'string' ? t.subjectName.trim() : 'Course',
      subjectCode: typeof t.subjectCode === 'string' ? t.subjectCode.trim().toUpperCase() : 'SUB-101',
      type: validTypes.includes(t.type) ? t.type : 'Theory',
      room: typeof t.room === 'string' ? t.room.trim() : '',
      faculty: typeof t.faculty === 'string' ? t.faculty.trim() : '',
    }));
}

export function sanitizeRecords(list: any[]): AttendanceRecord[] {
  if (!Array.isArray(list)) return [];
  const validStatuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'CANCELLED', 'OD'];

  return list
    .filter(r => r && typeof r === 'object' && typeof r.subjectId === 'string' && validStatuses.includes(r.status))
    .map((r, idx) => ({
      id: typeof r.id === 'string' && r.id.length > 0 ? r.id : `rec_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      date: typeof r.date === 'string' && isDateString(r.date.trim()) ? r.date.trim() : getLocalDateString(),
      timestamp: Number.isFinite(r.timestamp) ? r.timestamp : Date.now(),
      subjectId: r.subjectId,
      subjectName: typeof r.subjectName === 'string' ? r.subjectName : 'Course',
      subjectCode: typeof r.subjectCode === 'string' ? r.subjectCode.toUpperCase() : 'SUB',
      status: r.status as AttendanceStatus,
      slotTime: typeof r.slotTime === 'string' ? r.slotTime : undefined,
      room: typeof r.room === 'string' ? r.room : undefined,
      note: typeof r.note === 'string' ? r.note : undefined,
      isEdited: typeof r.isEdited === 'boolean' ? r.isEdited : undefined,
      editedAt: typeof r.editedAt === 'string' ? r.editedAt : undefined,
      unitCount: Number.isFinite(r.unitCount) && r.unitCount > 0 ? r.unitCount : undefined,
      attendedDelta: Number.isFinite(r.attendedDelta) ? r.attendedDelta : undefined,
      totalDelta: Number.isFinite(r.totalDelta) ? r.totalDelta : undefined,
      isAdjustment: typeof r.isAdjustment === 'boolean' ? r.isAdjustment : undefined,
    }));
}

export function sanitizeExams(list: any[]): AcademicExam[] {
  if (!Array.isArray(list)) return [];
  const validExamTypes = ['Mid-Sem', 'End-Sem', 'Practical', 'Internal', 'Project'] as const;

  return list
    .filter(e => e && typeof e === 'object' && typeof e.name === 'string' && e.name.trim().length > 0)
    .map((e, idx) => ({
      id: typeof e.id === 'string' && e.id.length > 0 ? e.id : `exam_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      name: e.name.trim(),
      type: validExamTypes.includes(e.type) ? e.type : 'Mid-Sem',
      date: typeof e.date === 'string' && isDateString(e.date.trim()) ? e.date.trim() : getLocalDateString(),
    }));
}

export function pruneOrphanedEntities(
  subjects: Subject[],
  timetable: TimetableSlot[],
  records: AttendanceRecord[]
): { validTimetable: TimetableSlot[]; validRecords: AttendanceRecord[] } {
  if (!subjects) {
    return { validTimetable: timetable, validRecords: records };
  }
  if (subjects.length === 0) {
    return { validTimetable: [], validRecords: [] };
  }
  const subjectIds = new Set(subjects.map(subject => subject.id));
  return {
    validTimetable: timetable.filter(slot => subjectIds.has(slot.subjectId)),
    validRecords: records.filter(record => subjectIds.has(record.subjectId)),
  };
}

export function validateBackupRelationships(
  subjects: Subject[],
  timetable: TimetableSlot[],
  records: AttendanceRecord[]
): boolean {
  if (!subjects || subjects.length === 0) return true;
  const subjectIds = new Set(subjects.map(subject => subject.id));
  return (
    timetable.every(slot => subjectIds.has(slot.subjectId)) &&
    records.every(record => subjectIds.has(record.subjectId))
  );
}

// ─── Storage Layer Interface ──────────────────────────────────────────────────

export interface AtomicBatchPayload {
  profile?: StudentProfile;
  subjects?: Subject[];
  timetable?: TimetableSlot[];
  records?: AttendanceRecord[];
  exams?: AcademicExam[];
}

export const AppStorage = {
  async saveProfile(profile: StudentProfile): Promise<void> {
    const sanitized = sanitizeProfile(profile);
    if (sanitized) {
      await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(sanitized));
    }
  },

  async loadProfile(): Promise<StudentProfile | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PROFILE);
      return data ? sanitizeProfile(JSON.parse(data)) : null;
    } catch (e) {
      console.error('Error loading profile:', e);
      return null;
    }
  },

  async saveSubjects(subjects: Subject[]): Promise<void> {
    const sanitized = sanitizeSubjects(subjects);
    await AsyncStorage.setItem(KEYS.SUBJECTS, JSON.stringify(sanitized));
  },

  async loadSubjects(): Promise<Subject[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SUBJECTS);
      return data ? sanitizeSubjects(JSON.parse(data)) : [];
    } catch (e) {
      console.error('Error loading subjects:', e);
      return [];
    }
  },

  async saveTimetable(slots: TimetableSlot[]): Promise<void> {
    const sanitized = sanitizeTimetable(slots);
    await AsyncStorage.setItem(KEYS.TIMETABLE, JSON.stringify(sanitized));
  },

  async loadTimetable(): Promise<TimetableSlot[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TIMETABLE);
      return data ? sanitizeTimetable(JSON.parse(data)) : [];
    } catch (e) {
      console.error('Error loading timetable:', e);
      return [];
    }
  },

  async saveRecords(records: AttendanceRecord[]): Promise<void> {
    const sanitized = sanitizeRecords(records);
    await AsyncStorage.setItem(KEYS.RECORDS, JSON.stringify(sanitized));
  },

  async loadRecords(): Promise<AttendanceRecord[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.RECORDS);
      return data ? sanitizeRecords(JSON.parse(data)) : [];
    } catch (e) {
      console.error('Error loading records:', e);
      return [];
    }
  },

  async saveExams(exams: AcademicExam[]): Promise<void> {
    const sanitized = sanitizeExams(exams);
    await AsyncStorage.setItem(KEYS.EXAMS, JSON.stringify(sanitized));
  },

  async loadExams(): Promise<AcademicExam[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.EXAMS);
      return data ? sanitizeExams(JSON.parse(data)) : [];
    } catch (e) {
      console.error('Error loading exams:', e);
      return [];
    }
  },

  /**
   * Performs an atomic multi-key write operation via AsyncStorage.multiSet().
   * Guarantees that either all provided keys are committed together, or none.
   */
  async saveAtomicBatch(batch: AtomicBatchPayload): Promise<void> {
    const entries: [string, string][] = [];

    if (batch.profile !== undefined) {
      const sanitized = sanitizeProfile(batch.profile);
      if (sanitized) entries.push([KEYS.PROFILE, JSON.stringify(sanitized)]);
    }
    if (batch.subjects !== undefined) {
      entries.push([KEYS.SUBJECTS, JSON.stringify(sanitizeSubjects(batch.subjects))]);
    }
    if (batch.timetable !== undefined) {
      entries.push([KEYS.TIMETABLE, JSON.stringify(sanitizeTimetable(batch.timetable))]);
    }
    if (batch.records !== undefined) {
      entries.push([KEYS.RECORDS, JSON.stringify(sanitizeRecords(batch.records))]);
    }
    if (batch.exams !== undefined) {
      entries.push([KEYS.EXAMS, JSON.stringify(sanitizeExams(batch.exams))]);
    }

    if (entries.length > 0) {
      await AsyncStorage.multiSet(entries);
    }
  },

  /**
   * Computes an approximate storage size in bytes for all tracked keys.
   */
  async getStorageSizeEstimate(): Promise<{ totalBytes: number; entityBytes: Record<string, number> }> {
    try {
      const keys = [KEYS.PROFILE, KEYS.SUBJECTS, KEYS.TIMETABLE, KEYS.RECORDS, KEYS.EXAMS];
      const entries = await AsyncStorage.multiGet(keys);
      let totalBytes = 0;
      const entityBytes: Record<string, number> = {};

      const getByteLength = (str: string): number => {
        try {
          return encodeURI(str).split(/%..|./).length - 1;
        } catch {
          return str.length * 2;
        }
      };

      for (const [key, value] of entries) {
        const bytes = value ? getByteLength(value) : 0;
        entityBytes[key] = bytes;
        totalBytes += bytes;
      }

      return { totalBytes, entityBytes };
    } catch {
      return { totalBytes: 0, entityBytes: {} };
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

      // Guard against excessively large payloads to avoid freezing the JS thread
      if (jsonString.length > 2 * 1024 * 1024) {
        console.warn('Backup payload exceeds maximum safe limit of 2MB.');
        return false;
      }

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

      if (!parsed || typeof parsed !== 'object') {
        return false;
      }

      // 4. Sanitize and validate entities with strict maximum count safeguards
      const MAX_SUBJECTS = 100;
      const MAX_TIMETABLE_SLOTS = 300;
      const MAX_RECORDS = 5000;
      const MAX_EXAMS = 100;

      const rawSubjects = Array.isArray(parsed.subjects) ? parsed.subjects.slice(0, MAX_SUBJECTS) : [];
      const rawTimetable = Array.isArray(parsed.timetable) ? parsed.timetable.slice(0, MAX_TIMETABLE_SLOTS) : [];
      const rawRecords = Array.isArray(parsed.records) ? parsed.records.slice(0, MAX_RECORDS) : [];
      const rawExams = Array.isArray(parsed.exams) ? parsed.exams.slice(0, MAX_EXAMS) : [];

      const sanitizedProfile = parsed.profile ? sanitizeProfile(parsed.profile) : null;
      const sanitizedSubjects = sanitizeSubjects(rawSubjects);
      let sanitizedTimetable = sanitizeTimetable(rawTimetable);
      let sanitizedRecords = sanitizeRecords(rawRecords);
      const sanitizedExams = sanitizeExams(rawExams);

      // Auto-heal and prune orphaned entities if subjects are present
      if (sanitizedSubjects.length > 0) {
        const { validTimetable, validRecords } = pruneOrphanedEntities(
          sanitizedSubjects,
          sanitizedTimetable,
          sanitizedRecords
        );
        sanitizedTimetable = validTimetable;
        sanitizedRecords = validRecords;
      }

      const entries: [string, string][] = [];
      if (sanitizedProfile) entries.push([KEYS.PROFILE, JSON.stringify(sanitizedProfile)]);
      entries.push([KEYS.SUBJECTS, JSON.stringify(sanitizedSubjects)]);
      entries.push([KEYS.TIMETABLE, JSON.stringify(sanitizedTimetable)]);
      entries.push([KEYS.RECORDS, JSON.stringify(sanitizedRecords)]);
      entries.push([KEYS.EXAMS, JSON.stringify(sanitizedExams)]);

      if (entries.length === 0) return false;

      // 5. Capture pre-import snapshot for rollback protection in case write fails
      const keysToBackup = [KEYS.PROFILE, KEYS.SUBJECTS, KEYS.TIMETABLE, KEYS.RECORDS, KEYS.EXAMS];
      const previousEntries = await AsyncStorage.multiGet(keysToBackup);

      try {
        await AsyncStorage.multiSet(entries);
        return true;
      } catch (writeErr) {
        console.error('Storage multiSet failed, rolling back to previous snapshot:', writeErr);
        const rollbackPairs: [string, string][] = [];
        const keysToRemove: string[] = [];

        for (const [k, v] of previousEntries) {
          if (v !== null) {
            rollbackPairs.push([k, v]);
          } else {
            keysToRemove.push(k);
          }
        }

        if (rollbackPairs.length > 0) {
          await AsyncStorage.multiSet(rollbackPairs).catch(rbErr => {
            console.error('Fatal rollback write error:', rbErr);
          });
        }
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove).catch(rmErr => {
            console.error('Fatal rollback cleanup error:', rmErr);
          });
        }
        return false;
      }
    } catch (e) {
      console.error('Error importing backup:', e);
      return false;
    }
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.PROFILE,
      KEYS.SUBJECTS,
      KEYS.TIMETABLE,
      KEYS.RECORDS,
      KEYS.EXAMS,
    ]);
  },
};
