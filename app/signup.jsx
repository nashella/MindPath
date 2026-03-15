import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import { Fonts } from '@/constants/theme';
import { auth } from '@/lib/firebase';

const COLORS = {
  background: '#FBF8F4',
  title: '#1A1A2E',
  subtitle: '#707084',
  patientButton: '#A9D9EE',
  caregiverButton: '#A9DC97',
  accent: '#4A90D9',
  card: '#FFFFFF',
  border: '#E7DED4',
  iconCircle: '#F4C9D8',
  success: '#6DBF8A',
  error: '#E05C5C',
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
      <MaterialCommunityIcons name={icon} size={24} color={COLORS.title} />
      <Text style={styles.roleButtonText}>{label}</Text>
    </Pressable>
  );
}

function FormField({ icon, label, ...inputProps }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View style={styles.inputShell}>
        <MaterialCommunityIcons name={icon} size={22} color={COLORS.accent} />
        <TextInput
          placeholderTextColor={COLORS.subtitle}
          selectionColor={COLORS.accent}
          style={styles.input}
          {...inputProps}
        />
      </View>
    </View>
  );
}

export default function SignupScreen() {
  const router = useRouter();
  const [showCaregiverAuth, setShowCaregiverAuth] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resetMessages = () => {
    setStatus('');
    setIsError(false);
  };

  const openCaregiverAuth = () => {
    resetMessages();
    setAuthMode('signin');
    setShowCaregiverAuth(true);
  };

  const returnToLanding = () => {
    resetMessages();
    setEmail('');
    setPassword('');
    setShowCaregiverAuth(false);
    setAuthMode('signin');
  };

  const toggleAuthMode = () => {
    resetMessages();
    setAuthMode((currentMode) => (currentMode === 'signin' ? 'signup' : 'signin'));
  };

  const handleCaregiverAuth = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setIsError(true);
      setStatus('Enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setStatus('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        setStatus('Account created. Opening dashboard...');
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        setStatus('Sign in successful. Opening dashboard...');
      }

      router.replace('/(tabs)/dashboard');
    } catch (error) {
      setIsError(true);
      setStatus(error.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            {!showCaregiverAuth ? (
              <View style={styles.buttonGroup}>
                <RoleButton
                  backgroundColor={COLORS.patientButton}
                  icon="account-outline"
                  label="I'm a Patient"
                  onPress={() => {
                    resetMessages();
                    router.push('/patient');
                  }}
                />

                <RoleButton
                  backgroundColor={COLORS.caregiverButton}
                  icon="shield-check-outline"
                  label="I'm a Caregiver"
                  onPress={openCaregiverAuth}
                />

                {status ? (
                  <Text style={[styles.landingStatus, isError && styles.errorText]}>{status}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.authCard}>
                <View style={styles.authHeader}>
                  <View style={styles.authHeadingWrap}>
                    <Text style={styles.authTitle}>
                      {authMode === 'signin' ? 'Caregiver Sign In' : 'Create Caregiver Account'}
                    </Text>
                    <Text style={styles.authSubtitle}>
                      Use your Firebase email and password to continue.
                    </Text>
                  </View>

                  <Pressable accessibilityRole="button" onPress={toggleAuthMode} style={styles.modeToggle}>
                    <Text style={styles.modeToggleText}>
                      {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                    </Text>
                  </Pressable>
                </View>

                <FormField
                  autoCapitalize="none"
                  autoCorrect={false}
                  icon="email-outline"
                  keyboardType="email-address"
                  label="Email"
                  onChangeText={setEmail}
                  placeholder="caregiver@email.com"
                  textContentType="emailAddress"
                  value={email}
                />

                <FormField
                  autoCapitalize="none"
                  autoCorrect={false}
                  icon="lock-outline"
                  label="Password"
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  textContentType={authMode === 'signup' ? 'newPassword' : 'password'}
                  value={password}
                />

                <View style={styles.statusWrap}>
                  {status ? (
                    <Text style={[styles.statusText, isError ? styles.errorText : styles.successText]}>
                      {status}
                    </Text>
                  ) : (
                    <Text style={styles.statusHint}>
                      {authMode === 'signin'
                        ? 'New caregiver? Tap Sign Up.'
                        : 'Already have an account? Tap Sign In.'}
                    </Text>
                  )}
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={handleCaregiverAuth}
                  style={[styles.submitButton, isLoading && styles.buttonDisabled]}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name={authMode === 'signin' ? 'login' : 'account-plus-outline'}
                        size={22}
                        color="#FFFFFF"
                      />
                      <Text style={styles.submitButtonText}>
                        {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                      </Text>
                    </>
                  )}
                </Pressable>

                <Pressable accessibilityRole="button" onPress={returnToLanding} style={styles.backButton}>
                  <MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.subtitle} />
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: COLORS.iconCircle,
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
  landingStatus: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.subtitle,
    textAlign: 'center',
  },
  authCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 16,
    shadowColor: '#D9D4CC',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 3,
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  authHeadingWrap: {
    flex: 1,
    gap: 4,
  },
  authTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
  },
  authSubtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.subtitle,
  },
  modeToggle: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D5E6F9',
    backgroundColor: '#EEF5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: COLORS.accent,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: COLORS.title,
  },
  inputShell: {
    minHeight: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFEFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    minHeight: 56,
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.title,
  },
  statusWrap: {
    minHeight: 40,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  statusHint: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.subtitle,
  },
  errorText: {
    color: COLORS.error,
  },
  successText: {
    color: COLORS.success,
  },
  submitButton: {
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  backButton: {
    minHeight: 42,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.subtitle,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
});

