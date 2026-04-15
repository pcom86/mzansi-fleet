import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ThemeToggle from '../ThemeToggle';

const GOLD = '#D4AF37';

export default function DashboardHeader({
  title,
  subtitle,
  badge,
  badgeIcon,
  user,
  onNotificationPress,
  notificationCount = 0,
  showThemeToggle = true,
  c // theme colors
}) {
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || '??';

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Text style={[styles.avatarText, { color: c.primaryText }]}>{initials}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.greeting, { color: c.text }]}>
               {user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
            </Text>
            <View style={styles.subtitleRow}>
              {badge && (
                <View style={[styles.badge, { backgroundColor: GOLD + '20', borderColor: GOLD }]}>
                  {badgeIcon && <Ionicons name={badgeIcon} size={12} color={GOLD} style={{ marginRight: 4 }} />}
                  <Text style={[styles.badgeText, { color: GOLD }]}>{badge}</Text>
                </View>
              )}
              <Text style={[styles.subtitle, { color: c.textMuted }]}>
                {subtitle || title}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {showThemeToggle && <ThemeToggle showBackground={false} size={24} />}
          <TouchableOpacity
            style={[styles.notificationBtn, { marginLeft: 8 }]}
            onPress={onNotificationPress}
          >
            <Ionicons name="notifications-outline" size={24} color={c.text} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBtn: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
});
