import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { formatFirebaseError } from '@/lib/firebase-errors';
import { subscribeToPatient, subscribeToPatientLocation } from '@/lib/firestore-data';
import { useLinkedAccount } from '@/lib/use-linked-account';

type PatientRecord = {
  patientName?: string;
} | null;

type PatientLocationRecord = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  updatedAtMs?: number;
  source?: string;
} | null;

const COLORS = {
  pageBackground: '#F4F6FB',
  headerBackground: '#B8E2AA',
  headerGlow: 'rgba(255, 255, 255, 0.24)',
  textPrimary: '#1F2A44',
  textSecondary: '#7D8798',
  cardBackground: '#FFFFFF',
  border: '#E8EDF5',
  blue: '#62A8C8',
  green: '#32A565',
  greenSoft: 'rgba(50, 165, 101, 0.15)',
  blueSoft: 'rgba(98, 168, 200, 0.17)',
  pinkSoft: 'rgba(216, 135, 166, 0.14)',
  pink: '#D887A6',
  danger: '#E05C5C',
};

function formatLocationAge(updatedAtMs?: number) {
  if (!updatedAtMs) {
    return 'Waiting for first signal';
  }

  const elapsedMs = Date.now() - updatedAtMs;

  if (elapsedMs < 60000) {
    return 'Updated just now';
  }

  if (elapsedMs < 3600000) {
    return `Updated ${Math.max(1, Math.round(elapsedMs / 60000))} min ago`;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(updatedAtMs);
}

function getTrackingState(location: PatientLocationRecord) {
  if (!location?.updatedAtMs) {
    return {
      label: 'Waiting',
      note: 'Open the patient app and allow location access.',
      color: COLORS.pink,
      backgroundColor: COLORS.pinkSoft,
    };
  }

  const elapsedMs = Date.now() - location.updatedAtMs;

  if (elapsedMs <= 120000) {
    return {
      label: 'Live',
      note: 'The patient app is sharing location now.',
      color: COLORS.green,
      backgroundColor: COLORS.greenSoft,
    };
  }

  return {
    label: 'Stale',
    note: 'The last signal is older than two minutes.',
    color: COLORS.blue,
    backgroundColor: COLORS.blueSoft,
  };
}

export default function SafeZonesWebScreen() {
  const { patientId, isProfileLoading, profileError } = useLinkedAccount();

  const [patientRecord, setPatientRecord] = useState<PatientRecord>(null);
  const [locationRecord, setLocationRecord] = useState<PatientLocationRecord>(null);
  const [isPatientLoading, setIsPatientLoading] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!patientId) {
      setPatientRecord(null);
      setIsPatientLoading(false);
      return undefined;
    }

    setIsPatientLoading(true);

    return subscribeToPatient(
      patientId,
      (patient) => {
        setPatientRecord(patient);
        setIsPatientLoading(false);
      },
      (error) => {
        console.error('Patient load failed for safe zones', error);
        setStatusMessage(formatFirebaseError(error, 'Could not load the linked patient.'));
        setIsPatientLoading(false);
      }
    );
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setLocationRecord(null);
      setIsLocationLoading(false);
      return undefined;
    }

    setIsLocationLoading(true);

    return subscribeToPatientLocation(
      patientId,
      (location) => {
        setLocationRecord(location);
        setIsLocationLoading(false);
      },
      (error) => {
        console.error('Patient location load failed', error);
        setStatusMessage(formatFirebaseError(error, 'Could not load the patient location.'));
        setIsLocationLoading(false);
      }
    );
  }, [patientId]);

  const trackingState = useMemo(() => getTrackingState(locationRecord), [locationRecord]);
  const visibleStatusMessage = statusMessage || profileError;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.heroPanel}>
        <View style={styles.heroGlowTop} />
        <View style={styles.heroGlowBottom} />

        <View style={styles.heroRow}>
          <View style={styles.heroIconCircle}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={30} color={COLORS.green} />
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Caregiver Safe Zones</Text>
            <Text style={styles.heroTitle}>
              {patientRecord?.patientName ? `${patientRecord.patientName}'s location` : 'Patient location'}
            </Text>
            <Text style={styles.heroSubtitle}>
              Web uses a fallback summary. Open Android or iOS for the live map canvas.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {visibleStatusMessage ? <Text style={styles.statusError}>{visibleStatusMessage}</Text> : null}

        <View style={styles.cardGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: trackingState.backgroundColor }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={24} color={trackingState.color} />
            </View>
            <Text style={styles.statLabel}>Tracking</Text>
            <Text style={styles.statValue}>{trackingState.label}</Text>
            <Text style={styles.statNote}>{trackingState.note}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.blueSoft }]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.blue} />
            </View>
            <Text style={styles.statLabel}>Last Update</Text>
            <Text style={styles.statValue}>{formatLocationAge(locationRecord?.updatedAtMs)}</Text>
            <Text style={styles.statNote}>Live updates appear here automatically.</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.greenSoft }]}>
              <MaterialCommunityIcons name="target" size={24} color={COLORS.green} />
            </View>
            <Text style={styles.statLabel}>Accuracy</Text>
            <Text style={styles.statValue}>
              {locationRecord?.accuracy ? `${Math.round(locationRecord.accuracy)} m` : 'Pending'}
            </Text>
            <Text style={styles.statNote}>Use a phone build to see the pin on the map.</Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          <Text style={styles.mapTitle}>Web Preview</Text>
          {isProfileLoading || isPatientLoading || isLocationLoading ? (
            <View style={styles.mapFallback}>
              <ActivityIndicator color={COLORS.blue} />
              <Text style={styles.mapFallbackText}>Loading the location summary...</Text>
            </View>
          ) : locationRecord?.latitude && locationRecord?.longitude ? (
            <View style={styles.mapFallback}>
              <MaterialCommunityIcons name="map-outline" size={34} color={COLORS.blue} />
              <Text style={styles.mapFallbackTitle}>Coordinates received</Text>
              <Text style={styles.mapFallbackText}>
                Latitude {Number(locationRecord.latitude).toFixed(5)} | Longitude {Number(locationRecord.longitude).toFixed(5)}
              </Text>
            </View>
          ) : (
            <View style={styles.mapFallback}>
              <MaterialCommunityIcons name="map-marker-off-outline" size={34} color={COLORS.pink} />
              <Text style={styles.mapFallbackTitle}>No live pin yet</Text>
              <Text style={styles.mapFallbackText}>
                Open the patient app, allow location, and keep it active to send the latest pin here.
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.pageBackground,
  },
  heroPanel: {
    backgroundColor: COLORS.headerBackground,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlowTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.headerGlow,
    top: -130,
    right: -80,
  },
  heroGlowBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    bottom: -120,
    left: -50,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  heroIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  heroLabel: {
    fontSize: 17,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 18,
  },
  statusError: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.danger,
    fontWeight: '600',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 250,
    minHeight: 150,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statLabel: {
    fontSize: 16,
    lineHeight: 21,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 30,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    marginBottom: 8,
  },
  statNote: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  mapCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  mapTitle: {
    fontSize: 25,
    lineHeight: 31,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  mapFallback: {
    minHeight: 300,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F9FBFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  mapFallbackTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  mapFallbackText: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 420,
  },
});
