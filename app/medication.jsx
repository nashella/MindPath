import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { uploadMedicationPhoto } from '@/lib/storage-data';
import { useLinkedAccount } from '@/lib/use-linked-account';

// Unified palette matching previous screens
const COLORS = {
  background: '#FAFAFA',
  title: '#1A1A2E',
  subtitle: '#8A8A9E',
  chip: '#F4F4F6',
  white: '#FFFFFF',
  
  // Primary Accents
  blue: '#4A90D9',
  green: '#6DBF8A',
  pink: '#D887A6', // Using Pink as the main accent for Medications to match Dashboard
  purple: '#B786F7',
  danger: '#E05C5C',

  // Soft Pastel Backgrounds
  blueSoft: '#EBF4FC',
  greenSoft: '#ECF9F1',
  pinkSoft: '#FDF2F6',
  purpleSoft: '#F6EDFD',
  dangerSoft: '#FDECEC',
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
  const [photoUri, setPhotoUri] = useState('');
  const [savedMedications, setSavedMedications] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('success');
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isLoadingMedications, setIsLoadingMedications] = useState(true);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const { userId, patientId, profileError, isProfileLoading } = useLinkedAccount();

  useEffect(() => {
    if (!patientId) {
      setSavedMedications([]);
      setIsLoadingMedications(isProfileLoading);
      return undefined;
    }

    setIsLoadingMedications(true);

    return subscribeToMedications(
      patientId,
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
  }, [isProfileLoading, patientId]);

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
    setPhotoUri('');
  };

  const handleCaptureMedicationPhoto = async () => {
    setIsCapturingPhoto(true);

    try {
      const permissionResponse = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResponse.granted) {
        setStatusTone('error');
        setStatusMessage('Camera permission is needed to photograph medication.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        mediaTypes: ['images'],
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setPhotoUri(result.assets[0].uri);
      setStatusTone('success');
      setStatusMessage('Medication photo added.');
    } catch (error) {
      console.error('Medication camera capture failed', error);
      setStatusTone('error');
      setStatusMessage('Could not open the camera.');
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleSaveMedication = async () => {
    if (!userId || !patientId) {
      setStatusTone('error');
      setStatusMessage(profileError || 'Link this account to a patient before saving medication.');
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
      let uploadedPhoto = {
        imagePath: '',
        imageUrl: '',
      };

      if (photoUri) {
        uploadedPhoto = await uploadMedicationPhoto({
          patientId,
          userId,
          uri: photoUri,
        });
      }

      await saveMedicationEntry(patientId, userId, {
        medicationName,
        purpose,
        provider,
        frequency,
        scheduledTimes,
        ...uploadedPhoto,
      });

      clearForm();
      setStatusTone('success');
      setStatusMessage('Medication saved.');
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
        
        {/* Soft, Airy Hero */}
        <View style={styles.heroPanel}>
          <View style={styles.heroRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.heroBackButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.title} />
            </Pressable>

            <View style={styles.heroIconCircle}>
              <MaterialCommunityIcons name="pill" size={28} color={COLORS.pink} />
            </View>
          </View>
          
          <Text style={styles.heroTitle}>Medications</Text>
          <Text style={styles.heroSubtitle}>Manage and track patient prescriptions</Text>
        </View>

        <View style={styles.body}>
          
          {/* Main Form Area */}
          <Text style={styles.sectionHeader}>Add New Entry</Text>

          <View style={styles.formContainer}>
            <FormField label="Medication Name">
              <TextInput
                onChangeText={setMedicationName}
                placeholder="e.g. Amoxicillin"
                placeholderTextColor="#A0A0B0"
                style={styles.input}
                value={medicationName}
              />
            </FormField>

            <FormField label="Purpose">
              <TextInput
                onChangeText={setPurpose}
                placeholder="e.g. Blood pressure"
                placeholderTextColor="#A0A0B0"
                style={styles.input}
                value={purpose}
              />
            </FormField>

            <FormField label="Provider">
              <TextInput
                onChangeText={setProvider}
                placeholder="Doctor or pharmacy"
                placeholderTextColor="#A0A0B0"
                style={styles.input}
                value={provider}
              />
            </FormField>

            <FormField hint="Choose how often this should be taken." label="Frequency">
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

            <FormField hint="Pick times for alerts and tracking." label="Scheduled Times">
              <View style={styles.timeSelectionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsTimePickerVisible(true)}
                  style={styles.timeAddButton}>
                  <MaterialCommunityIcons name="plus" size={20} color={COLORS.title} />
                  <Text style={styles.timeAddButtonText}>Add Time</Text>
                </Pressable>

                <View style={styles.timeChipList}>
                  {scheduledTimes.map((timeValue) => (
                    <Pressable
                      key={timeValue}
                      accessibilityRole="button"
                      onPress={() => removeScheduledTime(timeValue)}
                      style={styles.timeChip}>
                      <Text style={styles.timeChipText}>{timeValue}</Text>
                      <MaterialCommunityIcons name="close" size={16} color={COLORS.pink} />
                    </Pressable>
                  ))}
                </View>
              </View>
              {scheduledTimes.length === 0 && (
                <Text style={styles.emptyTimesText}>No times selected yet.</Text>
              )}
            </FormField>

            <FormField hint="Help caregivers identify the correct pill." label="Photo">
              {photoUri ? (
                <View style={styles.photoPreviewCard}>
                  <Image contentFit="cover" source={{ uri: photoUri }} style={styles.photoPreview} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPhotoUri('')}
                    style={styles.photoRemoveButton}>
                    <MaterialCommunityIcons name="close" size={18} color={COLORS.danger} />
                    <Text style={styles.photoRemoveButtonText}>Remove Photo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={isCapturingPhoto}
                  onPress={handleCaptureMedicationPhoto}
                  style={[styles.photoButton, isCapturingPhoto && styles.buttonDisabled]}>
                  <MaterialCommunityIcons name="camera-outline" size={20} color={COLORS.title} />
                  <Text style={styles.photoButtonText}>
                    {isCapturingPhoto ? 'Opening...' : 'Take Photo'}
                  </Text>
                </Pressable>
              )}
            </FormField>

            {statusMessage ? (
              <View style={[styles.statusBanner, statusTone === 'error' ? styles.statusBannerError : styles.statusBannerSuccess]}>
                <Text style={[styles.statusText, statusTone === 'error' ? styles.statusTextError : styles.statusTextSuccess]}>
                  {statusMessage}
                </Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={handleSaveMedication}
              style={[styles.saveButton, isSaving && styles.buttonDisabled]}>
              <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Medication'}</Text>
            </Pressable>
          </View>

          {/* Saved Medications List */}
          <Text style={[styles.sectionHeader, { marginTop: 32 }]}>Current Medications</Text>

          <View style={styles.savedSection}>
            {isLoadingMedications ? (
              <Text style={styles.savedSectionHint}>Loading medications...</Text>
            ) : savedMedications.length > 0 ? (
              savedMedications.map((savedMedication) => (
                <View key={savedMedication.id} style={styles.savedMedicationCard}>
                  {savedMedication.imageUrl && (
                    <Image
                      contentFit="cover"
                      source={{ uri: savedMedication.imageUrl }}
                      style={styles.savedMedicationImage}
                    />
                  )}
                  <View style={styles.savedMedicationBody}>
                    <View style={styles.savedMedicationHeader}>
                      <Text style={styles.savedMedicationName}>{savedMedication.medicationName}</Text>
                      <View style={styles.frequencyBadge}>
                        <Text style={styles.frequencyBadgeText}>{savedMedication.frequency}</Text>
                      </View>
                    </View>

                    <Text style={styles.savedMedicationMeta}>
                      {savedMedication.purpose} · {savedMedication.provider}
                    </Text>

                    <View style={styles.savedTimeRow}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.subtitle} />
                      <Text style={styles.savedMedicationTimes}>
                        {(savedMedication.scheduledTimes ?? []).join(', ')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.savedSectionHint}>No medications saved yet.</Text>
            )}
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
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  
  // Minimalist Hero
  heroPanel: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroBackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.chip,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkSoft, // Matching Meds accent
  },
  heroTitle: {
    fontSize: 32,
    color: COLORS.title,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.subtitle,
    marginTop: 4,
  },

  body: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    marginBottom: 16,
  },

  // Form
  formContainer: {
    gap: 24,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 15,
    color: COLORS.title,
    fontWeight: '700',
    marginLeft: 4, // Aligns with rounded input inner padding
  },
  fieldHint: {
    fontSize: 13,
    color: COLORS.subtitle,
    marginLeft: 4,
    marginTop: 2,
  },
  input: {
    minHeight: 56,
    borderRadius: 20, // Soft rectangle
    backgroundColor: COLORS.chip,
    paddingHorizontal: 20,
    fontSize: 16,
    color: COLORS.title,
  },

  // Frequency Chips
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999, // Pill shape
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipSelected: {
    backgroundColor: COLORS.pink,
  },
  optionChipText: {
    fontSize: 14,
    color: COLORS.subtitle,
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: COLORS.white,
  },

  // Time Selection
  timeSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeAddButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORS.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeAddButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.title,
  },
  timeChipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.pinkSoft,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeChipText: {
    fontSize: 14,
    color: COLORS.pink,
    fontWeight: '700',
  },
  emptyTimesText: {
    fontSize: 14,
    color: COLORS.subtitle,
    marginTop: 4,
    marginLeft: 4,
  },

  // Photo
  photoButton: {
    height: 56,
    borderRadius: 999, // Pill shape
    backgroundColor: COLORS.chip,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 16,
    color: COLORS.title,
    fontWeight: '700',
  },
  photoPreviewCard: {
    borderRadius: 24, // Soft rectangle
    backgroundColor: COLORS.chip,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
  },
  photoRemoveButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.chip,
  },
  photoRemoveButtonText: {
    fontSize: 15,
    color: COLORS.danger,
    fontWeight: '700',
  },

  // Status & Actions
  statusBanner: {
    borderRadius: 16,
    padding: 16,
  },
  statusBannerError: {
    backgroundColor: COLORS.dangerSoft,
  },
  statusBannerSuccess: {
    backgroundColor: COLORS.greenSoft,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusTextError: {
    color: COLORS.danger,
  },
  statusTextSuccess: {
    color: COLORS.green,
  },
  saveButton: {
    height: 60,
    borderRadius: 999, // Pill shape
    backgroundColor: COLORS.pink, // Matches the Meds accent
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 17,
    color: COLORS.white,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Saved Section
  savedSection: {
    gap: 16,
  },
  savedSectionHint: {
    fontSize: 15,
    color: COLORS.subtitle,
  },
  savedMedicationCard: {
    borderRadius: 24, // Large soft radius
    backgroundColor: COLORS.white,
    shadowColor: COLORS.title,
    shadowOpacity: 0.04,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    overflow: 'hidden', // Ensures the image respects the border radius
  },
  savedMedicationImage: {
    width: '100%',
    height: 160,
  },
  savedMedicationBody: {
    padding: 20,
    gap: 8,
  },
  savedMedicationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  savedMedicationName: {
    flex: 1,
    fontSize: 18,
    color: COLORS.title,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  frequencyBadge: {
    backgroundColor: COLORS.pinkSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  frequencyBadgeText: {
    fontSize: 12,
    color: COLORS.pink,
    fontWeight: '700',
  },
  savedMedicationMeta: {
    fontSize: 14,
    color: COLORS.subtitle,
  },
  savedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  savedMedicationTimes: {
    fontSize: 14,
    color: COLORS.title,
    fontWeight: '600',
  },
});