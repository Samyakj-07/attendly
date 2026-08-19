import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
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
import { SmoothBottomSheet } from './SmoothBottomSheet';

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
  const { colors } = useTheme();
  const { subjects, overallPercentage, overallBuffer, todaySkipReport, profile } =
    useAttendance();
  const [inputText, setInputText] = useState('');
  const chatScrollRef = React.useRef<ScrollView>(null);
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

    const q = query.toLowerCase().trim();
    let reply = '';

    if (subjects.length === 0) {
      reply = `You haven't added any courses yet! Head over to the Courses tab to register your semester subjects and start tracking attendance.`;
    } else {
      // Check if user is asking about a specific subject
      const matchedSubject = subjects.find(
        s =>
          q.includes(s.name.toLowerCase()) ||
          q.includes(s.code.toLowerCase())
      );

      const hasSkip =
        q.includes('skip') ||
        q.includes('bunk') ||
        q.includes('miss') ||
        q.includes('leave') ||
        q.includes('tomorrow') ||
        q.includes('today');
      const hasInternal =
        q.includes('mark') ||
        q.includes('internal') ||
        q.includes('score') ||
        q.includes('grade');
      const hasRisk =
        q.includes('risk') ||
        q.includes('danger') ||
        q.includes('critical') ||
        q.includes('detain') ||
        q.includes('detention') ||
        q.includes('shortage');
      const hasRecovery =
        q.includes('recover') ||
        q.includes('roadmap') ||
        q.includes('plan') ||
        q.includes('catch up') ||
        q.includes('needed') ||
        q.includes('attend consecutively');
      const hasBuffer =
        q.includes('budget') ||
        q.includes('buffer') ||
        q.includes('total') ||
        q.includes('margin') ||
        q.includes('standing') ||
        q.includes('overall') ||
        q.includes('percentage');
      const isGreeting =
        q === 'hi' ||
        q === 'hello' ||
        q === 'hey' ||
        q === 'help' ||
        q.startsWith('hi ') ||
        q.startsWith('hello ');

      if (matchedSubject) {
        const subPct = attendancePercentage(matchedSubject.attended, matchedSubject.total);
        const subBuf = attendanceBuffer(
          matchedSubject.attended,
          matchedSubject.total,
          matchedSubject.targetRequirement || target
        );
        reply = `📊 Course: ${matchedSubject.name} (${matchedSubject.code})\n• Current: ${subPct.toFixed(1)}% (${matchedSubject.attended}/${matchedSubject.total} attended)\n• Target: ${matchedSubject.targetRequirement || target}%\n• Buffer: ${subBuf >= 0 ? `+${subBuf} safe skips available` : `${Math.abs(subBuf)} classes shortage`}.`;
      } else if (isGreeting) {
        reply = `Hi ${profile.name || 'there'}! You're currently holding an overall attendance of ${overallPercentage.toFixed(1)}% (${overallBuffer >= 0 ? `+${overallBuffer} safe buffer` : `${Math.abs(overallBuffer)} shortage`}). What would you like to know?`;
      } else if (hasSkip && hasInternal) {
        const marks = predictInternalMarks(overallPercentage);
        reply = `${todaySkipReport.summaryAdvice}\n\n🏆 Internal Marks: You have ${marks.marks} / 5 internal marks at ${overallPercentage.toFixed(1)}%. ${marks.nextMilestoneText}`;
      } else if (hasRecovery) {
        const critical = subjects.filter(
          s => attendancePercentage(s.attended, s.total) < (s.targetRequirement || target)
        );
        if (critical.length === 0) {
          reply = `All your courses are safely above ${target}%! No recovery roadmap needed. Keep up the good momentum.`;
        } else {
          reply = `Here is your recovery priority list to escape detention:\n` +
            critical
              .map(s => {
                const pct = attendancePercentage(s.attended, s.total);
                const buf = attendanceBuffer(s.attended, s.total, s.targetRequirement || target);
                return `• ${s.code}: ${pct.toFixed(1)}% (Need to attend next ${Math.abs(buf)} classes consecutively)`;
              })
              .join('\n');
        }
      } else if (hasSkip) {
        reply = todaySkipReport.summaryAdvice;
        if (todaySkipReport.safestSubject) {
          const sBuf = attendanceBuffer(
            todaySkipReport.safestSubject.attended,
            todaySkipReport.safestSubject.total,
            todaySkipReport.safestSubject.targetRequirement || target
          );
          reply += `\n\n💡 Tip: Your safest course to miss is ${todaySkipReport.safestSubject.name} (+${sBuf} safe buffer).`;
        }
      } else if (hasRisk) {
        const risky = subjects.filter(
          s => attendancePercentage(s.attended, s.total) < (s.targetRequirement || target)
        );
        if (risky.length === 0) {
          reply = `Great news! You're on track across all ${subjects.length} courses. All are above your ${target}% target.`;
        } else {
          reply = `You have ${risky.length} course(s) that need immediate attention below ${target}%:\n` +
            risky
              .map(
                s =>
                  `• ${s.code}: ${attendancePercentage(s.attended, s.total).toFixed(1)}% (${s.attended}/${s.total})`
              )
              .join('\n');
        }
      } else if (hasInternal) {
        const marks = predictInternalMarks(overallPercentage);
        reply = `Internal Attendance Score: ${marks.marks} / 5 marks (${marks.slab}).\n\n${marks.nextMilestoneText}`;
      } else if (hasBuffer) {
        reply = `Your overall attendance is ${overallPercentage.toFixed(1)}% across ${subjects.length} courses with a net buffer of ${overallBuffer >= 0 ? `+${overallBuffer} safe classes` : `${overallBuffer} classes deficit`}.`;
      } else {
        reply = `You're currently holding ${overallPercentage.toFixed(1)}% overall attendance. ${
          overallBuffer >= 0
            ? `You have a safety margin of +${overallBuffer} classes above ${target}%.`
            : `You are in deficit by ${Math.abs(overallBuffer)} classes below ${target}%.`
        }`;
      }
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
    'Can I bunk today?',
    'Which course is at risk?',
    'What is my internal score?',
    'How many classes can I skip?',
  ];

  return (
    <SmoothBottomSheet visible={visible} onClose={onClose} height="85%" maxHeight="85%" showHandle={true}>
      <View style={styles.sheetInner}>
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Image
                source={APP_LOGO}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.surface,
                  overflow: 'hidden',
                }}
              />
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
          ref={chatScrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatScroll}
          style={styles.chatScrollView}
          onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.sender === 'user' ? styles.userRow : styles.aiRow,
              ]}
            >
              {msg.sender === 'ai' && (
                <View style={[styles.avatarBox, { backgroundColor: colors.indigoSubtle }]}>
                  <Bot size={14} color={colors.indigo} />
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  msg.sender === 'user'
                    ? [styles.userBubble, { backgroundColor: colors.accent }]
                    : [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }],
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: msg.sender === 'user' ? colors.textInverse : colors.textPrimary },
                  ]}
                >
                  {msg.text}
                </Text>
              </View>

              {msg.sender === 'user' && (
                <View style={[styles.avatarBox, { backgroundColor: colors.surfaceElevated }]}>
                  <User size={14} color={colors.textSecondary} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Input Row */}
        <View style={[styles.inputRow, { borderTopColor: colors.borderSubtle, backgroundColor: colors.background }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
            placeholder="Ask about your attendance..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="send"
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
    </SmoothBottomSheet>
  );
};

// Backwards compatibility alias
export const AskIPUModal = AskAttendlyModal;

const styles = StyleSheet.create({
  sheetInner: {
    flex: 1,
    paddingTop: THEME.spacing.xs,
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
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  userRow: {
    flexDirection: 'row-reverse',
  },
  aiRow: {
    flexDirection: 'row',
  },
  avatarBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    borderTopRightRadius: 2,
  },
  aiBubble: {
    borderTopLeftRadius: 2,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.sm,
    borderTopWidth: 1,
    marginBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  input: {
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
