import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// Web-specific version without react-native-maps
export default function RiderTripProgress({ visible, onClose }) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.message}>Map not available on web platform</Text>
        <Text style={styles.submessage}>Please use the mobile app for trip tracking</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  submessage: {
    fontSize: 14,
    color: '#64748b',
  },
});
