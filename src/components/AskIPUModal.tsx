import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';

const APP_LOGO = require('../../assets/icon.png');
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { BRAND } from '../constants/brand';
import { useAttendance } from '../context/AttendanceContext';
import {
  attendancePercentage,
  attendanceBuffer,
  predictInternalMarks,
} from '../utils/ipuEngine';
import { X, Sparkles, Send, Bot, User } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { Analytics } from '../utils/analytics';

interface AskAttendlyModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AskAttendlyModal: React.FC<AskAttendlyModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { subjects, overallPercentage, overallBuffer, todaySkipReport, profile } =
    useAttendance();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello ${profile.name || 'there'}! I'm ${BRAND.name}. Ask me anything about your attendance, safe skips, recovery plans, or risk levels.`,
      timestamp: 'Now',
    },
  ]);

  const target = profile.targetAttendance || 75;

  useEffect(() => {
    if (visible) {
      Analytics.track('feature_used', {
        feature: 'ask_attendly_ai',
      });
    }
  }, [visible]);

  const handleQuery = (query: string) => {
    if (!query.trim()) return;
    AppHaptics.light();

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Just now',
    };

    const q = query.toLowerCase();
    let reply = '';

    if (q.includes('skip') || q.includes('bunk') || q.includes('tomorrow') || q.includes('today')) {
      reply = todaySkipReport.summaryAdvice;
      if (todaySkipReport.safestSubject) {
        reply += `\n\n💡 Tip: Your safest course is ${todaySkipReport.safestSubject.name} with a buffer of +${attendanceBuffer(todaySkipReport.safestSubject.attended, todaySkipReport.safestSubject.total, target)} classes.`;
      }
    } else if (q.includes('risk') || q.includes('danger') || q.includes('critical') || q.includes('detain')) {
      const risky = subjects.filter(s => (s.attended / (s.total || 1)) * 100 < (s.targetRequirement || target));
      if (risky.length === 0) {
        reply = `Great news! You're on track across all courses. Everything is above ${target}%.`;
      } else {
        reply = `You have ${risky.length} course(s) that need attention below ${target}%:\n` +
          risky
            .map(
              s =>
                `• ${s.name} (${attendancePercentage(s.attended, s.total)}%): Short by ${Math.abs(attendanceBuffer(s.attended, s.total, target))} classes.`
            )
            .join('\n');
      }
    } else if (q.includes('mark') || q.includes('internal')) {
      const marks = predictInternalMarks(overallPercentage);
      reply = `Based on your overall attendance of ${overallPercentage.toFixed(1)}%, your projected internal attendance score is ${marks.marks} / 5.\n\n${marks.nextMilestoneText}`;
    } else if (q.includes('budget') || q.includes('buffer') || q.includes('total')) {
      reply = overallBuffer >= 0
        ? `Your overall attendance is ${overallPercentage.toFixed(1)}% with an aggregate buffer of +${overallBuffer} safe classes across your semester.`
        : `Your overall attendance is ${overallPercentage.toFixed(1)}%. You need ${Math.abs(overallBuffer)} more classes to get back above ${target}%.`;
    } else {
      reply = `You are currently at ${overallPercentage.toFixed(1)}% overall attendance at ${profile.collegeShort || 'GGSIPU'}. Overall buffer is ${overallBuffer >= 0 ? `+${overallBuffer}` : overallBuffer} classes.`;
    }

    const aiMsg: ChatMessage = {
      id: `ai_${Date.now()}`,
      sender: 'ai',
      text: reply,
      timestamp: 'Just now',
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInputText('');
  };

  const samplePrompts = [
    'Can I skip today?',
    'Which subject is most risky?',
    'What is my internal score?',
    'How many classes can I skip?',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.headerLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Image source={APP_LOGO} style={{ width: 16, height: 16, borderRadius: 4 }} />
                <View style={[styles.badge, { backgroundColor: colors.indigoSubtle }]}>
                  <Sparkles size={11} color={colors.indigo} />
                  <Text style={[styles.badgeText, { color: colors.indigo }]}>ASK ATTENDLY</Text>
                </View>
              </View>
              <Text style={[styles.titleText, { color: colors.textPrimary }]}>Attendance Intelligence</Text>
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

          {/* Quick Prompt Chips */}
          <View style={[styles.promptsWrapper, { borderBottomColor: colors.borderSubtle }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptsRow}
            >
              {samplePrompts.map((prompt, idx) => (
                <TouchableOpacity
                  key={`prompt_${idx}`}
                  style={[
                    styles.promptChip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleQuery(prompt)}
                >
                  <Text style={[styles.promptChipText, { color: colors.indigo }]}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Chat Messages */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatScroll}
            style={styles.chatScrollView}
          >
            {messages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.msgContainer,
                  msg.sender === 'user' ? styles.userMsgContainer : styles.aiMsgContainer,
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    msg.sender === 'user'
                      ? [styles.userAvatar, { backgroundColor: colors.surfaceElevated }]
                      : [styles.aiAvatar, { backgroundColor: colors.indigoSubtle }],
                  ]}
                >
                  {msg.sender === 'user' ? (
                    <User size={12} color={colors.textPrimary} />
                  ) : (
                    <Bot size={12} color={colors.indigo} />
                  )}
                </View>

                <View
                  style={[
                    styles.msgBubble,
                    msg.sender === 'user'
                      ? [styles.userBubble, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]
                      : [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.borderHighlight }],
                  ]}
                >
                  <Text style={[styles.msgText, { color: colors.textPrimary }]}>{msg.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input Bar */}
          <View style={[styles.inputBar, { borderTopColor: colors.borderSubtle, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
              placeholder="Ask Attendly anything..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleQuery(inputText)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.indigo }]}
              activeOpacity={0.8}
              onPress={() => handleQuery(inputText)}
            >
              <Send size={15} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Backwards compatibility alias
export const AskIPUModal = AskAttendlyModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    height: '82%',
    borderWidth: 1,
    paddingTop: THEME.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  promptsWrapper: {
    height: 48,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  promptsRow: {
    paddingHorizontal: THEME.spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    alignSelf: 'center',
  },
  promptChipText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  chatScrollView: {
    flex: 1,
  },
  chatScroll: {
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    gap: 12,
  },
  msgContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  userMsgContainer: {
    flexDirection: 'row-reverse',
  },
  aiMsgContainer: {
    flexDirection: 'row',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {},
  aiAvatar: {},
  msgBubble: {
    maxWidth: '82%',
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    borderTopRightRadius: 2,
    borderWidth: 1,
  },
  aiBubble: {
    borderTopLeftRadius: 2,
    borderWidth: 1,
  },
  msgText: {
    fontSize: 12,
    lineHeight: 18,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.sm,
    borderTopWidth: 1,
    marginBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  textInput: {
    flex: 1,
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    borderWidth: 1,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
