import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TeacherTabsParamList } from '@/navigation/types';
import { font, makeStyles, scoreColor, spacing } from '@/theme';
import { DEMO_TEACHING_SESSIONS } from '@/data/teaching';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TeacherTabsParamList, 'TeacherSessions'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function TeacherSessionsScreen({ navigation }: Props) {
  const styles = useStyles();
  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Text style={styles.title}>Sessions</Text>
          {DEMO_TEACHING_SESSIONS.map((s) => (
            <Pressable key={s.id} onPress={() => navigation.navigate('TeacherReport', { sessionId: s.id })}>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{s.title}</Text>
                  <Text style={styles.rowMeta}>
                    {new Date(s.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ·{' '}
                    {Math.round(s.durationSec / 60)} min · coverage {s.analysis.coverage.coveragePct}%
                  </Text>
                </View>
                <Text style={[styles.score, { color: scoreColor(s.analysis.ci) }]}>{s.analysis.ci}</Text>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const useStyles = makeStyles((colors) => ({
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.md, letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  score: { fontSize: font.h2, fontWeight: '800', marginLeft: spacing.md },
}));
