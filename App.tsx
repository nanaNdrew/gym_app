import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dumbbell, History } from 'lucide-react-native';

import { WorkoutSession } from './types';
import { colors, spacing, TOUCH_TARGET } from './theme';
import WorkoutLogger from './components/WorkoutLogger';
import HistoryView from './components/HistoryView';
import { saveWorkoutToHealthKit } from './utils/healthkit';

// ---------------------------------------------------------------------------
// AsyncStorage persistence
// ---------------------------------------------------------------------------

const SESSIONS_KEY = '@gym_app/sessions_v1';
const DRAFT_KEY = '@gym_app/active_session_v1';

async function loadStoredSessions(): Promise<WorkoutSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkoutSession[]) : [];
  } catch {
    // Corrupt or unreadable data — start fresh rather than crash mid-gym.
    return [];
  }
}

async function loadStoredDraft(): Promise<WorkoutSession | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as WorkoutSession) : null;
  } catch {
    return null;
  }
}

type Tab = 'log' | 'history';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const insets = useSafeAreaInsets();
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>('log');
  const [manualDate, setManualDate] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  // The in-progress workout. Persisted separately so a killed app (or dead
  // battery) mid-session never loses logged sets.
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);

  // Hydrate history + any in-progress draft on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stored, draft] = await Promise.all([
        loadStoredSessions(),
        loadStoredDraft(),
      ]);
      if (cancelled) return;
      setSessions(stored);
      setActiveSession(draft);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist history whenever it changes (post-hydration only, so the initial
  // empty state never clobbers stored data).
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)).catch(() => {});
  }, [sessions, hydrated]);

  // Persist the in-progress draft on every change.
  useEffect(() => {
    if (!hydrated) return;
    if (activeSession) {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(activeSession)).catch(() => {});
    } else {
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    }
  }, [activeSession, hydrated]);

  const finishWorkout = useCallback(() => {
    if (!activeSession) return;
    const completed: WorkoutSession = {
      ...activeSession,
      endTime: activeSession.startTime ? new Date().toISOString() : undefined,
    };
    setSessions(prev => [completed, ...prev]);
    setActiveSession(null);
    setManualDate(null);
    setTab('history');

    saveWorkoutToHealthKit(completed).catch(e => {
      console.log('HealthKit sync failed:', e);
    });
  }, [activeSession]);

  const discardWorkout = useCallback(() => {
    setActiveSession(null);
    setManualDate(null);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  if (!hydrated) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.emerald} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {tab === 'log' ? (
          <WorkoutLogger
            sessions={sessions}
            activeSession={activeSession}
            onChangeSession={setActiveSession}
            onFinish={finishWorkout}
            onDiscard={discardWorkout}
            manualDate={manualDate}
            onClearManualDate={() => setManualDate(null)}
          />
        ) : (
          <HistoryView 
            sessions={sessions} 
            onDeleteSession={deleteSession} 
            onLogManualWorkout={(date: string) => {
              setManualDate(date);
              setTab('log');
            }}
          />
        )}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TabButton
          label="Log Workout"
          icon={Dumbbell}
          active={tab === 'log'}
          onPress={() => {
            setManualDate(null);
            setTab('log');
          }}
        />
        <TabButton
          label="History"
          icon={History}
          active={tab === 'history'}
          onPress={() => setTab('history')}
        />
      </View>
    </SafeAreaView>
  );
}

interface TabButtonProps {
  label: string;
  icon: typeof Dumbbell;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, icon: Icon, active, onPress }: TabButtonProps) {
  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Icon size={24} color={active ? colors.emerald : colors.textMuted} strokeWidth={2.2} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tabButton: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.emerald,
  },
});
