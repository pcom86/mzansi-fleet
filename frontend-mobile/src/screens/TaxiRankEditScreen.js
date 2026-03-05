import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { fetchTaxiRankById, updateTaxiRank } from '../api/taxiRanks';

const GOLD = '#D4AF37';

export default function TaxiRankEditScreen({ route: navRoute, navigation }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const rank = navRoute?.params?.rank;
  const rankId = rank?.id;

  const [loading, setLoading] = useState(!!rankId);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(rank?.name || '');
  const [code, setCode] = useState(rank?.code || '');
  const [address, setAddress] = useState(rank?.address || '');
  const [city, setCity] = useState(rank?.city || '');
  const [province, setProvince] = useState(rank?.province || '');
  const [latitude, setLatitude] = useState(rank?.latitude ? String(rank.latitude) : '');
  const [longitude, setLongitude] = useState(rank?.longitude ? String(rank.longitude) : '');
  const [capacity, setCapacity] = useState(rank?.capacity ? String(rank.capacity) : '');
  const [operatingHours, setOperatingHours] = useState(rank?.operatingHours || '');
  const [status, setStatus] = useState(rank?.status || 'Active');
  const [notes, setNotes] = useState(rank?.notes || '');

  useEffect(() => {
    if (rankId) loadFull();
  }, [rankId]);

  async function loadFull() {
    try {
      const resp = await fetchTaxiRankById(rankId);
      const d = resp.data || resp;
      setName(d.name || '');
      setCode(d.code || '');
      setAddress(d.address || '');
      setCity(d.city || '');
      setProvince(d.province || '');
      setLatitude(d.latitude ? String(d.latitude) : '');
      setLongitude(d.longitude ? String(d.longitude) : '');
      setCapacity(d.capacity ? String(d.capacity) : '');
      setOperatingHours(d.operatingHours || '');
      setStatus(d.status || 'Active');
      setNotes(d.notes || '');
    } catch (err) {
      console.warn('Load rank error', err?.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Validation', 'Rank name is required');
    if (!rankId) return Alert.alert('Error', 'No rank to update');

    const body = {
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      province: province.trim(),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      capacity: capacity ? parseInt(capacity, 10) : null,
      operatingHours: operatingHours.trim(),
      status: status.trim(),
      notes: notes.trim(),
    };

    setSaving(true);
    try {
      await updateTaxiRank(rankId, body);
      Alert.alert('Success', 'Taxi rank updated', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Update failed';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  const inp = [styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  const statuses = ['Active', 'Inactive', 'UnderMaintenance'];

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Edit Taxi Rank</Text>
          <Text style={styles.headerSub}>{name || 'Details'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Identity */}
          <Text style={[styles.section, { color: c.text }]}>Identity</Text>
          <Text style={[styles.label, { color: c.textMuted }]}>Rank Name</Text>
          <TextInput value={name} onChangeText={setName} style={inp} placeholderTextColor={c.textMuted} placeholder="Rank name" />

          <Text style={[styles.label, { color: c.textMuted }]}>Rank Code</Text>
          <TextInput value={code} editable={false} style={[...inp, { opacity: 0.6 }]} />

          {/* Location */}
          <Text style={[styles.section, { color: c.text }]}>Location</Text>
          <Text style={[styles.label, { color: c.textMuted }]}>Address</Text>
          <TextInput value={address} onChangeText={setAddress} style={inp} placeholderTextColor={c.textMuted} placeholder="Street address" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>City</Text>
              <TextInput value={city} onChangeText={setCity} style={inp} placeholderTextColor={c.textMuted} placeholder="City" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Province</Text>
              <TextInput value={province} onChangeText={setProvince} style={inp} placeholderTextColor={c.textMuted} placeholder="Province" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Latitude</Text>
              <TextInput value={latitude} onChangeText={setLatitude} style={inp} keyboardType="decimal-pad" placeholderTextColor={c.textMuted} placeholder="-26.2041" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Longitude</Text>
              <TextInput value={longitude} onChangeText={setLongitude} style={inp} keyboardType="decimal-pad" placeholderTextColor={c.textMuted} placeholder="28.0473" />
            </View>
          </View>

          {/* Operations */}
          <Text style={[styles.section, { color: c.text }]}>Operations</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Capacity</Text>
              <TextInput value={capacity} onChangeText={setCapacity} style={inp} keyboardType="numeric" placeholderTextColor={c.textMuted} placeholder="e.g. 50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Operating Hours</Text>
              <TextInput value={operatingHours} onChangeText={setOperatingHours} style={inp} placeholderTextColor={c.textMuted} placeholder="05:00-22:00" />
            </View>
          </View>

          <Text style={[styles.label, { color: c.textMuted }]}>Status</Text>
          <View style={styles.statusRow}>
            {statuses.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.statusBtn, status === s && styles.statusBtnActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.statusText, status === s && styles.statusTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: c.textMuted }]}>Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} style={[...inp, { minHeight: 70 }]} multiline placeholderTextColor={c.textMuted} placeholder="Additional information" />

          {/* Save */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: GOLD, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  body: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 16, fontWeight: '900', marginTop: 16, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 4, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statusBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.06)' },
  statusBtnActive: { backgroundColor: GOLD },
  statusText: { fontSize: 12, fontWeight: '700', color: '#999' },
  statusTextActive: { color: '#000' },

  saveBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },
});
