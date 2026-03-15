import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
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

import { Fonts } from '@/constants/theme';
import {
  createPatientForCaregiverAccount,
  getUserProfile,
  linkAccountWithJoinCode,
  migrateLegacyAccountIfNeeded,
  normalizeJoinCode,
} from '@/lib/firestore-data';
import { formatFirebaseError } from '@/lib/firebase-errors';
import { auth } from '@/lib/firebase';
import { useLinkedAccount } from '@/lib/use-linked-account';

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
  chip: '#F5EFE7',
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
      <MaterialCommunityIcons name={icon} size={28} color={COLORS.title} />
      <Text style={styles.roleButtonText}>{label}</Text>
    </Pressable>
  );
}

function FormField({ icon, label, ...inputProps }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.subtitle} />
        <TextInput
          placeholderTextColor="#A0A0B0"
          selectionColor={COLORS.accent}
          style={styles.input}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function ChoiceChip({ label, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.choiceChip, selected && styles.choiceChipSelected]}>
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function getAuthTitle(role, authMode) {
  if (role === 'patient') {
    return authMode === 'signin' ? 'Patient Sign In' : 'Patient Sign Up';
  }
  return authMode === 'signin' ? 'Caregiver Sign In' : 'Caregiver Sign Up';
}

function getAuthSubtitle(role, authMode, caregiverSetupMode) {
  if (authMode === 'signin') return 'Enter your email and password.';
  if (role === 'patient') return 'Enter the patient code to link this account.';
  if (caregiverSetupMode === 'connect') return 'Connect this caregiver with a patient code.';
  return 'Create the patient first.';
}

export default function SignupScreen() {
  const router = useRouter();
  const { user, userProfile, isAuthReady, isProfileLoading } = useLinkedAccount();
  const [selectedRole, setSelectedRole] = useState(null);
  const [authMode, setAuthMode] = useState('signin');
  const [caregiverSetupMode, setCaregiverSetupMode] = useState('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthReady || isProfileLoading || !user) {
      return;
    }

    if (userProfile?.role === 'patient') {
      router.replace('/patient');
      return;
    }

    if (userProfile?.role === 'caregiver') {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthReady, isProfileLoading, router, user, userProfile?.role]);

  const resetMessages = () => {
    setStatus('');
    setIsError(false);
  };

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setPatientName('');
    setPatientAge('');
    setJoinCode('');
  };

  const openAuth = (role) => {
    resetMessages();
    resetFields();
    setSelectedRole(role);
    setAuthMode('signin');
    setCaregiverSetupMode(role === 'caregiver' ? 'create' : 'connect');
  };

  const returnToLanding = () => {
    resetMessages();
    resetFields();
    setSelectedRole(null);
    setAuthMode('signin');
    setCaregiverSetupMode('create');
  };

  const toggleAuthMode = () => {
    resetMessages();
    setAuthMode((currentMode) => (currentMode === 'signin' ? 'signup' : 'signin'));
  };

  const routeFromProfile = (profile) => {
    if (profile?.role === 'patient') {
      router.replace('/patient');
      return;
    }
    router.replace('/(tabs)/dashboard');
  };

  const resolveProfileAfterSignIn = async (user) => {
    await migrateLegacyAccountIfNeeded(user);
    const profile = await getUserProfile(user.uid);

    if (!profile?.linkedPatientId || !profile?.role) {
      throw new Error(
        'This account is not linked to a patient yet. Sign up with a join code or ask a caregiver for one.'
      );
    }
    return profile;
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim();

    if (!selectedRole) {
      setIsError(true);
      setStatus('Choose Patient or Caregiver first.');
      return;
    }

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

    if (authMode === 'signup') {
      if (selectedRole === 'caregiver' && caregiverSetupMode === 'create') {
        if (!patientName.trim()) {
          setIsError(true);
          setStatus("Enter the patient's name.");
          return;
        }

        const numericAge = Number(patientAge);
        if (!patientAge.trim() || Number.isNaN(numericAge) || numericAge <= 0) {
          setIsError(true);
          setStatus("Enter the patient's age.");
          return;
        }
      } else if (!normalizeJoinCode(joinCode)) {
        setIsError(true);
        setStatus('Enter the patient join code.');
        return;
      }
    }

    setIsLoading(true);
    resetMessages();

    try {
      if (authMode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

        if (selectedRole === 'caregiver' && caregiverSetupMode === 'create') {
          await createPatientForCaregiverAccount({
            userId: credential.user.uid,
            email: trimmedEmail,
            patientName,
            patientAge,
          });
          setStatus('Account created.');
          router.replace('/(tabs)/dashboard');
          return;
        }

        try {
          await linkAccountWithJoinCode({
            userId: credential.user.uid,
            email: trimmedEmail,
            role: selectedRole,
            joinCode,
          });
        } catch (error) {
          try {
            await deleteUser(credential.user);
          } catch (cleanupError) {
            console.error('Auth cleanup failed after join-code link error', cleanupError);
          }
          throw error;
        }

        setStatus(selectedRole === 'patient' ? 'Patient linked.' : 'Caregiver linked.');
        routeFromProfile({ role: selectedRole });
        return;
      }

      const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const profile = await resolveProfileAfterSignIn(credential.user);

      setStatus('Signed in.');
      routeFromProfile(profile);
    } catch (error) {
      setIsError(true);
      setStatus(formatFirebaseError(error, 'Could not complete authentication.'));
    } finally {
      setIsLoading(false);
    }
  };

  const isCaregiverSignup = selectedRole === 'caregiver' && authMode === 'signup';
  const needsJoinCode =
    authMode === 'signup' && (selectedRole === 'patient' || caregiverSetupMode === 'connect');
  const isSessionResolving = !isAuthReady || (Boolean(user) && isProfileLoading);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.screen}>
            {isSessionResolving ? (
              <View style={styles.sessionLoadingCard}>
                <ActivityIndicator color={COLORS.accent} size="large" />
                <Text style={styles.sessionLoadingTitle}>Opening your account</Text>
                <Text style={styles.sessionLoadingText}>
                  Checking your saved sign-in so you can continue where you left off.
                </Text>
              </View>
            ) : (
              <>
            
                {/* Minimalist Hero Section */}
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

                {!selectedRole ? (
                  <View style={styles.buttonGroup}>
                    <RoleButton
                      backgroundColor={COLORS.patientButton}
                      icon="account-outline"
                      label="I'm a Patient"
                      onPress={() => openAuth('patient')}
                    />
                    <RoleButton
                      backgroundColor={COLORS.caregiverButton}
                      icon="shield-check-outline"
                      label="I'm a Caregiver"
                      onPress={() => openAuth('caregiver')}
                    />
                  </View>
                ) : (
                  <View style={styles.authCard}>
                    <View style={styles.authHeader}>
                      <View style={styles.authHeadingWrap}>
                        <Text style={styles.authTitle}>{getAuthTitle(selectedRole, authMode)}</Text>
                        <Text style={styles.authSubtitle}>
                          {getAuthSubtitle(selectedRole, authMode, caregiverSetupMode)}
                        </Text>
                      </View>

                      <Pressable accessibilityRole="button" onPress={toggleAuthMode} style={styles.modeToggle}>
                        <Text style={styles.modeToggleText}>
                          {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                        </Text>
                      </Pressable>
                    </View>

                    {isCaregiverSignup && (
                      <View style={styles.choiceGroup}>
                        <ChoiceChip
                          label="Create Patient"
                          onPress={() => setCaregiverSetupMode('create')}
                          selected={caregiverSetupMode === 'create'}
                        />
                        <ChoiceChip
                          label="Use Join Code"
                          onPress={() => setCaregiverSetupMode('connect')}
                          selected={caregiverSetupMode === 'connect'}
                        />
                      </View>
                    )}

                    <View style={styles.formContainer}>
                      <FormField
                        autoCapitalize="none"
                        autoCorrect={false}
                        icon="email-outline"
                        keyboardType="email-address"
                        label="Email"
                        onChangeText={setEmail}
                        placeholder={selectedRole === 'patient' ? 'patient@email.com' : 'caregiver@email.com'}
                        textContentType="emailAddress"
                        value={email}
                      />

                      {isCaregiverSignup && caregiverSetupMode === 'create' && (
                        <>
                          <FormField
                            autoCapitalize="words"
                            autoCorrect={false}
                            icon="account-heart-outline"
                            label="Patient Name"
                            onChangeText={setPatientName}
                            placeholder="Full name"
                            value={patientName}
                          />
                          <FormField
                            autoCapitalize="none"
                            autoCorrect={false}
                            icon="cake-variant-outline"
                            keyboardType="number-pad"
                            label="Patient Age"
                            onChangeText={setPatientAge}
                            placeholder="Age"
                            value={patientAge}
                          />
                        </>
                      )}

                      {needsJoinCode && (
                        <FormField
                          autoCapitalize="characters"
                          autoCorrect={false}
                          icon="key-outline"
                          label="Patient Join Code"
                          onChangeText={(value) => setJoinCode(normalizeJoinCode(value))}
                          placeholder="MP-123456"
                          value={joinCode}
                        />
                      )}

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
                    </View>

                    <View style={styles.statusWrap}>
                      {status ? (
                        <Text style={[styles.statusText, isError ? styles.errorText : styles.successText]}>
                          {status}
                        </Text>
                      ) : (
                        <Text style={styles.statusHint}>
                          {authMode === 'signin'
                            ? 'Need an account? Tap Sign Up.'
                            : selectedRole === 'caregiver' && caregiverSetupMode === 'create'
                            ? 'A join code will be created for you.'
                            : 'Use the patient code to link accounts.'}
                        </Text>
                      )}
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      disabled={isLoading}
                      onPress={handleAuth}
                      style={[styles.submitButton, isLoading && styles.buttonDisabled]}>
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>
                          {authMode === 'signin' ? 'Continue' : 'Create Account'}
                        </Text>
                      )}
                    </Pressable>

                    <Pressable accessibilityRole="button" onPress={returnToLanding} style={styles.backButton}>
                      <MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.subtitle} />
                      <Text style={styles.backButtonText}>Back to Roles</Text>
                    </Pressable>
                  </View>
                )}
              </>
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
    paddingHorizontal: 24, // Slightly tighter padding for a cleaner edge
  },
  sessionLoadingCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 12,
  },
  sessionLoadingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
  },
  sessionLoadingText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.subtitle,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48, // More breathing room
  },
  iconCircle: {
    width: 96, // Slightly smaller and cleaner
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.iconCircle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroIcon: {
    width: 52,
    height: 52,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700', // Stepped down from 800 for elegance
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.subtitle,
    fontWeight: '400', // Lighter weight for contrast
  },
  buttonGroup: {
    gap: 16,
  },
  roleButton: {
    minHeight: 90, // Tighter height
    borderRadius: 20, // Softer corners
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    // Replaced heavy shadow with a very soft ambient one
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  roleButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  roleButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.title,
  },
  authCard: {
    borderRadius: 24,
    backgroundColor: COLORS.card,
    padding: 24,
    // Minimalist shadow, no harsh border
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  authHeadingWrap: {
    flex: 1,
    gap: 4,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    letterSpacing: -0.5,
  },
  authSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.subtitle,
  },
  modeToggle: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.chip, // Blends better
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  choiceGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  choiceChip: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 12, // More modern shape
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipSelected: {
    backgroundColor: COLORS.accent,
  },
  choiceChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.subtitle,
  },
  choiceChipTextSelected: {
    color: '#FFFFFF', // High contrast for selection
  },
  formContainer: {
    gap: 16, // Consistent spacing between fields
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.title,
    fontWeight: '600',
    marginLeft: 4, // Aligns nicely with rounded input
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.chip, // Soft fill instead of harsh border
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.title,
    paddingVertical: 0,
  },
  statusWrap: {
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successText: {
    color: COLORS.success,
  },
  errorText: {
    color: COLORS.error,
  },
  statusHint: {
    fontSize: 14,
    color: COLORS.subtitle,
    textAlign: 'center',
  },
  submitButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  backButton: {
    marginTop: 16,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.subtitle,
  },
});
