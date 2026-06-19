import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TabsParamList } from '@/navigation/types';
import { colors, font, radius, shadow, spacing } from '@/theme';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Lab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function LanguageLabScreen({ navigation }: Props) {
  const [lastSync] = useState('today 4:30 PM');

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <Text style={styles.title}>Language Lab</Text>
          <Text style={styles.sub}>All-day speaking, captured by your band.</Text>

          {/* Device status */}
          <Card>
            <View style={styles.deviceRow}>
              <LinearGradient
                colors={colors.iridescent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.deviceIcon, shadow.glow]}
              >
                <Text style={{ fontSize: 22 }}>🎧</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>EduBand Band</Text>
                <View style={styles.statusRow}>
                  <View style={styles.dot} />
                  <Text style={styles.statusText}>Connected · 82% battery</Text>
                </View>
                <Text style={styles.syncText}>Last sync: {lastSync} via Wi-Fi</Text>
              </View>
            </View>
            <Button
              title="Sync now"
              variant="secondary"
              onPress={() => Alert.alert('Syncing', 'Pulling today’s transcript from your band (demo).')}
              style={{ marginTop: spacing.md }}
            />
          </Card>

          {/* Today summary */}
          <Card style={styles.todayRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayLabel}>Today you spoke</Text>
              <Text style={styles.todayBig}>38 min</Text>
              <Text style={styles.todaySub}>of your speech (others filtered out)</Text>
            </View>
            <View style={styles.deltaCircle}>
              <Text style={styles.deltaText}>+5</Text>
            </View>
          </Card>

          {/* Privacy */}
          <Card>
            <Text style={styles.privacyHead}>🔒 How your privacy is protected</Text>
            {[
              'Records only when YOU speak (voice match)',
              "Other people's speech discarded on the device",
              'Only a text transcript is uploaded — never raw audio',
              'You can pause capture anytime',
            ].map((t, i) => (
              <Text key={i} style={styles.privacyItem}>•  {t}</Text>
            ))}
          </Card>

          <Button
            title="Analyse today's speech"
            onPress={() =>
              navigation.navigate('Processing', {
                taskId: null,
                mode: 'free',
                audioUri: null,
                durationSec: 38 * 60,
              })
            }
          />
          <Text style={styles.phase}>
            ⚠ Wearable is Phase 2 (hardware + legal review). This is a preview.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: font.small, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  deviceRow: { flexDirection: 'row', alignItems: 'center' },
  deviceIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  deviceName: { fontSize: font.body, fontWeight: '700', color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.good, marginRight: 6 },
  statusText: { fontSize: font.small, color: colors.good, fontWeight: '600' },
  syncText: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayLabel: { fontSize: font.small, color: colors.textMuted, fontWeight: '700' },
  todayBig: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 4, letterSpacing: -1 },
  todaySub: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  deltaCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue + '2E', alignItems: 'center', justifyContent: 'center' },
  deltaText: { color: colors.blue, fontSize: font.h3, fontWeight: '800' },
  privacyHead: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  privacyItem: { fontSize: font.small, color: colors.textMuted, lineHeight: 24 },
  phase: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.md },
});
