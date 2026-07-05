import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { Role } from '@/types';
import { font, makeStyles, radius, spacing, useColors } from '@/theme';
import {
  authConfigured,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '@/services/auth';
import { saveRole } from '@/storage/store';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  teacher: 'Teacher',
  parent: 'Parent',
  professional: 'Professional',
};

export default function AuthScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const role = route.params.role;
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  // Where to go after a successful login, by role.
  function proceed() {
    if (role === 'student') navigation.replace('Onboarding');
    else if (role === 'teacher') navigation.replace('TeacherTabs', { screen: 'TeacherHome' });
    else if (role === 'parent') navigation.replace('ParentPortal');
    else navigation.replace('ProfessionalHome');
  }

  async function onEmailAuth() {
    if (!email || password.length < 6) {
      Alert.alert('Check your details', 'Enter an email and a password (6+ characters).');
      return;
    }
    setBusy(true);
    const res =
      mode === 'signup'
        ? await signUpWithEmail(email.trim(), password, name.trim() || 'EduBand user', role, 'high')
        : await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (!res.ok) {
      Alert.alert('Sign-in failed', res.error ?? 'Please try again.');
      return;
    }
    await saveRole(role);
    proceed();
  }

  async function onGoogle() {
    setBusy(true);
    const res = await signInWithGoogle(role);
    setBusy(false);
    if (!res.ok) {
      Alert.alert('Google sign-in', res.error ?? 'Could not sign in with Google.');
      return;
    }
    await saveRole(role);
    proceed();
  }

  // When no backend is configured, let the user continue in local/demo mode.
  async function onContinueLocally() {
    await saveRole(role);
    proceed();
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
            <Text style={styles.back} onPress={() => navigation.goBack()}>
              ‹ Back
            </Text>
            <Text style={styles.title}>
              {mode === 'signup' ? 'Create your' : 'Sign in to your'}
            </Text>
            <Text style={styles.roleTitle}>{ROLE_LABEL[role]} account</Text>

            {!authConfigured && (
              <Card style={{ borderColor: colors.mid + '55' }}>
                <Text style={styles.warnHead}>Demo mode</Text>
                <Text style={styles.warnText}>
                  No backend is connected yet, so accounts aren't real. You can
                  continue locally to explore, or connect Supabase (see the API
                  Keys screen) to enable real login.
                </Text>
                <Button title="Continue (local demo)" onPress={onContinueLocally} style={{ marginTop: spacing.md }} />
              </Card>
            )}

            {authConfigured && (
              <>
                {mode === 'signup' && (
                  <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
                )}
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secure
                />

                <Button
                  title={mode === 'signup' ? 'Create account' : 'Sign in'}
                  onPress={onEmailAuth}
                  loading={busy}
                  style={{ marginTop: spacing.lg }}
                />

                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.or}>or</Text>
                  <View style={styles.line} />
                </View>

                <Pressable onPress={onGoogle} disabled={busy} style={styles.google}>
                  <Text style={styles.googleG}>G</Text>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </Pressable>

                <Text style={styles.switch} onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
                  {mode === 'signup'
                    ? 'Already have an account? Sign in'
                    : "New here? Create an account"}
                </Text>
              </>
            )}

            {busy && !authConfigured && <ActivityIndicator color={colors.primary} />}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        secureTextEntry={secure}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  back: { color: colors.textMuted, fontSize: font.small, fontWeight: '600', marginTop: spacing.sm },
  title: { fontSize: font.h2, fontWeight: '700', color: colors.textMuted, marginTop: spacing.lg },
  roleTitle: { fontSize: font.hero, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: spacing.lg },
  warnHead: { color: colors.mid, fontWeight: '800', fontSize: font.body },
  warnText: { color: colors.textMuted, fontSize: font.small, lineHeight: 20, marginTop: 4 },
  label: { color: colors.textMuted, fontSize: font.small, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    color: colors.text,
    fontSize: font.body,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.glassBorder },
  or: { color: colors.textFaint, marginHorizontal: spacing.md, fontSize: font.small },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    minHeight: 54,
    borderRadius: radius.md,
  },
  googleG: { color: '#4285F4', fontWeight: '800', fontSize: font.h3, marginRight: spacing.sm },
  googleText: { color: '#1F1F1F', fontWeight: '700', fontSize: font.body },
  switch: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg, fontSize: font.small, fontWeight: '600' },
}));
