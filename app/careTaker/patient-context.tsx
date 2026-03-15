import React, { createContext, useContext, useMemo, useState } from 'react';

export type ScheduleStatus = 'completed' | 'current' | 'upcoming';
export type NotificationType = 'info' | 'success' | 'warning';

export type ScheduleItem = {
  id: string;
  time: string;
  activity: string;
  status: ScheduleStatus;
};

export type PatientNotification = {
  id: string;
  time: string;
  message: string;
  type: NotificationType;
};

type PatientContextValue = {
  patientName: string;
  patientAge: number;
  caregiverName: string;
  isDeviating: boolean;
  homeSafe: boolean;
  notifications: PatientNotification[];
  schedule: ScheduleItem[];
  addNotification: (notification: PatientNotification) => void;
  setDeviating: (value: boolean) => void;
  setHomeSafe: (value: boolean) => void;
  updateScheduleItem: (id: string, updates: Partial<ScheduleItem>) => void;
};

const PatientContext = createContext<PatientContextValue | undefined>(undefined);

const INITIAL_SCHEDULE: ScheduleItem[] = [
  {
    id: 'breakfast-walk',
    time: '9:00 AM',
    activity: 'Morning walk with caregiver',
    status: 'completed',
  },
  {
    id: 'afternoon-walk',
    time: '2:15 PM',
    activity: 'Afternoon walk to the park',
    status: 'current',
  },
  {
    id: 'medication',
    time: '4:00 PM',
    activity: 'Take evening medication',
    status: 'upcoming',
  },
  {
    id: 'dinner',
    time: '6:30 PM',
    activity: 'Dinner with Deshawn',
    status: 'upcoming',
  },
];

const INITIAL_NOTIFICATIONS: PatientNotification[] = [
  {
    id: 'welcome',
    time: '2:00 PM',
    message: 'MindPath patient flow is ready.',
    type: 'info',
  },
];

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patientName] = useState('Evelyn');
  const [patientAge] = useState(81);
  const [caregiverName] = useState('Deshawn');
  const [isDeviating, setIsDeviating] = useState(true);
  const [homeSafe, setHomeSafe] = useState(false);
  const [notifications, setNotifications] =
    useState<PatientNotification[]>(INITIAL_NOTIFICATIONS);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(INITIAL_SCHEDULE);

  const value = useMemo<PatientContextValue>(
    () => ({
      patientName,
      patientAge,
      caregiverName,
      isDeviating,
      homeSafe,
      notifications,
      schedule,
      addNotification: (notification) => {
        setNotifications((currentNotifications) => [notification, ...currentNotifications]);
      },
      setDeviating: (value) => {
        setIsDeviating(value);
      },
      setHomeSafe: (value) => {
        setHomeSafe(value);
      },
      updateScheduleItem: (id, updates) => {
        setSchedule((currentSchedule) =>
          currentSchedule.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          )
        );
      },
    }),
    [caregiverName, homeSafe, isDeviating, notifications, patientAge, patientName, schedule]
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
