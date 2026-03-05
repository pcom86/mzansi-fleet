import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { createTenant, createUser, createOwnerProfile } from '../api/identity';
import { createTaxiRank, registerTaxiRankUser } from '../api/taxiRanks';
import { Colors, useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';

const isTaxiRankRole = (r) => r === 'TaxiMarshal' || r === 'TaxiRankAdmin';

function generateRankCode(name) {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
  const num = String(Math.floor(Math.random() * 900) + 100);
  return letters ? `${letters}-${num}` : '';
}

function generateUserCode(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return initials ? `${initials}-${num}` : '';
}

export default function OnboardingWizardScreen({ route, navigation }) {
  const roleParam = route.params?.role || 'Owner';
  const role = String(roleParam).trim();
  const [step, setStep] = useState(0);
  const { signIn } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  // Shared state
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdTenantId, setCreatedTenantId] = useState(null);
  const [createdUserId, setCreatedUserId] = useState(null);

  // Owner state
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

  // Taxi Rank state
  const [rankName, setRankName] = useState('');
  const [rankCode, setRankCode] = useState('');
  const [rankAddress, setRankAddress] = useState('');
  const [rankCity, setRankCity] = useState('');
  const [rankProvince, setRankProvince] = useState('');
  const [createdRankId, setCreatedRankId] = useState(null);

  const [trFullName, setTrFullName] = useState('');
  const [trPhone, setTrPhone] = useState('');
  const [trIdNumber, setTrIdNumber] = useState('');
  const [trUserCode, setTrUserCode] = useState('');
  const [trEmail, setTrEmail] = useState('');
  const [trPassword, setTrPassword] = useState('');
  const [trAddress, setTrAddress] = useState('');

  // Determine total steps and button label
  const totalSteps = role === 'Owner' ? 3 : isTaxiRankRole(role) ? 3 : 1;
  const isLastStep = step >= totalSteps - 1;

  async function next() {
    try {
      setLoading(true);

      if (role === 'Owner') {
        // --- Owner flow (unchanged) ---
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

      } else if (isTaxiRankRole(role)) {
        // --- Taxi Rank User flow ---
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
          if (!rankName || !rankCode || !rankAddress || !rankCity || !rankProvince) {
            return Alert.alert('Validation', 'Rank name, code, address, city and province are required');
          }
          const rankResp = await createTaxiRank({
            tenantId: createdTenantId,
            name: rankName,
            code: rankCode,
            address: rankAddress,
            city: rankCity,
            province: rankProvince,
          });
          const rankId = rankResp?.id || rankResp?.data?.id;
          setCreatedRankId(rankId || null);
          setStep(2);
          return;
        }
        if (step === 2) {
          if (!trFullName || !trPhone || !trUserCode || !trEmail || !trPassword) {
            return Alert.alert('Validation', 'Full name, phone, user code, email and password are required');
          }
          const regResp = await registerTaxiRankUser({
            tenantId: createdTenantId,
            taxiRankId: createdRankId,
            role: role,
            userCode: trUserCode,
            fullName: trFullName,
            phoneNumber: trPhone,
            email: trEmail,
            password: trPassword,
            idNumber: trIdNumber || null,
            address: trAddress || null,
          });
          if (regResp?.success === false) {
            return Alert.alert('Error', regResp?.message || 'Registration failed');
          }
          await signIn(trEmail, trPassword);
          Alert.alert('Success', 'Registration complete');
          navigation.replace('TaxiRankDashboard');
        }

      } else {
        // --- Generic non-owner role ---
        if (!userEmail || !userPassword) return Alert.alert('Validation', 'User email and password required');
        const userPayload = { tenantId: createdTenantId || '00000000-0000-0000-0000-000000000000', email: userEmail, phone: '', password: userPassword, role: role, isActive: true };
        await createUser(userPayload);
        Alert.alert('Success', 'Registration successful');
        navigation.navigate('Login');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || String(err);
      const status = err?.response?.status;
      console.warn('Onboarding error', msg, 'Status:', status, 'Data:', JSON.stringify(err?.response?.data));
      Alert.alert('Error', status ? `${msg} (HTTP ${status})` : msg);
    } finally {
      setLoading(false);
    }
  }

  const inp = [styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }];

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Step indicator for multi-step flows */}
      {totalSteps > 1 && (
        <View style={styles.stepRow}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View key={i} style={[styles.stepDot, { backgroundColor: i <= step ? c.primary : c.border }]} />
          ))}
        </View>
      )}

      {/* ===== Owner Step 0: Create Organization ===== */}
      {role === 'Owner' && step === 0 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Create Organization</Text>
          <TextInput placeholder="Organization name" placeholderTextColor={c.textMuted} value={tenantName} onChangeText={setTenantName} style={inp} />
          <TextInput placeholder="Contact email" placeholderTextColor={c.textMuted} value={tenantEmail} onChangeText={setTenantEmail} style={inp} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Contact phone" placeholderTextColor={c.textMuted} value={tenantPhone} onChangeText={setTenantPhone} style={inp} keyboardType="phone-pad" />
        </>
      )}

      {/* ===== Owner Step 1: Create User ===== */}
      {role === 'Owner' && step === 1 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Create User Account</Text>
          <TextInput placeholder="First name" placeholderTextColor={c.textMuted} value={userFirstName} onChangeText={setUserFirstName} style={inp} />
          <TextInput placeholder="Last name" placeholderTextColor={c.textMuted} value={userLastName} onChangeText={setUserLastName} style={inp} />
          <TextInput placeholder="Email" placeholderTextColor={c.textMuted} value={userEmail} onChangeText={setUserEmail} style={inp} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Phone" placeholderTextColor={c.textMuted} value={userPhone} onChangeText={setUserPhone} style={inp} keyboardType="phone-pad" />
          <TextInput placeholder="Password" placeholderTextColor={c.textMuted} value={userPassword} onChangeText={setUserPassword} secureTextEntry style={inp} />
        </>
      )}

      {/* ===== Owner Step 2: Owner Profile ===== */}
      {role === 'Owner' && step === 2 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Owner Profile</Text>
          <TextInput placeholder="Contact name" placeholderTextColor={c.textMuted} value={ownerContactName} onChangeText={setOwnerContactName} style={inp} />
          <TextInput placeholder="Company name" placeholderTextColor={c.textMuted} value={ownerCompanyName} onChangeText={setOwnerCompanyName} style={inp} />
          <TextInput placeholder="Contact email" placeholderTextColor={c.textMuted} value={ownerContactEmail} onChangeText={setOwnerContactEmail} style={inp} autoCapitalize="none" />
          <TextInput placeholder="Contact phone" placeholderTextColor={c.textMuted} value={ownerContactPhone} onChangeText={setOwnerContactPhone} style={inp} keyboardType="phone-pad" />
          <TextInput placeholder="Address" placeholderTextColor={c.textMuted} value={ownerAddress} onChangeText={setOwnerAddress} style={inp} />
        </>
      )}

      {/* ===== Taxi Rank Step 0: Create Organization ===== */}
      {isTaxiRankRole(role) && step === 0 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Create Organization</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Set up your taxi association or organization</Text>
          <TextInput placeholder="Organization name" placeholderTextColor={c.textMuted} value={tenantName} onChangeText={setTenantName} style={inp} />
          <TextInput placeholder="Contact email" placeholderTextColor={c.textMuted} value={tenantEmail} onChangeText={setTenantEmail} style={inp} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Contact phone" placeholderTextColor={c.textMuted} value={tenantPhone} onChangeText={setTenantPhone} style={inp} keyboardType="phone-pad" />
        </>
      )}

      {/* ===== Taxi Rank Step 1: Create Taxi Rank ===== */}
      {isTaxiRankRole(role) && step === 1 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Create Taxi Rank</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Enter the details of the taxi rank you manage</Text>
          <TextInput placeholder="Rank name" placeholderTextColor={c.textMuted} value={rankName} onChangeText={(val) => { setRankName(val); setRankCode(generateRankCode(val)); }} style={inp} />
          <TextInput placeholder="Rank code (e.g. JHB-001)" placeholderTextColor={c.textMuted} value={rankCode} onChangeText={setRankCode} style={inp} autoCapitalize="characters" />
          <TextInput placeholder="Address" placeholderTextColor={c.textMuted} value={rankAddress} onChangeText={setRankAddress} style={inp} />
          <TextInput placeholder="City" placeholderTextColor={c.textMuted} value={rankCity} onChangeText={setRankCity} style={inp} />
          <TextInput placeholder="Province" placeholderTextColor={c.textMuted} value={rankProvince} onChangeText={setRankProvince} style={inp} />
        </>
      )}

      {/* ===== Taxi Rank Step 2: Personal Details ===== */}
      {isTaxiRankRole(role) && step === 2 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>
            {role === 'TaxiRankAdmin' ? 'Admin Details' : 'Marshal Details'}
          </Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Enter your personal and login details</Text>
          <TextInput placeholder="Full name" placeholderTextColor={c.textMuted} value={trFullName} onChangeText={(val) => { setTrFullName(val); setTrUserCode(generateUserCode(val)); }} style={inp} />
          <TextInput placeholder="Phone number" placeholderTextColor={c.textMuted} value={trPhone} onChangeText={setTrPhone} style={inp} keyboardType="phone-pad" />
          <TextInput placeholder="ID number (optional)" placeholderTextColor={c.textMuted} value={trIdNumber} onChangeText={setTrIdNumber} style={inp} />
          <TextInput placeholder={role === 'TaxiRankAdmin' ? 'Admin code (unique ID)' : 'Marshal code (unique ID)'} placeholderTextColor={c.textMuted} value={trUserCode} onChangeText={setTrUserCode} style={inp} autoCapitalize="characters" />
          <TextInput placeholder="Address (optional)" placeholderTextColor={c.textMuted} value={trAddress} onChangeText={setTrAddress} style={inp} />
          <TextInput placeholder="Email" placeholderTextColor={c.textMuted} value={trEmail} onChangeText={setTrEmail} style={inp} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Password" placeholderTextColor={c.textMuted} value={trPassword} onChangeText={setTrPassword} secureTextEntry style={inp} />
        </>
      )}

      {/* ===== Generic non-owner step ===== */}
      {!isTaxiRankRole(role) && role !== 'Owner' && step === 0 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Create Account</Text>
          <TextInput placeholder="Email" placeholderTextColor={c.textMuted} value={userEmail} onChangeText={setUserEmail} style={inp} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Password" placeholderTextColor={c.textMuted} value={userPassword} onChangeText={setUserPassword} secureTextEntry style={inp} />
        </>
      )}

      <View style={{ marginTop: 8 }}>
        <Button color={c.primary} title={loading ? 'Please wait…' : (isLastStep ? 'Finish' : 'Next')} onPress={next} disabled={loading} />
      </View>

      {step > 0 && (
        <View style={{ marginTop: 8 }}>
          <Button color={c.textMuted} title="Back" onPress={() => setStep(s => s - 1)} disabled={loading} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 12, borderRadius: 8, fontSize: 15 },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20, marginTop: 8 },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
});
