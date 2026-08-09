import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import { generateIPUAttendancePDF } from '../utils/pdfReport';
import { BackupManager } from '../utils/backupFile';
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
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

export const ProfileScreen: React.FC = () => {
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

  // Backup & Restore Modal State
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [restoreJsonText, setRestoreJsonText] = useState('');
  const [backupFeedback, setBackupFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

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
    setIsEditProfileOpen(false);
  };

  const handleExportPDF = async () => {
    AppHaptics.medium();
    await generateIPUAttendancePDF(profile, subjects, records);
  };

  const handleExportBackup = async () => {
    AppHaptics.medium();
    const success = await BackupManager.exportBackupFile(profile.collegeShort, profile.name);
    if (success) {
      setBackupFeedback({
        status: 'success',
        message: 'Backup file generated! Save it to Google Drive or Files.',
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
  const collegeMeta = `${profile.college || 'IPU Affiliated College'} · ${profile.programme || 'B.Tech'} ${profile.branch || ''} · Semester ${profile.semester || 1} · ${profile.academicSession || '2026–27'}`;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Editorial Header */}
        <View style={styles.headerBox}>
          <Text style={styles.screenEyebrow}>STUDENT IDENTITY</Text>
          <Text style={styles.screenTitle}>{studentName.toUpperCase()}</Text>
          <Text style={styles.screenSubtitle}>{collegeMeta}</Text>
        </View>

        {/* 1. Academic Configuration Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>ACADEMIC</Text>

          <TouchableOpacity
            style={styles.actionRow}
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
              <Text style={styles.actionTitle}>Profile & Target Attendance</Text>
              <Text style={styles.actionSub}>
                Section {profile.section} · Roll {profile.rollNumber || 'Not Set'} · {profile.targetAttendance || 75}% Target
              </Text>
            </View>
            <ChevronRight size={14} color={THEME.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={handleExportPDF}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Official Attendance Statement (PDF)</Text>
              <Text style={styles.actionSub}>Export GGSIPU Ordinance 11 compliant report</Text>
            </View>
            <Download size={14} color={THEME.colors.cyan} />
          </TouchableOpacity>
        </View>

        {/* 2. Data Sovereignty & Vault Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>DATA VAULT (100% OFFLINE)</Text>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => {
              AppHaptics.light();
              setBackupFeedback(null);
              setIsBackupModalOpen(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Backup & Restore Semester</Text>
              <Text style={styles.actionSub}>Save to Google Drive / Files or paste JSON backup</Text>
            </View>
            <Database size={14} color={THEME.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={async () => {
              AppHaptics.medium();
              await updateProfile({ ...profile, isOnboarded: false });
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Re-run Onboarding Setup Wizard</Text>
              <Text style={styles.actionSub}>Reconfigure college, programme, branch, or name</Text>
            </View>
            <ChevronRight size={14} color={THEME.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => resetAllData()}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: THEME.colors.crimson }]}>
                Clear All Local Data
              </Text>
              <Text style={styles.actionSub}>Reset app to blank state</Text>
            </View>
            <RotateCcw size={14} color={THEME.colors.crimson} />
          </TouchableOpacity>
        </View>

        {/* 3. Privacy & Offline Guarantee */}
        <View style={styles.privacyNote}>
          <ShieldCheck size={14} color={THEME.colors.textTertiary} />
          <Text style={styles.privacyText}>
            IPU Attendance OS stores all records locally on your device. Zero telemetry, zero tracking.
          </Text>
        </View>
      </ScrollView>

      {/* Backup Vault Modal */}
      <Modal visible={isBackupModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle}>Semester Backup Vault</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsBackupModalOpen(false)}
              >
                <X size={18} color={THEME.colors.textSecondary} />
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
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                      borderColor:
                        backupFeedback.status === 'success'
                          ? THEME.colors.emerald
                          : THEME.colors.crimson,
                    },
                  ]}
                >
                  {backupFeedback.status === 'success' ? (
                    <CheckCircle2 size={14} color={THEME.colors.emerald} />
                  ) : (
                    <AlertCircle size={14} color={THEME.colors.crimson} />
                  )}
                  <Text
                    style={[
                      styles.feedbackText,
                      {
                        color:
                          backupFeedback.status === 'success'
                            ? THEME.colors.emerald
                            : THEME.colors.crimson,
                      },
                    ]}
                  >
                    {backupFeedback.message}
                  </Text>
                </View>
              )}

              {/* 1. Export */}
              <View style={styles.vaultCard}>
                <Text style={styles.vaultTitle}>1. EXPORT BACKUP FILE</Text>
                <Text style={styles.vaultSub}>
                  Saves your complete attendance ledger, timetable, and courses into a portable JSON file.
                </Text>
                <TouchableOpacity
                  style={styles.exportBtn}
                  activeOpacity={0.8}
                  onPress={handleExportBackup}
                >
                  <Download size={14} color={THEME.colors.background} />
                  <Text style={styles.exportBtnText}>Save Backup to Google Drive / Files</Text>
                </TouchableOpacity>
              </View>

              {/* 2. Restore */}
              <View style={[styles.vaultCard, { marginTop: 14 }]}>
                <Text style={styles.vaultTitle}>2. RESTORE BACKUP</Text>
                <Text style={styles.vaultSub}>
                  Paste the JSON backup code to restore your entire semester.
                </Text>
                <TextInput
                  style={styles.jsonInput}
                  placeholder="Paste JSON backup code here..."
                  placeholderTextColor={THEME.colors.textTertiary}
                  value={restoreJsonText}
                  onChangeText={setRestoreJsonText}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={styles.restoreBtn}
                  activeOpacity={0.8}
                  onPress={handleRestoreBackup}
                >
                  <Upload size={14} color={THEME.colors.textPrimary} />
                  <Text style={styles.restoreBtnText}>Restore Semester Data</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={isEditProfileOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsEditProfileOpen(false)}
              >
                <X size={18} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: THEME.spacing.xl }}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>SECTION</Text>
                <TextInput
                  style={styles.textInput}
                  value={editSection}
                  onChangeText={setEditSection}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>ENROLLMENT / ROLL NUMBER</Text>
                <TextInput
                  style={styles.textInput}
                  value={editRoll}
                  onChangeText={setEditRoll}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>MINIMUM TARGET ATTENDANCE %</Text>
                <TextInput
                  style={styles.textInput}
                  value={editTarget}
                  onChangeText={setEditTarget}
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity
                style={styles.saveProfileBtn}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveProfileText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
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
    color: THEME.colors.textTertiary,
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  screenTitle: {
    fontSize: THEME.typography.sizes.title,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: THEME.typography.letterSpacing.tighter,
    lineHeight: 32,
    marginTop: 2,
  },
  screenSubtitle: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
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
    color: THEME.colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  actionTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  actionSub: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.xl,
    padding: 12,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.md,
  },
  privacyText: {
    fontSize: 10,
    color: THEME.colors.textTertiary,
    flex: 1,
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  modalSheetTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.surfaceSubtle,
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
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  vaultTitle: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: 0.6,
  },
  vaultSub: {
    fontSize: 10,
    color: THEME.colors.textTertiary,
    marginTop: 2,
    marginBottom: 10,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.textPrimary,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
  },
  exportBtnText: {
    color: THEME.colors.textInverse,
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
  },
  jsonInput: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.sm,
    padding: 8,
    color: THEME.colors.textPrimary,
    fontSize: 10,
    fontFamily: 'monospace',
    height: 70,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    marginBottom: 8,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  restoreBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  fieldGroup: {
    marginBottom: THEME.spacing.md,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  saveProfileBtn: {
    backgroundColor: THEME.colors.textPrimary,
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    marginBottom: 30,
  },
  saveProfileText: {
    color: THEME.colors.textInverse,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
});
