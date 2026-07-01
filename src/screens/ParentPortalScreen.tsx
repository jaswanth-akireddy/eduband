import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';
import { clearRole } from '@/storage/store';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ScoreGauge from '@/components/ScoreGauge';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentPortal'>;

export default function ParentPortalScreen({ navigation }: Props) {
  async function switchRole() {
    await clearRole();
    navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <Text style={styles.title}>Aarav's progress</Text>
          <Text style={styles.sub}>Communication insights</Text>

          <Card variant="glass" style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={styles.indexTitle}>Communication Index</Text>
            <ScoreGauge score={76} size={240} />
            <Text style={styles.goodNews}>Improving steadily this term 🎉</Text>
          </Card>

          <Card>
            <Text style={[styles.head, { color: colors.good }]}>Doing well</Text>
            <Text style={styles.item}>Clear articulation and a rich vocabulary.</Text>
            <Text style={styles.item}>Growing in confidence when speaking.</Text>
          </Card>

          <Card style={{ borderColor: colors.violet + '55' }}>
            <Text style={[styles.head, { color: colors.violet }]}>How you can help at home</Text>
            {[
              'Ask Aarav to explain his day in 1 minute',
              "Encourage pausing instead of saying 'um'",
              'Celebrate effort, not just the score',
            ].map((t, i) => (
              <Text key={i} style={styles.tip}>•  {t}</Text>
            ))}
          </Card>

          <Text style={styles.privacy}>
            🔒 Read-only · no audio access · consent on file
          </Text>

          <Button title="Switch role" variant="ghost" onPress={switchRole} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: font.body, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  indexTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  goodNews: { color: colors.good, fontSize: font.small, fontWeight: '700', marginTop: spacing.md },
  head: { fontSize: font.h3, fontWeight: '700', marginBottom: spacing.sm },
  item: { fontSize: font.body, color: colors.textMuted, lineHeight: 24 },
  tip: { fontSize: font.body, color: colors.text, lineHeight: 28, fontWeight: '500' },
  privacy: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.md },
});
