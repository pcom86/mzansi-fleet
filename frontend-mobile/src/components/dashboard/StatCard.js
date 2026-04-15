import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StatCard({
  icon,
  value,
  label,
  color = '#3b82f6',
  subtext,
  trend,
  trendUp,
  c // theme colors
}) {
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.value, { color: c.text }]}>{value}</Text>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      {(subtext || trend !== undefined) && (
        <View style={styles.footer}>
          {trend !== undefined && (
            <Ionicons
              name={trendUp ? 'trending-up' : 'trending-down'}
              size={12}
              color={trendUp ? '#22c55e' : '#ef4444'}
            />
          )}
          {subtext && (
            <Text style={[styles.subtext, { color: c.textMuted }]}>{subtext}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 110,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 20,
    fontWeight: '900',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  subtext: {
    fontSize: 10,
  },
});
