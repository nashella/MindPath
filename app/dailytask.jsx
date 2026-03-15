import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { onAuthStateChanged } from 'firebase/auth';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Modal,
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
  saveDailyTask,
  subscribeToDailyTasks,
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
  overlay: 'rgba(17, 24, 39, 0.32)',
  danger: '#E05C5C',
};

function getTaskAccent(index) {
  return index % 2 === 0 ? COLORS.blue : COLORS.green;
}

export default function DailyTaskScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState(auth.currentUser?.uid ?? null);
  const [tasks, setTasks] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [selectedTaskTime, setSelectedTaskTime] = useState('8:00 AM');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('success');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setIsLoadingTasks(false);
      return undefined;
    }

    setIsLoadingTasks(true);

    return subscribeToDailyTasks(
      userId,
      (items) => {
        setTasks(items);
        setIsLoadingTasks(false);
      },
      (error) => {
        console.error('Daily task Firestore load failed', error);
        setStatusTone('error');
        setStatusMessage(
          formatFirebaseError(error, 'Could not load daily tasks from Firestore.')
        );
        setIsLoadingTasks(false);
      }
    );
  }, [userId]);

  const openAddModal = () => {
    setTaskInput('');
    setSelectedTaskTime('8:00 AM');
    setStatusMessage('');
    setIsAddModalVisible(true);
  };

  const closeAddModal = () => {
    setTaskInput('');
    setIsAddModalVisible(false);
    setIsTimePickerVisible(false);
  };

  const handleAddTask = async () => {
    const trimmedTask = taskInput.trim();

    if (!trimmedTask) {
      setStatusTone('error');
      setStatusMessage('Write a task before saving it.');
      return;
    }

    if (!userId) {
      setStatusTone('error');
      setStatusMessage('Sign in again before adding a daily task.');
      return;
    }

    setIsSavingTask(true);

    try {
      await saveDailyTask(userId, {
        title: trimmedTask,
        time: selectedTaskTime,
      });

      setTaskInput('');
      setSelectedTaskTime('8:00 AM');
      setIsAddModalVisible(false);
      setIsTimePickerVisible(false);
      setStatusTone('success');
      setStatusMessage('Daily task saved to Firestore.');
    } catch (error) {
      console.error('Daily task Firestore save failed', error);
      setStatusTone('error');
      setStatusMessage(
        formatFirebaseError(error, 'Could not save the daily task.')
      );
    } finally {
      setIsSavingTask(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroPanel}>
            <View style={styles.heroGlowTop} />
            <View style={styles.heroGlowBottom} />

            <View style={styles.heroRow}>
              <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.heroBackButton}>
                <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.textSecondary} />
              </Pressable>

              <View style={styles.heroCopy}>
                <Text style={styles.heroLabel}>Caregiver Planner</Text>
                <Text style={styles.heroTitle}>Daily Tasks</Text>
              </View>

              <View style={styles.heroIconCircle}>
                <MaterialCommunityIcons name="format-list-checks" size={24} color={COLORS.green} />
              </View>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Tasks for today</Text>
              <Text style={styles.summarySubtitle}>
                Add caregiver tasks and assign a real time for each one.
              </Text>
            </View>

            <View style={styles.taskList}>
              {statusMessage ? (
                <Text
                  style={[
                    styles.statusText,
                    statusTone === 'error' && styles.statusTextError,
                  ]}>
                  {statusMessage}
                </Text>
              ) : null}

              {isLoadingTasks ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Loading tasks...</Text>
                  <Text style={styles.emptyText}>Reading daily tasks from Firestore.</Text>
                </View>
              ) : tasks.length > 0 ? (
                tasks.map((task, index) => (
                  <View key={task.id} style={styles.taskCard}>
                    <View
                      style={[
                        styles.taskAccent,
                        { backgroundColor: task.accent ?? getTaskAccent(index) },
                      ]}
                    />
                    <View style={styles.taskCopy}>
                      <Text style={styles.taskTime}>{task.time}</Text>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No daily tasks yet</Text>
                  <Text style={styles.emptyText}>Use the plus button to add the first task for this caregiver.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable accessibilityRole="button" onPress={openAddModal} style={styles.addTaskPill}>
            <Text style={styles.addTaskText}>Add task for today</Text>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={openAddModal} style={styles.fabButton}>
            <MaterialCommunityIcons name="plus" size={34} color={COLORS.textPrimary} />
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeAddModal}
        transparent
        visible={isAddModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add daily task</Text>
            <Text style={styles.modalSubtitle}>Type the task and pick the time it should be done.</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsTimePickerVisible(true)}
              style={styles.timeSelectButton}>
              <Text style={styles.timeSelectButtonLabel}>Time</Text>
              <View style={styles.timeSelectValueWrap}>
                <Text style={styles.timeSelectValue}>{selectedTaskTime}</Text>
                <MaterialCommunityIcons name="menu-down" size={22} color={COLORS.textPrimary} />
              </View>
            </Pressable>

            <TextInput
              autoFocus
              multiline
              onChangeText={setTaskInput}
              placeholder="Type your daily task here"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.modalInput}
              textAlignVertical="top"
              value={taskInput}
            />

            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={closeAddModal} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSavingTask}
                onPress={handleAddTask}
                style={[styles.modalAddButton, isSavingTask && styles.modalAddButtonDisabled]}>
                <Text style={styles.modalAddText}>{isSavingTask ? 'Saving...' : 'Add task'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <TimePickerModal
        initialValue={selectedTaskTime}
        onCancel={() => setIsTimePickerVisible(false)}
        onSet={(formattedTime) => {
          setSelectedTaskTime(formattedTime);
          setIsTimePickerVisible(false);
        }}
        title="Select Task Time"
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
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 170,
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
    gap: 18,
  },
  summaryCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 6,
    shadowColor: '#C8D4E8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  summarySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  taskList: {
    gap: 14,
  },
  taskCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    shadowColor: '#C8D4E8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  taskAccent: {
    width: 6,
    height: 44,
    borderRadius: 999,
    marginTop: 2,
  },
  taskCopy: {
    flex: 1,
    gap: 3,
  },
  taskTime: {
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.blue,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontWeight: '700',
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
  bottomBar: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  addTaskPill: {
    flex: 1,
    minHeight: 62,
    borderRadius: 32,
    backgroundColor: '#EDF0F6',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  addTaskText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#878E99',
    fontWeight: '500',
  },
  fabButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: COLORS.cardBackground,
    padding: 22,
    gap: 16,
  },
  modalTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  timeSelectButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFE',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeSelectButtonLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  timeSelectValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSelectValue: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  modalInput: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFE',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
  },
  modalCancelText: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  modalAddButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blue,
  },
  modalAddButtonDisabled: {
    opacity: 0.72,
  },
  modalAddText: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.cardBackground,
    fontWeight: '800',
  },
});
