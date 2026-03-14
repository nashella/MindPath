import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TimePickerModal from '@/components/time-picker-modal';
import { Fonts } from '@/constants/theme';

const COLORS = {
  background: '#F7F9FC',
  card: '#FFFFFF',
  panel: '#F3F6FB',
  panelActive: '#EAF6FD',
  panelBorder: '#D8EAF6',
  textPrimary: '#171B2A',
  textSecondary: '#7B8190',
  border: '#E6EBF2',
  blue: '#69C5F4',
  green: '#6CC8A2',
  paleGreen: '#D8F1E7',
  blackPill: '#111111',
  overlay: 'rgba(17, 24, 39, 0.32)',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_DAYS = [
  { day: 1, inMonth: true },
  { day: 2, inMonth: true },
  { day: 3, inMonth: true },
  { day: 4, inMonth: true },
  { day: 5, inMonth: true },
  { day: 6, inMonth: true },
  { day: 7, inMonth: true },
  { day: 8, inMonth: true, marker: 'green' },
  { day: 9, inMonth: true },
  { day: 10, inMonth: true },
  { day: 11, inMonth: true },
  { day: 12, inMonth: true },
  { day: 13, inMonth: true },
  { day: 14, inMonth: true, isToday: true },
  { day: 15, inMonth: true },
  { day: 16, inMonth: true },
  { day: 17, inMonth: true, marker: 'green' },
  { day: 18, inMonth: true },
  { day: 19, inMonth: true },
  { day: 20, inMonth: true },
  { day: 21, inMonth: true },
  { day: 22, inMonth: true },
  { day: 23, inMonth: true },
  { day: 24, inMonth: true },
  { day: 25, inMonth: true },
  { day: 26, inMonth: true },
  { day: 27, inMonth: true },
  { day: 28, inMonth: true },
  { day: 29, inMonth: true },
  { day: 30, inMonth: true },
  { day: 31, inMonth: true },
  { day: 1, inMonth: false },
  { day: 2, inMonth: false },
  { day: 3, inMonth: false, marker: 'green-light' },
  { day: 4, inMonth: false },
];

const INITIAL_EVENTS_BY_DATE = {
  2: [
    {
      id: 'jack-coming',
      time: '8:00',
      title: 'Jack coming',
      range: '8:00 AM - 9:00 AM',
      accent: COLORS.blue,
    },
  ],
  8: [
    {
      id: 'med-check',
      time: '10:00',
      title: 'Medication check',
      range: '10:00 AM - 10:30 AM',
      accent: COLORS.green,
    },
  ],
  17: [
    {
      id: 'care-team',
      time: '2:00',
      title: 'Care team call',
      range: '2:00 PM - 2:30 PM',
      accent: COLORS.green,
    },
  ],
};

function formatSelectedDate(day) {
  return `Mar ${day}`;
}

function formatAgendaHeader(day) {
  const weekdayMap = {
    1: 'SUN',
    2: 'MON',
    3: 'TUE',
    4: 'WED',
    5: 'THU',
    6: 'FRI',
    7: 'SAT',
    8: 'SUN',
    9: 'MON',
    10: 'TUE',
    11: 'WED',
    12: 'THU',
    13: 'FRI',
    14: 'SAT',
    15: 'SUN',
    16: 'MON',
    17: 'TUE',
    18: 'WED',
    19: 'THU',
    20: 'FRI',
    21: 'SAT',
    22: 'SUN',
    23: 'MON',
    24: 'TUE',
    25: 'WED',
    26: 'THU',
    27: 'FRI',
    28: 'SAT',
    29: 'SUN',
    30: 'MON',
    31: 'TUE',
  };

  return { weekday: weekdayMap[day] ?? 'DAY', day: String(day) };
}

function getEventAccent(index) {
  return index % 2 === 0 ? COLORS.blue : COLORS.green;
}

function buildEventRange(formattedTime) {
  const match = formattedTime.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);

  if (!match) {
    return {
      time: formattedTime,
      range: `${formattedTime} - ${formattedTime}`,
    };
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];

  if (period === 'PM' && hour !== 12) {
    hour += 12;
  }

  if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  const startDate = new Date(2026, 2, 1, hour, minute);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatDateToTime = (dateValue) => {
    let rawHour = dateValue.getHours();
    const rawMinute = String(dateValue.getMinutes()).padStart(2, '0');
    const nextPeriod = rawHour >= 12 ? 'PM' : 'AM';

    if (rawHour === 0) {
      rawHour = 12;
    } else if (rawHour > 12) {
      rawHour -= 12;
    }

    return `${rawHour}:${rawMinute} ${nextPeriod}`;
  };

  return {
    time: formattedTime.replace(/\s(AM|PM)$/, ''),
    range: `${formattedTime} - ${formatDateToTime(endDate)}`,
  };
}

export default function CalenderScreen() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(2);
  const [eventsByDate, setEventsByDate] = useState(INITIAL_EVENTS_BY_DATE);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [selectedTaskTime, setSelectedTaskTime] = useState('8:00 AM');

  const agendaMeta = useMemo(() => formatAgendaHeader(selectedDay), [selectedDay]);
  const events = eventsByDate[selectedDay] ?? [];
  const hasEvents = events.length > 0;

  const handleOpenTaskModal = () => {
    setTaskInput('');
    setSelectedTaskTime('8:00 AM');
    setIsModalVisible(true);
  };

  const handleCloseTaskModal = () => {
    setTaskInput('');
    setIsModalVisible(false);
    setIsTimePickerVisible(false);
  };

  const handleAddTask = () => {
    const trimmedTask = taskInput.trim();

    if (!trimmedTask) {
      return;
    }

    setEventsByDate((currentEvents) => {
      const dayEvents = currentEvents[selectedDay] ?? [];
      const nextIndex = dayEvents.length;
      const eventTime = buildEventRange(selectedTaskTime);

      const newEvent = {
        id: `${selectedDay}-${Date.now()}`,
        title: trimmedTask,
        time: eventTime.time,
        range: eventTime.range,
        accent: getEventAccent(nextIndex),
      };

      return {
        ...currentEvents,
        [selectedDay]: [...dayEvents, newEvent],
      };
    });

    setTaskInput('');
    setIsModalVisible(false);
    setIsTimePickerVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
              <MaterialCommunityIcons name="menu" size={28} color={COLORS.textPrimary} />
            </Pressable>

            <View style={styles.topBarActions}>
              <Pressable accessibilityRole="button" style={styles.iconButton}>
                <MaterialCommunityIcons name="magnify" size={28} color={COLORS.textPrimary} />
              </Pressable>

              <Pressable accessibilityRole="button" style={styles.calendarBadge}>
                <Text style={styles.calendarBadgeText}>14</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.monthTitle}>MAR</Text>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((dayLabel) => (
              <Text key={dayLabel} style={styles.weekdayText}>
                {dayLabel}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {MONTH_DAYS.map((item, index) => {
              const isSelected = item.inMonth && item.day === selectedDay;
              const hasUserEvents = item.inMonth && (eventsByDate[item.day] ?? []).length > 0;
              const markerStyle =
                hasUserEvents || item.marker === 'green'
                  ? styles.greenMarker
                  : item.marker === 'green-light'
                    ? styles.greenLightMarker
                    : null;

              return (
                <Pressable
                  key={`${item.day}-${index}`}
                  accessibilityRole="button"
                  onPress={() => {
                    if (item.inMonth) {
                      setSelectedDay(item.day);
                    }
                  }}
                  style={[styles.dateCell, isSelected && styles.selectedDateCell]}>
                  <View style={[styles.dateBubble, item.isToday && styles.todayBubble]}>
                    <Text
                      style={[
                        styles.dateText,
                        !item.inMonth && styles.outsideMonthText,
                        item.isToday && styles.todayText,
                      ]}>
                      {item.day}
                    </Text>
                  </View>

                  {markerStyle ? <View style={[styles.eventMarker, markerStyle]} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.agendaPanel,
              hasEvents && styles.agendaPanelActive,
            ]}>
            <View style={styles.agendaHeader}>
              <View style={styles.agendaHeaderCopy}>
                <Text style={styles.agendaDayNumber}>{agendaMeta.day}</Text>
                <Text style={styles.agendaDayLabel}>{agendaMeta.weekday}</Text>
              </View>

              <Pressable accessibilityRole="button" style={styles.paletteButton}>
                <MaterialCommunityIcons name="palette-outline" size={24} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.eventsList}>
              {hasEvents ? (
                events.map((event) => (
                  <View key={event.id} style={styles.eventRow}>
                    <Text style={styles.eventTime}>{event.time}</Text>
                    <View style={[styles.eventAccent, { backgroundColor: event.accent }]} />
                    <View style={styles.eventCopy}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventRange}>{event.range}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No tasks yet</Text>
                  <Text style={styles.emptyStateText}>Tap the add button to create a task for this date.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            onPress={handleOpenTaskModal}
            style={[styles.addEventPill, hasEvents && styles.addEventPillActive]}>
            <Text style={[styles.addEventText, hasEvents && styles.addEventTextActive]}>
              Add event on {formatSelectedDate(selectedDay)}
            </Text>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={handleOpenTaskModal} style={styles.fabButton}>
            <MaterialCommunityIcons name="plus" size={34} color={COLORS.textPrimary} />
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={handleCloseTaskModal}
        transparent
        visible={isModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add task for {formatSelectedDate(selectedDay)}</Text>
            <Text style={styles.modalSubtitle}>Write any task you want to place on this date.</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsTimePickerVisible(true)}
              style={styles.timeSelectButton}>
              <Text style={styles.timeSelectButtonLabel}>Time</Text>
              <View style={styles.timeSelectValueWrap}>
                <Text style={styles.timeSelectValue}>{selectedTaskTime}</Text>
                <MaterialCommunityIcons name="menu-down" size={22} color={COLORS.textPrimary} />
              </View>
            </Pressable>

            <TextInput
              autoFocus
              multiline
              onChangeText={setTaskInput}
              placeholder="Type your task here"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.modalInput}
              textAlignVertical="top"
              value={taskInput}
            />

            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={handleCloseTaskModal} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={handleAddTask} style={styles.modalAddButton}>
                <Text style={styles.modalAddText}>Add task</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <TimePickerModal
        initialValue={selectedTaskTime}
        onCancel={() => setIsTimePickerVisible(false)}
        onSet={(formattedTime) => {
          setSelectedTaskTime(formattedTime);
          setIsTimePickerVisible(false);
        }}
        title="Select Task Time"
        visible={isTimePickerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 170,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  calendarBadgeText: {
    fontSize: 18,
    lineHeight: 22,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  monthTitle: {
    fontSize: 32,
    lineHeight: 38,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    marginBottom: 22,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 28,
  },
  dateCell: {
    width: '14.28%',
    minHeight: 90,
    alignItems: 'center',
    paddingTop: 6,
  },
  selectedDateCell: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D1D5DC',
    backgroundColor: COLORS.card,
  },
  dateBubble: {
    minWidth: 34,
    minHeight: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  todayBubble: {
    backgroundColor: COLORS.blackPill,
  },
  dateText: {
    fontSize: 18,
    lineHeight: 22,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  outsideMonthText: {
    color: '#C5CAD2',
  },
  todayText: {
    color: COLORS.card,
  },
  eventMarker: {
    width: 58,
    height: 6,
    borderRadius: 999,
  },
  greenMarker: {
    backgroundColor: COLORS.green,
  },
  greenLightMarker: {
    backgroundColor: COLORS.paleGreen,
  },
  agendaPanel: {
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginHorizontal: -22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    minHeight: 360,
  },
  agendaPanelActive: {
    backgroundColor: COLORS.panelActive,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  agendaHeaderCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agendaDayNumber: {
    fontSize: 56,
    lineHeight: 62,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  agendaDayLabel: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontWeight: '800',
    paddingTop: 8,
  },
  paletteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  eventRange: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    paddingTop: 8,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  emptyStateText: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
    maxWidth: 280,
  },
  bottomBar: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  addEventPill: {
    flex: 1,
    minHeight: 62,
    borderRadius: 32,
    backgroundColor: '#EDF0F6',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  addEventPillActive: {
    backgroundColor: '#DCEFFC',
  },
  addEventText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#878E99',
    fontWeight: '500',
  },
  addEventTextActive: {
    color: '#4F84A8',
  },
  fabButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    padding: 22,
    gap: 16,
  },
  modalTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  timeSelectButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFE',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeSelectButtonLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  timeSelectValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSelectValue: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  modalInput: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFE',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  modalCancelText: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  modalAddButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blue,
  },
  modalAddText: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.card,
    fontWeight: '800',
  },
});
