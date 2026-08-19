import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const APP_LOGO = require('../../assets/icon.png');
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAttendance } from '../context/AttendanceContext';
import { generateIPUAttendancePDF } from '../utils/pdfReport';
import { BackupManager } from '../utils/backupFile';
import { Analytics } from '../utils/analytics';
import {
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Database,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  FileCode,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

export const ProfileScreen: React.FC = React.memo(() => {
  const { colors } = useTheme();
  const {
    profile,
    subjects,
    records,
    updateProfile,
    reloadAllData,
    resetAllData,
  } = useAttendance();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editSection, setEditSection] = useState(profile.section);
  const [editRoll, setEditRoll] = useState(profile.rollNumber || '');
  const [editTarget, setEditTarget] = useState(profile.targetAttendance?.toString() || '75');

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [restoreJsonText, setRestoreJsonText] = useState('');
  const [backupFeedback, setBackupFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [isTelemetryEnabled, setIsTelemetryEnabled] = useState(true);

  useEffect(() => {
    Analytics.isTelemetryEnabled().then(val => setIsTelemetryEnabled(val));
  }, []);

  const backupInspection = useMemo(() => {
    return BackupManager.inspectBackup(restoreJsonText);
  }, [restoreJsonText]);

  const handleSaveProfile = async () => {
    AppHaptics.success();
    await updateProfile({
      ...profile,
      name: editName.trim(),
      section: editSection.trim(),
      rollNumber: editRoll.trim(),
      enrollmentNumber: editRoll.trim(),
      targetAttendance: parseInt(editTarget) || 75,
    });
    Analytics.track('profile_updated');
    setIsEditProfileOpen(false);
  };

  const handleExportPDF = async () => {
    AppHaptics.medium();
    Analytics.track('pdf_exported', {
      subject_count: subjects.length,
      record_count: records.length,
    });
    await generateIPUAttendancePDF(profile, subjects, records);
  };

  const handleExportBackup = async () => {
    AppHaptics.medium();
    const success = await BackupManager.exportBackupFile(profile.collegeShort, profile.name);
    if (success) {
      Analytics.track('backup_exported', {
        subject_count: subjects.length,
        record_count: records.length,
      });
      setBackupFeedback({
        status: 'success',
        message: 'Backup file generated! Save it to Google Drive or Files.',
      });
    } else {
      setBackupFeedback({
        status: 'error',
        message: 'Could not open system sharing sheet. Please check file storage permissions.',
      });
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreJsonText.trim()) {
      setBackupFeedback({ status: 'error', message: 'Please paste your backup JSON code.' });
      return;
    }

    const result = await BackupManager.restoreFromJSON(restoreJsonText);
    if (result.success) {
      await reloadAllData();
      AppHaptics.success();
      Analytics.track('backup_restored', {
        subject_count: backupInspection.stats?.subjectCount,
        record_count: backupInspection.stats?.recordCount,
      });
      setBackupFeedback({ status: 'success', message: 'Semester restored successfully!' });
      setRestoreJsonText('');
      setTimeout(() => {
        setIsBackupModalOpen(false);
        setBackupFeedback(null);
      }, 1500);
    } else {
      AppHaptics.warning();
      setBackupFeedback({ status: 'error', message: result.message });
    }
  };

  const studentName = profile.name || 'Student';
  const collegeMeta = `${profile.college || 'Your College'} · ${profile.programme || 'B.Tech'} ${profile.branch || ''} · Semester ${profile.semester || 1} · ${profile.academicSession || '2026–27'}`;

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Editorial Header */}
        <View style={styles.headerBox}>
          <Text style={[styles.screenEyebrow, { color: colors.textTertiary }]}>STUDENT COMMAND & PREFERENCES</Text>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>{studentName}.</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>{collegeMeta}</Text>
        </View>

        {/* 1. Academic Configuration Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>ACADEMIC</Text>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.borderSubtle }]}
            activeOpacity={0.7}
            onPress={() => {
              setEditName(profile.name);
              setEditSection(profile.section);
              setEditRoll(profile.rollNumber || '');
              setEditTarget(profile.targetAttendance?.toString() || '75');
              setIsEditProfileOpen(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Profile & Target Attendance</Text>
              <Text style={[styles.actionSub, { color: colors.textTertiary }]}>
                Section {profile.section} · Roll {profile.rollNumber || 'Not Set'} · {profile.targetAttendance || 75}% Target
              </Text>
            </View>
            <ChevronRight size={14} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.borderSubtle }]}
            activeOpacity={0.7}
            onPress={handleExportPDF}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Official Attendance Statement (PDF)</Text>
              <Text style={[styles.actionSub, { color: colors.textTertiary }]}>Export official attendance statement as PDF</Text>
            </View>
            <Download size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* 2. Data Sovereignty & Vault Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>DATA VAULT (100% OFFLINE)</Text>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.borderSubtle }]}
            activeOpacity={0.7}
            onPress={() => {
              AppHaptics.light();
              setBackupFeedback(null);
              setIsBackupModalOpen(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Backup & Restore Semester</Text>
              <Text style={[styles.actionSub, { color: colors.textTertiary }]}>Save to Google Drive / Files or paste JSON backup</Text>
            </View>
            <Database size={14} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.borderSubtle }]}
            activeOpacity={0.7}
            onPress={async () => {
              AppHaptics.medium();
              await updateProfile({ ...profile, isOnboarded: false });
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Re-run Academic Setup Wizard</Text>
              <Text style={[styles.actionSub, { color: colors.textTertiary }]}>Reconfigure college, programme, branch, or name</Text>
            </View>
            <ChevronRight size={14} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.actionRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Anonymous Analytics</Text>
              <Text style={[styles.actionSub, { color: colors.textTertiary }]}>
                {isTelemetryEnabled ? 'Help improve Attendly with aggregate crash & feature reports' : 'Telemetry completely disabled'}
              </Text>
            </View>
            <Switch
              value={isTelemetryEnabled}
              onValueChange={async (newVal) => {
                AppHaptics.selection();
                setIsTelemetryEnabled(newVal);
                await Analytics.setEnabled(newVal);
              }}
              trackColor={{ false: colors.surfaceSubtle, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(
                'Clear All Local Data?',
                'This will erase all subjects, timetable slots, and attendance history on this device. Make sure you have exported a backup first.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Erase Everything',
                    style: 'destructive',
                    onPress: async () => {
                      AppHaptics.warning();
                      await resetAllData();
                    },
                  },
                ]
              );
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.crimson }]}>
                Clear All Local Data
              </Text>
              <Text style={[styles.actionSub, { color: colors.textTertiary }]}>Reset app to blank state</Text>
            </View>
            <RotateCcw size={14} color={colors.crimson} />
          </TouchableOpacity>
        </View>

        {/* 4. About Attendly Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>ABOUT</Text>
          <View style={[styles.aboutCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={styles.aboutTopRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image
                  source={APP_LOGO}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                    backgroundColor: colors.surface,
                    overflow: 'hidden',
                  }}
                />
                <Text style={[styles.aboutLogoText, { color: colors.textPrimary }]}>Attendly</Text>
              </View>
              <View style={[styles.versionBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.versionText, { color: colors.textTertiary }]}>v1.0.0</Text>
              </View>
            </View>
            <Text style={[styles.aboutTagline, { color: colors.accent }]}>Stay ahead of attendance.</Text>
            <Text style={[styles.aboutSub, { color: colors.textTertiary }]}>
              Built for students who'd rather know than guess. All calculations, records, and predictions remain 100% on your device.
            </Text>
          </View>
        </View>

        {/* 5. Privacy Guarantee */}
        <View style={[styles.privacyNote, { backgroundColor: colors.surfaceSubtle }]}>
          <ShieldCheck size={14} color={colors.textTertiary} />
          <Text style={[styles.privacyText, { color: colors.textTertiary }]}>
            Attendly stores all academic records locally on your device. Anonymous telemetry only tracks aggregate feature usage.
          </Text>
        </View>
      </ScrollView>

      {/* Backup Vault Modal */}
      <Modal
        visible={isBackupModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsBackupModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>Semester Backup Vault</Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsBackupModalOpen(false)}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: THEME.spacing.xl }}>
              {backupFeedback && (
                <View
                  style={[
                    styles.feedbackBox,
                    {
                      backgroundColor:
                        backupFeedback.status === 'success'
                          ? 'rgba(46, 139, 99, 0.12)'
                          : 'rgba(200, 92, 92, 0.12)',
                      borderColor:
                        backupFeedback.status === 'success'
                          ? colors.emerald
                          : colors.crimson,
                    },
                  ]}
                >
                  {backupFeedback.status === 'success' ? (
                    <CheckCircle2 size={14} color={colors.emerald} />
                  ) : (
                    <AlertCircle size={14} color={colors.crimson} />
                  )}
                  <Text
                    style={[
                      styles.feedbackText,
                      {
                        color:
                          backupFeedback.status === 'success'
                            ? colors.emerald
                            : colors.crimson,
                      },
                    ]}
                  >
                    {backupFeedback.message}
                  </Text>
                </View>
              )}

              {/* 1. Export */}
              <View style={[styles.vaultCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.vaultTitle, { color: colors.textPrimary }]}>1. EXPORT BACKUP FILE</Text>
                <Text style={[styles.vaultSub, { color: colors.textTertiary }]}>
                  Saves your complete attendance ledger, timetable, and courses into a portable JSON file.
                </Text>
                <TouchableOpacity
                  style={[styles.exportBtn, { backgroundColor: colors.textPrimary }]}
                  activeOpacity={0.8}
                  onPress={handleExportBackup}
                >
                  <Download size={14} color={colors.textInverse} />
                  <Text style={[styles.exportBtnText, { color: colors.textInverse }]}>Save Backup to Google Drive / Files</Text>
                </TouchableOpacity>
              </View>

              {/* 2. Restore */}
              <View style={[styles.vaultCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, marginTop: 14 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.vaultTitle, { color: colors.textPrimary }]}>2. RESTORE BACKUP</Text>
                  {restoreJsonText.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearPasteBtn}
                      onPress={() => {
                        AppHaptics.light();
                        setRestoreJsonText('');
                      }}
                    >
                      <Trash2 size={12} color={colors.textTertiary} />
                      <Text style={[styles.clearPasteText, { color: colors.textTertiary }]}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.vaultSub, { color: colors.textTertiary }]}>
                  Paste the JSON backup code below to restore your courses, timetable, and attendance history.
                </Text>

                <TextInput
                  style={[
                    styles.jsonInput,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      color: colors.textPrimary,
                      borderColor: backupInspection.valid
                        ? colors.emerald
                        : restoreJsonText.length > 0
                        ? colors.crimson
                        : colors.borderSubtle,
                    },
                  ]}
                  placeholder="Paste JSON backup code here..."
                  placeholderTextColor={colors.textTertiary}
                  value={restoreJsonText}
                  onChangeText={setRestoreJsonText}
                  multiline
                  scrollEnabled={true}
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                  numberOfLines={6}
                />

                {/* Character Count & Live Inspection Status */}
                {restoreJsonText.trim().length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {backupInspection.valid ? (
                      <View style={[styles.inspectSuccessBox, { backgroundColor: colors.emeraldSubtle, borderColor: 'rgba(46, 139, 99, 0.3)' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <CheckCircle2 size={13} color={colors.emerald} />
                          <Text style={[styles.inspectSuccessTitle, { color: colors.emerald }]}>
                            Valid Attendly Backup ({restoreJsonText.length.toLocaleString()} characters)
                          </Text>
                        </View>
                        <Text style={[styles.inspectSuccessDetails, { color: colors.textSecondary }]}>
                          {backupInspection.stats?.studentName ? `${backupInspection.stats.studentName} · ` : ''}
                          {backupInspection.stats?.college ? `${backupInspection.stats.college} · ` : ''}
                          {backupInspection.stats?.subjectCount} Courses · {backupInspection.stats?.slotCount} Timetable Slots · {backupInspection.stats?.recordCount} Records
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.inspectErrorBox, { backgroundColor: colors.crimsonSubtle, borderColor: 'rgba(200, 92, 92, 0.3)' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <AlertCircle size={13} color={colors.crimson} />
                          <Text style={[styles.inspectErrorTitle, { color: colors.crimson }]}>
                            {restoreJsonText.length.toLocaleString()} characters pasted · Incomplete JSON
                          </Text>
                        </View>
                        <Text style={[styles.inspectErrorDetails, { color: colors.textSecondary }]}>
                          {backupInspection.error}. Please ensure the entire JSON code was copied from start to finish.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.restoreBtn,
                    {
                      backgroundColor: backupInspection.valid ? colors.emerald : colors.surfaceElevated,
                      borderColor: backupInspection.valid ? colors.emerald : colors.borderSubtle,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={handleRestoreBackup}
                >
                  <Upload size={14} color={backupInspection.valid ? colors.textInverse : colors.textPrimary} />
                  <Text style={[styles.restoreBtnText, { color: backupInspection.valid ? colors.textInverse : colors.textPrimary }]}>
                    Restore Semester Data
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditProfileOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditProfileOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsEditProfileOpen(false)}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: THEME.spacing.xl }}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>FULL NAME</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>SECTION</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  value={editSection}
                  onChangeText={setEditSection}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ENROLLMENT / ROLL NUMBER</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  value={editRoll}
                  onChangeText={setEditRoll}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>MINIMUM TARGET ATTENDANCE %</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  value={editTarget}
                  onChangeText={setEditTarget}
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveProfileBtn, { backgroundColor: colors.textPrimary }]}
                onPress={handleSaveProfile}
              >
                <Text style={[styles.saveProfileText, { color: colors.textInverse }]}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerBox: {
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
  },
  screenEyebrow: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  screenTitle: {
    fontSize: THEME.typography.sizes.title,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: THEME.typography.letterSpacing.tighter,
    lineHeight: 32,
    marginTop: 2,
  },
  screenSubtitle: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  sectionBlock: {
    paddingHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.lg,
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
  actionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.xl,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
  },
  privacyText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
    borderBottomWidth: 1,
  },
  modalSheetTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    marginBottom: 14,
  },
  feedbackText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    flex: 1,
  },
  vaultCard: {
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  vaultTitle: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.6,
  },
  vaultSub: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 10,
  },
  clearPasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearPasteText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
  },
  jsonInput: {
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    fontSize: 11,
    fontFamily: 'monospace',
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: 4,
  },
  inspectSuccessBox: {
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    marginBottom: 10,
    gap: 3,
  },
  inspectSuccessTitle: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
  },
  inspectSuccessDetails: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  inspectErrorBox: {
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    marginBottom: 10,
    gap: 3,
  },
  inspectErrorTitle: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
  },
  inspectErrorDetails: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
  },
  fieldGroup: {
    marginBottom: THEME.spacing.md,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  textInput: {
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
  },
  saveProfileBtn: {
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    marginBottom: 30,
  },
  saveProfileText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
  aboutCard: {
    padding: 14,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    marginTop: 4,
  },
  aboutTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  aboutLogoText: {
    fontSize: 16,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.5,
  },
  versionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  versionText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.bold,
  },
  aboutTagline: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    marginBottom: 6,
  },
  aboutSub: {
    fontSize: 10,
    lineHeight: 15,
  },
});
