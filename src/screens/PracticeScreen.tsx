import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TabsParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { getProfile } from '@/storage/store';
import { Task } from '@/types';
import { tasksForLevel, TASKS } from '@/data/tasks';
import { pillarDef } from '@/analysis/framework';
import Card from '@/components/Card';
import Button from '@/components/Button';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Practice'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function PracticeScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<Task[]>(TASKS);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const profile = await getProfile();
        const list = profile ? tasksForLevel(profile.level) : TASKS;
        setTasks(list.length ? list : TASKS);
      })();
    }, [])
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <Text style={styles.title}>Guided tasks</Text>
      <Text style={styles.sub}>
        Each task targets specific skills. Pick one and speak for the suggested
        time.
      </Text>

      {tasks.map((t) => (
        <Card key={t.id}>
          <Text style={styles.prompt}>{t.prompt}</Text>
          <View style={styles.tagRow}>
            <Text style={styles.timeTag}>
              ~{Math.round(t.suggestedSeconds / 60)} min
            </Text>
            {t.targetPillars.map((p) => (
              <Text key={p} style={styles.skillTag}>
                {pillarDef(p).short}
              </Text>
            ))}
          </View>
          <Button
            title="Start this task"
            onPress={() => navigation.navigate('Record', { taskId: t.id })}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ))}

      <Button
        title="Free record (no prompt)"
        variant="secondary"
        onPress={() => navigation.navigate('Record', { taskId: null })}
        style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  sub: {
    fontSize: font.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  prompt: { fontSize: font.h3, color: colors.text, lineHeight: 26, fontWeight: '600' },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  timeTag: {
    backgroundColor: colors.surfaceAlt,
    color: colors.white,
    fontSize: font.tiny,
    fontWeight: '700',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  skillTag: {
    backgroundColor: colors.cardMuted,
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
