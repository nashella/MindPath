import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type OverviewCard = {
  title: string;
  value: string;
  note: string;
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  valueColor?: string;
};

type QuickAction = {
  label: string;
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  description: string;
  route?: string;
};

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
  pink: '#D06EA0',
  purple: '#9F70F5',
  amber: '#D4A017',
  amberBg: '#FFF8E1',
  amberBorder: '#F0D060',
  sectionHeaderBg: 'rgba(255,255,255,0.70)',
};

const OVERVIEW_CARDS: OverviewCard[] = [
  {
    title: 'Status',
    value: 'All Good',
    note: 'Patient is safe at home',
    icon: 'check-circle-outline',
    iconColor: COLORS.green,
    iconBackground: 'rgba(47, 165, 96, 0.14)',
    valueColor: COLORS.green,
  },
  {
    title: 'Location',
    value: 'Home',
    note: 'Inside safe zone',
    icon: 'map-marker-outline',
    iconColor: COLORS.blue,
    iconBackground: 'rgba(88, 153, 200, 0.16)',
  },
  {
    title: 'Medications',
    value: '2 / 3',
    note: 'Taken today',
    icon: 'pill',
    iconColor: COLORS.pink,
    iconBackground: 'rgba(208, 110, 160, 0.14)',
  },
  {
    title: 'Activity',
    value: 'Normal',
    note: 'Last active 5m ago',
    icon: 'pulse',
    iconColor: COLORS.purple,
    iconBackground: 'rgba(159, 112, 245, 0.14)',
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Medications',
    icon: 'pill',
    iconColor: COLORS.pink,
    iconBackground: 'rgba(208, 110, 160, 0.12)',
    description: 'Track & confirm doses',
    route: '/medication',
  },
  {
    label: 'Daily Tasks',
    icon: 'format-list-checks',
    iconColor: COLORS.green,
    iconBackground: 'rgba(47, 165, 96, 0.12)',
    description: 'View care checklist',
    route: '/dailytask',
  },
  {
    label: 'Schedule',
    icon: 'calendar-blank-outline',
    iconColor: COLORS.blue,
    iconBackground: 'rgba(88, 153, 200, 0.14)',
    description: 'Appointments & visits',
    route: '/calender',
  },
  {
    label: 'Safe Zones',
    icon: 'shield-home-outline',
    iconColor: COLORS.purple,
    iconBackground: 'rgba(159, 112, 245, 0.14)',
    description: 'Manage geo-fences',
  },
  {
    label: 'Reports',
    icon: 'chart-line',
    iconColor: COLORS.amber,
    iconBackground: 'rgba(212, 160, 23, 0.12)',
    description: 'Health summaries',
  },
];

const ALERTS = [
  {
    id: '1',
    title: 'Medication reminder',
    text: 'Afternoon dose still needs confirmation.',
    icon: 'bell-ring-outline' as IconName,
    color: COLORS.amber,
    bg: COLORS.amberBg,
    border: COLORS.amberBorder,
    textColor: '#6C5600',
    subtextColor: '#8C7222',
  },
];

function DashboardCard({
  title,
  value,
  note,
  icon,
  iconColor,
  iconBackground,
  valueColor,
  isWide,
}: OverviewCard & { isWide: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={isWide ? styles.dashboardCardWide : styles.dashboardCardFull}>
      <Animated.View style={[styles.dashboardCard, { transform: [{ scale }] }]}>
        <View style={[styles.dashboardIconWrap, { backgroundColor: iconBackground }]}>
          <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
        </View>
        <Text style={styles.cardLabel}>{title}</Text>
        <Text style={[styles.cardValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        <Text style={styles.cardNote}>{note}</Text>
      </Animated.View>
    </Pressable>
  );
}

function QuickActionTile({
  label,
  icon,
  iconColor,
  iconBackground,
  description,
  onPress,
}: QuickAction & { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button">
      <Animated.View style={[styles.quickActionTile, { transform: [{ scale }] }]}>
        <View style={[styles.quickActionIconWrap, { backgroundColor: iconBackground }]}>
          <MaterialCommunityIcons name={icon} size={26} color={iconColor} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
        <Text style={styles.quickActionDesc}>{description}</Text>
      </Animated.View>
    </Pressable>
  );
}

function SectionHeader({ title, actionLabel }: { title: string; actionLabel?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && (
        <Pressable accessibilityRole="button">
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function CaregiverDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={styles.heroPanel}>
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />
          <View style={styles.heroRow}>
            <View style={styles.heroIconCircle}>
              <MaterialCommunityIcons name="shield-check-outline" size={28} color={COLORS.green} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>Caregiver Dashboard</Text>
              <Text style={styles.heroTitle}>Welcome Back</Text>
            </View>
            <Pressable accessibilityRole="button" style={styles.heroNotifButton}>
              <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.textSecondary} />
              <View style={styles.notifDot} />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>

          {/* ── Overview Cards ── */}
          <SectionHeader title="Overview" />
          <View style={styles.cardGrid}>
            {OVERVIEW_CARDS.map((card) => (
              <DashboardCard key={card.title} isWide={isWide} {...card} />
            ))}
          </View>

          {/* ── Quick Actions landscape panel ── */}
          <SectionHeader title="Quick Actions" actionLabel="See all" />
          <View style={styles.quickActionsPanel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsScroll}>
              {QUICK_ACTIONS.map((action) => (
                <QuickActionTile
                  key={action.label}
                  onPress={() => {
                    if (action.route) {
                      router.push(action.route);
                    }
                  }}
                  {...action}
                />
              ))}
            </ScrollView>
          </View>

          {/* ── Alerts ── */}
          <SectionHeader title="Recent Alerts" actionLabel="Dismiss all" />
          {ALERTS.map((alert) => (
            <View
              key={alert.id}
              style={[styles.alertCard, { backgroundColor: alert.bg, borderColor: alert.border }]}>
              <View style={styles.alertRow}>
                <View style={[styles.alertBadge, { backgroundColor: 'rgba(255,255,255,0.80)' }]}>
                  <MaterialCommunityIcons name={alert.icon} size={20} color={alert.color} />
                </View>
                <View style={styles.alertCopy}>
                  <Text style={[styles.alertTitle, { color: alert.textColor }]}>{alert.title}</Text>
                  <Text style={[styles.alertText, { color: alert.subtextColor }]}>{alert.text}</Text>
                </View>
                <Pressable accessibilityRole="button" style={styles.alertChevron}>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={alert.color} />
                </Pressable>
              </View>
            </View>
          ))}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.pageBackground,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  /* Hero */
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
  heroIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
    fontSize: 34,
    lineHeight: 40,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  heroNotifButton: {
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
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF5350',
    borderWidth: 1.5,
    borderColor: COLORS.cardBackground,
  },

  /* Body */
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 10,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  sectionAction: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.blue,
    fontWeight: '600',
  },

  /* Overview cards */
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 10,
  },
  dashboardCardWide: {
    width: '48.5%',
  },
  dashboardCardFull: {
    width: '100%',
  },
  dashboardCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 22,
    padding: 18,
    minHeight: 134,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#C8D4E8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 4,
  },
  dashboardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardNote: {
    fontSize: 13,
    lineHeight: 18,
    color: '#A0A8B8',
    fontWeight: '500',
  },

  /* ── Quick Actions landscape panel ── */
  quickActionsPanel: {
    marginHorizontal: -20,          // bleed edge-to-edge
    marginBottom: 10,
  },
  quickActionsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 12,
  },
  quickActionTile: {
    width: 140,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    paddingBottom: 18,
    shadowColor: '#C8D4E8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 4,
    gap: 10,
  },
  quickActionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  quickActionDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  /* Alerts */
  alertCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  alertBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertCopy: {
    flex: 1,
    gap: 3,
  },
  alertTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  alertText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  alertChevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
