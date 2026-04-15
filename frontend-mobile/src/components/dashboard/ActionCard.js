import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#D4AF37';

export default function ActionCard({
  icon,
  title,
  desc,
  onPress,
  color,
  bg,
  badge,
  disabled,
  c // theme colors
}) {
  const cardColor = color || c.primary;
  const cardBg = bg || c.surface;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: c.border }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: cardColor + '20' }]}>
          <Ionicons name={icon} size={22} color={cardColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.desc, { color: c.textMuted }]} numberOfLines={1}>{desc}</Text>
        </View>
      </View>
      <View style={styles.right}>
        {badge !== undefined && (
          <View style={[styles.badge, { backgroundColor: cardColor + '20' }]}>
            <Text style={[styles.badgeText, { color: cardColor }]}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export function ActionGrid({ actions, c, columns = 2 }) {
  return (
    <View style={[styles.grid, { marginHorizontal: -6 }]}>
      {actions.map((action, index) => (
        <View
          key={action.title || index}
          style={[styles.gridItem, { width: columns === 2 ? '50%' : columns === 3 ? '33.333%' : '100%', paddingHorizontal: 6, marginBottom: 12 }]}
        >
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: action.bg || c.surface, borderColor: c.border }, action.disabled && styles.disabled]}
            onPress={action.onPress}
            disabled={action.disabled}
            activeOpacity={0.75}
          >
            <View style={[styles.gridIconContainer, { backgroundColor: (action.color || c.primary) + '20' }]}>
              <Ionicons name={action.icon} size={24} color={action.color || c.primary} />
            </View>
            <Text style={[styles.gridTitle, { color: c.text }]} numberOfLines={1}>{action.title}</Text>
            {action.badge !== undefined && (
              <View style={[styles.gridBadge, { backgroundColor: (action.color || c.primary) + '20' }]}>
                <Text style={[styles.gridBadgeText, { color: action.color || c.primary }]}>{action.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  desc: {
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  gridCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  gridIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  gridBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
