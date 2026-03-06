import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';

export default function ThemeToggle({ style, size = 24, showBackground = true }) {
  const { theme, mode, setMode } = useAppTheme();
  const c = theme.colors;

  const toggleTheme = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  return (
    <TouchableOpacity
      style={[
        showBackground && styles.container,
        showBackground && { backgroundColor: c.surface, borderColor: c.border },
        style
      ]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Ionicons
        name={mode === 'light' ? 'moon' : 'sunny'}
        size={size}
        color={mode === 'light' ? '#f59e0b' : '#fbbf24'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
