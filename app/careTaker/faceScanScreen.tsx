import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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

const FAMILIAR_FACES = [
  {
    id: 'deshawn',
    name: 'Deshawn',
    relation: 'Caregiver',
    lastSeen: 'Today | 1:05 PM',
  },
  {
    id: 'Ashay',
    name: 'Ashay',
    relation: 'Daughter',
    lastSeen: 'Yesterday | 6:30 PM',
  },
  {
    id: 'nurse nashella',
    name: 'Nurse nashella',
    relation: 'Provider',
    lastSeen: 'Thursday | 10:00 AM',
  },
  {
    id: 'Ashley',
    name: 'Ashley',
    relation:"Gardener",
    lastseen:"Na"
  },
  {
     id: 'unknown',
     name: 'Unknown',
    relation:"Unknown person",
    lastseen:"Na"
}
];

export default function FaceScanScreen() {
  const router = useRouter();
  const { addNotification } = usePatientContext();
  const [activeFaceId, setActiveFaceId] = useState<string | null>(FAMILIAR_FACES[0].id);
  const [scanResult, setScanResult] = useState('Ready to scan a familiar face.');

  const activeFace = FAMILIAR_FACES.find((face) => face.id === activeFaceId) ?? FAMILIAR_FACES[0];

  const handleScan = () => {
    setScanResult(`${activeFace.name} recognized as ${activeFace.relation}.`);
    addNotification({
      id: `${Date.now()}-face`,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      message: `${activeFace.name} was recognized by patient scan.`,
      type: 'success',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/patient')}>
              <MaterialCommunityIcons color={PATIENT_COLORS.blue} name="arrow-left" size={24} />
            </Pressable>
            <Text style={styles.headerTitle}>Face Scan</Text>
          </View>

          <View style={styles.scanCard}>
            <View style={styles.scanFrame}>
              <MaterialCommunityIcons
                color={PATIENT_COLORS.blue}
                name="account-search-outline"
                size={86}
              />
            </View>

            <Text style={styles.scanTitle}>Scan a familiar face</Text>
            <Text style={styles.scanSubtitle}>
              Choose a known person below, then run a simple recognition check.
            </Text>

            <Pressable accessibilityRole="button" onPress={handleScan} style={styles.scanButton}>
              <MaterialCommunityIcons color="#FFFFFF" name="camera-outline" size={22} />
              <Text style={styles.scanButtonText}>Start Face Check</Text>
            </Pressable>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Latest result</Text>
            <Text style={styles.resultText}>{scanResult}</Text>
          </View>

          <Text style={styles.sectionTitle}>Known people</Text>
          <View style={styles.faceList}>
            {FAMILIAR_FACES.map((face) => {
              const isActive = face.id === activeFaceId;

              return (
                <Pressable
                  key={face.id}
                  accessibilityRole="button"
                  onPress={() => setActiveFaceId(face.id)}
                  style={[styles.faceCard, isActive && styles.faceCardActive]}>
                  <View style={[styles.faceAvatar, isActive && styles.faceAvatarActive]}>
                    <MaterialCommunityIcons
                      color={isActive ? '#FFFFFF' : PATIENT_COLORS.blue}
                      name="account-outline"
                      size={28}
                    />
                  </View>

                  <View style={styles.faceCopy}>
                    <Text style={styles.faceName}>{face.name}</Text>
                    <Text style={styles.faceMeta}>
                      {face.relation} | {face.lastSeen}
                    </Text>
                  </View>

                  {isActive ? (
                    <MaterialCommunityIcons
                      color={PATIENT_COLORS.green}
                      name="check-circle"
                      size={22}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
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
  scanCard: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  scanFrame: {
    width: 164,
    height: 164,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#BFD8F2',
    backgroundColor: PATIENT_COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scanTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  scanSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  scanButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: PATIENT_COLORS.blue,
    paddingHorizontal: 20,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanButtonText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  resultCard: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    padding: 18,
    marginBottom: 18,
  },
  resultLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '700',
  },
  resultText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    marginBottom: 12,
  },
  faceList: {
    gap: 12,
  },
  faceCard: {
    backgroundColor: PATIENT_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PATIENT_COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  faceCardActive: {
    borderColor: '#BCD8F4',
    backgroundColor: '#F5FAFE',
  },
  faceAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: PATIENT_COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceAvatarActive: {
    backgroundColor: PATIENT_COLORS.blue,
  },
  faceCopy: {
    flex: 1,
    gap: 4,
  },
  faceName: {
    fontSize: 16,
    lineHeight: 22,
    color: PATIENT_COLORS.textPrimary,
    fontWeight: '800',
  },
  faceMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: PATIENT_COLORS.textSecondary,
    fontWeight: '500',
  },
});
