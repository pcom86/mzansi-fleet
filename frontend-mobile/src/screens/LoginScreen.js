import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
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
  const styles = useMemo(() => createStyles(c), [c]);

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
      } else if (role === 'driver') {
        navigation.replace('DriverDashboard');
      } else if (role === 'serviceprovider' || role === 'service_provider' || role === 'service provider') {
        navigation.replace('ServiceProviderDashboard');
      } else if (role === 'taxirankadmin' || role === 'taximarshal' || role === 'user') {
        navigation.replace('TaxiRankDashboard');
      } else {
        navigation.replace('OwnerDashboard');
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = status ? `HTTP ${status}` : (err?.message || 'Login failed');
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <MzansiLogo width={120} height={48} />
      </View>
      <Text style={styles.title}>Mzansi Fleet</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor={c.textMuted}
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        placeholder="Password"
        placeholderTextColor={c.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={[styles.btnPrimary, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color={c.primaryText} /> : <Text style={styles.btnPrimaryText}>Login</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btnSecondary, loading && { opacity: 0.6 }]} onPress={() => navigation.navigate('ProfileSelection')} disabled={loading}>
        <Text style={styles.btnSecondaryText}>Register / Onboard</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, justifyContent: 'center', backgroundColor: c.background },
    logoWrap: { alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 24, textAlign: 'center', marginBottom: 24, fontWeight: '800', color: c.text },
    label: { fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 6, color: c.text },
    input: { borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12, backgroundColor: c.surface, color: c.text, marginBottom: 4 },
    btnPrimary: { marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900', fontSize: 15 },
    btnSecondary: { marginTop: 10, paddingVertical: 12, borderRadius: 12, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    btnSecondaryText: { color: c.text, fontWeight: '700', fontSize: 15 },
  });
}
