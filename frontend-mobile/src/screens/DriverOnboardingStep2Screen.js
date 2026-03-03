import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { createDriverProfile, createUser } from '../api/identity';
import { useAppTheme } from '../theme';

const IMAGE_MEDIA_TYPES =
  ImagePicker?.MediaType?.image
    ? [ImagePicker.MediaType.image]
    : (ImagePicker?.MediaTypeOptions?.Images ?? ImagePicker?.MediaTypeOptions?.All);

const LICENSE_TYPES = [
  { code: 'Code EB', label: 'Code EB', desc: 'Light motor vehicle' },
  { code: 'Code C1', label: 'Code C1', desc: 'Light truck (< 16 000 kg)' },
  { code: 'Code C', label: 'Code C', desc: 'Heavy motor vehicle' },
  { code: 'Code EC1', label: 'Code EC1', desc: 'Articulated motor vehicle' },
  { code: 'Code EC', label: 'Code EC', desc: 'Artic. + any trailer' },
  { code: 'Code A', label: 'Code A', desc: 'Motorcycle' },
];

const PDP_TYPES = [
  { key: 'G', label: 'G — Goods' },
  { key: 'D', label: 'D — Dangerous Goods' },
  { key: 'P', label: 'P — Passengers' },
];

async function pickImage(onResult) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow photo library access.');
    return;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    ...(IMAGE_MEDIA_TYPES ? { mediaTypes: IMAGE_MEDIA_TYPES } : {}),
    base64: true,
    quality: 0.7,
  });
  if (res.canceled) return;
  const asset = res.assets?.[0];
  if (!asset) return;
  onResult({
    uri: asset.uri,
    base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null,
  });
}

export default function DriverOnboardingStep2Screen({ navigation, route }) {
  const { name, idNumber, phone, email, password, photoUrl } = route.params ?? {};
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [licenseUri, setLicenseUri] = useState(null);
  const [licenseBase64, setLicenseBase64] = useState('');
  const [licenseType, setLicenseType] = useState('');

  const [hasPdp, setHasPdp] = useState(false);
  const [pdpType, setPdpType] = useState('');
  const [pdpUri, setPdpUri] = useState(null);
  const [pdpBase64, setPdpBase64] = useState('');

  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!licenseType) return Alert.alert('Validation', 'Please select your licence type');
    if (hasPdp && !pdpType) return Alert.alert('Validation', 'Please select your PDP category');

    try {
      setLoading(true);

      const userResp = await createUser({
        tenantId: null, email, phone, password, role: 'Driver', isActive: true,
      });
      const userId = userResp?.id || userResp?.userId || userResp?.data?.id;
      if (!userId) throw new Error('User created but no ID returned — cannot create driver profile');

      await createDriverProfile({
        userId,
        name,
        idNumber,
        phone,
        email,
        photoUrl: photoUrl || '',
        licenseCopy: licenseBase64 || '',
        experience: bio.trim(),
        category: licenseType,
        hasPdp,
        pdpCopy: hasPdp ? (pdpBase64 || pdpType) : '',
        isActive: true,
        isAvailable: true,
      });

      Alert.alert('Success 🎉', 'Your driver account has been created. Please log in.');
      navigation.navigate('Login');
    } catch (err) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        err?.message ||
        String(err);
      console.warn('Driver onboarding error', err?.response?.status, JSON.stringify(err?.response?.data));
      Alert.alert('Registration failed', detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text style={styles.stepHint}>Step 2 of 2</Text>
      <Text style={styles.title}>Driver Details</Text>

      {/* ── Licence copy ─────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Licence Copy</Text>
      <TouchableOpacity
        style={styles.photoCard}
        onPress={() => pickImage(r => { setLicenseUri(r.uri); setLicenseBase64(r.base64 || ''); })}
        disabled={loading}
      >
        {licenseUri ? (
          <Image source={{ uri: licenseUri }} style={styles.licenseImage} resizeMode="contain" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="card-outline" size={36} color={c.textMuted} />
            <Text style={styles.photoHint}>Tap to upload licence copy</Text>
            <Text style={styles.photoSub}>Front or both sides (JPEG / PNG)</Text>
          </View>
        )}
        {licenseUri && (
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {/* ── Licence type ─────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Licence Type</Text>
      <View style={styles.grid}>
        {LICENSE_TYPES.map(lt => (
          <TouchableOpacity
            key={lt.code}
            style={[styles.licCard, licenseType === lt.code && styles.licCardOn]}
            onPress={() => setLicenseType(lt.code)}
          >
            <Text style={[styles.licCode, licenseType === lt.code && styles.licCodeOn]}>{lt.label}</Text>
            <Text style={[styles.licDesc, licenseType === lt.code && { color: '#fff' }]} numberOfLines={2}>{lt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── PDP ──────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Professional Driving Permit (PDP)</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !hasPdp && styles.toggleBtnOn]}
          onPress={() => setHasPdp(false)}
        >
          <Text style={[styles.toggleTxt, !hasPdp && styles.toggleTxtOn]}>No PDP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, hasPdp && styles.toggleBtnOn]}
          onPress={() => setHasPdp(true)}
        >
          <Text style={[styles.toggleTxt, hasPdp && styles.toggleTxtOn]}>I have a PDP</Text>
        </TouchableOpacity>
      </View>

      {hasPdp && (
        <>
          <Text style={styles.label}>PDP Category</Text>
          <View style={styles.chips}>
            {PDP_TYPES.map(pt => (
              <TouchableOpacity
                key={pt.key}
                style={[styles.chip, pdpType === pt.key && styles.chipOn]}
                onPress={() => setPdpType(pt.key)}
              >
                <Text style={[styles.chipTxt, pdpType === pt.key && styles.chipTxtOn]}>{pt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>PDP Copy (optional)</Text>
          <TouchableOpacity
            style={[styles.photoCard, { height: 100 }]}
            onPress={() => pickImage(r => { setPdpUri(r.uri); setPdpBase64(r.base64 || ''); })}
            disabled={loading}
          >
            {pdpUri ? (
              <Image source={{ uri: pdpUri }} style={styles.licenseImage} resizeMode="contain" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="document-outline" size={28} color={c.textMuted} />
                <Text style={styles.photoHint}>Tap to upload PDP copy</Text>
              </View>
            )}
            {pdpUri && (
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* ── Driver Bio ───────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Driver Bio</Text>
      <Text style={styles.bioHint}>
        Tell fleet owners about your experience, routes you know, and what makes you a great driver.
      </Text>
      <TextInput
        style={styles.bioInput}
        value={bio}
        onChangeText={setBio}
        placeholder="e.g. 8 years experience driving minibus taxis on Johannesburg routes. Safety-first approach, clean record…"
        placeholderTextColor={c.textMuted}
        multiline
        textAlignVertical="top"
        maxLength={600}
        editable={!loading}
      />
      <Text style={styles.charCount}>{bio.length} / 600</Text>

      {/* ── Submit ───────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
        onPress={submit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={c.primaryText} />
          : (
            <View style={styles.btnInner}>
              <Ionicons name="checkmark-circle" size={20} color={c.primaryText} />
              <Text style={styles.btnPrimaryText}>Complete Registration</Text>
            </View>
          )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    stepHint: { fontSize: 12, fontWeight: '700', color: c.textMuted, textAlign: 'center', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' },
    title: { fontSize: 22, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '900', color: c.text, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Photo / document card
    photoCard: { borderWidth: 1.5, borderColor: c.border, borderStyle: 'dashed', borderRadius: 14, height: 140, overflow: 'hidden', backgroundColor: c.surface, marginBottom: 4, justifyContent: 'center' },
    licenseImage: { width: '100%', height: '100%' },
    photoPlaceholder: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 6 },
    photoHint: { fontSize: 13, fontWeight: '700', color: c.textMuted },
    photoSub: { fontSize: 11, color: c.textMuted },
    editBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: c.primary, borderRadius: 12, padding: 5 },

    // Licence type grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    licCard: { width: '30%', borderWidth: 1.5, borderColor: c.border, borderRadius: 12, padding: 10, backgroundColor: c.surface, alignItems: 'center' },
    licCardOn: { backgroundColor: c.primary, borderColor: c.primary },
    licCode: { fontSize: 13, fontWeight: '900', color: c.text, marginBottom: 4 },
    licCodeOn: { color: '#fff' },
    licDesc: { fontSize: 9, color: c.textMuted, textAlign: 'center', lineHeight: 13 },

    // PDP toggle
    toggleRow: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 12, padding: 3 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    toggleBtnOn: { backgroundColor: c.primary, elevation: 2, shadowColor: c.primary, shadowOpacity: 0.3, shadowRadius: 6 },
    toggleTxt: { fontSize: 14, fontWeight: '700', color: c.textMuted },
    toggleTxtOn: { color: '#fff', fontWeight: '900' },

    // Chips
    label: { fontSize: 12, fontWeight: '700', color: c.textMuted, marginTop: 14, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    chipOn: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    chipTxtOn: { color: '#fff', fontWeight: '700' },

    // Bio
    bioHint: { fontSize: 12, color: c.textMuted, lineHeight: 18, marginBottom: 10 },
    bioInput: { borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, backgroundColor: c.surface, color: c.text, fontSize: 14, lineHeight: 22, height: 140 },
    charCount: { fontSize: 11, color: c.textMuted, textAlign: 'right', marginTop: 4, marginBottom: 2 },

    // Button
    btnPrimary: { marginTop: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center' },
    btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900', fontSize: 16 },
  });
}
