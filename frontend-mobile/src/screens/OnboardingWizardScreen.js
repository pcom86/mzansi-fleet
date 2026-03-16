import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTenant, createUser, createOwnerProfile } from '../api/identity';
import { createTaxiRank, registerTaxiRankUser, fetchAllTaxiRanks, fetchTaxiRankAssociations } from '../api/taxiRanks';
import { Colors, useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';

const GOLD = '#D4AF37';
const isTaxiRankAdmin = (r) => r === 'TaxiRankAdmin';
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

  // Marshal-specific state
  const [allRanks, setAllRanks] = useState([]);
  const [rankAssociations, setRankAssociations] = useState([]);
  const [selectedRankId, setSelectedRankId] = useState(null);
  const [selectedAssociationId, setSelectedAssociationId] = useState(null);
  const [loadingRanks, setLoadingRanks] = useState(false);
  const [loadingAssociations, setLoadingAssociations] = useState(false);
  const [rankModalVisible, setRankModalVisible] = useState(false);
  const [assocModalVisible, setAssocModalVisible] = useState(false);

  // Load all taxi ranks on mount for marshal flow
  useEffect(() => {
    if (role === 'TaxiMarshal') {
      loadRanks();
    }
  }, [role]);

  async function loadRanks() {
    setLoadingRanks(true);
    try {
      const resp = await fetchAllTaxiRanks();
      setAllRanks(resp.data || resp || []);
    } catch (e) {
      console.error('Failed to load ranks:', e);
    } finally {
      setLoadingRanks(false);
    }
  }

  async function loadAssociationsForRank(rankId) {
    setLoadingAssociations(true);
    try {
      const resp = await fetchTaxiRankAssociations(rankId);
      const data = resp.data || resp || [];
      const mapped = Array.isArray(data) ? data.map(a => ({
        id: a.tenantId || a.tenant?.id,
        name: a.tenant?.name || 'Unknown Association',
        code: a.tenant?.code,
      })) : [];
      setRankAssociations(mapped);
    } catch (e) {
      console.error('Failed to load associations:', e);
      setRankAssociations([]);
    } finally {
      setLoadingAssociations(false);
    }
  }

  function handleRankSelect(rankId) {
    setSelectedRankId(rankId);
    setSelectedAssociationId(null);
    setRankModalVisible(false);
    loadAssociationsForRank(rankId);
  }

  function handleAssociationSelect(assocId) {
    setSelectedAssociationId(assocId);
    setAssocModalVisible(false);
  }

  const getSelectedRankName = () => {
    const r = allRanks.find(x => x.id === selectedRankId);
    return r ? r.name : 'Select Taxi Rank';
  };

  const getSelectedAssocName = () => {
    const a = rankAssociations.find(x => x.id === selectedAssociationId);
    return a ? a.name : 'Select Association';
  };

  // Determine total steps and button label
  const isRider = role === 'User' || role === 'Rider';
  const totalSteps = role === 'Owner' ? 3 : isTaxiRankAdmin(role) ? 3 : role === 'TaxiMarshal' ? 2 : 1;
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

      } else if (role === 'TaxiMarshal') {
        // --- Marshal flow: Select rank + association, then register ---
        if (step === 0) {
          if (!selectedRankId) {
            return Alert.alert('Validation', 'Please select a taxi rank');
          }
          if (!selectedAssociationId) {
            return Alert.alert('Validation', 'Please select an association for this taxi rank');
          }
          setStep(1);
          return;
        }
        if (step === 1) {
          if (!trFullName || !trPhone || !trUserCode || !trEmail || !trPassword) {
            return Alert.alert('Validation', 'Full name, phone, marshal code, email and password are required');
          }
          const regResp = await registerTaxiRankUser({
            tenantId: selectedAssociationId,
            taxiRankId: selectedRankId,
            role: 'TaxiMarshal',
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
          Alert.alert('Success', `Marshal profile created!\n\nTaxi Rank: ${getSelectedRankName()}\nAssociation: ${getSelectedAssocName()}`);
          navigation.replace('MarshalDashboard');
        }

      } else if (isTaxiRankAdmin(role)) {
        // --- Admin flow: Create org, rank, then register ---
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

      } else if (isRider) {
        // --- Rider flow: single step registration with name, phone, email, password ---
        if (!userFirstName || !userLastName) return Alert.alert('Validation', 'First and last name are required');
        if (!userEmail) return Alert.alert('Validation', 'Email is required');
        if (!userPhone) return Alert.alert('Validation', 'Phone number is required');
        if (!userPassword || userPassword.length < 6) return Alert.alert('Validation', 'Password must be at least 6 characters');

        const userPayload = {
          tenantId: null,
          email: userEmail,
          phone: userPhone,
          password: userPassword,
          role: 'User',
          isActive: true,
          fullName: `${userFirstName} ${userLastName}`.trim(),
        };
        await createUser(userPayload);
        await signIn(userEmail, userPassword);
        Alert.alert('Welcome!', 'Your rider account has been created. Start browsing trips!');
        navigation.replace('RiderDashboard');
      } else {
        // --- Generic non-owner role ---
        if (!userEmail || !userPassword) return Alert.alert('Validation', 'User email and password required');
        const userPayload = { tenantId: createdTenantId || null, email: userEmail, phone: '', password: userPassword, role: role, isActive: true };
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

      {/* ===== Marshal Step 0: Select Taxi Rank & Association ===== */}
      {role === 'TaxiMarshal' && step === 0 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Select Your Taxi Rank</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Choose the taxi rank and association you belong to</Text>

          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Taxi Rank *</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setRankModalVisible(true)}
            disabled={loadingRanks}
          >
            {loadingRanks ? (
              <ActivityIndicator size="small" color={GOLD} />
            ) : (
              <Ionicons name="location-outline" size={20} color={c.textMuted} />
            )}
            <Text style={[styles.dropdownText, { color: selectedRankId ? c.text : c.textMuted, flex: 1 }]}>
              {loadingRanks ? 'Loading taxi ranks...' : getSelectedRankName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color={c.textMuted} />
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 16 }]}>Association *</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: c.surface, borderColor: c.border, opacity: selectedRankId ? 1 : 0.5 }]}
            onPress={() => selectedRankId && setAssocModalVisible(true)}
            disabled={!selectedRankId || loadingAssociations}
          >
            {loadingAssociations ? (
              <ActivityIndicator size="small" color={GOLD} />
            ) : (
              <Ionicons name="business-outline" size={20} color={c.textMuted} />
            )}
            <Text style={[styles.dropdownText, { color: selectedAssociationId ? c.text : c.textMuted, flex: 1 }]}>
              {!selectedRankId ? 'Select a taxi rank first' :
               loadingAssociations ? 'Loading associations...' :
               getSelectedAssocName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color={c.textMuted} />
          </TouchableOpacity>
        </>
      )}

      {/* ===== Marshal Step 1: Personal & Login Details ===== */}
      {role === 'TaxiMarshal' && step === 1 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Marshal Details</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Enter your personal and login details</Text>
          <TextInput placeholder="Full name" placeholderTextColor={c.textMuted} value={trFullName} onChangeText={(val) => { setTrFullName(val); setTrUserCode(generateUserCode(val)); }} style={inp} />
          <TextInput placeholder="Phone number" placeholderTextColor={c.textMuted} value={trPhone} onChangeText={setTrPhone} style={inp} keyboardType="phone-pad" />
          <TextInput placeholder="ID number (optional)" placeholderTextColor={c.textMuted} value={trIdNumber} onChangeText={setTrIdNumber} style={inp} />
          <TextInput placeholder="Marshal code (unique ID)" placeholderTextColor={c.textMuted} value={trUserCode} onChangeText={setTrUserCode} style={inp} autoCapitalize="characters" />
          <TextInput placeholder="Address (optional)" placeholderTextColor={c.textMuted} value={trAddress} onChangeText={setTrAddress} style={inp} />
          <TextInput placeholder="Email" placeholderTextColor={c.textMuted} value={trEmail} onChangeText={setTrEmail} style={inp} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Password" placeholderTextColor={c.textMuted} value={trPassword} onChangeText={setTrPassword} secureTextEntry style={inp} />
        </>
      )}

      {/* ===== Admin Step 0: Create Organization ===== */}
      {isTaxiRankAdmin(role) && step === 0 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Create Organization</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Set up your taxi association or organization</Text>
          <TextInput placeholder="Organization name" placeholderTextColor={c.textMuted} value={tenantName} onChangeText={setTenantName} style={inp} />
          <TextInput placeholder="Contact email" placeholderTextColor={c.textMuted} value={tenantEmail} onChangeText={setTenantEmail} style={inp} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Contact phone" placeholderTextColor={c.textMuted} value={tenantPhone} onChangeText={setTenantPhone} style={inp} keyboardType="phone-pad" />
        </>
      )}

      {/* ===== Admin Step 1: Create Taxi Rank ===== */}
      {isTaxiRankAdmin(role) && step === 1 && (
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

      {/* ===== Admin Step 2: Personal Details ===== */}
      {isTaxiRankAdmin(role) && step === 2 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Admin Details</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Enter your personal and login details</Text>
          <TextInput placeholder="Full name" placeholderTextColor={c.textMuted} value={trFullName} onChangeText={(val) => { setTrFullName(val); setTrUserCode(generateUserCode(val)); }} style={inp} />
          <TextInput placeholder="Phone number" placeholderTextColor={c.textMuted} value={trPhone} onChangeText={setTrPhone} style={inp} keyboardType="phone-pad" />
          <TextInput placeholder="ID number (optional)" placeholderTextColor={c.textMuted} value={trIdNumber} onChangeText={setTrIdNumber} style={inp} />
          <TextInput placeholder="Admin code (unique ID)" placeholderTextColor={c.textMuted} value={trUserCode} onChangeText={setTrUserCode} style={inp} autoCapitalize="characters" />
          <TextInput placeholder="Address (optional)" placeholderTextColor={c.textMuted} value={trAddress} onChangeText={setTrAddress} style={inp} />
          <TextInput placeholder="Email" placeholderTextColor={c.textMuted} value={trEmail} onChangeText={setTrEmail} style={inp} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Password" placeholderTextColor={c.textMuted} value={trPassword} onChangeText={setTrPassword} secureTextEntry style={inp} />
        </>
      )}

      {/* ===== Rider Registration ===== */}
      {isRider && step === 0 && (
        <>
          <Text style={[styles.title, { color: c.text }]}>Register as a Passenger</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Join MzansiFleet App to browse taxi ranks, book trips, and manage your travel</Text>
          <TextInput placeholder="First name *" placeholderTextColor={c.textMuted} value={userFirstName} onChangeText={setUserFirstName} style={inp} />
          <TextInput placeholder="Last name *" placeholderTextColor={c.textMuted} value={userLastName} onChangeText={setUserLastName} style={inp} />
          <TextInput placeholder="Phone number *" placeholderTextColor={c.textMuted} value={userPhone} onChangeText={setUserPhone} style={inp} keyboardType="phone-pad" />
          <TextInput placeholder="Email *" placeholderTextColor={c.textMuted} value={userEmail} onChangeText={setUserEmail} style={inp} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Password * (min 6 characters)" placeholderTextColor={c.textMuted} value={userPassword} onChangeText={setUserPassword} secureTextEntry style={inp} />
        </>
      )}

      {/* ===== Generic non-owner step ===== */}
      {!isTaxiRankRole(role) && role !== 'Owner' && !isRider && step === 0 && (
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

      {/* ===== Taxi Rank Selection Modal (Marshal) ===== */}
      <Modal visible={rankModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Taxi Rank</Text>
              <TouchableOpacity onPress={() => setRankModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {loadingRanks ? (
                <View style={styles.modalCenter}>
                  <ActivityIndicator size="large" color={GOLD} />
                  <Text style={{ color: c.textMuted, marginTop: 8 }}>Loading taxi ranks...</Text>
                </View>
              ) : allRanks.length === 0 ? (
                <View style={styles.modalCenter}>
                  <Ionicons name="location-outline" size={48} color={c.textMuted} />
                  <Text style={{ color: c.textMuted, marginTop: 8 }}>No taxi ranks available</Text>
                  <TouchableOpacity onPress={loadRanks} style={[styles.retryBtn, { backgroundColor: GOLD }]}>
                    <Text style={{ color: '#000', fontWeight: '700' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                allRanks.map((rank) => (
                  <TouchableOpacity
                    key={rank.id}
                    style={[
                      styles.optionItem,
                      { backgroundColor: c.surface, borderColor: c.border },
                      selectedRankId === rank.id && { borderColor: GOLD, backgroundColor: 'rgba(212,175,55,0.08)' }
                    ]}
                    onPress={() => handleRankSelect(rank.id)}
                  >
                    <View style={styles.optionRow}>
                      <View style={[styles.optionIcon, { backgroundColor: 'rgba(212,175,55,0.12)' }]}>
                        <Ionicons name="location" size={20} color={GOLD} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionName, { color: c.text }]}>{rank.name}</Text>
                        <Text style={{ color: c.textMuted, fontSize: 12 }}>
                          {[rank.code, rank.city, rank.province].filter(Boolean).join(' · ')}
                        </Text>
                        {rank.address ? <Text style={{ color: c.textMuted, fontSize: 11 }} numberOfLines={1}>{rank.address}</Text> : null}
                      </View>
                      {selectedRankId === rank.id && <Ionicons name="checkmark-circle" size={22} color={GOLD} />}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== Association Selection Modal (Marshal) ===== */}
      <Modal visible={assocModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Association</Text>
              <TouchableOpacity onPress={() => setAssocModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {loadingAssociations ? (
                <View style={styles.modalCenter}>
                  <ActivityIndicator size="large" color={GOLD} />
                  <Text style={{ color: c.textMuted, marginTop: 8 }}>Loading associations...</Text>
                </View>
              ) : rankAssociations.length === 0 ? (
                <View style={styles.modalCenter}>
                  <Ionicons name="business-outline" size={48} color={c.textMuted} />
                  <Text style={{ color: c.textMuted, marginTop: 8, textAlign: 'center' }}>No associations linked to this taxi rank</Text>
                  <TouchableOpacity onPress={() => loadAssociationsForRank(selectedRankId)} style={[styles.retryBtn, { backgroundColor: GOLD }]}>
                    <Text style={{ color: '#000', fontWeight: '700' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                rankAssociations.map((assoc) => (
                  <TouchableOpacity
                    key={assoc.id}
                    style={[
                      styles.optionItem,
                      { backgroundColor: c.surface, borderColor: c.border },
                      selectedAssociationId === assoc.id && { borderColor: GOLD, backgroundColor: 'rgba(212,175,55,0.08)' }
                    ]}
                    onPress={() => handleAssociationSelect(assoc.id)}
                  >
                    <View style={styles.optionRow}>
                      <View style={[styles.optionIcon, { backgroundColor: 'rgba(212,175,55,0.12)' }]}>
                        <Ionicons name="business" size={20} color={GOLD} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionName, { color: c.text }]}>{assoc.name}</Text>
                        {assoc.code ? <Text style={{ color: c.textMuted, fontSize: 12 }}>{assoc.code}</Text> : null}
                      </View>
                      {selectedAssociationId === assoc.id && <Ionicons name="checkmark-circle" size={22} color={GOLD} />}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  dropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 12, gap: 10, marginBottom: 4 },
  dropdownText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalScroll: { maxHeight: 400 },
  modalCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  optionItem: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  retryBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});
