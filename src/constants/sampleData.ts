import {
  StudentProfile,
  Subject,
  TimetableSlot,
  AttendanceRecord,
  AcademicExam,
} from '../types';

export const SAMPLE_IPU_PROFILE: StudentProfile = {
  name: '',
  college: '',
  collegeShort: '',
  programme: 'B.Tech',
  branch: '',
  semester: 1,
  section: '',
  academicSession: '2026–27',
  targetAttendance: 75,
  isIPUMode: true,
  isOnboarded: false,
};

export const SAMPLE_IPU_SUBJECTS: Subject[] = [];

export const SAMPLE_IPU_TIMETABLE: TimetableSlot[] = [];

export const SAMPLE_IPU_EXAMS: AcademicExam[] = [];

export const SAMPLE_IPU_RECORDS: AttendanceRecord[] = [];
