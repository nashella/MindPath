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
  const { patientName, isDeviating, homeSafe, schedule } = usePatientContext();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(-12)).current;
  const cardAnim = useRef(new Animated.Value(24)).current;
  const actionAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(headerAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim, {
        toValue: 0,
        damping: 16,
        stiffness: 130,
        useNativeDriver: true,
      }),
      Animated.spring(actionAnim, {
        toValue: 0,
        damping: 16,
        stiffness: 120,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [actionAnim, cardAnim, fadeAnim, headerAnim]);

  const upcomingItems = schedule.filter((item) => item.status !== 'completed').slice(0, 2);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.heroPanel,
              {
                transform: [{ translateY: headerAnim }],
              },
            ]}>
            <View style={styles.heroGlowTop} />
            <View style={styles.heroGlowBottom} />

            <Text style={styles.greeting}>Patient Dashboard</Text>
            <Text style={styles.heading}>You are, {patientName} 81 year old</Text>
            <Text style={styles.heroSubtext}>
              {homeSafe ? 'You are home safe and on track.' : 'Your next steps are ready below.'}
            </Text>

            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, styles.safeBadge]}>
                <View style={[styles.badgeDot, { backgroundColor: PATIENT_COLORS.green }]} />
                <Text style={styles.safeBadgeText}>
                  {homeSafe ? 'Home Safe' : 'Routine Active'}
                </Text>
              </View>

              {isDeviating ? (
                <View style={[styles.statusBadge, styles.warningBadge]}>
                  <MaterialCommunityIcons
                    color={PATIENT_COLORS.amber}
                    name="alert-outline"
                    size={18}
                  />
                  <Text style={styles.warningBadgeText}>Guidance Available</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {isDeviating ? (
            <Animated.View
              style={[
                styles.alertCard,
                {
                  transform: [{ translateY: cardAnim }],
                },
              ]}>
              <MaterialCommunityIcons
                color={PATIENT_COLORS.amber}
                name="map-marker-alert-outline"
                size={24}
              />
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>You are off your usual route</Text>
                <Text style={styles.alertSubtitle}>
                  Open guidance for simple directions back home.
                </Text>
              </View>
            </Animated.View>
          ) : null}

          <Animated.View
            style={[
              styles.currentCard,
              {
                transform: [{ translateY: cardAnim }],
              },
            ]}>
            <Text style={styles.cardLabel}>Current Activity</Text>
            <Text style={styles.currentTitle}>Afternoon Walk</Text>
            <Text style={styles.currentSubtitle}>Heading toward: Central Park</Text>

            <View style={styles.recentBox}>
              <Text style={styles.recentText}>Recent stop: Grocery store at 2:05 PM</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.actionGrid,
              {
                transform: [{ translateY: actionAnim }],
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/patient/face-scan')}
              style={styles.actionCard}>
              <View style={[styles.actionIconWrap, { backgroundColor: PATIENT_COLORS.blueSoft }]}>
                <MaterialCommunityIcons
                  color={PATIENT_COLORS.blue}
                  name="account-search-outline"
                  size={30}
                />
              </View>
              <Text style={styles.actionText}>Scan Familiar Face</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/patient/guidance')}
              style={styles.actionCard}>
              <View style={[styles.actionIconWrap, { backgroundColor: PATIENT_COLORS.greenSoft }]}>
                <MaterialCommunityIcons
                  color={PATIENT_COLORS.green}
                  name="navigation-variant-outline"
                  size={30}
                />
              </View>
              <Text style={styles.actionText}>View Guidance</Text>
            </Pressable>
          </Animated.View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Schedule</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/patient/schedule')}>
              <Text style={styles.sectionLink}>View all</Text>
            </Pressable>
          </View>

          <View style={styles.scheduleList}>
            {upcomingItems.map((item) => (
              <View key={item.id} style={styles.scheduleCard}>
                <Text style={styles.scheduleTime}>{item.time}</Text>
                <Text style={styles.scheduleItem}>{item.activity}</Text>
              </View>
            ))}
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  heroPanel: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 28,
    padding: 24,
    marginTop: 8,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
  },
  heroGlowTop: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -80,
    right: -40,
    backgroundColor: 'rgba(74, 144, 217, 0.12)',
  },
  heroGlowBottom: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -46,
    bottom: -90,
    backgroundColor: 'rgba(109, 191, 138, 0.12)',
  },
  greeting: {
    fontSize: 15,
    lineHeight: 20,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '600',
  },
  heading: {
    marginTop: 4,
    fontSize: 30,
    lineHeight: 36,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  heroSubtext: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
    maxWidth: 300,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  statusBadge: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safeBadge: {
    backgroundColor: PATIENT_COLORS.greenSoft,
  },
  warningBadge: {
    backgroundColor: PATIENT_COLORS.amberSoft,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  safeBadgeText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#2F6B45',
    fontWeight: '700',
  },
  warningBadgeText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#9A6A1F',
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F2D4A2',
    padding: 18,
    marginBottom: 18,
    flexDirection: 'row',
    gap: 12,
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    fontSize: 17,
    lineHeight: 22,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
  },
  alertSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
  },
  currentCard: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    padding: 20,
    marginBottom: 18,
  },
  cardLabel: {
    fontSize: 14,
    lineHeight: 18,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '700',
  },
  currentTitle: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 34,
    color: PATIENT_COLORS.blue,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  currentSubtitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
  },
  recentBox: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: PATIENT_COLORS.surfaceMuted,
    padding: 14,
  },
  recentText: {
    fontSize: 14,
    lineHeight: 20,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    minHeight: 170,
    borderRadius: 24,
    backgroundColor: PATIENT_COLORS.surface,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  actionIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 17,
    lineHeight: 22,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  sectionLink: {
    fontSize: 14,
    lineHeight: 18,
    color: PATIENT_COLORS.blue,
    fontWeight: '700',
  },
  scheduleList: {
    gap: 12,
  },
  scheduleCard: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  scheduleTime: {
    width: 82,
    fontSize: 15,
    lineHeight: 20,
    color: PATIENT_COLORS.blue,
    fontWeight: '800',
  },
  scheduleItem: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '600',
  },
});
