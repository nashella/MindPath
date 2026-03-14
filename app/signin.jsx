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
};

function FormField({ icon, label, ...inputProps }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View style={styles.inputShell}>
        <MaterialCommunityIcons name={icon} size={24} color={COLORS.accent} />
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
            <View style={styles.hero}>
              <View style={styles.heroBadge}>
                <MaterialCommunityIcons name="shield-check-outline" size={30} color={COLORS.confirm} />
              </View>
              <Text style={styles.title}>Caregiver Access</Text>
              <Text style={styles.subtitle}>
                Create your caregiver account or sign in with your existing Firebase login.
              </Text>
            </View>

            <View style={styles.card}>
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

              <View style={styles.statusWrap}>
                {status ? (
                  <Text style={[styles.statusText, isError ? styles.statusError : styles.statusSuccess]}>
                    {status}
                  </Text>
                ) : (
                  <Text style={styles.statusHint}>Use the same email and password for sign up and sign in.</Text>
                )}
              </View>

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
                    <MaterialCommunityIcons name="account-plus-outline" size={22} color="#FFFFFF" />
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
                    <MaterialCommunityIcons name="login" size={22} color={COLORS.accent} />
                    <Text style={styles.secondaryButtonText}>Sign in</Text>
                  </>
                )}
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.subtitle} />
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
    gap: 20,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  heroBadge: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF8F1',
    borderWidth: 1,
    borderColor: '#D7EEDC',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.subtitle,
    textAlign: 'center',
    maxWidth: 420,
  },
  card: {
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
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.title,
    minHeight: 56,
  },
  statusWrap: {
    minHeight: 44,
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
  statusError: {
    color: COLORS.error,
  },
  statusSuccess: {
    color: COLORS.confirm,
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: COLORS.confirm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    minHeight: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: COLORS.accent,
  },
  backButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.subtitle,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.75,
  },
});
