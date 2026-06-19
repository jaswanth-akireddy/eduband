// Teacher "Analyse Teaching" demo data + coverage analysis (mock).
// In production: parse attached materials -> extract planned topics ->
// match transcript against topics via LLM -> coverage report + next plan.

import { TeachingAnalysis } from '@/types';
import { FRAMEWORK_VERSION } from '@/analysis/framework';

export interface TeachingSession {
  id: string;
  title: string;
  date: number;
  durationSec: number;
  hasMaterials: boolean;
  analysis: TeachingAnalysis;
}

export const DEMO_TEACHING_SESSIONS: TeachingSession[] = [
  {
    id: 't_photosynthesis',
    title: 'Photosynthesis — Grade 8',
    date: Date.now() - 1000 * 60 * 60 * 3,
    durationSec: 32 * 60,
    hasMaterials: true,
    analysis: {
      ci: 81,
      modelVersion: 'mock-1.0.0',
      frameworkVersion: FRAMEWORK_VERSION,
      practiceSuggestionTaskId: null,
      strengths: ['Clear, well-paced explanation', 'Good use of real-world examples'],
      focusAreas: ['structure'],
      pillars: [
        { id: 'fluency', label: 'Fluency & Delivery', score: 83, evidence: '142 wpm, few fillers', tip: 'Keep this steady pace.', why: 'Pacing and flow' },
        { id: 'clarity', label: 'Clarity & Articulation', score: 85, evidence: 'Clear throughout', tip: 'Crisp word endings.', why: 'High intelligibility' },
        { id: 'language', label: 'Language & Vocabulary', score: 80, evidence: 'Good domain vocabulary', tip: 'Define new terms once more.', why: 'Rich, accurate terms' },
        { id: 'structure', label: 'Structure & Coherence', score: 72, evidence: 'Jumped between sub-topics', tip: 'Signpost transitions clearly.', why: 'Some topic jumps' },
        { id: 'confidence', label: 'Confidence & Expression', score: 84, evidence: 'Assured tone', tip: 'Vary emphasis on key terms.', why: 'Confident delivery' },
      ],
      coverage: {
        coveragePct: 88,
        coveredWell: [
          'Light & chlorophyll role',
          'Word equation of photosynthesis',
          'Gas exchange (CO₂ / O₂)',
        ],
        missedOrSkipped: [
          'Limiting factors (planned, not taught)',
          'Why the reaction needs sunlight — rushed',
        ],
        rushedOrUnclear: [
          'The sunlight requirement was covered in under 30 seconds',
        ],
        nextSessionPlan: [
          'Re-teach limiting factors with a graph',
          'Add a quick recap of the sunlight requirement',
          'Check understanding with 2 quick questions',
        ],
      },
    },
  },
  {
    id: 't_newton',
    title: "Newton's Laws — Grade 9",
    date: Date.now() - 1000 * 60 * 60 * 24 * 2,
    durationSec: 28 * 60,
    hasMaterials: true,
    analysis: {
      ci: 76,
      modelVersion: 'mock-1.0.0',
      frameworkVersion: FRAMEWORK_VERSION,
      practiceSuggestionTaskId: null,
      strengths: ['Strong worked examples'],
      focusAreas: ['fluency'],
      pillars: [
        { id: 'fluency', label: 'Fluency & Delivery', score: 70, evidence: 'Several long pauses', tip: 'Prepare transitions to reduce pauses.', why: 'Pacing dips' },
        { id: 'clarity', label: 'Clarity & Articulation', score: 78, evidence: 'Mostly clear', tip: 'Project a little more.', why: 'Good clarity' },
        { id: 'language', label: 'Language & Vocabulary', score: 79, evidence: 'Accurate terms', tip: 'Keep it.', why: 'Solid vocabulary' },
        { id: 'structure', label: 'Structure & Coherence', score: 77, evidence: 'Logical order', tip: 'Recap at the end.', why: 'Well organised' },
        { id: 'confidence', label: 'Confidence & Expression', score: 75, evidence: 'Steady', tip: 'More vocal energy.', why: 'Calm tone' },
      ],
      coverage: {
        coveragePct: 92,
        coveredWell: ['First law (inertia)', 'Second law (F = ma)', 'Everyday examples'],
        missedOrSkipped: ['Third law application problems (planned)'],
        rushedOrUnclear: ['Units of force mentioned only briefly'],
        nextSessionPlan: [
          'Do 3 action–reaction problems',
          'Recap units of force (newtons)',
        ],
      },
    },
  },
];

export function teachingSessionById(id: string): TeachingSession | undefined {
  return DEMO_TEACHING_SESSIONS.find((s) => s.id === id);
}
