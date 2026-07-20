/**
 * Core data models for the offline-first workout tracker.
 */

/** Weight unit for an exercise. Determines the +/- adjustment step. */
export type WeightUnit = 'lbs' | 'kg';

/** 1–5 scale used by the recovery check (1 = worst, 5 = best). */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** Quick-start template identifiers. */
export type TemplateLabel = 'Workout A' | 'Workout B' | 'Workout C';

/**
 * Pre-workout biomarker snapshot. Every field is nullable so the user can
 * skip the check entirely and still save the session.
 */
export interface RecoveryMetrics {
  /** Resting heart rate in BPM, or null if not recorded. */
  restingHeartRate: number | null;
  /** Muscle soreness: 1 = very sore, 5 = fresh. */
  soreness: Rating | null;
  /** Sleep quality: 1 = terrible, 5 = great. */
  sleepQuality: Rating | null;
}

/**
 * One exercise within a session.
 *
 * `completedSets` always has exactly `targetSets` entries:
 *   - `null` — set not attempted yet
 *   - `n`    — set performed for `n` reps (`n === targetReps` is a full success)
 */
export interface LoggedExercise {
  name: string;
  targetSets: number;
  targetReps: number;
  weight: number;
  unit: WeightUnit;
  completedSets: Array<number | null>;
}

/** A single (possibly in-progress) workout session. */
export interface WorkoutSession {
  id: string;
  /** ISO-8601 timestamp; represents the logical date of the workout (can be manually overridden). */
  date: string;
  /** ISO-8601 timestamp; when the workout actually began. */
  startTime?: string;
  /** ISO-8601 timestamp; when the workout was completed. */
  endTime?: string;
  templateLabel: TemplateLabel;
  exercises: LoggedExercise[];
  recovery: RecoveryMetrics;
}

/** Static definition of one exercise inside a quick-start template. */
export interface TemplateExercise {
  name: string;
  targetSets: number;
  targetReps: number;
  /** Starting weight used when there is no history for this exercise yet. */
  startingWeight: Record<WeightUnit, number>;
}

/** A quick-start workout template (e.g. StrongLifts-style Workout A/B). */
export interface WorkoutTemplate {
  label: TemplateLabel;
  exercises: TemplateExercise[];
}
