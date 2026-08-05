import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TabsParamList } from '@/navigation/types';
import { font, makeStyles, pillarColor, radius, shadow, spacing, useColors, weight } from '@/theme';
import { getProfile } from '@/storage/store';
import { Task } from '@/types';
import { tasksForLevel, TASKS } from '@/data/tasks';
import { pillarDef } from '@/analysis/framework';
import Button from '@/components/Button';
import Icon from '@/components/Icon';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Practice'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function PracticeScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
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
      contentContainerStyle={{ padding: 20, paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Guided tasks</Text>
      <Text style={styles.sub}>
        Each task targets specific skills. Pick one and speak for the suggested
        time.
      </Text>

      {tasks.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => navigation.navigate('Record', { taskId: t.id })}
          style={({ pressed }) => [
            styles.taskCard,
            shadow.card,
            pressed && styles.taskPressed,
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.prompt}>{t.prompt}</Text>
            <View style={styles.tagRow}>
              <View style={styles.timeTag}>
                <Icon name="clock" size={12} color={colors.textMuted} />
                <Text style={styles.timeTagText}>
                  {Math.round(t.suggestedSeconds / 60)} min
                </Text>
              </View>
              {t.targetPillars.map((p) => (
                <View key={p} style={[styles.skillTag, { backgroundColor: pillarColor(p) + '14' }]}>
                  <Text style={[styles.skillTagText, { color: pillarColor(p) }]}>
                    {pillarDef(p).short}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Icon name="chevronRight" size={16} color={colors.textFaint} />
        </Pressable>
      ))}

      <Button
        title="Free record"
        variant="secondary"
        icon="mic"
        onPress={() => navigation.navigate('Record', { taskId: null })}
        style={{ marginTop: spacing.sm }}
      />
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: {
    fontSize: font.h1,
    fontWeight: weight.bold,
    color: colors.text,
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: font.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
    lineHeight: 21,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    marginBottom: 12,
  },
  taskPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  prompt: {
    fontSize: font.body,
    color: colors.text,
    lineHeight: 22,
    fontWeight: weight.semibold,
    letterSpacing: -0.2,
    paddingRight: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  timeTagText: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: weight.semibold,
  },
  skillTag: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  skillTagText: {
    fontSize: font.tiny,
    fontWeight: weight.semibold,
  },
}));
