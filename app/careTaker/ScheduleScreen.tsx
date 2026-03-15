import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
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

export default function ScheduleScreen() {
  const router = useRouter();
  const { schedule, updateScheduleItem } = usePatientContext();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const getStatusIcon = (status: 'completed' | 'current' | 'upcoming') => {
    if (status === 'completed') {
      return 'check-circle';
    }

    if (status === 'current') {
      return 'clock-outline';
    }

    return 'circle-outline';
  };

  const getStatusColor = (status: 'completed' | 'current' | 'upcoming') => {
    if (status === 'completed') {
      return PATIENT_COLORS.green;
    }

    if (status === 'current') {
      return PATIENT_COLORS.blue;
    }

    return PATIENT_COLORS.textSecondary;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/')}>
              <MaterialCommunityIcons
                color={PATIENT_COLORS.blue}
                name="arrow-left"
                size={24}
              />
            </Pressable>
            <Text style={styles.headerTitle}>Today&apos;s Schedule</Text>
          </View>

          <View style={styles.legend}>
            {[
              { label: 'Done', status: 'completed' as const },
              { label: 'Now', status: 'current' as const },
              { label: 'Later', status: 'upcoming' as const },
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <MaterialCommunityIcons
                  color={getStatusColor(item.status)}
                  name={getStatusIcon(item.status)}
                  size={16}
                />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          {schedule.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                item.status === 'current' && styles.currentCard,
              ]}>
              <Pressable
                accessibilityRole="button"
                disabled={item.status === 'completed'}
                onPress={() => updateScheduleItem(item.id, { status: 'completed' })}
                style={styles.statusButton}>
                <MaterialCommunityIcons
                  color={getStatusColor(item.status)}
                  name={getStatusIcon(item.status)}
                  size={22}
                />
              </Pressable>

              <View style={styles.itemContent}>
                <Text
                  style={[
                    styles.activityText,
                    item.status === 'completed' && styles.completedActivityText,
                  ]}>
                  {item.activity}
                </Text>
                <Text style={styles.timeText}>{item.time}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.sourceText}>
                    {item.source === 'medication' ? 'Medication' : 'Daily task'}
                  </Text>
                  {item.urgent ? (
                    <View style={styles.urgentBadge}>
                      <MaterialCommunityIcons
                        color="#A04B1A"
                        name="alert-circle-outline"
                        size={14}
                      />
                      <Text style={styles.urgentText}>Urgent</Text>
                    </View>
                  ) : null}
                </View>
                {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
              </View>

              {item.status !== 'completed' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => updateScheduleItem(item.id, { status: 'completed' })}
                  style={styles.completeButton}>
                  <MaterialCommunityIcons
                    color={PATIENT_COLORS.blue}
                    name="check"
                    size={16}
                  />
                </Pressable>
              ) : null}
            </View>
          ))}
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
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
  },
  legendText: {
    fontSize: 13,
    lineHeight: 18,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  currentCard: {
    borderColor: '#BCD8F4',
    backgroundColor: '#F5FAFE',
  },
  statusButton: {
    width: 34,
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  activityText: {
    fontSize: 16,
    lineHeight: 22,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '700',
  },
  completedActivityText: {
    color: PATIENT_COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  timeText: {
    fontSize: 14,
    lineHeight: 18,
    color: PATIENT_COLORS.blue,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  sourceText: {
    fontSize: 13,
    lineHeight: 18,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '700',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFF1E7',
  },
  urgentText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#A04B1A',
    fontWeight: '800',
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    color: PATIENT_COLORS.textSecondary,
  },
  completeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PATIENT_COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
