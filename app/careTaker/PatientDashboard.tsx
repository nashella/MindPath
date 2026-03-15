import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { usePatientContext } from './patient-context';

// Unified modern soft palette
const COLORS = {
  background: '#FAFAFA',
  title: '#1A1A2E',
  subtitle: '#6B6B80', 
  chip: '#F4F4F6',
  white: '#FFFFFF',
  
  // Primary Accents
  blue: '#4A90D9',
  green: '#6DBF8A',
  pink: '#D887A6',
  purple: '#B786F7',
  orange: '#E8925E',

  // Soft Pastel Backgrounds for visual chunking
  blueSoft: '#EBF4FC',
  greenSoft: '#ECF9F1',
  pinkSoft: '#FDF2F6',
  purpleSoft: '#F6EDFD',
  orangeSoft: '#FDF5E8',
};

export default function PatientDashboard() {
  const router = useRouter();
  const {
    patientName,
    patientAge,
    caregiverName,
    caregiverPhoto,
    hasLinkedPatient,
    hasActiveCaregiver,
    isDeviating,
    schedule,
    updateScheduleItem,
  } = usePatientContext();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const nextTasks = schedule.filter((i) => i.status !== 'completed');
  const [taskIndex, setTaskIndex] = React.useState(0);
  const currentTask = nextTasks[taskIndex] ?? null;
  const hasNext = taskIndex < nextTasks.length - 1;

  useEffect(() => {
    if (taskIndex > 0 && taskIndex >= nextTasks.length) {
      setTaskIndex(Math.max(nextTasks.length - 1, 0));
    }
  }, [nextTasks.length, taskIndex]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}>

        <View style={styles.topBar}>
          <Text style={styles.appName}>MindPath</Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await signOut(getAuth());
              router.replace('/');
            }}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.btnPressed]}>
            <MaterialCommunityIcons name="logout-variant" size={18} color={COLORS.subtitle} />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* ── Section 1: Identity (Soft Purple Card) ── */}
        <View style={[styles.softCard, { backgroundColor: COLORS.purpleSoft }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="face-man-profile" size={28} color={COLORS.purple} />
            <Text style={[styles.eyebrow, { color: COLORS.purple }]}>Hello!!</Text>
          </View>
          <Text style={styles.h1}>{patientName}.</Text>
          <Text style={styles.subhead}>
            {patientAge > 0
              ? `${patientAge} years old`
              : ''}
          </Text>
          {!hasLinkedPatient ? (
            <View style={styles.calloutBox}>
              <MaterialCommunityIcons name="link-variant" size={20} color={COLORS.purple} />
              <Text style={styles.calloutText}>
                Ask a caregiver for help
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Section 2: Caretaker (Soft Green Card) ── */}
        <View style={[styles.softCard, { backgroundColor: COLORS.greenSoft }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="hand-heart" size={28} color={COLORS.green} />
            <Text style={[styles.eyebrow, { color: COLORS.green }]}>Helping You Today is</Text>
          </View>

          <View style={styles.careRow}>
            <View style={styles.photoWrap}>
              {caregiverPhoto ? (
                <Image source={{ uri: caregiverPhoto }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons name="account" size={40} color={COLORS.green} />
                </View>
              )}
            </View>

            <View style={styles.careInfo}>
              <Text style={styles.careName}>{caregiverName || 'No Caregiver'}</Text>
              <Text style={styles.careRole}>
                {hasActiveCaregiver ? '' : 'has not checked in yet today.'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section 3: Next task (Elevated White Card) ── */}
        <View style={styles.taskSection}>
          <Text style={styles.sectionHeader}>Task</Text>

          {currentTask ? (
            <>
              <Text style={styles.taskCounter}>
                Task {taskIndex + 1} of {nextTasks.length}
              </Text>

              <View style={styles.taskCard}>
                {currentTask.image ? (
                  <Image
                    source={typeof currentTask.image === 'string' ? { uri: currentTask.image } : currentTask.image}
                    style={styles.taskImage}
                  />
                ) : (
                  <View style={styles.taskImagePlaceholder}>
                    <MaterialCommunityIcons name="image-outline" size={56} color={COLORS.blue} />
                  </View>
                )}

                <View style={styles.taskCardBody}>
                  <View style={styles.taskMetaRow}>
                    <View style={styles.timeBadge}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.blue} />
                      <Text style={styles.timeTxt}>{currentTask.time}</Text>
                    </View>
                    
                    {currentTask.urgent ? (
                      <View style={styles.urgentBadge}>
                        <MaterialCommunityIcons name="alert-circle" size={16} color={COLORS.orange} />
                        <Text style={styles.urgentTxt}>Urgent</Text>
                      </View>
                    ) : null}
                  </View>
                  
                  <Text style={styles.taskCardTitle}>{currentTask.activity}</Text>
                  {currentTask.note ? <Text style={styles.taskCardNote}>{currentTask.note}</Text> : null}
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  updateScheduleItem(currentTask.id, { status: 'completed' });
                  if (hasNext) setTaskIndex(0);
                }}
                style={({ pressed }) => [styles.doneBtn, pressed && styles.btnPressed]}>
                <MaterialCommunityIcons name="check-circle" size={28} color={COLORS.white} />
                <Text style={styles.doneBtnTxt}>
                  {hasNext ? 'Done — show next task' : 'All done for today!'}
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.allDoneCard}>
              <MaterialCommunityIcons name="party-popper" size={48} color={COLORS.green} />
              <Text style={styles.allDoneText}>You finished all task for today</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/patient/schedule')}
            style={styles.ghostBtn}>
            <Text style={styles.ghostBtnTxt}>Calender</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.blue} />
          </Pressable>
        </View>

        {/* ── Section 4: Help (Soft Pink Area) ── */}
        <View style={[styles.softCard, { backgroundColor: COLORS.pinkSoft }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="lifebuoy" size={28} color={COLORS.pink} />
            <Text style={[styles.eyebrow, { color: COLORS.pink }]}>Need Help?</Text>
          </View>
          
          <Text style={styles.h2}>
            {isDeviating ? 'Let us guide you.' : 'We are here for you.'}
          </Text>

          <View style={styles.helpButtonStack}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/patient/guidance')}
              style={({ pressed }) => [
                styles.primaryPillBtn, 
                { backgroundColor: isDeviating ? COLORS.orange : COLORS.pink },
                pressed && styles.btnPressed
              ]}>
              <MaterialCommunityIcons name="navigation-variant" size={24} color={COLORS.white} />
              <Text style={styles.primaryPillBtnTxt}>
                {isDeviating ? 'Show Directions Home' : 'Guidance'}
              </Text>
            </Pressable>


          </View>
        </View>

      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20, 
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.subtitle,
    paddingTop: 16,
    paddingBottom: 8,
    fontFamily: Fonts.rounded,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.chip,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signOutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.subtitle,
  },

  // Soft Chunking Cards
  softCard: {
    borderRadius: 32,
    padding: 24,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 16, 
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Fonts.rounded,
  },
  h1: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subhead: {
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.title,
    fontWeight: '500',
    opacity: 0.8,
  },
  calloutBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  calloutText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.purple,
    fontWeight: '700',
  },

  // Caregiver Section
  careRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  photoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  careInfo: {
    flex: 1,
    gap: 4,
  },
  careName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    letterSpacing: -0.3,
  },
  careRole: {
    fontSize: 18,
    color: COLORS.title,
    fontWeight: '500',
    opacity: 0.8,
  },

  // Tasks Section
  taskSection: {
    paddingVertical: 8,
    gap: 12,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
  },
  taskCounter: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.subtitle,
  },
  taskCard: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  taskImage: {
    width: '100%',
    height: 220, 
  },
  taskImagePlaceholder: {
    width: '100%',
    height: 220,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCardBody: {
    padding: 24,
    gap: 12,
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.blueSoft,
  },
  timeTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.blue,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.orangeSoft,
  },
  urgentTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.orange,
  },
  taskCardTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
  },
  taskCardNote: {
    fontSize: 18,
    lineHeight: 26,
    color: COLORS.subtitle,
    fontWeight: '500',
  },

  // Done Button
  doneBtn: {
    minHeight: 72, 
    borderRadius: 999,
    backgroundColor: COLORS.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  doneBtnTxt: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  
  allDoneCard: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  allDoneText: {
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.title,
    fontWeight: '700',
    textAlign: 'center',
  },

  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  ghostBtnTxt: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.blue,
  },

  // Help Section Buttons
  helpButtonStack: {
    gap: 12,
    marginTop: 8,
  },
  primaryPillBtn: {
    minHeight: 64,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryPillBtnTxt: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  secondaryPillBtn: {
    minHeight: 64,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  secondaryPillBtnTxt: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.pink,
  },
});
