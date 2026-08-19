
const clampNumber = (value, fallback, min, max) => {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

function sanitizeProfile(data) {
  if (!data || typeof data !== "object") return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 6 = July
  const defaultSession = currentMonth < 6
    ? `${currentYear - 1}–${currentYear.toString().slice(2)}`
    : `${currentYear}–${(currentYear + 1).toString().slice(2)}`;
  return {
    name: typeof data.name === "string" ? data.name.trim() : "Student",
    enrollmentNumber: typeof data.enrollmentNumber === "string" ? data.enrollmentNumber.trim() : "",
    rollNumber: typeof data.rollNumber === "string" ? data.rollNumber.trim() : "",
    college: typeof data.college === "string" ? data.college.trim() : "",
    collegeShort: typeof data.collegeShort === "string" ? data.collegeShort.trim() : "IPU",
    programme: typeof data.programme === "string" ? data.programme.trim() : "B.Tech",
    branch: typeof data.branch === "string" ? data.branch.trim() : "CSE",
    semester: clampNumber(data.semester, 1, 1, 12),
    section: typeof data.section === "string" ? data.section.trim() : "A",
    academicSession: typeof data.academicSession === "string" ? data.academicSession.trim() : defaultSession,
    targetAttendance: clampNumber(data.targetAttendance, 75, 1, 100),
    isOnboarded: typeof data.isOnboarded === "boolean" ? data.isOnboarded : true,
  };
}


function sanitizeSubjects(list) {
  if (!Array.isArray(list)) return [];
  const validTypes = [
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
      const type = validTypes.includes(s.type) ? s.type : 'Theory';
      const attended = Number.isFinite(s.attended) ? Math.max(0, s.attended) : parseInt(s.attended) || 0;
      const total = Number.isFinite(s.total) ? Math.max(attended, s.total) : Math.max(attended, parseInt(s.total) || attended);
      const isLab2x = typeof s.isLab2x === 'boolean' ? s.isLab2x : type === 'Lab';

      return {
        id: typeof s.id === 'string' && s.id.length > 0 ? s.id : `sub_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        name: s.name.trim(),
        code: typeof s.code === 'string' && s.code.trim().length > 0 ? s.code.trim().toUpperCase() : `SUB-${idx + 1}`,
        type,
        credits: Number.isFinite(s.credits) ? s.credits : parseInt(s.credits) || 4,
        ltp: typeof s.ltp === 'string' ? s.ltp : '3-0-0',
        faculty: typeof s.faculty === 'string' ? s.faculty.trim() : '',
        room: typeof s.room === 'string' ? s.room.trim() : '',
        targetRequirement: Number.isFinite(s.targetRequirement) ? s.targetRequirement : 75,
        attended,
        total,
        cancelled: Number.isFinite(s.cancelled) ? Math.max(0, s.cancelled) : 0,
        od: Number.isFinite(s.od) ? Math.max(0, s.od) : 0,
        isLab2x,
        colorAccent: typeof s.colorAccent === 'string' ? s.colorAccent : typeof s.color === 'string' ? s.color : '#38BDF8',
      };
    });
}

function sanitizeTimetable(list) {
  if (!Array.isArray(list)) return [];
  const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const validTypes = [
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
      day: t.day,
      startTime: typeof t.startTime === 'string' ? t.startTime.trim() : '09:30',
      endTime: typeof t.endTime === 'string' ? t.endTime.trim() : '10:30',
      subjectId: typeof t.subjectId === 'string' ? t.subjectId : `sub_${idx}`,
      subjectName: typeof t.subjectName === 'string' ? t.subjectName.trim() : 'Course',
      subjectCode: typeof t.subjectCode === 'string' ? t.subjectCode.trim().toUpperCase() : 'SUB-101',
      type: validTypes.includes(t.type) ? t.type : 'Theory',
      room: typeof t.room === 'string' ? t.room.trim() : '',
      faculty: typeof t.faculty === 'string' ? t.faculty.trim() : '',
    }));
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeRecords(list) {
  if (!Array.isArray(list)) return [];
  const validStatuses = ["PRESENT", "ABSENT", "CANCELLED", "OD"];

  return list
    .filter(r => r && typeof r === "object" && typeof r.subjectId === "string" && validStatuses.includes(r.status))
    .map((r, idx) => ({
      id: typeof r.id === "string" && r.id.length > 0 ? r.id : "rec_" + Date.now() + "_" + idx,
      date: typeof r.date === "string" ? r.date.trim() : getLocalDateString(),
      timestamp: Number.isFinite(r.timestamp) ? r.timestamp : Date.now(),
      subjectId: r.subjectId,
      subjectName: typeof r.subjectName === "string" ? r.subjectName : "Course",
      subjectCode: typeof r.subjectCode === "string" ? r.subjectCode.toUpperCase() : "SUB",
      status: r.status,
      slotTime: typeof r.slotTime === "string" ? r.slotTime : undefined,
      room: typeof r.room === "string" ? r.room : undefined,
      note: typeof r.note === "string" ? r.note : undefined,
      isEdited: typeof r.isEdited === "boolean" ? r.isEdited : undefined,
      editedAt: typeof r.editedAt === "string" ? r.editedAt : undefined,
      unitCount: Number.isFinite(r.unitCount) && r.unitCount > 0 ? r.unitCount : undefined,
      attendedDelta: Number.isFinite(r.attendedDelta) ? r.attendedDelta : undefined,
      totalDelta: Number.isFinite(r.totalDelta) ? r.totalDelta : undefined,
      isAdjustment: typeof r.isAdjustment === "boolean" ? r.isAdjustment : undefined,
    }));
}

function sanitizeExams(list) {
  if (!Array.isArray(list)) return [];
  const validExamTypes = ["Mid-Sem", "End-Sem", "Practical", "Internal", "Project"];

  return list
    .filter(e => e && typeof e === "object" && typeof e.name === "string" && e.name.trim().length > 0)
    .map((e, idx) => ({
      id: typeof e.id === "string" && e.id.length > 0 ? e.id : "exam_" + Date.now() + "_" + idx,
      name: e.name.trim(),
      type: validExamTypes.includes(e.type) ? e.type : "Mid-Sem",
      date: typeof e.date === "string" ? e.date.trim() : getLocalDateString(),
    }));
}

function normalizeTimeString(timeStr) {
  if (!timeStr) return '';
  const cleaned = timeStr
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  const padTimeComponent = (part) => {
    const trimmed = part.trim();
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(.*)$/);
    if (timeMatch) {
      const paddedHour = timeMatch[1].padStart(2, '0');
      return `${paddedHour}:${timeMatch[2]}${timeMatch[3]}`;
    }
    return trimmed;
  };

  if (cleaned.includes(' - ')) {
    return cleaned.split(' - ').map(padTimeComponent).join(' - ');
  }
  return padTimeComponent(cleaned);
}

function isSlotMatchingRecord(recordSlotTime, recordNote, slotStartTime, slotEndTime, slotDay) {
  if (!slotStartTime) return false;
  const normRecTime = normalizeTimeString(recordSlotTime);
  const normSlotStart = normalizeTimeString(slotStartTime);
  const normSlotEnd = slotEndTime ? normalizeTimeString(slotEndTime) : '';
  const fullSlotTime = normSlotEnd ? `${normSlotStart} - ${normSlotEnd}` : normSlotStart;

  if (normRecTime) {
    if (normRecTime === fullSlotTime) return true;
    if (normRecTime.includes(' - ') && normSlotEnd) {
      return normRecTime === fullSlotTime;
    }
    if (!normRecTime.includes(' - ') || !normSlotEnd) {
      const recStart = normRecTime.split(' - ')[0].trim();
      if (recStart === normSlotStart) return true;
    }
  }
  if (recordNote) {
    if (slotDay && /Timetable:\s*(MON|TUE|WED|THU|FRI|SAT|SUN)/i.test(recordNote)) {
      const dayMatch = recordNote.match(/Timetable:\s*(MON|TUE|WED|THU|FRI|SAT|SUN)/i);
      if (dayMatch && dayMatch[1].toUpperCase() !== slotDay.toUpperCase()) {
        return false;
      }
    }
    if (fullSlotTime && recordNote.includes(fullSlotTime)) return true;
    if (normSlotStart && recordNote.includes(normSlotStart)) return true;
  }
  return false;
}



function pruneOrphanedEntities(subjects, timetable, records) {
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

function validateBackupRelationships(subjects, timetable, records) {
  if (!subjects || subjects.length === 0) return true;
  const subjectIds = new Set(subjects.map(s => s.id));
  return (
    timetable.every(slot => subjectIds.has(slot.subjectId)) &&
    records.every(record => subjectIds.has(record.subjectId))
  );
}

module.exports = {
  sanitizeProfile,
  sanitizeSubjects,
  sanitizeTimetable,
  sanitizeRecords,
  sanitizeExams,
  getLocalDateString,
  normalizeTimeString,
  isSlotMatchingRecord,
  validateBackupRelationships,
  pruneOrphanedEntities,
};
