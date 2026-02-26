import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { createTenant, createUser, createOwnerProfile } from '../api/identity';
import { Colors } from '../theme';

export default function OnboardingWizardScreen({ route, navigation }) {
  const roleParam = route.params?.role || 'Owner';
  const role = String(roleParam).trim();
  const [step, setStep] = useState(0);
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdTenantId, setCreatedTenantId] = useState(null);
  const [createdUserId, setCreatedUserId] = useState(null);

  async function next() {
    try {
      setLoading(true);
      // owners need to go through tenant and profile steps; other roles skip directly to user creation
      if (role === 'Owner') {
        if (step === 0) {
          if (!tenantName) return Alert.alert('Validation', 'Tenant name required');
          const resp = await createTenant({ name: tenantName, contactEmail: tenantEmail, contactPhone: '' });
          const tenantId = resp?.id || resp?.tenantId || resp?.data?.id;
          setCreatedTenantId(tenantId || null);
          setStep(1);
          return;
        }
        if (step === 1) {
          if (!userEmail || !userPassword) return Alert.alert('Validation', 'User email and password required');
          const userPayload = { tenantId: createdTenantId, email: userEmail, phone: '', password: userPassword, role: 'Owner', isActive: true };
          const userResp = await createUser(userPayload);
          const userId = userResp?.id || userResp?.userId || userResp?.data?.id;
          setCreatedUserId(userId || null);
          setStep(2);
          return;
        }
        if (step === 2) {
          if (!companyName) return Alert.alert('Validation', 'Company name required');
          const ownerPayload = { userId: createdUserId, companyName, address: '', contactName: '', contactPhone: '', contactEmail: '' };
          await createOwnerProfile(ownerPayload);
          Alert.alert('Success', 'Onboarding complete');
          navigation.navigate('Login');
        }
      } else {
        // non-owner: single step create user
        if (!userEmail || !userPassword) return Alert.alert('Validation', 'User email and password required');
        const userPayload = { tenantId: createdTenantId || null, email: userEmail, phone: '', password: userPassword, role: role, isActive: true };
        await createUser(userPayload);
        Alert.alert('Success', 'Registration successful');
        navigation.navigate('Login');
      }
    } catch (err) {
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {role === 'Owner' && step === 0 && (
        <>
          <Text style={styles.title}>Create Tenant</Text>
          <TextInput placeholder="Tenant name" value={tenantName} onChangeText={setTenantName} style={styles.input} />
          <TextInput placeholder="Contact email" value={tenantEmail} onChangeText={setTenantEmail} style={styles.input} />
        </>
      )}
      {(role !== 'Owner' && step === 0) || (role === 'Owner' && step === 1) ? (
        <>
          <Text style={styles.title}>Create User</Text>
          <TextInput placeholder="User email" value={userEmail} onChangeText={setUserEmail} style={styles.input} />
          <TextInput placeholder="Password" value={userPassword} onChangeText={setUserPassword} secureTextEntry style={styles.input} />
        </>
      ) : null}
      {role === 'Owner' && step === 2 && (
        <>
          <Text style={styles.title}>Owner Profile</Text>
          <TextInput placeholder="Company name" value={companyName} onChangeText={setCompanyName} style={styles.input} />
        </>
      )}
      <Button color={Colors.primary} title={loading ? 'Please wait…' : (step < 2 ? 'Next' : 'Finish')} onPress={next} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 }
});
