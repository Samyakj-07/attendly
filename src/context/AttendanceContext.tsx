import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import {
  StudentProfile,
  Subject,
  TimetableSlot,
  AttendanceRecord,
  AcademicExam,
  AttendanceStatus,
  SkipRecommendationReport,
  SemesterHealthReport,
} from '../types';
import { AppStorage } from '../utils/storage';
import {
  attendancePercentage,
  attendanceBuffer,
  analyzeTodaySkip,
  calculateSemesterHealth,
  timeToMinutes,
  isSlotMatchingRecord,
  normalizeTimeString,
  getLocalDateString,
} from '../utils/ipuEngine';
import { AppHaptics } from '../utils/haptics';
import { Analytics } from '../utils/analytics';

interface AttendanceContextType {
  profile: StudentProfile;
  subjects: Subject[];
  timetable: TimetableSlot[];
  records: AttendanceRecord[];
  exams: AcademicExam[];
  isLoading: boolean;
  
  // Computed
  overallPercentage: number;
  overallBuffer: number;
  totalAttended: number;
  totalClasses: number;
  todayDay: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  isSunday: boolean;
  todaySlots: TimetableSlot[];
  todaySkipReport: SkipRecommendationReport;
  semesterHealth: SemesterHealthReport;
  lastActionBatch: any | null;
  
  // Actions
  updateProfile: (profile: StudentProfile) => Promise<void>;
  markAttendance: (
    subjectId: string,
    status: AttendanceStatus,
    slotInfo?: { time?: string; room?: string; note?: string; date?: string }
  ) => Promise<void>;
  markAllSlotsAttendance: (
    slots: TimetableSlot[],
    targetStatus?: AttendanceStatus,
    dateStr?: string
  ) => Promise<void>;
  undoLastAction: () => Promise<void>;
  editAttendanceRecord: (
    recordId: string,
    newStatus: AttendanceStatus,
    note?: string
  ) => Promise<void>;
  deleteAttendanceRecord: (recordId: string) => Promise<void>;
  
  addSubject: (subject: Partial<Subject> & { name: string; code: string }) => Promise<Subject>;
  updateSubject: (subject: Subject) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => Promise<void>;
  addMultipleTimetableSlots: (slots: Omit<TimetableSlot, 'id'>[]) => Promise<void>;
  batchAddTimetableSlots: (
    newSlots: Omit<TimetableSlot, 'id'>[],
    newSubjectsList?: Partial<Subject>[]
  ) => Promise<void>;
  updateTimetableSlot: (slot: TimetableSlot) => Promise<void>;
  deleteTimetableSlot: (slotId: string) => Promise<void>;
  
  addExam: (exam: Omit<AcademicExam, 'id'>) => Promise<void>;
  updateExam: (exam: AcademicExam) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
  
  reloadAllData: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

const DEFAULT_PROFILE: StudentProfile = {
  name: 'Student',
  enrollmentNumber: '',
  rollNumber: '',
  college: 'Guru Gobind Singh Indraprastha University',
  collegeShort: 'GGSIPU',
  programme: 'B.Tech',
  branch: 'Computer Science & Engineering',
  semester: 1,
  section: 'A',
  academicSession: '2026–27',
  targetAttendance: 75,
  isIPUMode: true,
  isOnboarded: false,
};

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<StudentProfile>(DEFAULT_PROFILE);
  const [subjects, setSubjectsState] = useState<Subject[]>([]);
  const [timetable, setTimetableState] = useState<TimetableSlot[]>([]);
  const [records, setRecordsState] = useState<AttendanceRecord[]>([]);
  const [exams, setExamsState] = useState<AcademicExam[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentDateKey, setCurrentDateKey] = useState(getLocalDateString());

  const [lastActionBatch, setLastActionBatchState] = useState<{
    recordIds?: string[];
    previousSubjects: Subject[];
    previousRecords: AttendanceRecord[];
  } | null>(null);

  // Synchronized refs to eliminate closure stale-state race conditions
  const profileRef = useRef<StudentProfile>(DEFAULT_PROFILE);
  const subjectsRef = useRef<Subject[]>([]);
  const timetableRef = useRef<TimetableSlot[]>([]);
  const recordsRef = useRef<AttendanceRecord[]>([]);
  const examsRef = useRef<AcademicExam[]>([]);
  const lastActionBatchRef = useRef<{
    recordIds?: string[];
    previousSubjects: Subject[];
    previousRecords: AttendanceRecord[];
  } | null>(null);
  const undoStackRef = useRef<Array<{
    recordIds?: string[];
    previousSubjects: Subject[];
    previousRecords: AttendanceRecord[];
  }>>([]);

  const setProfile = (p: StudentProfile) => {
    profileRef.current = p;
    setProfileState(p);
  };
  const setSubjects = (s: Subject[]) => {
    subjectsRef.current = s;
    setSubjectsState(s);
  };
  const setTimetable = (t: TimetableSlot[]) => {
    timetableRef.current = t;
    setTimetableState(t);
  };
  const setRecords = (r: AttendanceRecord[]) => {
    recordsRef.current = r;
    setRecordsState(r);
  };
  const setExams = (e: AcademicExam[]) => {
    examsRef.current = e;
    setExamsState(e);
  };
  const setLastActionBatch = (
    b: { recordIds?: string[]; previousSubjects: Subject[]; previousRecords: AttendanceRecord[] } | null
  ) => {
    lastActionBatchRef.current = b;
    setLastActionBatchState(b);
  };

  const MAX_UNDO_DEPTH = 15;

  const pushUndoSnapshot = (snapshot: {
    recordIds?: string[];
    previousSubjects: Subject[];
    previousRecords: AttendanceRecord[];
  }) => {
    undoStackRef.current = [snapshot, ...undoStackRef.current].slice(0, MAX_UNDO_DEPTH);
    setLastActionBatch(snapshot);
  };

  // Promise-based execution queue to ensure mutations are applied strictly sequentially
  const mutationQueueRef = useRef<Promise<any>>(Promise.resolve());
  const runExclusive = <T,>(task: () => Promise<T>): Promise<T> => {
    const withTimeout = async (): Promise<T> => {
      let timeoutHandle: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Storage mutation timed out')), 6000);
      });
      try {
        return await Promise.race([task(), timeoutPromise]);
      } finally {
        clearTimeout(timeoutHandle);
      }
    };

    const nextPromise = mutationQueueRef.current.then(
      () => withTimeout(),
      () => withTimeout()
    );
    mutationQueueRef.current = nextPromise.catch(() => {});
    return nextPromise;
  };

  // Load persisted state on startup
  useEffect(() => {
    async function init() {
      try {
        const [p, s, t, r, e] = await Promise.all([
          AppStorage.loadProfile(),
          AppStorage.loadSubjects(),
          AppStorage.loadTimetable(),
          AppStorage.loadRecords(),
          AppStorage.loadExams(),
        ]);

        if (p) {
          setProfile(p);
          setSubjects(s);
          setTimetable(t);
          setRecords(r);
          setExams(e);
        } else {
          setProfile(DEFAULT_PROFILE);
          setSubjects([]);
          setTimetable([]);
          setRecords([]);
          setExams([]);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const refreshDate = () => setCurrentDateKey(getLocalDateString());
    const interval = setInterval(refreshDate, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshDate();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const activeDate = useMemo(() => {
    const [year, month, day] = currentDateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [currentDateKey]);
  const isSunday = activeDate.getDay() === 0;

  const todayDay = useMemo<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'>(() => {
    const days: Array<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'> = [
      'MON', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT',
    ];
    return days[activeDate.getDay()] || 'MON';
  }, [activeDate]);

  const todaySlots = useMemo(() => {
    if (isSunday) return [];
    return timetable
      .filter(slot => slot.day === todayDay)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [timetable, todayDay, isSunday]);

  const { overallPercentage, overallBuffer, totalAttended, totalClasses } = useMemo(() => {
    let attended = 0;
    let total = 0;
    subjects.forEach(s => {
      attended += s.attended;
      total += s.total;
    });
    const pct = attendancePercentage(attended, total);
    const buf = attendanceBuffer(attended, total, profile.targetAttendance || 75);
    return {
      overallPercentage: pct,
      overallBuffer: buf,
      totalAttended: attended,
      totalClasses: total,
    };
  }, [subjects, profile.targetAttendance]);

  const todaySkipReport = useMemo(() => {
    return analyzeTodaySkip(todaySlots, subjects, profile.targetAttendance || 75);
  }, [todaySlots, subjects, profile.targetAttendance]);

  const semesterHealth = useMemo(() => {
    return calculateSemesterHealth(subjects, profile.targetAttendance || 75);
  }, [subjects, profile.targetAttendance]);

  const updateProfile = async (newProfile: StudentProfile) => {
    return runExclusive(async () => {
      await AppStorage.saveProfile(newProfile);
      setProfile(newProfile);
    });
  };

  const _editAttendanceRecordInternal = async (
    recordId: string,
    newStatus: AttendanceStatus,
    note?: string
  ) => {
    const currentRecords = recordsRef.current;
    const currentSubjects = subjectsRef.current;

    const record = currentRecords.find(r => r.id === recordId);
    if (!record) return;
    if (record.isAdjustment) return; // Prevent corrupting manual count adjustment records
    if (record.status === newStatus && (note === undefined || note === record.note)) return;

    const sub = currentSubjects.find(s => s.id === record.subjectId);
    let updatedSubjects = [...currentSubjects];

    if (sub && record.status !== newStatus) {
      const oldUnit = Number.isFinite(record.unitCount) && (record.unitCount || 0) > 0
        ? (record.unitCount as number)
        : sub.isLab2x ? 2 : 1;
      const newUnit = sub.isLab2x ? 2 : 1;

      let attendedDelta = 0;
      let totalDelta = 0;
      let cancelledDelta = 0;
      let odDelta = 0;

      if (record.status === 'PRESENT') {
        attendedDelta -= oldUnit;
        totalDelta -= oldUnit;
      } else if (record.status === 'ABSENT') {
        totalDelta -= oldUnit;
      } else if (record.status === 'CANCELLED') {
        cancelledDelta -= oldUnit;
      } else if (record.status === 'OD') {
        attendedDelta -= oldUnit;
        totalDelta -= oldUnit;
        odDelta -= oldUnit;
      }

      if (newStatus === 'PRESENT') {
        attendedDelta += newUnit;
        totalDelta += newUnit;
      } else if (newStatus === 'ABSENT') {
        totalDelta += newUnit;
      } else if (newStatus === 'CANCELLED') {
        cancelledDelta += newUnit;
      } else if (newStatus === 'OD') {
        attendedDelta += newUnit;
        totalDelta += newUnit;
        odDelta += newUnit;
      }

      updatedSubjects = currentSubjects.map(s => {
        if (s.id === sub.id) {
          return {
            ...s,
            attended: Math.max(0, (s.attended || 0) + attendedDelta),
            total: Math.max(0, (s.total || 0) + totalDelta),
            cancelled: Math.max(0, (s.cancelled || 0) + cancelledDelta),
            od: Math.max(0, (s.od || 0) + odDelta),
          };
        }
        return s;
      });
    }

    const updatedRecords = currentRecords.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          status: newStatus,
          note: note !== undefined ? note : r.note,
          isEdited: true,
          editedAt: new Date().toISOString(),
          unitCount: sub ? (sub.isLab2x ? 2 : 1) : undefined,
        };
      }
      return r;
    });

    await AppStorage.saveAtomicBatch({
      subjects: updatedSubjects,
      records: updatedRecords,
    });

    setSubjects(updatedSubjects);
    setRecords(updatedRecords);
    pushUndoSnapshot({
      previousSubjects: [...currentSubjects],
      previousRecords: [...currentRecords],
    });
  };

  const markAttendance = async (
    subjectId: string,
    status: AttendanceStatus,
    slotInfo?: { time?: string; room?: string; note?: string; date?: string }
  ) => {
    return runExclusive(async () => {
      const currentSubjects = subjectsRef.current;
      const currentRecords = recordsRef.current;

      const sub = currentSubjects.find(s => s.id === subjectId);
      if (!sub) return;

      const unit = sub.isLab2x ? 2 : 1;
      let attendedDelta = 0;
      let totalDelta = 0;
      let cancelledDelta = 0;
      let odDelta = 0;

      if (status === 'PRESENT') {
        attendedDelta = unit;
        totalDelta = unit;
        AppHaptics.success();
      } else if (status === 'ABSENT') {
        totalDelta = unit;
        AppHaptics.warning();
      } else if (status === 'CANCELLED') {
        cancelledDelta = unit;
        AppHaptics.light();
      } else if (status === 'OD') {
        attendedDelta = unit;
        totalDelta = unit;
        odDelta = unit;
        AppHaptics.medium();
      }

      const targetDate = slotInfo?.date || getLocalDateString();
      const normalizedTime = slotInfo?.time ? normalizeTimeString(slotInfo.time) : undefined;

      const existingRecord = currentRecords.find(r => {
        if (r.subjectId !== subjectId || r.date !== targetDate) return false;
        if (normalizedTime) {
          return (
            r.slotTime === normalizedTime ||
            isSlotMatchingRecord(r.slotTime, r.note, normalizedTime.split(' - ')[0], normalizedTime.split(' - ')[1])
          );
        }
        return !r.slotTime || r.slotTime === 'Quick Mark';
      });

      if (existingRecord) {
        if (existingRecord.status === status) return;
        await _editAttendanceRecordInternal(existingRecord.id, status, slotInfo?.note);
        return;
      }

      const newRec: AttendanceRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        date: targetDate,
        timestamp: Date.now(),
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        status,
        slotTime: normalizedTime,
        room: slotInfo?.room || sub.room,
        note: slotInfo?.note,
        unitCount: unit,
      };

      Analytics.track('attendance_marked', {
        status,
        subject_id: sub.id,
        subject_code: sub.code,
        subject_type: sub.type,
        is_lab: sub.isLab2x || false,
        has_slot_info: !!slotInfo,
      });

      const updatedSubjects = currentSubjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            attended: Math.max(0, (s.attended || 0) + attendedDelta),
            total: Math.max(0, (s.total || 0) + totalDelta),
            cancelled: Math.max(0, (s.cancelled || 0) + cancelledDelta),
            od: Math.max(0, (s.od || 0) + odDelta),
          };
        }
        return s;
      });

      const updatedRecords = [newRec, ...currentRecords];

      await AppStorage.saveAtomicBatch({
        subjects: updatedSubjects,
        records: updatedRecords,
      });

      setSubjects(updatedSubjects);
      setRecords(updatedRecords);
      pushUndoSnapshot({
        recordIds: [newRec.id],
        previousSubjects: [...currentSubjects],
        previousRecords: [...currentRecords],
      });
    });
  };

  const markAllSlotsAttendance = async (
    slots: TimetableSlot[],
    targetStatus: AttendanceStatus = 'PRESENT',
    dateStr?: string
  ) => {
    return runExclusive(async () => {
      if (!slots || slots.length === 0) return;
      const targetDate = dateStr || getLocalDateString();
      const currentSubjects = subjectsRef.current;
      const currentRecords = recordsRef.current;

      Analytics.track('all_slots_marked', {
        slot_count: slots.length,
        status: targetStatus,
        date: targetDate,
      });

      const snapshotSubjects = [...currentSubjects];
      const snapshotRecords = [...currentRecords];
      const createdRecordIds: string[] = [];
      let nextSubjects = [...currentSubjects];
      let nextRecords = [...currentRecords];
      let anyChanges = false;

      for (const slot of slots) {
        const subIndex = nextSubjects.findIndex(s => s.id === slot.subjectId);
        if (subIndex === -1) continue;

        const sub = nextSubjects[subIndex];
        const unit = sub.isLab2x ? 2 : 1;
        const normStart = normalizeTimeString(slot.startTime);
        const normEnd = normalizeTimeString(slot.endTime);

        const existingRecordIndex = nextRecords.findIndex(
          r =>
            r.subjectId === slot.subjectId &&
            r.date === targetDate &&
            isSlotMatchingRecord(r.slotTime, r.note, normStart, normEnd, slot.day)
        );

        if (existingRecordIndex !== -1) {
          const existing = nextRecords[existingRecordIndex];
          if (existing.status !== targetStatus) {
            anyChanges = true;
            let attendedDelta = 0;
            let totalDelta = 0;
            let cancelledDelta = 0;
            let odDelta = 0;

            if (existing.status === 'PRESENT') {
              attendedDelta -= unit;
              totalDelta -= unit;
            } else if (existing.status === 'ABSENT') {
              totalDelta -= unit;
            } else if (existing.status === 'CANCELLED') {
              cancelledDelta -= unit;
            } else if (existing.status === 'OD') {
              attendedDelta -= unit;
              totalDelta -= unit;
              odDelta -= unit;
            }

            if (targetStatus === 'PRESENT') {
              attendedDelta += unit;
              totalDelta += unit;
            } else if (targetStatus === 'ABSENT') {
              totalDelta += unit;
            } else if (targetStatus === 'CANCELLED') {
              cancelledDelta += unit;
            } else if (targetStatus === 'OD') {
              attendedDelta += unit;
              totalDelta += unit;
              odDelta += unit;
            }

            nextSubjects[subIndex] = {
              ...sub,
              attended: Math.max(0, (sub.attended || 0) + attendedDelta),
              total: Math.max(0, (sub.total || 0) + totalDelta),
              cancelled: Math.max(0, (sub.cancelled || 0) + cancelledDelta),
              od: Math.max(0, (sub.od || 0) + odDelta),
            };

            nextRecords[existingRecordIndex] = {
              ...existing,
              status: targetStatus,
              isEdited: true,
              editedAt: new Date().toISOString(),
            };
          }
        } else {
          anyChanges = true;
          let attendedDelta = 0;
          let totalDelta = 0;
          let cancelledDelta = 0;
          let odDelta = 0;

          if (targetStatus === 'PRESENT') {
            attendedDelta = unit;
            totalDelta = unit;
          } else if (targetStatus === 'ABSENT') {
            totalDelta = unit;
          } else if (targetStatus === 'CANCELLED') {
            cancelledDelta = unit;
          } else if (targetStatus === 'OD') {
            attendedDelta = unit;
            totalDelta = unit;
            odDelta = unit;
          }

          nextSubjects[subIndex] = {
            ...sub,
            attended: Math.max(0, (sub.attended || 0) + attendedDelta),
            total: Math.max(0, (sub.total || 0) + totalDelta),
            cancelled: Math.max(0, (sub.cancelled || 0) + cancelledDelta),
            od: Math.max(0, (sub.od || 0) + odDelta),
          };

          const newRecord: AttendanceRecord = {
            id: `rec_all_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            date: targetDate,
            timestamp: Date.now(),
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            status: targetStatus,
            slotTime: `${normStart} - ${normEnd}`,
            room: slot.room,
            note: `Timetable: ${slot.day} (${normStart})`,
            unitCount: unit,
          };
          createdRecordIds.push(newRecord.id);
          nextRecords.unshift(newRecord);
        }
      }

      if (!anyChanges) {
        AppHaptics.light();
        return;
      }

      await AppStorage.saveAtomicBatch({
        subjects: nextSubjects,
        records: nextRecords,
      });

      setSubjects(nextSubjects);
      setRecords(nextRecords);
      pushUndoSnapshot({
        recordIds: createdRecordIds,
        previousSubjects: snapshotSubjects,
        previousRecords: snapshotRecords,
      });

      AppHaptics.success();
    });
  };

  const undoLastAction = async () => {
    return runExclusive(async () => {
      if (undoStackRef.current.length > 0) {
        const snapshot = undoStackRef.current.shift()!;
        const snapshotSubs = snapshot.previousSubjects;
        const restoredRecs = snapshot.previousRecords;
        const currentSubjects = subjectsRef.current;

        // Merge restored attendance counts while preserving any course metadata edits (name, room, faculty, etc.)
        const snapshotSubMap = new Map(snapshotSubs.map(s => [s.id, s]));
        const restoredSubs = currentSubjects.map(cur => {
          const snapSub = snapshotSubMap.get(cur.id);
          if (!snapSub) return cur;
          return {
            ...cur,
            attended: snapSub.attended,
            total: snapSub.total,
            cancelled: snapSub.cancelled,
            od: snapSub.od,
          };
        });

        // If there were subjects in snapshot that were deleted in current state, restore them
        snapshotSubs.forEach(snapSub => {
          if (!currentSubjects.some(cur => cur.id === snapSub.id)) {
            restoredSubs.push(snapSub);
          }
        });

        await AppStorage.saveAtomicBatch({
          subjects: restoredSubs,
          records: restoredRecs,
        });

        setSubjects(restoredSubs);
        setRecords(restoredRecs);
        setLastActionBatch(undoStackRef.current[0] || null);
        AppHaptics.medium();
        return;
      }

      const currentRecords = recordsRef.current;
      if (currentRecords.length === 0) return;
      const lastRecord = currentRecords[0];
      await _deleteAttendanceRecordInternal(lastRecord.id);
      AppHaptics.medium();
    });
  };

  const editAttendanceRecord = async (
    recordId: string,
    newStatus: AttendanceStatus,
    note?: string
  ) => {
    return runExclusive(async () => {
      await _editAttendanceRecordInternal(recordId, newStatus, note);
    });
  };

  const _deleteAttendanceRecordInternal = async (recordId: string) => {
    const currentRecords = recordsRef.current;
    const currentSubjects = subjectsRef.current;

    const record = currentRecords.find(r => r.id === recordId);
    if (!record) return;

    const sub = currentSubjects.find(s => s.id === record.subjectId);
    let updatedSubjects = [...currentSubjects];

    if (sub) {
      let attendedDelta = 0;
      let totalDelta = 0;
      let cancelledDelta = 0;
      let odDelta = 0;

      if (record.isAdjustment || record.slotTime === 'Manual Adjustment') {
        if (record.attendedDelta !== undefined || record.totalDelta !== undefined) {
          attendedDelta = -(record.attendedDelta || 0);
          totalDelta = -(record.totalDelta || 0);
        } else {
          const unit = Number.isFinite(record.unitCount) && (record.unitCount || 0) > 0
            ? (record.unitCount as number)
            : 1;
          if (record.status === 'PRESENT') {
            attendedDelta = -unit;
            totalDelta = -unit;
          } else if (record.status === 'ABSENT') {
            totalDelta = -unit;
          }
        }
      } else {
        const unit = Number.isFinite(record.unitCount) && (record.unitCount || 0) > 0
          ? (record.unitCount as number)
          : sub.isLab2x ? 2 : 1;

        if (record.status === 'PRESENT') {
          attendedDelta = -unit;
          totalDelta = -unit;
        } else if (record.status === 'ABSENT') {
          totalDelta = -unit;
        } else if (record.status === 'CANCELLED') {
          cancelledDelta = -unit;
        } else if (record.status === 'OD') {
          attendedDelta = -unit;
          totalDelta = -unit;
          odDelta = -unit;
        }
      }

      updatedSubjects = currentSubjects.map(s => {
        if (s.id === sub.id) {
          const newAttended = Math.max(0, (s.attended || 0) + attendedDelta);
          const newTotal = Math.max(newAttended, (s.total || 0) + totalDelta);
          return {
            ...s,
            attended: newAttended,
            total: newTotal,
            cancelled: Math.max(0, (s.cancelled || 0) + cancelledDelta),
            od: Math.max(0, (s.od || 0) + odDelta),
          };
        }
        return s;
      });
    }

    const updatedRecords = currentRecords.filter(r => r.id !== recordId);
    await AppStorage.saveAtomicBatch({
      subjects: updatedSubjects,
      records: updatedRecords,
    });

    setSubjects(updatedSubjects);
    setRecords(updatedRecords);
  };

  const deleteAttendanceRecord = async (recordId: string) => {
    return runExclusive(async () => {
      await _deleteAttendanceRecordInternal(recordId);
    });
  };

  const addSubject = async (
    data: Partial<Subject> & { name: string; code: string }
  ): Promise<Subject> => {
    return runExclusive(async () => {
      const currentSubjects = subjectsRef.current;
      const currentRecords = recordsRef.current;

      const colors = ['#38BDF8', '#10B981', '#F59E0B', '#A855F7', '#EC4899', '#6366F1'];
      const randomColor = colors[currentSubjects.length % colors.length];

      const newSub: Subject = {
        id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: data.name,
        code: data.code,
        type: data.type || 'Theory',
        credits: data.credits || 4,
        ltp: data.ltp || '3-0-0',
        faculty: data.faculty || '',
        room: data.room || '',
        targetRequirement: data.targetRequirement || profileRef.current.targetAttendance || 75,
        attended: Math.max(0, data.attended || 0),
        total: Math.max(0, data.total || 0),
        cancelled: 0,
        od: 0,
        isLab2x: data.isLab2x || data.type === 'Lab',
        colorAccent: data.colorAccent || randomColor,
      };

      const updatedSubjects = [...currentSubjects, newSub];
      let updatedRecords = currentRecords;

      if (newSub.total > 0) {
        const baselineDate = getLocalDateString();
        const initialPresent = newSub.attended;
        const initialAbsent = Math.max(0, newSub.total - newSub.attended);
        const newRecs: AttendanceRecord[] = [];

        if (initialPresent > 0) {
          newRecs.push({
            id: `rec_baseline_p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${newSub.id}`,
            date: baselineDate,
            timestamp: Date.now() - 1000,
            subjectId: newSub.id,
            subjectName: newSub.name,
            subjectCode: newSub.code,
            status: 'PRESENT',
            slotTime: 'Initial Baseline',
            unitCount: initialPresent,
            note: `Starting count: ${initialPresent} classes attended prior to tracking`,
          });
        }
        if (initialAbsent > 0) {
          newRecs.push({
            id: `rec_baseline_a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${newSub.id}`,
            date: baselineDate,
            timestamp: Date.now() - 500,
            subjectId: newSub.id,
            subjectName: newSub.name,
            subjectCode: newSub.code,
            status: 'ABSENT',
            slotTime: 'Initial Baseline',
            unitCount: initialAbsent,
            note: `Starting count: ${initialAbsent} classes missed prior to tracking`,
          });
        }
        if (newRecs.length > 0) {
          updatedRecords = [...newRecs, ...currentRecords];
        }
      }

      await AppStorage.saveAtomicBatch({
        subjects: updatedSubjects,
        records: updatedRecords,
      });

      setSubjects(updatedSubjects);
      setRecords(updatedRecords);

      Analytics.track('course_added', {
        subject_code: newSub.code,
        subject_type: newSub.type,
        credits: newSub.credits,
      });
      AppHaptics.success();
      return newSub;
    });
  };

  const updateSubject = async (updatedSubject: Subject) => {
    return runExclusive(async () => {
      const currentSubjects = subjectsRef.current;
      const currentTimetable = timetableRef.current;
      const currentRecords = recordsRef.current;

      const oldSub = currentSubjects.find(s => s.id === updatedSubject.id);
      const updatedSubjects = currentSubjects.map(s => (s.id === updatedSubject.id ? updatedSubject : s));
      
      const updatedTimetable = currentTimetable.map(t => {
        if (t.subjectId === updatedSubject.id) {
          return {
            ...t,
            subjectName: updatedSubject.name,
            subjectCode: updatedSubject.code,
            type: updatedSubject.type,
            room: updatedSubject.room !== undefined ? updatedSubject.room : t.room,
            faculty: updatedSubject.faculty !== undefined ? updatedSubject.faculty : t.faculty,
            isLab2x: updatedSubject.isLab2x,
          };
        }
        return t;
      });

      let updatedRecords = currentRecords.map(r => {
        if (r.subjectId === updatedSubject.id) {
          return {
            ...r,
            subjectName: updatedSubject.name,
            subjectCode: updatedSubject.code,
            room: updatedSubject.room !== undefined ? updatedSubject.room : r.room,
          };
        }
        return r;
      });

      if (oldSub && (oldSub.attended !== updatedSubject.attended || oldSub.total !== updatedSubject.total)) {
        const attDiff = updatedSubject.attended - oldSub.attended;
        const totDiff = updatedSubject.total - oldSub.total;
        const missedDiff = (updatedSubject.total - updatedSubject.attended) - (oldSub.total - oldSub.attended);
        const adjustUnits = Math.max(1, Math.abs(attDiff) || Math.abs(missedDiff) || Math.abs(totDiff));

        const adjustRec: AttendanceRecord = {
          id: `rec_adj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${updatedSubject.id}`,
          date: getLocalDateString(),
          timestamp: Date.now(),
          subjectId: updatedSubject.id,
          subjectName: updatedSubject.name,
          subjectCode: updatedSubject.code,
          status: attDiff > 0 ? 'PRESENT' : missedDiff > 0 ? 'ABSENT' : attDiff < 0 ? 'ABSENT' : 'PRESENT',
          slotTime: 'Manual Adjustment',
          unitCount: adjustUnits,
          attendedDelta: attDiff,
          totalDelta: totDiff,
          isAdjustment: true,
          note: `Manual count update: set to ${updatedSubject.attended} attended / ${updatedSubject.total} total (${attDiff >= 0 ? '+' : ''}${attDiff} att, ${totDiff >= 0 ? '+' : ''}${totDiff} total)`,
        };
        updatedRecords = [adjustRec, ...updatedRecords];
      }

      await AppStorage.saveAtomicBatch({
        subjects: updatedSubjects,
        timetable: updatedTimetable,
        records: updatedRecords,
      });

      setSubjects(updatedSubjects);
      setTimetable(updatedTimetable);
      setRecords(updatedRecords);
    });
  };

  const deleteSubject = async (subjectId: string) => {
    return runExclusive(async () => {
      const currentSubjects = subjectsRef.current;
      const currentTimetable = timetableRef.current;
      const currentRecords = recordsRef.current;
      const currentExams = examsRef.current;

      const deletedSub = currentSubjects.find(s => s.id === subjectId);
      const updatedSubjects = currentSubjects.filter(s => s.id !== subjectId);
      const updatedTimetable = currentTimetable.filter(t => t.subjectId !== subjectId);
      const updatedRecords = currentRecords.filter(r => r.subjectId !== subjectId);
      const updatedExams = deletedSub ? currentExams.filter(e => e.subjectCode !== deletedSub.code) : currentExams;

      await AppStorage.saveAtomicBatch({
        subjects: updatedSubjects,
        timetable: updatedTimetable,
        records: updatedRecords,
        exams: updatedExams,
      });

      setSubjects(updatedSubjects);
      setTimetable(updatedTimetable);
      setRecords(updatedRecords);
      setExams(updatedExams);
      undoStackRef.current = [];
      setLastActionBatch(null);

      Analytics.track('course_deleted');
      AppHaptics.warning();
    });
  };

  const addTimetableSlot = async (slotData: Omit<TimetableSlot, 'id'>) => {
    return runExclusive(async () => {
      const currentTimetable = timetableRef.current;
      const newSlot: TimetableSlot = {
        ...slotData,
        id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      };
      const updatedTimetable = [...currentTimetable, newSlot];
      await AppStorage.saveTimetable(updatedTimetable);
      setTimetable(updatedTimetable);

      Analytics.track('timetable_slot_added', {
        day: slotData.day,
        type: slotData.type,
        start_time: slotData.startTime,
      });
      AppHaptics.success();
    });
  };

  const addMultipleTimetableSlots = async (slotsData: Omit<TimetableSlot, 'id'>[]) => {
    return runExclusive(async () => {
      if (!slotsData || slotsData.length === 0) return;
      const currentTimetable = timetableRef.current;
      const newSlots: TimetableSlot[] = slotsData.map((s, idx) => ({
        ...s,
        id: `slot_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      }));
      const updatedTimetable = [...currentTimetable, ...newSlots];
      await AppStorage.saveTimetable(updatedTimetable);
      setTimetable(updatedTimetable);
      AppHaptics.success();
    });
  };

  const batchAddTimetableSlots = async (
    newSlots: Omit<TimetableSlot, 'id'>[],
    newSubjectsList?: Partial<Subject>[]
  ) => {
    return runExclusive(async () => {
      let currentSubjects = [...subjectsRef.current];
      const currentTimetable = timetableRef.current;
      const createdSubjectMap = new Map<string, string>();

      currentSubjects.forEach(s => {
        createdSubjectMap.set(s.code.toUpperCase(), s.id);
        createdSubjectMap.set(s.name.toLowerCase(), s.id);
      });

      if (newSubjectsList && newSubjectsList.length > 0) {
        const colors = ['#38BDF8', '#10B981', '#F59E0B', '#A855F7', '#EC4899', '#6366F1'];
        newSubjectsList.forEach((ns, idx) => {
          const code = (ns.code || `SUB-${Date.now().toString().slice(-3)}`).toUpperCase();
          if (!createdSubjectMap.has(code)) {
            const newSub: Subject = {
              id: `sub_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
              name: ns.name || code,
              code: code,
              type: ns.type || 'Theory',
              credits: ns.credits || 4,
              ltp: ns.ltp || '3-0-0',
              faculty: ns.faculty || '',
              room: ns.room || '',
              targetRequirement: ns.targetRequirement || profileRef.current.targetAttendance || 75,
              attended: 0,
              total: 0,
              cancelled: 0,
              od: 0,
              isLab2x: ns.isLab2x || ns.type === 'Lab',
              colorAccent: colors[(currentSubjects.length + idx) % colors.length],
            };
            currentSubjects.push(newSub);
            createdSubjectMap.set(code, newSub.id);
            createdSubjectMap.set(newSub.name.toLowerCase(), newSub.id);
          }
        });
      }

      const builtSlots: TimetableSlot[] = newSlots.map((s, idx) => {
        let resolvedSubId = s.subjectId;
        if (!resolvedSubId || resolvedSubId === '') {
          resolvedSubId =
            createdSubjectMap.get(s.subjectCode.toUpperCase()) ||
            createdSubjectMap.get(s.subjectName.toLowerCase()) ||
            currentSubjects[0]?.id ||
            `sub_unknown_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        }
        return {
          ...s,
          id: `slot_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
          subjectId: resolvedSubId,
        };
      });

      const updatedTimetable = [...currentTimetable, ...builtSlots];

      await AppStorage.saveAtomicBatch({
        subjects: currentSubjects,
        timetable: updatedTimetable,
      });

      setSubjects(currentSubjects);
      setTimetable(updatedTimetable);
      AppHaptics.success();
    });
  };

  const updateTimetableSlot = async (slot: TimetableSlot) => {
    return runExclusive(async () => {
      const currentTimetable = timetableRef.current;
      const updated = currentTimetable.map(s => (s.id === slot.id ? slot : s));
      await AppStorage.saveTimetable(updated);
      setTimetable(updated);
    });
  };

  const deleteTimetableSlot = async (slotId: string) => {
    return runExclusive(async () => {
      const currentTimetable = timetableRef.current;
      const updated = currentTimetable.filter(s => s.id !== slotId);
      await AppStorage.saveTimetable(updated);
      setTimetable(updated);
    });
  };

  const addExam = async (examData: Omit<AcademicExam, 'id'>) => {
    return runExclusive(async () => {
      const currentExams = examsRef.current;
      const newExam: AcademicExam = {
        ...examData,
        id: `exam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      };
      const updated = [...currentExams, newExam];
      await AppStorage.saveExams(updated);
      setExams(updated);
    });
  };

  const updateExam = async (updatedExam: AcademicExam) => {
    return runExclusive(async () => {
      const currentExams = examsRef.current;
      const updated = currentExams.map(e => (e.id === updatedExam.id ? updatedExam : e));
      await AppStorage.saveExams(updated);
      setExams(updated);
    });
  };

  const deleteExam = async (examId: string) => {
    return runExclusive(async () => {
      const currentExams = examsRef.current;
      const updated = currentExams.filter(e => e.id !== examId);
      await AppStorage.saveExams(updated);
      setExams(updated);
    });
  };

  const reloadAllData = async () => {
    return runExclusive(async () => {
      const [p, s, t, r, e] = await Promise.all([
        AppStorage.loadProfile(),
        AppStorage.loadSubjects(),
        AppStorage.loadTimetable(),
        AppStorage.loadRecords(),
        AppStorage.loadExams(),
      ]);
      if (p) setProfile(p);
      setSubjects(s);
      setTimetable(t);
      setRecords(r);
      setExams(e);
      AppHaptics.success();
    });
  };

  const resetAllData = async () => {
    return runExclusive(async () => {
      await AppStorage.clearAll();
      setProfile(DEFAULT_PROFILE);
      setSubjects([]);
      setTimetable([]);
      setRecords([]);
      setExams([]);
      undoStackRef.current = [];
      setLastActionBatch(null);
      AppHaptics.warning();
    });
  };

  const contextValue = useMemo(
    () => ({
      profile,
      subjects,
      timetable,
      records,
      exams,
      isLoading,
      overallPercentage,
      overallBuffer,
      totalAttended,
      totalClasses,
      todayDay,
      isSunday,
      todaySlots,
      todaySkipReport,
      semesterHealth,
      updateProfile,
      markAttendance,
      markAllSlotsAttendance,
      undoLastAction,
      editAttendanceRecord,
      deleteAttendanceRecord,
      addSubject,
      updateSubject,
      deleteSubject,
      addTimetableSlot,
      addMultipleTimetableSlots,
      batchAddTimetableSlots,
      updateTimetableSlot,
      deleteTimetableSlot,
      addExam,
      updateExam,
      deleteExam,
      reloadAllData,
      resetAllData,
      lastActionBatch,
    }),
    [
      profile,
      subjects,
      timetable,
      records,
      exams,
      isLoading,
      overallPercentage,
      overallBuffer,
      totalAttended,
      totalClasses,
      todayDay,
      isSunday,
      todaySlots,
      todaySkipReport,
      semesterHealth,
      lastActionBatch,
    ]
  );

  return (
    <AttendanceContext.Provider value={contextValue}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
