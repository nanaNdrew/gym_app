import AppleHealthKit, { HealthValue, HealthKitPermissions } from 'react-native-health';
import { WorkoutSession } from '../types';
import { Platform } from 'react-native';

const PERMISSIONS = {
  permissions: {
    read: [],
    write: [AppleHealthKit.Constants.Permissions.Workout],
  },
} as HealthKitPermissions;

let isInitialized = false;

export async function requestHealthKitPermissions(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (err: string) => {
      if (err) {
        console.warn('Error initializing HealthKit:', err);
        reject(err);
      } else {
        isInitialized = true;
        resolve();
      }
    });
  });
}

export async function saveWorkoutToHealthKit(session: WorkoutSession): Promise<void> {
  if (Platform.OS !== 'ios') return;

  if (!isInitialized) {
    try {
      await requestHealthKitPermissions();
    } catch {
      return;
    }
  }

  return new Promise((resolve, reject) => {
    // Determine start and end times.
    // If it's a real-time workout, use the exact recorded times.
    // If it's a manual log, default to a 60-minute block at noon on the logged date.
    let startDate: string;
    let endDate: string;

    if (session.startTime && session.endTime) {
      startDate = session.startTime;
      endDate = session.endTime;
    } else {
      const dateStr = session.date.split('T')[0];
      startDate = `${dateStr}T12:00:00Z`;
      endDate = `${dateStr}T13:00:00Z`;
    }

    const options = {
      type: AppleHealthKit.Constants.Activities.TraditionalStrengthTraining,
      startDate,
      endDate,
    };

    AppleHealthKit.saveWorkout(options as any, (err: Object, result: HealthValue) => {
      if (err) {
        console.warn('Error saving workout to HealthKit:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
