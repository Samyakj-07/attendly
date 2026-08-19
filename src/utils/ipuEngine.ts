import {
  Subject,
  TimetableSlot,
  RiskLevel,
  SkipAnalysisItem,
  SkipRecommendationReport,
  SemesterHealthReport,
} from '../types';

/**
 * Formats a Date into standard YYYY-MM-DD in the device's local timezone.
 * Prevents UTC midnight drift bugs caused by toISOString().
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates raw attendance percentage clamped between 0 and 100.
 */
export function attendancePercentage(attended: number, total: number): number {
  if (!Number.isFinite(attended) || !Number.isFinite(total) || total <= 0) return 100.0;
  const safeAttended = Math.max(0, attended);
  const safeTotal = Math.max(1, total);
  const pct = (safeAttended / safeTotal) * 100;
  return Math.min(100, Math.max(0, parseFloat(pct.toFixed(1))));
}

/**
 * Calculates how many classes a student can safely miss before falling below target.
 * Formula: floor((Attended - (Target * Total)) / Target)
 */
export function classesCanMiss(attended: number, total: number, targetPct: number = 75): number {
  if (!Number.isFinite(attended) || !Number.isFinite(total) || total <= 0 || !Number.isFinite(targetPct) || targetPct <= 0) return 0;
  const safeAttended = Math.max(0, attended);
  const safeTotal = Math.max(1, total);
  const t = Math.min(100, Math.max(1, targetPct)) / 100;
  if (safeAttended / safeTotal < t) return 0;
  const allowable = Math.floor((safeAttended - t * safeTotal) / t);
  return Math.max(0, allowable);
}

/**
 * Calculates how many consecutive classes a student MUST attend to reach the target threshold.
 * Formula: ceil(((Target * Total) - Attended) / (1 - Target))
 */
export function classesNeeded(attended: number, total: number, targetPct: number = 75): number {
  if (!Number.isFinite(attended) || !Number.isFinite(total) || total <= 0 || !Number.isFinite(targetPct) || targetPct <= 0) return 0;
  const safeAttended = Math.max(0, attended);
  const safeTotal = Math.max(1, total);
  const safeTarget = Math.min(100, Math.max(1, targetPct));
  
  if (safeTarget >= 100) {
    return safeAttended >= safeTotal ? 0 : Infinity;
  }
  
  const t = safeTarget / 100;
  if (safeAttended / safeTotal >= t) return 0;
  const rawNeeded = (t * safeTotal - safeAttended) / (1 - t);
  const needed = Math.ceil(parseFloat(rawNeeded.toFixed(6)));
  return Math.max(0, needed);
}

/**
 * Returns signed buffer:
 * > 0: positive buffer (classes you can safely miss)
 * < 0: negative buffer (classes you are short of reaching target)
 * 0: exactly on the line
 */
export function attendanceBuffer(attended: number, total: number, targetPct: number = 75): number {
  if (!Number.isFinite(attended) || !Number.isFinite(total) || total <= 0) return 0;
  const safeTarget = Number.isFinite(targetPct) && targetPct > 0 ? targetPct : 75;
  const pct = (Math.max(0, attended) / Math.max(1, total)) * 100;
  if (pct >= safeTarget) {
    return classesCanMiss(attended, total, safeTarget);
  } else {
    const needed = classesNeeded(attended, total, safeTarget);
    return Number.isFinite(needed) ? -needed : -(Math.max(1, total) - Math.max(0, attended));
  }
}

/**
 * Categorizes risk level based on current % and buffer.
 */
export function subjectRiskLevel(
  attended: number,
  total: number,
  targetPct: number = 75
): {
  level: RiskLevel;
  label: string;
  badgeText: string;
  reason: string;
  color: string;
  bgGlow: string;
} {
  if (total === 0) {
    return {
      level: 'HEALTHY',
      label: 'NEW COURSE',
      badgeText: '0 Classes',
      reason: 'No attendance records yet.',
      color: '#38BDF8',
      bgGlow: 'rgba(56, 189, 248, 0.15)',
    };
  }

  const pct = attendancePercentage(attended, total);
  const buffer = attendanceBuffer(attended, total, targetPct);

  if (pct >= 85) {
    return {
      level: 'SAFE',
      label: 'SAFE',
      badgeText: `+${buffer} Buffer`,
      reason: 'Comfortable attendance buffer. You are well above requirements.',
      color: '#10B981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
    };
  }

  if (pct >= targetPct && buffer >= 2) {
    return {
      level: 'HEALTHY',
      label: 'HEALTHY',
      badgeText: `+${buffer} Buffer`,
      reason: 'Above target with a solid safety margin.',
      color: '#34D399',
      bgGlow: 'rgba(52, 211, 153, 0.15)',
    };
  }

  if (pct >= targetPct && buffer < 2) {
    return {
      level: 'WATCH',
      label: 'WATCH',
      badgeText: `+${buffer} Low Buffer`,
      reason: 'Borderline attendance. Missing a single lecture will push you into the danger zone.',
      color: '#F59E0B',
      bgGlow: 'rgba(245, 158, 11, 0.15)',
    };
  }

  // Below target cases:
  const needed = Math.abs(buffer);
  if (needed <= 3) {
    return {
      level: 'RECOVERING',
      label: 'RECOVERING',
      badgeText: `−${needed} Short`,
      reason: `Need ${needed} more consecutive lectures to cross ${targetPct}%.`,
      color: '#FB923C',
      bgGlow: 'rgba(251, 146, 60, 0.15)',
    };
  }

  if (needed <= 8) {
    return {
      level: 'CRITICAL',
      label: 'CRITICAL',
      badgeText: `−${needed} Critical`,
      reason: `Significant shortage. Immediate attendance required to avoid IPU detention.`,
      color: '#EF4444',
      bgGlow: 'rgba(239, 68, 68, 0.15)',
    };
  }

  return {
    level: 'RECOVERY_DIFFICULT',
    label: 'HIGH SHORTAGE',
    badgeText: `−${needed} High Risk`,
    reason: `Severe deficit. Requires ${needed} consecutive lectures or medical/OD condonation.`,
    color: '#DC2626',
    bgGlow: 'rgba(220, 38, 38, 0.2)',
  };
}

/**
 * Generates exact step-by-step recovery projection.
 */
export function generateRecoveryRoadmap(
  attended: number,
  total: number,
  targetPct: number = 75
): Array<{
  step: number;
  attendedCount: number;
  totalCount: number;
  projectedPct: number;
  reachedTarget: boolean;
}> {
  const needed = classesNeeded(attended, total, targetPct);
  const steps: Array<{
    step: number;
    attendedCount: number;
    totalCount: number;
    projectedPct: number;
    reachedTarget: boolean;
  }> = [];

  const maxSteps = Number.isFinite(needed) ? Math.min(Math.max(needed, 1), 60) : 60;
  for (let i = 1; i <= maxSteps; i++) {
    const curAttended = attended + i;
    const curTotal = total + i;
    const pct = attendancePercentage(curAttended, curTotal);
    steps.push({
      step: i,
      attendedCount: curAttended,
      totalCount: curTotal,
      projectedPct: pct,
      reachedTarget: pct >= targetPct,
    });
  }

  return steps;
}

/**
 * Predicts percentage after missing N consecutive classes.
 */
export function simulateMissClasses(
  attended: number,
  total: number,
  missCount: number
): { postAttended: number; postTotal: number; postPct: number } {
  const postAttended = attended;
  const postTotal = total + missCount;
  return {
    postAttended,
    postTotal,
    postPct: attendancePercentage(postAttended, postTotal),
  };
}

/**
 * Predicts percentage after attending N consecutive classes.
 */
export function simulateAttendClasses(
  attended: number,
  total: number,
  attendCount: number
): { postAttended: number; postTotal: number; postPct: number } {
  const postAttended = attended + attendCount;
  const postTotal = total + attendCount;
  return {
    postAttended,
    postTotal,
    postPct: attendancePercentage(postAttended, postTotal),
  };
}

/**
 * "CAN I SKIP TODAY?" Signature Decision Engine
 * Analyzes each class scheduled today and returns actionable battle plan.
 */
export function analyzeTodaySkip(
  todaySlots: TimetableSlot[],
  subjects: Subject[],
  targetPct: number = 75
): SkipRecommendationReport {
  const subjectMap = new Map<string, Subject>();
  subjects.forEach(s => subjectMap.set(s.id, s));

  let overallAttended = 0;
  let overallTotal = 0;
  subjects.forEach(s => {
    overallAttended += s.attended;
    overallTotal += s.total;
  });

  let todayTotalUnits = 0;
  todaySlots.forEach(slot => {
    const sub = subjectMap.get(slot.subjectId);
    const isLab = sub?.isLab2x || slot.type === 'Lab' || slot.type === 'Practical';
    todayTotalUnits += isLab ? 2 : 1;
  });

  const overallCurrentPct = attendancePercentage(overallAttended, overallTotal);
  const overallIfSkipAllPct = attendancePercentage(
    overallAttended,
    overallTotal + todayTotalUnits
  );

  const analyzedSlots: SkipAnalysisItem[] = [];
  const criticalSubjects: Subject[] = [];
  let safestSubject: Subject | undefined;
  let maxBuffer = -999;

  // Track cumulative skipped units per subject for compounding multi-period days
  const subjectSkippedUnits = new Map<string, number>();

  for (const slot of todaySlots) {
    const subject = subjectMap.get(slot.subjectId);
    if (!subject) continue;

    const currentSkipped = subjectSkippedUnits.get(subject.id) || 0;
    const isLab = subject.isLab2x || slot.type === 'Lab' || slot.type === 'Practical';
    const missUnits = isLab ? 2 : 1;

    // Simulate current state incorporating previously skipped slots today
    const effectiveAttended = subject.attended;
    const effectiveTotal = subject.total + currentSkipped;
    const currentPct = attendancePercentage(effectiveAttended, effectiveTotal);

    // Simulate skipping this additional slot
    const postSkip = simulateMissClasses(effectiveAttended, effectiveTotal, missUnits);
    const target = subject.targetRequirement || targetPct;
    const bufferBefore = attendanceBuffer(effectiveAttended, effectiveTotal, target);
    const bufferAfter = attendanceBuffer(postSkip.postAttended, postSkip.postTotal, target);

    let category: 'DO_NOT_MISS' | 'ATTEND_IF_POSSIBLE' | 'SAFEST_TO_MISS';
    let advice = '';

    if (currentPct < target) {
      category = 'DO_NOT_MISS';
      advice = `Missing this drops you further to ${postSkip.postPct}%. Detain risk!`;
      if (!criticalSubjects.some(s => s.id === subject.id)) {
        criticalSubjects.push(subject);
      }
    } else if (postSkip.postPct < target || bufferBefore <= 1) {
      category = 'DO_NOT_MISS';
      advice = `Currently at ${currentPct}%. Skipping drops you below ${target}% to ${postSkip.postPct}%.`;
      if (!criticalSubjects.some(s => s.id === subject.id)) {
        criticalSubjects.push(subject);
      }
    } else if (bufferBefore <= 3) {
      category = 'ATTEND_IF_POSSIBLE';
      advice = `Safe for now (+${bufferBefore} buffer), but skipping leaves only +${bufferAfter} buffer.`;
    } else {
      category = 'SAFEST_TO_MISS';
      advice = `Comfortable buffer (+${bufferBefore}). Skipping leaves you safe at ${postSkip.postPct}%.`;
      if (bufferBefore > maxBuffer) {
        maxBuffer = bufferBefore;
        safestSubject = subject;
      }
    }

    // Accumulate skipped units for this subject for subsequent slot evaluations
    subjectSkippedUnits.set(subject.id, currentSkipped + missUnits);

    analyzedSlots.push({
      subject,
      slot,
      currentPercentage: currentPct,
      postSkipPercentage: postSkip.postPct,
      bufferBefore,
      bufferAfter,
      category,
      advice,
    });
  }

  // Generate intelligent plain-English advice
  const doNotMissList = analyzedSlots
    .filter(a => a.category === 'DO_NOT_MISS')
    .map(a => a.subject.name);
  const safestList = analyzedSlots
    .filter(a => a.category === 'SAFEST_TO_MISS')
    .map(a => a.subject.name);

  let summaryAdvice = '';
  if (analyzedSlots.length === 0) {
    summaryAdvice = 'No classes scheduled for today. Enjoy your day!';
  } else if (doNotMissList.length > 0 && safestList.length > 0) {
    summaryAdvice = `Must attend: ${doNotMissList.join(', ')}. ${safestList.join(', ')} is currently your safest to miss.`;
  } else if (doNotMissList.length > 0) {
    summaryAdvice = `High danger day! Do NOT skip: ${doNotMissList.join(', ')}. Your attendance is on the line.`;
  } else if (safestList.length === analyzedSlots.length) {
    summaryAdvice = `All ${analyzedSlots.length} classes are currently in the safe buffer zone.`;
  } else {
    summaryAdvice = `You have moderate buffer across classes. Attend prioritised lectures.`;
  }

  return {
    totalClassesToday: todaySlots.length,
    analyzedSlots,
    overallCurrentPct,
    overallIfSkipAllPct,
    summaryAdvice,
    safestSubject,
    criticalSubjects,
  };
}

/**
 * Calculates Semester Health Score (0 to 100) based on weighted factors.
 */
export function calculateSemesterHealth(
  subjects: Subject[],
  targetPct: number = 75
): SemesterHealthReport {
  if (subjects.length === 0) {
    return {
      score: 100,
      status: 'OPTIMAL',
      summary: 'No subjects configured yet.',
      attendanceScore: 50,
      bufferScore: 30,
      riskPenalty: 0,
      consistencyScore: 20,
    };
  }

  let totalAttended = 0;
  let totalClasses = 0;
  let criticalCount = 0;
  let watchCount = 0;
  let totalBuffer = 0;

  for (const s of subjects) {
    totalAttended += s.attended;
    totalClasses += s.total;
    const req = s.targetRequirement || targetPct;
    const pct = attendancePercentage(s.attended, s.total);
    const buf = attendanceBuffer(s.attended, s.total, req);
    totalBuffer += buf;

    if (pct < req) {
      criticalCount++;
    } else if (buf <= 1) {
      watchCount++;
    }
  }

  const overallPct = attendancePercentage(totalAttended, totalClasses);
  
  // Attendance Score Component (Max 50 pts)
  const attendanceScore = Math.min(50, Math.max(0, (overallPct / 100) * 50));
  
  // Buffer Resilience Component (Max 30 pts)
  const avgBuffer = totalBuffer / subjects.length;
  const bufferScore = Math.min(30, Math.max(0, 15 + avgBuffer * 3));
  
  // Penalty for Critical/Watch subjects
  const riskPenalty = criticalCount * 18 + watchCount * 6;
  
  // Consistency Component (Max 20 pts)
  const consistencyScore = criticalCount === 0 ? 20 : Math.max(0, 20 - criticalCount * 8);

  const rawScore = Math.round(attendanceScore + bufferScore + consistencyScore - riskPenalty);
  const score = Math.min(100, Math.max(0, rawScore));

  let status: 'OPTIMAL' | 'HEALTHY' | 'MODERATE' | 'CRITICAL' | 'DETENTION_RISK';
  let summary = '';

  if (score >= 88) {
    status = 'OPTIMAL';
    summary = 'Outstanding academic standing. You have ample buffer across all subjects.';
  } else if (score >= 75) {
    status = 'HEALTHY';
    summary = 'Solid attendance. All subjects are in a safe zone.';
  } else if (score >= 60) {
    status = 'MODERATE';
    summary = 'Moderate risk. A few subjects have low buffer and require attention.';
  } else if (score >= 40) {
    status = 'CRITICAL';
    summary = 'Critical attendance alert! One or more subjects have fallen below university requirement.';
  } else {
    status = 'DETENTION_RISK';
    summary = 'Severe detention danger! Immediate recovery and faculty consultation required.';
  }

  return {
    score,
    status,
    summary,
    attendanceScore: Math.round(attendanceScore),
    bufferScore: Math.round(bufferScore),
    riskPenalty: Math.round(riskPenalty),
    consistencyScore: Math.round(consistencyScore),
  };
}

/**
 * Predicts IPU internal marks score based on attendance percentage slab.
 */
export function predictInternalMarks(pct: number): {
  marks: number;
  maxMarks: number;
  slab: string;
  nextMilestoneText: string;
} {
  if (pct >= 90) {
    return {
      marks: 5,
      maxMarks: 5,
      slab: '≥ 90% (Maximum 5/5)',
      nextMilestoneText: 'Maximum internal marks achieved for attendance!',
    };
  }
  if (pct >= 85) {
    return {
      marks: 4,
      maxMarks: 5,
      slab: '85% – 89.9% (4/5 Marks)',
      nextMilestoneText: `Reach 90.0% to gain +1 mark (5/5).`,
    };
  }
  if (pct >= 80) {
    return {
      marks: 3,
      maxMarks: 5,
      slab: '80% – 84.9% (3/5 Marks)',
      nextMilestoneText: `Reach 85.0% to gain +1 mark (4/5).`,
    };
  }
  if (pct >= 75) {
    return {
      marks: 2,
      maxMarks: 5,
      slab: '75% – 79.9% (2/5 Marks)',
      nextMilestoneText: `Reach 80.0% to gain +1 mark (3/5).`,
    };
  }
  return {
    marks: 0,
    maxMarks: 5,
    slab: '< 75% (0/5 Marks - Detention Risk)',
    nextMilestoneText: `Reach 75.0% to avoid exam detention and secure internal marks.`,
  };
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // If a range is passed (e.g., "09:30 – 10:30"), extract the start time
  const rawStart = timeStr.split(/[\u2010-\u2015\u2212\-]/)[0] || timeStr;
  const clean = rawStart.trim();
  const isPM = clean.toLowerCase().includes('pm');
  const isAM = clean.toLowerCase().includes('am');
  const timeOnly = clean.replace(/(am|pm)/i, '').trim();
  const [hStr, mStr] = timeOnly.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;

  if (isAM) {
    if (h === 12) h = 0;
  } else if (isPM) {
    if (h < 12) h += 12;
  } else {
    // No explicit AM/PM:
    // Hours 1..6 (e.g., "01:30", "2:00", "03:30", "06:00") map to afternoon/evening slots (13:00 - 18:00)
    if (h >= 1 && h <= 6) {
      h += 12;
    }
    // Hours 7..11 are standard morning/pre-noon slots (07:00 - 11:00) or 24-hr if >= 12
  }

  return h * 60 + m;
}

/**
 * Standardize time strings (replaces unicode dashes, pads single-digit hours e.g. "9:30" -> "09:30", normalizes whitespace)
 */
export function normalizeTimeString(timeStr?: string): string {
  if (!timeStr) return '';
  const cleaned = timeStr
    .replace(/[\u2010-\u2015\u2212]/g, '-') // Replace unicode dashes/hyphens with standard '-'
    .replace(/\s*-\s*/g, ' - ') // Standardize spacing around hyphen
    .replace(/\s+/g, ' ')
    .trim();

  // Helper to pad HH:MM if single digit hour
  const padTimeComponent = (part: string): string => {
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

/**
 * Robustly matches an attendance record to a timetable slot by time/range and optional day tag
 */
export function isSlotMatchingRecord(
  recordSlotTime?: string,
  recordNote?: string,
  slotStartTime?: string,
  slotEndTime?: string,
  slotDay?: string
): boolean {
  if (!slotStartTime) return false;
  const normRecTime = normalizeTimeString(recordSlotTime);
  const normSlotStart = normalizeTimeString(slotStartTime);
  const normSlotEnd = slotEndTime ? normalizeTimeString(slotEndTime) : '';
  const fullSlotTime = normSlotEnd ? `${normSlotStart} - ${normSlotEnd}` : normSlotStart;

  if (normRecTime) {
    // 1. Exact full range match (e.g., "09:30 - 10:30" === "09:30 - 10:30")
    if (normRecTime === fullSlotTime) return true;

    // 2. If both specify ranges, do NOT loosely match just on start time if end times differ
    if (normRecTime.includes(' - ') && normSlotEnd) {
      return normRecTime === fullSlotTime;
    }

    // 3. If record only has start time or slot only has start time
    if (!normRecTime.includes(' - ') || !normSlotEnd) {
      const recStart = normRecTime.split(' - ')[0].trim();
      if (recStart === normSlotStart) return true;
    }
  }

  // 4. Fallback matching via recordNote
  if (recordNote) {
    // If note specifies a day (e.g. "Timetable: MON") and slotDay is specified but differs, do not match
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


