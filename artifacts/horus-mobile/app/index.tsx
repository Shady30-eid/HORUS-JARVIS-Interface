import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

const roomImage = require('../assets/images/room-background.png');
const appIcon = require('../assets/images/icon.png');
const ACTIVITY_KEY = 'horus.mobile.activity.v1';
const TASK_PROGRESS = 68;
const SUMMARY =
  'Preview summary: research topics are grouped into agentic AI, safety alignment, open-source models, and enterprise adoption.';

type ActivityItem = {
  id: string;
  title: string;
  time: string;
  kind: 'task' | 'system' | 'command';
};

type NavItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const initialActivities: ActivityItem[] = [
  { id: 'research', title: 'Web Research & Analysis', time: '10:24', kind: 'task' },
  { id: 'system', title: 'System Check', time: '09:48', kind: 'system' },
  { id: 'file', title: 'File Analysis', time: 'Yesterday', kind: 'system' },
  { id: 'review', title: 'Code Review', time: 'Yesterday', kind: 'system' },
];

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'tasks', label: 'Tasks', icon: 'checkbox-outline' },
  { id: 'reports', label: 'Reports', icon: 'document-text-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
  { id: 'tools', label: 'Tools', icon: 'construct-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

const taskSteps = [
  { title: 'Search sources', state: 'complete', time: '10:12' },
  { title: 'Analyze data', state: 'complete', time: '10:18' },
  { title: 'Generate summary', state: 'progress', time: '10:24' },
  { title: 'Create report', state: 'pending', time: 'Pending' },
] as const;

const sources = [
  { name: 'OpenAI Blog', detail: 'Research & announcements', time: '10:14', icon: 'globe-outline' },
  { name: 'TechCrunch', detail: 'AI tools & industry news', time: '10:16', icon: 'newspaper-outline' },
  { name: 'Stanford HAI', detail: 'AI safety & alignment', time: '10:19', icon: 'school-outline' },
  { name: 'GitHub', detail: 'Trending repositories', time: '10:21', icon: 'logo-github' },
] as const;

const topics = ['Agentic AI', 'AI Safety', 'Open Source', 'Enterprise', 'Automation'];
const chartBars = [
  { label: 'AI', value: 38 },
  { label: 'Safe', value: 60 },
  { label: 'Open', value: 47 },
  { label: 'Ent.', value: 74 },
  { label: 'Other', value: 54 },
];

function isActivityItem(value: unknown): value is ActivityItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.time === 'string' &&
    (item.kind === 'task' || item.kind === 'system' || item.kind === 'command')
  );
}

type Colors = ReturnType<typeof useColors>;

function Panel({
  title,
  icon,
  colors,
  right,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: Colors;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleGroup}>
          <Ionicons name={icon} size={14} color={colors.primary} />
          <Text style={[styles.panelTitle, { color: colors.secondaryForeground }]}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function ProgressRing({ progress, colors }: { progress: number; colors: Colors }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.ring}>
      <Svg width={60} height={60}>
        <Circle
          cx={30}
          cy={30}
          r={radius}
          fill="none"
          stroke={colors.border}
          strokeWidth={4}
        />
        <Circle
          cx={30}
          cy={30}
          r={radius}
          fill="none"
          stroke={colors.primary}
          strokeWidth={4}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress / 100)}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={[styles.ringLabel, { color: colors.foreground }]}>{progress}%</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState(
    'Local preview — connect an AI service to run commands.',
  );
  const [activeNav, setActiveNav] = useState('home');
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  );

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(ACTIVITY_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(isActivityItem)) {
          setActivities(parsed.slice(0, 8));
        }
      })
      .catch(() => {
        if (mounted) setFeedback('Recent activity is available for this session.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      );
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const recordSection = (id: string) => (event: LayoutChangeEvent) => {
    sectionPositions.current[id] = event.nativeEvent.layout.y;
  };

  const navigateTo = (id: string) => {
    setActiveNav(id);
    void Haptics.selectionAsync().catch(() => undefined);
    const top = id === 'home' ? 0 : sectionPositions.current[id];
    if (typeof top === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(top - 8, 0), animated: true });
    }
  };

  const persistActivities = async (next: ActivityItem[]) => {
    try {
      await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
    } catch {
      setFeedback('Command added for this session; device storage is unavailable.');
    }
  };

  const sendCommand = async () => {
    const command = draft.trim();
    if (!command) {
      setFeedback('Type a command first.');
      return;
    }

    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const next = [
      { id: `${Date.now()}`, title: command, time, kind: 'command' as const },
      ...activities,
    ].slice(0, 8);

    setActivities(next);
    setDraft('');
    setFeedback('Saved on this device. Connect an AI service to run it.');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    await persistActivities(next);
  };

  const prepareQuickCommand = (command: string) => {
    setDraft(command);
    setFeedback('Command ready. Add details, then tap send.');
    inputRef.current?.focus();
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const shareSummary = async () => {
    try {
      await Share.share({ message: SUMMARY });
    } catch {
      setFeedback('The share sheet could not be opened.');
    }
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear local history?',
      'This removes saved commands from this device only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setActivities([]);
            setFeedback('Local command history cleared.');
            void AsyncStorage.removeItem(ACTIVITY_KEY).catch(() => {
              setFeedback('History cleared for this session; device storage could not be updated.');
            });
          },
        },
      ],
    );
  };

  const webInsets =
    Platform.OS === 'web' ? { paddingTop: 67, paddingBottom: 34 } : undefined;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }, webInsets]}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
            <View style={styles.brand}>
              <Image source={appIcon} style={styles.brandIcon} />
              <View>
                <Text style={[styles.brandName, { color: colors.foreground }]}>HORUS</Text>
                <Text style={[styles.brandSubtitle, { color: colors.mutedForeground }]}>
                  AI COMMAND CENTER
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.onlineLine}>
                <View style={[styles.onlineDot, { backgroundColor: colors.online }]} />
                <Text style={[styles.onlineText, { color: colors.online }]}>LOCAL PREVIEW</Text>
              </View>
              <Text style={[styles.clock, { color: colors.secondaryForeground }]}>{clock}</Text>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <ScrollView
              horizontal
              style={styles.navigation}
              contentContainerStyle={styles.navigationContent}
              showsHorizontalScrollIndicator={false}
            >
              {navItems.map((item) => {
                const selected = activeNav === item.id;
                return (
                  <Pressable
                    key={item.id}
                    testID={`nav-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to ${item.label}`}
                    onPress={() => navigateTo(item.id)}
                    style={({ pressed }) => [
                      styles.navItem,
                      selected && {
                        backgroundColor: colors.glass,
                        borderColor: colors.glassStrongBorder,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={15}
                      color={selected ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        { color: selected ? colors.foreground : colors.mutedForeground },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ImageBackground
              source={roomImage}
              resizeMode="cover"
              style={[styles.hero, { borderColor: colors.glassBorder }]}
              imageStyle={styles.heroBackgroundImage}
              accessibilityIgnoresInvertColors
            >
              <LinearGradient
                colors={[colors.backdrop, 'transparent', colors.backdrop]}
                locations={[0, 0.52, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.heroTopLine}>
                <Text style={[styles.heroLabel, { color: colors.secondaryForeground }]}>
                  ANALYZE
                </Text>
                <View style={[styles.heroDivider, { backgroundColor: colors.glassBorder }]} />
                <Text style={[styles.heroLabel, { color: colors.secondaryForeground }]}>
                  THINK
                </Text>
                <View style={[styles.heroDivider, { backgroundColor: colors.glassBorder }]} />
                <Text style={[styles.heroLabel, { color: colors.secondaryForeground }]}>
                  EXECUTE
                </Text>
              </View>
              <View style={styles.heroBottomLine}>
                <View style={[styles.heroOrb, { borderColor: colors.glassStrongBorder }]} />
                <Text style={[styles.heroHint, { color: colors.mutedForeground }]}>
                  EYE OF HORUS · SYSTEM READY
                </Text>
                <View style={[styles.heroOrb, { borderColor: colors.glassStrongBorder }]} />
              </View>
            </ImageBackground>

            <View onLayout={recordSection('tasks')}>
              <Panel
                title="CURRENT TASK"
                icon="pulse-outline"
                colors={colors}
                right={
                  <View style={[styles.previewBadge, { borderColor: colors.glassBorder }]}>
                    <Text style={[styles.previewBadgeText, { color: colors.mutedForeground }]}>
                      DEMO
                    </Text>
                  </View>
                }
              >
                <View style={styles.taskHeading}>
                  <View style={styles.taskTitleGroup}>
                    <Text style={[styles.taskTitle, { color: colors.foreground }]}>
                      Web Research & Analysis
                    </Text>
                    <Text style={[styles.subtleText, { color: colors.mutedForeground }]}>
                      AI development · sample task
                    </Text>
                  </View>
                  <ProgressRing progress={TASK_PROGRESS} colors={colors} />
                </View>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: colors.secondary, borderColor: colors.glassBorder },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${TASK_PROGRESS}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
                <View style={styles.stepList}>
                  {taskSteps.map((step) => {
                    const done = step.state === 'complete';
                    const active = step.state === 'progress';
                    return (
                      <View key={step.title} style={styles.stepRow}>
                        <Ionicons
                          name={done ? 'checkmark-circle' : active ? 'radio-button-on' : 'ellipse-outline'}
                          size={14}
                          color={done || active ? colors.primary : colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.stepText,
                            { color: done || active ? colors.secondaryForeground : colors.mutedForeground },
                          ]}
                        >
                          {step.title}
                        </Text>
                        <Text
                          style={[
                            styles.stepStatus,
                            { color: active ? colors.primary : colors.mutedForeground },
                          ]}
                        >
                          {done ? 'Done' : active ? 'Working' : 'Pending'}
                        </Text>
                        <Text style={[styles.stepTime, { color: colors.mutedForeground }]}>
                          {step.time}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Panel>
            </View>

            <View onLayout={recordSection('reports')}>
              <Panel title="ANALYSIS OVERVIEW" icon="analytics-outline" colors={colors}>
                <View style={styles.analysisContent}>
                  <View style={[styles.chart, { borderBottomColor: colors.glassBorder }]}>
                    {chartBars.map((bar, index) => (
                      <View key={bar.label} style={styles.chartColumn}>
                        <View
                          style={[
                            styles.chartBar,
                            {
                              height: bar.value,
                              backgroundColor:
                                index === 3 ? colors.primary : colors.holo,
                              opacity: index === 3 ? 0.92 : 0.56 + index * 0.06,
                            },
                          ]}
                        />
                        <Text style={[styles.chartLabel, { color: colors.mutedForeground }]}>
                          {bar.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.topicStats}>
                    {[
                      ['Agentic AI', '32%'],
                      ['AI Safety', '24%'],
                      ['Open Source', '18%'],
                      ['Enterprise', '14%'],
                      ['Other', '12%'],
                    ].map(([name, amount]) => (
                      <View key={name} style={styles.topicStat}>
                        <View style={[styles.topicDot, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.topicStatName, { color: colors.secondaryForeground }]}>
                          {name}
                        </Text>
                        <Text style={[styles.topicStatValue, { color: colors.mutedForeground }]}>
                          {amount}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Panel>
            </View>

            <View onLayout={recordSection('live')}>
              <Panel
                title="LIVE RESULTS"
                icon="radio-outline"
                colors={colors}
                right={
                  <Text style={[styles.previewLabel, { color: colors.warning }]}>SAMPLE FEED</Text>
                }
              >
                {sources.map((source) => (
                  <View key={source.name} style={styles.sourceRow}>
                    <View style={[styles.sourceIcon, { borderColor: colors.glassBorder }]}>
                      <Ionicons
                        name={source.icon}
                        size={15}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.sourceText}>
                      <Text style={[styles.sourceName, { color: colors.foreground }]}>
                        {source.name}
                      </Text>
                      <Text style={[styles.sourceDetail, { color: colors.mutedForeground }]}>
                        {source.detail}
                      </Text>
                    </View>
                    <Text style={[styles.sourceTime, { color: colors.mutedForeground }]}>
                      {source.time}
                    </Text>
                  </View>
                ))}
              </Panel>
            </View>

            <View onLayout={recordSection('insights')}>
              <Panel title="KEY INSIGHTS" icon="sparkles-outline" colors={colors}>
                <View style={styles.insightList}>
                  {[
                    'Significant growth in agentic AI systems',
                    'Increased focus on safety and alignment',
                    'More open-source models and tools',
                    'Enterprise adoption accelerating',
                  ].map((insight) => (
                    <View key={insight} style={styles.insightRow}>
                      <View style={[styles.insightDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.insightText, { color: colors.secondaryForeground }]}>
                        {insight}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.topicPills}>
                  {topics.map((topic) => (
                    <View
                      key={topic}
                      style={[styles.topicPill, { borderColor: colors.glassBorder }]}
                    >
                      <Text style={[styles.topicPillText, { color: colors.mutedForeground }]}>
                        {topic}
                      </Text>
                    </View>
                  ))}
                </View>
              </Panel>
            </View>

            <View onLayout={recordSection('summary')}>
              <Panel
                title="SUMMARY"
                icon="document-text-outline"
                colors={colors}
                right={
                  <Pressable
                    testID="share-summary"
                    accessibilityRole="button"
                    accessibilityLabel="Share preview summary"
                    onPress={shareSummary}
                    style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="share-outline" size={14} color={colors.primary} />
                    <Text style={[styles.shareText, { color: colors.primary }]}>Share</Text>
                  </Pressable>
                }
              >
                <Text style={[styles.summaryText, { color: colors.secondaryForeground }]}>
                  {SUMMARY}
                </Text>
                <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                  Preview content · AI service is not connected
                </Text>
              </Panel>
            </View>

            <View onLayout={recordSection('tools')}>
              <Panel title="TOOLS" icon="construct-outline" colors={colors}>
                <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>
                  Start a local command draft. HORUS will not run it until an AI service is connected.
                </Text>
                <View style={styles.quickActions}>
                  {[
                    { title: 'Research a topic', icon: 'search-outline', prompt: 'Research: ' },
                    { title: 'Analyze a source', icon: 'analytics-outline', prompt: 'Analyze: ' },
                    { title: 'Draft a report', icon: 'document-text-outline', prompt: 'Draft a report about: ' },
                  ].map((action) => (
                    <Pressable
                      key={action.title}
                      testID={`quick-${action.title.toLowerCase().replaceAll(' ', '-')}`}
                      accessibilityRole="button"
                      onPress={() => prepareQuickCommand(action.prompt)}
                      style={({ pressed }) => [
                        styles.quickAction,
                        { borderColor: colors.glassBorder, backgroundColor: colors.secondary },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name={action.icon as keyof typeof Ionicons.glyphMap}
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={[styles.quickActionText, { color: colors.secondaryForeground }]}>
                        {action.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Panel>
            </View>

            <View onLayout={recordSection('history')}>
              <Panel
                title="RECENT ACTIVITY"
                icon="time-outline"
                colors={colors}
                right={
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>
                    ON THIS DEVICE
                  </Text>
                }
              >
                {activities.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={21} color={colors.mutedForeground} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      No local commands yet. Send one below to start your history.
                    </Text>
                  </View>
                ) : (
                  activities.map((activity) => (
                    <View key={activity.id} style={styles.activityRow}>
                      <Ionicons
                        name={
                          activity.kind === 'command'
                            ? 'chatbubble-ellipses-outline'
                            : activity.kind === 'task'
                              ? 'checkmark-circle'
                              : 'checkmark'
                        }
                        size={14}
                        color={activity.kind === 'command' ? colors.primary : colors.online}
                      />
                      <Text
                        numberOfLines={1}
                        style={[styles.activityTitle, { color: colors.secondaryForeground }]}
                      >
                        {activity.title}
                      </Text>
                      <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                        {activity.time}
                      </Text>
                    </View>
                  ))
                )}
              </Panel>
            </View>

            <View onLayout={recordSection('settings')}>
              <Panel title="SYSTEM STATUS" icon="hardware-chip-outline" colors={colors}>
                <View style={styles.systemGrid}>
                  {[
                    { label: 'AI Service', value: 'Not connected', color: colors.warning },
                    { label: 'App', value: 'Ready', color: colors.online },
                    { label: 'Network', value: 'Available', color: colors.online },
                    { label: 'History', value: 'On device', color: colors.primary },
                  ].map((item) => (
                    <View key={item.label} style={styles.systemItem}>
                      <View style={[styles.systemDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.systemLabel, { color: colors.mutedForeground }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.systemValue, { color: colors.secondaryForeground }]}>
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  testID="clear-history"
                  accessibilityRole="button"
                  accessibilityLabel="Clear local history"
                  onPress={clearHistory}
                  style={({ pressed }) => [
                    styles.clearButton,
                    { borderColor: colors.glassBorder },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.clearText, { color: colors.mutedForeground }]}>
                    Clear local history
                  </Text>
                </Pressable>
              </Panel>
            </View>
            <Text style={[styles.footer, { color: colors.mutedForeground }]}>
              HORUS · MOBILE COMMAND CENTER
            </Text>
          </ScrollView>

          <View
            style={[
              styles.composerWrap,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.glassBorder,
                paddingBottom: Platform.OS === 'web' ? 8 : Math.max(insets.bottom, 8),
              },
            ]}
          >
            <View
              style={[
                styles.composer,
                { backgroundColor: colors.glass, borderColor: colors.glassStrongBorder },
              ]}
            >
              <Ionicons name="pulse-outline" size={18} color={colors.primary} />
              <TextInput
                ref={inputRef}
                testID="command-input"
                accessibilityLabel="Command to HORUS"
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={sendCommand}
                placeholder="Ask HORUS anything..."
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="send"
                maxLength={400}
                style={[styles.composerInput, { color: colors.foreground }]}
              />
              <Pressable
                testID="voice-control"
                accessibilityRole="button"
                accessibilityLabel="Voice input status"
                onPress={() => setFeedback('Voice input is not connected yet.')}
                style={({ pressed }) => [styles.composerIconButton, pressed && styles.pressed]}
              >
                <Ionicons name="mic-outline" size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                testID="send-command"
                accessibilityRole="button"
                accessibilityLabel="Save command locally"
                onPress={sendCommand}
                style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="arrow-up" size={18} color={colors.primaryForeground} />
              </Pressable>
            </View>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.feedback, { color: colors.mutedForeground }]}
            >
              {feedback}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  heroBackgroundImage: { opacity: 0.92 },
  header: {
    minHeight: 58,
    paddingHorizontal: 18,
    paddingTop: 7,
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: { width: 34, height: 34, borderRadius: 9 },
  brandName: { fontFamily: 'Inter_600SemiBold', fontSize: 17, letterSpacing: 2.6 },
  brandSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 8, letterSpacing: 1.8, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  onlineLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontFamily: 'Inter_500Medium', fontSize: 8, letterSpacing: 1 },
  clock: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 22 },
  navigation: { flexGrow: 0, marginTop: 2, marginBottom: 3 },
  navigationContent: { paddingHorizontal: 14, gap: 7, alignItems: 'center' },
  navItem: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
  },
  navLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  hero: {
    height: 178,
    marginHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 7,
    paddingBottom: 14,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroTopLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroLabel: { fontFamily: 'Inter_500Medium', fontSize: 8, letterSpacing: 1.6 },
  heroDivider: { width: 1, height: 9 },
  heroBottomLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heroOrb: { width: 5, height: 5, borderWidth: 1, borderRadius: 3 },
  heroHint: { fontFamily: 'Inter_500Medium', fontSize: 8, letterSpacing: 1.5 },
  panel: {
    marginHorizontal: 15,
    marginTop: 10,
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  panelTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  panelTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.1 },
  previewBadge: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  previewBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 7, letterSpacing: 1 },
  previewLabel: { fontFamily: 'Inter_500Medium', fontSize: 8, letterSpacing: 0.7 },
  taskHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitleGroup: { flex: 1, paddingRight: 8 },
  taskTitle: { fontFamily: 'Inter_500Medium', fontSize: 14, marginBottom: 4 },
  subtleText: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  ring: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  progressTrack: { height: 5, borderWidth: 1, borderRadius: 4, overflow: 'hidden', marginTop: 5 },
  progressFill: { height: '100%', borderRadius: 4 },
  stepList: { marginTop: 12, gap: 9 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10 },
  stepStatus: { width: 49, textAlign: 'right', fontFamily: 'Inter_500Medium', fontSize: 8 },
  stepTime: { width: 36, textAlign: 'right', fontFamily: 'Inter_400Regular', fontSize: 8 },
  analysisContent: { flexDirection: 'row', alignItems: 'flex-end', gap: 15 },
  chart: {
    flex: 1,
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  chartColumn: { alignItems: 'center', gap: 5 },
  chartBar: { width: 13, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  chartLabel: { fontFamily: 'Inter_400Regular', fontSize: 7 },
  topicStats: { flex: 1.1, gap: 7, paddingBottom: 2 },
  topicStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  topicDot: { width: 4, height: 4, borderRadius: 2 },
  topicStatName: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 8 },
  topicStatValue: { fontFamily: 'Inter_500Medium', fontSize: 8 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10 },
  sourceIcon: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 9,
  },
  sourceText: { flex: 1 },
  sourceName: { fontFamily: 'Inter_500Medium', fontSize: 10, marginBottom: 3 },
  sourceDetail: { fontFamily: 'Inter_400Regular', fontSize: 8 },
  sourceTime: { fontFamily: 'Inter_400Regular', fontSize: 8 },
  insightList: { gap: 10 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  insightDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  insightText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  topicPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 13 },
  topicPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  topicPillText: { fontFamily: 'Inter_400Regular', fontSize: 8 },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  shareText: { fontFamily: 'Inter_500Medium', fontSize: 9 },
  summaryText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  disclaimer: { fontFamily: 'Inter_400Regular', fontSize: 8, marginTop: 9 },
  sectionNote: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginBottom: 12 },
  quickActions: { gap: 8 },
  quickAction: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 11,
  },
  quickActionText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  emptyState: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11 },
  activityTitle: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10 },
  activityTime: { fontFamily: 'Inter_400Regular', fontSize: 8 },
  systemGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 13 },
  systemItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  systemDot: { width: 5, height: 5, borderRadius: 3 },
  systemLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, flex: 1 },
  systemValue: { fontFamily: 'Inter_500Medium', fontSize: 8, paddingRight: 5 },
  clearButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 15,
  },
  clearText: { fontFamily: 'Inter_500Medium', fontSize: 9 },
  footer: { textAlign: 'center', fontFamily: 'Inter_500Medium', fontSize: 8, letterSpacing: 1.5, marginTop: 17 },
  composerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 9,
  },
  composer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 15,
    paddingLeft: 12,
    paddingRight: 7,
  },
  composerInput: { flex: 1, minHeight: 40, paddingVertical: 9, fontFamily: 'Inter_400Regular', fontSize: 11 },
  composerIconButton: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  feedback: { minHeight: 15, marginTop: 5, textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 8 },
  pressed: { opacity: 0.66 },
});
