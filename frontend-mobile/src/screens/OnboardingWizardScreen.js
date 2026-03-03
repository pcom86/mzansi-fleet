import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { createTenant, createUser, createOwnerProfile } from '../api/identity';
import { Colors, useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function OnboardingWizardScreen({ route, navigation }) {
  const roleParam = route.params?.role || 'Owner';
  const role = String(roleParam).trim();
  const [step, setStep] = useState(0);
  const { signIn } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');

  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userPassword, setUserPassword] = useState('');

  const [ownerContactName, setOwnerContactName] = useState('');
  const [ownerCompanyName, setOwnerCompanyName] = useState('');
  const [ownerContactEmail, setOwnerContactEmail] = useState('');
  const [ownerContactPhone, setOwnerContactPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [createdTenantId, setCreatedTenantId] = useState(null);
  const [createdUserId, setCreatedUserId] = useState(null);

  async function next() {
    try {
      setLoading(true);
      // owners need to go through tenant and profile steps; other roles skip directly to user creation
      if (role === 'Owner') {
        if (step === 0) {
          if (!tenantName || !tenantEmail || !tenantPhone) {
            return Alert.alert('Validation', 'Organization name, email and phone are required');
          }
          const resp = await createTenant({ name: tenantName, contactEmail: tenantEmail, contactPhone: tenantPhone });
          const tenantId = resp?.id || resp?.tenantId || resp?.data?.id;
          setCreatedTenantId(tenantId || null);
          setStep(1);
          return;
        }
        if (step === 1) {
          if (!userFirstName || !userLastName || !userEmail || !userPhone || !userPassword) {
            return Alert.alert('Validation', 'First name, last name, email, phone and password are required');
          }
          const userPayload = {
            tenantId: createdTenantId,
            email: userEmail,
            phone: userPhone,
            password: userPassword,
            role: 'Owner',
            isActive: true
          };
          const userResp = await createUser(userPayload);
          const userId = userResp?.id || userResp?.userId || userResp?.data?.id;
          setCreatedUserId(userId || null);
          setOwnerContactName(`${userFirstName} ${userLastName}`.trim());
          setOwnerContactEmail(userEmail);
          setOwnerContactPhone(userPhone);
          setStep(2);
          return;
        }
        if (step === 2) {
          if (!ownerContactName || !ownerCompanyName || !ownerContactEmail || !ownerContactPhone) {
            return Alert.alert('Validation', 'Contact name, company name, email and phone are required');
          }
          const ownerPayload = {
            userId: createdUserId,
            companyName: ownerCompanyName,
            address: ownerAddress,
            contactName: ownerContactName,
            contactPhone: ownerContactPhone,
            contactEmail: ownerContactEmail,
          };
          await createOwnerProfile(ownerPayload);
          await signIn(userEmail, userPassword);
          Alert.alert('Success', 'Onboarding complete');
          navigation.replace('OwnerDashboard');
        }
      } else {
        // non-owner: single step create user
        if (!userEmail || !userPassword) return Alert.alert('Validation', 'User email and password required');
        const userPayload = { tenantId: createdTenantId || '00000000-0000-0000-0000-000000000000', email: userEmail, phone: '', password: userPassword, role: role, isActive: true };
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
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {role === 'Owner' && step === 0 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Create Organization</Text>
          <TextInput placeholder="Organization name" placeholderTextColor={c.textMuted} value={tenantName} onChangeText={setTenantName} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
          <TextInput placeholder="Contact email" placeholderTextColor={c.textMuted} value={tenantEmail} onChangeText={setTenantEmail} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} autoCapitalize="none" />
          <TextInput placeholder="Contact phone" placeholderTextColor={c.textMuted} value={tenantPhone} onChangeText={setTenantPhone} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
        </>
      )}
      {(role !== 'Owner' && step === 0) || (role === 'Owner' && step === 1) ? (
        <>
          <Text style={[styles.title, { color: c.text }]}>Create User</Text>
          {role === 'Owner' ? (
            <>
              <TextInput placeholder="First name" placeholderTextColor={c.textMuted} value={userFirstName} onChangeText={setUserFirstName} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
              <TextInput placeholder="Last name" placeholderTextColor={c.textMuted} value={userLastName} onChangeText={setUserLastName} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
            </>
          ) : null}
          <TextInput placeholder="Email" placeholderTextColor={c.textMuted} value={userEmail} onChangeText={setUserEmail} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} autoCapitalize="none" />
          {role === 'Owner' ? (
            <TextInput placeholder="Phone" placeholderTextColor={c.textMuted} value={userPhone} onChangeText={setUserPhone} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
          ) : null}
          <TextInput placeholder="Password" placeholderTextColor={c.textMuted} value={userPassword} onChangeText={setUserPassword} secureTextEntry style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
        </>
      ) : null}
      {role === 'Owner' && step === 2 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Owner Profile</Text>
          <TextInput placeholder="Contact name" placeholderTextColor={c.textMuted} value={ownerContactName} onChangeText={setOwnerContactName} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
          <TextInput placeholder="Company name" placeholderTextColor={c.textMuted} value={ownerCompanyName} onChangeText={setOwnerCompanyName} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
          <TextInput placeholder="Contact email" placeholderTextColor={c.textMuted} value={ownerContactEmail} onChangeText={setOwnerContactEmail} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} autoCapitalize="none" />
          <TextInput placeholder="Contact phone" placeholderTextColor={c.textMuted} value={ownerContactPhone} onChangeText={setOwnerContactPhone} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
          <TextInput placeholder="Address" placeholderTextColor={c.textMuted} value={ownerAddress} onChangeText={setOwnerAddress} style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]} />
        </>
      )}
      <Button color={c.primary} title={loading ? 'Please wait…' : (step < 2 ? 'Next' : 'Finish')} onPress={next} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 }
});
