import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import {
  IPU_COLLEGES,
  IPU_PROGRAMMES,
  IPU_BTECH_BRANCHES,
  IPU_GENERIC_BRANCHES,
} from '../constants/ipuColleges';
import { StudentProfile } from '../types';
import {
  ShieldCheck,
  Search,
  Check,
  ChevronRight,
  School,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

export const OnboardingScreen: React.FC = () => {
  const { updateProfile } = useAttendance();

  const [name, setName] = useState('');
  const [selectedCollege, setSelectedCollege] = useState(IPU_COLLEGES[0]); // First IPU college (USICT)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState('B.Tech');
  const [selectedBranch, setSelectedBranch] = useState(IPU_BTECH_BRANCHES[0]);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [section, setSection] = useState('');
  const [academicSession, setAcademicSession] = useState('2026–27');
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

  const handleFinish = async () => {
    AppHaptics.success();
    const newProfile: StudentProfile = {
      name: name.trim() || 'Student',
      college: selectedCollege.name,
      collegeShort: selectedCollege.shortName,
      programme: selectedProgramme,
      branch: selectedBranch,
      semester: selectedSemester,
      section: section.trim() || '1A',
      academicSession: academicSession.trim() || '2026–27',
      rollNumber: rollNumber.trim(),
      enrollmentNumber: rollNumber.trim(),
      targetAttendance: parseInt(targetPct) || 75,
      isIPUMode: true,
      isOnboarded: true,
    };
    await updateProfile(newProfile);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Top Banner */}
        <View style={styles.topBanner}>
          <View style={styles.ipuLogoBadge}>
            <ShieldCheck size={16} color={THEME.colors.cyan} />
            <Text style={styles.ipuLogoText}>IPU ATTENDANCE OS</Text>
          </View>
          <Text style={styles.headlineTitle}>Student Profile Setup</Text>
          <Text style={styles.headlineSubtitle}>
            Configure your academic profile to track attendance and semester eligibility.
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Student Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your full name"
              placeholderTextColor={THEME.colors.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* College Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>IPU AFFILIATED COLLEGE / SCHOOL</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              activeOpacity={0.7}
              onPress={() => {
                AppHaptics.light();
                setIsCollegeModalOpen(true);
              }}
            >
              <School size={18} color={THEME.colors.cyan} />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectorPrimaryText}>{selectedCollege.shortName}</Text>
                <Text style={styles.selectorSecondaryText} numberOfLines={1}>
                  {selectedCollege.name}
                </Text>
              </View>
              <ChevronRight size={18} color={THEME.colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Programme */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PROGRAMME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {IPU_PROGRAMMES.map(prog => (
                <TouchableOpacity
                  key={prog}
                  style={[
                    styles.pillItem,
                    selectedProgramme === prog && styles.pillItemActive,
                  ]}
                  onPress={() => {
                    AppHaptics.selection();
                    setSelectedProgramme(prog);
                  }}
                >
                  <Text
                    style={[
                      styles.pillItemText,
                      selectedProgramme === prog && styles.pillItemTextActive,
                    ]}
                  >
                    {prog}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Branch */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>BRANCH / SPECIALIZATION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {availableBranches.map(branch => (
                <TouchableOpacity
                  key={branch}
                  style={[
                    styles.pillItem,
                    selectedBranch === branch && styles.pillItemActive,
                  ]}
                  onPress={() => {
                    AppHaptics.selection();
                    setSelectedBranch(branch);
                  }}
                >
                  <Text
                    style={[
                      styles.pillItemText,
                      selectedBranch === branch && styles.pillItemTextActive,
                    ]}
                  >
                    {branch}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Semester */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SEMESTER</Text>
            <View style={styles.semGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <TouchableOpacity
                  key={`sem_${s}`}
                  style={[
                    styles.semButton,
                    selectedSemester === s && styles.semButtonActive,
                  ]}
                  onPress={() => {
                    AppHaptics.selection();
                    setSelectedSemester(s);
                  }}
                >
                  <Text
                    style={[
                      styles.semButtonText,
                      selectedSemester === s && styles.semButtonTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Section & Target Attendance */}
          <View style={styles.twoColRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>SECTION</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1A"
                placeholderTextColor={THEME.colors.textTertiary}
                value={section}
                onChangeText={setSection}
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>TARGET ATTENDANCE %</Text>
              <TextInput
                style={styles.textInput}
                placeholder="75"
                placeholderTextColor={THEME.colors.textTertiary}
                value={targetPct}
                onChangeText={setTargetPct}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Enrollment / Roll Number (Optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ENROLLMENT NUMBER (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 04520802724"
              placeholderTextColor={THEME.colors.textTertiary}
              value={rollNumber}
              onChangeText={setRollNumber}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.finishButton}
          activeOpacity={0.85}
          onPress={handleFinish}
        >
          <Text style={styles.finishButtonText}>Complete Setup & Enter App →</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* College Search Modal */}
      <Modal visible={isCollegeModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.collegeModalBox}>
            <Text style={styles.modalHeaderTitle}>Select Your IPU College</Text>

            <View style={styles.searchBar}>
              <Search size={16} color={THEME.colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search college name or abbreviation..."
                placeholderTextColor={THEME.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
              {filteredColleges.map(college => {
                const isSelected = selectedCollege.id === college.id;
                return (
                  <TouchableOpacity
                    key={college.id}
                    style={[
                      styles.collegeRow,
                      isSelected && styles.collegeRowSelected,
                    ]}
                    onPress={() => {
                      AppHaptics.selection();
                      setSelectedCollege(college);
                      setIsCollegeModalOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.collegeShort, isSelected && { color: THEME.colors.cyan }]}>
                        {college.shortName}
                      </Text>
                      <Text style={styles.collegeFullName} numberOfLines={2}>
                        {college.name}
                      </Text>
                      <Text style={styles.collegeCampus}>{college.campus}</Text>
                    </View>
                    {isSelected && <Check size={18} color={THEME.colors.cyan} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsCollegeModalOpen(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
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
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 50,
  },
  topBanner: {
    marginBottom: THEME.spacing.lg,
  },
  ipuLogoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.cyanSubtle,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderHighlight,
    marginBottom: THEME.spacing.sm,
  },
  ipuLogoText: {
    color: THEME.colors.cyan,
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1,
  },
  headlineTitle: {
    fontSize: THEME.typography.sizes.title,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
  },
  headlineSubtitle: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  formContainer: {
    gap: THEME.spacing.md,
  },
  fieldGroup: {
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
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  selectorPrimaryText: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  selectorSecondaryText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  pillItem: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  pillItemActive: {
    backgroundColor: THEME.colors.cyanSubtle,
    borderColor: THEME.colors.cyan,
  },
  pillItemText: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.medium,
  },
  pillItemTextActive: {
    color: THEME.colors.cyan,
    fontWeight: THEME.typography.weights.bold,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  semGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  semButton: {
    width: 38,
    height: 38,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  semButtonActive: {
    backgroundColor: THEME.colors.cyan,
    borderColor: THEME.colors.cyan,
  },
  semButtonText: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
  semButtonTextActive: {
    color: THEME.colors.background,
  },
  finishButton: {
    backgroundColor: THEME.colors.cyan,
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: THEME.spacing.xl,
    ...THEME.shadows.glowCyan,
  },
  finishButtonText: {
    color: THEME.colors.background,
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  collegeModalBox: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    height: '80%',
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  modalHeaderTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
  },
  collegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.sm,
  },
  collegeRowSelected: {
    borderColor: THEME.colors.cyan,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  collegeShort: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
  },
  collegeFullName: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  collegeCampus: {
    fontSize: 9,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  modalCloseBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
});
