// Theme context: light/dark/system with persistence. Screens read the active
// palette via useTheme()/useColors(), and build styles with makeStyles() so they
// re-render (and restyle) when the scheme changes.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, darkColors, lightColors } from './index';

export type ThemeScheme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'eduband.theme';

interface ThemeValue {
  scheme: ThemeScheme; // the user's choice
  isDark: boolean; // the resolved mode
  palette: Palette;
  setScheme: (s: ThemeScheme) => void;
}

const ThemeContext = createContext<ThemeValue>({
  scheme: 'system',
  isDark: false,
  palette: lightColors,
  setScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  // Default to light (the app's original look). Dark is opt-in via the Profile
  // toggle; choosing "System" then follows the device.
  const [scheme, setSchemeState] = useState<ThemeScheme>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setSchemeState(v);
      })
      .catch(() => {});
  }, []);

  const setScheme = useCallback((s: ThemeScheme) => {
    setSchemeState(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  }, []);

  const isDark = scheme === 'dark' || (scheme === 'system' && system === 'dark');
  const palette = isDark ? darkColors : lightColors;

  const value = useMemo<ThemeValue>(
    () => ({ scheme, isDark, palette, setScheme }),
    [scheme, isDark, palette, setScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

export function useColors(): Palette {
  return useContext(ThemeContext).palette;
}

// Build a themed stylesheet. Usage:
//   const useStyles = makeStyles((colors) => ({ box: { backgroundColor: colors.bg } }));
//   ...inside component: const styles = useStyles();
// The factory param is named `colors` so existing `colors.x` refs are unchanged.
// Styles are typed loosely (Record<string, any>) so RN's literal-union style
// props don't fight the factory generic — the palette itself stays fully typed.
export function makeStyles(
  factory: (colors: Palette) => Record<string, any>
): () => Record<string, any> {
  return function useStyles(): Record<string, any> {
    const palette = useColors();
    return useMemo(() => StyleSheet.create(factory(palette)), [palette]);
  };
}
