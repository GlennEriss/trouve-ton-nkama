import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './colors';

export const palettes = {
  light: { ...colors, surface: '#FFFFFF', mutedSurface: '#F3F4F6' },
  dark: { ...colors, background: '#111827', surface: '#111827', foreground: '#F9FAFB', mutedText: '#D1D5DB', border: '#374151', mutedSurface: '#1F2937', primary: '#5EEAD4', destructive: '#FCA5A5' },
};
export type ThemeMode = keyof typeof palettes;
const STORAGE_KEY = 'tonnkama.appearance';
const ThemeContext = createContext({ mode: 'light' as ThemeMode, palette: palettes.light as typeof palettes[ThemeMode], ready: true, setMode: async (_mode: ThemeMode) => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setThemeMode] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (mounted && (value === 'light' || value === 'dark')) setThemeMode(value);
    }).catch(() => {}).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (ready) Appearance.setColorScheme(mode); }, [mode, ready]);
  const setMode = async (next: ThemeMode) => {
    if (!ready || pending.current) return;
    pending.current = true;
    try { await AsyncStorage.setItem(STORAGE_KEY, next); setThemeMode(next); }
    finally { pending.current = false; }
  };
  return <ThemeContext.Provider value={{ mode, palette: palettes[mode], ready, setMode }}>{children}</ThemeContext.Provider>;
}
export const useAppTheme = () => useContext(ThemeContext);
