import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RentalMarketplaceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rental Marketplace</Text>
      <Text style={styles.body}>This feature is available on the web and will be ported to mobile next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  body: { color: '#666' },
});
