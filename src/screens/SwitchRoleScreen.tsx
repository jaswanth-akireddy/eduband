import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { font, makeStyles, spacing } from '@/theme';
import { clearRole, deleteAllData } from '@/storage/store';
import { signOut } from '@/services/auth';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';

// Shared "Profile" tab content for non-student personas: shows role + switch.
export default function SwitchRoleScreen({
  roleLabel,
  name,
}: {
  roleLabel: string;
  name: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const styles = useStyles();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [busy, setBusy] = useState(false);

  async function switchRole() {
    await clearRole();
    navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
  }

  async function logout() {
    if (!confirmingLogout) {
      setConfirmingLogout(true);
      return;
    }
    setBusy(true);
    // End the session and wipe local account data so the next sign-in is clean.
    await signOut();
    await deleteAllData();
    navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Text style={styles.title}>Profile</Text>
          <Card>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>{roleLabel}</Text>
          </Card>
          <Button title="Switch role" variant="secondary" onPress={switchRole} />
          <Button
            title={
              busy
                ? 'Logging out…'
                : confirmingLogout
                ? 'Tap again to confirm log out'
                : 'Log out'
            }
            variant={confirmingLogout ? 'primary' : 'secondary'}
            onPress={logout}
            loading={busy}
            style={{ marginTop: spacing.sm }}
          />
          {confirmingLogout && !busy ? (
            <Text style={styles.cancel} onPress={() => setConfirmingLogout(false)}>
              Cancel
            </Text>
          ) : null}
          <Text style={styles.note}>
            Switching role keeps you signed in; logging out ends your session.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const useStyles = makeStyles((colors) => ({
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.md, letterSpacing: -0.5 },
  name: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  role: { fontSize: font.body, color: colors.textMuted, marginTop: 4 },
  note: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.md },
  cancel: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
}));
