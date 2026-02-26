// shared color palette derived from web app branding
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export const themes = {
  light: {
    mode: 'light',
    colors: {
      background: '#F7F8FA',
      surface: '#FFFFFF',
      surface2: '#F2F4F7',
      text: '#111827',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      primary: '#D4AF37',
      primaryText: '#000000',
      secondary: '#111827',
      accent: '#F0E68C',
      danger: '#EF4444',
      success: '#16A34A',
      info: '#2563EB',
    },
  },
  dark: {
    mode: 'dark',
    colors: {
      background: '#000000',
      surface: '#0B0B0B',
      surface2: '#141414',
      text: '#F5F5F5',
      textMuted: '#A1A1AA',
      border: '#2A2A2A',
      primary: '#D4AF37',
      primaryText: '#000000',
      secondary: '#F5F5F5',
      accent: '#F0E68C',
      danger: '#F87171',
      success: '#22C55E',
      info: '#60A5FA',
    },
  },
};

const ThemeContext = createContext({
  theme: themes.light,
  mode: 'light',
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState(systemScheme === 'dark' ? 'dark' : 'light');

  const value = useMemo(() => {
    const t = mode === 'dark' ? themes.dark : themes.light;
    return { theme: t, mode, setMode };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

// Backward-compatible alias used by older screens.
// New code should prefer `useAppTheme()`.
export const Colors = themes.light.colors;
