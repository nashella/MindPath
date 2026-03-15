import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { savePatientLocation } from '@/lib/firestore-data';

const PATIENT_LOCATION_TASK_NAME = 'mindpath-patient-location-updates';
const PATIENT_LOCATION_SESSION_KEY = 'mindpath.patient-location-session';

type TrackingSession = {
  patientId: string;
  userId: string;
};

type LocationTaskPayload = {
  locations?: Location.LocationObject[];
};

function isValidSession(value: Partial<TrackingSession> | null | undefined): value is TrackingSession {
  return Boolean(value?.patientId && value?.userId);
}

async function getTrackingSession() {
  const rawValue = await AsyncStorage.getItem(PATIENT_LOCATION_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<TrackingSession>;
    return isValidSession(parsedValue) ? parsedValue : null;
  } catch (error) {
    console.error('Could not parse the patient location session.', error);
    return null;
  }
}

export async function persistPatientTrackingSession(patientId: string, userId: string) {
  await AsyncStorage.setItem(
    PATIENT_LOCATION_SESSION_KEY,
    JSON.stringify({
      patientId: String(patientId ?? '').trim(),
      userId: String(userId ?? '').trim(),
    })
  );
}

export async function clearPatientTrackingSession() {
  await AsyncStorage.removeItem(PATIENT_LOCATION_SESSION_KEY);
}

export async function syncPatientLocationAsync(
  patientId: string,
  userId: string,
  coords: Location.LocationObjectCoords,
  source: string
) {
  if (
    !patientId ||
    !userId ||
    !coords ||
    !Number.isFinite(coords.latitude) ||
    !Number.isFinite(coords.longitude)
  ) {
    return;
  }

  await savePatientLocation(patientId, userId, {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    altitudeAccuracy: coords.altitudeAccuracy,
    heading: coords.heading,
    speed: coords.speed,
    source,
  });
}

export async function startPatientBackgroundLocationTrackingAsync(patientId: string, userId: string) {
  if (Platform.OS === 'web') {
    return false;
  }

  await persistPatientTrackingSession(patientId, userId);

  const taskManagerAvailable = await TaskManager.isAvailableAsync();

  if (!taskManagerAvailable) {
    return false;
  }

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(PATIENT_LOCATION_TASK_NAME);

  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(PATIENT_LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      activityType: Location.ActivityType.Fitness,
      distanceInterval: 15,
      timeInterval: 20000,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'MindPath location sharing',
        notificationBody: 'MindPath is sharing the patient location with the caregiver.',
        killServiceOnDestroy: false,
      },
    });
  }

  return true;
}

export async function stopPatientBackgroundLocationTrackingAsync() {
  if (Platform.OS === 'web') {
    await clearPatientTrackingSession();
    return;
  }

  const taskManagerAvailable = await TaskManager.isAvailableAsync();

  if (taskManagerAvailable) {
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(PATIENT_LOCATION_TASK_NAME);

    if (alreadyStarted) {
      await Location.stopLocationUpdatesAsync(PATIENT_LOCATION_TASK_NAME);
    }
  }

  await clearPatientTrackingSession();
}

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(PATIENT_LOCATION_TASK_NAME)) {
  TaskManager.defineTask<LocationTaskPayload>(PATIENT_LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('Background patient location task failed', error);
      return;
    }

    const session = await getTrackingSession();

    if (!session) {
      return;
    }

    const nextLocations = Array.isArray(data?.locations) ? data.locations : [];
    const latestLocation = nextLocations[nextLocations.length - 1];

    if (!latestLocation?.coords) {
      return;
    }

    try {
      await syncPatientLocationAsync(
        session.patientId,
        session.userId,
        latestLocation.coords,
        'patient-background-task'
      );
    } catch (taskError) {
      console.error('Background patient location save failed', taskError);
    }
  });
}
