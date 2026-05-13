import React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GOLD = '#D4AF37';

export default function DashboardLayout({
  children,
  c, // theme colors
  refreshing = false,
  onRefresh,
  loading = false,
  loadingText = 'Loading...',
  scrollable = true,
  style,
  contentContainerStyle,
}) {
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingText, { color: c.textMuted, marginTop: 12 }]}>{loadingText}</Text>
      </View>
    );
  }

  const content = (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }, style]}>
      {children}
    </View>
  );

  if (!scrollable) {
    return content;
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: c.background }, style]}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, 20) }, contentContainerStyle]}
      refreshControl={
        onRefresh && (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        )
      }
    >
      {children}
    </ScrollView>
  );
}

import { Text } from 'react-native';

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
});
