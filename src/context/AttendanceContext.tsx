import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
} from '../utils/ipuEngine';
import {
  SAMPLE_IPU_SUBJECTS,
  SAMPLE_IPU_TIMETABLE,
  SAMPLE_IPU_EXAMS,
} from '../constants/sampleData';
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
  editAttendanceRecord: (recordId: string, newStatus: AttendanceStatus, note?: string) => Promise<void>;
  deleteAttendanceRecord: (recordId: string) => Promise<void>;
  
  addSubject: (subject: Partial<Subject> & { name: string; code: string }) => Promise<Subject>;
  updateSubject: (subject: Subject) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => Promise<void>;
  addMultipleTimetableSlots: (slots: Omit<TimetableSlot, 'id'>[]) => Promise<void>;
  batchAddTimetableSlots: (slots: Omit<TimetableSlot, 'id'>[], newSubjects?: Partial<Subject>[]) => Promise<void>;
  updateTimetableSlot: (slot: TimetableSlot) => Promise<void>;
  deleteTimetableSlot: (slotId: string) => Promise<void>;
  
  addExam: (exam: Omit<AcademicExam, 'id'>) => Promise<void>;
  updateExam: (exam: AcademicExam) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
  
  reloadAllData: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

const DEFAULT_PROFILE: StudentProfile = {
  name: '',
  college: '',
  collegeShort: '',
  programme: 'B.Tech',
  branch: 'CSE',
  semester: 1,
  section: '1A',
  academicSession: '2026–27',
  targetAttendance: 75,
  isIPUMode: true,
  isOnboarded: false,
};

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<StudentProfile>(DEFAULT_PROFILE);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [exams, setExams] = useState<AcademicExam[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
          // First launch: Start fresh with Onboarding setup window
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

  // Real day index: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const isSunday = new Date().getDay() === 0;

  // Today's day of week code
  const todayDay = useMemo<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'>(() => {
    const days: Array<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'> = [
      'MON', // Sunday defaults to Monday for upcoming week preview
      'MON',
      'TUE',
      'WED',
      'THU',
      'FRI',
      'SAT',
    ];
    const dayIdx = new Date().getDay();
    return days[dayIdx] || 'MON';
  }, []);

  // Filter timetable slots for today in chronological order.
  // On Sunday (weekend), there are NO classes scheduled today.
  const todaySlots = useMemo(() => {
    if (isSunday) {
      return [];
    }
    return timetable
      .filter(slot => slot.day === todayDay)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [timetable, todayDay, isSunday]);

  // Overall attendance statistics
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

  // "Can I Skip Today?" report
  const todaySkipReport = useMemo(() => {
    return analyzeTodaySkip(todaySlots, subjects, profile.targetAttendance || 75);
  }, [todaySlots, subjects, profile.targetAttendance]);

  // Semester health score report
  const semesterHealth = useMemo(() => {
    return calculateSemesterHealth(subjects, profile.targetAttendance || 75);
  }, [subjects, profile.targetAttendance]);

  // Update profile
  const updateProfile = async (newProfile: StudentProfile) => {
    setProfile(newProfile);
    await AppStorage.saveProfile(newProfile);
  };

  // Mark attendance for a subject
  const markAttendance = async (
    subjectId: string,
    status: AttendanceStatus,
    slotInfo?: { time?: string; room?: string; note?: string; date?: string }
  ) => {
    const sub = subjects.find(s => s.id === subjectId);
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

    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          attended: Math.max(0, s.attended + attendedDelta),
          total: Math.max(0, s.total + totalDelta),
          cancelled: Math.max(0, s.cancelled + cancelledDelta),
          od: Math.max(0, s.od + odDelta),
        };
      }
      return s;
    });

    const newRecord: AttendanceRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      date: slotInfo?.date || new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      status,
      slotTime: slotInfo?.time,
      room: slotInfo?.room || sub.room,
      note: slotInfo?.note,
    };

    const updatedRecords = [newRecord, ...records];

    setSubjects(updatedSubjects);
    setRecords(updatedRecords);

    Analytics.track('attendance_marked', {
      status,
      subject_id: sub.id,
      subject_code: sub.code,
      subject_type: sub.type,
      is_lab: sub.isLab2x || false,
      has_slot_info: !!slotInfo,
    });

    await Promise.all([
      AppStorage.saveSubjects(updatedSubjects),
      AppStorage.saveRecords(updatedRecords),
    ]);
  };

  // Atomically mark attendance for multiple timetable slots in 1 tap without race conditions or duplicates
  const markAllSlotsAttendance = async (
    slots: TimetableSlot[],
    targetStatus: AttendanceStatus = 'PRESENT',
    dateStr?: string
  ) => {
    if (!slots || slots.length === 0) return;
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    Analytics.track('all_slots_marked', {
      slot_count: slots.length,
      status: targetStatus,
      date: targetDate,
    });

    let updatedSubjects = [...subjects];
    let updatedRecords = [...records];
    let anyChanges = false;

    for (const slot of slots) {
      const subIndex = updatedSubjects.findIndex(s => s.id === slot.subjectId);
      if (subIndex === -1) continue;
      const sub = updatedSubjects[subIndex];
      const unit = sub.isLab2x ? 2 : 1;

      // Check if already marked for this slot on this date
      const existingRecIndex = updatedRecords.findIndex(
        r =>
          r.subjectId === slot.subjectId &&
          r.date === targetDate &&
          (r.slotTime?.includes(slot.startTime) || r.note?.includes(slot.day))
      );

      if (existingRecIndex !== -1) {
        const existingRec = updatedRecords[existingRecIndex];
        if (existingRec.status === targetStatus) {
          // Already marked with same status, skip to prevent double counting
          continue;
        }
        anyChanges = true;
        let attendedDelta = 0;
        let totalDelta = 0;
        let cancelledDelta = 0;
        let odDelta = 0;

        if (existingRec.status === 'PRESENT') {
          attendedDelta -= unit;
          totalDelta -= unit;
        } else if (existingRec.status === 'ABSENT') {
          totalDelta -= unit;
        } else if (existingRec.status === 'CANCELLED') {
          cancelledDelta -= unit;
        } else if (existingRec.status === 'OD') {
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

        updatedSubjects[subIndex] = {
          ...sub,
          attended: Math.max(0, sub.attended + attendedDelta),
          total: Math.max(0, sub.total + totalDelta),
          cancelled: Math.max(0, (sub.cancelled || 0) + cancelledDelta),
          od: Math.max(0, (sub.od || 0) + odDelta),
        };

        updatedRecords[existingRecIndex] = {
          ...existingRec,
          status: targetStatus,
          timestamp: Date.now(),
        };
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
          cancelledDelta += unit;
        } else if (targetStatus === 'OD') {
          attendedDelta += unit;
          totalDelta += unit;
          odDelta += unit;
        }

        updatedSubjects[subIndex] = {
          ...sub,
          attended: Math.max(0, sub.attended + attendedDelta),
          total: Math.max(0, sub.total + totalDelta),
          cancelled: Math.max(0, (sub.cancelled || 0) + cancelledDelta),
          od: Math.max(0, (sub.od || 0) + odDelta),
        };

        const newRecord: AttendanceRecord = {
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          date: targetDate,
          timestamp: Date.now(),
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          status: targetStatus,
          slotTime: `${slot.startTime} - ${slot.endTime}`,
          room: slot.room,
          note: `All Present: ${slot.day}`,
        };
        updatedRecords.unshift(newRecord);
      }
    }

    if (!anyChanges) {
      AppHaptics.light();
      return;
    }

    setSubjects(updatedSubjects);
    setRecords(updatedRecords);
    AppHaptics.success();

    await Promise.all([
      AppStorage.saveSubjects(updatedSubjects),
      AppStorage.saveRecords(updatedRecords),
    ]);
  };

  // Undo the most recent record
  const undoLastAction = async () => {
    if (records.length === 0) return;
    const lastRecord = records[0];
    await deleteAttendanceRecord(lastRecord.id);
    AppHaptics.medium();
  };

  // Edit attendance record
  const editAttendanceRecord = async (
    recordId: string,
    newStatus: AttendanceStatus,
    note?: string
  ) => {
    const record = records.find(r => r.id === recordId);
    if (!record || record.status === newStatus) return;

    const sub = subjects.find(s => s.id === record.subjectId);
    if (!sub) return;

    const unit = sub.isLab2x ? 2 : 1;
    let attendedDelta = 0;
    let totalDelta = 0;
    let cancelledDelta = 0;
    let odDelta = 0;

    // Revert old status
    if (record.status === 'PRESENT') {
      attendedDelta -= unit;
      totalDelta -= unit;
    } else if (record.status === 'ABSENT') {
      totalDelta -= unit;
    } else if (record.status === 'CANCELLED') {
      cancelledDelta -= unit;
    } else if (record.status === 'OD') {
      attendedDelta -= unit;
      totalDelta -= unit;
      odDelta -= unit;
    }

    // Apply new status
    if (newStatus === 'PRESENT') {
      attendedDelta += unit;
      totalDelta += unit;
    } else if (newStatus === 'ABSENT') {
      totalDelta += unit;
    } else if (newStatus === 'CANCELLED') {
      cancelledDelta += unit;
    } else if (newStatus === 'OD') {
      attendedDelta += unit;
      totalDelta += unit;
      odDelta += unit;
    }

    const updatedSubjects = subjects.map(s => {
      if (s.id === sub.id) {
        return {
          ...s,
          attended: Math.max(0, s.attended + attendedDelta),
          total: Math.max(0, s.total + totalDelta),
          cancelled: Math.max(0, s.cancelled + cancelledDelta),
          od: Math.max(0, s.od + odDelta),
        };
      }
      return s;
    });

    const updatedRecords = records.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          status: newStatus,
          note: note !== undefined ? note : r.note,
          isEdited: true,
          editedAt: new Date().toISOString(),
        };
      }
      return r;
    });

    setSubjects(updatedSubjects);
    setRecords(updatedRecords);

    await Promise.all([
      AppStorage.saveSubjects(updatedSubjects),
      AppStorage.saveRecords(updatedRecords),
    ]);
  };

  // Delete an attendance record
  const deleteAttendanceRecord = async (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const sub = subjects.find(s => s.id === record.subjectId);
    if (sub) {
      const unit = sub.isLab2x ? 2 : 1;
      let attendedDelta = 0;
      let totalDelta = 0;
      let cancelledDelta = 0;
      let odDelta = 0;

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

      const updatedSubjects = subjects.map(s => {
        if (s.id === sub.id) {
          return {
            ...s,
            attended: Math.max(0, s.attended + attendedDelta),
            total: Math.max(0, s.total + totalDelta),
            cancelled: Math.max(0, s.cancelled + cancelledDelta),
            od: Math.max(0, s.od + odDelta),
          };
        }
        return s;
      });
      setSubjects(updatedSubjects);
      await AppStorage.saveSubjects(updatedSubjects);
    }

    const updatedRecords = records.filter(r => r.id !== recordId);
    setRecords(updatedRecords);
    await AppStorage.saveRecords(updatedRecords);
  };

  // Subject management
  const addSubject = async (
    data: Partial<Subject> & { name: string; code: string }
  ): Promise<Subject> => {
    const colors = ['#38BDF8', '#10B981', '#F59E0B', '#A855F7', '#EC4899', '#6366F1'];
    const randomColor = colors[subjects.length % colors.length];

    const newSub: Subject = {
      id: `sub_${Date.now()}`,
      name: data.name,
      code: data.code,
      type: data.type || 'Theory',
      credits: data.credits || 4,
      ltp: data.ltp || '3-0-0',
      faculty: data.faculty || '',
      room: data.room || '',
      targetRequirement: data.targetRequirement || profile.targetAttendance || 75,
      attended: data.attended || 0,
      total: data.total || 0,
      cancelled: 0,
      od: 0,
      isLab2x: data.isLab2x || data.type === 'Lab',
      colorAccent: data.colorAccent || randomColor,
    };

    const updated = [...subjects, newSub];
    setSubjects(updated);
    await AppStorage.saveSubjects(updated);
    Analytics.track('course_added', {
      subject_code: newSub.code,
      subject_type: newSub.type,
      credits: newSub.credits,
    });
    AppHaptics.success();
    return newSub;
  };

  const updateSubject = async (updatedSubject: Subject) => {
    const updated = subjects.map(s => (s.id === updatedSubject.id ? updatedSubject : s));
    
    // Cascade room, faculty, name, and code changes to all timetable slots for this subject
    const updatedTimetable = timetable.map(t => {
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

    // Cascade name/code changes to attendance records
    const updatedRecords = records.map(r => {
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

    setSubjects(updated);
    setTimetable(updatedTimetable);
    setRecords(updatedRecords);

    await Promise.all([
      AppStorage.saveSubjects(updated),
      AppStorage.saveTimetable(updatedTimetable),
      AppStorage.saveRecords(updatedRecords),
    ]);
  };

  const deleteSubject = async (subjectId: string) => {
    const updated = subjects.filter(s => s.id !== subjectId);
    const updatedTimetable = timetable.filter(t => t.subjectId !== subjectId);
    const updatedRecords = records.filter(r => r.subjectId !== subjectId);
    setSubjects(updated);
    setTimetable(updatedTimetable);
    setRecords(updatedRecords);
    Analytics.track('course_deleted');
    await Promise.all([
      AppStorage.saveSubjects(updated),
      AppStorage.saveTimetable(updatedTimetable),
      AppStorage.saveRecords(updatedRecords),
    ]);
    AppHaptics.warning();
  };

  // Timetable slot management
  const addTimetableSlot = async (slotData: Omit<TimetableSlot, 'id'>) => {
    const newSlot: TimetableSlot = {
      ...slotData,
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };
    const updated = [...timetable, newSlot];
    setTimetable(updated);
    await AppStorage.saveTimetable(updated);
    Analytics.track('timetable_slot_added', {
      day: slotData.day,
      type: slotData.type,
      start_time: slotData.startTime,
    });
    AppHaptics.success();
  };

  const addMultipleTimetableSlots = async (slotsData: Omit<TimetableSlot, 'id'>[]) => {
    if (!slotsData || slotsData.length === 0) return;
    const newSlots: TimetableSlot[] = slotsData.map((s, idx) => ({
      ...s,
      id: `slot_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
    }));
    const updated = [...timetable, ...newSlots];
    setTimetable(updated);
    await AppStorage.saveTimetable(updated);
    AppHaptics.success();
  };

  const batchAddTimetableSlots = async (
    newSlots: Omit<TimetableSlot, 'id'>[],
    newSubjectsList?: Partial<Subject>[]
  ) => {
    let currentSubjects = [...subjects];
    const createdSubjectMap = new Map<string, string>(); // code/name -> id

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
            id: `sub_${Date.now()}_${idx}`,
            name: ns.name || code,
            code: code,
            type: ns.type || 'Theory',
            credits: ns.credits || 4,
            ltp: ns.ltp || '3-0-0',
            faculty: ns.faculty || '',
            room: ns.room || '',
            targetRequirement: ns.targetRequirement || profile.targetAttendance || 75,
            attended: 0,
            total: 0,
            cancelled: 0,
            od: 0,
            colorAccent: colors[(currentSubjects.length + idx) % colors.length],
          };
          currentSubjects.push(newSub);
          createdSubjectMap.set(code, newSub.id);
          createdSubjectMap.set(newSub.name.toLowerCase(), newSub.id);
        }
      });
      setSubjects(currentSubjects);
      await AppStorage.saveSubjects(currentSubjects);
    }

    const builtSlots: TimetableSlot[] = newSlots.map((s, idx) => {
      let resolvedSubId = s.subjectId;
      if (!resolvedSubId || resolvedSubId === '') {
        resolvedSubId =
          createdSubjectMap.get(s.subjectCode.toUpperCase()) ||
          createdSubjectMap.get(s.subjectName.toLowerCase()) ||
          currentSubjects[0]?.id ||
          `sub_unknown_${Date.now()}`;
      }
      return {
        ...s,
        id: `slot_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        subjectId: resolvedSubId,
      };
    });

    const updatedTimetable = [...timetable, ...builtSlots];
    setTimetable(updatedTimetable);
    await AppStorage.saveTimetable(updatedTimetable);
    AppHaptics.success();
  };

  const updateTimetableSlot = async (slot: TimetableSlot) => {
    const updated = timetable.map(s => (s.id === slot.id ? slot : s));
    setTimetable(updated);
    await AppStorage.saveTimetable(updated);
  };

  const deleteTimetableSlot = async (slotId: string) => {
    const updated = timetable.filter(s => s.id !== slotId);
    setTimetable(updated);
    await AppStorage.saveTimetable(updated);
  };

  // Exam management
  const addExam = async (examData: Omit<AcademicExam, 'id'>) => {
    const newExam: AcademicExam = {
      ...examData,
      id: `exam_${Date.now()}`,
    };
    const updated = [...exams, newExam];
    setExams(updated);
    await AppStorage.saveExams(updated);
  };

  const updateExam = async (updatedExam: AcademicExam) => {
    const updated = exams.map(e => (e.id === updatedExam.id ? updatedExam : e));
    setExams(updated);
    await AppStorage.saveExams(updated);
  };

  const deleteExam = async (examId: string) => {
    const updated = exams.filter(e => e.id !== examId);
    setExams(updated);
    await AppStorage.saveExams(updated);
  };

  // 1-Tap Reload all state from storage
  const reloadAllData = async () => {
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
  };

  // Reset all data
  const resetAllData = async () => {
    await AppStorage.clearAll();
    setProfile(DEFAULT_PROFILE);
    setSubjects([]);
    setTimetable([]);
    setRecords([]);
    setExams([]);
    AppHaptics.warning();
  };

  return (
    <AttendanceContext.Provider
      value={{
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
      }}
    >
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
