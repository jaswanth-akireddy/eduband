import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { font, makeStyles, radius, spacing, useColors } from '@/theme';
import {
  Credentials,
  clearCredentials,
  describeMode,
  getSavedCredentials,
  saveCredentials,
} from '@/config';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'ApiKeys'>;

export default function ApiKeysScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const [creds, setCreds] = useState<Credentials>({
    apiBase: '',
    sttProvider: 'deepgram',
    deepgramKey: '',
    llmProvider: 'claude',
    anthropicKey: '',
    anthropicModel: 'claude-3-5-sonnet-latest',
    geminiKey: '',
    geminiModel: 'gemini-1.5-flash',
  });
  const [activeMode, setActiveMode] = useState('');

  useEffect(() => {
    (async () => {
      setCreds(await getSavedCredentials());
      setActiveMode(describeMode());
    })();
  }, []);

  function set<K extends keyof Credentials>(k: K, v: Credentials[K]) {
    setCreds((c) => ({ ...c, [k]: v }));
  }

  async function onSave() {
    await saveCredentials(creds);
    setActiveMode(describeMode());
    Alert.alert('Saved', `Engine is now: ${describeMode()}`);
  }

  async function onClear() {
    await clearCredentials();
    setCreds(await getSavedCredentials());
    setActiveMode(describeMode());
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <Text style={styles.title}>API keys</Text>
          <Text style={styles.sub}>
            For testing only. Add keys to use real transcription and scoring.
            Leave blank to use the built-in demo engine.
          </Text>

          <View style={styles.modePill}>
            <Text style={styles.modeText}>Active engine: {activeMode}</Text>
          </View>

          {/* Warning */}
          <Card style={{ borderColor: colors.mid + '55' }}>
            <Text style={styles.warnHead}>⚠ Testing only</Text>
            <Text style={styles.warnText}>
              Keys entered here are stored on this device and can be extracted.
              Never use real student data with client-side keys. For production,
              use a backend proxy (set the API base URL below).
            </Text>
          </Card>

          {/* Backend proxy (recommended) */}
          <Card>
            <Text style={styles.cardHead}>Backend proxy (recommended)</Text>
            <Text style={styles.hint}>
              Your server holds the keys; the app just calls it. When set, this
              overrides the direct keys below.
            </Text>
            <Field
              label="API base URL"
              value={creds.apiBase}
              onChangeText={(v) => set('apiBase', v)}
              placeholder="https://your-project.functions.supabase.co/eduband"
            />
          </Card>

          {/* Direct keys */}
          <Card>
            <Text style={styles.cardHead}>Speech-to-text</Text>
            <View style={styles.providerRow}>
              {(['deepgram', 'assemblyai'] as const).map((p) => (
                <Text
                  key={p}
                  onPress={() => set('sttProvider', p)}
                  style={[styles.provChip, creds.sttProvider === p && styles.provChipActive]}
                >
                  {p === 'deepgram' ? 'Deepgram' : 'AssemblyAI'}
                </Text>
              ))}
            </View>
            <Field
              label={creds.sttProvider === 'deepgram' ? 'Deepgram API key' : 'AssemblyAI API key'}
              value={creds.deepgramKey}
              onChangeText={(v) => set('deepgramKey', v)}
              placeholder="paste key"
              secure
            />
          </Card>

          <Card>
            <Text style={styles.cardHead}>Scoring (Claude)</Text>
            <Field
              label="Anthropic API key"
              value={creds.anthropicKey}
              onChangeText={(v) => set('anthropicKey', v)}
              placeholder="sk-ant-..."
              secure
            />
            <Field
              label="Model"
              value={creds.anthropicModel}
              onChangeText={(v) => set('anthropicModel', v)}
              placeholder="claude-3-5-sonnet-latest"
            />
          </Card>

          <Button title="Save keys" onPress={onSave} />
          <Button title="Clear keys (use demo engine)" variant="secondary" onPress={onClear} style={{ marginTop: spacing.sm }} />
          <Button title="Back" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: spacing.xs }} />

          <Text style={styles.note}>
            Tip: on the web preview, browser security (CORS) can block direct
            provider calls — test keys on the phone via Expo Go, or use a backend
            proxy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
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
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secure}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 20 },
  modePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  modeText: { color: colors.accent, fontSize: font.tiny, fontWeight: '700' },
  warnHead: { color: colors.mid, fontWeight: '800', fontSize: font.body, marginBottom: 4 },
  warnText: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  cardHead: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  hint: { fontSize: font.small, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  label: { color: colors.textMuted, fontSize: font.small, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    color: colors.text,
    fontSize: font.body,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  providerRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  provChip: {
    color: colors.textMuted,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    fontSize: font.small,
    fontWeight: '700',
  },
  provChipActive: { color: colors.white, backgroundColor: colors.primary, borderColor: colors.primary },
  note: { color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.md, lineHeight: 16 },
}));
