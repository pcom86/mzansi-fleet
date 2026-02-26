import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import MzansiLogo from '../components/MzansiLogo';
import { useAppTheme } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const { theme } = useAppTheme();
  const c = theme.colors;

  function normalizeRole(role) {
    return String(role ?? '').trim().toLowerCase();
  }

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Validation', 'Email and password are required');
    try {
      setLoading(true);
      const resp = await signIn(email, password);
      const role = normalizeRole(resp?.role || resp?.data?.role);

      if (role === 'owner') {
        navigation.replace('OwnerDashboard');
      } else if (role === 'taxirankadmin' || role === 'taximarshal' || role === 'user') {
        // taxi rank or regular users should see taxi rank dashboard
        navigation.replace('TaxiRankDashboard');
      } else {
        // fallback to owner dashboard or add other roles as needed
        navigation.replace('OwnerDashboard');
      }
    } catch (err) {
      Alert.alert('Login failed', err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.logoWrap}>
        <MzansiLogo width={120} height={48} />
      </View>
      <Text style={[styles.title, { color: c.text }]}>Mzansi Fleet</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor={c.textMuted}
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={c.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
      />
      <Button color={c.primary} title={loading ? 'Signing in...' : 'Login'} onPress={handleLogin} disabled={loading} />
      <View style={{ height: 12 }} />
      <Button color={c.accent} title="Register / Onboard" onPress={() => navigation.navigate('ProfileSelection')} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 24, fontWeight: '800' },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12, borderRadius: 12 },
});
