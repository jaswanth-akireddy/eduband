import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';
import { clearRole } from '@/storage/store';
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

  async function switchRole() {
    await clearRole();
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
          <Text style={styles.note}>
            Switching role takes you back to the welcome screen.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.md, letterSpacing: -0.5 },
  name: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  role: { fontSize: font.body, color: colors.textMuted, marginTop: 4 },
  note: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.md },
});
