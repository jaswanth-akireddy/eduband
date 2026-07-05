import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TabsParamList } from '@/navigation/types';
import { font, makeStyles, spacing, useColors } from '@/theme';
import {
  AppSettings,
  clearRole,
  deleteAllData,
  exportData,
  getConsent,
  getSettings,
  saveSettings,
} from '@/storage/store';
import { ConsentRecord } from '@/types';
import Card from '@/components/Card';
import Button from '@/components/Button';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Privacy'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function PrivacyScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const [settings, setSettings] = useState<AppSettings>({ retainRawAudio: false });
  const [consent, setConsent] = useState<ConsentRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSettings(await getSettings());
        setConsent(await getConsent());
      })();
    }, [])
  );

  async function toggleRetention(value: boolean) {
    const next = { ...settings, retainRawAudio: value };
    setSettings(next);
    await saveSettings(next);
  }

  async function onExport() {
    const data = await exportData();
    await Share.share({ message: data });
  }

  async function onSwitchRole() {
    await clearRole();
    navigation.getParent()?.reset({
      index: 0,
      routes: [{ name: 'RoleSelect' }],
    });
  }

  function onDeleteAll() {
    Alert.alert(
      'Delete all data?',
      'This permanently removes your profile, consent record, and all sessions on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData(true); // also wipe remote (GDPR-style delete)
            navigation.getParent()?.reset({
              index: 0,
              routes: [{ name: 'RoleSelect' }],
            });
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <Text style={styles.title}>Privacy & data</Text>
      <Text style={styles.sub}>
        You are in control of your data. Here is exactly what we keep and how to
        remove it.
      </Text>

      <Card>
        <Text style={styles.cardHeading}>Consent status</Text>
        {consent?.granted ? (
          <>
            <Text style={styles.ok}>✓ Consent granted</Text>
            <Text style={styles.detail}>
              By {consent.grantedBy} ({consent.relationship}) on{' '}
              {new Date(consent.timestamp).toLocaleDateString()}
            </Text>
          </>
        ) : (
          <Text style={styles.warn}>No consent on record.</Text>
        )}
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={styles.cardHeading}>Keep raw audio</Text>
            <Text style={styles.detail}>
              Off (recommended): audio is deleted right after analysis. Only the
              transcript and scores are kept.
            </Text>
          </View>
          <Switch
            value={settings.retainRawAudio}
            onValueChange={toggleRetention}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardHeading}>Our promises</Text>
        <Promise text="No ads, ever." />
        <Promise text="No third-party tracking." />
        <Promise text="We never sell your data." />
        <Promise text="Teachers see only their classes; you see only yourself." />
        <Promise text="Data encrypted in transit and at rest (in the hosted version)." />
      </Card>

      <Button title="Export my data (JSON)" variant="secondary" onPress={onExport} />
      <Button
        title="API keys (testing)"
        variant="secondary"
        onPress={() => navigation.navigate('ApiKeys')}
        style={{ marginTop: spacing.sm }}
      />
      <Button
        title="Switch role"
        variant="secondary"
        onPress={onSwitchRole}
        style={{ marginTop: spacing.sm }}
      />
      <Button
        title="Delete all my data"
        variant="ghost"
        onPress={onDeleteAll}
        style={{ marginTop: spacing.xs }}
      />

      <Text style={styles.legal}>
        Designed for India's DPDP Act 2023, configurable for GDPR-K, COPPA and
        FERPA. Informational, not legal advice.
      </Text>
    </ScrollView>
  );
}

function Promise({ text }: { text: string }) {
  const styles = useStyles();
  return (
    <View style={styles.promiseRow}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.promiseText}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  sub: {
    fontSize: font.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  cardHeading: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  detail: { color: colors.textMuted, fontSize: font.small, marginTop: 4, lineHeight: 20 },
  ok: { color: colors.good, fontWeight: '700', marginTop: spacing.sm, fontSize: font.body },
  warn: { color: colors.low, fontWeight: '700', marginTop: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center' },
  promiseRow: { flexDirection: 'row', marginTop: spacing.sm },
  check: { color: colors.good, fontWeight: '800', marginRight: spacing.sm },
  promiseText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 20 },
  legal: {
    color: colors.textMuted,
    fontSize: font.tiny,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    lineHeight: 16,
  },
}));
