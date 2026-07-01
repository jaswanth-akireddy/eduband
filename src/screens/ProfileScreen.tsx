import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { clearRole, deleteAllData, exportData, getProfile, getRole } from '@/storage/store';
import { getCurrentUser, signOut, authConfigured } from '@/services/auth';
import { Role, StudentProfile } from '@/types';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const levelLabel: Record<string, string> = {
  middle: 'Middle school',
  high: 'High school',
  college: 'College',
};

export default function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [p, r, u] = await Promise.all([
          getProfile(),
          getRole(),
          getCurrentUser(),
        ]);
        if (!active) return;
        setProfile(p);
        setRole(r);
        setEmail(u?.email ?? null);
      })();
      return () => {
        active = false;
        setConfirmingLogout(false);
      };
    }, [])
  );

  const name = profile?.name?.trim() || 'EduBand user';

  async function onLogout() {
    if (!confirmingLogout) {
      setConfirmingLogout(true);
      return;
    }
    setBusy(true);
    // End the Supabase session, then wipe this device's local account data so the
    // next person to sign in never sees the previous account's profile/sessions.
    // (Cross-device, per-account persistence belongs in Supabase — see notes.)
    await signOut();
    await deleteAllData();
    navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
  }

  async function onSwitchRole() {
    await clearRole();
    navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
  }

  async function onExport() {
    const data = await exportData();
    await Share.share({ message: data });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
    >
      {/* Identity */}
      <Card style={styles.identity}>
        <View style={styles.avatarWrap}>
          <Avatar seed={name} size={80} />
        </View>
        <Text style={styles.name}>{name}</Text>
        {email ? (
          <Text style={styles.email}>{email}</Text>
        ) : (
          <Text style={styles.emailFaint}>Local demo · not signed in</Text>
        )}
        <View style={styles.chips}>
          {role ? <Chip text={cap(role)} /> : null}
          {profile?.level ? <Chip text={levelLabel[profile.level] ?? profile.level} /> : null}
          {profile?.schoolCode ? <Chip text={profile.schoolCode} /> : null}
        </View>
      </Card>

      {/* Account actions */}
      <Text style={styles.sectionLabel}>Account</Text>
      <Card style={styles.group}>
        <Row label="Switch role" hint="Back to the welcome screen" onPress={onSwitchRole} />
        <Divider />
        <Row
          label="Privacy & data"
          hint="Consent, retention, export, delete"
          onPress={() => navigation.navigate('Tabs', { screen: 'Privacy' })}
        />
        <Divider />
        <Row label="API keys (testing)" hint="Configure services on-device" onPress={() => navigation.navigate('ApiKeys')} />
        <Divider />
        <Row label="Export my data" hint="Download a JSON copy" onPress={onExport} />
      </Card>

      {/* Sign out */}
      <Button
        title={
          busy
            ? 'Logging out…'
            : confirmingLogout
            ? 'Tap again to confirm log out'
            : 'Log out'
        }
        variant={confirmingLogout ? 'primary' : 'secondary'}
        onPress={onLogout}
        loading={busy}
        style={{ marginTop: spacing.lg }}
      />
      {confirmingLogout && !busy ? (
        <Text style={styles.cancelHint} onPress={() => setConfirmingLogout(false)}>
          Cancel
        </Text>
      ) : null}

      {!authConfigured ? (
        <Text style={styles.note}>
          You're in local demo mode. Sign-in is available once an account is
          connected.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  identity: { alignItems: 'center', paddingVertical: spacing.xl },
  avatarWrap: { marginBottom: spacing.md },
  name: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  email: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  emailFaint: { fontSize: font.small, color: colors.textFaint, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: { fontSize: font.tiny, fontWeight: '600', color: colors.textMuted },

  sectionLabel: {
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  group: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowLabel: { fontSize: font.body, fontWeight: '600', color: colors.text },
  rowHint: { fontSize: font.small, color: colors.textMuted, marginTop: 1 },
  chevron: { fontSize: font.h2, color: colors.textFaint, fontWeight: '400' },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: spacing.lg },

  cancelHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  note: {
    color: colors.textFaint,
    fontSize: font.tiny,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 16,
  },
});
