import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

export default function GuidanceScreen() {
  const router = useRouter();
  const { addNotification, setDeviating, setHomeSafe } = usePatientContext();

  const [alertSent, setAlertSent] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [arrivedHome, setArrivedHome] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim, {
        toValue: 0,
        damping: 16,
        stiffness: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardAnim, fadeAnim]);

  const handleAlertCaregiver = () => {
    addNotification({
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      message: 'Patient requested assistance.',
      type: 'warning',
    });
    setAlertSent(true);
  };

  const handleShowDirections = () => {
    setShowDirections(true);
    setDeviating(false);
  };

  const handleArrivedHome = () => {
    setArrivedHome(true);
    setHomeSafe(true);
    addNotification({
      id: `${Date.now()}-safe`,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      message: 'Patient returned home safely.',
      type: 'success',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/')}>
              <MaterialCommunityIcons color={PATIENT_COLORS.blue} name="arrow-left" size={24} />
            </Pressable>
            <Text style={styles.headerTitle}>Guidance</Text>
          </View>

          <Animated.View style={[styles.alertCard, { transform: [{ translateY: cardAnim }] }]}>
            <View style={styles.alertIconWrap}>
              <MaterialCommunityIcons
                color={PATIENT_COLORS.amber}
                name="map-marker-alert-outline"
                size={26}
              />
            </View>

            <View style={styles.alertCopy}>
              <Text style={styles.alertTitle}>Route deviation detected</Text>
              <Text style={styles.alertText}>
                You usually head home after the grocery store. Use the simple steps below
                or notify your caregiver for help.
              </Text>
            </View>
          </Animated.View>

          <View style={styles.buttonGroup}>
            <Pressable
              accessibilityRole="button"
              disabled={showDirections}
              onPress={handleShowDirections}
              style={[styles.primaryButton, showDirections && styles.buttonDisabled]}>
              <MaterialCommunityIcons color="#FFFFFF" name="navigation-variant-outline" size={22} />
              <Text style={styles.primaryButtonText}>
                {showDirections ? 'Directions Shown' : 'Show Directions Home'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={alertSent}
              onPress={handleAlertCaregiver}
              style={[styles.secondaryButton, alertSent && styles.secondaryButtonDisabled]}>
              <MaterialCommunityIcons color={PATIENT_COLORS.blue} name="phone-outline" size={22} />
              <Text style={styles.secondaryButtonText}>
                {alertSent ? 'Caregiver Notified' : 'Alert Caregiver'}
              </Text>
            </Pressable>
          </View>

          {showDirections ? (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons color={PATIENT_COLORS.blue} name="home-outline" size={22} />
                <Text style={styles.sectionTitle}>Directions to Home</Text>
              </View>

              <View style={styles.mapCard}>
                <View style={styles.mapBadgeRow}>
                  <View style={styles.mapBadge}>
                    <MaterialCommunityIcons color={PATIENT_COLORS.blue} name="walk" size={14} />
                    <Text style={styles.mapBadgeText}>0.8 mi | 15 min walk</Text>
                  </View>

                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>Live</Text>
                  </View>
                </View>

                <View style={styles.routeLine} />
                <View style={styles.routePointTop} />
                <View style={styles.routePointBottom} />
              </View>

              <View style={styles.stepsList}>
                {[
                  'Turn right on Oak Street',
                  'Walk straight for 0.5 miles',
                  'Turn left on Maple Avenue',
                  "You're home",
                ].map((step, index) => (
                  <View key={step} style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepMarker,
                        index === 3 && styles.stepMarkerHome,
                      ]}>
                      {index === 3 ? (
                        <MaterialCommunityIcons color="#FFFFFF" name="home" size={12} />
                      ) : (
                        <Text style={styles.stepMarkerText}>{index + 1}</Text>
                      )}
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>

              {!arrivedHome ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleArrivedHome}
                  style={[styles.primaryButton, styles.arrivedButton]}>
                  <MaterialCommunityIcons color="#FFFFFF" name="check-circle-outline" size={20} />
                  <Text style={styles.primaryButtonText}>I&apos;ve Arrived Home</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {arrivedHome ? (
            <View style={styles.successCard}>
              <MaterialCommunityIcons
                color={PATIENT_COLORS.green}
                name="shield-check-outline"
                size={42}
              />
              <Text style={styles.successTitle}>You are home safe</Text>
              <Text style={styles.successSubtitle}>Your caregiver has been notified.</Text>
            </View>
          ) : null}
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
  alertCard: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1D0A0',
    padding: 18,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  alertIconWrap: {
    width: 42,
    alignItems: 'center',
    paddingTop: 2,
  },
  alertCopy: {
    flex: 1,
    gap: 6,
  },
  alertTitle: {
    fontSize: 20,
    lineHeight: 24,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
  },
  alertText: {
    fontSize: 15,
    lineHeight: 22,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 18,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: PATIENT_COLORS.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: PATIENT_COLORS.surface,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  secondaryButtonDisabled: {
    opacity: 0.75,
  },
  secondaryButtonText: {
    fontSize: 16,
    lineHeight: 22,
    color: PATIENT_COLORS.blue,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  card: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    padding: 18,
    gap: 16,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
  },
  mapCard: {
    height: 190,
    borderRadius: 20,
    backgroundColor: '#E8F2FB',
    overflow: 'hidden',
    padding: 14,
    justifyContent: 'space-between',
  },
  mapBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mapBadgeText: {
    fontSize: 13,
    lineHeight: 18,
    color: PATIENT_COLORS.blue,
    fontWeight: '700',
  },
  liveBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: PATIENT_COLORS.green,
  },
  liveBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  routeLine: {
    position: 'absolute',
    left: '50%',
    top: 34,
    bottom: 34,
    width: 6,
    marginLeft: -3,
    borderRadius: 999,
    backgroundColor: PATIENT_COLORS.blue,
    opacity: 0.25,
  },
  routePointTop: {
    position: 'absolute',
    top: 54,
    left: '50%',
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    backgroundColor: PATIENT_COLORS.blue,
  },
  routePointBottom: {
    position: 'absolute',
    bottom: 44,
    left: '50%',
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -14,
    backgroundColor: PATIENT_COLORS.green,
  },
  stepsList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PATIENT_COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMarkerHome: {
    backgroundColor: PATIENT_COLORS.green,
  },
  stepMarkerText: {
    fontSize: 12,
    lineHeight: 14,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '600',
  },
  arrivedButton: {
    marginTop: 4,
  },
  successCard: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CBE6D4',
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  successTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
