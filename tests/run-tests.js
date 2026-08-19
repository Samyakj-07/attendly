/**
 * Attendly Comprehensive Automated Test Suite
 * Validates deterministic mathematical algorithms, time engine, and storage sanitization.
 */

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${message} | Expected: ${expected}, Got: ${actual}`);
    failedTests++;
    throw new Error(`${message} | Expected: ${expected}, Got: ${actual}`);
  } else {
    console.log(`✅ PASS: ${message} (${actual})`);
    passedTests++;
  }
}

function assertClose(actual, expected, tolerance = 0.05, message) {
  if (Math.abs(actual - expected) > tolerance) {
    console.error(`❌ FAIL: ${message} | Expected: ${expected} ± ${tolerance}, Got: ${actual}`);
    failedTests++;
    throw new Error(`${message} | Expected: ${expected} ± ${tolerance}, Got: ${actual}`);
  } else {
    console.log(`✅ PASS: ${message} (${actual} ≈ ${expected})`);
    passedTests++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. IPU ENGINE ALGORITHMS (Pure Mathematical Functions)
// ─────────────────────────────────────────────────────────────────────────────

function attendancePercentage(attended, total) {
  if (!Number.isFinite(attended) || !Number.isFinite(total) || total <= 0) return 100.0;
  const safeAttended = Math.max(0, attended);
  const safeTotal = Math.max(1, total);
  const pct = (safeAttended / safeTotal) * 100;
  return Math.min(100, Math.max(0, parseFloat(pct.toFixed(1))));
}

function classesCanMiss(attended, total, targetPct = 75) {
  if (!Number.isFinite(attended) || !Number.isFinite(total) || total <= 0 || !Number.isFinite(targetPct) || targetPct <= 0) return 0;
  const safeAttended = Math.max(0, attended);
  const safeTotal = Math.max(1, total);
  const t = Math.min(100, Math.max(1, targetPct)) / 100;
  if (safeAttended / safeTotal < t) return 0;
  const allowable = Math.floor((safeAttended - t * safeTotal) / t);
  return Math.max(0, allowable);
}

function classesNeeded(attended, total, targetPct = 75) {
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

function attendanceBuffer(attended, total, targetPct = 75) {
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

function predictInternalMarks(percentage) {
  const safePct = Math.min(100, Math.max(0, Number.isFinite(percentage) ? percentage : 0));
  if (safePct >= 90.0) {
    return { marks: 5, slab: '90% – 100%', nextMilestonePct: null, nextMilestoneText: 'Maximum 5 / 5 marks achieved!' };
  } else if (safePct >= 85.0) {
    return { marks: 4, slab: '85% – 89.9%', nextMilestonePct: 90.0, nextMilestoneText: 'Reach 90.0% to gain +1 mark (5/5)' };
  } else if (safePct >= 80.0) {
    return { marks: 3, slab: '80% – 84.9%', nextMilestonePct: 85.0, nextMilestoneText: 'Reach 85.0% to gain +1 mark (4/5)' };
  } else if (safePct >= 75.0) {
    return { marks: 2, slab: '75% – 79.9%', nextMilestonePct: 80.0, nextMilestoneText: 'Reach 80.0% to gain +1 mark (3/5)' };
  } else {
    return { marks: 0, slab: 'Below 75%', nextMilestonePct: 75.0, nextMilestoneText: 'Reach 75.0% to escape 0 marks and eligibility penalty' };
  }
}

function normalizeTimeString(t) {
  if (!t) return '';
  return t
    .replace(/\s*[\u2010-\u2015\u2212\-]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
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
    if (h >= 1 && h <= 6) {
      h += 12;
    }
  }

  return h * 60 + m;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RUN SUITE
// ─────────────────────────────────────────────────────────────────────────────

console.log('====================================================');
console.log('🧪 RUNNING ATTENDLY TEST SUITE');
console.log('====================================================\n');

try {
  // Test 1: attendancePercentage
  console.log('--- Suite 1: Attendance Percentage ---');
  assertEqual(attendancePercentage(0, 0), 100.0, '0 total classes defaults to 100.0%');
  assertEqual(attendancePercentage(8, 10), 80.0, '8/10 equals 80.0%');
  assertEqual(attendancePercentage(8, 11), 72.7, '8/11 rounds to 72.7%');
  assertEqual(attendancePercentage(15, 15), 100.0, '15/15 equals 100.0%');
  assertEqual(attendancePercentage(0, 10), 0.0, '0/10 equals 0.0%');
  assertEqual(attendancePercentage(-5, 10), 0.0, 'Negative attended clamped to 0.0%');

  // Test 2: classesCanMiss (Bunk Buffer)
  console.log('\n--- Suite 2: Classes Can Miss (Buffer) ---');
  assertEqual(classesCanMiss(8, 10, 75), 0, '8/10 at 75% target can miss 0 (miss 1 drops to 72.7%)');
  assertEqual(classesCanMiss(9, 10, 75), 2, '9/10 at 75% target can miss 2 (9/12 = 75.0%)');
  assertEqual(classesCanMiss(10, 10, 75), 3, '10/10 at 75% target can miss 3 (10/13 = 76.9%)');
  assertEqual(classesCanMiss(6, 10, 75), 0, 'Below target can miss 0');
  assertEqual(classesCanMiss(10, 0, 75), 0, 'Zero total returns 0');

  // Test 3: classesNeeded (Consecutive Recovery)
  console.log('\n--- Suite 3: Classes Needed (Recovery Roadmap) ---');
  assertEqual(classesNeeded(6, 10, 75), 6, '6/10 at 75% needs 6 consecutive classes (12/16 = 75.0%)');
  assertEqual(classesNeeded(8, 10, 75), 0, '8/10 at 75% needs 0 classes (already 80.0%)');
  assertEqual(classesNeeded(5, 10, 80), 15, '5/10 at 80% needs 15 consecutive classes (20/25 = 80.0%)');
  assertEqual(classesNeeded(5, 6, 100), Infinity, 'Reaching 100% after missing a class is Infinity');

  // Test 4: attendanceBuffer (Signed buffer)
  console.log('\n--- Suite 4: Signed Attendance Buffer ---');
  assertEqual(attendanceBuffer(9, 10, 75), 2, 'Safe standing returns positive buffer (+2)');
  assertEqual(attendanceBuffer(6, 10, 75), -6, 'Shortage standing returns negative buffer (-6)');
  assertEqual(attendanceBuffer(0, 0, 75), 0, 'Unstarted course returns 0 buffer');

  // Test 5: predictInternalMarks
  console.log('\n--- Suite 5: Internal Assessment Marks ---');
  assertEqual(predictInternalMarks(95).marks, 5, '95% gives 5 marks');
  assertEqual(predictInternalMarks(87.5).marks, 4, '87.5% gives 4 marks');
  assertEqual(predictInternalMarks(82).marks, 3, '82% gives 3 marks');
  assertEqual(predictInternalMarks(76).marks, 2, '76% gives 2 marks');
  assertEqual(predictInternalMarks(71).marks, 0, '71% gives 0 marks');

  // Test 6: Time Parsing & Normalization
  console.log('\n--- Suite 6: Time Parsing & Normalization ---');
  assertEqual(timeToMinutes('09:30'), 570, '09:30 AM maps to 570 minutes');
  assertEqual(timeToMinutes('01:30'), 810, '01:30 (afternoon) maps to 810 minutes (13:30)');
  assertEqual(timeToMinutes('12:00'), 720, '12:00 (noon) maps to 720 minutes');
  assertEqual(timeToMinutes('06:30 PM'), 1110, '06:30 PM maps to 1110 minutes');
  assertEqual(normalizeTimeString('09:30–10:30'), '09:30 - 10:30', 'En-dash normalized to standard hyphen');

  // Test 7: HTML Escaping
  console.log('\n--- Suite 7: Security & HTML Escaping ---');
  assertEqual(escapeHtml('<script>alert("XSS")</script>'), '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;', 'Script tags and quotes sanitized');
  assertEqual(escapeHtml("John's & Jane's"), 'John&#039;s &amp; Jane&#039;s', 'Ampersands and single quotes sanitized');

  // Test 8: Lab Practical 2x Unit Arithmetic
  console.log('\n--- Suite 8: Lab Practical 2x Unit Weighting ---');
  const labSubject = { attended: 10, total: 12, isLab2x: true, type: 'Lab' };
  const unitWeight = labSubject.isLab2x || labSubject.type === 'Lab' ? 2 : 1;
  assertEqual(unitWeight, 2, 'Lab practical identifies as 2 unit weight');
  const postPresentAttended = labSubject.attended + unitWeight;
  const postPresentTotal = labSubject.total + unitWeight;
  assertEqual(attendancePercentage(postPresentAttended, postPresentTotal), 85.7, 'Marking 2x lab present increments 2 units (12/14 = 85.7%)');
  const postAbsentAttended = labSubject.attended;
  const postAbsentTotal = labSubject.total + unitWeight;
  assertEqual(attendancePercentage(postAbsentAttended, postAbsentTotal), 71.4, 'Marking 2x lab absent increments total by 2 units (10/14 = 71.4%)');

  // Test 9: Multi-Period Compounding Skips
  console.log('\n--- Suite 9: Multi-Period Compounding Skips ---');
  // Scenario: Student has 2 periods of Course A (18/20) and 1 period of Course B (8/10) on the same day
  const subjectA = { id: 'sub_a', name: 'Operating Systems', attended: 18, total: 20, isLab2x: false };
  const subjectB = { id: 'sub_b', name: 'Computer Networks', attended: 8, total: 10, isLab2x: false };
  // If skipping 1 period of A:
  const postSkip1A = attendancePercentage(subjectA.attended, subjectA.total + 1);
  assertEqual(postSkip1A, 85.7, 'Skipping 1 period of OS drops from 90.0% to 85.7% (18/21)');
  // If skipping 2 periods of A (e.g. double period):
  const postSkip2A = attendancePercentage(subjectA.attended, subjectA.total + 2);
  assertEqual(postSkip2A, 81.8, 'Skipping 2 periods of OS drops from 90.0% to 81.8% (18/22)');
  // Aggregate if skipping all 3 classes today:
  const aggAttended = subjectA.attended + subjectB.attended; // 26
  const aggTotalIfSkipAll = (subjectA.total + 2) + (subjectB.total + 1); // 22 + 11 = 33
  assertEqual(attendancePercentage(aggAttended, aggTotalIfSkipAll), 78.8, 'Skipping all 3 scheduled classes results in 78.8% aggregate (26/33)');

  // Test 10: Storage Sanitizer & Boundary Protection
  console.log('\n--- Suite 10: Storage Schema Boundaries & Sanitization ---');
  const sanitizers = require('./storageSanitizersTestHelper');
  
  // Profile Sanitizer tests
  const validProfile = sanitizers.sanitizeProfile({
    name: '  Rohan Sharma  ',
    targetAttendance: 150, // Should clamp to 100
    semester: 15, // Should clamp to 12
    rollNumber: '04520802724',
  });
  assertEqual(validProfile.name, 'Rohan Sharma', 'Profile trims whitespace from student name');
  assertEqual(validProfile.targetAttendance, 100, 'Target attendance clamped to maximum 100%');
  assertEqual(validProfile.semester, 12, 'Semester clamped to valid range 1..12');

  const invalidProfile = sanitizers.sanitizeProfile(null);
  assertEqual(invalidProfile, null, 'Null profile input returns null safely');

  // Subjects Sanitizer tests
  const sanitizedSubjects = sanitizers.sanitizeSubjects([
    { name: 'Operating Systems', code: 'bcs-301', attended: '12', total: '15', isLab2x: false },
    { name: '', code: 'INVALID' }, // Should be dropped
    { name: 'Data Structures Lab', type: 'Lab', attended: -2, total: 5 },
  ]);
  assertEqual(sanitizedSubjects.length, 2, 'Sanitizer filters out subjects without valid names');
  assertEqual(sanitizedSubjects[0].code, 'BCS-301', 'Subject code automatically uppercased');
  assertEqual(sanitizedSubjects[0].attended, 12, 'Numeric string attended count parsed to integer');
  assertEqual(sanitizedSubjects[1].attended, 0, 'Negative attended count clamped to 0');
  assertEqual(sanitizedSubjects[1].isLab2x, true, 'Lab type automatically infers 2x weighting');

  // Orphan Pruning & Relationship Integrity
  console.log('\n--- Suite 11: Database-Free Relational Integrity & Pruning ---');
  const testSubs = [{ id: 'sub_1', name: 'Maths' }, { id: 'sub_2', name: 'Physics' }];
  const testSlots = [
    { id: 'slot_1', subjectId: 'sub_1', day: 'MON' },
    { id: 'slot_2', subjectId: 'sub_deleted', day: 'TUE' },
  ];
  const testRecords = [
    { id: 'rec_1', subjectId: 'sub_1', status: 'PRESENT' },
    { id: 'rec_2', subjectId: 'sub_deleted', status: 'ABSENT' },
  ];

  const pruned = sanitizers.pruneOrphanedEntities(testSubs, testSlots, testRecords);
  assertEqual(pruned.validTimetable.length, 1, 'Orphaned timetable slot with deleted subjectId removed');
  assertEqual(pruned.validRecords.length, 1, 'Orphaned attendance record with deleted subjectId removed');
  assertEqual(sanitizers.validateBackupRelationships(testSubs, pruned.validTimetable, pruned.validRecords), true, 'Pruned relationships pass validation');

  console.log('\n====================================================');
  console.log(`🎉 ALL TESTS PASSED SUCCESSFULLY! (${passedTests} passed, ${failedTests} failed)`);
  console.log('====================================================');
  process.exit(0);
} catch (e) {
  console.error('\n❌ Test Suite Failed with Error:\n', e);
  process.exit(1);
}

