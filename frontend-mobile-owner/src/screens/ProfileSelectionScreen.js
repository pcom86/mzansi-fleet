import React from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import MzansiLogo from '../components/MzansiLogo';
import { Colors } from '../theme';

export default function ProfileSelectionScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <MzansiLogo width={120} height={48} />
      </View>
      <Text style={styles.title}>Select profile to register</Text>
      <Button color={Colors.primary} title="Normal User / Rider" onPress={() => navigation.navigate('Onboarding', { role: 'User' })} />
      <View style={{ height: 8 }} />
      <Button color={Colors.primary} title="Taxi Rank User" onPress={() => navigation.navigate('Onboarding', { role: 'TaxiMarshal' })} />
      <View style={{ height: 8 }} />
      <Button color={Colors.primary} title="Driver" onPress={() => navigation.navigate('DriverRegistration')} />
      <View style={{ height: 8 }} />
      <Button color={Colors.primary} title="Service Provider" onPress={() => navigation.navigate('ServiceProviderRegistration')} />
      <View style={{ height: 8 }} />
      <Button color={Colors.secondary} title="Owner" onPress={() => navigation.navigate('OwnerRegistration')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', backgroundColor: Colors.background },
  logoWrap: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, marginBottom: 16, textAlign: 'center', color: Colors.secondary }
});
