import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, FlatList, RefreshControl,
  DatePickerIOS, Button as RNButton,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const RED = '#dc3545';

export default function CreateTripScheduleScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  // Form state
  const [selectedTaxiRankId, setSelectedTaxiRankId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedMarshalId, setSelectedMarshalId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [departureTime, setDepartureTime] = useState('08:00');
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Data state
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [marshals, setMarshals] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Modals
  const [taxiRankModalVisible, setTaxiRankModalVisible] = useState(false);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [marshalModalVisible, setMarshalModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  // ===== DATA LOADING =====
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?.userId || user?.id;
      if (!userId) return;

      // Load admin profile to get taxi rank
      const adminResp = await client.get(`/TaxiRankAdmin/user/${userId}`).catch(() => ({ data: null }));
      const admin = adminResp.data;

      const promises = [
        client.get('/TaxiRanks').catch(() => ({ data: [] })),
        client.get('/Routes').catch(() => ({ data: [] })),
        client.get('/Vehicles').catch(() => ({ data: [] })),
        client.get('/Drivers').catch(() => ({ data: [] })),
        client.get('/TaxiRankUsers/marshals').catch(() => ({ data: [] })),
      ];

      const [rankResp, routeResp, vehicleResp, driverResp, marshalResp] = await Promise.all(promises);
      setTaxiRanks(rankResp.data || []);
      setRoutes(routeResp.data || []);
      setVehicles(vehicleResp.data || []);
      setMarshals(marshalResp.data || []);

      const mappedDrivers = (driverResp.data || []).map(d => ({
        id: d.id,
        name: d.name || `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim() || 'Unknown',
        assignedVehicleId: d.assignedVehicleId || null,
      }));
      setDrivers(mappedDrivers);

      // Auto-select admin's taxi rank
      if (admin?.taxiRankId) {
        setSelectedTaxiRankId(admin.taxiRankId);
        // Load routes for this rank
        const routesForRank = await client.get(`/Routes?taxiRankId=${admin.taxiRankId}`).catch(() => ({ data: [] }));
        setRoutes(routesForRank.data || []);
      }
    } catch (err) {
      console.warn('Load data error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load schedules when taxi rank changes
  useEffect(() => {
    if (selectedTaxiRankId) {
      loadSchedules();
    }
  }, [selectedTaxiRankId]);

  // Load routes when taxi rank changes
  useEffect(() => {
    if (selectedTaxiRankId) {
      client.get(`/Routes?taxiRankId=${selectedTaxiRankId}`).then(resp => {
        setRoutes(resp.data || []);
      }).catch(() => {});
    }
  }, [selectedTaxiRankId]);

  // Load vehicles when route changes
  useEffect(() => {
    if (selectedRouteId) {
      // For now, show all vehicles. In future, filter by route assignments
      setVehicles(prev => prev);
    }
  }, [selectedRouteId]);

  // Auto-select driver when vehicle changes
  useEffect(() => {
    if (selectedVehicleId && drivers.length > 0) {
      const assigned = drivers.find(d => d.assignedVehicleId === selectedVehicleId);
      if (assigned) {
        setSelectedDriverId(assigned.id);
      }
    }
  }, [selectedVehicleId, drivers]);

  async function loadSchedules() {
    try {
      setLoadingSchedules(true);
      const today = new Date().toISOString().split('T')[0];
      const resp = await client.get(`/TaxiRankTrips/today?taxiRankId=${selectedTaxiRankId}`);
      setSchedules(resp.data || []);
    } catch (err) {
      console.warn('Load schedules error:', err?.message);
    } finally {
      setLoadingSchedules(false);
    }
  }

  // ===== HELPERS =====
  const selectedTaxiRank = taxiRanks.find(r => r.id === selectedTaxiRankId);
  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const selectedMarshal = marshals.find(m => m.id === selectedMarshalId);

  const displayVehicles = useMemo(() => {
    if (!selectedRouteId) return vehicles;
    // For now, return all vehicles. In future, filter by route assignments
    return vehicles;
  }, [vehicles, selectedRouteId]);

  const groupedSchedules = useMemo(() => {
    const groups = {};
    schedules.forEach(schedule => {
      const date = new Date(schedule.departureTime).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(schedule);
    });
    return groups;
  }, [schedules]);

  // ===== FORM HANDLERS =====
  function selectTaxiRank(rank) {
    setSelectedTaxiRankId(rank.id);
    setSelectedRouteId('');
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setSelectedMarshalId('');
    setTaxiRankModalVisible(false);
  }

  function selectRoute(route) {
    setSelectedRouteId(route.id);
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setRouteModalVisible(false);
  }

  function selectVehicle(vehicle) {
    setSelectedVehicleId(vehicle.id);
    setSelectedDriverId('');
    setVehicleModalVisible(false);
  }

  function selectDriver(driver) {
    setSelectedDriverId(driver.id);
    setDriverModalVisible(false);
  }

  function selectMarshal(marshal) {
    setSelectedMarshalId(marshal.id);
    setMarshalModalVisible(false);
  }

  async function handleSubmit() {
    if (!selectedTaxiRankId) return Alert.alert('Validation', 'Please select a taxi rank');
    if (!selectedRouteId) return Alert.alert('Validation', 'Please select a route');
    if (!selectedVehicleId) return Alert.alert('Validation', 'Please select a vehicle');
    if (!selectedDriverId) return Alert.alert('Validation', 'Please select a driver');
    if (!departureTime) return Alert.alert('Validation', 'Please set departure time');

    setSubmitting(true);
    try {
      // Combine date and time
      const scheduledDateTime = new Date(scheduledDate);
      const [hours, minutes] = departureTime.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const tripData = {
        tenantId: user?.tenantId,
        vehicleId: selectedVehicleId,
        driverId: selectedDriverId,
        marshalId: selectedMarshalId || null,
        taxiRankId: selectedTaxiRankId,
        departureStation: selectedRoute?.origin || '',
        destinationStation: selectedRoute?.destination || '',
        departureTime: scheduledDateTime.toISOString(),
        notes: notes.trim() || `Trip scheduled for ${selectedRoute?.name || 'route'}`,
      };

      await client.post('/TaxiRankTrips', tripData);
      Alert.alert('Success', 'Trip scheduled successfully!');
      resetForm();
      loadSchedules();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to schedule trip');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedRouteId('');
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setSelectedMarshalId('');
    setScheduledDate(new Date());
    setDepartureTime('08:00');
    setEstimatedArrivalTime('');
    setNotes('');
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
          <Text style={styles.headerTitle}>Create Trip Schedule</Text>
          <Text style={styles.headerSub}>Plan daily trip rosters</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Taxi Rank */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Taxi Rank *</Text>
        <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setTaxiRankModalVisible(true)}>
          <Ionicons name="business-outline" size={18} color={GOLD} />
          <Text style={[styles.pickerText, { color: selectedTaxiRank ? c.text : c.textMuted }]}>
            {selectedTaxiRank ? `${selectedTaxiRank.name} - ${selectedTaxiRank.location}` : 'Select taxi rank'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        {/* Route */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Route *</Text>
        <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setRouteModalVisible(true)}>
          <Ionicons name="git-branch-outline" size={18} color={GOLD} />
          <Text style={[styles.pickerText, { color: selectedRoute ? c.text : c.textMuted }]}>
            {selectedRoute ? `${selectedRoute.name} (${selectedRoute.origin} → ${selectedRoute.destination})` : 'Select route'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        {/* Vehicle */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Vehicle *</Text>
        <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setVehicleModalVisible(true)}>
          <Ionicons name="bus-outline" size={18} color={GOLD} />
          <Text style={[styles.pickerText, { color: selectedVehicle ? c.text : c.textMuted }]}>
            {selectedVehicle ? `${selectedVehicle.registration} - ${selectedVehicle.make} ${selectedVehicle.model}` : 'Select vehicle'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        {/* Driver */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Driver *</Text>
        <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setDriverModalVisible(true)}>
          <Ionicons name="person-outline" size={18} color={GOLD} />
          <Text style={[styles.pickerText, { color: selectedDriver ? c.text : c.textMuted }]}>
            {selectedDriver ? selectedDriver.name : 'Select driver'}
          </Text>
          {selectedDriver && selectedDriver.assignedVehicleId === selectedVehicleId && (
            <View style={{ backgroundColor: GREEN, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>ASSIGNED</Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        {/* Marshal */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Marshal</Text>
        <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setMarshalModalVisible(true)}>
          <Ionicons name="shield-outline" size={18} color={GOLD} />
          <Text style={[styles.pickerText, { color: selectedMarshal ? c.text : c.textMuted }]}>
            {selectedMarshal ? selectedMarshal.fullName : 'Select marshal (optional)'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        {/* Date & Time */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Schedule Time</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: c.textMuted }]}>Scheduled Date</Text>
            <TouchableOpacity style={[inp, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setDatePickerVisible(true)}>
              <Text style={{ color: c.text }}>{scheduledDate.toLocaleDateString()}</Text>
              <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: c.textMuted }]}>Departure Time</Text>
            <TouchableOpacity style={[inp, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setTimePickerVisible(true)}>
              <Text style={{ color: c.text }}>{departureTime}</Text>
              <Ionicons name="time-outline" size={18} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.label, { color: c.textMuted }]}>Notes</Text>
        <TextInput value={notes} onChangeText={setNotes} style={[inp, { minHeight: 56 }]} placeholder="Optional notes" placeholderTextColor={c.textMuted} multiline />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#000" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
              <Text style={styles.primaryBtnText}>Create Trip Schedule</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Today's Schedules */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>Today's Schedules</Text>
        {loadingSchedules ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={GOLD} />
            <Text style={[styles.label, { color: c.textMuted, marginTop: 8 }]}>Loading schedules...</Text>
          </View>
        ) : schedules.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>No schedules for today</Text>
          </View>
        ) : (
          Object.entries(groupedSchedules).map(([date, daySchedules]) => (
            <View key={date} style={{ marginTop: 16 }}>
              <Text style={[styles.dateHeader, { color: c.text }]}>{date}</Text>
              {daySchedules.map((schedule, i) => (
                <View key={schedule.id} style={[styles.scheduleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scheduleTime, { color: c.text }]}>
                      {new Date(schedule.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.scheduleRoute, { color: c.textMuted }]}>
                      {schedule.departureStation} → {schedule.destinationStation}
                    </Text>
                    <Text style={[styles.scheduleDetails, { color: c.textMuted }]}>
                      {schedule.vehicle?.registration} · {schedule.driver?.name || 'No driver'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: schedule.status === 'Completed' ? GREEN : GOLD }]}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{schedule.status || 'Scheduled'}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* ===== TAXI RANK PICKER MODAL ===== */}
      <Modal visible={taxiRankModalVisible} animationType="slide" transparent onRequestClose={() => setTaxiRankModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Taxi Rank" onClose={() => setTaxiRankModalVisible(false)} c={c} />
            <FlatList
              data={taxiRanks}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: item.id === selectedTaxiRankId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedTaxiRankId ? GOLD : c.border }]}
                  onPress={() => selectTaxiRank(item)}
                >
                  <Ionicons name="business-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.name}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.location}</Text>
                  </View>
                  {item.id === selectedTaxiRankId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>No taxi ranks</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== ROUTE PICKER MODAL ===== */}
      <Modal visible={routeModalVisible} animationType="slide" transparent onRequestClose={() => setRouteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Route" onClose={() => setRouteModalVisible(false)} c={c} />
            <FlatList
              data={routes}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: item.id === selectedRouteId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedRouteId ? GOLD : c.border }]}
                  onPress={() => selectRoute(item)}
                >
                  <Ionicons name="git-branch-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.name}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.origin} → {item.destination} · R{item.fareAmount}</Text>
                  </View>
                  {item.id === selectedRouteId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>No routes for this taxi rank</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== VEHICLE PICKER MODAL ===== */}
      <Modal visible={vehicleModalVisible} animationType="slide" transparent onRequestClose={() => setVehicleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Vehicle" onClose={() => setVehicleModalVisible(false)} c={c} />
            <FlatList
              data={displayVehicles}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: item.id === selectedVehicleId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedVehicleId ? GOLD : c.border }]}
                  onPress={() => selectVehicle(item)}
                >
                  <Ionicons name="bus-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.registration}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.make} {item.model}</Text>
                  </View>
                  {item.id === selectedVehicleId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>No vehicles</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== DRIVER PICKER MODAL ===== */}
      <Modal visible={driverModalVisible} animationType="slide" transparent onRequestClose={() => setDriverModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Driver" onClose={() => setDriverModalVisible(false)} c={c} />
            <FlatList
              data={drivers}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isAssigned = item.assignedVehicleId === selectedVehicleId;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, { backgroundColor: item.id === selectedDriverId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedDriverId ? GOLD : c.border }]}
                    onPress={() => selectDriver(item)}
                  >
                    <Ionicons name="person-outline" size={18} color={GOLD} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemTitle, { color: c.text }]}>{item.name}</Text>
                    </View>
                    {isAssigned && (
                      <View style={{ backgroundColor: GREEN, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>ASSIGNED</Text>
                      </View>
                    )}
                    {item.id === selectedDriverId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>No drivers</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== MARSHAL PICKER MODAL ===== */}
      <Modal visible={marshalModalVisible} animationType="slide" transparent onRequestClose={() => setMarshalModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Marshal" onClose={() => setMarshalModalVisible(false)} c={c} />
            <FlatList
              data={marshals}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: item.id === selectedMarshalId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedMarshalId ? GOLD : c.border }]}
                  onPress={() => selectMarshal(item)}
                >
                  <Ionicons name="shield-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.fullName}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.marshalCode}</Text>
                  </View>
                  {item.id === selectedMarshalId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>No marshals</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== DATE PICKER MODAL ===== */}
      <Modal visible={datePickerVisible} animationType="slide" transparent onRequestClose={() => setDatePickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Date" onClose={() => setDatePickerVisible(false)} c={c} />
            <View style={{ padding: 16 }}>
              <DatePickerIOS
                date={scheduledDate}
                onDateChange={setScheduledDate}
                mode="date"
                minimumDate={new Date()}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setDatePickerVisible(false)}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== TIME PICKER MODAL ===== */}
      <Modal visible={timePickerVisible} animationType="slide" transparent onRequestClose={() => setTimePickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Set Departure Time" onClose={() => setTimePickerVisible(false)} c={c} />
            <View style={{ padding: 16 }}>
              <TextInput
                style={[inp, { fontSize: 18, textAlign: 'center' }]}
                value={departureTime}
                onChangeText={setDepartureTime}
                placeholder="08:00"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
              />
              <Text style={[styles.label, { color: c.textMuted, textAlign: 'center', marginTop: 8 }]}>
                Format: HH:MM (24-hour)
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setTimePickerVisible(false)}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ModalHeader({ title, onClose, c }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={[styles.modalTitle, { color: c.text }]}>{title}</Text>
      <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={c.textMuted} /></TouchableOpacity>
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
  sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  label: { fontSize: 10, fontWeight: '700', marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 2 },
  row: { flexDirection: 'row', gap: 10 },

  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 6 },
  pickerText: { flex: 1, fontSize: 14 },

  primaryBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: '#000' },

  scheduleCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleTime: { fontSize: 14, fontWeight: '800' },
  scheduleRoute: { fontSize: 12, marginTop: 2 },
  scheduleDetails: { fontSize: 11, marginTop: 2 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },

  dateHeader: { fontSize: 13, fontWeight: '900', marginBottom: 8, textTransform: 'uppercase' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontSize: 17, fontWeight: '900' },

  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  listItemTitle: { fontSize: 14, fontWeight: '700' },
  listItemSub: { fontSize: 11, marginTop: 2 },
});
