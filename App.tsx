import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  RootStackParamList,
  TabsParamList,
  TeacherTabsParamList,
} from '@/navigation/types';
import { colors, fontFamily } from '@/theme';
import { getProfile, getRole, hasValidConsent } from '@/storage/store';
import { loadCredentials } from '@/config';

// San Francisco everywhere: set the SF Pro stack as the app-wide default so any
// <Text>/<TextInput> without an explicit family inherits it.
const TextAny = Text as any;
const TextInputAny = TextInput as any;
TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.style = [{ fontFamily }, TextAny.defaultProps.style];
TextInputAny.defaultProps = TextInputAny.defaultProps || {};
TextInputAny.defaultProps.style = [{ fontFamily }, TextInputAny.defaultProps.style];

import RoleSelectScreen from '@/screens/RoleSelectScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import ConsentScreen from '@/screens/ConsentScreen';
import HomeScreen from '@/screens/HomeScreen';
import PracticeScreen from '@/screens/PracticeScreen';
import ProgressScreen from '@/screens/ProgressScreen';
import PrivacyScreen from '@/screens/PrivacyScreen';
import LanguageLabScreen from '@/screens/LanguageLabScreen';
import RecordScreen from '@/screens/RecordScreen';
import ProcessingScreen from '@/screens/ProcessingScreen';
import ReportScreen from '@/screens/ReportScreen';
import TabBarIcon from '@/components/TabBarIcon';

import TeacherHomeScreen from '@/screens/teacher/TeacherHomeScreen';
import TeacherSessionsScreen from '@/screens/teacher/TeacherSessionsScreen';
import TeacherProfileScreen from '@/screens/teacher/TeacherProfileScreen';
import TeacherRecordScreen from '@/screens/teacher/TeacherRecordScreen';
import TeacherReportScreen from '@/screens/teacher/TeacherReportScreen';
import ParentPortalScreen from '@/screens/ParentPortalScreen';
import ProfessionalHomeScreen from '@/screens/ProfessionalHomeScreen';
import ApiKeysScreen from '@/screens/ApiKeysScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import LaunchScreen from '@/components/LaunchScreen';
import AuthScreen from '@/screens/AuthScreen';
import DebugLogPanel from '@/components/DebugLogPanel';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabsParamList>();
const TeacherTab = createBottomTabNavigator<TeacherTabsParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg },
};

const tabBarStyle = {
  height: 66,
  paddingBottom: 10,
  paddingTop: 8,
  backgroundColor: colors.surface,
  borderTopColor: colors.glassBorder,
  borderTopWidth: 1,
};

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <TabBarIcon route={route.name} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Practice" component={PracticeScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Lab" component={LanguageLabScreen} />
      <Tab.Screen name="Privacy" component={PrivacyScreen} />
    </Tab.Navigator>
  );
}

function TeacherTabs() {
  return (
    <TeacherTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <TabBarIcon route={route.name} color={color} size={size} />
        ),
      })}
    >
      <TeacherTab.Screen name="TeacherHome" component={TeacherHomeScreen} options={{ title: 'Home' }} />
      <TeacherTab.Screen name="TeacherSessions" component={TeacherSessionsScreen} options={{ title: 'Sessions' }} />
      <TeacherTab.Screen name="TeacherProfile" component={TeacherProfileScreen} options={{ title: 'Profile' }} />
    </TeacherTab.Navigator>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('RoleSelect');

  useEffect(() => {
    (async () => {
      // Keep the launch screen up for a beat so opening the app feels deliberate,
      // while the real boot work runs in parallel.
      const minSplash = new Promise((r) => setTimeout(r, 1500));
      await loadCredentials();
      const role = await getRole();
      if (role === 'student') {
        const profile = await getProfile();
        const consent = await hasValidConsent();
        if (profile && consent) setInitialRoute('Tabs');
        else if (profile) setInitialRoute('Consent');
        else setInitialRoute('Onboarding');
      } else if (role === 'teacher') {
        setInitialRoute('TeacherTabs');
      } else if (role === 'parent') {
        setInitialRoute('ParentPortal');
      } else if (role === 'professional') {
        setInitialRoute('ProfessionalHome');
      } else {
        setInitialRoute('RoleSelect');
      }
      await minSplash;
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <LaunchScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textOnDark,
            headerTitleStyle: { fontWeight: '800' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />

          {/* Student */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Consent" component={ConsentScreen} options={{ title: 'Consent' }} />
          <Stack.Screen name="Tabs" component={StudentTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Record" component={RecordScreen} options={{ title: 'Record' }} />
          <Stack.Screen name="Processing" component={ProcessingScreen} options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Your Report' }} />

          {/* Teacher */}
          <Stack.Screen name="TeacherTabs" component={TeacherTabs} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherRecord" component={TeacherRecordScreen} options={{ title: 'Record Teaching' }} />
          <Stack.Screen name="TeacherReport" component={TeacherReportScreen} options={{ title: 'Teaching Report' }} />

          {/* Parent */}
          <Stack.Screen name="ParentPortal" component={ParentPortalScreen} options={{ headerShown: false }} />

          {/* Professional */}
          <Stack.Screen name="ProfessionalHome" component={ProfessionalHomeScreen} options={{ headerShown: false }} />

          {/* Shared */}
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="ApiKeys" component={ApiKeysScreen} options={{ title: 'API Keys' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <DebugLogPanel />
    </SafeAreaProvider>
  );
}
