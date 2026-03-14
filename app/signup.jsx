import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

const COLORS = {
  background: '#FBF8F4',
  title: '#1A1A2E',
  subtitle: '#707084',
  patientButton: '#A9D9EE',
  caregiverButton: '#A9DC97',
  iconCircle: '#F4C9D8',
  white: '#FFFFFF',
};

function RoleButton({ icon, label, backgroundColor, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleButton,
        { backgroundColor },
        pressed && styles.roleButtonPressed,
      ]}>
     <MaterialCommunityIcons name="human-male" size={24} color="black" />
      <Text style={styles.roleButtonText}>{label}</Text>
    </Pressable>
  );
}

export default function SignupScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View style={styles.screen}>
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Image
              contentFit="contain"
              source={require('../assets/images/brain.png')}
              style={styles.heroIcon}
            />
          </View>

          <Text style={styles.title}>MindPath</Text>
          <Text style={styles.subtitle}>Caring made simple</Text>
        </View>

        <View style={styles.buttonGroup}>
          <RoleButton
            backgroundColor={COLORS.patientButton}
            icon="account-outline"
            label="I'm a Patient"
            onPress={() => {}}
          />

          <RoleButton
            backgroundColor={COLORS.caregiverButton}
            icon="shield-check-outline"
            label="I'm a Caregiver"
            onPress={() => router.replace('/(tabs)/index')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 56,
  },
  iconCircle: {
    width: 116,
    height: 116,
   
    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 28,
  },
  heroIcon: {
    width: 68,
    height: 68,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    color: COLORS.subtitle,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: 20,
  },
  roleButton: {
    minHeight: 82,
    borderRadius: 22,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    shadowColor: '#8D8D8D',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  roleButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  roleButtonText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: COLORS.title,
    fontFamily: Fonts.sans,
  },
});
