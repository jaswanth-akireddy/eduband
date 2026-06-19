// Guided speaking tasks (Section 5.1). Tasks map to skills and are level-graded.

import { Level, PillarId, Task } from '@/types';

export const TASKS: Task[] = [
  {
    id: 'fav-place',
    prompt: 'Describe your favourite place. What makes it special to you?',
    targetLevel: 'middle',
    targetPillars: ['fluency', 'language'],
    suggestedSeconds: 120,
  },
  {
    id: 'best-day',
    prompt: 'Tell me about the best day you have had recently, from start to finish.',
    targetLevel: 'middle',
    targetPillars: ['structure', 'fluency'],
    suggestedSeconds: 120,
  },
  {
    id: 'explain-hobby',
    prompt: 'Explain a hobby or skill you enjoy so that a beginner could understand it.',
    targetLevel: 'high',
    targetPillars: ['structure', 'clarity'],
    suggestedSeconds: 150,
  },
  {
    id: 'opinion-tech',
    prompt: 'Should students be allowed to use phones in class? Give your opinion and two reasons.',
    targetLevel: 'high',
    targetPillars: ['structure', 'confidence', 'language'],
    suggestedSeconds: 150,
  },
  {
    id: 'self-intro',
    prompt: 'Introduce yourself as you would in a job or college interview.',
    targetLevel: 'college',
    targetPillars: ['confidence', 'structure', 'clarity'],
    suggestedSeconds: 120,
  },
  {
    id: 'pitch-idea',
    prompt: 'Pitch an idea that could improve your campus or workplace in two minutes.',
    targetLevel: 'college',
    targetPillars: ['structure', 'confidence', 'language'],
    suggestedSeconds: 120,
  },
];

export function taskById(id: string | null): Task | undefined {
  if (!id) return undefined;
  return TASKS.find((t) => t.id === id);
}

export function tasksForLevel(level: Level): Task[] {
  return TASKS.filter((t) => t.targetLevel === level);
}

// Suggest a task that targets the student's weakest pillar at their level.
export function suggestTask(weakest: PillarId, level: Level): string {
  const atLevel = tasksForLevel(level);
  const pool = atLevel.length ? atLevel : TASKS;
  const match = pool.find((t) => t.targetPillars.includes(weakest));
  return (match ?? pool[0]).id;
}
