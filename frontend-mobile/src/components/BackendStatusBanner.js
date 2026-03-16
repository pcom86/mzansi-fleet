import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConnectivity } from '../context/ConnectivityContext';

export default function BackendStatusBanner() {
  const { isBackendReachable, checkHealth } = useConnectivity();
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isBackendReachable ? -60 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isBackendReachable]);

  if (isBackendReachable) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.row}>
        <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
        <Text style={styles.text}>Server unreachable</Text>
      </View>
      <TouchableOpacity onPress={checkHealth} style={styles.retryBtn}>
        <Ionicons name="refresh-outline" size={16} color="#fff" />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 48,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { color: '#fff', fontSize: 13, fontWeight: '700' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff30', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
