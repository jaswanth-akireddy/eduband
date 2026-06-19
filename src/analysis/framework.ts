// EduBand "Communication Index" framework (Section 3) — the core IP.
// Five pillars (0-100) rolled into a single Communication Index (CI).
// A sixth pillar (interaction) applies only to conversational contexts.

import { PillarId } from '@/types';

export const FRAMEWORK_VERSION = '1.0.0';

export interface PillarDef {
  id: PillarId;
  label: string;
  short: string;
  captures: string;
  weight: number; // exposed as config so schools can re-emphasise
  conversationalOnly?: boolean;
}

// Start with equal weights across the five core pillars (Section 3).
// Weights are config: a school can emphasise clarity for younger grades,
// or structure for college placement prep.
export const PILLARS: PillarDef[] = [
  {
    id: 'fluency',
    label: 'Fluency & Delivery',
    short: 'Fluency',
    captures: 'Smoothness and pacing of speech',
    weight: 1,
  },
  {
    id: 'clarity',
    label: 'Clarity & Articulation',
    short: 'Clarity',
    captures: 'How understandable the speech is',
    weight: 1,
  },
  {
    id: 'language',
    label: 'Language & Vocabulary',
    short: 'Language',
    captures: 'Richness and correctness of language',
    weight: 1,
  },
  {
    id: 'structure',
    label: 'Structure & Coherence',
    short: 'Structure',
    captures: 'Organisation of ideas',
    weight: 1,
  },
  {
    id: 'confidence',
    label: 'Confidence & Expression',
    short: 'Confidence',
    captures: 'Vocal delivery and presence',
    weight: 1,
  },
  {
    id: 'interaction',
    label: 'Interaction & Listening',
    short: 'Interaction',
    captures: 'Two-way conversational skill',
    weight: 1,
    conversationalOnly: true,
  },
];

export const CORE_PILLARS = PILLARS.filter((p) => !p.conversationalOnly);

export function pillarDef(id: PillarId): PillarDef {
  const def = PILLARS.find((p) => p.id === id);
  if (!def) throw new Error(`Unknown pillar: ${id}`);
  return def;
}

// CI = weighted average of pillar scores.
export function communicationIndex(
  scores: { id: PillarId; score: number }[]
): number {
  let weighted = 0;
  let totalWeight = 0;
  for (const s of scores) {
    const def = pillarDef(s.id);
    weighted += s.score * def.weight;
    totalWeight += def.weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round(weighted / totalWeight);
}
