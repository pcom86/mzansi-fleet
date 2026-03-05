import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { fetchAdminByUserId, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } from '../api/taxiRanks';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TaxiRankRoutesScreen({ route: navRoute, navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const rank = navRoute?.params?.rank;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [routeName, setRouteName] = useState('');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('06:00');
  const [frequency, setFrequency] = useState('30');
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [fare, setFare] = useState('');
  const [duration, setDuration] = useState('');
  const [maxPassengers, setMaxPassengers] = useState('');
  const [notes, setNotes] = useState('');

  // Stops state: [{id, stopName, fareFromOrigin, estimatedMinutes}]
  const [stops, setStops] = useState([]);

  const loadData = useCallback(async (silent = false) => {
    if (!user?.userId && !user?.id) return;
    if (!silent) setLoading(true);
    try {
      const adminResp = await fetchAdminByUserId(user.userId || user.id);
      const admin = adminResp.data || adminResp;
      setAdminProfile(admin);

      if (admin?.id) {
        const schedResp = await fetchSchedules(admin.id);
        setRoutes(schedResp.data || schedResp || []);
      }
    } catch (err) {
      console.warn('Routes load error', err?.response?.data?.message || err?.message);
      if (!silent) {
        // If admin profile not found, still allow viewing the screen
        if (err?.response?.status === 404) {
          setAdminProfile(null);
          setRoutes([]);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(true); };

  function resetForm() {
    setRouteName(''); setDeparture(''); setDestination('');
    setDepartureTime('06:00'); setFrequency('30');
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setFare(''); setDuration(''); setMaxPassengers(''); setNotes('');
    setStops([]);
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    if (rank?.name) {
      setDeparture(rank.name);
    }
    setModalVisible(true);
  }

  function openEdit(r) {
    setEditing(r);
    setRouteName(r.routeName || '');
    setDeparture(r.departureStation || '');
    setDestination(r.destinationStation || '');
    const t = r.departureTime || '06:00';
    setDepartureTime(typeof t === 'string' ? t.slice(0, 5) : '06:00');
    setFrequency(String(r.frequencyMinutes || 30));
    setSelectedDays(r.daysOfWeek ? r.daysOfWeek.split(',') : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setFare(String(r.standardFare || ''));
    setDuration(r.expectedDurationMinutes ? String(r.expectedDurationMinutes) : '');
    setMaxPassengers(r.maxPassengers ? String(r.maxPassengers) : '');
    setNotes(r.notes || '');
    // Load existing stops
    const existingStops = (r.stops || []).sort((a, b) => a.stopOrder - b.stopOrder).map(s => ({
      id: s.id || String(Math.random()),
      stopName: s.stopName || '',
      fareFromOrigin: String(s.fareFromOrigin || ''),
      estimatedMinutes: s.estimatedMinutesFromDeparture ? String(s.estimatedMinutesFromDeparture) : '',
    }));
    setStops(existingStops);
    setModalVisible(true);
  }

  // Stop helpers
  function addStop() {
    setStops(prev => [...prev, { id: String(Date.now()), stopName: '', fareFromOrigin: '', estimatedMinutes: '' }]);
  }

  function removeStop(id) {
    setStops(prev => prev.filter(s => s.id !== id));
  }

  function updateStop(id, field, value) {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  function toggleDay(day) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  // Parse "HH:MM" to "HH:MM:SS" TimeSpan
  function parseTime(str) {
    const parts = str.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }

  async function handleSave() {
    if (!routeName.trim()) return Alert.alert('Validation', 'Route name is required');
    if (!departure.trim()) return Alert.alert('Validation', 'Departure station is required');
    if (!destination.trim()) return Alert.alert('Validation', 'Destination station is required');
    if (!fare.trim() || isNaN(Number(fare))) return Alert.alert('Validation', 'Valid fare is required');
    if (selectedDays.length === 0) return Alert.alert('Validation', 'Select at least one day');
    if (!adminProfile?.id) return Alert.alert('Error', 'Admin profile not found. Only rank admins can manage routes.');

    // Validate stops
    for (const s of stops) {
      if (!s.stopName.trim()) return Alert.alert('Validation', 'Each stop must have a name');
      if (!s.fareFromOrigin || isNaN(Number(s.fareFromOrigin))) return Alert.alert('Validation', `Stop "${s.stopName}" needs a valid fare`);
    }

    const body = {
      routeName: routeName.trim(),
      departureStation: departure.trim(),
      destinationStation: destination.trim(),
      departureTime: parseTime(departureTime),
      frequencyMinutes: parseInt(frequency, 10) || 30,
      daysOfWeek: selectedDays.join(','),
      standardFare: parseFloat(fare),
      expectedDurationMinutes: duration ? parseInt(duration, 10) : null,
      maxPassengers: maxPassengers ? parseInt(maxPassengers, 10) : null,
      notes: notes.trim() || null,
      stops: stops.map((s, i) => ({
        stopName: s.stopName.trim(),
        stopOrder: i + 1,
        fareFromOrigin: parseFloat(s.fareFromOrigin),
        estimatedMinutesFromDeparture: s.estimatedMinutes ? parseInt(s.estimatedMinutes, 10) : null,
      })),
    };

    setSaving(true);
    try {
      if (editing) {
        await updateSchedule(adminProfile.id, editing.id, body);
        Alert.alert('Success', 'Route updated');
      } else {
        await createSchedule(adminProfile.id, body);
        Alert.alert('Success', 'Route created');
      }
      setModalVisible(false);
      resetForm();
      loadData(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r) {
    if (!adminProfile?.id) return;
    Alert.alert('Delete Route', `Delete "${r.routeName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteSchedule(adminProfile.id, r.id);
            loadData(true);
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || err?.message || 'Delete failed');
          }
        }
      },
    ]);
  }

  const inp = [styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Routes & Schedules</Text>
          <Text style={styles.headerSub}>{rank?.name || 'Taxi Rank'}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* No admin guard */}
      {!adminProfile && (
        <View style={[styles.center, { flex: 1 }]}>
          <Ionicons name="lock-closed-outline" size={40} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>Only Rank Admins can manage routes.</Text>
        </View>
      )}

      {/* Route list */}
      {adminProfile && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
        >
          {routes.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="map-outline" size={48} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No routes yet</Text>
              <Text style={[styles.emptyHint, { color: c.textMuted }]}>Tap + to create a route</Text>
            </View>
          ) : (
            routes.map((r) => (
              <TouchableOpacity key={r.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => openEdit(r)} activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: GOLD_LIGHT }]}>
                    <Ionicons name="git-branch-outline" size={20} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{r.routeName}</Text>
                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>
                      {r.departureStation} → {r.destinationStation}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(r)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={18} color="#dc3545" />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardDetails}>
                  <Tag icon="time-outline" label={typeof r.departureTime === 'string' ? r.departureTime.slice(0, 5) : '--:--'} c={c} />
                  <Tag icon="repeat-outline" label={`Every ${r.frequencyMinutes}m`} c={c} />
                  <Tag icon="cash-outline" label={`R${r.standardFare}`} c={c} />
                  {r.maxPassengers && <Tag icon="people-outline" label={`${r.maxPassengers} pax`} c={c} />}
                  {r.stops?.length > 0 && <Tag icon="location-outline" label={`${r.stops.length} stop${r.stops.length > 1 ? 's' : ''}`} c={c} />}
                </View>
                {r.stops?.length > 0 && (
                  <View style={styles.cardStops}>
                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>{r.departureStation}</Text>
                    {[...r.stops].sort((a, b) => a.stopOrder - b.stopOrder).map(s => (
                      <React.Fragment key={s.id}>
                        <Ionicons name="chevron-forward" size={10} color={c.textMuted} />
                        <Text style={[styles.cardMeta, { color: c.textMuted }]}>{s.stopName} <Text style={{ color: GOLD }}>R{s.fareFromOrigin}</Text></Text>
                      </React.Fragment>
                    ))}
                    <Ionicons name="chevron-forward" size={10} color={c.textMuted} />
                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>{r.destinationStation}</Text>
                  </View>
                )}
                <View style={styles.daysRow}>
                  {DAYS.map(d => (
                    <View key={d} style={[styles.dayChip, (r.daysOfWeek || '').includes(d) && styles.dayChipActive]}>
                      <Text style={[styles.dayText, (r.daysOfWeek || '').includes(d) && styles.dayTextActive]}>{d.charAt(0)}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>{editing ? 'Edit Route' : 'New Route'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: c.textMuted }]}>Route Name</Text>
              <TextInput placeholder="e.g. JHB to PTA" placeholderTextColor={c.textMuted} value={routeName} onChangeText={setRouteName} style={inp} />

              <Text style={[styles.label, { color: c.textMuted }]}>Departure Station</Text>
              <TextInput placeholder="From" placeholderTextColor={c.textMuted} value={departure} onChangeText={setDeparture} style={inp} />

              <Text style={[styles.label, { color: c.textMuted }]}>Destination Station</Text>
              <TextInput placeholder="To" placeholderTextColor={c.textMuted} value={destination} onChangeText={setDestination} style={inp} />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Departure Time</Text>
                  <TextInput placeholder="HH:MM" placeholderTextColor={c.textMuted} value={departureTime} onChangeText={setDepartureTime} style={inp} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Frequency (min)</Text>
                  <TextInput placeholder="30" placeholderTextColor={c.textMuted} value={frequency} onChangeText={setFrequency} style={inp} keyboardType="numeric" />
                </View>
              </View>

              <Text style={[styles.label, { color: c.textMuted }]}>Days of Operation</Text>
              <View style={styles.daysSelector}>
                {DAYS.map(d => (
                  <TouchableOpacity key={d} style={[styles.daySel, selectedDays.includes(d) && styles.daySelActive]} onPress={() => toggleDay(d)}>
                    <Text style={[styles.daySelText, selectedDays.includes(d) && styles.daySelTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Fare (R)</Text>
                  <TextInput placeholder="25.00" placeholderTextColor={c.textMuted} value={fare} onChangeText={setFare} style={inp} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Duration (min)</Text>
                  <TextInput placeholder="45" placeholderTextColor={c.textMuted} value={duration} onChangeText={setDuration} style={inp} keyboardType="numeric" />
                </View>
              </View>

              <Text style={[styles.label, { color: c.textMuted }]}>Max Passengers</Text>
              <TextInput placeholder="15" placeholderTextColor={c.textMuted} value={maxPassengers} onChangeText={setMaxPassengers} style={inp} keyboardType="numeric" />

              <Text style={[styles.label, { color: c.textMuted }]}>Notes (optional)</Text>
              <TextInput placeholder="Any additional info" placeholderTextColor={c.textMuted} value={notes} onChangeText={setNotes} style={[...inp, { minHeight: 60 }]} multiline />

              {/* Stops & Fares */}
              <View style={styles.stopsHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Stops & Fares</Text>
                  <Text style={[styles.sectionHint, { color: c.textMuted }]}>Intermediate stops with fares from origin</Text>
                </View>
                <TouchableOpacity style={styles.addStopBtn} onPress={addStop}>
                  <Ionicons name="add" size={18} color="#000" />
                  <Text style={styles.addStopText}>Add Stop</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.stopPill, styles.stopPillOrigin]}>
                <View style={styles.stopDot} />
                <Text style={[styles.stopPillLabel, { color: c.text }]}>{departure || 'Origin'}</Text>
                <Text style={[styles.stopPillFare, { color: c.textMuted }]}>R0.00</Text>
              </View>

              {stops.map((s, idx) => (
                <View key={s.id}>
                  <View style={styles.stopLine} />
                  <View style={[styles.stopRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={[styles.stopNumBadge, { backgroundColor: GOLD_LIGHT }]}>
                      <Text style={styles.stopNum}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <TextInput
                        value={s.stopName}
                        onChangeText={v => updateStop(s.id, 'stopName', v)}
                        style={[styles.stopInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                        placeholder="Stop name"
                        placeholderTextColor={c.textMuted}
                      />
                      <View style={styles.stopFareRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stopFieldLabel, { color: c.textMuted }]}>Fare from origin (R)</Text>
                          <TextInput
                            value={s.fareFromOrigin}
                            onChangeText={v => updateStop(s.id, 'fareFromOrigin', v)}
                            style={[styles.stopInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                            placeholder="15.00"
                            placeholderTextColor={c.textMuted}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stopFieldLabel, { color: c.textMuted }]}>Est. minutes</Text>
                          <TextInput
                            value={s.estimatedMinutes}
                            onChangeText={v => updateStop(s.id, 'estimatedMinutes', v)}
                            style={[styles.stopInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                            placeholder="20"
                            placeholderTextColor={c.textMuted}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => removeStop(s.id)} style={styles.removeStopBtn}>
                      <Ionicons name="close-circle" size={20} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {stops.length > 0 && <View style={styles.stopLine} />}

              <View style={[styles.stopPill, styles.stopPillDest]}>
                <View style={[styles.stopDot, styles.stopDotDest]} />
                <Text style={[styles.stopPillLabel, { color: c.text }]}>{destination || 'Destination'}</Text>
                <Text style={[styles.stopPillFare, { color: GOLD }]}>R{fare || '0'}</Text>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{editing ? 'Update Route' : 'Create Route'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Tag({ icon, label, c }) {
  return (
    <View style={[tagStyles.tag, { backgroundColor: GOLD_LIGHT }]}>
      <Ionicons name={icon} size={12} color={GOLD} />
      <Text style={[tagStyles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  text: { fontSize: 11, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },

  header: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: GOLD, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  addBtn: { backgroundColor: GOLD, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  listContent: { padding: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 12 },

  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardStops: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  daysRow: { flexDirection: 'row', gap: 4 },
  dayChip: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: GOLD },
  dayText: { fontSize: 10, fontWeight: '700', color: '#999' },
  dayTextActive: { color: '#000' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalBody: { padding: 16, paddingBottom: 40 },

  label: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },

  daysSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  daySel: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.06)' },
  daySelActive: { backgroundColor: GOLD },
  daySelText: { fontSize: 12, fontWeight: '700', color: '#999' },
  daySelTextActive: { color: '#000' },

  saveBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },

  stopsHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionHint: { fontSize: 11, marginTop: 2 },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, gap: 4 },
  addStopText: { fontSize: 12, fontWeight: '800', color: '#000' },

  stopPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  stopPillOrigin: { borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'rgba(0,0,0,0.04)' },
  stopPillDest: { borderColor: GOLD, backgroundColor: GOLD_LIGHT },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6c757d' },
  stopDotDest: { backgroundColor: GOLD },
  stopPillLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  stopPillFare: { fontSize: 12, fontWeight: '700' },

  stopLine: { width: 2, height: 16, backgroundColor: 'rgba(0,0,0,0.12)', marginLeft: 16, marginVertical: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 10, gap: 10 },
  stopNumBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  stopNum: { fontSize: 11, fontWeight: '900', color: GOLD },
  stopInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  stopFareRow: { flexDirection: 'row', gap: 8 },
  stopFieldLabel: { fontSize: 10, fontWeight: '600', marginBottom: 3 },
  removeStopBtn: { paddingTop: 8 },
});
