import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAttendance } from '../context/AttendanceContext';
import {
  IPU_COLLEGES,
  IPU_PROGRAMMES,
  IPU_BTECH_BRANCHES,
  IPU_GENERIC_BRANCHES,
} from '../constants/ipuColleges';
import { StudentProfile } from '../types';
import {
  Search,
  Check,
  ChevronRight,
  School,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { Analytics } from '../utils/analytics';

const APP_LOGO = require('../../assets/icon.png');

export const OnboardingScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const { updateProfile } = useAttendance();

  const [name, setName] = useState('');
  const [selectedCollege, setSelectedCollege] = useState<{ id: string; name: string; shortName: string; campus?: string }>(IPU_COLLEGES[0]); // Default first college (USICT)
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCollegeFullName, setCustomCollegeFullName] = useState('');
  const [customCollegeShortName, setCustomCollegeShortName] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState('B.Tech');
  const [selectedBranch, setSelectedBranch] = useState(IPU_BTECH_BRANCHES[0]);
  const [customBranch, setCustomBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [section, setSection] = useState('');
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const defaultSession = currentMonth < 6
    ? `${currentYear - 1}–${currentYear.toString().slice(2)}`
    : `${currentYear}–${(currentYear + 1).toString().slice(2)}`;
  const [academicSession, setAcademicSession] = useState(defaultSession);
  const [rollNumber, setRollNumber] = useState('');
  const [targetPct, setTargetPct] = useState('75');

  const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);

  const filteredColleges = IPU_COLLEGES.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.shortName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableBranches =
    selectedProgramme === 'B.Tech'
      ? IPU_BTECH_BRANCHES
      : IPU_GENERIC_BRANCHES[selectedProgramme] || ['Standard Branch'];

  const finalBranch = customBranch.trim() ? customBranch.trim() : selectedBranch;

  const handleFinish = async () => {
    AppHaptics.success();
    const parsedTarget = parseInt(targetPct, 10);
    const target = Number.isFinite(parsedTarget) ? Math.min(100, Math.max(1, parsedTarget)) : 75;
    const newProfile: StudentProfile = {
      name: name.trim() || 'Student',
      college: selectedCollege.name,
      collegeShort: selectedCollege.shortName,
      programme: selectedProgramme,
      branch: finalBranch,
      semester: selectedSemester,
      section: section.trim() || '1A',
      academicSession: academicSession.trim() || defaultSession,
      rollNumber: rollNumber.trim(),
      enrollmentNumber: rollNumber.trim(),
      targetAttendance: target,
      isIPUMode: true,
      isOnboarded: true,
    };


    Analytics.identify({
      college: selectedCollege.name,
      collegeShort: selectedCollege.shortName,
      programme: selectedProgramme,
      branch: finalBranch,
      semester: selectedSemester,
      targetAttendance: target,
    });

    Analytics.track('onboarding_completed', {
      college_short: selectedCollege.shortName,
      college_name: selectedCollege.name,
      programme: selectedProgramme,
      branch: finalBranch,
      semester: selectedSemester,
      target_attendance: target,
    });

    await updateProfile(newProfile);
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── HERO BRAND HEADER ─────────────────────────────────────── */}
          <View style={styles.heroSection}>
            <View style={[styles.logoContainer, { shadowColor: colors.accent }]}>
              <Image source={APP_LOGO} style={styles.heroLogo} />
            </View>

          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Attendly</Text>
          <Text style={[styles.heroTagline, { color: colors.accent }]}>STAY AHEAD OF ATTENDANCE.</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Set up your academic profile to track courses, predictive models, and safe skips.
          </Text>
        </View>

        {/* ─── SECTION 1: STUDENT & COLLEGE ──────────────────────────── */}
        <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.groupHeading, { color: colors.textTertiary }]}>STUDENT IDENTITY</Text>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>FULL NAME</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, borderColor: colors.borderSubtle },
              ]}
              placeholder="e.g. Rohan Sharma"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* College Selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>COLLEGE / INSTITUTE</Text>
            <TouchableOpacity
              style={[
                styles.selectorButton,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                AppHaptics.light();
                setIsCollegeModalOpen(true);
              }}
            >
              <View style={[styles.collegeIconBadge, { backgroundColor: colors.accentSubtle }]}>
                <School size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectorPrimaryText, { color: colors.textPrimary }]}>
                  {selectedCollege.shortName}
                </Text>
                <Text style={[styles.selectorSecondaryText, { color: colors.textTertiary }]} numberOfLines={1}>
                  {selectedCollege.name}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Enrollment Number & Section */}
          <View style={styles.twoColRow}>
            <View style={[styles.fieldGroup, { flex: 1.2 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ENROLLMENT NO.</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, borderColor: colors.borderSubtle },
                ]}
                placeholder="04520802724"
                placeholderTextColor={colors.textTertiary}
                value={rollNumber}
                onChangeText={setRollNumber}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 0.8 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>SECTION</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, borderColor: colors.borderSubtle },
                ]}
                placeholder="1A"
                placeholderTextColor={colors.textTertiary}
                value={section}
                onChangeText={setSection}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* ─── SECTION 2: ACADEMIC CURRICULUM ────────────────────────── */}
        <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, marginTop: 14 }]}>
          <Text style={[styles.groupHeading, { color: colors.textTertiary }]}>ACADEMIC CURRICULUM</Text>

          {/* Programme Selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>PROGRAMME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {IPU_PROGRAMMES.map(prog => (
                <TouchableOpacity
                  key={prog}
                  style={[
                    styles.pillItem,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                    selectedProgramme === prog && { backgroundColor: colors.accentSubtle, borderColor: colors.accent },
                  ]}
                  onPress={() => {
                    AppHaptics.selection();
                    setSelectedProgramme(prog);
                  }}
                >
                  <Text
                    style={[
                      styles.pillItemText,
                      { color: colors.textSecondary },
                      selectedProgramme === prog && { color: colors.accent, fontWeight: 'bold' },
                    ]}
                  >
                    {prog}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Branch / Specialization */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>BRANCH / SPECIALIZATION</Text>
              {customBranch.length > 0 && (
                <TouchableOpacity onPress={() => setCustomBranch('')}>
                  <Text style={{ fontSize: 9.5, color: colors.accent, fontWeight: 'bold' }}>Reset to standard</Text>
                </TouchableOpacity>
              )}
            </View>

            {customBranch.length === 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {availableBranches.map(branch => (
                  <TouchableOpacity
                    key={branch}
                    style={[
                      styles.pillItem,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                      selectedBranch === branch && { backgroundColor: colors.accentSubtle, borderColor: colors.accent },
                    ]}
                    onPress={() => {
                      AppHaptics.selection();
                      setSelectedBranch(branch);
                    }}
                  >
                    <Text
                      style={[
                        styles.pillItemText,
                        { color: colors.textSecondary },
                        selectedBranch === branch && { color: colors.accent, fontWeight: 'bold' },
                      ]}
                    >
                      {branch}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.pillItem, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderStyle: 'dashed' }]}
                  onPress={() => {
                    AppHaptics.light();
                    setCustomBranch('Computer Engineering');
                  }}
                >
                  <Text style={[styles.pillItemText, { color: colors.accent, fontWeight: 'bold' }]}>+ Other Branch</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, borderColor: colors.accent },
                ]}
                placeholder="e.g. Software Engineering / Data Science"
                placeholderTextColor={colors.textTertiary}
                value={customBranch}
                onChangeText={setCustomBranch}
                autoFocus
              />
            )}
          </View>

          {/* Semester Selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>CURRENT SEMESTER</Text>
            <View style={styles.semGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <TouchableOpacity
                  key={`sem_${s}`}
                  style={[
                    styles.semButton,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                    selectedSemester === s && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => {
                    AppHaptics.selection();
                    setSelectedSemester(s);
                  }}
                >
                  <Text
                    style={[
                      styles.semButtonText,
                      { color: colors.textSecondary },
                      selectedSemester === s && { color: colors.textInverse, fontWeight: '800' },
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Target Attendance % */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>MINIMUM TARGET ATTENDANCE %</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, borderColor: colors.borderSubtle },
              ]}
              placeholder="75"
              placeholderTextColor={colors.textTertiary}
              value={targetPct}
              onChangeText={setTargetPct}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* ─── PRIMARY CTA BUTTON ───────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.finishButton,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 18,
              elevation: 8,
            },
          ]}
          activeOpacity={0.85}
          onPress={handleFinish}
        >
          <Text style={[styles.finishButtonText, { color: '#FFFFFF' }]}>
            Get Started with Attendly
          </Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── COLLEGE SEARCH MODAL ───────────────────────────────────── */}
      <Modal
        visible={isCollegeModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setIsCollegeModalOpen(false);
          setIsCustomMode(false);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.collegeModalBox, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Select Your College</Text>

            {/* Custom Mode Toggle */}
            <View style={[styles.collegeModeToggleRow, { backgroundColor: colors.surfaceSubtle }]}>
              <TouchableOpacity
                style={[styles.collegeModeTab, !isCustomMode && [styles.collegeModeTabActive, { backgroundColor: colors.surfaceElevated }]]}
                onPress={() => setIsCustomMode(false)}
              >
                <Text style={[styles.collegeModeTabText, { color: colors.textTertiary }, !isCustomMode && { color: colors.textPrimary, fontWeight: 'bold' }]}>
                  Predefined Colleges
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.collegeModeTab, isCustomMode && [styles.collegeModeTabActive, { backgroundColor: colors.surfaceElevated }]]}
                onPress={() => setIsCustomMode(true)}
              >
                <Text style={[styles.collegeModeTabText, { color: colors.textTertiary }, isCustomMode && { color: colors.textPrimary, fontWeight: 'bold' }]}>
                  + Custom / Other
                </Text>
              </TouchableOpacity>
            </View>

            {!isCustomMode ? (
              <>
                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <Search size={16} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder="Search college name or abbreviation..."
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <ScrollView contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
                  {filteredColleges.length === 0 && searchQuery.trim().length > 0 && (
                    <TouchableOpacity
                      style={[styles.collegeRow, { borderColor: colors.accent, backgroundColor: colors.accentSubtle }]}
                      onPress={() => {
                        AppHaptics.success();
                        const short = searchQuery.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5) || 'COLLEGE';
                        setSelectedCollege({
                          id: `custom_${Date.now()}`,
                          name: searchQuery.trim(),
                          shortName: short,
                          campus: 'Custom Institute',
                        });
                        setIsCollegeModalOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.collegeShort, { color: colors.accent }]}>+ Use Custom Name</Text>
                        <Text style={[styles.collegeFullName, { color: colors.textPrimary }]}>"{searchQuery.trim()}"</Text>
                        <Text style={[styles.collegeCampus, { color: colors.textTertiary }]}>Tap to select as your college</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {filteredColleges.map(college => {
                    const isSelected = selectedCollege.id === college.id;
                    return (
                      <TouchableOpacity
                        key={college.id}
                        style={[
                          styles.collegeRow,
                          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                          isSelected && { borderColor: colors.accent, backgroundColor: colors.surfaceElevated },
                        ]}
                        onPress={() => {
                          AppHaptics.selection();
                          setSelectedCollege(college);
                          setIsCollegeModalOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.collegeShort, { color: colors.textPrimary }, isSelected && { color: colors.accent }]}>
                            {college.shortName}
                          </Text>
                          <Text style={[styles.collegeFullName, { color: colors.textSecondary }]} numberOfLines={2}>
                            {college.name}
                          </Text>
                          <Text style={[styles.collegeCampus, { color: colors.textTertiary }]}>{college.campus}</Text>
                        </View>
                        {isSelected && <Check size={18} color={colors.accent} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <ScrollView contentContainerStyle={{ paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>COLLEGE / UNIVERSITY FULL NAME</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="e.g. Delhi Technological University"
                    placeholderTextColor={colors.textTertiary}
                    value={customCollegeFullName}
                    onChangeText={setCustomCollegeFullName}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>SHORT ABBREVIATION (CODE)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="e.g. DTU or NSUT"
                    placeholderTextColor={colors.textTertiary}
                    value={customCollegeShortName}
                    onChangeText={setCustomCollegeShortName}
                    autoCapitalize="characters"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveCustomCollegeBtn, { backgroundColor: colors.textPrimary }]}
                  onPress={() => {
                    if (!customCollegeFullName.trim()) return;
                    AppHaptics.success();
                    const short = customCollegeShortName.trim() || customCollegeFullName.trim().slice(0, 4).toUpperCase();
                    setSelectedCollege({
                      id: `custom_${Date.now()}`,
                      name: customCollegeFullName.trim(),
                      shortName: short,
                      campus: 'University Campus',
                    });
                    setIsCustomMode(false);
                    setIsCollegeModalOpen(false);
                  }}
                >
                  <Text style={[styles.saveCustomCollegeBtnText, { color: colors.textInverse }]}>Use This College</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => {
                setIsCollegeModalOpen(false);
                setIsCustomMode(false);
              }}
            >
              <Text style={[styles.modalCloseText, { color: colors.textPrimary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  logoContainer: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 10,
  },
  heroLogo: {
    width: 68,
    height: 68,
    borderRadius: 20,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -1,
  },
  heroTagline: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1.8,
    marginTop: 3,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 320,
  },
  cardGroup: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  groupHeading: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 12,
    gap: 5,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  collegeIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorPrimaryText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
  selectorSecondaryText: {
    fontSize: 10,
    marginTop: 1,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  pillItem: {
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  pillItemText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
  },
  semGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  semButton: {
    flex: 1,
    minWidth: 36,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  semButtonText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  finishButtonText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  collegeModalBox: {
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    height: '80%',
    padding: THEME.spacing.lg,
    borderWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.heavy,
    marginBottom: THEME.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: THEME.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: THEME.typography.sizes.sm,
  },
  collegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    marginBottom: THEME.spacing.sm,
  },
  collegeShort: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
  },
  collegeFullName: {
    fontSize: THEME.typography.sizes.xs,
    marginTop: 2,
  },
  collegeCampus: {
    fontSize: 9,
    marginTop: 2,
  },
  modalCloseBtn: {
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
  collegeModeToggleRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.md,
  },
  collegeModeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
  },
  collegeModeTabActive: {},
  collegeModeTabText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
  },
  saveCustomCollegeBtn: {
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    marginTop: 14,
  },
  saveCustomCollegeBtnText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
});
