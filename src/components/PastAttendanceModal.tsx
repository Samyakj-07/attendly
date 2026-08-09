import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import { AttendanceRecord, AttendanceStatus, DayOfWeek } from '../types';
import {
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  CheckCheck,
  Clock,
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
  const {
    records,
    subjects,
    timetable,
    markAttendance,
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
    const parts = selectedDateStr.split('-');
    if (parts.length !== 3) return { dayName: 'MON', formatted: selectedDateStr };

    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const d = parseInt(parts[2]);
    const dt = new Date(y, m, d);

    const dayIdx = dt.getDay();
    const daysMap: DayOfWeek[] = ['MON', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dow = daysMap[dayIdx] || 'MON';

    const formatted = dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return { dayName: dow, formatted };
  }, [selectedDateStr]);

  // Records already logged on the selected date
  const recordsOnSelectedDate = useMemo(() => {
    return records.filter(r => {
      if (selectedSubjectId !== 'ALL' && r.subjectId !== selectedSubjectId) {
        return false;
      }
      return r.date === selectedDateStr;
    });
  }, [records, selectedDateStr, selectedSubjectId]);

  // Subjects to show for this date:
  // Show timetable scheduled subjects first, plus all registered subjects so user can mark anything!
  const displaySubjects = useMemo(() => {
    const scheduledSlots = timetable.filter(t => t.day === selectedDayInfo.dayName);
    const scheduledSubIds = new Set(scheduledSlots.map(s => s.subjectId));

    if (selectedSubjectId !== 'ALL') {
      const sub = subjects.find(s => s.id === selectedSubjectId);
      return sub ? [sub] : [];
    }

    // Sort subjects: scheduled today first, then other subjects
    const scheduledSubs = subjects.filter(s => scheduledSubIds.has(s.id));
    const nonScheduledSubs = subjects.filter(s => !scheduledSubIds.has(s.id));

    return [...scheduledSubs, ...nonScheduledSubs];
  }, [subjects, timetable, selectedDayInfo.dayName, selectedSubjectId]);

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

  // Mark all subjects present for this day in 1 tap
  const handleMarkAllPresent = async () => {
    AppHaptics.success();
    for (const sub of displaySubjects) {
      const existing = recordsOnSelectedDate.find(r => r.subjectId === sub.id);
      if (existing) {
        if (existing.status !== 'PRESENT') {
          await editAttendanceRecord(existing.id, 'PRESENT');
        }
      } else {
        await markAttendance(sub.id, 'PRESENT', {
          date: selectedDateStr,
          time: '09:30 – 10:30',
        });
      }
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Top Bar Header */}
          <View style={styles.modalHeader}>
            <View>
              <View style={styles.eyebrowRow}>
                <CalendarIcon size={11} color={THEME.colors.cyan} />
                <Text style={styles.eyebrow}>CALENDAR ATTENDANCE</Text>
              </View>
              <Text style={styles.modalTitle}>Mark & Edit Attendance</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                AppHaptics.light();
                onClose();
              }}
            >
              <X size={18} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Subject Filter Chips */}
          <View style={styles.filterWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  selectedSubjectId === 'ALL' && styles.filterPillActive,
                ]}
                onPress={() => {
                  AppHaptics.selection();
                  setSelectedSubjectId('ALL');
                }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedSubjectId === 'ALL' && styles.filterPillTextActive,
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
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => {
                      AppHaptics.selection();
                      setSelectedSubjectId(s.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isSelected && styles.filterPillTextActive,
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
            {/* 🗓️ Compact Month Calendar Card */}
            <View style={styles.calendarCard}>
              {/* Month Navigation Row */}
              <View style={styles.monthNavRow}>
                <TouchableOpacity
                  style={styles.monthArrowBtn}
                  onPress={handlePrevMonth}
                >
                  <ChevronLeft size={16} color={THEME.colors.textPrimary} />
                </TouchableOpacity>

                <Text style={styles.monthTitleText}>
                  {MONTH_NAMES[currentMonth.getMonth()]}{' '}
                  {currentMonth.getFullYear()}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.todayPillBtn}
                    onPress={handleJumpToToday}
                  >
                    <Text style={styles.todayPillText}>Today</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.monthArrowBtn}
                    onPress={handleNextMonth}
                  >
                    <ChevronRight size={16} color={THEME.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Day Labels */}
              <View style={styles.weekdayHeaderRow}>
                {WEEKDAY_SHORT.map((wd, i) => (
                  <Text key={`wd_${i}`} style={styles.weekdayLabel}>
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
                        cd.isSelected && styles.dateCellSelected,
                        cd.isToday && !cd.isSelected && styles.dateCellToday,
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
                          cd.isSelected && styles.dateNumberTextSelected,
                          cd.isToday && !cd.isSelected && styles.dateNumberTextToday,
                        ]}
                      >
                        {cd.dayNumber}
                      </Text>

                      {/* Status Dots */}
                      <View style={styles.statusDotRow}>
                        {hasPresent && <View style={[styles.dot, styles.dotPresent]} />}
                        {hasAbsent && <View style={[styles.dot, styles.dotAbsent]} />}
                        {hasCancelled && (
                          <View style={[styles.dot, styles.dotCancelled]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 🎯 SELECTED DATE & MARKING ACTIONS SECTION */}
            <View style={styles.markingSection}>
              {/* Selected Day Banner */}
              <View style={styles.dateBannerRow}>
                <View>
                  <Text style={styles.dateBannerTitle}>
                    {selectedDayInfo.formatted.toUpperCase()}
                  </Text>
                  <Text style={styles.dateBannerSub}>
                    {recordsOnSelectedDate.length > 0 ? (
                      <Text>
                        <Text style={{ color: THEME.colors.emerald, fontWeight: '800' }}>
                          {daySummary.pres + daySummary.od} Attended
                        </Text>{' '}
                        ·{' '}
                        <Text style={{ color: THEME.colors.crimson, fontWeight: '800' }}>
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
                    style={styles.markAllPresentBtn}
                    activeOpacity={0.8}
                    onPress={handleMarkAllPresent}
                  >
                    <CheckCheck size={12} color={THEME.colors.emerald} />
                    <Text style={styles.markAllPresentText}>Mark All Present</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* LIST OF COURSES WITH DIRECT 1-TAP MARK BUTTONS */}
              <View style={styles.coursesList}>
                {displaySubjects.length === 0 ? (
                  <View style={styles.noCoursesCard}>
                    <Text style={styles.noCoursesText}>No courses created yet.</Text>
                    <Text style={styles.noCoursesSub}>
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
                      t => t.day === selectedDayInfo.dayName && t.subjectId === sub.id
                    );

                    return (
                      <View key={sub.id} style={styles.courseMarkCard}>
                        <View style={styles.courseInfoRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.courseNameText} numberOfLines={1}>
                              {sub.name}
                            </Text>
                            <Text style={styles.courseSlotText}>
                              {scheduledSlot
                                ? `${scheduledSlot.startTime} – ${scheduledSlot.endTime}`
                                : 'Registered Course'}
                              {sub.room ? ` · ${sub.room}` : ''}
                            </Text>
                          </View>

                          <View style={styles.codeBadge}>
                            <Text style={styles.codeBadgeText}>{sub.code}</Text>
                          </View>
                        </View>

                        {/* Direct 1-Tap Attendance Buttons */}
                        <View style={styles.buttonsRow}>
                          {/* Present Button */}
                          <TouchableOpacity
                            style={[
                              styles.btnStatus,
                              styles.btnPresent,
                              activeStatus === 'PRESENT' && styles.btnPresentActive,
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
                                  ? THEME.colors.emerald
                                  : THEME.colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.btnStatusText,
                                activeStatus === 'PRESENT' && {
                                  color: THEME.colors.emerald,
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
                              styles.btnAbsent,
                              activeStatus === 'ABSENT' && styles.btnAbsentActive,
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
                                  ? THEME.colors.crimson
                                  : THEME.colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.btnStatusText,
                                activeStatus === 'ABSENT' && {
                                  color: THEME.colors.crimson,
                                  fontWeight: '900',
                                },
                              ]}
                            >
                              Absent
                            </Text>
                          </TouchableOpacity>

                          {/* OD Button */}
                          <TouchableOpacity
                            style={[
                              styles.btnStatus,
                              styles.btnOD,
                              activeStatus === 'OD' && styles.btnODActive,
                            ]}
                            activeOpacity={0.75}
                            onPress={() =>
                              handleMarkCourse(
                                sub.id,
                                'OD',
                                scheduledSlot
                                  ? `${scheduledSlot.startTime} – ${scheduledSlot.endTime}`
                                  : '09:30 – 10:30'
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.btnStatusText,
                                activeStatus === 'OD' && {
                                  color: THEME.colors.cyan,
                                  fontWeight: '900',
                                },
                              ]}
                            >
                              OD
                            </Text>
                          </TouchableOpacity>

                          {/* Cancelled Button */}
                          <TouchableOpacity
                            style={[
                              styles.btnStatus,
                              styles.btnCancel,
                              activeStatus === 'CANCELLED' && styles.btnCancelActive,
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
                                activeStatus === 'CANCELLED' && {
                                  color: THEME.colors.textPrimary,
                                  fontWeight: '900',
                                },
                              ]}
                            >
                              Off
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
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '94%',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
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
    color: THEME.colors.cyan,
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.md + 1,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  filterWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  filterScroll: {
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.xs,
    gap: 6,
  },
  filterPill: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.cyan,
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textTertiary,
  },
  filterPillTextActive: {
    color: THEME.colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.sm,
    paddingBottom: 40,
    gap: 12,
  },
  calendarCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
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
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  monthTitleText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: 0.2,
  },
  todayPillBtn: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.cyan,
  },
  todayPillText: {
    fontSize: 8.5,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.cyan,
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
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
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: THEME.colors.cyan,
  },
  dateCellToday: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.borderHighlight,
  },
  dateNumberText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textSecondary,
  },
  dateNumberTextSelected: {
    color: THEME.colors.cyan,
    fontWeight: THEME.typography.weights.heavy,
  },
  dateNumberTextToday: {
    color: THEME.colors.textPrimary,
  },
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
  dotPresent: {
    backgroundColor: THEME.colors.emerald,
  },
  dotAbsent: {
    backgroundColor: THEME.colors.crimson,
  },
  dotCancelled: {
    backgroundColor: THEME.colors.textTertiary,
  },
  markingSection: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  dateBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    marginBottom: 10,
  },
  dateBannerTitle: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  dateBannerSub: {
    fontSize: 9.5,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  markAllPresentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.emeraldSubtle,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  markAllPresentText: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.emerald,
  },
  coursesList: {
    gap: 8,
  },
  courseMarkCard: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
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
    color: THEME.colors.textPrimary,
  },
  courseSlotText: {
    fontSize: 9.5,
    color: THEME.colors.textTertiary,
    marginTop: 1,
  },
  codeBadge: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  codeBadgeText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.cyan,
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
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  btnStatusText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textSecondary,
  },
  btnPresent: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  btnPresentActive: {
    backgroundColor: THEME.colors.emeraldSubtle,
    borderColor: THEME.colors.emerald,
    borderWidth: 1.5,
  },
  btnAbsent: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  btnAbsentActive: {
    backgroundColor: THEME.colors.crimsonSubtle,
    borderColor: THEME.colors.crimson,
    borderWidth: 1.5,
  },
  btnOD: {
    borderColor: 'rgba(56, 189, 248, 0.2)',
    flex: 0.7,
  },
  btnODActive: {
    backgroundColor: THEME.colors.cyanSubtle,
    borderColor: THEME.colors.cyan,
    borderWidth: 1.5,
  },
  btnCancel: {
    borderColor: THEME.colors.borderSubtle,
    flex: 0.7,
  },
  btnCancelActive: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.textPrimary,
    borderWidth: 1.5,
  },
  noCoursesCard: {
    padding: 16,
    alignItems: 'center',
  },
  noCoursesText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textSecondary,
  },
  noCoursesSub: {
    fontSize: 9.5,
    color: THEME.colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
});
