import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { onAuthStateChanged } from 'firebase/auth';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
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
import {
  saveMedicationEntry,
  sortFormattedTimes,
  subscribeToMedications,
} from '@/lib/firestore-data';
import { formatFirebaseError } from '@/lib/firebase-errors';
import { auth } from '@/lib/firebase';

const COLORS = {
  pageBackground: '#F0F4FA',
  headerBackground: '#B8E2AA',
  headerGlow: 'rgba(255, 255, 255, 0.28)',
  textPrimary: '#1F2A44',
  textSecondary: '#7D8798',
  cardBackground: '#FFFFFF',
  border: '#E4EAF4',
  green: '#2FA560',
  blue: '#5899C8',
  danger: '#E05C5C',
};

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Every other day',
  'Weekly',
  'As needed',
];

function FormField({ label, hint, children }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export default function MedicationScreen() {
  const router = useRouter();
  const [medicationName, setMedicationName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [provider, setProvider] = useState('');
  const [frequency, setFrequency] = useState('');
  const [scheduledTimes, setScheduledTimes] = useState([]);
  const [userId, setUserId] = useState(auth.currentUser?.uid ?? null);
  const [savedMedications, setSavedMedications] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('success');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMedications, setIsLoadingMedications] = useState(true);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) {
      setSavedMedications([]);
      setIsLoadingMedications(false);
      return undefined;
    }

    setIsLoadingMedications(true);

    return subscribeToMedications(
      userId,
      (items) => {
        setSavedMedications(items);
        setIsLoadingMedications(false);
      },
      (error) => {
        console.error('Medication Firestore load failed', error);
        setStatusTone('error');
        setStatusMessage(
          formatFirebaseError(error, 'Could not load medications from Firestore.')
        );
        setIsLoadingMedications(false);
      }
    );
  }, [userId]);

  const handleSetTime = (formattedTime) => {
    setScheduledTimes((currentTimes) => {
      if (currentTimes.includes(formattedTime)) {
        return currentTimes;
      }

      return sortFormattedTimes([...currentTimes, formattedTime]);
    });

    setIsTimePickerVisible(false);
    setStatusMessage('');
  };

  const handleCancelTime = () => {
    setIsTimePickerVisible(false);
  };

  const removeScheduledTime = (timeToRemove) => {
    setScheduledTimes((currentTimes) =>
      currentTimes.filter((timeValue) => timeValue !== timeToRemove)
    );
  };

  const clearForm = () => {
    setMedicationName('');
    setPurpose('');
    setProvider('');
    setFrequency('');
    setScheduledTimes([]);
  };

  const handleSaveMedication = async () => {
    if (!userId) {
      setStatusTone('error');
      setStatusMessage('Sign in again before saving medication.');
      return;
    }

    if (!medicationName.trim() || !purpose.trim() || !provider.trim() || !frequency || scheduledTimes.length === 0) {
      setStatusTone('error');
      setStatusMessage('Complete every medication field before saving.');
      return;
    }

    setIsSaving(true);
    setStatusMessage('');

    try {
      await saveMedicationEntry(userId, {
        medicationName,
        purpose,
        provider,
        frequency,
        scheduledTimes,
      });

      clearForm();
      setStatusTone('success');
      setStatusMessage('Medication saved to Firestore.');
    } catch (error) {
      console.error('Medication Firestore save failed', error);
      setStatusTone('error');
      setStatusMessage(
        formatFirebaseError(error, 'Could not save medication to Firestore.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroPanel}>
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />

          <View style={styles.heroRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.heroBackButton}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.textSecondary} />
            </Pressable>

            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>Medication Manager</Text>
              <Text style={styles.heroTitle}>Medication Entry</Text>
            </View>

            <View style={styles.heroIconCircle}>
              <MaterialCommunityIcons name="pill" size={24} color={COLORS.green} />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add Medication Details</Text>
            <Text style={styles.formSubtitle}>
              Use the same clear dashboard style to record medication information for caregivers.
            </Text>

            <FormField label="Medication Name">
              <TextInput
                onChangeText={setMedicationName}
                placeholder="Enter medication name"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={medicationName}
              />
            </FormField>

            <FormField label="Purpose">
              <TextInput
                onChangeText={setPurpose}
                placeholder="What is it for?"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={purpose}
              />
            </FormField>

            <FormField label="Provider">
              <TextInput
                onChangeText={setProvider}
                placeholder="Doctor or pharmacy name"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={provider}
              />
            </FormField>

            <FormField
              hint="Choose how often this medication should be taken."
              label="Frequency">
              <View style={styles.optionRow}>
                {FREQUENCY_OPTIONS.map((option) => {
                  const isSelected = frequency === option;

                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      onPress={() => setFrequency(option)}
                      style={[styles.optionChip, isSelected && styles.optionChipSelected]}>
                      <Text style={[styles.optionChipText, isSelected && styles.optionChipTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </FormField>

            <FormField
              hint="Pick a time from the selector and tap Set."
              label="Scheduled Times">
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsTimePickerVisible(true)}
                style={styles.openTimePickerButton}>
                <Text style={styles.openTimePickerText}>Select time</Text>
                <MaterialCommunityIcons name="menu-down" size={26} color={COLORS.textPrimary} />
              </Pressable>

              <View style={styles.timeChipList}>
                {scheduledTimes.length > 0 ? (
                  scheduledTimes.map((timeValue) => (
                    <Pressable
                      key={timeValue}
                      accessibilityRole="button"
                      onPress={() => removeScheduledTime(timeValue)}
                      style={styles.timeChip}>
                      <Text style={styles.timeChipText}>{timeValue}</Text>
                      <MaterialCommunityIcons name="close" size={16} color={COLORS.blue} />
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyTimesText}>No times selected yet.</Text>
                )}
              </View>
            </FormField>

            {statusMessage ? (
              <Text
                style={[
                  styles.statusText,
                  statusTone === 'error' && styles.statusTextError,
                ]}>
                {statusMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={handleSaveMedication}
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
              <MaterialCommunityIcons name="content-save-outline" size={22} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
            </Pressable>

            <View style={styles.savedSection}>
              <Text style={styles.savedSectionTitle}>Saved Medications</Text>

              {isLoadingMedications ? (
                <Text style={styles.savedSectionHint}>Loading medications from Firestore...</Text>
              ) : savedMedications.length > 0 ? (
                savedMedications.map((savedMedication) => (
                  <View key={savedMedication.id} style={styles.savedMedicationCard}>
                    <View style={styles.savedMedicationHeader}>
                      <Text style={styles.savedMedicationName}>
                        {savedMedication.medicationName}
                      </Text>
                      <Text style={styles.savedMedicationFrequency}>
                        {savedMedication.frequency}
                      </Text>
                    </View>

                    <Text style={styles.savedMedicationMeta}>
                      {savedMedication.purpose} · {savedMedication.provider}
                    </Text>
                    <Text style={styles.savedMedicationTimes}>
                      {(savedMedication.scheduledTimes ?? []).join(', ')}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.savedSectionHint}>No medications saved yet.</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <TimePickerModal
        initialValue={scheduledTimes[scheduledTimes.length - 1] ?? '8:00 AM'}
        onCancel={handleCancelTime}
        onSet={handleSetTime}
        title="Select Time"
        visible={isTimePickerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.pageBackground,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroPanel: {
    backgroundColor: COLORS.headerBackground,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlowTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.headerGlow,
    top: -140,
    right: -70,
  },
  heroGlowBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.14)',
    bottom: -120,
    left: -50,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroBackButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  heroLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  formCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 16,
    shadowColor: '#C8D4E8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  formTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FCFDFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    minWidth: 62,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipSelected: {
    borderColor: COLORS.blue,
    backgroundColor: 'rgba(88, 153, 200, 0.12)',
  },
  optionChipText: {
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  optionChipTextSelected: {
    color: COLORS.blue,
  },
  openTimePickerButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F7F9FD',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  openTimePickerText: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  timeChipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  timeChip: {
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(88, 153, 200, 0.26)',
    backgroundColor: 'rgba(88, 153, 200, 0.12)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeChipText: {
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.blue,
    fontWeight: '700',
  },
  emptyTimesText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.green,
    fontWeight: '700',
  },
  statusTextError: {
    color: COLORS.danger,
  },
  saveButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: COLORS.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.72,
  },
  saveButtonText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  savedSection: {
    marginTop: 4,
    gap: 12,
  },
  savedSectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  savedSectionHint: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  savedMedicationCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFE',
    padding: 14,
    gap: 6,
  },
  savedMedicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  savedMedicationName: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  savedMedicationFrequency: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.blue,
    fontWeight: '700',
  },
  savedMedicationMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  savedMedicationTimes: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.green,
    fontWeight: '700',
  },
});
