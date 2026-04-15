import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardSection({
  title,
  icon,
  children,
  c, // theme colors
  action,
  actionLabel = 'View All',
  padding = true,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon && <Ionicons name={icon} size={18} color={c.primary} style={{ marginRight: 8 }} />}
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        </View>
        {action && (
          <TouchableOpacity onPress={action} style={styles.action}>
            <Text style={[styles.actionText, { color: c.primary }]}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color={c.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.content, padding && { padding: 16, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  content: {
    overflow: 'hidden',
  },
});
