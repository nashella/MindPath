import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

const ACTIONS = [
  {
    title: 'Brain Exercises',
    description: 'Keep your mind active',
    icon: 'brain',
    accent: '#5FC9A8',
    background: '#E8FAF4',
    iconBackground: '#D9F5EB',
  },
  {
    title: 'My Memories',
    description: 'Photos, music & stories',
    icon: 'heart',
    accent: '#EA8FA0',
    background: '#FFECEE',
    iconBackground: '#FFDDE3',
  },
] as const;

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good Morning!';
  }

  if (hour < 18) {
    return 'Good Afternoon!';
  }

  return 'Good Evening!';
}

type ActionCardProps = {
  title: string;
  description: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  accent: string;
  background: string;
  iconBackground: string;
};

function ActionCard({
  title,
  description,
  icon,
  accent,
  background,
  iconBackground,
}: ActionCardProps) {
  return (
    <Pressable style={[styles.actionCard, { backgroundColor: background }]}>
      <View style={[styles.actionIconWrap, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons name={icon} size={28} color={accent} />
      </View>

      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={28} color={`${accent}88`} />
    </Pressable>
  );
}

function Mascot() {
  return (
    <View style={styles.mascotShell}>
      <View style={styles.mascotFace}>
        <View style={[styles.mascotCheek, styles.mascotCheekLeft]} />
        <View style={[styles.mascotCheek, styles.mascotCheekRight]} />

        <View style={styles.mascotEyes}>
          <View style={styles.mascotEye}>
            <View style={styles.mascotPupil} />
          </View>
          <View style={styles.mascotEye}>
            <View style={styles.mascotPupil} />
          </View>
        </View>

        <View style={styles.mascotSmile} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.brand}>MindPath</Text>

          <View style={styles.hero}>
            <Mascot />
            <Text style={styles.greeting}>{getGreeting()}</Text>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color="#F1C453" />
            </View>

            <View style={styles.tipCopy}>
              <Text style={styles.tipLabel}>Daily Tip</Text>
              <Text style={styles.tipText}>Drink water - hydration helps your brain work better.</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>What would you like to do?</Text>

          <View style={styles.actionsList}>
            {ACTIONS.map((action) => (
              <ActionCard key={action.title} {...action} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FCFAFF',
  },
  contentContainer: {
    paddingBottom: 120,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    gap: 28,
  },
  brand: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#111111',
    fontFamily: Fonts.rounded,
  },
  hero: {
    alignItems: 'center',
    gap: 16,
  },
  mascotShell: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotFace: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFE2D3',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mascotCheek: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D9C4F7',
    top: 42,
  },
  mascotCheekLeft: {
    left: -2,
  },
  mascotCheekRight: {
    right: -2,
  },
  mascotEyes: {
    flexDirection: 'row',
    gap: 18,
    marginTop: -8,
  },
  mascotEye: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotPupil: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#454545',
  },
  mascotSmile: {
    width: 22,
    height: 11,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#D2936E',
    marginTop: 10,
  },
  greeting: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
    fontFamily: Fonts.rounded,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: '#FFF8E7',
    borderRadius: 22,
    shadowColor: '#E8C968',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 3,
  },
  tipIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF1BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCopy: {
    flex: 1,
    gap: 4,
  },
  tipLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#AE9B68',
  },
  tipText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#2E2B28',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  actionsList: {
    gap: 18,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 28,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  actionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  actionDescription: {
    fontSize: 15,
    lineHeight: 20,
    color: '#8A86A2',
    fontWeight: '500',
  },
});
