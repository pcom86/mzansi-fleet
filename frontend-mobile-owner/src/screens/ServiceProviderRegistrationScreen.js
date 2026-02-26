import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { registerServiceProvider } from '../api/identity';
import { Colors } from '../theme';

export default function ServiceProviderRegistrationScreen({ navigation }) {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!businessName || !email || !password) return Alert.alert('Validation', 'All fields are required');
    try {
      setLoading(true);
      await registerServiceProvider({ businessName, email, password });
      Alert.alert('Success', 'Service provider registered');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Provider Registration</Text>
      <TextInput placeholder="Business name" value={businessName} onChangeText={setBusinessName} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <Button color={Colors.primary} title={loading ? 'Registering…' : 'Register'} onPress={submit} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 }
});
