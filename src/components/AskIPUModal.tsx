import React, { useState } from 'react';
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
} from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import {
  attendancePercentage,
  attendanceBuffer,
  predictInternalMarks,
} from '../utils/ipuEngine';
import { X, Sparkles, Send, Bot, User } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

interface AskIPUModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AskIPUModal: React.FC<AskIPUModalProps> = ({ visible, onClose }) => {
  const { subjects, overallPercentage, overallBuffer, todaySkipReport, profile } =
    useAttendance();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello ${profile.name || 'Scholar'}! I am your IPU Academic Assistant. Ask me anything about your ${profile.collegeShort || 'GGSIPU'} attendance, safe bunks, or detention risk.`,
      timestamp: 'Now',
    },
  ]);

  const target = profile.targetAttendance || 75;

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
        reply += `\n\n💡 Tip: Your safest subject is ${todaySkipReport.safestSubject.name} with a buffer of +${attendanceBuffer(todaySkipReport.safestSubject.attended, todaySkipReport.safestSubject.total, target)} classes.`;
      }
    } else if (q.includes('risk') || q.includes('danger') || q.includes('critical') || q.includes('detain')) {
      const risky = subjects.filter(s => (s.attended / (s.total || 1)) * 100 < (s.targetRequirement || target));
      if (risky.length === 0) {
        reply = `Great news! None of your subjects are in the detention danger zone. All subjects are above ${target}%.`;
      } else {
        reply = `You have ${risky.length} critical subject(s) below ${target}%:\n` +
          risky
            .map(
              s =>
                `• ${s.name} (${attendancePercentage(s.attended, s.total)}%): Short by ${Math.abs(attendanceBuffer(s.attended, s.total, target))} lectures.`
            )
            .join('\n');
      }
    } else if (q.includes('mark') || q.includes('internal')) {
      const marks = predictInternalMarks(overallPercentage);
      reply = `Based on your overall attendance of ${overallPercentage.toFixed(1)}%, your projected IPU Internal Attendance Marks score is ${marks.marks} / 5.\n\n${marks.nextMilestoneText}`;
    } else if (q.includes('budget') || q.includes('buffer') || q.includes('total')) {
      reply = overallBuffer >= 0
        ? `Your overall college attendance is ${overallPercentage.toFixed(1)}% with an aggregate buffer of +${overallBuffer} safe bunks across your semester courses.`
        : `Your overall attendance is ${overallPercentage.toFixed(1)}%. You have a deficit of ${Math.abs(overallBuffer)} classes to reach ${target}%.`;
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
    'What is my internal marks score?',
    'What is my safe bunk budget?',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Sparkles size={11} color={THEME.colors.cyan} />
                <Text style={styles.badgeText}>ASK IPU</Text>
              </View>
              <Text style={styles.titleText}>Academic Intelligence</Text>
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

          {/* Quick Prompt Chips (Fixed container height so they don't stretch) */}
          <View style={styles.promptsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptsRow}
            >
              {samplePrompts.map((prompt, idx) => (
                <TouchableOpacity
                  key={`prompt_${idx}`}
                  style={styles.promptChip}
                  activeOpacity={0.75}
                  onPress={() => handleQuery(prompt)}
                >
                  <Text style={styles.promptChipText}>{prompt}</Text>
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
                    msg.sender === 'user' ? styles.userAvatar : styles.aiAvatar,
                  ]}
                >
                  {msg.sender === 'user' ? (
                    <User size={12} color={THEME.colors.textPrimary} />
                  ) : (
                    <Bot size={12} color={THEME.colors.cyan} />
                  )}
                </View>

                <View
                  style={[
                    styles.msgBubble,
                    msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text style={styles.msgText}>{msg.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask about your attendance, subjects..."
              placeholderTextColor={THEME.colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleQuery(inputText)}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              activeOpacity={0.8}
              onPress={() => handleQuery(inputText)}
            >
              <Send size={15} color={THEME.colors.background} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    height: '82%',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    paddingTop: THEME.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  headerLeft: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.cyanSubtle,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    marginBottom: 2,
  },
  badgeText: {
    color: THEME.colors.cyan,
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  promptsWrapper: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    justifyContent: 'center',
  },
  promptsRow: {
    paddingHorizontal: THEME.spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  promptChip: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    alignSelf: 'center',
  },
  promptChipText: {
    color: THEME.colors.cyan,
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
  userAvatar: {
    backgroundColor: THEME.colors.surfaceElevated,
  },
  aiAvatar: {
    backgroundColor: THEME.colors.cyanSubtle,
  },
  msgBubble: {
    maxWidth: '82%',
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderTopRightRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  aiBubble: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borderHighlight,
  },
  msgText: {
    color: THEME.colors.textPrimary,
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
    borderTopColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.background,
    marginBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: THEME.colors.textPrimary,
    fontSize: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  sendBtn: {
    backgroundColor: THEME.colors.cyan,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
