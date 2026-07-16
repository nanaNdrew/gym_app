import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Flame,
  HeartPulse,
  Minus,
  Moon,
  Plus,
  TrendingUp,
  X,
} from 'lucide-react-native';

import {
  LoggedExercise,
  RecoveryMetrics,
  Rating,
  WeightUnit,
  WorkoutSession,
  WorkoutTemplate,
} from '../types';
import { colors, radius, spacing, TOUCH_TARGET } from '../theme';

// ---------------------------------------------------------------------------
// Templates & progression
// ---------------------------------------------------------------------------

/** Weight step per tap of the +/- adjusters, and per-session auto-progression. */
export const WEIGHT_STEP: Record<WeightUnit, number> = { lbs: 5, kg: 2.5 };

const LBS_PER_KG = 2.2046226218;

export const TEMPLATES: WorkoutTemplate[] = [
  {
    label: 'Workout A',
    exercises: [
      { name: 'Squat', targetSets: 3, targetReps: 5, startingWeight: { lbs: 45, kg: 20 } },
      { name: 'Bench Press', targetSets: 3, targetReps: 5, startingWeight: { lbs: 45, kg: 20 } },
      { name: 'Deadlift', targetSets: 1, targetReps: 5, startingWeight: { lbs: 95, kg: 40 } },
    ],
  },
  {
    label: 'Workout B',
    exercises: [
      { name: 'Squat', targetSets: 3, targetReps: 5, startingWeight: { lbs: 45, kg: 20 } },
      { name: 'Overhead Press', targetSets: 3, targetReps: 5, startingWeight: { lbs: 45, kg: 20 } },
      { name: 'Power Clean', targetSets: 5, targetReps: 3, startingWeight: { lbs: 65, kg: 30 } },
    ],
  },
];

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** "225" or "62.5" — no trailing ".0"; matches the 2-decimal commit precision. */
export function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : String(Math.round(weight * 100) / 100);
}

function roundToStep(weight: number, step: number): number {
  return Math.round((Math.round(weight / step) * step) * 100) / 100;
}

function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  return to === 'kg' ? weight / LBS_PER_KG : weight * LBS_PER_KG;
}

interface SeededExercise {
  exercise: LoggedExercise;
  /** True when the weight was auto-progressed from a previous session. */
  progressed: boolean;
}

/**
 * Build the exercise list for a new session: take the most recent completed
 * session of the same template and bump each matching lift by one step
 * (+5 lbs / +2.5 kg). Falls back to the template's starting weight.
 */
export function seedExercises(
  template: WorkoutTemplate,
  unit: WeightUnit,
  sessions: WorkoutSession[],
): SeededExercise[] {
  const lastOfTemplate = [...sessions]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .find(s => s.templateLabel === template.label);

  return template.exercises.map(te => {
    const previous = lastOfTemplate?.exercises.find(e => e.name === te.name);
    const step = WEIGHT_STEP[unit];
    let weight: number;
    if (previous) {
      const prevInUnit = convertWeight(previous.weight, previous.unit, unit);
      weight = roundToStep(prevInUnit, step) + step;
    } else {
      weight = te.startingWeight[unit];
    }
    return {
      progressed: previous != null,
      exercise: {
        name: te.name,
        targetSets: te.targetSets,
        targetReps: te.targetReps,
        weight,
        unit,
        completedSets: Array<number | null>(te.targetSets).fill(null),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// WorkoutLogger — template picker + active workout dashboard
// ---------------------------------------------------------------------------

interface WorkoutLoggerProps {
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  onChangeSession: (session: WorkoutSession | null) => void;
  onFinish: () => void;
  onDiscard: () => void;
}

export default function WorkoutLogger({
  sessions,
  activeSession,
  onChangeSession,
  onFinish,
  onDiscard,
}: WorkoutLoggerProps) {
  if (!activeSession) {
    return (
      <TemplatePicker
        sessions={sessions}
        onStart={session => onChangeSession(session)}
      />
    );
  }
  return (
    <ActiveWorkout
      session={activeSession}
      onChangeSession={onChangeSession}
      onFinish={onFinish}
      onDiscard={onDiscard}
    />
  );
}

// ---------------------------------------------------------------------------
// Template picker
// ---------------------------------------------------------------------------

interface TemplatePickerProps {
  sessions: WorkoutSession[];
  onStart: (session: WorkoutSession) => void;
}

function TemplatePicker({ sessions, onStart }: TemplatePickerProps) {
  const [unit, setUnit] = useState<WeightUnit>(
    () => sessions[0]?.exercises[0]?.unit ?? 'lbs',
  );

  const seededByLabel = useMemo(
    () => TEMPLATES.map(t => ({ template: t, seeded: seedExercises(t, unit, sessions) })),
    [unit, sessions],
  );

  const startWorkout = (template: WorkoutTemplate, seeded: SeededExercise[]) => {
    onStart({
      id: makeId(),
      date: new Date().toISOString(),
      templateLabel: template.label,
      exercises: seeded.map(s => s.exercise),
      recovery: { restingHeartRate: null, soreness: null, sleepQuality: null },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.pickerContainer}>
      <Text style={styles.screenTitle}>Start a Workout</Text>
      <Text style={styles.screenSubtitle}>
        Pick a template — weights auto-progress {`+${formatWeight(WEIGHT_STEP[unit])} ${unit}`} from
        your last session.
      </Text>

      <View style={styles.unitToggle}>
        {(['lbs', 'kg'] as const).map(u => (
          <TouchableOpacity
            key={u}
            style={[styles.unitButton, unit === u && styles.unitButtonActive]}
            onPress={() => setUnit(u)}
            accessibilityRole="button"
            accessibilityState={{ selected: unit === u }}
            accessibilityLabel={`Use ${u === 'lbs' ? 'pounds' : 'kilograms'}`}
          >
            <Text style={[styles.unitButtonText, unit === u && styles.unitButtonTextActive]}>
              {u.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {seededByLabel.map(({ template, seeded }) => (
        <TouchableOpacity
          key={template.label}
          style={styles.templateCard}
          activeOpacity={0.8}
          onPress={() => startWorkout(template, seeded)}
          accessibilityRole="button"
          accessibilityLabel={`Start ${template.label}`}
        >
          <View style={styles.templateHeader}>
            <Text style={styles.templateTitle}>{template.label}</Text>
            <ChevronRight size={22} color={colors.emerald} strokeWidth={2.4} />
          </View>
          {seeded.map(({ exercise, progressed }) => (
            <View key={exercise.name} style={styles.templateRow}>
              <Text style={styles.templateExercise}>{exercise.name}</Text>
              <View style={styles.templateMeta}>
                {progressed && (
                  <View style={styles.progressBadge}>
                    <TrendingUp size={13} color={colors.emerald} strokeWidth={2.5} />
                    <Text style={styles.progressBadgeText}>
                      +{formatWeight(WEIGHT_STEP[unit])}
                    </Text>
                  </View>
                )}
                <Text style={styles.templateDetail}>
                  {exercise.targetSets}×{exercise.targetReps} · {formatWeight(exercise.weight)}{' '}
                  {unit}
                </Text>
              </View>
            </View>
          ))}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Active workout
// ---------------------------------------------------------------------------

interface ActiveWorkoutProps {
  session: WorkoutSession;
  onChangeSession: (session: WorkoutSession) => void;
  onFinish: () => void;
  onDiscard: () => void;
}

/** Which set's inline rep-picker is open, if any. */
interface EditingSet {
  exerciseIndex: number;
  setIndex: number;
}

function ActiveWorkout({ session, onChangeSession, onFinish, onDiscard }: ActiveWorkoutProps) {
  const [editing, setEditing] = useState<EditingSet | null>(null);

  const updateExercise = (index: number, patch: Partial<LoggedExercise>) => {
    onChangeSession({
      ...session,
      exercises: session.exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    });
  };

  const setSetReps = (exerciseIndex: number, setIndex: number, reps: number | null) => {
    const exercise = session.exercises[exerciseIndex];
    updateExercise(exerciseIndex, {
      completedSets: exercise.completedSets.map((s, i) => (i === setIndex ? reps : s)),
    });
  };

  /**
   * Set circle state machine:
   *   tap 1 (pending)               -> full success at target reps (emerald + check)
   *   tap 2 (full success)          -> open inline rep picker to log a partial set
   *   tap 3 (picker open / partial) -> reset to pending
   * The picker's X closes it without touching the logged reps.
   */
  const handleSetPress = (exerciseIndex: number, setIndex: number) => {
    const exercise = session.exercises[exerciseIndex];
    const current = exercise.completedSets[setIndex];
    const isEditingThis =
      editing?.exerciseIndex === exerciseIndex && editing?.setIndex === setIndex;

    if (current === null) {
      setSetReps(exerciseIndex, setIndex, exercise.targetReps);
      setEditing(null);
    } else if (current === exercise.targetReps && !isEditingThis) {
      setEditing({ exerciseIndex, setIndex });
    } else {
      setSetReps(exerciseIndex, setIndex, null);
      setEditing(null);
    }
  };

  const totalSets = session.exercises.reduce((n, ex) => n + ex.targetSets, 0);
  const loggedSets = session.exercises.reduce(
    (n, ex) => n + ex.completedSets.filter(s => s !== null).length,
    0,
  );

  const handleFinish = () => {
    if (loggedSets === 0) {
      Alert.alert('No sets logged', 'Tap a set circle to log it, or discard this workout.');
      return;
    }
    Alert.alert('Finish workout?', 'This session will be saved to your history.', [
      { text: 'Keep Lifting', style: 'cancel' },
      { text: 'Finish & Save', onPress: onFinish },
    ]);
  };

  const handleDiscard = () => {
    Alert.alert('Discard workout?', 'Everything logged this session will be lost.', [
      { text: 'Keep Lifting', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onDiscard },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.workoutHeader}>
        <View>
          <Text style={styles.screenTitle}>{session.templateLabel}</Text>
          <Text style={styles.workoutProgress}>
            {loggedSets}/{totalSets} sets logged
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleDiscard}
          accessibilityRole="button"
          accessibilityLabel="Discard workout"
        >
          <X size={24} color={colors.textMuted} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.workoutContainer}
        keyboardShouldPersistTaps="handled"
      >
        <RecoveryPanel
          metrics={session.recovery}
          onChange={recovery => onChangeSession({ ...session, recovery })}
        />

        {session.exercises.map((exercise, exerciseIndex) => (
          <ExerciseCard
            key={exercise.name}
            exercise={exercise}
            editingSetIndex={
              editing?.exerciseIndex === exerciseIndex ? editing.setIndex : null
            }
            onPressSet={setIndex => handleSetPress(exerciseIndex, setIndex)}
            onPickReps={(setIndex, reps) => {
              setSetReps(exerciseIndex, setIndex, reps);
              setEditing(null);
            }}
            onClosePicker={() => setEditing(null)}
            onChangeWeight={weight => updateExercise(exerciseIndex, { weight })}
          />
        ))}

        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinish}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Finish workout"
        >
          <Check size={22} color={colors.bg} strokeWidth={3} />
          <Text style={styles.finishButtonText}>Finish Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Exercise card — set circles, rep picker, weight adjusters
// ---------------------------------------------------------------------------

interface ExerciseCardProps {
  exercise: LoggedExercise;
  /** Index of the set whose rep picker is open, or null. */
  editingSetIndex: number | null;
  onPressSet: (setIndex: number) => void;
  onPickReps: (setIndex: number, reps: number) => void;
  onClosePicker: () => void;
  onChangeWeight: (weight: number) => void;
}

function ExerciseCard({
  exercise,
  editingSetIndex,
  onPressSet,
  onPickReps,
  onClosePicker,
  onChangeWeight,
}: ExerciseCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseTarget}>
          {exercise.targetSets} × {exercise.targetReps}
        </Text>
      </View>

      <View style={styles.setRow}>
        {exercise.completedSets.map((reps, setIndex) => (
          <SetCircle
            key={setIndex}
            reps={reps}
            targetReps={exercise.targetReps}
            setNumber={setIndex + 1}
            onPress={() => onPressSet(setIndex)}
          />
        ))}
      </View>

      {editingSetIndex !== null && (
        <RepPicker
          setNumber={editingSetIndex + 1}
          targetReps={exercise.targetReps}
          currentReps={exercise.completedSets[editingSetIndex]}
          onPick={reps => onPickReps(editingSetIndex, reps)}
          onClose={onClosePicker}
        />
      )}

      <WeightControl
        weight={exercise.weight}
        unit={exercise.unit}
        onChangeWeight={onChangeWeight}
      />
    </View>
  );
}

interface SetCircleProps {
  reps: number | null;
  targetReps: number;
  setNumber: number;
  onPress: () => void;
}

function SetCircle({ reps, targetReps, setNumber, onPress }: SetCircleProps) {
  const isSuccess = reps === targetReps;
  const isPartial = reps !== null && reps < targetReps;
  const isFailed = reps === 0;

  const label =
    reps === null
      ? `Set ${setNumber}: not logged, target ${targetReps} reps`
      : `Set ${setNumber}: ${reps} of ${targetReps} reps`;

  return (
    <TouchableOpacity
      style={[
        styles.setCircle,
        isSuccess && styles.setCircleSuccess,
        isPartial && styles.setCirclePartial,
        isFailed && styles.setCircleFailed,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isSuccess ? (
        <Check size={26} color={colors.bg} strokeWidth={3.2} />
      ) : (
        <Text
          style={[
            styles.setCircleText,
            isPartial && styles.setCircleTextPartial,
            isFailed && styles.setCircleTextFailed,
          ]}
        >
          {reps ?? targetReps}
        </Text>
      )}
    </TouchableOpacity>
  );
}

interface RepPickerProps {
  setNumber: number;
  targetReps: number;
  currentReps: number | null;
  onPick: (reps: number) => void;
  onClose: () => void;
}

/** Inline "how many reps did you actually get?" selector for a failed set. */
function RepPicker({ setNumber, targetReps, currentReps, onPick, onClose }: RepPickerProps) {
  const options = Array.from({ length: targetReps + 1 }, (_, i) => i);
  return (
    <View style={styles.repPicker}>
      <View style={styles.repPickerHeader}>
        <Text style={styles.repPickerTitle}>Set {setNumber} — reps completed</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close rep picker"
        >
          <X size={20} color={colors.textMuted} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
      <View style={styles.repPickerRow}>
        {options.map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.repOption, currentReps === n && styles.repOptionActive]}
            onPress={() => onPick(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} reps`}
          >
            <Text
              style={[styles.repOptionText, currentReps === n && styles.repOptionTextActive]}
            >
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

interface WeightControlProps {
  weight: number;
  unit: WeightUnit;
  onChangeWeight: (weight: number) => void;
}

/** Big +/- steppers around a numeric input, so the keyboard is rarely needed. */
function WeightControl({ weight, unit, onChangeWeight }: WeightControlProps) {
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState(() => formatWeight(weight));
  const [focused, setFocused] = useState(false);
  const step = WEIGHT_STEP[unit];

  // Mirror external weight changes (stepper taps, post-blur normalization)
  // into the display whenever the user isn't actively typing.
  useEffect(() => {
    if (!focused) setDraft(formatWeight(weight));
  }, [weight, focused]);

  // Commit on every keystroke so session state always holds the latest typed
  // weight — even if the workout is finished without dismissing the keyboard.
  const handleChangeText = (text: string) => {
    setDraft(text);
    const parsed = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChangeWeight(Math.round(parsed * 100) / 100);
    }
  };

  // Stepper taps take over from typing: blur first so the keyboard closes and
  // the synced display (not a stale draft) is what the user sees from then on.
  const applyStep = (delta: number) => {
    inputRef.current?.blur();
    onChangeWeight(Math.max(0, Math.round((weight + delta) * 100) / 100));
  };

  return (
    <View style={styles.weightRow}>
      <TouchableOpacity
        style={[styles.stepButton, weight <= 0 && styles.stepButtonDisabled]}
        onPress={() => applyStep(-step)}
        disabled={weight <= 0}
        accessibilityRole="button"
        accessibilityLabel={`Decrease weight by ${formatWeight(step)} ${unit}`}
      >
        <Minus size={26} color={colors.text} strokeWidth={2.6} />
      </TouchableOpacity>

      <View style={styles.weightCenter}>
        <TextInput
          ref={inputRef}
          style={styles.weightInput}
          value={draft}
          onChangeText={handleChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="decimal-pad"
          returnKeyType="done"
          maxLength={6}
          selectTextOnFocus
          accessibilityLabel={`Weight in ${unit}`}
        />
        <Text style={styles.weightUnit}>{unit}</Text>
      </View>

      <TouchableOpacity
        style={styles.stepButton}
        onPress={() => applyStep(step)}
        accessibilityRole="button"
        accessibilityLabel={`Increase weight by ${formatWeight(step)} ${unit}`}
      >
        <Plus size={26} color={colors.text} strokeWidth={2.6} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pre-workout recovery check
// ---------------------------------------------------------------------------

interface RecoveryPanelProps {
  metrics: RecoveryMetrics;
  onChange: (metrics: RecoveryMetrics) => void;
}

function RecoveryPanel({ metrics, onChange }: RecoveryPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const summaryParts: string[] = [];
  if (metrics.restingHeartRate !== null) summaryParts.push(`${metrics.restingHeartRate} BPM`);
  if (metrics.soreness !== null) summaryParts.push(`Soreness ${metrics.soreness}/5`);
  if (metrics.sleepQuality !== null) summaryParts.push(`Sleep ${metrics.sleepQuality}/5`);
  const summary = summaryParts.length > 0 ? summaryParts.join(' · ') : 'Tap to log';

  const handleRhrChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    const parsed = parseInt(digits, 10);
    onChange({
      ...metrics,
      restingHeartRate: Number.isFinite(parsed) ? Math.min(parsed, 250) : null,
    });
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.recoveryHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Pre-workout recovery check"
      >
        <HeartPulse size={22} color={colors.emerald} strokeWidth={2.2} />
        <View style={styles.flex}>
          <Text style={styles.recoveryTitle}>Pre-Workout Recovery Check</Text>
          {!expanded && <Text style={styles.recoverySummary}>{summary}</Text>}
        </View>
        {expanded ? (
          <ChevronUp size={22} color={colors.textMuted} strokeWidth={2.2} />
        ) : (
          <ChevronDown size={22} color={colors.textMuted} strokeWidth={2.2} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.recoveryBody}>
          <View style={styles.rhrRow}>
            <Text style={styles.fieldLabel}>Resting Heart Rate</Text>
            <View style={styles.rhrInputWrap}>
              <TextInput
                style={styles.rhrInput}
                value={metrics.restingHeartRate?.toString() ?? ''}
                onChangeText={handleRhrChange}
                keyboardType="number-pad"
                returnKeyType="done"
                maxLength={3}
                placeholder="60"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Resting heart rate in beats per minute"
              />
              <Text style={styles.rhrUnit}>BPM</Text>
            </View>
          </View>

          <RatingSelector
            label="Muscle Soreness"
            icon={<Flame size={18} color={colors.amber} strokeWidth={2.2} />}
            value={metrics.soreness}
            onChange={soreness => onChange({ ...metrics, soreness })}
            lowHint="Very sore"
            highHint="Fresh"
          />
          <RatingSelector
            label="Sleep Quality"
            icon={<Moon size={18} color={colors.textMuted} strokeWidth={2.2} />}
            value={metrics.sleepQuality}
            onChange={sleepQuality => onChange({ ...metrics, sleepQuality })}
            lowHint="Terrible"
            highHint="Great"
          />
        </View>
      )}
    </View>
  );
}

interface RatingSelectorProps {
  label: string;
  icon: React.ReactNode;
  value: Rating | null;
  onChange: (value: Rating | null) => void;
  lowHint: string;
  highHint: string;
}

const RATINGS: Rating[] = [1, 2, 3, 4, 5];

function RatingSelector({ label, icon, value, onChange, lowHint, highHint }: RatingSelectorProps) {
  return (
    <View style={styles.ratingBlock}>
      <View style={styles.ratingLabelRow}>
        {icon}
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.ratingRow}>
        {RATINGS.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.ratingButton, value === r && styles.ratingButtonActive]}
            onPress={() => onChange(value === r ? null : r)}
            accessibilityRole="button"
            accessibilityState={{ selected: value === r }}
            accessibilityLabel={`${label} ${r} out of 5`}
          >
            <Text style={[styles.ratingText, value === r && styles.ratingTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.ratingHints}>
        <Text style={styles.ratingHint}>{lowHint}</Text>
        <Text style={styles.ratingHint}>{highHint}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // Shared
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
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  iconButton: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Template picker
  pickerContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xs,
    marginTop: spacing.lg,
  },
  unitButton: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  unitButtonActive: {
    backgroundColor: colors.emerald,
  },
  unitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  unitButtonTextActive: {
    color: colors.bg,
  },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  templateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  templateExercise: {
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  templateDetail: {
    fontSize: 14,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.emeraldSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.emerald,
  },

  // Active workout
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  workoutProgress: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  workoutContainer: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xl * 2,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.emerald,
    borderRadius: radius.md,
    minHeight: 56,
    marginTop: spacing.xl,
  },
  finishButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.bg,
  },

  // Exercise card
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  exerciseTarget: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  setRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  setCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCircleSuccess: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  setCirclePartial: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amber,
  },
  setCircleFailed: {
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
    borderColor: colors.danger,
  },
  setCircleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  setCircleTextPartial: {
    color: colors.amber,
  },
  setCircleTextFailed: {
    color: colors.danger,
  },

  // Rep picker
  repPicker: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  repPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repPickerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  repPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  repOption: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repOptionActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  repOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  repOptionTextActive: {
    color: colors.bg,
  },

  // Weight control
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.35,
  },
  weightCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  weightInput: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    minWidth: 90,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // Recovery panel
  recoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
  },
  recoveryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  recoverySummary: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  recoveryBody: {
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  rhrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rhrInputWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  rhrInput: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    minWidth: 56,
    minHeight: TOUCH_TARGET,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  rhrUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  ratingBlock: {},
  ratingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratingButton: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingButtonActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  ratingTextActive: {
    color: colors.bg,
  },
  ratingHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  ratingHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
