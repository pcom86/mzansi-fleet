import React from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import MzansiLogo from '../components/MzansiLogo';
import { Colors, useAppTheme } from '../theme';

export default function ProfileSelectionScreen({ navigation }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.logoWrap}>
        <MzansiLogo width={120} height={48} />
      </View>
      <Text style={[styles.title, { color: c.text }]}>Select profile to register</Text>
      <Button color={c.primary} title="Normal User / Rider" onPress={() => navigation.navigate('Onboarding', { role: 'User' })} />
      <View style={{ height: 8 }} />
      <Button color={c.primary} title="Taxi Rank User" onPress={() => navigation.navigate('Onboarding', { role: 'TaxiMarshal' })} />
      <View style={{ height: 8 }} />
      <Button color={c.primary} title="Driver" onPress={() => navigation.navigate('DriverRegistration')} />
      <View style={{ height: 8 }} />
      <Button color={c.primary} title="Service Provider" onPress={() => navigation.navigate('ServiceProviderRegistration')} />
      <View style={{ height: 8 }} />
      <Button color={c.accent} title="Owner" onPress={() => navigation.navigate('Onboarding', { role: 'Owner' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, marginBottom: 16, textAlign: 'center' }
});
