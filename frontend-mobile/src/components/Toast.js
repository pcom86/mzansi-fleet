import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ICONS = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

const COLORS = {
  success: { bg: '#16a34a', text: '#fff' },
  error: { bg: '#dc2626', text: '#fff' },
  info: { bg: '#2563eb', text: '#fff' },
  warning: { bg: '#d97706', text: '#fff' },
};

export default function Toast({ visible, message, type = 'success', duration = 2500, onHide }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: false }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: false }),
          Animated.timing(translateY, { toValue: -30, duration: 400, useNativeDriver: false }),
        ]).start(() => {
          if (onHide) onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, message]);

  if (!visible) return null;

  const color = COLORS[type] || COLORS.info;
  const icon = ICONS[type] || ICONS.info;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: color.bg, opacity, transform: [{ translateY }], pointerEvents: 'none' },
      ]}
    >
      <Ionicons name={icon} size={20} color={color.text} />
      <Text style={[styles.text, { color: color.text }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 54,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    gap: 10,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
});
