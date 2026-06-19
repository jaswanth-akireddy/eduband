import { NavigatorScreenParams } from '@react-navigation/native';

// Student bottom tabs
export type TabsParamList = {
  Home: undefined;
  Practice: undefined;
  Progress: undefined;
  Lab: undefined;
  Privacy: undefined;
};

// Teacher bottom tabs
export type TeacherTabsParamList = {
  TeacherHome: undefined;
  TeacherSessions: undefined;
  TeacherProfile: undefined;
};

export type RootStackParamList = {
  RoleSelect: undefined;
  Auth: { role: import('@/types').Role };

  // Student flow
  Onboarding: undefined;
  Consent: undefined;
  Tabs: NavigatorScreenParams<TabsParamList>;
  Record: { taskId: string | null };
  Processing: {
    taskId: string | null;
    mode: 'guided' | 'free';
    audioUri: string | null;
    durationSec: number;
  };
  Report: { sessionId: string };

  // Teacher flow
  TeacherTabs: NavigatorScreenParams<TeacherTabsParamList>;
  TeacherRecord: undefined;
  TeacherReport: { sessionId: string };

  // Parent flow
  ParentPortal: undefined;

  // Professional flow
  ProfessionalHome: undefined;

  // Shared
  ApiKeys: undefined;
};
