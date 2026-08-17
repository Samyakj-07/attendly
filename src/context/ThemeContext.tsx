import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AttendlyColors,
  AttendlyShadows,
  ThemeMode,
  DARK_THEME,
  LIGHT_THEME,
} from '../constants/themes';

const STORAGE_KEY = '@attendly_theme_mode';

interface ThemeContextValue {
  colors: AttendlyColors;
  shadows: AttendlyShadows;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: DARK_THEME.colors,
  shadows: DARK_THEME.shadows,
  isDark: true,
  mode: 'dark',
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {
        // Silently fall back to dark
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // Silently fail
    }
  }, []);

  // Resolve effective theme
  const resolvedDark =
    mode === 'dark' ? true : mode === 'light' ? false : systemScheme !== 'light';

  const theme = resolvedDark ? DARK_THEME : LIGHT_THEME;

  const value: ThemeContextValue = {
    colors: theme.colors,
    shadows: theme.shadows,
    isDark: resolvedDark,
    mode,
    setMode,
  };

  // Don't render until we've loaded the persisted preference to avoid flash
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
