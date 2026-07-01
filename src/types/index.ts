// Core domain types for EduBand (Phase 1 MVP)

export type PillarId =
  | 'fluency'
  | 'clarity'
  | 'language'
  | 'structure'
  | 'confidence'
  | 'interaction';

export type Level = 'middle' | 'high' | 'college';

// Multi-persona roles (role selection on app open).
export type Role = 'student' | 'teacher' | 'parent' | 'professional';

// What kind of session was recorded/analysed.
export type SessionKind = 'speaking' | 'teaching' | 'labday' | 'professional';

export interface PillarScore {
  id: PillarId;
  label: string;
  score: number; // 0-100, age/level normed
  evidence: string; // a real snippet from the student's speech
  tip: string; // one concrete, doable next step
  why: string; // the specific metric behind the score
}

// Deterministic metrics computed in code (reproducible, cheap)
export interface DeterministicMetrics {
  durationSec: number;
  wordCount: number;
  wpm: number; // words per minute
  fillerCount: number;
  fillerRate: number; // fillers / total words
  pauseCount: number;
  avgPauseSec: number;
  lexicalDiversity: number; // unique / total, length-corrected (0-1)
  sentenceLengthVariety: number; // stdev of sentence lengths
  sttConfidence: number; // 0-1 proxy for intelligibility
}

export interface WordTiming {
  word: string;
  startSec: number;
  endSec: number;
  confidence: number;
}

export interface Transcript {
  text: string;
  words: WordTiming[];
}

export interface Analysis {
  ci: number; // Communication Index 0-100
  pillars: PillarScore[];
  strengths: string[];
  focusAreas: PillarId[];
  practiceSuggestionTaskId: string | null;
  modelVersion: string;
  frameworkVersion: string;
}

export interface Session {
  id: string;
  taskId: string | null;
  taskPrompt: string;
  mode: 'guided' | 'free';
  createdAt: number; // epoch ms
  durationSec: number;
  audioUri: string | null; // local uri; deleted after analysis by default
  transcript: Transcript;
  metrics: DeterministicMetrics;
  analysis: Analysis;
}

export interface Task {
  id: string;
  prompt: string;
  targetLevel: Level;
  targetPillars: PillarId[];
  suggestedSeconds: number;
}

export type Gender = 'female' | 'male' | 'other';

export interface StudentProfile {
  name: string;
  level: Level;
  language: string;
  schoolCode: string;
  // Optional: drives the personalised avatar. Absent on profiles created before
  // this field existed — treat as 'other' (a neutral avatar).
  gender?: Gender;
}

export interface ConsentRecord {
  studentName: string;
  grantedBy: string; // parent/guardian name
  relationship: string;
  granted: boolean;
  timestamp: number;
}

// ---- Multi-persona additions ----------------------------------------------

export interface RoleProfile {
  role: Role;
  name: string;
  // student/professional level or teaching subject context
  level: Level;
  language: string;
  // student: school code; teacher: institution; parent: linked student name
  orgOrLink: string;
}

// Teacher "Analyse Teaching" — content/pedagogy coverage on top of delivery.
export interface TeachingMaterial {
  id: string;
  name: string;
  // parsed list of planned topics extracted from the attached material
  plannedTopics: string[];
}

export interface TeachingCoverage {
  coveredWell: string[];
  missedOrSkipped: string[];
  rushedOrUnclear: string[];
  nextSessionPlan: string[];
  coveragePct: number; // % of planned topics actually taught
}

export interface TeachingAnalysis extends Analysis {
  coverage: TeachingCoverage;
}

// Language Lab wearable device state.
export interface LabDevice {
  paired: boolean;
  name: string;
  batteryPct: number;
  lastSync: number | null; // epoch ms
  connection: 'wifi' | 'bluetooth' | null;
}
