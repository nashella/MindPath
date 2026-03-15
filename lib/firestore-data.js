import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { db } from './firebase';

const COLLECTIONS = {
  medications: 'medications',
  calendarEvents: 'calendarEvents',
  dailyTasks: 'dailyTasks',
};

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

function subscribeToUserCollection(collectionName, userId, onItems, onError, sortItems) {
  const collectionQuery = query(
    collection(db, collectionName),
    where('userId', '==', userId)
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

export function subscribeToMedications(userId, onItems, onError) {
  return subscribeToUserCollection(
    COLLECTIONS.medications,
    userId,
    onItems,
    onError,
    (leftMedication, rightMedication) =>
      (rightMedication.createdAtMs ?? 0) - (leftMedication.createdAtMs ?? 0)
  );
}

export function subscribeToCalendarEvents(userId, onItems, onError) {
  return subscribeToUserCollection(
    COLLECTIONS.calendarEvents,
    userId,
    onItems,
    onError,
    (leftEvent, rightEvent) =>
      (leftEvent.dateKey ?? '').localeCompare(rightEvent.dateKey ?? '') ||
      (leftEvent.timeSortValue ?? 0) - (rightEvent.timeSortValue ?? 0) ||
      (leftEvent.createdAtMs ?? 0) - (rightEvent.createdAtMs ?? 0)
  );
}

export function subscribeToDailyTasks(userId, onItems, onError) {
  return subscribeToUserCollection(
    COLLECTIONS.dailyTasks,
    userId,
    onItems,
    onError,
    (leftTask, rightTask) =>
      (leftTask.timeSortValue ?? 0) - (rightTask.timeSortValue ?? 0) ||
      (leftTask.createdAtMs ?? 0) - (rightTask.createdAtMs ?? 0)
  );
}

export function saveMedicationEntry(userId, payload) {
  return addDoc(collection(db, COLLECTIONS.medications), {
    userId,
    medicationName: payload.medicationName.trim(),
    purpose: payload.purpose.trim(),
    provider: payload.provider.trim(),
    frequency: payload.frequency,
    scheduledTimes: sortFormattedTimes(payload.scheduledTimes),
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export function saveCalendarEvent(userId, payload) {
  return addDoc(collection(db, COLLECTIONS.calendarEvents), {
    userId,
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

export function saveDailyTask(userId, payload) {
  return addDoc(collection(db, COLLECTIONS.dailyTasks), {
    userId,
    title: payload.title.trim(),
    time: payload.time,
    timeSortValue: getTimeSortValue(payload.time),
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}
