import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from './firebase';

const COLLECTIONS = {
  users: 'users',
  patients: 'patients',
  patientLocations: 'patientLocations',
  patientSafeZones: 'patientSafeZones',
  patientAlerts: 'patientAlerts',
  patientMemories: 'patientMemories',
  medications: 'medications',
  medicationCompletions: 'medicationCompletions',
  calendarEvents: 'calendarEvents',
  dailyTasks: 'dailyTasks',
  caregiverCheckins: 'caregiverCheckins',
  legacyPatientProfiles: 'patientProfiles',
};

const DEFAULT_COMPLETION_WINDOW_MINUTES = 30;

function createDataError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getTodayDateKey() {
  return getDateKey(new Date());
}

export function getCurrentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getTimeSortValue(formattedTime) {
  const match = formattedTime.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  let hour = Number(match[1]) % 12;
  const minute = Number(match[2]);

  if (match[3] === 'PM') {
    hour += 12;
  }

  return hour * 60 + minute;
}

export function sortFormattedTimes(times) {
  return [...times].sort((leftTime, rightTime) => {
    return getTimeSortValue(leftTime) - getTimeSortValue(rightTime);
  });
}

export function buildMedicationCompletionId(patientId, medicationId, dateKey, scheduledTime) {
  return [
    String(patientId ?? '').trim(),
    String(medicationId ?? '').trim(),
    String(dateKey ?? '').trim(),
    encodeURIComponent(String(scheduledTime ?? '').trim()),
  ].join('__');
}

export function normalizeJoinCode(joinCode) {
  const rawValue = String(joinCode ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!rawValue) {
    return '';
  }

  if (rawValue.startsWith('MP') && rawValue.length > 2) {
    return `MP-${rawValue.slice(2)}`;
  }

  return `MP-${rawValue}`;
}

function buildJoinCodeCandidate() {
  const code = Math.floor(100000 + Math.random() * 900000);
  return `MP-${code}`;
}

async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const joinCode = buildJoinCodeCandidate();
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.patients),
        where('joinCode', '==', joinCode),
        limit(1)
      )
    );

    if (snapshot.empty) {
      return joinCode;
    }
  }

  throw createDataError('custom/join-code-generation-failed', 'Could not generate a unique join code.');
}

function subscribeToPatientCollection(collectionName, patientId, onItems, onError, sortItems) {
  const collectionQuery = query(
    collection(db, collectionName),
    where('patientId', '==', patientId)
  );

  return onSnapshot(
    collectionQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));

      onItems(sortItems ? items.sort(sortItems) : items);
    },
    onError
  );
}

export function subscribeToUserProfile(userId, onProfile, onError) {
  return onSnapshot(
    doc(db, COLLECTIONS.users, userId),
    (snapshot) => {
      onProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export async function getUserProfile(userId) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, userId));

  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export function saveUserPushToken(userId, pushToken) {
  const normalizedToken = String(pushToken ?? '').trim();

  if (!userId || !normalizedToken) {
    return Promise.resolve();
  }

  return setDoc(
    doc(db, COLLECTIONS.users, userId),
    {
      userId,
      expoPushTokens: arrayUnion(normalizedToken),
      lastExpoPushToken: normalizedToken,
      pushTokenUpdatedAt: serverTimestamp(),
      pushTokenUpdatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    },
    { merge: true }
  );
}

export function subscribeToPatient(patientId, onPatient, onError) {
  return onSnapshot(
    doc(db, COLLECTIONS.patients, patientId),
    (snapshot) => {
      onPatient(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export function subscribeToPatientLocation(patientId, onLocation, onError) {
  return onSnapshot(
    doc(db, COLLECTIONS.patientLocations, patientId),
    (snapshot) => {
      onLocation(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export function subscribeToPatientSafeZone(patientId, onSafeZone, onError) {
  return onSnapshot(
    doc(db, COLLECTIONS.patientSafeZones, patientId),
    (snapshot) => {
      onSafeZone(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export function subscribeToPatientMemories(patientId, onItems, onError) {
  return subscribeToPatientCollection(
    COLLECTIONS.patientMemories,
    patientId,
    onItems,
    onError,
    (leftItem, rightItem) => Number(rightItem.createdAtMs ?? 0) - Number(leftItem.createdAtMs ?? 0)
  );
}

export async function createPatientForCaregiverAccount({ userId, email, patientName, patientAge }) {
  const patientRef = doc(collection(db, COLLECTIONS.patients));
  const joinCode = await generateUniqueJoinCode();
  const numericAge = Number(patientAge);
  const nowMs = Date.now();
  const batch = writeBatch(db);

  batch.set(patientRef, {
    patientName: patientName.trim(),
    patientAge: numericAge,
    joinCode,
    createdByUserId: userId,
    createdAt: serverTimestamp(),
    createdAtMs: nowMs,
    updatedAt: serverTimestamp(),
    updatedAtMs: nowMs,
  });

  batch.set(
    doc(db, COLLECTIONS.users, userId),
    {
      userId,
      email: String(email ?? '').trim(),
      role: 'caregiver',
      linkedPatientId: patientRef.id,
      createdPatientId: patientRef.id,
      linkedAt: serverTimestamp(),
      linkedAtMs: nowMs,
      updatedAt: serverTimestamp(),
      updatedAtMs: nowMs,
    },
    { merge: true }
  );

  await batch.commit();

  return {
    patientId: patientRef.id,
    joinCode,
  };
}

export async function linkAccountWithJoinCode({ userId, email, role, joinCode }) {
  const patient = await getPatientByJoinCode(joinCode);
  const nowMs = Date.now();

  await setDoc(
    doc(db, COLLECTIONS.users, userId),
    {
      userId,
      email: String(email ?? '').trim(),
      role,
      linkedPatientId: patient.id,
      linkedAt: serverTimestamp(),
      linkedAtMs: nowMs,
      updatedAt: serverTimestamp(),
      updatedAtMs: nowMs,
    },
    { merge: true }
  );

  return {
    patientId: patient.id,
    patient,
  };
}

export async function getPatientByJoinCode(joinCode) {
  const normalizedJoinCode = normalizeJoinCode(joinCode);

  if (!normalizedJoinCode) {
    throw createDataError('custom/invalid-join-code', 'Enter a valid patient join code.');
  }

  const patientSnapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.patients),
      where('joinCode', '==', normalizedJoinCode),
      limit(1)
    )
  );

  if (patientSnapshot.empty) {
    throw createDataError('custom/patient-not-found', 'That patient join code does not exist.');
  }

  const patientDoc = patientSnapshot.docs[0];
  return {
    id: patientDoc.id,
    ...patientDoc.data(),
  };
}

async function migrateLegacyCollectionOwnership(collectionName, userId, patientId) {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where('userId', '==', userId))
  );

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnapshot) => {
    batch.update(docSnapshot.ref, {
      patientId,
      createdByUserId: userId,
      updatedAtMs: Date.now(),
    });
  });

  await batch.commit();
}

async function migrateLegacyCaregiverCheckins(userId, patientId) {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.caregiverCheckins), where('userId', '==', userId))
  );

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnapshot) => {
    const legacyData = docSnapshot.data();
    const dateKey = legacyData.dateKey ?? getTodayDateKey();
    const nextRef = doc(db, COLLECTIONS.caregiverCheckins, `${patientId}_${dateKey}`);

    batch.set(
      nextRef,
      {
        ...legacyData,
        patientId,
        userId,
      },
      { merge: true }
    );
  });

  await batch.commit();
}

export async function migrateLegacyAccountIfNeeded(user) {
  const existingProfile = await getUserProfile(user.uid);

  if (existingProfile?.linkedPatientId) {
    return existingProfile;
  }

  const legacyProfileSnapshot = await getDoc(
    doc(db, COLLECTIONS.legacyPatientProfiles, user.uid)
  );

  if (!legacyProfileSnapshot.exists()) {
    return null;
  }

  const legacyProfile = legacyProfileSnapshot.data();
  const patientRef = doc(collection(db, COLLECTIONS.patients));
  const joinCode = await generateUniqueJoinCode();
  const nowMs = Date.now();
  const batch = writeBatch(db);

  batch.set(patientRef, {
    patientName: String(legacyProfile.patientName ?? 'Patient').trim(),
    patientAge: Number(legacyProfile.patientAge ?? 0),
    joinCode,
    createdByUserId: user.uid,
    migratedFromLegacy: true,
    createdAt: serverTimestamp(),
    createdAtMs: nowMs,
    updatedAt: serverTimestamp(),
    updatedAtMs: nowMs,
  });

  batch.set(
    doc(db, COLLECTIONS.users, user.uid),
    {
      userId: user.uid,
      email: String(user.email ?? '').trim(),
      role: 'caregiver',
      linkedPatientId: patientRef.id,
      migratedFromLegacy: true,
      linkedAt: serverTimestamp(),
      linkedAtMs: nowMs,
      updatedAt: serverTimestamp(),
      updatedAtMs: nowMs,
    },
    { merge: true }
  );

  batch.set(
    doc(db, COLLECTIONS.legacyPatientProfiles, user.uid),
    {
      migratedPatientId: patientRef.id,
      joinCode,
      migratedAt: serverTimestamp(),
      migratedAtMs: nowMs,
    },
    { merge: true }
  );

  await batch.commit();

  await Promise.all([
    migrateLegacyCollectionOwnership(COLLECTIONS.medications, user.uid, patientRef.id),
    migrateLegacyCollectionOwnership(COLLECTIONS.dailyTasks, user.uid, patientRef.id),
    migrateLegacyCollectionOwnership(COLLECTIONS.calendarEvents, user.uid, patientRef.id),
    migrateLegacyCaregiverCheckins(user.uid, patientRef.id),
  ]);

  return getUserProfile(user.uid);
}

export async function savePatientProfile(patientId, userId, payload) {
  return updateDoc(doc(db, COLLECTIONS.patients, patientId), {
    patientName: payload.patientName.trim(),
    patientAge: Number(payload.patientAge),
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
    updatedByUserId: userId,
  });
}

export function subscribeToCaregiverCheckIn(patientId, dateKey, onCheckIn, onError) {
  return onSnapshot(
    doc(db, COLLECTIONS.caregiverCheckins, `${patientId}_${dateKey}`),
    (snapshot) => {
      onCheckIn(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export function saveCaregiverCheckIn(patientId, userId, payload) {
  const dateKey = payload.dateKey ?? getTodayDateKey();

  return setDoc(
    doc(db, COLLECTIONS.caregiverCheckins, `${patientId}_${dateKey}`),
    {
      patientId,
      userId,
      dateKey,
      caregiverName: payload.caregiverName.trim(),
      caregiverPhoto: payload.caregiverPhoto?.trim() ?? '',
      checkedInAt: serverTimestamp(),
      checkedInAtMs: Date.now(),
    },
    { merge: true }
  );
}

export function savePatientLocation(patientId, userId, payload) {
  return setDoc(
    doc(db, COLLECTIONS.patientLocations, patientId),
    {
      patientId,
      updatedByUserId: userId,
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
      accuracy: Number.isFinite(payload.accuracy) ? Number(payload.accuracy) : null,
      altitude: Number.isFinite(payload.altitude) ? Number(payload.altitude) : null,
      altitudeAccuracy: Number.isFinite(payload.altitudeAccuracy)
        ? Number(payload.altitudeAccuracy)
        : null,
      heading: Number.isFinite(payload.heading) ? Number(payload.heading) : null,
      speed: Number.isFinite(payload.speed) ? Number(payload.speed) : null,
      source: payload.source?.trim() || 'patient-device',
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    },
    { merge: true }
  );
}

export function savePatientAlert(patientId, userId, payload) {
  if (!patientId || !userId) {
    throw createDataError(
      'custom/invalid-patient-alert',
      'A linked patient is required before sending an alert.'
    );
  }

  const location =
    payload?.location &&
    Number.isFinite(payload.location.latitude) &&
    Number.isFinite(payload.location.longitude)
      ? {
          latitude: Number(payload.location.latitude),
          longitude: Number(payload.location.longitude),
        }
      : null;
  const requestedNeeds = Array.isArray(payload?.requestedNeeds)
    ? payload.requestedNeeds
        .map((need) => String(need ?? '').trim())
        .filter(Boolean)
    : [];

  return addDoc(collection(db, COLLECTIONS.patientAlerts), {
    patientId,
    createdByUserId: userId,
    type: payload?.type?.trim() || 'help-request',
    message: payload?.message?.trim() || 'Patient needs help getting home.',
    requestedNeeds,
    safeZoneLabel: payload?.safeZoneLabel?.trim() || '',
    location,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export function savePatientSafeZone(patientId, userId, payload) {
  const center = payload?.center
    ? {
        latitude: Number(payload.center.latitude),
        longitude: Number(payload.center.longitude),
      }
    : null;

  if (
    !center ||
    !Number.isFinite(center.latitude) ||
    !Number.isFinite(center.longitude)
  ) {
    throw createDataError(
      'custom/invalid-safe-zone',
      'A safe zone needs a valid center point.'
    );
  }

  const radiusMeters = Number(payload?.radiusMeters ?? 50);

  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw createDataError(
      'custom/invalid-safe-zone-radius',
      'A safe zone radius must be greater than zero.'
    );
  }

  return setDoc(
    doc(db, COLLECTIONS.patientSafeZones, patientId),
    {
      patientId,
      updatedByUserId: userId,
      label: payload.label?.trim() || 'Primary Safe Area',
      center,
      radiusMeters,
      vertices: [],
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    },
    { merge: true }
  );
}

export function clearPatientSafeZone(patientId) {
  return deleteDoc(doc(db, COLLECTIONS.patientSafeZones, patientId));
}

export function subscribeToMedications(patientId, onItems, onError) {
  return subscribeToPatientCollection(
    COLLECTIONS.medications,
    patientId,
    onItems,
    onError,
    (leftMedication, rightMedication) =>
      (rightMedication.createdAtMs ?? 0) - (leftMedication.createdAtMs ?? 0)
  );
}

export function subscribeToMedicationCompletions(patientId, dateKey, onItems, onError) {
  const completionQuery = query(
    collection(db, COLLECTIONS.medicationCompletions),
    where('patientId', '==', patientId)
  );

  return onSnapshot(
    completionQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));

      onItems(items.filter((item) => (item.dateKey ?? '') === dateKey));
    },
    onError
  );
}

export function subscribeToCalendarEvents(patientId, onItems, onError) {
  return subscribeToPatientCollection(
    COLLECTIONS.calendarEvents,
    patientId,
    onItems,
    onError,
    (leftEvent, rightEvent) =>
      (leftEvent.dateKey ?? '').localeCompare(rightEvent.dateKey ?? '') ||
      (leftEvent.timeSortValue ?? 0) - (rightEvent.timeSortValue ?? 0) ||
      (leftEvent.createdAtMs ?? 0) - (rightEvent.createdAtMs ?? 0)
  );
}

export function subscribeToDailyTasks(patientId, onItems, onError) {
  return subscribeToPatientCollection(
    COLLECTIONS.dailyTasks,
    patientId,
    onItems,
    onError,
    (leftTask, rightTask) =>
      (leftTask.timeSortValue ?? 0) - (rightTask.timeSortValue ?? 0) ||
      (leftTask.createdAtMs ?? 0) - (rightTask.createdAtMs ?? 0)
  );
}

export function saveMedicationEntry(patientId, userId, payload) {
  return addDoc(collection(db, COLLECTIONS.medications), {
    patientId,
    createdByUserId: userId,
    medicationName: payload.medicationName.trim(),
    purpose: payload.purpose.trim(),
    provider: payload.provider.trim(),
    frequency: payload.frequency,
    scheduledTimes: sortFormattedTimes(payload.scheduledTimes),
    imageUrl: payload.imageUrl?.trim() ?? '',
    imagePath: payload.imagePath?.trim() ?? '',
    timeZone: payload.timeZone?.trim() || getCurrentTimeZone(),
    scheduledWindowMinutes: Number(payload.scheduledWindowMinutes ?? DEFAULT_COMPLETION_WINDOW_MINUTES),
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export function updateMedicationImage(patientId, medicationId, userId, payload) {
  return updateDoc(doc(db, COLLECTIONS.medications, medicationId), {
    patientId,
    updatedByUserId: userId,
    imageUrl: payload.imageUrl?.trim() ?? '',
    imagePath: payload.imagePath?.trim() ?? '',
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
  });
}

export function savePatientMemory(patientId, userId, payload) {
  return addDoc(collection(db, COLLECTIONS.patientMemories), {
    patientId,
    createdByUserId: userId,
    title: payload.title.trim(),
    relationship: payload.relationship?.trim() ?? '',
    description: payload.description?.trim() ?? '',
    narration: payload.narration?.trim() ?? '',
    imageUrl: payload.imageUrl?.trim() ?? '',
    imagePath: payload.imagePath?.trim() ?? '',
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export function updatePatientMemory(memoryId, userId, payload) {
  return updateDoc(doc(db, COLLECTIONS.patientMemories, memoryId), {
    title: payload.title?.trim() ?? '',
    relationship: payload.relationship?.trim() ?? '',
    description: payload.description?.trim() ?? '',
    narration: payload.narration?.trim() ?? '',
    imageUrl: payload.imageUrl?.trim() ?? '',
    imagePath: payload.imagePath?.trim() ?? '',
    updatedByUserId: userId,
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
  });
}

export function deletePatientMemory(memoryId) {
  return deleteDoc(doc(db, COLLECTIONS.patientMemories, memoryId));
}

export function saveCalendarEvent(patientId, userId, payload) {
  return addDoc(collection(db, COLLECTIONS.calendarEvents), {
    patientId,
    createdByUserId: userId,
    day: payload.day,
    dateKey: payload.dateKey,
    title: payload.title.trim(),
    time: payload.time,
    range: payload.range,
    timeSortValue: getTimeSortValue(payload.formattedTime),
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export function saveDailyTask(patientId, userId, payload) {
  const timeZone = payload.timeZone?.trim() || getCurrentTimeZone();

  return addDoc(collection(db, COLLECTIONS.dailyTasks), {
    patientId,
    createdByUserId: userId,
    title: payload.title.trim(),
    time: payload.time,
    dateKey: payload.dateKey ?? getTodayDateKey(),
    caregiverName: payload.caregiverName?.trim() ?? '',
    timeSortValue: getTimeSortValue(payload.time),
    timeZone,
    scheduledWindowMinutes: Number(payload.scheduledWindowMinutes ?? DEFAULT_COMPLETION_WINDOW_MINUTES),
    status: 'scheduled',
    completedAtMs: null,
    completedByUserId: '',
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export function saveDailyTaskCompletion(patientId, userId, taskId) {
  return updateDoc(doc(db, COLLECTIONS.dailyTasks, taskId), {
    patientId,
    status: 'completed',
    completedByUserId: userId,
    completedAt: serverTimestamp(),
    completedAtMs: Date.now(),
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
  });
}

export function saveMedicationCompletion(patientId, userId, payload) {
  const dateKey = payload.dateKey ?? getTodayDateKey();
  const scheduledTime = String(payload.scheduledTime ?? '').trim();
  const medicationId = String(payload.medicationId ?? '').trim();
  const completionId = buildMedicationCompletionId(
    patientId,
    medicationId,
    dateKey,
    scheduledTime
  );

  return setDoc(
    doc(db, COLLECTIONS.medicationCompletions, completionId),
    {
      patientId,
      medicationId,
      dateKey,
      scheduledTime,
      medicationName: payload.medicationName?.trim() ?? '',
      status: 'completed',
      confirmedByUserId: userId,
      confirmedAt: serverTimestamp(),
      confirmedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    },
    { merge: true }
  );
}
