// Age/level normalisation (Section 3, 10). A strong 8th-grader is not held to
// the same bar as a final-year college student. Map raw metrics to 0-100
// against level bands. These are reasonable starting bands — refine with real
// data as you collect it (and store framework_version so scores stay comparable).

import { Level } from '@/types';

// A band describes the "ideal" range for a metric at a given level.
// Scores peak inside [idealLow, idealHigh] and taper outside it.
interface Band {
  idealLow: number;
  idealHigh: number;
  hardLow: number; // score ~ floor below this
  hardHigh: number; // score ~ floor above this
}

interface LevelNorms {
  wpm: Band;
  fillerRate: Band; // lower is better -> ideal near 0
  avgPauseSec: Band;
  lexicalDiversity: Band; // higher is better
  sentenceLengthVariety: Band;
}

// Conversational, age-appropriate norms. Younger speakers naturally talk
// slower and use simpler vocabulary; we do not penalise that.
const NORMS: Record<Level, LevelNorms> = {
  middle: {
    wpm: { idealLow: 100, idealHigh: 150, hardLow: 50, hardHigh: 210 },
    fillerRate: { idealLow: 0, idealHigh: 0.05, hardLow: -1, hardHigh: 0.18 },
    avgPauseSec: { idealLow: 0.3, idealHigh: 1.2, hardLow: 0, hardHigh: 3 },
    lexicalDiversity: { idealLow: 0.55, idealHigh: 0.8, hardLow: 0.3, hardHigh: 1 },
    sentenceLengthVariety: { idealLow: 2, idealHigh: 6, hardLow: 0, hardHigh: 12 },
  },
  high: {
    wpm: { idealLow: 110, idealHigh: 160, hardLow: 60, hardHigh: 220 },
    fillerRate: { idealLow: 0, idealHigh: 0.04, hardLow: -1, hardHigh: 0.15 },
    avgPauseSec: { idealLow: 0.3, idealHigh: 1.0, hardLow: 0, hardHigh: 2.5 },
    lexicalDiversity: { idealLow: 0.6, idealHigh: 0.82, hardLow: 0.35, hardHigh: 1 },
    sentenceLengthVariety: { idealLow: 3, idealHigh: 8, hardLow: 0, hardHigh: 14 },
  },
  college: {
    wpm: { idealLow: 120, idealHigh: 170, hardLow: 70, hardHigh: 230 },
    fillerRate: { idealLow: 0, idealHigh: 0.03, hardLow: -1, hardHigh: 0.12 },
    avgPauseSec: { idealLow: 0.2, idealHigh: 0.9, hardLow: 0, hardHigh: 2.2 },
    lexicalDiversity: { idealLow: 0.62, idealHigh: 0.85, hardLow: 0.4, hardHigh: 1 },
    sentenceLengthVariety: { idealLow: 4, idealHigh: 10, hardLow: 0, hardHigh: 16 },
  },
};

// Map a raw value to 0-100 using a trapezoid: full marks inside the ideal
// range, linear taper to a floor outside it.
export function bandScore(value: number, band: Band): number {
  const { idealLow, idealHigh, hardLow, hardHigh } = band;
  if (value >= idealLow && value <= idealHigh) return 100;
  if (value < idealLow) {
    if (value <= hardLow) return 30;
    const t = (value - hardLow) / (idealLow - hardLow);
    return Math.round(30 + 70 * t);
  }
  // value > idealHigh
  if (value >= hardHigh) return 30;
  const t = (hardHigh - value) / (hardHigh - idealHigh);
  return Math.round(30 + 70 * t);
}

export function getNorms(level: Level): LevelNorms {
  return NORMS[level];
}
