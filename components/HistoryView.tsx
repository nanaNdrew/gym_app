import React, { useMemo } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Dumbbell, Flame, HeartPulse, Moon, Trash2 } from 'lucide-react-native';

import { LoggedExercise, WorkoutSession } from '../types';
import { colors, radius, spacing, TOUCH_TARGET } from '../theme';

interface HistoryViewProps {
  sessions: WorkoutSession[];
  onDeleteSession: (id: string) => void;
}

export default function HistoryView({ sessions, onDeleteSession }: HistoryViewProps) {
  // Reverse-chronological, regardless of insertion order.
  const sorted = useMemo(
    () => [...sessions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [sessions],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>History</Text>
        <Text style={styles.screenSubtitle}>
          {sessions.length === 0
            ? 'No workouts yet'
            : `${sessions.length} workout${sessions.length === 1 ? '' : 's'} logged`}
        </Text>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={sorted}
        keyExtractor={session => session.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={EmptyState}
        renderItem={({ item }) => (
          <SessionCard session={item} onDelete={() => confirmDelete(item, onDeleteSession)} />
        )}
      />
    </View>
  );
}

function confirmDelete(session: WorkoutSession, onDeleteSession: (id: string) => void) {
  Alert.alert(
    'Delete workout?',
    `${session.templateLabel} on ${formatDate(session.date)} will be removed permanently.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteSession(session.id) },
    ],
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Dumbbell size={40} color={colors.textMuted} strokeWidth={1.6} />
      <Text style={styles.emptyTitle}>No workouts yet</Text>
      <Text style={styles.emptyText}>
        Finish your first session on the Log Workout tab and it will show up here.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Session card
// ---------------------------------------------------------------------------

interface SessionCardProps {
  session: WorkoutSession;
  onDelete: () => void;
}

function SessionCard({ session, onDelete }: SessionCardProps) {
  const { recovery } = session;
  const hasRecovery =
    recovery.restingHeartRate !== null ||
    recovery.soreness !== null ||
    recovery.sleepQuality !== null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.templateLabel}>{session.templateLabel}</Text>
          <Text style={styles.date}>{formatDate(session.date)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${session.templateLabel} from ${formatDate(session.date)}`}
        >
          <Trash2 size={20} color={colors.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.exerciseList}>
        {session.exercises.map(exercise => (
          <ExerciseRow key={exercise.name} exercise={exercise} />
        ))}
      </View>

      <View style={styles.divider} />

      {hasRecovery ? (
        <View style={styles.recoveryRow}>
          <RecoveryChip
            icon={<HeartPulse size={15} color={colors.emerald} strokeWidth={2.2} />}
            text={
              recovery.restingHeartRate !== null ? `${recovery.restingHeartRate} BPM` : '—'
            }
          />
          <RecoveryChip
            icon={<Flame size={15} color={colors.amber} strokeWidth={2.2} />}
            text={recovery.soreness !== null ? `Soreness ${recovery.soreness}/5` : '—'}
          />
          <RecoveryChip
            icon={<Moon size={15} color={colors.textMuted} strokeWidth={2.2} />}
            text={recovery.sleepQuality !== null ? `Sleep ${recovery.sleepQuality}/5` : '—'}
          />
        </View>
      ) : (
        <Text style={styles.noRecovery}>No recovery check recorded</Text>
      )}
    </View>
  );
}

function ExerciseRow({ exercise }: { exercise: LoggedExercise }) {
  const allSuccess =
    exercise.completedSets.length > 0 &&
    exercise.completedSets.every(reps => reps === exercise.targetReps);

  return (
    <View style={styles.exerciseRow}>
      <Text style={styles.exerciseName} numberOfLines={1}>
        {exercise.name}
      </Text>
      <View style={styles.exerciseStats}>
        <Text style={[styles.exerciseSets, allSuccess && styles.exerciseSetsSuccess]}>
          {formatSets(exercise)}
        </Text>
        <Text style={styles.exerciseWeight}>
          {formatWeight(exercise.weight)} {exercise.unit}
        </Text>
      </View>
    </View>
  );
}

function RecoveryChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.chip}>
      {icon}
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : String(Math.round(weight * 100) / 100);
}

/** "5 / 5 / 4" — reps per set, with "–" for sets never attempted. */
function formatSets(exercise: LoggedExercise): string {
  return exercise.completedSets.map(reps => (reps === null ? '–' : String(reps))).join(' / ');
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardHeaderText: {
    flex: 1,
  },
  templateLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  date: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteButton: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
  },

  exerciseList: {
    marginTop: spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  exerciseName: {
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseSets: {
    fontSize: 14,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  exerciseSetsSuccess: {
    color: colors.emerald,
    fontWeight: '600',
  },
  exerciseWeight: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    minWidth: 64,
    textAlign: 'right',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  recoveryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  noRecovery: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
