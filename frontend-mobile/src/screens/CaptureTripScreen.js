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
  fetchTripSchedules, fetchVehiclesByRankId,
  createTrip, addPassengerToTrip, fetchTripPassengers,
  removePassengerFromTrip, updateTripStatus, fetchTripsByRank,
} from '../api/taxiRanks';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export default function CaptureTripScreen({ route: navRoute, navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const rank = navRoute?.params?.rank;
  const preSelectedSchedule = navRoute?.params?.preSelectedSchedule;

  // Phase: 'setup' (fill trip details) -> 'passengers' (add passengers) -> 'review' (final check)
  const [phase, setPhase] = useState('setup');
  // captureMode: null (choosing), 'scheduled', 'manual'
  const [captureMode, setCaptureMode] = useState(null);

  // Active/resumable trips
  const [activeTrips, setActiveTrips] = useState([]);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Trip setup form
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
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
  const [paxPaymentMethod, setPaxPaymentMethod] = useState('Cash');
  const [paxPaymentRef, setPaxPaymentRef] = useState('');
  const [paxStop, setPaxStop] = useState(null);
  const [paxStopModalVisible, setPaxStopModalVisible] = useState(false);
  const [addingPax, setAddingPax] = useState(false);

  // Vehicle picker modal
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  // Route picker modal
  const [routeModalVisible, setRouteModalVisible] = useState(false);

  // Stop picker modal
  const [stopModalVisible, setStopModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.userId && !user?.id) { setLoading(false); return; }
    try {
      // Only fetch admin profile for non-marshal roles (marshals don't have admin profiles)
      let admin = null;
      const isMarshal = (user.role || '').toLowerCase() === 'taximarshal';
      if (!isMarshal) {
        try {
          const adminResp = await fetchAdminByUserId(user.userId || user.id);
          admin = adminResp.data || adminResp;
          setAdminProfile(admin);
        } catch (_) {}
      }

      // Auto-populate departure station from admin profile or rank param
      const rankName = admin?.taxiRank?.name || admin?.taxiRankName || rank?.name || '';
      if (rankName && !departureStation) {
        setDepartureStation(rankName);
      }

      // Determine rank ID from admin profile or navigation param
      const rankId = admin?.taxiRankId || rank?.id;

      let loadedSchedules = [];
      if (admin?.id) {
        // Admin path: use admin-based APIs
        const [schedResp, vehResp] = await Promise.all([
          fetchSchedules(admin.id).catch(() => ({ data: [] })),
          fetchRankVehicles(admin.id).catch(() => ({ data: [] })),
        ]);
        loadedSchedules = schedResp.data || schedResp || [];
        setSchedules(loadedSchedules);
        setVehicles(vehResp.data || vehResp || []);
      } else if (rankId) {
        // Marshal path: use rank-based APIs
        const [schedResp, vehResp] = await Promise.all([
          fetchTripSchedules(rankId, user.tenantId).catch(() => ({ data: [] })),
          fetchVehiclesByRankId(rankId).catch(() => ({ data: [] })),
        ]);
        loadedSchedules = schedResp.data || schedResp || [];
        setSchedules(loadedSchedules);
        setVehicles(vehResp.data || vehResp || []);
      }

      // Check for in-progress trips that can be resumed
      if (rankId) {
        try {
          const tripsResp = await fetchTripsByRank(rankId);
          const trips = tripsResp.data || tripsResp || [];
          const inProgress = trips.filter(t =>
            t.status === 'Loading' || t.status === 'InProgress' || t.status === 'Active' || t.status === 'Pending'
          );
          setActiveTrips(inProgress);
          if (inProgress.length > 0 && !preSelectedSchedule) {
            setResumeModalVisible(true);
          }
        } catch (_) {}
      }

      // Auto-set capture mode: if pre-selected schedule, go straight to form
      // Otherwise if schedules exist, default to scheduled mode (skip mode selection)
      const activeSchedules = loadedSchedules.filter(s => s.isActive !== false);
      if (preSelectedSchedule) {
        setCaptureMode('scheduled');
        // Pre-populate from the passed schedule
        setSelectedSchedule(preSelectedSchedule);
        setDepartureStation(preSelectedSchedule.departureStation || rankName || '');
        setSelectedStop(null);
        setDestinationStation('');
        setFare('');
        setSelectedVehicleId(null);
        setVehicleReg('');
      } else if (activeSchedules.length > 0) {
        setCaptureMode('scheduled');
      } else {
        setCaptureMode('manual');
      }
    } catch (err) {
      console.warn('CaptureTripScreen load error', err?.message);
    } finally {
      setLoading(false);
    }
  }, [user, rank, preSelectedSchedule]);

  useEffect(() => { loadData(); }, [loadData]);

  // Pre-fill from a schedule selection
  function selectRoute(sched) {
    setSelectedSchedule(sched);
    setDepartureStation(sched.departureStation || '');
    // Clear stop, destination, fare — user must pick a stop
    setSelectedStop(null);
    setDestinationStation('');
    setFare('');
    // Clear vehicle selection so user picks from route-assigned vehicles
    setSelectedVehicleId(null);
    setVehicleReg('');
    setRouteModalVisible(false);
  }

  // Sorted stops for the selected route
  const routeStops = (selectedSchedule?.stops || [])
    .slice()
    .sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));

  // Select a stop → auto-populate destination and fare
  function selectStop(stop) {
    setSelectedStop(stop);
    setDestinationStation(stop.stopName || '');
    setFare(String(stop.fareFromOrigin ?? selectedSchedule?.standardFare ?? ''));
    setStopModalVisible(false);
  }

  // Vehicles to display: if a route is selected and has assigned vehicles, show those; otherwise all rank vehicles
  const routeVehicleList = selectedSchedule?.routeVehicles?.filter(rv => rv.isActive !== false) || [];
  const displayVehicles = routeVehicleList.length > 0
    ? routeVehicleList.map(rv => ({
        id: rv.vehicleId,
        vehicleId: rv.vehicleId,
        registration: rv.vehicle?.registration || rv.vehicle?.registrationNumber || rv.vehicleId,
        make: rv.vehicle?.make || '',
        model: rv.vehicle?.model || '',
        capacity: rv.vehicle?.capacity,
        vehicle: rv.vehicle,
      }))
    : vehicles;

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
      taxiRankId: rank?.id || adminProfile?.taxiRankId || EMPTY_GUID,
      departureStation: departureStation.trim(),
      destinationStation: destinationStation.trim(),
      departureTime: new Date().toISOString(),
      notes: tripNotes.trim() || null,
      tripScheduleId: selectedSchedule?.id || null,
    };

    setCreating(true);
    try {
      const trip = await createTrip(body);
      setTripId(trip.id);
      Alert.alert(
        'Trip Created!',
        `${departureStation} → ${destinationStation}\nNow add passengers as they board.`,
        [{ text: 'Start Boarding', onPress: () => setPhase('passengers') }],
      );
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to create trip');
    } finally {
      setCreating(false);
    }
  }

  // Resume an in-progress trip
  function handleResumeTrip(trip) {
    setResumeModalVisible(false);
    setTripId(trip.id);
    setDepartureStation(trip.departureStation || '');
    setDestinationStation(trip.destinationStation || '');
    setVehicleReg(trip.vehicleRegistration || trip.vehicle?.registration || '');
    setSelectedVehicleId(trip.vehicleId || null);
    setFare(trip.fare ? String(trip.fare) : '');
    setPhase('passengers');
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

  // Generate a unique card reference: MF-YYYYMMDD-HHMMSS-XXXX
  function generateCardRef() {
    const now = new Date();
    const d = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `MF-${d}-${rand}`;
  }

  // Open add passenger modal
  function openAddPassenger() {
    setPaxName('');
    setPaxPhone('');
    setPaxStop(null);
    setPaxAmount(fare || '');
    setPaxSeat(String(passengers.length + 1));
    setPaxNotes('');
    setPaxPaymentMethod('Cash');
    setPaxPaymentRef('');
    setPaxModalVisible(true);
  }

  async function handleAddPassenger() {
    if (!paxName.trim()) return Alert.alert('Validation', 'Passenger name is required');
    if (!paxAmount.trim() || isNaN(Number(paxAmount))) return Alert.alert('Validation', 'Valid fare amount is required');

    if (paxPaymentMethod === 'Card' && !paxPaymentRef.trim()) {
      return Alert.alert('Validation', 'Card reference number is required for card payments');
    }

    const body = {
      userId: null,
      passengerName: paxName.trim(),
      passengerPhone: paxPhone.trim(),
      departureStation: departureStation,
      arrivalStation: paxStop?.stopName || destinationStation,
      amount: parseFloat(paxAmount),
      paymentMethod: paxPaymentMethod,
      paymentReference: paxPaymentMethod === 'Card' ? paxPaymentRef.trim() : null,
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

  async function handleSaveTrip() {
    Alert.alert('Trip Saved', `Trip saved with ${passengers.length} passenger(s). You can return to continue adding passengers.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  async function handleDepartTrip() {
    const msg = passengers.length === 0
      ? 'No passengers added yet. Depart anyway?'
      : `Depart with ${passengers.length} passenger(s)?`;

    Alert.alert('Confirm Departure', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Depart Now', onPress: async () => {
          try {
            await updateTripStatus(tripId, 'Departed');
            Alert.alert('Trip Departed!', `Trip from ${departureStation} to ${destinationStation} with ${passengers.length} passengers.`, [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || err?.message || 'Status update failed');
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
        <TouchableOpacity onPress={() => {
          if (phase === 'passengers') {
            Alert.alert('Go Back?', 'Return to trip details? Your passenger list is saved.', [
              { text: 'Stay', style: 'cancel' },
              { text: 'Go Back', onPress: () => setPhase('setup') },
            ]);
          } else {
            navigation.goBack();
          }
        }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {phase === 'setup' ? 'Trip Details' : 'Passenger Boarding'}
          </Text>
          <Text style={styles.headerSub}>{rank?.name || 'Taxi Rank'}</Text>
        </View>
        {phase === 'passengers' && (
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={styles.paxCountBadge}>
              <Text style={styles.paxCountText}>{passengers.length}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Loading</Text>
            </View>
          </View>
        )}
      </View>

      {/* Phase indicator */}
      <View style={styles.phaseRow}>
        <TouchableOpacity
          disabled={phase === 'setup'}
          onPress={() => {
            if (phase === 'passengers') {
              Alert.alert('Go Back?', 'Return to trip details? Your passenger list is saved.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go Back', onPress: () => setPhase('setup') },
              ]);
            }
          }}
          activeOpacity={0.7}
        >
          <PhaseStep num="1" label="Trip Details" active={phase === 'setup'} done={phase !== 'setup'} c={c} />
        </TouchableOpacity>
        <View style={[styles.phaseLine, { backgroundColor: phase !== 'setup' ? GOLD : c.border }]} />
        <PhaseStep num="2" label="Passengers" active={phase === 'passengers'} done={false} c={c} />
      </View>

      {/* ===== SETUP PHASE ===== */}
      {phase === 'setup' && !captureMode && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 4 }]}>How would you like to capture this trip?</Text>
          <Text style={[{ color: c.textMuted, fontSize: 12, marginBottom: 16 }]}>
            Select a scheduled trip or enter details manually.
          </Text>

          {/* Scheduled Trip option */}
          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: c.surface, borderColor: schedules.length > 0 ? GOLD : c.border }]}
            activeOpacity={0.85}
            onPress={() => schedules.length > 0 ? setCaptureMode('scheduled') : Alert.alert('No Scheduled Trips', 'There are no scheduled trips available. Use manual capture instead.')}
          >
            <View style={[styles.modeIconWrap, { backgroundColor: schedules.length > 0 ? GOLD_LIGHT : c.surface2 }]}>
              <Ionicons name="calendar-outline" size={28} color={schedules.length > 0 ? GOLD : c.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, { color: c.text }]}>Scheduled Trip</Text>
              <Text style={[styles.modeSub, { color: c.textMuted }]}>
                {schedules.length > 0
                  ? `${schedules.filter(s => s.isActive !== false).length} route(s) available`
                  : 'No scheduled routes available'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={schedules.length > 0 ? GOLD : c.textMuted} />
          </TouchableOpacity>

          {/* Manual Capture option */}
          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: c.surface, borderColor: c.border }]}
            activeOpacity={0.85}
            onPress={() => setCaptureMode('manual')}
          >
            <View style={[styles.modeIconWrap, { backgroundColor: 'rgba(25,135,84,0.1)' }]}>
              <Ionicons name="create-outline" size={28} color="#198754" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, { color: c.text }]}>Manual Capture</Text>
              <Text style={[styles.modeSub, { color: c.textMuted }]}>Enter trip details manually</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ===== SCHEDULED MODE: pick a route then fill remaining details ===== */}
      {phase === 'setup' && captureMode === 'scheduled' && !selectedSchedule && (
        <View style={{ flex: 1 }}>
          <View style={styles.modeHeader}>
            <TouchableOpacity onPress={() => {
              setCaptureMode(null);
              setSelectedSchedule(null);
            }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={20} color={c.text} />
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { color: c.text, flex: 1, marginBottom: 0, marginLeft: 10 }]}>Select Route</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
              onPress={() => { setCaptureMode('manual'); setSelectedSchedule(null); }}
            >
              <Ionicons name="create-outline" size={14} color={c.textMuted} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted }}>Manual</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={schedules.filter(s => s.isActive !== false)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const rvCount = item.routeVehicles?.filter(rv => rv.isActive !== false)?.length || 0;
              const stopCount = item.stops?.length || 0;
              return (
                <TouchableOpacity
                  style={[styles.scheduleCard, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => selectRoute(item)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.modeIconWrap, { backgroundColor: GOLD_LIGHT }]}>
                    <Ionicons name="git-branch-outline" size={22} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.routeName}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>
                      {item.departureStation} → {item.destinationStation}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                      <Text style={[styles.listItemSub, { color: GOLD, fontWeight: '700' }]}>R{item.standardFare}</Text>
                      {stopCount > 0 && (
                        <Text style={[styles.listItemSub, { color: c.textMuted }]}>{stopCount} stop{stopCount > 1 ? 's' : ''}</Text>
                      )}
                      {rvCount > 0 && (
                        <Text style={[styles.listItemSub, { color: c.textMuted }]}>{rvCount} vehicle{rvCount > 1 ? 's' : ''}</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="calendar-outline" size={48} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No scheduled routes</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ===== TRIP FORM (shown after selecting a schedule OR in manual mode) ===== */}
      {phase === 'setup' && captureMode && (captureMode === 'manual' || selectedSchedule) && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Back navigation */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}
            onPress={() => {
              if (captureMode === 'scheduled' && selectedSchedule) {
                // Go back to route list
                setSelectedSchedule(null);
                setSelectedStop(null);
                setDestinationStation('');
                setFare('');
                setSelectedVehicleId(null);
                setVehicleReg('');
              } else {
                // Manual mode or no schedule — switch to scheduled if routes exist
                const activeSchedules = schedules.filter(s => s.isActive !== false);
                if (activeSchedules.length > 0) {
                  setCaptureMode('scheduled');
                  setSelectedSchedule(null);
                  setSelectedStop(null);
                  setDepartureStation(rank?.name || '');
                  setDestinationStation('');
                  setFare('');
                  setSelectedVehicleId(null);
                  setVehicleReg('');
                } else {
                  navigation.goBack();
                }
              }
            }}
          >
            <Ionicons name="arrow-back" size={18} color={GOLD} />
            <Text style={{ color: GOLD, fontWeight: '700', fontSize: 13, marginLeft: 6 }}>
              {captureMode === 'scheduled' && selectedSchedule ? 'Change Route' : 'Back'}
            </Text>
          </TouchableOpacity>

          {/* Selected route summary (scheduled mode) */}
          {selectedSchedule && (
            <View style={[styles.selectedRouteBar, { backgroundColor: GOLD_LIGHT, borderColor: GOLD }]}>
              <Ionicons name="git-branch-outline" size={18} color={GOLD} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 14, color: c.text }}>{selectedSchedule.routeName}</Text>
                <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 1 }}>
                  {selectedSchedule.departureStation} → {selectedSchedule.destinationStation} · R{selectedSchedule.standardFare}
                </Text>
              </View>
            </View>
          )}

          {/* ── Route Section ── */}
          <View style={[styles.formCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.formCardHeader}>
              <Ionicons name="navigate-circle-outline" size={20} color={GOLD} />
              <Text style={[styles.formCardTitle, { color: c.text }]}>Route</Text>
              {departureStation && destinationStation ? (
                <Ionicons name="checkmark-circle" size={16} color="#198754" style={{ marginLeft: 'auto' }} />
              ) : null}
            </View>

            <Text style={[styles.label, { color: c.textMuted, marginTop: 4 }]}>Departure Station</Text>
            <TextInput value={departureStation} onChangeText={setDepartureStation} style={inp}
              placeholder="e.g. Park Station" placeholderTextColor={c.textMuted} editable={!selectedSchedule} />

            {selectedSchedule ? (
              <>
                <Text style={[styles.label, { color: c.textMuted }]}>Destination Stop</Text>
                <TouchableOpacity
                  style={[styles.pickerBtn, { backgroundColor: c.background, borderColor: c.border }]}
                  onPress={() => setStopModalVisible(true)}
                >
                  <Ionicons name="location-outline" size={18} color={GOLD} />
                  <Text style={[styles.pickerText, { color: selectedStop ? c.text : c.textMuted }]}>
                    {selectedStop ? selectedStop.stopName : 'Select a stop'}
                  </Text>
                  {fare ? (
                    <Text style={{ color: GOLD, fontWeight: '700', fontSize: 14, marginRight: 4 }}>R{fare}</Text>
                  ) : null}
                  <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: c.textMuted }]}>Destination Station</Text>
                <TextInput value={destinationStation} onChangeText={setDestinationStation} style={inp}
                  placeholder="e.g. Pretoria Central" placeholderTextColor={c.textMuted} />
              </>
            )}
          </View>

          {/* ── Vehicle Section ── */}
          <View style={[styles.formCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.formCardHeader}>
              <Ionicons name="bus-outline" size={20} color={GOLD} />
              <Text style={[styles.formCardTitle, { color: c.text }]}>Vehicle</Text>
              {selectedVehicleId || vehicleReg ? (
                <Ionicons name="checkmark-circle" size={16} color="#198754" style={{ marginLeft: 'auto' }} />
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: c.background, borderColor: c.border }]}
              onPress={() => displayVehicles.length > 0 ? setVehicleModalVisible(true) : Alert.alert('No Vehicles', selectedSchedule ? 'No vehicles assigned to this route.' : 'No vehicles assigned to this rank.')}
            >
              <Ionicons name="bus-outline" size={18} color={GOLD} />
              <Text style={[styles.pickerText, { color: selectedVehicleId ? c.text : c.textMuted }]}>
                {vehicleReg || 'Select vehicle'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={c.textMuted} />
            </TouchableOpacity>

            {!selectedVehicleId && (
              <>
                <Text style={[styles.label, { color: c.textMuted }]}>Or type registration</Text>
                <TextInput value={vehicleReg} onChangeText={(t) => { setVehicleReg(t); setSelectedVehicleId(null); }}
                  style={inp} placeholder="e.g. ABC 123 GP" placeholderTextColor={c.textMuted} autoCapitalize="characters" />
              </>
            )}
          </View>

          {/* ── Fare & Notes Section ── */}
          <View style={[styles.formCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.formCardHeader}>
              <Ionicons name="cash-outline" size={20} color={GOLD} />
              <Text style={[styles.formCardTitle, { color: c.text }]}>Fare & Notes</Text>
              {fare ? (
                <Text style={{ marginLeft: 'auto', color: GOLD, fontWeight: '800', fontSize: 15 }}>R{fare}</Text>
              ) : null}
            </View>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 4 }]}>Standard Fare (R)</Text>
            <TextInput value={fare} onChangeText={setFare} style={inp}
              placeholder="25.00" placeholderTextColor={c.textMuted} keyboardType="decimal-pad" />

            <Text style={[styles.label, { color: c.textMuted }]}>Notes (optional)</Text>
            <TextInput value={tripNotes} onChangeText={setTripNotes} style={[...inp, { minHeight: 56 }]}
              placeholder="Any additional trip info" placeholderTextColor={c.textMuted} multiline />
          </View>

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
      {phase === 'passengers' && (() => {
        const cashTotal = passengers.filter(p => (p.paymentMethod || 'Cash') === 'Cash').reduce((s, p) => s + (p.amount || 0), 0);
        const cardTotal = passengers.filter(p => (p.paymentMethod || 'Cash') === 'Card').reduce((s, p) => s + (p.amount || 0), 0);
        const vCapacity = displayVehicles.find(v => (v.id || v.vehicleId) === selectedVehicleId)?.capacity
          || displayVehicles.find(v => (v.id || v.vehicleId) === selectedVehicleId)?.vehicle?.capacity || 0;
        const fillPercent = vCapacity > 0 ? Math.min(100, Math.round((passengers.length / vCapacity) * 100)) : 0;

        return (
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
                {/* Capacity bar */}
                {vCapacity > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase' }}>Capacity</Text>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: fillPercent >= 90 ? '#dc3545' : fillPercent >= 70 ? GOLD : '#198754' }}>
                        {passengers.length}/{vCapacity} ({fillPercent}%)
                      </Text>
                    </View>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: c.surface2 }}>
                      <View style={{ height: 4, borderRadius: 2, width: `${fillPercent}%`, backgroundColor: fillPercent >= 90 ? '#dc3545' : fillPercent >= 70 ? GOLD : '#198754' }} />
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.tripBarStats}>
                <View style={styles.tripStat}>
                  <Text style={[styles.tripStatVal, { color: GOLD }]}>R{totalFare}</Text>
                  <Text style={[styles.tripStatLabel, { color: c.textMuted }]}>Total</Text>
                </View>
              </View>
            </View>

            {/* Cash / Card split */}
            {passengers.length > 0 && (
              <View style={[styles.splitRow, { borderColor: c.border }]}>
                <View style={styles.splitItem}>
                  <Ionicons name="cash-outline" size={14} color="#198754" />
                  <Text style={[styles.splitLabel, { color: c.textMuted }]}>Cash</Text>
                  <Text style={[styles.splitVal, { color: '#198754' }]}>R{cashTotal}</Text>
                </View>
                <View style={[styles.splitDivider, { backgroundColor: c.border }]} />
                <View style={styles.splitItem}>
                  <Ionicons name="card-outline" size={14} color="#1976d2" />
                  <Text style={[styles.splitLabel, { color: c.textMuted }]}>Card</Text>
                  <Text style={[styles.splitVal, { color: '#1976d2' }]}>R{cardTotal}</Text>
                </View>
              </View>
            )}

            {/* Passenger list */}
            <FlatList
              data={passengers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.paxList}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <View style={{ backgroundColor: GOLD_LIGHT, width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Ionicons name="people-outline" size={40} color={GOLD} />
                  </View>
                  <Text style={[styles.emptyText, { color: c.text }]}>Ready for boarding</Text>
                  <Text style={[styles.emptyHint, { color: c.textMuted }]}>Add passengers as they board the vehicle</Text>
                  <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20, paddingHorizontal: 32 }]} onPress={openAddPassenger} activeOpacity={0.85}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="person-add-outline" size={18} color="#000" />
                      <Text style={styles.primaryBtnText}>Add First Passenger</Text>
                    </View>
                  </TouchableOpacity>
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
                    {item.arrivalStation && item.arrivalStation !== destinationStation ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Ionicons name="location-outline" size={11} color={GOLD} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: GOLD }}>{item.arrivalStation}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.payBadge, { backgroundColor: (item.paymentMethod || 'Cash') === 'Card' ? 'rgba(25,118,210,0.12)' : GOLD_LIGHT }]}>
                    <Ionicons name={(item.paymentMethod || 'Cash') === 'Card' ? 'card-outline' : 'cash-outline'} size={12} color={(item.paymentMethod || 'Cash') === 'Card' ? '#1976d2' : '#b8860b'} />
                    <Text style={[styles.payBadgeText, { color: (item.paymentMethod || 'Cash') === 'Card' ? '#1976d2' : '#b8860b' }]}>{item.paymentMethod || 'Cash'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemovePassenger(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle-outline" size={20} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              )}
            />

            {/* Bottom action bar — 2-row layout */}
            <View style={[styles.bottomBar, { backgroundColor: c.surface, borderColor: c.border }]}>
              {passengers.length > 0 && (
                <TouchableOpacity style={styles.addPaxBtn} onPress={openAddPassenger} activeOpacity={0.85}>
                  <Ionicons name="person-add-outline" size={18} color="#000" />
                  <Text style={styles.addPaxBtnText}>Add Passenger</Text>
                </TouchableOpacity>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleSaveTrip} activeOpacity={0.85}>
                  <Ionicons name="save-outline" size={16} color={GOLD} />
                  <Text style={styles.saveBtnText}>Save & Exit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.departBtn, { flex: 2 }]} onPress={handleDepartTrip} activeOpacity={0.85}>
                  <Ionicons name="navigate-outline" size={18} color="#fff" />
                  <Text style={styles.departBtnText}>Depart</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}

      {/* ===== ADD PASSENGER MODAL ===== */}
      <Modal visible={paxModalVisible} animationType="slide" transparent onRequestClose={() => setPaxModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Add Passenger</Text>
                <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                  Seat {paxSeat || passengers.length + 1} · {passengers.length} boarded · R{totalFare} collected
                </Text>
              </View>
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

              {routeStops.length > 0 && (
                <>
                  <Text style={[styles.label, { color: c.textMuted }]}>Destination Stop</Text>
                  <TouchableOpacity
                    style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: paxStop ? GOLD : c.border }]}
                    onPress={() => setPaxStopModalVisible(true)}
                  >
                    <Ionicons name="location-outline" size={18} color={paxStop ? GOLD : c.textMuted} />
                    <Text style={[styles.pickerText, { color: paxStop ? c.text : c.textMuted }]}>
                      {paxStop ? paxStop.stopName : 'Select passenger stop'}
                    </Text>
                    {paxStop && (
                      <Text style={{ color: GOLD, fontWeight: '700', fontSize: 14, marginRight: 4 }}>R{paxStop.fareFromOrigin ?? fare}</Text>
                    )}
                    <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                  </TouchableOpacity>
                </>
              )}

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

              <Text style={[styles.label, { color: c.textMuted }]}>Payment Method *</Text>
              <View style={styles.payMethodRow}>
                {['Cash', 'Card'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.payMethodBtn,
                      { backgroundColor: c.surface, borderColor: paxPaymentMethod === method ? GOLD : c.border },
                      paxPaymentMethod === method && { backgroundColor: GOLD_LIGHT }
                    ]}
                    onPress={() => {
                      setPaxPaymentMethod(method);
                      if (method === 'Card' && !paxPaymentRef) {
                        setPaxPaymentRef(generateCardRef());
                      }
                    }}
                  >
                    <Ionicons
                      name={method === 'Cash' ? 'cash-outline' : 'card-outline'}
                      size={20}
                      color={paxPaymentMethod === method ? GOLD : c.textMuted}
                    />
                    <Text style={[
                      styles.payMethodText,
                      { color: paxPaymentMethod === method ? GOLD : c.text }
                    ]}>{method}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {paxPaymentMethod === 'Card' && (
                <>
                  <Text style={[styles.label, { color: c.textMuted }]}>Card Reference # *</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput value={paxPaymentRef} onChangeText={setPaxPaymentRef}
                      style={[...inp, { flex: 1 }]}
                      placeholder="Transaction reference" placeholderTextColor={c.textMuted} />
                    <TouchableOpacity
                      style={{ backgroundColor: GOLD_LIGHT, borderRadius: 10, padding: 12 }}
                      onPress={() => setPaxPaymentRef(generateCardRef())}
                    >
                      <Ionicons name="refresh-outline" size={20} color={GOLD} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={[styles.label, { color: c.textMuted }]}>Notes</Text>
              <TextInput value={paxNotes} onChangeText={setPaxNotes} style={inp}
                placeholder="Optional" placeholderTextColor={c.textMuted} />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: GOLD }]}
                  onPress={async () => {
                    await handleAddPassenger();
                  }}
                  disabled={addingPax} activeOpacity={0.85}
                >
                  {addingPax ? <ActivityIndicator color={GOLD} /> : (
                    <Text style={[styles.primaryBtnText, { color: GOLD }]}>Add & Close</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 2, marginTop: 0 }]}
                  onPress={async () => {
                    if (!paxName.trim()) return Alert.alert('Validation', 'Passenger name is required');
                    if (!paxAmount.trim() || isNaN(Number(paxAmount))) return Alert.alert('Validation', 'Valid fare amount is required');
                    if (paxPaymentMethod === 'Card' && !paxPaymentRef.trim()) return Alert.alert('Validation', 'Card reference is required');
                    setAddingPax(true);
                    try {
                      const body = {
                        userId: null,
                        passengerName: paxName.trim(),
                        passengerPhone: paxPhone.trim(),
                        departureStation,
                        arrivalStation: paxStop?.stopName || destinationStation,
                        amount: parseFloat(paxAmount),
                        paymentMethod: paxPaymentMethod,
                        paymentReference: paxPaymentMethod === 'Card' ? paxPaymentRef.trim() : null,
                        seatNumber: paxSeat ? parseInt(paxSeat, 10) : null,
                        notes: paxNotes.trim() || null,
                      };
                      await addPassengerToTrip(tripId, body);
                      refreshPassengers();
                      // Reset for next passenger
                      setPaxName('');
                      setPaxPhone('');
                      setPaxStop(null);
                      setPaxAmount(fare || '');
                      setPaxSeat(String(passengers.length + 2));
                      setPaxNotes('');
                      setPaxPaymentMethod('Cash');
                      setPaxPaymentRef('');
                    } catch (err) {
                      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed');
                    } finally {
                      setAddingPax(false);
                    }
                  }}
                  disabled={addingPax} activeOpacity={0.85}
                >
                  {addingPax ? <ActivityIndicator color="#000" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="arrow-forward-outline" size={16} color="#000" />
                      <Text style={styles.primaryBtnText}>Add & Next</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
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
              renderItem={({ item }) => {
                const rvCount = item.routeVehicles?.filter(rv => rv.isActive !== false)?.length || 0;
                return (
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
                      {rvCount > 0 && (
                        <Text style={[styles.listItemSub, { color: GOLD, fontWeight: '600', marginTop: 2 }]}>
                          {rvCount} vehicle{rvCount > 1 ? 's' : ''} assigned
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>No routes configured</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ===== STOP PICKER MODAL ===== */}
      <Modal visible={stopModalVisible} animationType="slide" transparent onRequestClose={() => setStopModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Destination Stop</Text>
              <TouchableOpacity onPress={() => setStopModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            {selectedSchedule && (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <Text style={[styles.listItemSub, { color: GOLD, fontWeight: '700' }]}>
                  {selectedSchedule.routeName}: {selectedSchedule.departureStation} → {selectedSchedule.destinationStation}
                </Text>
              </View>
            )}
            <FlatList
              data={[
                ...routeStops,
                // Add final destination as an option
                ...(selectedSchedule?.destinationStation ? [{
                  id: 'final-destination',
                  stopName: selectedSchedule.destinationStation,
                  stopOrder: 999,
                  fareFromOrigin: selectedSchedule.standardFare,
                  isFinalDestination: true,
                }] : []),
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: selectedStop?.id === item.id ? GOLD_LIGHT : c.surface, borderColor: selectedStop?.id === item.id ? GOLD : c.border }]}
                  onPress={() => selectStop(item)}
                >
                  <Ionicons name={item.isFinalDestination ? 'flag-outline' : 'location-outline'} size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>
                      {item.stopName}
                      {item.isFinalDestination ? ' (Final)' : ''}
                    </Text>
                    {item.estimatedMinutesFromDeparture ? (
                      <Text style={[styles.listItemSub, { color: c.textMuted }]}>
                        ~{item.estimatedMinutesFromDeparture} min from departure
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: GOLD, fontWeight: '800', fontSize: 15 }}>R{item.fareFromOrigin}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>
                  No stops configured for this route
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ===== PASSENGER STOP PICKER MODAL ===== */}
      <Modal visible={paxStopModalVisible} animationType="slide" transparent onRequestClose={() => setPaxStopModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Passenger Stop</Text>
              <TouchableOpacity onPress={() => setPaxStopModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            {selectedSchedule && (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <Text style={[styles.listItemSub, { color: GOLD, fontWeight: '700' }]}>
                  {selectedSchedule.departureStation} → {selectedSchedule.destinationStation}
                </Text>
              </View>
            )}
            <FlatList
              data={[
                ...routeStops,
                ...(selectedSchedule?.destinationStation ? [{
                  id: 'final-destination',
                  stopName: selectedSchedule.destinationStation,
                  stopOrder: 999,
                  fareFromOrigin: selectedSchedule.standardFare,
                  isFinalDestination: true,
                }] : []),
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: paxStop?.id === item.id ? GOLD_LIGHT : c.surface, borderColor: paxStop?.id === item.id ? GOLD : c.border }]}
                  onPress={() => {
                    setPaxStop(item);
                    setPaxAmount(String(item.fareFromOrigin ?? selectedSchedule?.standardFare ?? fare ?? ''));
                    setPaxStopModalVisible(false);
                  }}
                >
                  <Ionicons name={item.isFinalDestination ? 'flag-outline' : 'location-outline'} size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>
                      {item.stopName}
                      {item.isFinalDestination ? ' (Final)' : ''}
                    </Text>
                    {item.estimatedMinutesFromDeparture ? (
                      <Text style={[styles.listItemSub, { color: c.textMuted }]}>
                        ~{item.estimatedMinutesFromDeparture} min from departure
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: GOLD, fontWeight: '800', fontSize: 15 }}>R{item.fareFromOrigin}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>
                  No stops configured for this route
                </Text>
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
            {selectedSchedule && routeVehicleList.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <Text style={[styles.listItemSub, { color: GOLD, fontWeight: '700' }]}>
                  Vehicles assigned to: {selectedSchedule.routeName}
                </Text>
              </View>
            )}
            <FlatList
              data={displayVehicles}
              keyExtractor={(item) => item.id || item.vehicleId}
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
                      {(item.vehicle?.make || item.make) ? `${item.vehicle?.make || item.make} ${item.vehicle?.model || item.model}` : 'Vehicle'}
                      {(item.vehicle?.capacity || item.capacity) ? ` · ${item.vehicle?.capacity || item.capacity} seats` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>
                  {selectedSchedule ? 'No vehicles assigned to this route' : 'No vehicles assigned'}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ===== RESUME TRIP MODAL ===== */}
      <Modal visible={resumeModalVisible} animationType="fade" transparent onRequestClose={() => setResumeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Resume a Trip?</Text>
                <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
                  You have {activeTrips.length} trip{activeTrips.length !== 1 ? 's' : ''} in progress
                </Text>
              </View>
              <TouchableOpacity onPress={() => setResumeModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeTrips}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: c.surface, borderColor: GOLD }]}
                  onPress={() => handleResumeTrip(item)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.modeIconWrap, { backgroundColor: GOLD_LIGHT, width: 40, height: 40 }]}>
                    <Ionicons name="play-outline" size={20} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>
                      {item.departureStation || 'Origin'} → {item.destinationStation || 'Dest'}
                    </Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>
                      {item.passengerCount || 0} passengers · {item.vehicleRegistration || item.vehicle?.registration || 'Vehicle'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={GOLD} />
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.border, marginTop: 8 }]}
                  onPress={() => setResumeModalVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.primaryBtnText, { color: c.text }]}>Start New Trip Instead</Text>
                </TouchableOpacity>
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
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(128,128,128,0.2)', alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: GOLD },
  circleDone: { backgroundColor: '#198754' },
  num: { fontSize: 12, fontWeight: '800', color: '#A1A1AA' },
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
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(25,135,84,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#198754' },
  statusText: { fontSize: 9, fontWeight: '800', color: '#198754', textTransform: 'uppercase' },

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

  // Mode selection
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12 },
  modeIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontSize: 16, fontWeight: '800' },
  modeSub: { fontSize: 12, marginTop: 2 },
  modeHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: 'rgba(128,128,128,0.2)' },

  // Schedule card in list
  scheduleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },

  // Form section cards
  formCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  formCardTitle: { fontSize: 14, fontWeight: '800' },

  // Selected route bar
  selectedRouteBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },

  // Trip bar
  tripBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, gap: 10 },
  tripBarRoute: { fontSize: 14, fontWeight: '800' },
  tripBarMeta: { fontSize: 11, marginTop: 2 },
  tripBarStats: { flexDirection: 'row', gap: 14 },
  tripStat: { alignItems: 'center' },
  tripStatVal: { fontSize: 16, fontWeight: '900' },
  tripStatLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

  // Passenger list
  paxList: { padding: 16, paddingBottom: 160 },
  paxCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  paxNum: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  paxNumText: { fontSize: 14, fontWeight: '900', color: GOLD },
  paxCardName: { fontSize: 14, fontWeight: '700' },
  paxCardMeta: { fontSize: 11, marginTop: 2 },

  emptyWrap: { alignItems: 'center', marginTop: 50, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 12 },

  // Cash / Card split row
  splitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1 },
  splitItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  splitLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  splitVal: { fontSize: 13, fontWeight: '900' },
  splitDivider: { width: 1, height: 20 },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, gap: 8, padding: 16, paddingBottom: 20, borderTopWidth: 1 },
  addPaxBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GOLD, borderRadius: 12, padding: 14 },
  addPaxBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: GOLD, borderRadius: 12, padding: 12 },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: GOLD },
  departBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#198754', borderRadius: 12, padding: 14 },
  departBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(128,128,128,0.2)' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalBody: { padding: 16, paddingBottom: 40 },

  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  listItemTitle: { fontSize: 14, fontWeight: '700' },
  listItemSub: { fontSize: 11, marginTop: 2 },

  // Payment method selector
  payMethodRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  payMethodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, padding: 12 },
  payMethodText: { fontSize: 14, fontWeight: '700' },

  // Payment badge on passenger cards
  payBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  payBadgeText: { fontSize: 10, fontWeight: '700' },
});
