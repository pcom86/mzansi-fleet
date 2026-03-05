import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  fetchAdminByUserId, fetchSchedules, fetchRankVehicles,
  createTrip, addPassengerToTrip, fetchTripPassengers,
  removePassengerFromTrip, updateTripStatus,
} from '../api/taxiRanks';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export default function CaptureTripScreen({ route: navRoute, navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const rank = navRoute?.params?.rank;

  // Phase: 'setup' (fill trip details) -> 'passengers' (add passengers) -> 'review' (final check)
  const [phase, setPhase] = useState('setup');

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Trip setup form
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [departureStation, setDepartureStation] = useState('');
  const [destinationStation, setDestinationStation] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [fare, setFare] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Active trip
  const [tripId, setTripId] = useState(null);

  // Passengers
  const [passengers, setPassengers] = useState([]);
  const [paxModalVisible, setPaxModalVisible] = useState(false);
  const [paxName, setPaxName] = useState('');
  const [paxPhone, setPaxPhone] = useState('');
  const [paxAmount, setPaxAmount] = useState('');
  const [paxSeat, setPaxSeat] = useState('');
  const [paxNotes, setPaxNotes] = useState('');
  const [addingPax, setAddingPax] = useState(false);

  // Vehicle picker modal
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  // Route picker modal
  const [routeModalVisible, setRouteModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.userId && !user?.id) { setLoading(false); return; }
    try {
      const adminResp = await fetchAdminByUserId(user.userId || user.id);
      const admin = adminResp.data || adminResp;
      setAdminProfile(admin);

      if (admin?.id) {
        const [schedResp, vehResp] = await Promise.all([
          fetchSchedules(admin.id).catch(() => ({ data: [] })),
          fetchRankVehicles(admin.id).catch(() => ({ data: [] })),
        ]);
        setSchedules(schedResp.data || schedResp || []);
        setVehicles(vehResp.data || vehResp || []);
      }
    } catch (err) {
      console.warn('CaptureTripScreen load error', err?.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Pre-fill from a schedule selection
  function selectRoute(sched) {
    setSelectedSchedule(sched);
    setDepartureStation(sched.departureStation || '');
    setDestinationStation(sched.destinationStation || '');
    setFare(String(sched.standardFare || ''));
    setRouteModalVisible(false);
  }

  function selectVehicle(v) {
    setSelectedVehicleId(v.vehicleId || v.id);
    setVehicleReg(v.vehicle?.registration || v.registration || v.vehicleId || '');
    setVehicleModalVisible(false);
  }

  // Create the trip and move to passenger capture phase
  async function handleCreateTrip() {
    if (!departureStation.trim()) return Alert.alert('Validation', 'Departure station is required');
    if (!destinationStation.trim()) return Alert.alert('Validation', 'Destination station is required');
    if (!selectedVehicleId) return Alert.alert('Validation', 'Please select a vehicle');

    const body = {
      tenantId: user?.tenantId || EMPTY_GUID,
      vehicleId: selectedVehicleId,
      driverId: null,
      marshalId: adminProfile?.id || null,
      taxiRankId: rank?.id || EMPTY_GUID,
      departureStation: departureStation.trim(),
      destinationStation: destinationStation.trim(),
      departureTime: new Date().toISOString(),
      notes: tripNotes.trim() || null,
    };

    setCreating(true);
    try {
      const trip = await createTrip(body);
      setTripId(trip.id);
      setPhase('passengers');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to create trip');
    } finally {
      setCreating(false);
    }
  }

  // Load passengers for current trip
  async function refreshPassengers() {
    if (!tripId) return;
    try {
      const resp = await fetchTripPassengers(tripId);
      setPassengers(resp.data || resp || []);
    } catch (err) {
      console.warn('Refresh passengers error', err?.message);
    }
  }

  useEffect(() => {
    if (phase === 'passengers' && tripId) refreshPassengers();
  }, [phase, tripId]);

  // Open add passenger modal
  function openAddPassenger() {
    setPaxName('');
    setPaxPhone('');
    setPaxAmount(fare || '');
    setPaxSeat(String(passengers.length + 1));
    setPaxNotes('');
    setPaxModalVisible(true);
  }

  async function handleAddPassenger() {
    if (!paxName.trim()) return Alert.alert('Validation', 'Passenger name is required');
    if (!paxAmount.trim() || isNaN(Number(paxAmount))) return Alert.alert('Validation', 'Valid fare amount is required');

    const body = {
      userId: null,
      passengerName: paxName.trim(),
      passengerPhone: paxPhone.trim(),
      departureStation: departureStation,
      arrivalStation: destinationStation,
      amount: parseFloat(paxAmount),
      seatNumber: paxSeat ? parseInt(paxSeat, 10) : null,
      notes: paxNotes.trim() || null,
    };

    setAddingPax(true);
    try {
      await addPassengerToTrip(tripId, body);
      setPaxModalVisible(false);
      refreshPassengers();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to add passenger');
    } finally {
      setAddingPax(false);
    }
  }

  async function handleRemovePassenger(p) {
    Alert.alert('Remove Passenger', `Remove ${p.passengerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await removePassengerFromTrip(tripId, p.id);
            refreshPassengers();
          } catch (err) {
            Alert.alert('Error', err?.message || 'Failed');
          }
        },
      },
    ]);
  }

  async function handleDepartTrip() {
    if (passengers.length === 0) {
      return Alert.alert('No Passengers', 'Add at least one passenger before departing.');
    }
    Alert.alert('Confirm Departure', `Depart with ${passengers.length} passenger(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Depart Now', onPress: async () => {
          try {
            await updateTripStatus(tripId, 'Departed');
            Alert.alert('Trip Departed!', `Trip from ${departureStation} to ${destinationStation} with ${passengers.length} passengers.`, [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (err) {
            Alert.alert('Error', err?.message || 'Status update failed');
          }
        },
      },
    ]);
  }

  const totalFare = passengers.reduce((sum, p) => sum + (p.amount || 0), 0);
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
          <Text style={styles.headerTitle}>
            {phase === 'setup' ? 'Capture Trip' : 'Passenger List'}
          </Text>
          <Text style={styles.headerSub}>{rank?.name || 'Taxi Rank'}</Text>
        </View>
        {phase === 'passengers' && (
          <View style={styles.paxCountBadge}>
            <Text style={styles.paxCountText}>{passengers.length}</Text>
          </View>
        )}
      </View>

      {/* Phase indicator */}
      <View style={styles.phaseRow}>
        <PhaseStep num="1" label="Trip Details" active={phase === 'setup'} done={phase !== 'setup'} c={c} />
        <View style={[styles.phaseLine, { backgroundColor: phase !== 'setup' ? GOLD : c.border }]} />
        <PhaseStep num="2" label="Passengers" active={phase === 'passengers'} done={false} c={c} />
      </View>

      {/* ===== SETUP PHASE ===== */}
      {phase === 'setup' && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Route selection */}
          <Text style={[styles.sectionTitle, { color: c.text }]}>Route</Text>
          {schedules.length > 0 && (
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => setRouteModalVisible(true)}
            >
              <Ionicons name="git-branch-outline" size={18} color={GOLD} />
              <Text style={[styles.pickerText, { color: selectedSchedule ? c.text : c.textMuted }]}>
                {selectedSchedule ? selectedSchedule.routeName : 'Select a route (optional)'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={c.textMuted} />
            </TouchableOpacity>
          )}

          <Text style={[styles.label, { color: c.textMuted }]}>Departure Station</Text>
          <TextInput value={departureStation} onChangeText={setDepartureStation} style={inp}
            placeholder="e.g. Park Station" placeholderTextColor={c.textMuted} />

          <Text style={[styles.label, { color: c.textMuted }]}>Destination Station</Text>
          <TextInput value={destinationStation} onChangeText={setDestinationStation} style={inp}
            placeholder="e.g. Pretoria Central" placeholderTextColor={c.textMuted} />

          {/* Vehicle selection */}
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Vehicle</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => vehicles.length > 0 ? setVehicleModalVisible(true) : Alert.alert('No Vehicles', 'No vehicles assigned to this rank.')}
          >
            <Ionicons name="bus-outline" size={18} color={GOLD} />
            <Text style={[styles.pickerText, { color: selectedVehicleId ? c.text : c.textMuted }]}>
              {vehicleReg || 'Select vehicle'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </TouchableOpacity>

          {!selectedVehicleId && (
            <>
              <Text style={[styles.label, { color: c.textMuted }]}>Or type vehicle registration</Text>
              <TextInput value={vehicleReg} onChangeText={(t) => { setVehicleReg(t); setSelectedVehicleId(null); }}
                style={inp} placeholder="e.g. ABC 123 GP" placeholderTextColor={c.textMuted} autoCapitalize="characters" />
            </>
          )}

          {/* Fare */}
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Fare</Text>
          <Text style={[styles.label, { color: c.textMuted }]}>Standard Fare (R)</Text>
          <TextInput value={fare} onChangeText={setFare} style={inp}
            placeholder="25.00" placeholderTextColor={c.textMuted} keyboardType="decimal-pad" />

          <Text style={[styles.label, { color: c.textMuted }]}>Notes (optional)</Text>
          <TextInput value={tripNotes} onChangeText={setTripNotes} style={[...inp, { minHeight: 56 }]}
            placeholder="Any additional trip info" placeholderTextColor={c.textMuted} multiline />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateTrip} disabled={creating} activeOpacity={0.85}>
            {creating ? <ActivityIndicator color="#000" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="arrow-forward-circle-outline" size={20} color="#000" />
                <Text style={styles.primaryBtnText}>Create Trip & Add Passengers</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ===== PASSENGERS PHASE ===== */}
      {phase === 'passengers' && (
        <View style={{ flex: 1 }}>
          {/* Trip summary bar */}
          <View style={[styles.tripBar, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tripBarRoute, { color: c.text }]}>
                {departureStation} → {destinationStation}
              </Text>
              <Text style={[styles.tripBarMeta, { color: c.textMuted }]}>
                {vehicleReg} · R{fare || '0'}/seat
              </Text>
            </View>
            <View style={styles.tripBarStats}>
              <View style={styles.tripStat}>
                <Text style={[styles.tripStatVal, { color: c.text }]}>{passengers.length}</Text>
                <Text style={[styles.tripStatLabel, { color: c.textMuted }]}>Pax</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={[styles.tripStatVal, { color: GOLD }]}>R{totalFare}</Text>
                <Text style={[styles.tripStatLabel, { color: c.textMuted }]}>Total</Text>
              </View>
            </View>
          </View>

          {/* Passenger list */}
          <FlatList
            data={passengers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.paxList}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="people-outline" size={48} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No passengers yet</Text>
                <Text style={[styles.emptyHint, { color: c.textMuted }]}>Tap + to add passengers</Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <View style={[styles.paxCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[styles.paxNum, { backgroundColor: GOLD_LIGHT }]}>
                  <Text style={styles.paxNumText}>{item.seatNumber || index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paxCardName, { color: c.text }]}>{item.passengerName || 'Unnamed'}</Text>
                  <Text style={[styles.paxCardMeta, { color: c.textMuted }]}>
                    {item.passengerPhone ? item.passengerPhone + ' · ' : ''}R{item.amount}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemovePassenger(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle-outline" size={20} color="#dc3545" />
                </TouchableOpacity>
              </View>
            )}
          />

          {/* Bottom action bar */}
          <View style={[styles.bottomBar, { backgroundColor: c.surface, borderColor: c.border }]}>
            <TouchableOpacity style={styles.addPaxBtn} onPress={openAddPassenger} activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={18} color="#000" />
              <Text style={styles.addPaxBtnText}>Add Passenger</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.departBtn, passengers.length === 0 && { opacity: 0.5 }]}
              onPress={handleDepartTrip}
              disabled={passengers.length === 0}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-outline" size={18} color="#fff" />
              <Text style={styles.departBtnText}>Depart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ===== ADD PASSENGER MODAL ===== */}
      <Modal visible={paxModalVisible} animationType="slide" transparent onRequestClose={() => setPaxModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Add Passenger</Text>
              <TouchableOpacity onPress={() => setPaxModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: c.textMuted }]}>Passenger Name *</Text>
              <TextInput value={paxName} onChangeText={setPaxName} style={inp}
                placeholder="Full name" placeholderTextColor={c.textMuted} autoFocus />

              <Text style={[styles.label, { color: c.textMuted }]}>Phone Number</Text>
              <TextInput value={paxPhone} onChangeText={setPaxPhone} style={inp}
                placeholder="072 123 4567" placeholderTextColor={c.textMuted} keyboardType="phone-pad" />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Fare (R) *</Text>
                  <TextInput value={paxAmount} onChangeText={setPaxAmount} style={inp}
                    placeholder="25.00" placeholderTextColor={c.textMuted} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Seat #</Text>
                  <TextInput value={paxSeat} onChangeText={setPaxSeat} style={inp}
                    placeholder="1" placeholderTextColor={c.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <Text style={[styles.label, { color: c.textMuted }]}>Notes</Text>
              <TextInput value={paxNotes} onChangeText={setPaxNotes} style={inp}
                placeholder="Optional" placeholderTextColor={c.textMuted} />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleAddPassenger} disabled={addingPax} activeOpacity={0.85}>
                {addingPax ? <ActivityIndicator color="#000" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="person-add-outline" size={18} color="#000" />
                    <Text style={styles.primaryBtnText}>Add Passenger</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== ROUTE PICKER MODAL ===== */}
      <Modal visible={routeModalVisible} animationType="slide" transparent onRequestClose={() => setRouteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Route</Text>
              <TouchableOpacity onPress={() => setRouteModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={schedules.filter(s => s.isActive)}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => selectRoute(item)}
                >
                  <Ionicons name="git-branch-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.routeName}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>
                      {item.departureStation} → {item.destinationStation} · R{item.standardFare}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>No routes configured</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ===== VEHICLE PICKER MODAL ===== */}
      <Modal visible={vehicleModalVisible} animationType="slide" transparent onRequestClose={() => setVehicleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vehicles}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => selectVehicle(item)}
                >
                  <Ionicons name="bus-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>
                      {item.vehicle?.registration || item.registration || item.vehicleId}
                    </Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>
                      {item.vehicle?.make ? `${item.vehicle.make} ${item.vehicle.model}` : 'Vehicle'}
                      {item.vehicle?.capacity ? ` · ${item.vehicle.capacity} seats` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>No vehicles assigned</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PhaseStep({ num, label, active, done, c }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[phStyles.circle, active && phStyles.circleActive, done && phStyles.circleDone]}>
        {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : (
          <Text style={[phStyles.num, (active || done) && phStyles.numActive]}>{num}</Text>
        )}
      </View>
      <Text style={[phStyles.label, { color: active ? GOLD : c.textMuted }]}>{label}</Text>
    </View>
  );
}

const phStyles = StyleSheet.create({
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: GOLD },
  circleDone: { backgroundColor: '#198754' },
  num: { fontSize: 12, fontWeight: '800', color: '#999' },
  numActive: { color: '#000' },
  label: { fontSize: 10, fontWeight: '700', marginTop: 4 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: GOLD, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  paxCountBadge: { backgroundColor: GOLD, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  paxCountText: { color: '#000', fontSize: 15, fontWeight: '900' },

  phaseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 12 },
  phaseLine: { height: 2, width: 50, borderRadius: 1 },

  body: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '900', marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 4, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },

  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 6 },
  pickerText: { flex: 1, fontSize: 14 },

  primaryBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },

  // Trip bar
  tripBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, gap: 10 },
  tripBarRoute: { fontSize: 14, fontWeight: '800' },
  tripBarMeta: { fontSize: 11, marginTop: 2 },
  tripBarStats: { flexDirection: 'row', gap: 14 },
  tripStat: { alignItems: 'center' },
  tripStatVal: { fontSize: 16, fontWeight: '900' },
  tripStatLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

  // Passenger list
  paxList: { padding: 16, paddingBottom: 100 },
  paxCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  paxNum: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  paxNumText: { fontSize: 14, fontWeight: '900', color: GOLD },
  paxCardName: { fontSize: 14, fontWeight: '700' },
  paxCardMeta: { fontSize: 11, marginTop: 2 },

  emptyWrap: { alignItems: 'center', marginTop: 50, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 12 },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  addPaxBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GOLD, borderRadius: 12, padding: 14 },
  addPaxBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
  departBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#198754', borderRadius: 12, padding: 14 },
  departBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalBody: { padding: 16, paddingBottom: 40 },

  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  listItemTitle: { fontSize: 14, fontWeight: '700' },
  listItemSub: { fontSize: 11, marginTop: 2 },
});
