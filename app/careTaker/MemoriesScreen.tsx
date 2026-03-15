import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import {
  deletePatientMemory,
  savePatientMemory,
  subscribeToPatient,
  subscribeToPatientMemories,
  updatePatientMemory,
} from '@/lib/firestore-data';
import { formatFirebaseError } from '@/lib/firebase-errors';
import { deleteStorageFile, uploadMemoryPhoto } from '@/lib/storage-data';
import { useLinkedAccount } from '@/lib/use-linked-account';

type MemoryRecord = {
  id: string;
  title?: string;
  relationship?: string;
  description?: string;
  narration?: string;
  imageUrl?: string;
  imagePath?: string;
  createdAtMs?: number;
};

type PatientRecord = {
  patientName?: string;
} | null;

// Unified soft palette matching previous screens
const COLORS = {
  background: '#FAFAFA',
  title: '#1A1A2E',
  subtitle: '#8A8A9E',
  chip: '#F4F4F6',
  white: '#FFFFFF',
  
  // Primary Accents
  blue: '#4A90D9',
  green: '#6DBF8A',
  pink: '#D887A6', // Primary accent for Memories
  purple: '#B786F7',
  danger: '#E05C5C',

  // Soft Pastel Backgrounds
  blueSoft: '#EBF4FC',
  greenSoft: '#ECF9F1',
  pinkSoft: '#FDF2F6',
  purpleSoft: '#F6EDFD',
  dangerSoft: '#FDECEC',
  
  overlay: 'rgba(26, 26, 46, 0.4)',
};

function formatMemoryDate(createdAtMs?: number) {
  if (!createdAtMs) {
    return 'Saved recently';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(createdAtMs);
}

function ensureSentence(value?: string) {
  const trimmedValue = String(value ?? '').trim();
  if (!trimmedValue) return '';
  return /[.!?]$/.test(trimmedValue) ? trimmedValue : `${trimmedValue}.`;
}

function buildNarration(memory: Pick<MemoryRecord, 'title' | 'relationship' | 'description' | 'narration'>) {
  const savedNarration = String(memory.narration ?? '').trim();
  if (savedNarration) return savedNarration;

  const title = String(memory.title ?? '').trim();
  const relationship = String(memory.relationship ?? '').trim();
  const description = String(memory.description ?? '').trim();
  const parts: string[] = [];

  if (title) parts.push(`This photo is of ${title}.`);

  if (relationship) {
    const lowerRelationship = relationship.toLowerCase();
    const relationshipSentence =
      /^(he|she|they|this|that|these|those|your|our|my)\b/.test(lowerRelationship)
        ? relationship
        : `They are ${relationship}`;
    parts.push(ensureSentence(relationshipSentence));
  }

  if (description) parts.push(ensureSentence(description));

  return parts.join(' ').trim() || 'This is a special memory saved for you.';
}

export default function MemoriesScreen() {
  const { width } = useWindowDimensions();
  const { patientId, role, userId, isProfileLoading, profileError } = useLinkedAccount();
  const isCaregiver = role === 'caregiver';
  const tileGap = 16;
  const columns = width >= 900 ? 3 : 2;
  const tileWidth = Math.max(Math.floor((width - 48 - tileGap * (columns - 1)) / columns), 140);
  const tileHeight = Math.round(tileWidth * 1.15);

  const [patientRecord, setPatientRecord] = useState<PatientRecord>(null);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isPatientLoading, setIsPatientLoading] = useState(true);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(true);
  const [isComposerVisible, setIsComposerVisible] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryRecord | null>(null);
  const [editingMemory, setEditingMemory] = useState<MemoryRecord | null>(null);
  
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryRelationship, setMemoryRelationship] = useState('');
  const [memoryDescription, setMemoryDescription] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [isDeletingMemory, setIsDeletingMemory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setPatientRecord(null);
      setIsPatientLoading(false);
      return undefined;
    }
    setIsPatientLoading(true);
    return subscribeToPatient(
      patientId,
      (patient: PatientRecord) => {
        setPatientRecord(patient);
        setIsPatientLoading(false);
      },
      (error: any) => {
        setStatusTone('error');
        setStatusMessage(formatFirebaseError(error, 'Could not load the linked patient.'));
        setIsPatientLoading(false);
      }
    );
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setMemories([]);
      setIsMemoriesLoading(false);
      return undefined;
    }
    setIsMemoriesLoading(true);
    return subscribeToPatientMemories(
      patientId,
      (items: MemoryRecord[]) => {
        setMemories(items);
        setIsMemoriesLoading(false);
      },
      (error: any) => {
        setStatusTone('error');
        setStatusMessage(formatFirebaseError(error, 'Could not load saved memories.'));
        setIsMemoriesLoading(false);
      }
    );
  }, [patientId]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const draftNarration = useMemo(
    () => buildNarration({ title: memoryTitle, relationship: memoryRelationship, description: memoryDescription }),
    [memoryDescription, memoryRelationship, memoryTitle]
  );
  const isEditingMemory = Boolean(editingMemory);

  const selectedNarration = useMemo(() => {
    return selectedMemory ? buildNarration(selectedMemory) : '';
  }, [selectedMemory]);

  const visibleStatusMessage = statusMessage || profileError;
  const statusIsError = statusMessage ? statusTone === 'error' : Boolean(profileError);
  const emptyTitle = patientId ? 'No memories yet' : 'No linked patient yet';
  const emptyText = patientId
    ? isCaregiver
      ? 'Add family photos with relationship details and a clear description.'
      : 'Your caregiver can add family photos here. Tap one to hear it read aloud.'
    : 'Link a patient account first so this shared album knows where to save memories.';

  const handleCloseComposer = () => {
    setIsComposerVisible(false);
    setEditingMemory(null);
    setMemoryTitle('');
    setMemoryRelationship('');
    setMemoryDescription('');
    setSelectedImageUri('');
  };

  const handleOpenComposer = () => {
    setEditingMemory(null);
    setMemoryTitle('');
    setMemoryRelationship('');
    setMemoryDescription('');
    setSelectedImageUri('');
    setIsComposerVisible(true);
  };

  const handleStartEditingMemory = (memory: MemoryRecord) => {
    Speech.stop();
    setIsSpeaking(false);
    setSelectedMemory(null);
    setEditingMemory(memory);
    setMemoryTitle(memory.title ?? '');
    setMemoryRelationship(memory.relationship ?? '');
    setMemoryDescription(memory.description ?? '');
    setSelectedImageUri(memory.imageUrl ?? '');
    setIsComposerVisible(true);
  };

  const handlePickImage = async () => {
    setIsPickingImage(true);
    try {
      const permissionResponse = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResponse.granted) {
        setStatusTone('error');
        setStatusMessage('Photo library permission is needed to add a memory image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
        mediaTypes: ['images'],
      });
      if (result.canceled || !result.assets?.length) return;
      
      setSelectedImageUri(result.assets[0].uri);
      setStatusTone('success');
      setStatusMessage('Photo selected for this memory.');
    } catch {
      setStatusTone('error');
      setStatusMessage('Could not open the photo library.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleSaveMemory = async () => {
    if (!isCaregiver || !userId || !patientId) return;
    if (!selectedImageUri || !memoryTitle.trim() || !memoryRelationship.trim() || !memoryDescription.trim()) {
      setStatusTone('error');
      setStatusMessage('Please choose a photo and complete all fields.');
      return;
    }

    setIsSavingMemory(true);
    try {
      let nextImageUrl = editingMemory?.imageUrl?.trim() ?? '';
      let nextImagePath = editingMemory?.imagePath?.trim() ?? '';
      const hasNewLocalImage =
        selectedImageUri && !/^https?:\/\//i.test(selectedImageUri);

      if (hasNewLocalImage) {
        const uploadedPhoto = await uploadMemoryPhoto({
          patientId,
          userId,
          uri: selectedImageUri,
        });
        nextImageUrl = uploadedPhoto.imageUrl;
        nextImagePath = uploadedPhoto.imagePath;
      }

      const payload = {
        title: memoryTitle,
        relationship: memoryRelationship,
        description: memoryDescription,
        narration: draftNarration,
        imageUrl: nextImageUrl,
        imagePath: nextImagePath,
      };

      if (editingMemory) {
        await updatePatientMemory(editingMemory.id, userId, payload);

        if (
          hasNewLocalImage &&
          editingMemory.imagePath &&
          editingMemory.imagePath !== nextImagePath
        ) {
          await deleteStorageFile(editingMemory.imagePath);
        }
      } else {
        await savePatientMemory(patientId, userId, payload);
      }

      setStatusTone('success');
      setStatusMessage(
        editingMemory
          ? 'Memory updated in the shared album.'
          : 'Memory added to the shared album.'
      );
      handleCloseComposer();
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(formatFirebaseError(error, 'Could not save this memory.'));
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleCloseViewer = () => {
    Speech.stop();
    setIsSpeaking(false);
    setSelectedMemory(null);
  };

  const handleDeleteMemory = () => {
    if (!selectedMemory || !isCaregiver || isDeletingMemory) {
      return;
    }

    Alert.alert(
      'Delete memory?',
      'This will remove the photo and its information from the shared album.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsDeletingMemory(true);
              try {
                await deletePatientMemory(selectedMemory.id);

                if (selectedMemory.imagePath) {
                  await deleteStorageFile(selectedMemory.imagePath);
                }

                setStatusTone('success');
                setStatusMessage('Memory deleted from the shared album.');
                handleCloseViewer();
              } catch (error) {
                setStatusTone('error');
                setStatusMessage(
                  formatFirebaseError(error, 'Could not delete this memory.')
                );
              } finally {
                setIsDeletingMemory(false);
              }
            })();
          },
        },
      ]
    );
  };

  const handleSpeak = () => {
    if (!selectedMemory) return;
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    Speech.stop();
    Speech.speak(selectedNarration, {
      rate: 0.92,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Soft Hero Section */}
        <View style={styles.heroPanel}>
          <View style={styles.heroRow}>
            <View style={styles.heroIconCircle}>
              <MaterialCommunityIcons name="image-multiple" size={28} color={COLORS.pink} />
            </View>
          </View>
          
          <Text style={styles.heroTitle}>Memories</Text>
          <Text style={styles.heroSubtitle}>
            {patientRecord?.patientName
              ? `${patientRecord.patientName}'s familiar photos and read-aloud moments.`
              : 'A shared album for familiar faces, relationships, and stories.'}
          </Text>

          <View style={styles.chipRow}>
            <View style={styles.pillChip}>
              <Text style={styles.chipText}>Photos</Text>
            </View>
            <View style={[styles.pillChip, { backgroundColor: COLORS.pinkSoft }]}>
              <Text style={[styles.chipText, { color: COLORS.pink }]}>
                {isCaregiver ? 'Caregiver can add' : 'Tap to hear read aloud'}
              </Text>
            </View>
          </View>
        </View>

        {visibleStatusMessage && (
          <View style={[styles.statusBanner, statusIsError ? styles.statusBannerError : styles.statusBannerSuccess]}>
            <MaterialCommunityIcons
              color={statusIsError ? COLORS.danger : COLORS.green}
              name={statusIsError ? 'alert-circle' : 'check-circle'}
              size={20}
            />
            <Text style={[styles.statusText, { color: statusIsError ? COLORS.danger : COLORS.green }]}>
              {visibleStatusMessage}
            </Text>
          </View>
        )}

        {/* Grid or Empty State */}
        {isPatientLoading || isMemoriesLoading || isProfileLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.pink} size="large" />
            <Text style={styles.emptyText}>Loading shared memories...</Text>
          </View>
        ) : memories.length ? (
          <View style={[styles.grid, { gap: tileGap }]}>
            {memories.map((memory) => (
              <Pressable
                accessibilityRole="button"
                key={memory.id}
                onPress={() => setSelectedMemory(memory)}
                style={[styles.tile, { width: tileWidth }]}>
                <View style={styles.tileImageWrap}>
                  {memory.imageUrl ? (
                    <Image contentFit="cover" source={{ uri: memory.imageUrl }} style={{ width: '100%', height: tileHeight }} />
                  ) : (
                    <View style={[styles.tilePlaceholder, { height: tileHeight }]}>
                      <MaterialCommunityIcons color={COLORS.pink} name="image-outline" size={32} />
                    </View>
                  )}

                  {isCaregiver ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={(event) => {
                        event.stopPropagation?.();
                        handleStartEditingMemory(memory);
                      }}
                      style={styles.tileEditButton}>
                      <MaterialCommunityIcons color={COLORS.blue} name="pencil-outline" size={18} />
                    </Pressable>
                  ) : null}
                </View>
                
                <View style={styles.tileTextWrap}>
                  <Text numberOfLines={1} style={styles.tileTitle}>
                    {memory.title || 'Untitled memory'}
                  </Text>
                  <Text numberOfLines={1} style={styles.tileMeta}>
                    {memory.relationship?.trim() || formatMemoryDate(memory.createdAtMs)}
                  </Text>
                  {isCaregiver ? (
                    <Text style={styles.tileActionHint}>Tap pencil to edit</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons color={COLORS.pink} name="image-multiple-outline" size={48} />
            </View>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {isCaregiver && (
        <Pressable
          accessibilityRole="button"
          onPress={handleOpenComposer}
          style={styles.floatingButton}>
          <MaterialCommunityIcons color={COLORS.white} name="plus" size={32} />
        </Pressable>
      )}

      {/* Caregiver Composer Modal */}
      <Modal transparent visible={isComposerVisible} animationType="fade" onRequestClose={handleCloseComposer}>
        <View style={styles.modalOverlay}>
          <ScrollView bounces={false} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{isEditingMemory ? 'Edit Memory' : 'Add a Memory'}</Text>
              <Text style={styles.modalSubtitle}>
                {isEditingMemory
                  ? 'Update the photo, relationship, and story for this memory.'
                  : 'Add who is in the photo, their relationship, and what is happening.'}
              </Text>

              <View style={styles.modalForm}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isPickingImage}
                  onPress={handlePickImage}
                  style={styles.imagePicker}>
                  {selectedImageUri ? (
                    <Image contentFit="cover" source={{ uri: selectedImageUri }} style={styles.pickerPreview} />
                  ) : (
                    <View style={styles.pickerEmpty}>
                      <MaterialCommunityIcons color={COLORS.pink} name="camera-plus" size={32} />
                      <Text style={styles.pickerTitle}>
                        {isPickingImage ? 'Opening photos...' : isEditingMemory ? 'Change image' : 'Upload image'}
                      </Text>
                    </View>
                  )}
                </Pressable>

                <TextInput
                  onChangeText={setMemoryTitle}
                  placeholder="Who is in the photo?"
                  placeholderTextColor={COLORS.subtitle}
                  style={styles.input}
                  value={memoryTitle}
                />
                <TextInput
                  onChangeText={setMemoryRelationship}
                  placeholder="Their relationship to patient"
                  placeholderTextColor={COLORS.subtitle}
                  style={styles.input}
                  value={memoryRelationship}
                />
                <TextInput
                  multiline
                  numberOfLines={4}
                  onChangeText={setMemoryDescription}
                  placeholder="Describe the memory..."
                  placeholderTextColor={COLORS.subtitle}
                  style={styles.textArea}
                  textAlignVertical="top"
                  value={memoryDescription}
                />

                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Narration Preview</Text>
                  <Text style={styles.previewText}>{draftNarration}</Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" onPress={handleCloseComposer} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSavingMemory}
                  onPress={handleSaveMemory}
                  style={[styles.primaryButton, isSavingMemory && styles.buttonDisabled]}>
                  <Text style={styles.primaryButtonText}>{isSavingMemory ? 'Saving...' : isEditingMemory ? 'Update memory' : 'Save memory'}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Patient Viewer Modal - Dementia Friendly */}
      <Modal visible={Boolean(selectedMemory)} animationType="slide" onRequestClose={handleCloseViewer}>
        <SafeAreaView style={styles.viewerSafeArea} edges={['top']}>
          <StatusBar style="dark" />
          
          <View style={styles.viewerTopRow}>
            {isCaregiver && selectedMemory ? (
              <View style={styles.viewerActionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeletingMemory}
                  onPress={() => handleStartEditingMemory(selectedMemory)}
                  style={styles.viewerGhostButton}>
                  <MaterialCommunityIcons color={COLORS.blue} name="pencil-outline" size={20} />
                  <Text style={styles.viewerGhostButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeletingMemory}
                  onPress={handleDeleteMemory}
                  style={[styles.viewerGhostButton, styles.viewerGhostButtonDanger]}>
                  {isDeletingMemory ? (
                    <ActivityIndicator color={COLORS.danger} size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons color={COLORS.danger} name="trash-can-outline" size={20} />
                      <Text style={styles.viewerGhostButtonDangerText}>Delete</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}
            <Pressable accessibilityRole="button" onPress={handleCloseViewer} style={styles.viewerCloseButton}>
              <MaterialCommunityIcons color={COLORS.title} name="close" size={28} />
            </Pressable>
          </View>

          {selectedMemory && (
            <ScrollView contentContainerStyle={styles.viewerContent} showsVerticalScrollIndicator={false}>
              
              <View style={styles.viewerImageContainer}>
                {selectedMemory.imageUrl ? (
                  <Image contentFit="cover" source={{ uri: selectedMemory.imageUrl }} style={styles.viewerImage} />
                ) : (
                  <View style={styles.viewerPlaceholder}>
                    <MaterialCommunityIcons color={COLORS.pink} name="image-outline" size={64} />
                  </View>
                )}
              </View>

              <View style={styles.viewerInfoCard}>
                <Text style={styles.viewerTitle}>{selectedMemory.title || 'Special Memory'}</Text>
                
                {selectedMemory.relationship?.trim() && (
                  <View style={styles.viewerRelationshipBadge}>
                    <Text style={styles.viewerRelationshipText}>{selectedMemory.relationship.trim()}</Text>
                  </View>
                )}
                
                <Text style={styles.viewerDescription}>
                  {selectedMemory.description?.trim() || 'A familiar moment saved by the care team.'}
                </Text>
              </View>

              {/* Massive, easy-to-tap Play Button */}
              <Pressable 
                accessibilityRole="button" 
                onPress={handleSpeak} 
                style={({ pressed }) => [
                  styles.viewerSpeakButton, 
                  isSpeaking && styles.viewerSpeakButtonActive,
                  pressed && styles.btnPressed
                ]}>
                <MaterialCommunityIcons color={COLORS.white} name={isSpeaking ? 'stop-circle' : 'play-circle'} size={36} />
                <Text style={styles.viewerSpeakButtonText}>{isSpeaking ? 'Stop Reading' : 'Read Aloud'}</Text>
              </Pressable>

            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 140,
  },

  // Hero Section
  heroPanel: {
    paddingBottom: 24,
  },
  heroRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkSoft,
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
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  pillChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.chip,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.subtitle,
  },

  // Banners & Empty States
  statusBanner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBannerError: {
    backgroundColor: COLORS.dangerSoft,
  },
  statusBannerSuccess: {
    backgroundColor: COLORS.greenSoft,
  },
  statusText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
    color: COLORS.title,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.subtitle,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  tileImageWrap: {
    position: 'relative',
  },
  tilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkSoft,
  },
  tileEditButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  tileTextWrap: {
    padding: 16,
    gap: 4,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.title,
  },
  tileMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.subtitle,
  },
  tileActionHint: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.blue,
    marginTop: 2,
  },

  // Floating Action Button
  floatingButton: {
    position: 'absolute',
    right: 24,
    bottom: 40,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },

  // Caregiver Composer Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 40,
    padding: 24,
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
    color: COLORS.title,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalForm: {
    gap: 16,
    marginBottom: 24,
  },
  imagePicker: {
    borderRadius: 24,
    minHeight: 200,
    backgroundColor: COLORS.chip,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerPreview: {
    width: '100%',
    height: 200,
  },
  pickerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.title,
  },
  input: {
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: COLORS.chip,
    paddingHorizontal: 20,
    fontSize: 16,
    color: COLORS.title,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 20,
    backgroundColor: COLORS.chip,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 16,
    color: COLORS.title,
  },
  previewCard: {
    borderRadius: 20,
    backgroundColor: COLORS.pinkSoft,
    padding: 16,
    gap: 8,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.pink,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.title,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 999,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.subtitle,
  },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 999,
    backgroundColor: COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Patient Viewer Modal
  viewerSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // Light, friendly background
  },
  viewerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  viewerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  viewerGhostButton: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: COLORS.blueSoft,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewerGhostButtonDanger: {
    backgroundColor: COLORS.dangerSoft,
  },
  viewerGhostButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.blue,
  },
  viewerGhostButtonDangerText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.danger,
  },
  viewerCloseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  viewerImageContainer: {
    width: '100%',
    height: 380,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkSoft,
  },
  viewerInfoCard: {
    paddingVertical: 8,
    gap: 16,
  },
  viewerTitle: {
    fontSize: 36, // Massive friendly text
    lineHeight: 42,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    letterSpacing: -0.5,
  },
  viewerRelationshipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.pinkSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  viewerRelationshipText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.pink,
  },
  viewerDescription: {
    fontSize: 22, // Large text for easy reading
    lineHeight: 32,
    color: COLORS.subtitle,
    fontWeight: '500',
  },
  viewerSpeakButton: {
    minHeight: 80, // Massive touch target
    borderRadius: 999,
    backgroundColor: COLORS.pink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  viewerSpeakButtonActive: {
    backgroundColor: '#C5638D', // Darker pink when pressed/active
  },
  viewerSpeakButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
