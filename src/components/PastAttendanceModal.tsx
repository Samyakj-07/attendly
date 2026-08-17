import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAttendance } from '../context/AttendanceContext';
import { AttendanceRecord, AttendanceStatus, DayOfWeek } from '../types';
import {
  attendancePercentage,
  attendanceBuffer,
} from '../utils/ipuEngine';
import {
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCheck,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface PastAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  initialSubjectId?: string;
}

export const PastAttendanceModal: React.FC<PastAttendanceModalProps> = ({
  visible,
  onClose,
  initialSubjectId,
}) => {
  const { colors, isDark } = useTheme();
  const {
    records,
    subjects,
    timetable,
    overallPercentage,
    overallBuffer,
    totalAttended,
    totalClasses,
    profile,
    markAttendance,
    markAllSlotsAttendance,
    editAttendanceRecord,
    deleteAttendanceRecord,
  } = useAttendance();

  // Current viewed month date (1st of that month)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Selected date in YYYY-MM-DD format (defaults to today)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  });

  // Subject filter
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || 'ALL'
  );

  useEffect(() => {
    if (visible) {
      if (initialSubjectId) {
        setSelectedSubjectId(initialSubjectId);
      } else {
        setSelectedSubjectId('ALL');
      }
    }
  }, [visible, initialSubjectId]);

  // Compute live active course stats reflecting updated numbers
  const activeCourseStats = useMemo(() => {
    if (selectedSubjectId === 'ALL') {
      const missed = Math.max(0, totalClasses - totalAttended);
      return {
        title: 'All Registered Courses',
        code: `${subjects.length} Subjects`,
        attended: totalAttended,
        total: totalClasses,
        missed,
        pct: overallPercentage,
        buffer: overallBuffer,
      };
    }
    const sub = subjects.find(s => s.id === selectedSubjectId);
    if (!sub) {
      return {
        title: 'Course Attendance',
        code: '',
        attended: 0,
        total: 0,
        missed: 0,
        pct: 100,
        buffer: 0,
      };
    }
    const pct = attendancePercentage(sub.attended, sub.total);
    const target = sub.targetRequirement || profile.targetAttendance || 75;
    const buf = attendanceBuffer(sub.attended, sub.total, target);
    const missed = Math.max(0, sub.total - sub.attended);
    return {
      title: sub.name,
      code: sub.code,
      attended: sub.attended,
      total: sub.total,
      missed,
      pct,
      buffer: buf,
    };
  }, [selectedSubjectId, subjects, totalAttended, totalClasses, overallPercentage, overallBuffer, profile]);

  // Month navigation
  const handlePrevMonth = () => {
    AppHaptics.light();
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    AppHaptics.light();
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    AppHaptics.selection();
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`
    );
  };

  // Calendar Grid computation
  const { calendarDays } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon = 0, Sun = 6

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      records: AttendanceRecord[];
    }> = [];

    // Empty padding slots before 1st of month
    for (let i = 0; i < startOffset; i++) {
      days.push({
        dateStr: `pad_prev_${i}`,
        dayNumber: 0,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        records: [],
      });
    }

    const todayStr = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')}`;
    })();

    // Actual days of month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const dayRecords = records.filter(r => {
        if (selectedSubjectId !== 'ALL' && r.subjectId !== selectedSubjectId) {
          return false;
        }
        return r.date === dateStr;
      });

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        records: dayRecords,
      });
    }

    return { calendarDays: days };
  }, [currentMonth, records, selectedSubjectId, selectedDateStr]);

  // Selected date info
  const selectedDayInfo = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays: DayOfWeek[] = ['SUN' as any, 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayName = dayNames[dateObj.getDay()];
    const shortDay = shortDays[dateObj.getDay()] || 'MON';
    const formatted = `${dayName}, ${dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
    return { dayName, shortDay, formatted };
  }, [selectedDateStr]);

  // Records for selected date
  const recordsOnSelectedDate = useMemo(() => {
    return records.filter(r => r.date === selectedDateStr);
  }, [records, selectedDateStr]);

  // Subjects to show for this date:
  // Show timetable scheduled subjects first, plus all registered subjects so user can mark anything!
  const displaySubjects = useMemo(() => {
    const scheduledSlots = timetable.filter(t => t.day === selectedDayInfo.shortDay);
    const scheduledSubIds = new Set(scheduledSlots.map(s => s.subjectId));

    if (selectedSubjectId !== 'ALL') {
      const sub = subjects.find(s => s.id === selectedSubjectId);
      return sub ? [sub] : [];
    }

    // Sort subjects: scheduled today first, then other subjects
    const scheduledSubs = subjects.filter(s => scheduledSubIds.has(s.id));
    const nonScheduledSubs = subjects.filter(s => !scheduledSubIds.has(s.id));

    return [...scheduledSubs, ...nonScheduledSubs];
  }, [subjects, timetable, selectedDayInfo.shortDay, selectedSubjectId]);

  // Handle 1-tap mark or switch status for a course on the selected date
  const handleMarkCourse = async (
    subjectId: string,
    status: AttendanceStatus,
    slotTime?: string
  ) => {
    AppHaptics.selection();
    const existing = recordsOnSelectedDate.find(r => r.subjectId === subjectId);
    if (existing) {
      if (existing.status === status) {
        // Unmark if tapping same status
        await deleteAttendanceRecord(existing.id);
      } else {
        await editAttendanceRecord(existing.id, status);
      }
    } else {
      await markAttendance(subjectId, status, {
        date: selectedDateStr,
        time: slotTime || '09:30 – 10:30',
      });
    }
  };

  // Mark all subjects present for this day in 1 atomic tap without race conditions
  const handleMarkAllPresent = async () => {
    AppHaptics.success();
    const scheduledSlots = timetable.filter(t => t.day === selectedDayInfo.shortDay);
    
    // If timetable slots exist for this day, mark all scheduled slots
    if (scheduledSlots.length > 0) {
      await markAllSlotsAttendance(scheduledSlots, 'PRESENT', selectedDateStr);
    } else {
      // If no slots exist for this day, create virtual slots for display subjects
      const virtualSlots = displaySubjects.map(sub => ({
        id: `virtual_${sub.id}`,
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        type: sub.type,
        day: selectedDayInfo.shortDay,
        startTime: '09:30',
        endTime: '10:30',
        room: sub.room || 'A-204',
      }));
      await markAllSlotsAttendance(virtualSlots, 'PRESENT', selectedDateStr);
    }
  };

  // Day summary counts
  const daySummary = useMemo(() => {
    let pres = 0;
    let abs = 0;
    let od = 0;
    let can = 0;
    recordsOnSelectedDate.forEach(r => {
      if (r.status === 'PRESENT') pres++;
      else if (r.status === 'ABSENT') abs++;
      else if (r.status === 'OD') od++;
      else if (r.status === 'CANCELLED') can++;
    });
    const total = pres + abs + od;
    const pct = total > 0 ? ((pres + od) / total) * 100 : 0;
    return { pres, abs, od, can, total, pct };
  }, [recordsOnSelectedDate]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
          {/* Top Bar Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <View style={styles.eyebrowRow}>
                <CalendarIcon size={11} color={colors.accent} />
                <Text style={[styles.eyebrow, { color: colors.accent }]}>CALENDAR ATTENDANCE</Text>
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Mark & Edit Attendance</Text>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
              onPress={() => {
                AppHaptics.light();
                onClose();
              }}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Subject Filter Chips */}
          <View style={[styles.filterWrapper, { borderBottomColor: colors.borderSubtle }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  selectedSubjectId === 'ALL' && { backgroundColor: colors.surfaceElevated, borderColor: colors.accent },
                ]}
                onPress={() => {
                  AppHaptics.selection();
                  setSelectedSubjectId('ALL');
                }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: colors.textTertiary },
                    selectedSubjectId === 'ALL' && { color: colors.textPrimary },
                  ]}
                >
                  All Courses
                </Text>
              </TouchableOpacity>

              {subjects.map(s => {
                const isSelected = selectedSubjectId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.filterPill,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                      isSelected && { backgroundColor: colors.surfaceElevated, borderColor: colors.accent },
                    ]}
                    onPress={() => {
                      AppHaptics.selection();
                      setSelectedSubjectId(s.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: colors.textTertiary },
                        isSelected && { color: colors.textPrimary },
                      ]}
                    >
                      {s.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 📊 Live Course Attendance Metrics Banner */}
            <View style={[styles.courseOverviewCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.courseOverviewTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.courseOverviewTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {activeCourseStats.title}
                  </Text>
                  <Text style={[styles.courseOverviewSub, { color: colors.textTertiary }]}>
                    {activeCourseStats.code} · Total {activeCourseStats.total} Classes
                  </Text>
                </View>

                <View style={[styles.coursePctBadge, { backgroundColor: activeCourseStats.pct >= 75 ? colors.emeraldSubtle : colors.crimsonSubtle }]}>
                  <Text style={[styles.coursePctText, { color: activeCourseStats.pct >= 75 ? colors.emerald : colors.crimson }]}>
                    {activeCourseStats.pct.toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* Metric Pillars */}
              <View style={[styles.metricPillarsRow, { borderTopColor: colors.borderSubtle }]}>
                <View style={styles.metricPillar}>
                  <Text style={[styles.pillarValue, { color: colors.emerald }]}>{activeCourseStats.attended}</Text>
                  <Text style={[styles.pillarLabel, { color: colors.textTertiary }]}>ATTENDED</Text>
                </View>

                <View style={styles.metricPillar}>
                  <Text style={[styles.pillarValue, { color: colors.crimson }]}>{activeCourseStats.missed}</Text>
                  <Text style={[styles.pillarLabel, { color: colors.textTertiary }]}>MISSED</Text>
                </View>

                <View style={styles.metricPillar}>
                  <Text style={[styles.pillarValue, { color: activeCourseStats.buffer >= 0 ? colors.accent : colors.crimson }]}>
                    {activeCourseStats.buffer >= 0 ? `+${activeCourseStats.buffer}` : activeCourseStats.buffer}
                  </Text>
                  <Text style={[styles.pillarLabel, { color: colors.textTertiary }]}>
                    {activeCourseStats.buffer >= 0 ? 'SAFE BUFFER' : 'SHORTAGE'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 🗓️ Compact Month Calendar Card */}
            <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              {/* Month Navigation Row */}
              <View style={styles.monthNavRow}>
                <TouchableOpacity
                  style={[styles.monthArrowBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
                  onPress={handlePrevMonth}
                >
                  <ChevronLeft size={16} color={colors.textPrimary} />
                </TouchableOpacity>

                <Text style={[styles.monthTitleText, { color: colors.textPrimary }]}>
                  {MONTH_NAMES[currentMonth.getMonth()]}{' '}
                  {currentMonth.getFullYear()}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.todayPillBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.accent }]}
                    onPress={handleJumpToToday}
                  >
                    <Text style={[styles.todayPillText, { color: colors.accent }]}>Today</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.monthArrowBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
                    onPress={handleNextMonth}
                  >
                    <ChevronRight size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Day Labels */}
              <View style={[styles.weekdayHeaderRow, { borderBottomColor: colors.borderSubtle }]}>
                {WEEKDAY_SHORT.map((wd, i) => (
                  <Text key={`wd_${i}`} style={[styles.weekdayLabel, { color: colors.textTertiary }]}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Grid of Dates */}
              <View style={styles.gridContainer}>
                {calendarDays.map((cd, idx) => {
                  if (!cd.isCurrentMonth) {
                    return <View key={`pad_${idx}`} style={styles.dateCellEmpty} />;
                  }

                  const hasPresent = cd.records.some(
                    r => r.status === 'PRESENT' || r.status === 'OD'
                  );
                  const hasAbsent = cd.records.some(r => r.status === 'ABSENT');
                  const hasCancelled = cd.records.some(
                    r => r.status === 'CANCELLED'
                  );

                  return (
                    <TouchableOpacity
                      key={cd.dateStr}
                      style={[
                        styles.dateCell,
                        cd.isSelected && [styles.dateCellSelected, { backgroundColor: colors.surfaceElevated, borderColor: colors.accent }],
                        cd.isToday && !cd.isSelected && [styles.dateCellToday, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderHighlight }],
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        AppHaptics.selection();
                        setSelectedDateStr(cd.dateStr);
                      }}
                    >
                      <Text
                        style={[
                          styles.dateNumberText,
                          { color: colors.textSecondary },
                          cd.isSelected && [styles.dateNumberTextSelected, { color: colors.accent }],
                          cd.isToday && !cd.isSelected && [styles.dateNumberTextToday, { color: colors.textPrimary }],
                        ]}
                      >
                        {cd.dayNumber}
                      </Text>

                      {/* Status Dots */}
                      <View style={styles.statusDotRow}>
                        {hasPresent && <View style={[styles.dot, { backgroundColor: colors.emerald }]} />}
                        {hasAbsent && <View style={[styles.dot, { backgroundColor: colors.crimson }]} />}
                        {hasCancelled && (
                          <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 🎯 SELECTED DATE & MARKING ACTIONS SECTION */}
            <View style={[styles.markingSection, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              {/* Selected Day Banner */}
              <View style={[styles.dateBannerRow, { borderBottomColor: colors.borderSubtle }]}>
                <View>
                  <Text style={[styles.dateBannerTitle, { color: colors.textPrimary }]}>
                    {selectedDayInfo.formatted.toUpperCase()}
                  </Text>
                  <Text style={[styles.dateBannerSub, { color: colors.textTertiary }]}>
                    {recordsOnSelectedDate.length > 0 ? (
                      <Text>
                        <Text style={{ color: colors.emerald, fontWeight: '800' }}>
                          {daySummary.pres + daySummary.od} Attended
                        </Text>{' '}
                        ·{' '}
                        <Text style={{ color: colors.crimson, fontWeight: '800' }}>
                          {daySummary.abs} Missed
                        </Text>{' '}
                        ({daySummary.total > 0 ? `${daySummary.pct.toFixed(0)}%` : '0%'})
                      </Text>
                    ) : (
                      'No attendance marked yet. Tap below to mark:'
                    )}
                  </Text>
                </View>

                {displaySubjects.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.markAllPresentBtn,
                      {
                        backgroundColor: colors.emeraldSubtle,
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(46, 139, 99, 0.4)',
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={handleMarkAllPresent}
                  >
                    <CheckCheck size={12} color={colors.emerald} />
                    <Text style={[styles.markAllPresentText, { color: colors.emerald }]}>Mark All Present</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* LIST OF COURSES WITH DIRECT 1-TAP MARK BUTTONS */}
              <View style={styles.coursesList}>
                {displaySubjects.length === 0 ? (
                  <View style={styles.noCoursesCard}>
                    <Text style={[styles.noCoursesText, { color: colors.textSecondary }]}>No courses created yet.</Text>
                    <Text style={[styles.noCoursesSub, { color: colors.textTertiary }]}>
                      Add courses on the main screen to start marking attendance.
                    </Text>
                  </View>
                ) : (
                  displaySubjects.map(sub => {
                    const existingRecord = recordsOnSelectedDate.find(
                      r => r.subjectId === sub.id
                    );
                    const activeStatus = existingRecord?.status;

                    const scheduledSlot = timetable.find(
                      t => t.day === selectedDayInfo.shortDay && t.subjectId === sub.id
                    );

                    return (
                      <View key={sub.id} style={[styles.courseMarkCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                        <View style={styles.courseInfoRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.courseNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                              {sub.name}
                            </Text>
                            <Text style={[styles.courseSlotText, { color: colors.textTertiary }]}>
                              {scheduledSlot
                                ? `${scheduledSlot.startTime} – ${scheduledSlot.endTime}`
                                : 'Registered Course'}
                              {sub.room ? ` · ${sub.room}` : ''}
                            </Text>
                          </View>

                          <View style={[styles.codeBadge, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                            <Text style={[styles.codeBadgeText, { color: colors.accent }]}>{sub.code}</Text>
                          </View>
                        </View>

                        {/* Direct 1-Tap Attendance Buttons */}
                        <View style={styles.buttonsRow}>
                          {/* Present Button */}
                          <TouchableOpacity
                            style={[
                              styles.btnStatus,
                              {
                                backgroundColor: colors.surface,
                                borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(46, 139, 99, 0.2)',
                              },
                              activeStatus === 'PRESENT' && {
                                backgroundColor: colors.emeraldSubtle,
                                borderColor: colors.emerald,
                                borderWidth: 1.5,
                              },
                            ]}
                            activeOpacity={0.75}
                            onPress={() =>
                              handleMarkCourse(
                                sub.id,
                                'PRESENT',
                                scheduledSlot
                                  ? `${scheduledSlot.startTime} – ${scheduledSlot.endTime}`
                                  : '09:30 – 10:30'
                              )
                            }
                          >
                            <Check
                              size={12}
                              color={
                                activeStatus === 'PRESENT'
                                  ? colors.emerald
                                  : colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.btnStatusText,
                                { color: colors.textSecondary },
                                activeStatus === 'PRESENT' && {
                                  color: colors.emerald,
                                  fontWeight: '900',
                                },
                              ]}
                            >
                              Present
                            </Text>
                          </TouchableOpacity>

                          {/* Absent Button */}
                          <TouchableOpacity
                            style={[
                              styles.btnStatus,
                              {
                                backgroundColor: colors.surface,
                                borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(200, 92, 92, 0.2)',
                              },
                              activeStatus === 'ABSENT' && {
                                backgroundColor: colors.crimsonSubtle,
                                borderColor: colors.crimson,
                                borderWidth: 1.5,
                              },
                            ]}
                            activeOpacity={0.75}
                            onPress={() =>
                              handleMarkCourse(
                                sub.id,
                                'ABSENT',
                                scheduledSlot
                                  ? `${scheduledSlot.startTime} – ${scheduledSlot.endTime}`
                                  : '09:30 – 10:30'
                              )
                            }
                          >
                            <X
                              size={12}
                              color={
                                activeStatus === 'ABSENT'
                                  ? colors.crimson
                                  : colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.btnStatusText,
                                { color: colors.textSecondary },
                                activeStatus === 'ABSENT' && {
                                  color: colors.crimson,
                                  fontWeight: '900',
                                },
                              ]}
                            >
                              Absent
                            </Text>
                          </TouchableOpacity>

                          {/* No Class Button */}
                          <TouchableOpacity
                            style={[
                              styles.btnStatus,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.borderSubtle,
                                flex: 1,
                              },
                              activeStatus === 'CANCELLED' && {
                                backgroundColor: colors.surfaceElevated,
                                borderColor: colors.textPrimary,
                                borderWidth: 1.5,
                              },
                            ]}
                            activeOpacity={0.75}
                            onPress={() =>
                              handleMarkCourse(
                                sub.id,
                                'CANCELLED',
                                scheduledSlot
                                  ? `${scheduledSlot.startTime} – ${scheduledSlot.endTime}`
                                  : '09:30 – 10:30'
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.btnStatusText,
                                { color: colors.textSecondary },
                                activeStatus === 'CANCELLED' && {
                                  color: colors.textPrimary,
                                  fontWeight: '900',
                                },
                              ]}
                            >
                              No Class
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '94%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.md + 1,
    fontWeight: THEME.typography.weights.heavy,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  filterWrapper: {
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.xs,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.sm,
    paddingBottom: 40,
    gap: 12,
  },
  courseOverviewCard: {
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
  },
  courseOverviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courseOverviewTitle: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
  },
  courseOverviewSub: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.medium,
    marginTop: 1,
  },
  coursePctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
  },
  coursePctText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
  },
  metricPillarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  metricPillar: {
    flex: 1,
    alignItems: 'center',
  },
  pillarValue: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
  },
  pillarLabel: {
    fontSize: 7.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  calendarCard: {
    borderRadius: THEME.borderRadius.lg,
    padding: 10,
    borderWidth: 1,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  monthArrowBtn: {
    padding: 5,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  monthTitleText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
  },
  todayPillBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  todayPillText: {
    fontSize: 8.5,
    fontWeight: THEME.typography.weights.bold,
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginVertical: 1,
  },
  dateCellEmpty: {
    width: '14.28%',
    height: 32,
  },
  dateCellSelected: {
    borderWidth: 1.5,
  },
  dateCellToday: {
    borderWidth: 1,
  },
  dateNumberText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  dateNumberTextSelected: {
    fontWeight: THEME.typography.weights.heavy,
  },
  dateNumberTextToday: {},
  statusDotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
    height: 3,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  markingSection: {
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
  },
  dateBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  dateBannerTitle: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.5,
  },
  dateBannerSub: {
    fontSize: 9.5,
    marginTop: 2,
  },
  markAllPresentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  markAllPresentText: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.bold,
  },
  coursesList: {
    gap: 8,
  },
  courseMarkCard: {
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    borderWidth: 1,
  },
  courseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courseNameText: {
    fontSize: 11.5,
    fontWeight: THEME.typography.weights.bold,
  },
  courseSlotText: {
    fontSize: 9.5,
    marginTop: 1,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  codeBadgeText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  btnStatus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
  },
  btnStatusText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  noCoursesCard: {
    padding: 16,
    alignItems: 'center',
  },
  noCoursesText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  noCoursesSub: {
    fontSize: 9.5,
    textAlign: 'center',
    marginTop: 2,
  },
});
