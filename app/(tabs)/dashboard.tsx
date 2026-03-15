import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, signOut, type Auth } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import {
  getTodayDateKey,
  saveCaregiverCheckIn,
  savePatientProfile,
  subscribeToCaregiverCheckIn,
  subscribeToPatient,
} from '@/lib/firestore-data';
import { formatFirebaseError } from '@/lib/firebase-errors';
import { uploadCaregiverCheckInPhoto } from '@/lib/storage-data';
import { useLinkedAccount } from '@/lib/use-linked-account';

type PatientRecord = {
  patientName: string;
  patientAge: number;
  joinCode?: string;
} | null;

type CaregiverCheckIn = {
  caregiverName: string;
  caregiverPhoto?: string;
  dateKey: string;
} | null;

type QuickAction = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  backgroundColor: string;
  route: string;
};

// Core colors retained, with specific "soft" variants added for the pastel backgrounds
const COLORS = {
  background: '#FAFAFA', // Pure, clean background like the reference
  title: '#1A1A2E',
  subtitle: '#8A8A9E', // Softer grey for modern typography
  accent: '#4A90D9',
  success: '#6DBF8A',
  error: '#E05C5C',
  chip: '#F4F4F6', // Neutral soft grey for inputs
  overlay: 'rgba(26, 26, 46, 0.4)',
  
  // Vibrant accents
  pink: '#D887A6',
  purple: '#B786F7',
  green: '#6DBF8A',
  blue: '#4A90D9',

  // Soft pastel backgrounds (15-20% opacity lookaliks)
  pinkSoft: '#FDF2F6',
  purpleSoft: '#F6EDFD',
  greenSoft: '#ECF9F1',
  blueSoft: '#EBF4FC',
  yellowSoft: '#FDF9E8',
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Medication', icon: 'brain', iconColor: COLORS.purple, backgroundColor: COLORS.purpleSoft, route: '/medication' },
  { label: 'Tasks', icon: 'format-list-checks', iconColor: COLORS.blue, backgroundColor: COLORS.blueSoft, route: '/dailytask' },
  { label: 'Schedule', icon: 'calendar-blank', iconColor: COLORS.green, backgroundColor: COLORS.greenSoft, route: '/calender' },
  { label: 'CareTaker', icon: 'puzzle-outline', iconColor: COLORS.pink, backgroundColor: COLORS.pinkSoft, route: '/patient' },
];

function formatTodayLabel() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'url';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <TextInput
          keyboardType={keyboardType ?? 'default'}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B0B0C0"
          selectionColor={COLORS.accent}
          style={styles.input}
          value={value}
        />
      </View>
    </View>
  );
}

export default function CaregiverDashboard() {
  const router = useRouter();
  const todayKey = getTodayDateKey();
  const firebaseAuth = getAuth() as Auth;
  const {
    userId,
    patientId,
    profileError,
  } = useLinkedAccount();

  const [patientRecord, setPatientRecord] = useState<PatientRecord>(null);
  const [activeCaregiver, setActiveCaregiver] = useState<CaregiverCheckIn>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isCheckInModalVisible, setIsCheckInModalVisible] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileAgeInput, setProfileAgeInput] = useState('');
  const [checkInNameInput, setCheckInNameInput] = useState('');
  const [checkInPhotoInput, setCheckInPhotoInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  const [isPickingCheckInPhoto, setIsPickingCheckInPhoto] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setPatientRecord(null);
      return undefined;
    }
    return subscribeToPatient(
      patientId,
      (patient: PatientRecord) => {
        setPatientRecord(patient);
        setProfileNameInput(patient?.patientName ?? '');
        setProfileAgeInput(patient?.patientAge ? String(patient.patientAge) : '');
      },
      (error: unknown) => {
        setStatusTone('error');
        setStatusMessage(formatFirebaseError(error, 'Could not load the linked patient.'));
      }
    );
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setActiveCaregiver(null);
      return undefined;
    }
    return subscribeToCaregiverCheckIn(
      patientId,
      todayKey,
      (checkIn: CaregiverCheckIn) => {
        setActiveCaregiver(checkIn);
        setCheckInNameInput(checkIn?.caregiverName ?? '');
        setCheckInPhotoInput(checkIn?.caregiverPhoto ?? '');
      },
      (error: unknown) => {
        setStatusTone('error');
        setStatusMessage(formatFirebaseError(error, "Could not load today's check-in."));
      }
    );
  }, [patientId, todayKey]);

  const handleSavePatientProfile = async () => {
    if (!userId || !patientId) return;
    setIsSavingProfile(true);
    try {
      await savePatientProfile(patientId, userId, {
        patientName: profileNameInput,
        patientAge: profileAgeInput,
      });
      setIsProfileModalVisible(false);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(formatFirebaseError(error, 'Could not save the patient profile.'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveCheckIn = async () => {
    if (!userId || !patientId) return;
    setIsSavingCheckIn(true);
    try {
      let caregiverPhoto = checkInPhotoInput.trim();

      if (caregiverPhoto && !/^https?:\/\//i.test(caregiverPhoto)) {
        const uploadedPhoto = await uploadCaregiverCheckInPhoto({
          patientId,
          userId,
          uri: caregiverPhoto,
        });
        caregiverPhoto = uploadedPhoto.imageUrl;
      }

      await saveCaregiverCheckIn(patientId, userId, {
        dateKey: todayKey,
        caregiverName: checkInNameInput,
        caregiverPhoto,
      });
      setIsCheckInModalVisible(false);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(formatFirebaseError(error, "Could not save check-in."));
    } finally {
      setIsSavingCheckIn(false);
    }
  };

  const handlePickCheckInPhoto = async () => {
    setIsPickingCheckInPhoto(true);

    try {
      const permissionResponse =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResponse.granted) {
        setStatusTone('error');
        setStatusMessage('Photo library permission is needed to add a caregiver photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: ['images'],
        quality: 0.75,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setCheckInPhotoInput(result.assets[0].uri);
      setStatusTone('success');
      setStatusMessage('Caregiver photo added to today’s check-in.');
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(formatFirebaseError(error, 'Could not open the photo library.'));
    } finally {
      setIsPickingCheckInPhoto(false);
    }
  };

  const visibleStatusMessage = statusMessage || profileError;
  const visibleStatusTone = statusMessage ? statusTone : profileError ? 'error' : 'success';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Centered, Airy Hero matching reference */}
        <View style={styles.heroSection}>
          <View style={styles.heroAvatarContainer}>
             <MaterialCommunityIcons name="face-man-profile" size={48} color={COLORS.accent} />
          </View>
          <Text style={styles.heroGreeting}>
            {activeCaregiver ? `Good Morning, ${activeCaregiver.caregiverName}!` : 'Good Morning!'}
          </Text>
          
          <View style={styles.heroTipCard}>
            <View style={styles.tipIconWrap}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#D4B230" />
            </View>
            <Text style={styles.tipText}>
              Daily Tip: Maintain a consistent routine today to help {patientRecord?.patientName || 'the patient'} stay grounded.
            </Text>
          </View>
        </View>

        <View style={styles.contentBody}>
          {visibleStatusMessage ? (
            <View
              style={[
                styles.statusBanner,
                visibleStatusTone === 'error' && styles.statusBannerError,
              ]}>
              <MaterialCommunityIcons
                color={visibleStatusTone === 'error' ? COLORS.error : COLORS.success}
                name={visibleStatusTone === 'error' ? 'alert-circle' : 'check-circle'}
                size={18}
              />
              <Text
                style={[
                  styles.statusBannerText,
                  visibleStatusTone === 'error' && styles.statusBannerTextError,
                ]}>
                {visibleStatusMessage}
              </Text>
            </View>
          ) : null}
          
          <Text style={styles.sectionHeader}>What would you like to do?</Text>

          {/* List-style overview items matching the first reference image */}
          <View style={styles.actionList}>
            <Pressable 
              style={[styles.listCard, { backgroundColor: COLORS.purpleSoft }]}
              onPress={() => setIsProfileModalVisible(true)}
            >
              <View style={[styles.listIconBox, { backgroundColor: COLORS.purple }]}>
                <MaterialCommunityIcons name="account-heart" size={20} color="#FFF" />
              </View>
              <View style={styles.listCopy}>
                <Text style={[styles.listTitle, { color: COLORS.purple }]}>Patient Profile</Text>
                <Text style={styles.listSubtitle}>
                  {patientRecord ? `${patientRecord.patientName}, Age ${patientRecord.patientAge}` : 'Set up patient record'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.purple} />
            </Pressable>

            <Pressable 
              style={[styles.listCard, { backgroundColor: COLORS.greenSoft }]}
              onPress={() => setIsCheckInModalVisible(true)}
            >
              <View style={[styles.listIconBox, { backgroundColor: COLORS.green }]}>
                <MaterialCommunityIcons name="calendar-check" size={20} color="#FFF" />
              </View>
              <View style={styles.listCopy}>
                <Text style={[styles.listTitle, { color: COLORS.green }]}>Daily Check-In</Text>
                <Text style={styles.listSubtitle}>
                  {activeCaregiver ? `Active: ${activeCaregiver.caregiverName}` : 'Assign caregiver for today'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.green} />
            </Pressable>

            {patientRecord?.joinCode && (
              <Pressable style={[styles.listCard, { backgroundColor: COLORS.blueSoft }]}>
                <View style={[styles.listIconBox, { backgroundColor: COLORS.blue }]}>
                  <MaterialCommunityIcons name="key" size={20} color="#FFF" />
                </View>
                <View style={styles.listCopy}>
                  <Text style={[styles.listTitle, { color: COLORS.blue }]}>Join Code</Text>
                  <Text style={styles.listSubtitle}>{patientRecord.joinCode}</Text>
                </View>
                <MaterialCommunityIcons name="content-copy" size={20} color={COLORS.blue} />
              </Pressable>
            )}
          </View>

          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Quick Actions</Text>

          {/* Grid-style actions matching the third reference image */}
          <View style={styles.gridContainer}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route)}
                style={({ pressed }) => [
                  styles.gridItem,
                  { backgroundColor: action.backgroundColor },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <MaterialCommunityIcons name={action.icon} size={36} color={action.iconColor} style={{ marginBottom: 12 }} />
                <Text style={[styles.gridItemText, { color: action.iconColor }]}>{action.label}</Text>
                
              </Pressable>
            ))}
          </View>

          {/* Full Pill Button for Logout, matching "Begin Session" from reference */}
          <Pressable 
            style={styles.pillButtonSecondary}
            onPress={async () => {
              await signOut(firebaseAuth);
              router.replace('/');
            }}
          >
            <Text style={styles.pillButtonTextSecondary}>Sign Out</Text>
          </Pressable>

        </View>
      </ScrollView>

      {/* Patient Profile Modal - Updated to soft minimal style */}
      <Modal visible={isProfileModalVisible} animationType="fade" transparent onRequestClose={() => setIsProfileModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Patient Record</Text>
            <Text style={styles.modalSubtitle}>Manage the core details for the linked patient.</Text>

            <View style={styles.modalForm}>
              <Field label="Full Name" value={profileNameInput} onChangeText={setProfileNameInput} placeholder="Patient name" />
              <Field label="Age" value={profileAgeInput} onChangeText={setProfileAgeInput} keyboardType="number-pad" placeholder="Age" />
            </View>

            <Pressable 
              style={styles.pillButtonPrimary}
              onPress={handleSavePatientProfile}
              disabled={isSavingProfile}
            >
              <Text style={styles.pillButtonTextPrimary}>{isSavingProfile ? 'Saving...' : 'Save Profile'}</Text>
            </Pressable>
            
            <Pressable style={styles.pillButtonGhost} onPress={() => setIsProfileModalVisible(false)}>
              <Text style={styles.pillButtonTextGhost}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Check-In Modal */}
      <Modal visible={isCheckInModalVisible} animationType="fade" transparent onRequestClose={() => setIsCheckInModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Check-In</Text>
            <Text style={styles.modalSubtitle}>Set the active caregiver for {formatTodayLabel()}.</Text>

            <View style={styles.modalForm}>
              <Field label="Caregiver Name" value={checkInNameInput} onChangeText={setCheckInNameInput} placeholder="Who is on duty?" />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Caregiver Photo</Text>
                {checkInPhotoInput ? (
                  <View style={styles.checkInPhotoCard}>
                    <Image source={{ uri: checkInPhotoInput }} style={styles.checkInPhotoPreview} />
                    <View style={styles.checkInPhotoActions}>
                      <Pressable
                        disabled={isPickingCheckInPhoto}
                        onPress={() => {
                          void handlePickCheckInPhoto();
                        }}
                        style={styles.photoPickerButton}>
                        {isPickingCheckInPhoto ? (
                          <ActivityIndicator color={COLORS.green} />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="image-edit-outline" size={18} color={COLORS.green} />
                            <Text style={styles.photoPickerButtonText}>Change Photo</Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => setCheckInPhotoInput('')}
                        style={styles.photoRemoveButton}>
                        <MaterialCommunityIcons name="close-circle-outline" size={18} color={COLORS.error} />
                        <Text style={styles.photoRemoveButtonText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    disabled={isPickingCheckInPhoto}
                    onPress={() => {
                      void handlePickCheckInPhoto();
                    }}
                    style={styles.photoPickerButton}>
                    {isPickingCheckInPhoto ? (
                      <ActivityIndicator color={COLORS.green} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="image-plus" size={18} color={COLORS.green} />
                        <Text style={styles.photoPickerButtonText}>Choose From Gallery</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </View>

            <Pressable 
              style={[styles.pillButtonPrimary, { backgroundColor: COLORS.green }]}
              onPress={handleSaveCheckIn}
              disabled={isSavingCheckIn}
            >
              <MaterialCommunityIcons name="play" size={20} color="#FFF" />
              <Text style={styles.pillButtonTextPrimary}>{isSavingCheckIn ? 'Starting...' : 'Begin Session'}</Text>
            </Pressable>
            
            <Pressable style={styles.pillButtonGhost} onPress={() => setIsCheckInModalVisible(false)}>
              <Text style={styles.pillButtonTextGhost}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
  
  // Center Hero - Matches top of reference images
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  heroAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroGreeting: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  heroTipCard: {
    width: '100%',
    backgroundColor: COLORS.yellowSoft,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#937E28', // Slightly darker yellow/brown for text
    fontWeight: '500',
  },

  contentBody: {
    paddingHorizontal: 24,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: COLORS.greenSoft,
    marginBottom: 18,
  },
  statusBannerError: {
    backgroundColor: COLORS.pinkSoft,
  },
  statusBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.success,
    fontWeight: '600',
  },
  statusBannerTextError: {
    color: COLORS.error,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.title,
    marginBottom: 16,
    fontFamily: Fonts.rounded,
  },

  // List Items - Matches "What would you like to do?"
  actionList: {
    gap: 12,
    marginBottom: 24,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24, // Very soft corners
  },
  listIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listCopy: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 13,
    color: COLORS.subtitle,
    opacity: 0.8,
  },

  // Grid - Matches "Pick a brain exercise!"
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 40,
  },
  gridItem: {
    width: '47.5%', // Slightly under 50% to account for gap
    aspectRatio: 1, // Makes them perfect squares
    borderRadius: 32, // Ultra soft corners like the reference
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  gridItemText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  gridItemSub: {
    fontSize: 12,
    color: COLORS.subtitle,
    opacity: 0.6,
  },

  // Pill Buttons - Matches "Begin Session"
  pillButtonPrimary: {
    width: '100%',
    height: 60,
    backgroundColor: COLORS.purple, // Match the reference primary action color
    borderRadius: 999, // Full pill shape
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  pillButtonTextPrimary: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  pillButtonSecondary: {
    width: '100%',
    height: 60,
    backgroundColor: COLORS.chip,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  pillButtonTextSecondary: {
    color: COLORS.subtitle,
    fontSize: 17,
    fontWeight: '700',
  },
  pillButtonGhost: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pillButtonTextGhost: {
    color: COLORS.subtitle,
    fontSize: 15,
    fontWeight: '600',
  },

  // Modals - Soft and minimal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 40, // Extreme roundness for modern modal feel
    padding: 32,
    alignItems: 'center', // Center everything inside modal
  },
  modalTitle: {
    fontSize: 24,
    color: COLORS.title,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: COLORS.subtitle,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalForm: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  fieldGroup: {
    gap: 8,
    width: '100%',
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.title,
    fontWeight: '600',
    marginLeft: 12, // Align with the rounded input inside
  },
  inputShell: {
    height: 60,
    borderRadius: 999, // Pill shape inputs
    backgroundColor: COLORS.chip,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: COLORS.title,
  },
  checkInPhotoCard: {
    gap: 12,
  },
  checkInPhotoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 24,
    backgroundColor: COLORS.chip,
  },
  checkInPhotoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoPickerButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: COLORS.greenSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  photoPickerButtonText: {
    color: COLORS.green,
    fontSize: 15,
    fontWeight: '700',
  },
  photoRemoveButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: COLORS.pinkSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  photoRemoveButtonText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '700',
  },
});
