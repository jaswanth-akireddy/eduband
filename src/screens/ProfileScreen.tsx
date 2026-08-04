import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { font, makeStyles, radius, spacing, useTheme, weight } from '@/theme';
import type { ThemeScheme } from '@/theme';
import { clearRole, deleteAllData, exportData, getProfile, getRole } from '@/storage/store';
import { getCurrentUser, signOut, authConfigured } from '@/services/auth';
import { Role, StudentProfile } from '@/types';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';
import ListRow, { RowDivider } from '@/components/ListRow';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const levelLabel: Record<string, string> = {
  middle: 'Middle school',
  high: 'High school',
  college: 'College',
};

const THEME_OPTIONS: { id: ThemeScheme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Auto' },
];

export default function ProfileScreen({ navigation }: Props) {
  const { scheme, setScheme, palette: colors } = useTheme();
  const styles = useStyles();
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
  const detail = [
    role ? cap(role) : null,
    profile?.level ? levelLabel[profile.level] ?? profile.level : null,
    profile?.schoolCode ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  async function onLogout() {
    if (!confirmingLogout) {
      setConfirmingLogout(true);
      return;
    }
    setBusy(true);
    // End the Supabase session, then wipe this device's local account data so the
    // next person to sign in never sees the previous account's profile/sessions.
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
      contentContainerStyle={{ padding: 20, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Identity */}
      <View style={styles.identity}>
        <Avatar seed={name} size={72} />
        <Text style={styles.name}>{name}</Text>
        {email ? (
          <Text style={styles.email}>{email}</Text>
        ) : (
          <Text style={styles.emailFaint}>Not signed in · local demo</Text>
        )}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>

      {/* Appearance */}
      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <Card style={styles.group}>
        <View style={styles.appearanceRow}>
          <Text style={styles.rowLabel}>Theme</Text>
          <View style={styles.segment}>
            {THEME_OPTIONS.map((opt) => {
              const active = scheme === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setScheme(opt.id)}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      {/* Account */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <Card style={styles.group}>
        <ListRow
          icon="swap"
          tint="#6366F1"
          label="Switch role"
          hint="Back to the welcome screen"
          onPress={onSwitchRole}
        />
        <RowDivider />
        <ListRow
          icon="shield"
          tint={colors.accent}
          label="Privacy & data"
          hint="Consent, retention, export, delete"
          onPress={() => navigation.navigate('Tabs', { screen: 'Privacy' })}
        />
        <RowDivider />
        <ListRow
          icon="key"
          tint="#E8930C"
          label="API keys"
          hint="Configure services on-device"
          onPress={() => navigation.navigate('ApiKeys')}
        />
        <RowDivider />
        <ListRow
          icon="share"
          tint={colors.good}
          label="Export my data"
          hint="Download a JSON copy"
          onPress={onExport}
        />
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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  identity: { alignItems: 'center', paddingVertical: spacing.lg },
  name: {
    fontSize: font.h2,
    fontWeight: weight.semibold,
    color: colors.text,
    letterSpacing: -0.4,
    marginTop: spacing.md,
  },
  email: { fontSize: font.small, color: colors.textMuted, marginTop: 3 },
  emailFaint: { fontSize: font.small, color: colors.textFaint, marginTop: 3 },
  detail: { fontSize: font.small, color: colors.textMuted, marginTop: 6 },

  sectionLabel: {
    fontSize: font.tiny,
    fontWeight: weight.semibold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: { padding: 0, overflow: 'hidden' },

  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: font.body,
    fontWeight: weight.medium,
    color: colors.text,
    letterSpacing: -0.1,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 2,
  },
  segmentItem: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm - 2,
  },
  segmentItemActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: font.small, fontWeight: weight.medium, color: colors.textMuted },
  segmentTextActive: { color: colors.text, fontWeight: weight.semibold },

  cancelHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: weight.semibold,
    marginTop: spacing.md,
  },
  note: {
    color: colors.textFaint,
    fontSize: font.tiny,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 16,
  },
}));
