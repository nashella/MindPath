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

const COLORS = {
  background: '#FAFAFA',
  title: '#1A1A2E',
  subtitle: '#6B6B80',
  chip: '#F4F4F6',
  white: '#FFFFFF',
  blue: '#4A90D9',
  green: '#6DBF8A',
  pink: '#D887A6',
  purple: '#B786F7',
  orange: '#E8925E',
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
    todayPlanItems,
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
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.btnPressed,
            ]}>
            <MaterialCommunityIcons
              color={COLORS.subtitle}
              name="logout-variant"
              size={18}
            />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={[styles.softCard, { backgroundColor: COLORS.purpleSoft }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              color={COLORS.purple}
              name="face-man-profile"
              size={28}
            />
            <Text style={[styles.eyebrow, { color: COLORS.purple }]}>
              Who You Are
            </Text>
          </View>
          <Text style={styles.h1}>You are {patientName}.</Text>
          <Text style={styles.subhead}>
            {patientAge > 0
              ? `You are ${patientAge} years old.`
              : 'Your caregiver can add your age in setup.'}
          </Text>
          {!hasLinkedPatient ? (
            <View style={styles.calloutBox}>
              <MaterialCommunityIcons
                color={COLORS.purple}
                name="link-variant"
                size={20}
              />
              <Text style={styles.calloutText}>
                Ask a caregiver for your join code to connect your account.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.softCard, { backgroundColor: COLORS.greenSoft }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              color={COLORS.green}
              name="hand-heart"
              size={28}
            />
            <Text style={[styles.eyebrow, { color: COLORS.green }]}>
              Helping You Today
            </Text>
          </View>

          <View style={styles.careRow}>
            <View style={styles.photoWrap}>
              {caregiverPhoto ? (
                <Image source={{ uri: caregiverPhoto }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons
                    color={COLORS.green}
                    name="account"
                    size={40}
                  />
                </View>
              )}
            </View>

            <View style={styles.careInfo}>
              <Text style={styles.careName}>{caregiverName || 'No Caregiver'}</Text>
              <Text style={styles.careRole}>
                {hasActiveCaregiver
                  ? 'is here with you today.'
                  : 'has not checked in yet today.'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.taskSection}>
          <Text style={styles.sectionHeader}>What To Do Next</Text>
          <Text style={styles.taskCounter}>
            Today&apos;s plan from daily tasks, medications, and calendar events.
          </Text>

          {todayPlanItems.length ? (
            todayPlanItems.map((item) => {
              const isDailyTask = item.source === 'daily-task';
              const isMedication = item.source === 'medication';
              const isActionable = item.source !== 'calendar-event';
              const isCompleted = item.status === 'completed';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.planCard,
                    isCompleted && styles.planCardCompleted,
                  ]}>
                  <View style={styles.planCardTopRow}>
                    <View style={styles.timeBadge}>
                      <MaterialCommunityIcons
                        color={COLORS.blue}
                        name="clock-outline"
                        size={16}
                      />
                      <Text style={styles.timeTxt}>{item.time}</Text>
                    </View>

                    <View
                      style={[
                        styles.sourceBadge,
                        isDailyTask
                          ? styles.sourceBadgeBlue
                          : isMedication
                            ? styles.sourceBadgeOrange
                            : styles.sourceBadgeGreen,
                      ]}>
                      <Text
                        style={[
                          styles.sourceBadgeText,
                          isDailyTask
                            ? styles.sourceBadgeTextBlue
                            : isMedication
                              ? styles.sourceBadgeTextOrange
                              : styles.sourceBadgeTextGreen,
                        ]}>
                        {isDailyTask
                          ? 'Daily Task'
                          : isMedication
                            ? 'Medication'
                            : 'Calendar'}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.planCardTitle,
                      isCompleted && styles.completedActivityText,
                    ]}>
                    {item.title}
                  </Text>

                  {item.note ? (
                    <Text style={styles.planCardNote}>{item.note}</Text>
                  ) : null}

                  {isActionable ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isCompleted}
                      onPress={() => {
                        void updateScheduleItem(item.id, {
                          status: 'completed',
                        });
                      }}
                      style={({ pressed }) => [
                        styles.inlineDoneButton,
                        isCompleted && styles.inlineDoneButtonCompleted,
                        pressed && !isCompleted && styles.btnPressed,
                      ]}>
                      <MaterialCommunityIcons
                        color={isCompleted ? COLORS.green : COLORS.blue}
                        name={
                          isCompleted
                            ? 'check-circle'
                            : 'check-circle-outline'
                        }
                        size={18}
                      />
                      <Text
                        style={[
                          styles.inlineDoneButtonText,
                          isCompleted &&
                            styles.inlineDoneButtonTextCompleted,
                        ]}>
                        {isCompleted ? 'Done' : isMedication ? 'Mark Taken' : 'Mark Done'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          ) : (
            <View style={styles.allDoneCard}>
              <MaterialCommunityIcons
                color={COLORS.green}
                name="calendar-heart"
                size={48}
              />
              <Text style={styles.allDoneText}>
                There is nothing scheduled for today yet.
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/patient/schedule')}
            style={styles.ghostBtn}>
            <Text style={styles.ghostBtnTxt}>See full schedule</Text>
            <MaterialCommunityIcons
              color={COLORS.blue}
              name="arrow-right"
              size={20}
            />
          </Pressable>
        </View>

        <View style={[styles.softCard, { backgroundColor: COLORS.pinkSoft }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              color={COLORS.pink}
              name="lifebuoy"
              size={28}
            />
            <Text style={[styles.eyebrow, { color: COLORS.pink }]}>
              Need Help?
            </Text>
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
                pressed && styles.btnPressed,
              ]}>
              <MaterialCommunityIcons
                color={COLORS.white}
                name="navigation-variant"
                size={24}
              />
              <Text style={styles.primaryPillBtnTxt}>
                {isDeviating ? 'Show Directions Home' : 'Open Guidance'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/patient/face-scan')}
              style={({ pressed }) => [
                styles.secondaryPillBtn,
                pressed && styles.btnPressed,
              ]}>
              <MaterialCommunityIcons
                color={COLORS.pink}
                name="account-search"
                size={24}
              />
              <Text style={styles.secondaryPillBtnTxt}>
                See Familiar Faces
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
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 20,
    gap: 12,
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  planCardCompleted: {
    opacity: 0.76,
  },
  planCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
  sourceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  sourceBadgeBlue: {
    backgroundColor: COLORS.purpleSoft,
  },
  sourceBadgeGreen: {
    backgroundColor: COLORS.greenSoft,
  },
  sourceBadgeOrange: {
    backgroundColor: COLORS.orangeSoft,
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sourceBadgeTextBlue: {
    color: COLORS.purple,
  },
  sourceBadgeTextGreen: {
    color: COLORS.green,
  },
  sourceBadgeTextOrange: {
    color: COLORS.orange,
  },
  planCardTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
  },
  completedActivityText: {
    color: COLORS.subtitle,
    textDecorationLine: 'line-through',
  },
  planCardNote: {
    fontSize: 16,
    lineHeight: 23,
    color: COLORS.subtitle,
    fontWeight: '500',
  },
  inlineDoneButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.blueSoft,
  },
  inlineDoneButtonCompleted: {
    backgroundColor: COLORS.greenSoft,
  },
  inlineDoneButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.blue,
  },
  inlineDoneButtonTextCompleted: {
    color: COLORS.green,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
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
