import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import React from 'react';
import {
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
};

const COLORS = {
  pageBackground: '#F4F6FB',
  headerBackground: '#B8E2AA',
  headerGlow: 'rgba(255, 255, 255, 0.24)',
  textPrimary: '#1F2A44',
  textSecondary: '#7D8798',
  cardBackground: '#FFFFFF',
  border: '#E8EDF5',
  green: '#32A565',
  blue: '#62A8C8',
  pink: '#D887A6',
  purple: '#B786F7',
  yellowSoft: '#FFF7D6',
  yellowBorder: '#F1DF8F',
};

const OVERVIEW_CARDS: OverviewCard[] = [
  {
    title: 'Status',
    value: 'All Good',
    note: 'Patient is safe at home',
    icon: 'check-circle-outline',
    iconColor: COLORS.green,
    iconBackground: 'rgba(50, 165, 101, 0.18)',
    valueColor: COLORS.green,
  },
  {
    title: 'Location',
    value: 'Home',
    note: 'Inside safe zone',
    icon: 'map-marker-outline',
    iconColor: COLORS.blue,
    iconBackground: 'rgba(98, 168, 200, 0.20)',
  },
  {
    title: 'Medications',
    value: '2 / 3',
    note: 'Taken today',
    icon: 'pill',
    iconColor: COLORS.pink,
    iconBackground: 'rgba(216, 135, 166, 0.18)',
  },
  {
    title: 'Activity',
    value: 'Normal',
    note: 'Last active 5m ago',
    icon: 'pulse',
    iconColor: COLORS.purple,
    iconBackground: 'rgba(183, 134, 247, 0.18)',
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Meds',
    icon: 'pill',
    iconColor: COLORS.pink,
  },
  {
    label: 'Tasks',
    icon: 'format-list-checks',
    iconColor: COLORS.green,
  },
  {
    label: 'Schedule',
    icon: 'calendar-blank-outline',
    iconColor: COLORS.blue,
  },
  {
    label: 'Zones',
    icon: 'shield-home-outline',
    iconColor: COLORS.purple,
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
  return (
    <View style={[styles.dashboardCard, isWide ? styles.dashboardCardWide : styles.dashboardCardFull]}>
      <View style={[styles.dashboardIconWrap, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons name={icon} size={26} color={iconColor} />
      </View>

      <Text style={styles.cardLabel}>{title}</Text>
      <Text style={[styles.cardValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.cardNote}>{note}</Text>
    </View>
  );
}

function QuickActionCard({ label, icon, iconColor, isWide }: QuickAction & { isWide: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {}}
      style={({ pressed }) => [
        styles.quickActionCard,
        isWide ? styles.quickActionCardWide : styles.quickActionCardCompact,
        pressed && styles.quickActionPressed,
      ]}>
      <MaterialCommunityIcons name={icon} size={30} color={iconColor} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

export default function CaregiverDashboard() {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroPanel}>
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />

          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <View style={styles.heroIconCircle}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={30}
                  color={COLORS.green}
                />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroLabel}>Caregiver Dashboard</Text>
                <Text style={styles.heroTitle}>Welcome Back</Text>
              </View>
            </View>

            <Pressable accessibilityRole="button" onPress={() => {}} style={styles.heroActionButton}>
              <MaterialCommunityIcons name="logout" size={28} color={COLORS.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.cardGrid}>
            {OVERVIEW_CARDS.map((card) => (
              <DashboardCard key={card.title} isWide={isWide} {...card} />
            ))}
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard key={action.label} isWide={isWide} {...action} />
            ))}
          </View>

          <Text style={styles.sectionTitle}>Recent Alerts</Text>

          <View style={styles.alertCard}>
            <View style={styles.alertTopRow}>
              <View style={styles.alertBadge}>
                <MaterialCommunityIcons
                  name="bell-ring-outline"
                  size={20}
                  color="#A08416"
                />
              </View>
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>Medication reminder needs review</Text>
                <Text style={styles.alertText}>
                  Afternoon medication still needs confirmation. Check in when you are ready.
                </Text>
              </View>
              <Text style={styles.alertTime}>5 min ago</Text>
            </View>
          </View>
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
    paddingBottom: 40,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  heroLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    fontSize: 38,
    lineHeight: 44,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  heroActionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
  },
  body: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 22,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  dashboardCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 20,
    minHeight: 138,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#D8E0EC',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 4,
  },
  dashboardCardWide: {
    width: '48.9%',
  },
  dashboardCardFull: {
    width: '100%',
  },
  dashboardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 17,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardNote: {
    fontSize: 15,
    lineHeight: 20,
    color: '#98A1AF',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionCard: {
    minHeight: 108,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#D8E0EC',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 4,
  },
  quickActionCardWide: {
    width: '23.9%',
  },
  quickActionCardCompact: {
    width: '48%',
  },
  quickActionPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  quickActionLabel: {
    fontSize: 16,
    lineHeight: 22,
    color: '#5E6776',
    fontWeight: '500',
  },
  alertCard: {
    backgroundColor: COLORS.yellowSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.yellowBorder,
    padding: 18,
  },
  alertTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  alertBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#6C5600',
    fontWeight: '800',
  },
  alertText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#8C7722',
    fontWeight: '500',
  },
  alertTime: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9B8429',
    fontWeight: '700',
  },
});
