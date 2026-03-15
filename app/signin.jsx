import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
  card: '#FFFFFF',
  border: '#E6DED5',
  title: '#1A1A2E',
  subtitle: '#6B6B80',
  accent: '#4A90D9',
  confirm: '#6DBF8A',
  error: '#E05C5C',
  chip: '#F5EFE7', // Added to match the previous screen's soft input fields
};

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

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [loadingMode, setLoadingMode] = useState(null);

  const handleAuth = async (mode) => {
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

    setLoadingMode(mode);
    setStatus('');
    setIsError(false);

    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        setStatus('Account created. Redirecting to dashboard...');
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        setStatus('Sign in successful. Redirecting to dashboard...');
      }

      router.replace('/(tabs)');
    } catch (error) {
      setIsError(true);
      setStatus(error.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
    } finally {
      setLoadingMode(null);
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
            
            {/* Minimalist Hero Section */}
            <View style={styles.hero}>
              <View style={styles.heroBadge}>
                <MaterialCommunityIcons name="shield-check-outline" size={32} color={COLORS.confirm} />
              </View>
              <Text style={styles.title}>Caregiver Access</Text>
              <Text style={styles.subtitle}>
                Create your caregiver account or sign in with your existing Firebase login.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.formContainer}>
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
                  textContentType="password"
                  value={password}
                />
              </View>

              <View style={styles.statusWrap}>
                {status ? (
                  <Text style={[styles.statusText, isError ? styles.statusError : styles.statusSuccess]}>
                    {status}
                  </Text>
                ) : (
                  <Text style={styles.statusHint}>Use the same email and password for sign up and sign in.</Text>
                )}
              </View>

              <View style={styles.buttonGroup}>
                <Pressable
                  accessibilityRole="button"
                  disabled={loadingMode !== null}
                  onPress={() => handleAuth('signup')}
                  style={[
                    styles.primaryButton,
                    loadingMode !== null && styles.buttonDisabled,
                  ]}>
                  {loadingMode === 'signup' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="account-plus-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Create account</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={loadingMode !== null}
                  onPress={() => handleAuth('signin')}
                  style={[
                    styles.secondaryButton,
                    loadingMode !== null && styles.buttonDisabled,
                  ]}>
                  {loadingMode === 'signin' ? (
                    <ActivityIndicator color={COLORS.accent} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="login" size={20} color={COLORS.accent} />
                      <Text style={styles.secondaryButtonText}>Sign in</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.subtitle} />
                <Text style={styles.backButtonText}>Back to role selection</Text>
              </Pressable>
            </View>
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
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40, // Increased breathing room
  },
  heroBadge: {
    width: 80, // Slightly smaller
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF8F1', // Soft fill, removed border
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700', // Stepped down from 800
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.subtitle,
    textAlign: 'center',
    maxWidth: 340, // Tighter max-width for better reading lines
    fontWeight: '400',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    // Replaced heavy shadow/border with minimal ambient shadow
    shadowColor: COLORS.title,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  formContainer: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.title,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.chip, // Soft fill instead of border
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
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
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusHint: {
    fontSize: 14,
    color: COLORS.subtitle,
    textAlign: 'center',
  },
  statusError: {
    color: COLORS.error,
  },
  statusSuccess: {
    color: COLORS.confirm,
  },
  buttonGroup: {
    gap: 12, // Tighter gap between main actions
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.confirm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1, // Thinned out from 2
    borderColor: COLORS.accent,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.3,
  },
  backButton: {
    marginTop: 20,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.subtitle,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});