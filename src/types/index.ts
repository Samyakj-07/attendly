export type SubjectType =
  | 'Theory'
  | 'Practical'
  | 'Tutorial'
  | 'Lab'
  | 'Elective'
  | 'Open Elective'
  | 'Skill Enhancement'
  | 'Project';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'CANCELLED' | 'OD' | 'NOT_MARKED';

export type RiskLevel =
  | 'SAFE'
  | 'HEALTHY'
  | 'WATCH'
  | 'CRITICAL'
  | 'RECOVERING'
  | 'RECOVERY_DIFFICULT'
  | 'UNRECOVERABLE';

export interface IPUCollege {
  id: string;
  name: string;
  shortName: string;
  campus: string;
  code?: string;
  isMainCampus?: boolean;
}

export interface StudentProfile {
  name: string;
  college: string;
  collegeShort: string;
  programme: string;
  branch: string;
  semester: number;
  section: string;
  academicSession: string;
  rollNumber?: string;
  enrollmentNumber?: string;
  targetAttendance: number; // e.g. 75
  isIPUMode: boolean;
  isOnboarded: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  type: SubjectType;
  credits: number;
  ltp: string; // e.g. "3-0-2"
  faculty: string;
  room: string;
  targetRequirement: number; // default 75%
  attended: number;
  total: number;
  cancelled: number;
  od: number; // On-Duty / Condonation count
  isLab2x?: boolean; // If lab counts as 2 attendance units
  colorAccent?: string;
}

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export interface TimetableSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  room: string;
  faculty: string;
  type: SubjectType;
  isLab2x?: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string; // "YYYY-MM-DD"
  timestamp: number;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  status: AttendanceStatus;
  slotTime?: string;
  room?: string;
  note?: string;
  isEdited?: boolean;
  editedAt?: string;
  proofUri?: string; // For OD/Medical slips
}

export interface AcademicExam {
  id: string;
  name: string;
  type: 'Mid-Sem' | 'End-Sem' | 'Practical' | 'Internal' | 'Project';
  date: string; // "YYYY-MM-DD"
  subjectCode?: string;
}

export interface AcademicEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  type: 'University Holiday' | 'College Holiday' | 'Fest' | 'Exam' | 'Custom';
  description?: string;
}

export interface InternalMarkEntry {
  subjectId: string;
  assignment: number;
  maxAssignment: number;
  quiz: number;
  maxQuiz: number;
  midSem: number;
  maxMidSem: number;
  practical: number;
  maxPractical: number;
  project: number;
  maxProject: number;
}

export interface SkipAnalysisItem {
  subject: Subject;
  slot: TimetableSlot;
  currentPercentage: number;
  postSkipPercentage: number;
  bufferBefore: number;
  bufferAfter: number;
  category: 'DO_NOT_MISS' | 'ATTEND_IF_POSSIBLE' | 'SAFEST_TO_MISS';
  advice: string;
}

export interface SkipRecommendationReport {
  totalClassesToday: number;
  analyzedSlots: SkipAnalysisItem[];
  overallCurrentPct: number;
  overallIfSkipAllPct: number;
  summaryAdvice: string;
  safestSubject?: Subject;
  criticalSubjects: Subject[];
}

export interface SemesterHealthReport {
  score: number; // 0 - 100
  status: 'OPTIMAL' | 'HEALTHY' | 'MODERATE' | 'CRITICAL' | 'DETENTION_RISK';
  summary: string;
  attendanceScore: number;
  bufferScore: number;
  riskPenalty: number;
  consistencyScore: number;
}
