import * as Location from 'expo-location';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import {
  buildMedicationCompletionId,
  getTimeSortValue,
  getTodayDateKey,
  saveDailyTaskCompletion,
  saveMedicationCompletion,
  sortFormattedTimes,
  subscribeToCalendarEvents,
  subscribeToCaregiverCheckIn,
  subscribeToDailyTasks,
  subscribeToMedicationCompletions,
  subscribeToMedications,
  subscribeToPatient,
} from '@/lib/firestore-data';
import {
  startPatientBackgroundLocationTrackingAsync,
  stopPatientBackgroundLocationTrackingAsync,
  syncPatientLocationAsync,
} from '@/lib/patient-location-tracking';
import { useLinkedAccount } from '@/lib/use-linked-account';

export type ScheduleStatus = 'completed' | 'current' | 'upcoming';
export type NotificationType = 'info' | 'success' | 'warning';
export type ScheduleSource = 'daily-task' | 'medication';
export type PlannerSource = 'daily-task' | 'calendar-event' | 'medication';

export type ScheduleItem = {
  id: string;
  time: string;
  activity: string;
  note?: string;
  status: ScheduleStatus;
  urgent?: boolean;
  source: ScheduleSource;
  image?: ImageSourcePropType | string;
  sourceRecordId?: string;
  scheduledDateKey?: string;
  medicationName?: string;
};

export type PlannerItem = {
  id: string;
  time: string;
  title: string;
  note?: string;
  source: PlannerSource;
  status: 'completed' | 'scheduled';
  range?: string;
  sourceRecordId?: string;
  scheduledDateKey?: string;
};

export type PatientNotification = {
  id: string;
  time: string;
  message: string;
  type: NotificationType;
};

type PatientRecord = {
  patientName?: string;
  patientAge?: number;
  joinCode?: string;
};

type CaregiverCheckIn = {
  caregiverName?: string;
  caregiverPhoto?: string;
};

type DailyTaskRecord = {
  id: string;
  title?: string;
  time?: string;
  dateKey?: string;
  caregiverName?: string;
  timeSortValue?: number;
  status?: string;
};

type MedicationRecord = {
  id: string;
  medicationName?: string;
  purpose?: string;
  frequency?: string;
  scheduledTimes?: string[];
  createdAtMs?: number;
  imageUrl?: string;
};

type MedicationCompletionRecord = {
  id: string;
  medicationId?: string;
  dateKey?: string;
  scheduledTime?: string;
  status?: string;
};

type CalendarEventRecord = {
  id: string;
  title?: string;
  time?: string;
  range?: string;
  dateKey?: string;
  day?: number;
  timeSortValue?: number;
};

type PatientContextValue = {
  patientName: string;
  patientAge: number;
  caregiverName: string;
  caregiverPhoto?: string;
  hasLinkedPatient: boolean;
  hasActiveCaregiver: boolean;
  isDeviating: boolean;
  homeSafe: boolean;
  notifications: PatientNotification[];
  isLocationSharing: boolean;
  locationStatusText: string;
  schedule: ScheduleItem[];
  calendarEvents: CalendarEventRecord[];
  todayPlanItems: PlannerItem[];
  addNotification: (notification: PatientNotification) => void;
  setDeviating: (value: boolean) => void;
  setHomeSafe: (value: boolean) => void;
  updateScheduleItem: (id: string, updates: Partial<ScheduleItem>) => Promise<void>;
};

const WALKING_IMAGE = require('../../assets/images/walking.jpg');
const PatientContext = createContext<PatientContextValue | undefined>(undefined);

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getTaskImage(activity: string) {
  if (/walk/i.test(activity)) {
    return WALKING_IMAGE;
  }

  return undefined;
}

function getSystemNotificationType(hasLinkedPatient: boolean, hasActiveCaregiver: boolean): NotificationType {
  if (!hasLinkedPatient || !hasActiveCaregiver) {
    return 'warning';
  }

  return 'info';
}

function medicationOccursToday(medication: MedicationRecord, today: Date) {
  const frequency = medication.frequency ?? '';
  const anchorDate = medication.createdAtMs ? new Date(medication.createdAtMs) : today;

  if (frequency === 'Every other day') {
    const difference =
      Math.floor((getStartOfDay(today) - getStartOfDay(anchorDate)) / 86400000);

    return difference >= 0 && difference % 2 === 0;
  }

  if (frequency === 'Weekly') {
    return today.getDay() === anchorDate.getDay();
  }

  if (frequency === 'As needed') {
    return false;
  }

  return true;
}

function getMedicationOccurrenceLimit(frequency?: string) {
  if (frequency === 'Once daily') {
    return 1;
  }

  if (frequency === 'Twice daily') {
    return 2;
  }

  if (frequency === 'Three times daily') {
    return 3;
  }

  return Number.POSITIVE_INFINITY;
}

function buildMedicationSchedule(
  medications: MedicationRecord[],
  today: Date,
  patientId: string | null,
  todayKey: string,
  completedMedicationIds: Set<string>
): (ScheduleItem & { timeSortValue: number })[] {
  return medications.flatMap((medication) => {
    if (!medicationOccursToday(medication, today)) {
      return [];
    }

    const medicationName = medication.medicationName?.trim();

    if (!medicationName) {
      return [];
    }

    const scheduledTimes = sortFormattedTimes(medication.scheduledTimes ?? []);
    const occurrenceLimit = getMedicationOccurrenceLimit(medication.frequency);
    const dueTimes = scheduledTimes.slice(0, occurrenceLimit);

    return dueTimes.map((timeValue) => ({
      id: `medication-${medication.id}-${timeValue}`,
      time: timeValue,
      activity: `Take ${medicationName}`,
      note: medication.purpose?.trim() ? medication.purpose.trim() : 'Medication reminder',
      urgent: true,
      source: 'medication' as const,
      image: medication.imageUrl?.trim() || undefined,
      status:
        patientId &&
        completedMedicationIds.has(
          buildMedicationCompletionId(patientId, medication.id, todayKey, timeValue)
        )
          ? ('completed' as const)
          : ('upcoming' as const),
      timeSortValue: getTimeSortValue(timeValue),
      sourceRecordId: medication.id,
      scheduledDateKey: todayKey,
      medicationName,
    }));
  });
}

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const todayKey = getTodayDateKey();
  const { patientId, profileError, role, userId, isAuthReady } = useLinkedAccount();

  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);
  const [caregiverCheckIn, setCaregiverCheckIn] = useState<CaregiverCheckIn | null>(null);
  const [dailyTasks, setDailyTasks] = useState<DailyTaskRecord[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRecord[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [medicationCompletions, setMedicationCompletions] = useState<MedicationCompletionRecord[]>([]);
  const [manualNotifications, setManualNotifications] = useState<PatientNotification[]>([]);
  const [isDeviating, setIsDeviating] = useState(false);
  const [homeSafe, setHomeSafe] = useState(true);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [locationStatusText, setLocationStatusText] = useState('Waiting for patient location.');
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!patientId) {
      setPatientRecord(null);
      return undefined;
    }

    return subscribeToPatient(
      patientId,
      (patient: PatientRecord | null) => {
        setPatientRecord(patient ?? null);
      },
      (error: unknown) => {
        console.error('Patient record subscription failed', error);
      }
    );
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setCaregiverCheckIn(null);
      return undefined;
    }

    return subscribeToCaregiverCheckIn(
      patientId,
      todayKey,
      (checkIn: CaregiverCheckIn | null) => {
        setCaregiverCheckIn(checkIn ?? null);
      },
      (error: unknown) => {
        console.error('Caregiver check-in subscription failed', error);
      }
    );
  }, [patientId, todayKey]);

  useEffect(() => {
    if (!patientId) {
      setDailyTasks([]);
      return undefined;
    }

    return subscribeToDailyTasks(
      patientId,
      (items: DailyTaskRecord[]) => {
        setDailyTasks(items as DailyTaskRecord[]);
      },
      (error: unknown) => {
        console.error('Daily task subscription failed', error);
      }
    );
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setCalendarEvents([]);
      return undefined;
    }

    return subscribeToCalendarEvents(
      patientId,
      (items: CalendarEventRecord[]) => {
        setCalendarEvents(items as CalendarEventRecord[]);
      },
      (error: unknown) => {
        console.error('Calendar event subscription failed', error);
      }
    );
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setMedications([]);
      return undefined;
    }

    return subscribeToMedications(
      patientId,
      (items: MedicationRecord[]) => {
        setMedications(items as MedicationRecord[]);
      },
      (error: unknown) => {
        console.error('Medication subscription failed', error);
      }
    );
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setMedicationCompletions([]);
      return undefined;
    }

    return subscribeToMedicationCompletions(
      patientId,
      todayKey,
      (items: MedicationCompletionRecord[]) => {
        setMedicationCompletions(items as MedicationCompletionRecord[]);
      },
      (error: unknown) => {
        console.error('Medication completion subscription failed', error);
      }
    );
  }, [patientId, todayKey]);

  useEffect(() => {
    setCompletedTaskIds({});
  }, [patientId, todayKey]);

  useEffect(() => {
    return () => {
      void stopPatientBackgroundLocationTrackingAsync().catch((error) => {
        console.error('Stopping background location tracking during cleanup failed', error);
      });
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady) {
      return undefined;
    }

    if (patientId && userId && role === 'patient') {
      return undefined;
    }

    void stopPatientBackgroundLocationTrackingAsync().catch((error) => {
      console.error('Stopping background location tracking failed', error);
    });

    return undefined;
  }, [isAuthReady, patientId, role, userId]);

  useEffect(() => {
    if (!isAuthReady) {
      return undefined;
    }

    if (!patientId || !userId || role !== 'patient') {
      setIsLocationSharing(false);
      setLocationStatusText(
        patientId ? 'Location sharing runs from the patient device.' : 'Link a patient account first.'
      );
      return undefined;
    }

    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    const shareCoords = async (coords: Location.LocationObjectCoords) => {
      if (!isMounted || !coords) {
        return;
      }

      if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
        return;
      }

      try {
        await syncPatientLocationAsync(patientId, userId, coords, 'patient-app');

        if (isMounted) {
          setIsLocationSharing(true);
          setLocationStatusText('Location sharing is on.');
        }
      } catch (error) {
        console.error('Patient location save failed', error);
        if (isMounted) {
          setIsLocationSharing(false);
          setLocationStatusText('Could not share location right now.');
        }
      }
    };

    async function startLocationSharing() {
      try {
        setLocationStatusText('Checking location access...');

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        if (status !== 'granted') {
          setIsLocationSharing(false);
          setLocationStatusText('Allow location so your caregiver can find you.');
          return;
        }

        const lastKnownPosition = await Location.getLastKnownPositionAsync();

        if (lastKnownPosition?.coords) {
          await shareCoords(lastKnownPosition.coords);
        }

        try {
          const currentPosition = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });

          if (currentPosition?.coords) {
            await shareCoords(currentPosition.coords);
          }
        } catch (currentPositionError) {
          console.error('Getting the current patient position failed', currentPositionError);
        }

        let backgroundStatusText = 'Location sharing is on while this app is open.';

        try {
          const backgroundPermission = await Location.requestBackgroundPermissionsAsync();

          if (backgroundPermission.status === 'granted') {
            const backgroundStarted = await startPatientBackgroundLocationTrackingAsync(
              patientId,
              userId
            );

            if (backgroundStarted) {
              backgroundStatusText = 'Location sharing stays on, even in the background.';
            }
          }
        } catch (backgroundError) {
          console.error('Patient background location setup failed', backgroundError);
        }

        if (isMounted) {
          setLocationStatusText(backgroundStatusText);
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            mayShowUserSettingsDialog: true,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (position) => {
            void shareCoords(position.coords);
          }
        );
      } catch (error) {
        console.error('Patient location watch failed', error);
        if (isMounted) {
          setIsLocationSharing(false);
          setLocationStatusText('Could not start location sharing.');
        }
      }
    }

    void startLocationSharing();

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, [isAuthReady, patientId, role, userId]);

  const schedule = useMemo(() => {
    const today = new Date();
    const completedMedicationIds = new Set(
      medicationCompletions
        .filter((completion) => completion.status === 'completed')
        .map((completion) =>
          buildMedicationCompletionId(
            patientId,
            completion.medicationId,
            completion.dateKey,
            completion.scheduledTime
          )
        )
    );
    const taskItems = dailyTasks
      .filter((task) => (task.dateKey ?? todayKey) === todayKey)
      .map((task) => ({
        id: `daily-task-${task.id}`,
        time: task.time ?? '8:00 AM',
        activity: task.title?.trim() || 'Daily task',
        note: task.caregiverName?.trim()
          ? `Added by ${task.caregiverName.trim()}`
          : 'Daily task',
        urgent: false,
        source: 'daily-task' as const,
        image: getTaskImage(task.title ?? ''),
        status: task.status === 'completed' ? ('completed' as const) : ('upcoming' as const),
        timeSortValue: task.timeSortValue ?? getTimeSortValue(task.time ?? ''),
        sourceRecordId: task.id,
        scheduledDateKey: task.dateKey ?? todayKey,
      }));

    const medicationItems = buildMedicationSchedule(
      medications,
      today,
      patientId,
      todayKey,
      completedMedicationIds
    );
    const mergedItems = [...taskItems, ...medicationItems].sort((leftItem, rightItem) => {
      return leftItem.timeSortValue - rightItem.timeSortValue;
    });

    let currentAssigned = false;

    return mergedItems.map(({ timeSortValue, ...item }) => {
      if (item.status === 'completed' || completedTaskIds[item.id]) {
        return {
          ...item,
          status: 'completed' as const,
        };
      }

      if (!currentAssigned) {
        currentAssigned = true;

        return {
          ...item,
          status: 'current' as const,
        };
      }

      return {
        ...item,
        status: 'upcoming' as const,
      };
    });
  }, [completedTaskIds, dailyTasks, medicationCompletions, medications, patientId, todayKey]);

  const todayPlanItems = useMemo<PlannerItem[]>(() => {
    const scheduledItems = schedule.map((item) => ({
      id: item.id,
      time: item.time,
      title: item.activity,
      note: item.note ?? '',
      source: item.source as PlannerSource,
      status: item.status === 'completed' ? ('completed' as const) : ('scheduled' as const),
      sourceRecordId: item.sourceRecordId,
      scheduledDateKey: item.scheduledDateKey ?? todayKey,
      range: item.time,
      timeSortValue: getTimeSortValue(item.time ?? ''),
    }));

    const calendarItems = calendarEvents
      .filter((event) => (event.dateKey ?? '') === todayKey)
      .map((event) => ({
        id: `calendar-event-${event.id}`,
        time: event.time ?? 'All day',
        title: event.title?.trim() || 'Calendar event',
        note: event.range?.trim() || 'Scheduled event',
        source: 'calendar-event' as const,
        status: 'scheduled' as const,
        sourceRecordId: event.id,
        scheduledDateKey: event.dateKey ?? todayKey,
        range: event.range ?? '',
        timeSortValue: event.timeSortValue ?? getTimeSortValue(event.time ?? ''),
      }));

    return [...scheduledItems, ...calendarItems]
      .sort((leftItem, rightItem) => leftItem.timeSortValue - rightItem.timeSortValue)
      .map(({ timeSortValue, ...item }) => item);
  }, [calendarEvents, schedule, todayKey]);

  const notifications = useMemo<PatientNotification[]>(() => {
    const hasLinkedPatient = Boolean(patientId && patientRecord?.patientName);
    const hasActiveCaregiver = Boolean(caregiverCheckIn?.caregiverName);
    const systemMessage = !hasLinkedPatient
      ? profileError || 'Sign in with a linked patient account.'
      : hasActiveCaregiver
        ? `${caregiverCheckIn?.caregiverName} is helping today.`
        : 'No caregiver has checked in for today yet.';

    return [
      {
        id: 'system-status',
        time: 'Now',
        message: systemMessage,
        type: getSystemNotificationType(hasLinkedPatient, hasActiveCaregiver),
      },
      ...manualNotifications,
    ];
  }, [caregiverCheckIn?.caregiverName, manualNotifications, patientId, patientRecord?.patientName, profileError]);

  const value = useMemo<PatientContextValue>(
    () => ({
      patientName: patientRecord?.patientName?.trim() || 'Your Patient',
      patientAge: Number(patientRecord?.patientAge ?? 0),
      caregiverName: caregiverCheckIn?.caregiverName?.trim() || 'Care team',
      caregiverPhoto: caregiverCheckIn?.caregiverPhoto?.trim() || '',
      hasLinkedPatient: Boolean(patientId && patientRecord?.patientName),
      hasActiveCaregiver: Boolean(caregiverCheckIn?.caregiverName),
      isDeviating,
      homeSafe,
      isLocationSharing,
      locationStatusText,
      notifications,
      schedule,
      calendarEvents,
      todayPlanItems,
      addNotification: (notification) => {
        setManualNotifications((currentNotifications) => [notification, ...currentNotifications]);
      },
      setDeviating: (value) => {
        setIsDeviating(value);
      },
      setHomeSafe: (value) => {
        setHomeSafe(value);
      },
      updateScheduleItem: async (id, updates) => {
        if (updates.status === 'completed') {
          setCompletedTaskIds((currentCompleted) => ({
            ...currentCompleted,
            [id]: true,
          }));

          const matchedItem = schedule.find((item) => item.id === id);

          if (!matchedItem || !patientId || !userId) {
            return;
          }

          try {
            if (matchedItem.source === 'daily-task' && matchedItem.sourceRecordId) {
              await saveDailyTaskCompletion(patientId, userId, matchedItem.sourceRecordId);
              return;
            }

            if (
              matchedItem.source === 'medication' &&
              matchedItem.sourceRecordId &&
              matchedItem.medicationName
            ) {
              await saveMedicationCompletion(patientId, userId, {
                medicationId: matchedItem.sourceRecordId,
                medicationName: matchedItem.medicationName,
                dateKey: matchedItem.scheduledDateKey ?? todayKey,
                scheduledTime: matchedItem.time,
              });
              return;
            }
          } catch (error) {
            console.error('Schedule completion save failed', error);
            setCompletedTaskIds((currentCompleted) => {
              const nextCompleted = { ...currentCompleted };
              delete nextCompleted[id];
              return nextCompleted;
            });
            setManualNotifications((currentNotifications) => [
              {
                id: `schedule-save-error-${Date.now()}`,
                time: 'Now',
                message: 'Could not save that completion yet.',
                type: 'warning',
              },
              ...currentNotifications,
            ]);
          }

          return;
        }

        if (updates.status === 'current' || updates.status === 'upcoming') {
          setCompletedTaskIds((currentCompleted) => {
            const nextCompleted = { ...currentCompleted };
            delete nextCompleted[id];
            return nextCompleted;
          });
        }
      },
    }),
    [
      caregiverCheckIn?.caregiverName,
      caregiverCheckIn?.caregiverPhoto,
      homeSafe,
      isDeviating,
      isLocationSharing,
      notifications,
      patientId,
      patientRecord?.patientAge,
      patientRecord?.patientName,
      calendarEvents,
      locationStatusText,
      schedule,
      todayPlanItems,
      todayKey,
      userId,
    ]
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatientContext() {
  const context = useContext(PatientContext);

  if (!context) {
    throw new Error('usePatientContext must be used inside PatientProvider.');
  }

  return context;
}
