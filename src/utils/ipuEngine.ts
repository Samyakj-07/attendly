import {
  Subject,
  TimetableSlot,
  RiskLevel,
  SkipAnalysisItem,
  SkipRecommendationReport,
  SemesterHealthReport,
} from '../types';

/**
 * Calculates raw attendance percentage clamped between 0 and 100.
 */
export function attendancePercentage(attended: number, total: number): number {
  if (total <= 0) return 100.0;
  const pct = (attended / total) * 100;
  return Math.min(100, Math.max(0, parseFloat(pct.toFixed(1))));
}

/**
 * Calculates how many classes a student can safely miss before falling below target.
 * Formula: floor((Attended - (Target * Total)) / Target)
 */
export function classesCanMiss(attended: number, total: number, targetPct: number = 75): number {
  if (total <= 0) return 0;
  const t = targetPct / 100;
  if (attended / total < t) return 0;
  const allowable = Math.floor((attended - t * total) / t);
  return Math.max(0, allowable);
}

/**
 * Calculates how many consecutive classes a student MUST attend to reach the target threshold.
 * Formula: ceil(((Target * Total) - Attended) / (1 - Target))
 */
export function classesNeeded(attended: number, total: number, targetPct: number = 75): number {
  if (total <= 0) return 0;
  const t = targetPct / 100;
  if (t >= 1) return 0; // 100% target
  if (attended / total >= t) return 0;
  const needed = Math.ceil((t * total - attended) / (1 - t));
  return Math.max(0, needed);
}

/**
 * Returns signed buffer:
 * > 0: positive buffer (classes you can safely miss)
 * < 0: negative buffer (classes you are short of reaching target)
 * 0: exactly on the line
 */
export function attendanceBuffer(attended: number, total: number, targetPct: number = 75): number {
  if (total <= 0) return 0;
  const pct = (attended / total) * 100;
  if (pct >= targetPct) {
    return classesCanMiss(attended, total, targetPct);
  } else {
    return -classesNeeded(attended, total, targetPct);
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

  const maxSteps = Math.max(needed, 1);
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

  const overallCurrentPct = attendancePercentage(overallAttended, overallTotal);
  const overallIfSkipAllPct = attendancePercentage(
    overallAttended,
    overallTotal + todaySlots.length
  );

  const analyzedSlots: SkipAnalysisItem[] = [];
  const criticalSubjects: Subject[] = [];
  let safestSubject: Subject | undefined;
  let maxBuffer = -999;

  for (const slot of todaySlots) {
    const subject = subjectMap.get(slot.subjectId);
    if (!subject) continue;

    const currentPct = attendancePercentage(subject.attended, subject.total);
    const postSkip = simulateMissClasses(subject.attended, subject.total, 1);
    const bufferBefore = attendanceBuffer(subject.attended, subject.total, subject.targetRequirement || targetPct);
    const bufferAfter = attendanceBuffer(postSkip.postAttended, postSkip.postTotal, subject.targetRequirement || targetPct);

    let category: 'DO_NOT_MISS' | 'ATTEND_IF_POSSIBLE' | 'SAFEST_TO_MISS';
    let advice = '';

    if (currentPct < (subject.targetRequirement || targetPct)) {
      category = 'DO_NOT_MISS';
      advice = `Missing this drops you further to ${postSkip.postPct}%. Detain risk!`;
      criticalSubjects.push(subject);
    } else if (postSkip.postPct < (subject.targetRequirement || targetPct) || bufferBefore <= 1) {
      category = 'DO_NOT_MISS';
      advice = `Currently at ${currentPct}%. Skipping drops you below ${targetPct}% to ${postSkip.postPct}%.`;
      criticalSubjects.push(subject);
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
      attendanceScore: 100,
      bufferScore: 100,
      riskPenalty: 0,
      consistencyScore: 100,
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

/**
 * Converts a time string (e.g. "09:30", "9:30", "10:10", "01:30", "3:30 PM")
 * into total minutes from midnight for perfect chronological sorting.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const isPM = clean.toLowerCase().includes('pm');
  const isAM = clean.toLowerCase().includes('am');
  const timeOnly = clean.replace(/(am|pm)/i, '').trim();
  const [hStr, mStr] = timeOnly.split(':');
  let h = parseInt(hStr) || 0;
  const m = parseInt(mStr) || 0;

  // Handle standard 12-hour college afternoon slots (1 PM to 7 PM commonly entered as 01:30, 02:30, etc.)
  if (h >= 1 && h <= 7 && !isAM) {
    h += 12;
  } else if (isPM && h < 12) {
    h += 12;
  }
  return h * 60 + m;
}
