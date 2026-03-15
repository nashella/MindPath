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

export default function PatientDashboard() {
  const router = useRouter();
  const {
    patientName,
    patientAge,
    caregiverName,
    isDeviating,
    homeSafe,
    schedule,
  } = usePatientContext();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sectionAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(sectionAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, sectionAnim]);

  const nextTasks = schedule.filter((item) => item.status !== 'completed').slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.sectionCard,
              {
                transform: [{ translateY: sectionAnim }],
              },
            ]}>
            <Text style={styles.sectionEyebrow}>Who You Are</Text>
            <Text style={styles.identityTitle}>You are {patientName}.</Text>
            <Text style={styles.identityBody}>
              You are {patientAge} years old. {caregiverName} is helping you today.
            </Text>

            <View style={styles.reassurancePill}>
              <MaterialCommunityIcons
                color={PATIENT_COLORS.green}
                name="shield-check-outline"
                size={18}
              />
              <Text style={styles.reassuranceText}>
                {homeSafe ? 'You are safe at home.' : 'You are safe and following today’s plan.'}
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.sectionCard,
              {
                transform: [{ translateY: sectionAnim }],
              },
            ]}>
            <Text style={styles.sectionEyebrow}>What To Do Next</Text>
            <Text style={styles.tasksTitle}>These are your next tasks.</Text>

            <View style={styles.taskList}>
              {nextTasks.map((item) => (
                <View key={item.id} style={styles.taskRow}>
                  <View style={styles.taskTimeWrap}>
                    <Text style={styles.taskTime}>{item.time}</Text>
                  </View>

                  <View style={styles.taskCopy}>
                    <Text style={styles.taskText}>{item.activity}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/patient/schedule')}
              style={styles.inlineButton}>
              <Text style={styles.inlineButtonText}>See full schedule</Text>
            </Pressable>
          </Animated.View>

          <Animated.View
            style={[
              styles.sectionCard,
              {
                transform: [{ translateY: sectionAnim }],
              },
            ]}>
            <Text style={styles.sectionEyebrow}>Need Help?</Text>
            <Text style={styles.helpTitle}>
              {isDeviating ? 'Let us guide you home.' : 'Choose one simple action.'}
            </Text>
            <Text style={styles.helpBody}>
              {isDeviating
                ? 'Tap the guidance button for calm, step-by-step directions.'
                : 'Use guidance or familiar faces whenever you need support.'}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/patient/guidance')}
              style={styles.primaryButton}>
              <MaterialCommunityIcons
                color="#FFFFFF"
                name="navigation-variant-outline"
                size={22}
              />
              <Text style={styles.primaryButtonText}>
                {isDeviating ? 'Show Directions Home' : 'Open Guidance'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/patient/face-scan')}
              style={styles.secondaryButton}>
              <MaterialCommunityIcons
                color={PATIENT_COLORS.blue}
                name="account-search-outline"
                size={22}
              />
              <Text style={styles.secondaryButtonText}>See Familiar Faces</Text>
            </Pressable>
          </Animated.View>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  sectionCard: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginTop: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 14,
    lineHeight: 18,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  identityTitle: {
    fontSize: 32,
    lineHeight: 38,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  identityBody: {
    fontSize: 16,
    lineHeight: 22,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
  },
  reassurancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: PATIENT_COLORS.greenSoft,
  },
  reassuranceText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#2F6B45',
    fontWeight: '700',
  },
  tasksTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  taskList: {
    gap: 12,
  },
  taskRow: {
    borderRadius: 18,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskTimeWrap: {
    minWidth: 86,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: PATIENT_COLORS.blueSoft,
    alignItems: 'center',
  },
  taskTime: {
    fontSize: 14,
    lineHeight: 18,
    color: PATIENT_COLORS.blue,
    fontWeight: '800',
  },
  taskCopy: {
    flex: 1,
  },
  taskText: {
    fontSize: 17,
    lineHeight: 20,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '700',
  },
  inlineButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    backgroundColor: PATIENT_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  inlineButtonText: {
    fontSize: 16,
    lineHeight: 22,
    color: PATIENT_COLORS.blue,
    fontWeight: '800',
  },
  helpTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  helpBody: {
    fontSize: 16,
    lineHeight: 22,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
  },
  primaryButton: {
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: PATIENT_COLORS.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
  },
  primaryButtonText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    backgroundColor: PATIENT_COLORS.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 17,
    lineHeight: 22,
    color: PATIENT_COLORS.blue,
    fontWeight: '800',
  },
});
