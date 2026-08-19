import React, { createContext, useContext } from 'react';
import {
  AttendlyColors,
  AttendlyShadows,
  LIGHT_THEME,
} from '../constants/themes';

interface ThemeContextValue {
  colors: AttendlyColors;
  shadows: AttendlyShadows;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LIGHT_THEME.colors,
  shadows: LIGHT_THEME.shadows,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const value: ThemeContextValue = {
    colors: LIGHT_THEME.colors,
    shadows: LIGHT_THEME.shadows,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
