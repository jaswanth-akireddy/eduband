import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { getProfile, saveConsent } from '@/storage/store';
import Button from '@/components/Button';
import Card from '@/components/Card';

type Props = NativeStackScreenProps<RootStackParamList, 'Consent'>;

// Section 8: verifiable parental/guardian consent before any recording.
export default function ConsentScreen({ navigation }: Props) {
  const [guardian, setGuardian] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [agreed, setAgreed] = useState(false);

  const canGrant = guardian.trim().length > 1 && agreed;

  async function onGrant() {
    const profile = await getProfile();
    await saveConsent({
      studentName: profile?.name ?? '',
      grantedBy: guardian.trim(),
      relationship,
      granted: true,
      timestamp: Date.now(),
    });
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Parental / guardian consent</Text>
          <Text style={styles.subtitle}>
            Because students are minors, a parent or guardian must approve voice
            recording before EduBand can be used.
          </Text>

          <Card>
            <Text style={styles.cardHeading}>What we record and why</Text>
            <Bullet text="We record short spoken tasks only when the student taps record." />
            <Bullet text="Audio is transcribed and analysed to give communication feedback." />
            <Bullet text="Raw audio is deleted after analysis by default; scores and transcript are kept to show growth." />
            <Bullet text="No ads, no third-party tracking, and we never sell data." />
            <Bullet text="You can export or delete all data at any time from the Privacy tab." />
          </Card>

          <Text style={styles.label}>Parent / guardian full name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Meera Sharma"
            placeholderTextColor={colors.textMuted}
            value={guardian}
            onChangeText={setGuardian}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Relationship to student</Text>
          <View style={styles.relRow}>
            {['Parent', 'Guardian', 'Other'].map((r) => (
              <Text
                key={r}
                onPress={() => setRelationship(r)}
                style={[styles.relChip, relationship === r && styles.relChipActive]}
              >
                {r}
              </Text>
            ))}
          </View>

          <View style={styles.agreeRow}>
            <Switch
              value={agreed}
              onValueChange={setAgreed}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
            <Text style={styles.agreeText}>
              I confirm I am the parent/guardian and I consent to my child's
              voice being recorded and analysed as described above.
            </Text>
          </View>

          <Button
            title="Grant consent"
            onPress={onGrant}
            disabled={!canGrant}
            style={{ marginTop: spacing.md }}
          />
          <Text style={styles.legal}>
            This is a record of consent for this device. Schools collect
            verifiable consent per their rollout. Informational, not legal advice.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.dot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  subtitle: {
    fontSize: font.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  cardHeading: {
    fontSize: font.h3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  bulletRow: { flexDirection: 'row', marginBottom: spacing.sm },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 7,
    marginRight: spacing.sm,
  },
  bulletText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 20 },
  label: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    color: colors.text,
    fontSize: font.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  relRow: { flexDirection: 'row', gap: spacing.sm },
  relChip: {
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    fontSize: font.small,
    fontWeight: '600',
  },
  relChipActive: {
    color: colors.white,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  agreeText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 20 },
  legal: {
    color: colors.textMuted,
    fontSize: font.tiny,
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
