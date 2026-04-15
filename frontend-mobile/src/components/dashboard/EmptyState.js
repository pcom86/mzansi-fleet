import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#D4AF37';

export default function EmptyState({
  icon = 'inbox-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  c,
}) {
  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Ionicons name={icon} size={48} color={c.textMuted} />
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: c.textMuted }]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.action} onPress={onAction}>
          <Ionicons name="add-circle" size={18} color={GOLD} />
          <Text style={[styles.actionText, { color: GOLD }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});
