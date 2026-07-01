import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { Level } from '@/types';
import { colors, font, radius, spacing } from '@/theme';
import { saveProfile, clearRole } from '@/storage/store';
import Button from '@/components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const LEVELS: { id: Level; label: string }[] = [
  { id: 'middle', label: 'Middle school' },
  { id: 'high', label: 'High school' },
  { id: 'college', label: 'College' },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [level, setLevel] = useState<Level>('high');
  const [language] = useState('English');

  const canContinue = name.trim().length > 1 && schoolCode.trim().length >= 4;

  async function onContinue() {
    await saveProfile({
      name: name.trim(),
      schoolCode: schoolCode.trim().toUpperCase(),
      level,
      language,
    });
    navigation.replace('Consent');
  }

  async function onChangeRole() {
    await clearRole();
    navigation.replace('RoleSelect');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.backLink} onPress={onChangeRole}>
            ‹ Choose a different role
          </Text>
          <Text style={styles.logo}>EduBand</Text>
          <Text style={styles.tagline}>
            Measure and improve how you actually speak.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Aarav Sharma"
              placeholderTextColor={colors.textMutedOnDark}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>School / college code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. EDU-1234"
              placeholderTextColor={colors.textMutedOnDark}
              value={schoolCode}
              onChangeText={setSchoolCode}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Your level</Text>
            <View style={styles.levelRow}>
              {LEVELS.map((l) => (
                <Text
                  key={l.id}
                  onPress={() => setLevel(l.id)}
                  style={[
                    styles.levelChip,
                    level === l.id && styles.levelChipActive,
                  ]}
                >
                  {l.label}
                </Text>
              ))}
            </View>
          </View>

          <View style={{ flex: 1 }} />
          <Button
            title="Continue"
            onPress={onContinue}
            disabled={!canContinue}
            style={{ marginTop: spacing.lg }}
          />
          <Text style={styles.note}>
            Next you'll set up consent. We never record without permission.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, flexGrow: 1 },
  backLink: {
    color: colors.textMutedOnDark,
    fontSize: font.small,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.textOnDark,
    marginTop: spacing.xl,
  },
  tagline: {
    fontSize: font.h3,
    color: colors.textMutedOnDark,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  form: { marginTop: spacing.md },
  label: {
    color: colors.textMutedOnDark,
    fontSize: font.small,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    color: colors.textOnDark,
    fontSize: font.body,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  levelRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  levelChip: {
    color: colors.textMutedOnDark,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    fontSize: font.small,
    fontWeight: '600',
  },
  levelChipActive: {
    color: colors.white,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  note: {
    color: colors.textMutedOnDark,
    fontSize: font.tiny,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
