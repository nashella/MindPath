import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

import { usePatientContext } from './patient-context';
import { PATIENT_COLORS } from './patient-theme';

type CalendarEventRecord = {
  id: string;
  title?: string;
  time?: string;
  range?: string;
  dateKey?: string;
  timeSortValue?: number;
};

type CalendarDay = {
  date: Date;
  inMonth: boolean;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short' })
    .format(date)
    .toUpperCase();
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildMonthGrid(anchorDate: Date) {
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
  const days: CalendarDay[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    days.push({
      date: new Date(cursor),
      inMonth: cursor.getMonth() === anchorDate.getMonth(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function formatAgendaHeader(date: Date) {
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' })
      .format(date)
      .toUpperCase(),
    day: String(date.getDate()),
  };
}

function getEventAccent(index: number) {
  return index % 2 === 0 ? PATIENT_COLORS.blue : PATIENT_COLORS.green;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { calendarEvents } = usePatientContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const anchorDate = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(anchorDate);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const monthGrid = useMemo(() => buildMonthGrid(anchorDate), [anchorDate]);
  const eventsByDate = useMemo(() => {
    return calendarEvents.reduce<Record<string, CalendarEventRecord[]>>(
      (groupedEvents, eventItem) => {
        const dateKey = String(eventItem.dateKey ?? '').trim();

        if (!dateKey) {
          return groupedEvents;
        }

        if (!groupedEvents[dateKey]) {
          groupedEvents[dateKey] = [];
        }

        groupedEvents[dateKey].push(eventItem);
        groupedEvents[dateKey].sort(
          (leftItem, rightItem) =>
            Number(leftItem.timeSortValue ?? 0) - Number(rightItem.timeSortValue ?? 0)
        );
        return groupedEvents;
      },
      {}
    );
  }, [calendarEvents]);

  const selectedDateKey = useMemo(() => getDateKey(selectedDate), [selectedDate]);
  const selectedEvents = eventsByDate[selectedDateKey] ?? [];
  const agendaMeta = useMemo(() => formatAgendaHeader(selectedDate), [selectedDate]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/patient')}>
              <MaterialCommunityIcons
                color={PATIENT_COLORS.blue}
                name="arrow-left"
                size={24}
              />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Monthly Schedule</Text>
            </View>
          </View>

          <Text style={styles.monthTitle}>{getMonthLabel(anchorDate)}</Text>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((dayLabel, index) => (
              <Text key={`${dayLabel}-${index}`} style={styles.weekdayText}>
                {dayLabel}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {monthGrid.map((item) => {
              const dateKey = getDateKey(item.date);
              const hasEvents = (eventsByDate[dateKey] ?? []).length > 0;
              const isSelected = dateKey === selectedDateKey;
              const isToday = dateKey === getDateKey(new Date());

              return (
                <Pressable
                  key={dateKey}
                  accessibilityRole="button"
                  onPress={() => {
                    if (item.inMonth) {
                      setSelectedDate(item.date);
                    }
                  }}
                  style={[styles.dateCell, isSelected && styles.selectedDateCell]}>
                  <View style={[styles.dateBubble, isToday && styles.todayBubble]}>
                    <Text
                      style={[
                        styles.dateText,
                        !item.inMonth && styles.outsideMonthText,
                        isToday && styles.todayText,
                      ]}>
                      {item.date.getDate()}
                    </Text>
                  </View>

                  {hasEvents ? <View style={styles.eventMarker} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.agendaPanel,
              selectedEvents.length > 0 && styles.agendaPanelActive,
            ]}>
            <View style={styles.agendaHeader}>
              <View style={styles.agendaHeaderCopy}>
                <Text style={styles.agendaDayNumber}>{agendaMeta.day}</Text>
                <Text style={styles.agendaDayLabel}>{agendaMeta.weekday}</Text>
              </View>

             
            
            </View>

            <View style={styles.eventsList}>
              {selectedEvents.length ? (
                selectedEvents.map((event, index) => (
                  <View key={event.id} style={styles.eventRow}>
                    <Text style={styles.eventTime}>{event.time ?? 'All day'}</Text>
                    <View
                      style={[
                        styles.eventAccent,
                        { backgroundColor: getEventAccent(index) },
                      ]}
                    />
                    <View style={styles.eventCopy}>
                      <Text style={styles.eventTitle}>
                        {event.title?.trim() || 'Calendar event'}
                      </Text>
                      <Text style={styles.eventRange}>
                        {event.range?.trim() || 'Scheduled by your caregiver'}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>Nothing set for this day</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PATIENT_COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: PATIENT_COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 34,
    lineHeight: 40,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    marginBottom: 18,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 28,
  },
  dateCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 6,
    minHeight: 58,
  },
  selectedDateCell: {
    backgroundColor: PATIENT_COLORS.blueSoft,
  },
  dateBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBubble: {
    backgroundColor: PATIENT_COLORS.textPrimary,
  },
  dateText: {
    fontSize: 16,
    lineHeight: 20,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '700',
  },
  todayText: {
    color: PATIENT_COLORS.surface,
  },
  outsideMonthText: {
    color: '#B2B3BE',
  },
  eventMarker: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: PATIENT_COLORS.green,
    marginTop: 6,
  },
  agendaPanel: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    minHeight: 320,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
  },
  agendaPanelActive: {
    backgroundColor: '#F5FAFE',
    borderColor: '#BCD8F4',
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  agendaHeaderCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agendaDayNumber: {
    fontSize: 56,
    lineHeight: 62,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  agendaDayLabel: {
    fontSize: 22,
    lineHeight: 28,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    paddingTop: 8,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: PATIENT_COLORS.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readOnlyText: {
    fontSize: 12,
    lineHeight: 16,
    color: PATIENT_COLORS.green,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  eventsList: {
    gap: 22,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  eventTime: {
    width: 78,
    fontSize: 18,
    lineHeight: 24,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '600',
    paddingTop: 2,
  },
  eventAccent: {
    width: 6,
    height: 40,
    borderRadius: 999,
    marginTop: 2,
  },
  eventCopy: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '700',
  },
  eventRange: {
    fontSize: 14,
    lineHeight: 20,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    paddingTop: 8,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '700',
  },
  emptyStateText: {
    fontSize: 15,
    lineHeight: 20,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
    maxWidth: 280,
  },
});
