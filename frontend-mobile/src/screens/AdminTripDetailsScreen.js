import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, FlatList, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const RED = '#dc3545';

export default function AdminTripDetailsScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [activeTab, setActiveTab] = useState('capture'); // capture | history | revenue

  // Shared data
  const [adminProfile, setAdminProfile] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== CAPTURE TAB STATE =====
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [notes, setNotes] = useState('');
  const [totalAmountOverride, setTotalAmountOverride] = useState('');
  const [totalPaxOverride, setTotalPaxOverride] = useState('');
  const [passengers, setPassengers] = useState([createEmptyPassenger()]);
  const [submitting, setSubmitting] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [paxModalVisible, setPaxModalVisible] = useState(false);
  const [editingPaxIndex, setEditingPaxIndex] = useState(-1);
  const [paxForm, setPaxForm] = useState(createEmptyPassenger());

  // ===== HISTORY TAB STATE =====
  const [historicalTrips, setHistoricalTrips] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [tripDetailModal, setTripDetailModal] = useState(null);

  // ===== REVENUE TAB STATE =====
  const [revenueData, setRevenueData] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  function createEmptyPassenger() {
    return { name: '', contactNumber: '', nextOfKin: '', nextOfKinContact: '', address: '', destination: '', fareAmount: '' };
  }

  // ===== DATA LOADING =====
  const loadBaseData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?.userId || user?.id;
      if (!userId) { setLoading(false); return; }

      // Fetch admin profile first
      const adminResp = await client.get(`/TaxiRankAdmin/user/${userId}`).catch(() => ({ data: null }));
      const admin = adminResp.data;
      setAdminProfile(admin);

      const promises = [
        client.get('/Vehicles').catch(() => ({ data: [] })),
        client.get('/Routes').catch(() => ({ data: [] })),
        client.get('/Drivers').catch(() => ({ data: [] })),
      ];

      // Fetch schedules (routes with linked vehicles) if admin exists
      if (admin?.id) {
        promises.push(client.get(`/TaxiRankAdmin/${admin.id}/schedules`).catch(() => ({ data: [] })));
      }

      const [vehResp, routeResp, driverResp, schedResp] = await Promise.all(promises);
      setVehicles(vehResp.data || []);
      setRoutes(routeResp.data || []);
      setSchedules(schedResp?.data || []);
      const mappedDrivers = (driverResp.data || []).map(d => ({
        id: d.id,
        firstName: d.user?.firstName || d.name?.split(' ')[0] || d.firstName || 'Unknown',
        lastName: d.user?.lastName || d.name?.split(' ').slice(1).join(' ') || d.lastName || '',
        userCode: d.user?.userCode || d.idNumber || '',
        assignedVehicleId: d.assignedVehicleId || null,
      }));
      setDrivers(mappedDrivers);
    } catch (err) {
      console.warn('Load base data error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadBaseData(); }, [loadBaseData]);

  // Auto-select driver when vehicle changes
  useEffect(() => {
    if (selectedVehicleId && drivers.length > 0) {
      const assigned = drivers.find(d => d.assignedVehicleId === selectedVehicleId);
      if (assigned) {
        setSelectedDriverId(assigned.id);
      }
    }
  }, [selectedVehicleId, drivers]);

  // ===== CAPTURE FUNCTIONS =====
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  // Vehicles linked to the selected schedule/route
  const routeVehicleList = useMemo(() => {
    if (!selectedSchedule) return [];
    return (selectedSchedule.routeVehicles || []).filter(rv => rv.isActive !== false);
  }, [selectedSchedule]);

  const displayVehicles = useMemo(() => {
    if (routeVehicleList.length > 0) {
      return routeVehicleList.map(rv => ({
        id: rv.vehicleId,
        vehicleId: rv.vehicleId,
        registration: rv.vehicle?.registration || rv.vehicle?.registrationNumber || rv.vehicleId,
        make: rv.vehicle?.make || '',
        model: rv.vehicle?.model || '',
        capacity: rv.vehicle?.capacity,
        vehicle: rv.vehicle,
      }));
    }
    return vehicles;
  }, [routeVehicleList, vehicles]);

  // Route stops for destination picker
  const routeStops = useMemo(() => {
    return (selectedSchedule?.stops || []).slice().sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));
  }, [selectedSchedule]);

  const routeDestinations = useMemo(() => {
    if (selectedSchedule) {
      // Use schedule stops + final destination
      const stops = routeStops.map(s => s.stopName);
      if (selectedSchedule.destinationStation) stops.push(selectedSchedule.destinationStation);
      return stops.filter(Boolean);
    }
    if (!selectedRoute) return [];
    return [selectedRoute.origin, ...(selectedRoute.stops || []), selectedRoute.destination].filter(Boolean);
  }, [selectedSchedule, routeStops, selectedRoute]);

  function selectScheduleRoute(sched) {
    setSelectedSchedule(sched);
    setSelectedRouteId(sched.id);
    // Clear vehicle on route change
    setSelectedVehicleId('');
    // Set default fare for existing passengers (not the empty placeholder)
    setPassengers(prev => prev.map(p => {
      if (p.name.trim() || p.contactNumber.trim() || p.address.trim()) {
        return { ...p, fareAmount: p.fareAmount || String(sched.standardFare || '') };
      }
      return p; // leave empty passenger unchanged
    }));
    setRouteModalVisible(false);
  }

  const totalFare = useMemo(() => {
    if (totalAmountOverride) return parseFloat(totalAmountOverride) || 0;
    return passengers.reduce((sum, p) => sum + (parseFloat(p.fareAmount) || 0), 0);
  }, [passengers, totalAmountOverride]);

  const passengerCount = useMemo(() => {
    if (totalPaxOverride) return parseInt(totalPaxOverride) || 0;
    return passengers.filter(p => p.name.trim()).length;
  }, [passengers, totalPaxOverride]);

  function openEditPassenger(index) {
    setEditingPaxIndex(index);
    setPaxForm({ ...passengers[index] });
    setPaxModalVisible(true);
  }

  function openAddPassenger() {
    const fare = selectedSchedule?.standardFare || routes.find(r => r.id === selectedRouteId)?.fareAmount || '';
    setEditingPaxIndex(-1);
    setPaxForm({ ...createEmptyPassenger(), fareAmount: fare ? String(fare) : '' });
    setPaxModalVisible(true);
  }

  function savePassenger() {
    if (!paxForm.name.trim()) return Alert.alert('Validation', 'Passenger name is required');
    if (editingPaxIndex >= 0) {
      setPassengers(prev => prev.map((p, i) => i === editingPaxIndex ? { ...paxForm } : p));
    } else {
      setPassengers(prev => [...prev, { ...paxForm }]);
    }
    setPaxModalVisible(false);
  }

  function removePassenger(index) {
    if (passengers.length <= 1) return;
    Alert.alert('Remove', `Remove ${passengers[index].name || 'this passenger'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPassengers(prev => prev.filter((_, i) => i !== index)) },
    ]);
  }

  async function handleSubmitTrip() {
    if (!selectedVehicleId) return Alert.alert('Validation', 'Please select a vehicle');
    if (!selectedRouteId) return Alert.alert('Validation', 'Please select a route');
    if (!selectedDriverId) return Alert.alert('Validation', 'Please select a driver');
    if (passengers.length === 0 || !passengers.some(p => p.name.trim())) {
      return Alert.alert('Validation', 'Add at least one passenger');
    }

    setSubmitting(true);
    try {
      const tripData = {
        vehicleId: selectedVehicleId,
        routeId: selectedRouteId,
        driverId: selectedDriverId,
        tripDate: new Date(tripDate).toISOString(),
        departureTime: departureTime || null,
        arrivalTime: arrivalTime || null,
        passengers: passengers.filter(p => p.name.trim()).map(p => ({
          name: p.name.trim(),
          contactNumber: p.contactNumber?.trim() || null,
          nextOfKin: p.nextOfKin?.trim() || null,
          nextOfKinContact: p.nextOfKinContact?.trim() || null,
          address: p.address?.trim() || null,
          destination: p.destination?.trim() || null,
          fareAmount: parseFloat(p.fareAmount) || 0,
        })),
        totalFare,
        passengerCount,
        status: 'Completed',
        notes: notes.trim() || null,
      };

      const resp = await client.post('/TripDetails', tripData);
      const tripId = resp.data?.id;

      // Record vehicle earnings
      try {
        await client.post('/VehicleEarnings', {
          vehicleId: selectedVehicleId,
          amount: totalFare,
          date: tripData.tripDate,
          source: 'Trip',
          description: `Trip earnings - ${passengerCount} passengers (Trip ID: ${tripId})`,
          period: 'Daily',
        });
      } catch (e) {
        console.warn('Earnings recording failed:', e?.message);
      }

      Alert.alert('Success', 'Trip details saved and earnings recorded!');
      resetCaptureForm();
      loadHistoricalTrips();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to save trip');
    } finally {
      setSubmitting(false);
    }
  }

  function resetCaptureForm() {
    setSelectedSchedule(null);
    setSelectedVehicleId('');
    setSelectedRouteId('');
    setSelectedDriverId('');
    setDepartureTime('');
    setArrivalTime('');
    setNotes('');
    setTotalAmountOverride('');
    setTotalPaxOverride('');
    setPassengers([createEmptyPassenger()]);
  }

  // ===== HISTORY FUNCTIONS =====
  async function loadHistoricalTrips() {
    try {
      setLoadingHistory(true);
      const resp = await client.get('/TripDetails');
      setHistoricalTrips(resp.data || []);
    } catch (err) {
      console.warn('History load error:', err?.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'history' && historicalTrips.length === 0) loadHistoricalTrips();
  }, [activeTab]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historicalTrips;
    const q = historySearch.toLowerCase();
    return historicalTrips.filter(t => {
      const veh = vehicles.find(v => v.id === t.vehicleId);
      const route = routes.find(r => r.id === t.routeId);
      return (
        (veh?.registration || '').toLowerCase().includes(q) ||
        (route?.name || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.status || '').toLowerCase().includes(q)
      );
    });
  }, [historicalTrips, historySearch, vehicles, routes]);

  // ===== REVENUE FUNCTIONS =====
  const revenueByVehicle = useMemo(() => {
    const map = {};
    filteredHistory.forEach(t => {
      const veh = vehicles.find(v => v.id === t.vehicleId);
      const key = veh?.registration || 'Unknown';
      map[key] = (map[key] || 0) + (t.totalFare || 0);
    });
    return Object.entries(map).map(([vehicle, revenue]) => ({ vehicle, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredHistory, vehicles]);

  const revenueByRoute = useMemo(() => {
    const map = {};
    filteredHistory.forEach(t => {
      const route = routes.find(r => r.id === t.routeId);
      const key = route?.name || 'Unknown';
      map[key] = (map[key] || 0) + (t.totalFare || 0);
    });
    return Object.entries(map).map(([route, revenue]) => ({ route, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredHistory, routes]);

  const totalRevenue = filteredHistory.reduce((s, t) => s + (t.totalFare || 0), 0);
  const totalPax = filteredHistory.reduce((s, t) => s + (t.passengerCount || t.passengers?.length || 0), 0);
  const avgPerTrip = filteredHistory.length > 0 ? totalRevenue / filteredHistory.length : 0;

  // ===== HELPERS =====
  function getVehicleName(vehicleId) {
    const v = vehicles.find(x => x.id === vehicleId);
    return v ? `${v.registration} - ${v.make} ${v.model}` : 'Unknown';
  }
  function getRouteName(routeId) {
    const sched = schedules.find(x => x.id === routeId);
    if (sched) return sched.routeName;
    const r = routes.find(x => x.id === routeId);
    return r ? r.name : 'Unknown';
  }
  function getDriverName(driverId) {
    const d = drivers.find(x => x.id === driverId);
    return d ? `${d.firstName} ${d.lastName}` : 'Unknown';
  }
  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString();
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
          <Text style={styles.headerTitle}>Trip Details</Text>
          <Text style={styles.headerSub}>Capture & manage trip records</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderColor: c.border }]}>
        {[
          { key: 'capture', icon: 'add-circle-outline', label: 'Capture' },
          { key: 'history', icon: 'time-outline', label: 'History' },
          { key: 'revenue', icon: 'bar-chart-outline', label: 'Revenue' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? GOLD : c.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? GOLD : c.textMuted }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ========== CAPTURE TAB ========== */}
      {activeTab === 'capture' && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Route (first) */}
          <Text style={[styles.sectionTitle, { color: c.text }]}>Route *</Text>
          <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setRouteModalVisible(true)}>
            <Ionicons name="git-branch-outline" size={18} color={GOLD} />
            <Text style={[styles.pickerText, { color: selectedSchedule ? c.text : c.textMuted }]}>
              {selectedSchedule
                ? `${selectedSchedule.routeName} (${selectedSchedule.departureStation} → ${selectedSchedule.destinationStation})`
                : 'Select a route'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </TouchableOpacity>

          {/* Vehicle (filtered by route) */}
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Vehicle *</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => {
              if (!selectedSchedule) return Alert.alert('Select Route First', 'Please select a route to see linked vehicles.');
              if (displayVehicles.length === 0) return Alert.alert('No Vehicles', 'No vehicles assigned to this route. Assign vehicles via Manage Routes.');
              setVehicleModalVisible(true);
            }}
          >
            <Ionicons name="bus-outline" size={18} color={GOLD} />
            <Text style={[styles.pickerText, { color: selectedVehicleId ? c.text : c.textMuted }]}>
              {selectedVehicleId
                ? (displayVehicles.find(v => v.id === selectedVehicleId || v.vehicleId === selectedVehicleId)?.registration || selectedVehicleId)
                : (selectedSchedule ? `Select vehicle (${displayVehicles.length} available)` : 'Select route first')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </TouchableOpacity>

          {/* Driver */}
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Driver *</Text>
          <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setDriverModalVisible(true)}>
            <Ionicons name="person-outline" size={18} color={GOLD} />
            <Text style={[styles.pickerText, { color: selectedDriver ? c.text : c.textMuted }]}>
              {selectedDriver ? `${selectedDriver.firstName} ${selectedDriver.lastName}` : 'Select driver'}
            </Text>
            {selectedDriver && selectedDriver.assignedVehicleId === selectedVehicleId && (
              <View style={{ backgroundColor: GREEN, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>ASSIGNED</Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </TouchableOpacity>

          {/* Trip Date & Times */}
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Trip Info</Text>
          <Text style={[styles.label, { color: c.textMuted }]}>Trip Date</Text>
          <TextInput value={tripDate} onChangeText={setTripDate} style={inp} placeholder="YYYY-MM-DD" placeholderTextColor={c.textMuted} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Departure Time</Text>
              <TextInput value={departureTime} onChangeText={setDepartureTime} style={inp} placeholder="e.g. 07:30" placeholderTextColor={c.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Arrival Time</Text>
              <TextInput value={arrivalTime} onChangeText={setArrivalTime} style={inp} placeholder="e.g. 09:00" placeholderTextColor={c.textMuted} />
            </View>
          </View>

          {/* Overrides */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Total Amount (override)</Text>
              <TextInput value={totalAmountOverride} onChangeText={setTotalAmountOverride} style={inp} placeholder="Auto" placeholderTextColor={c.textMuted} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Total Pax (override)</Text>
              <TextInput value={totalPaxOverride} onChangeText={setTotalPaxOverride} style={inp} placeholder="Auto" placeholderTextColor={c.textMuted} keyboardType="numeric" />
            </View>
          </View>

          {/* Passengers */}
          <View style={[styles.sectionRow, { marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Passengers ({passengers.length})</Text>
            <TouchableOpacity onPress={openAddPassenger} style={[styles.addBtn, { backgroundColor: GOLD }]}>
              <Ionicons name="add" size={18} color="#000" />
              <Text style={{ fontWeight: '800', color: '#000', fontSize: 12 }}>Add</Text>
            </TouchableOpacity>
          </View>

          {passengers.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.paxCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => openEditPassenger(i)}
            >
              <View style={[styles.paxNum, { backgroundColor: GOLD_LIGHT }]}>
                <Text style={styles.paxNumText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.paxName, { color: c.text }]}>{p.name || 'Tap to edit'}</Text>
                <Text style={[styles.paxMeta, { color: c.textMuted }]}>
                  {p.destination ? `To: ${p.destination}` : ''}{p.contactNumber ? ` · ${p.contactNumber}` : ''}
                </Text>
              </View>
              <Text style={{ color: GOLD, fontWeight: '800', fontSize: 15 }}>R{p.fareAmount || '0'}</Text>
              {passengers.length > 1 && (
                <TouchableOpacity onPress={() => removePassenger(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle-outline" size={20} color={RED} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}

          {/* Summary */}
          <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Total Passengers</Text>
              <Text style={[styles.summaryVal, { color: c.text }]}>{passengerCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Total Fare</Text>
              <Text style={[styles.summaryVal, { color: GOLD }]}>R{totalFare.toFixed(2)}</Text>
            </View>
          </View>

          <Text style={[styles.label, { color: c.textMuted }]}>Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} style={[...inp, { minHeight: 56 }]} placeholder="Optional notes" placeholderTextColor={c.textMuted} multiline />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmitTrip} disabled={submitting} activeOpacity={0.85}>
            {submitting ? <ActivityIndicator color="#000" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
                <Text style={styles.primaryBtnText}>Save Trip Details</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ========== HISTORY TAB ========== */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 12 }}>
            <TextInput
              style={[...inp, { marginBottom: 0 }]}
              value={historySearch}
              onChangeText={setHistorySearch}
              placeholder="Search by vehicle, route, status..."
              placeholderTextColor={c.textMuted}
            />
          </View>
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12 }}
            refreshControl={<RefreshControl refreshing={loadingHistory} onRefresh={loadHistoricalTrips} colors={[GOLD]} tintColor={GOLD} />}
            ListHeaderComponent={
              <Text style={[styles.label, { color: c.textMuted, marginBottom: 8 }]}>
                {filteredHistory.length} trip{filteredHistory.length !== 1 ? 's' : ''} found
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="document-text-outline" size={48} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No trip records yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.historyCard, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => setTripDetailModal(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyTitle, { color: c.text }]}>{getVehicleName(item.vehicleId)}</Text>
                  <Text style={[styles.historyMeta, { color: c.textMuted }]}>
                    {getRouteName(item.routeId)} · {getDriverName(item.driverId)}
                  </Text>
                  <Text style={[styles.historyMeta, { color: c.textMuted }]}>
                    {formatDate(item.tripDate)} · {item.passengerCount || item.passengers?.length || 0} pax
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: GOLD, fontWeight: '900', fontSize: 16 }}>R{(item.totalFare || 0).toFixed(2)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'Completed' ? GREEN : GOLD }]}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{item.status || 'Completed'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ========== REVENUE TAB ========== */}
      {activeTab === 'revenue' && (
        <ScrollView contentContainerStyle={styles.body}>
          {/* Summary Cards */}
          <View style={styles.revSummaryRow}>
            <View style={[styles.revCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="cash-outline" size={22} color={GOLD} />
              <Text style={[styles.revCardVal, { color: c.text }]}>R{totalRevenue.toFixed(2)}</Text>
              <Text style={[styles.revCardLabel, { color: c.textMuted }]}>Total Revenue</Text>
            </View>
            <View style={[styles.revCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="people-outline" size={22} color={GOLD} />
              <Text style={[styles.revCardVal, { color: c.text }]}>{totalPax}</Text>
              <Text style={[styles.revCardLabel, { color: c.textMuted }]}>Total Passengers</Text>
            </View>
          </View>
          <View style={styles.revSummaryRow}>
            <View style={[styles.revCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="analytics-outline" size={22} color={GOLD} />
              <Text style={[styles.revCardVal, { color: c.text }]}>R{avgPerTrip.toFixed(2)}</Text>
              <Text style={[styles.revCardLabel, { color: c.textMuted }]}>Avg Per Trip</Text>
            </View>
            <View style={[styles.revCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="car-outline" size={22} color={GOLD} />
              <Text style={[styles.revCardVal, { color: c.text }]}>{filteredHistory.length}</Text>
              <Text style={[styles.revCardLabel, { color: c.textMuted }]}>Total Trips</Text>
            </View>
          </View>

          {/* Revenue by Vehicle */}
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Revenue by Vehicle</Text>
          {revenueByVehicle.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.textMuted }]}>No data</Text>
          ) : revenueByVehicle.map((item, i) => {
            const maxRev = revenueByVehicle[0]?.revenue || 1;
            return (
              <View key={i} style={[styles.barRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.barLabel, { color: c.text }]} numberOfLines={1}>{item.vehicle}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(item.revenue / maxRev) * 100}%` }]} />
                </View>
                <Text style={[styles.barVal, { color: GOLD }]}>R{item.revenue.toFixed(0)}</Text>
              </View>
            );
          })}

          {/* Revenue by Route */}
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Revenue by Route</Text>
          {revenueByRoute.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.textMuted }]}>No data</Text>
          ) : revenueByRoute.map((item, i) => {
            const maxRev = revenueByRoute[0]?.revenue || 1;
            return (
              <View key={i} style={[styles.barRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.barLabel, { color: c.text }]} numberOfLines={1}>{item.route}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(item.revenue / maxRev) * 100}%` }]} />
                </View>
                <Text style={[styles.barVal, { color: GOLD }]}>R{item.revenue.toFixed(0)}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ===== ROUTE PICKER MODAL ===== */}
      <Modal visible={routeModalVisible} animationType="slide" transparent onRequestClose={() => setRouteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Route" onClose={() => setRouteModalVisible(false)} c={c} />
            <FlatList
              data={schedules.filter(s => s.isActive)}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const rvCount = item.routeVehicles?.filter(rv => rv.isActive !== false)?.length || 0;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, { backgroundColor: selectedSchedule?.id === item.id ? GOLD_LIGHT : c.surface, borderColor: selectedSchedule?.id === item.id ? GOLD : c.border }]}
                    onPress={() => selectScheduleRoute(item)}
                  >
                    <Ionicons name="git-branch-outline" size={18} color={GOLD} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemTitle, { color: c.text }]}>{item.routeName}</Text>
                      <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.departureStation} → {item.destinationStation} · R{item.standardFare}</Text>
                      {rvCount > 0 && (
                        <Text style={[styles.listItemSub, { color: GOLD, fontWeight: '600', marginTop: 2 }]}>
                          {rvCount} vehicle{rvCount > 1 ? 's' : ''} assigned
                        </Text>
                      )}
                    </View>
                    {selectedSchedule?.id === item.id && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>No routes configured for this taxi rank</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== VEHICLE PICKER MODAL ===== */}
      <Modal visible={vehicleModalVisible} animationType="slide" transparent onRequestClose={() => setVehicleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Vehicle" onClose={() => setVehicleModalVisible(false)} c={c} />
            {selectedSchedule && routeVehicleList.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <Text style={[styles.listItemSub, { color: GOLD, fontWeight: '700' }]}>
                  Vehicles assigned to: {selectedSchedule.routeName}
                </Text>
              </View>
            )}
            <FlatList
              data={displayVehicles}
              keyExtractor={item => item.id || item.vehicleId}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const vId = item.vehicleId || item.id;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, { backgroundColor: vId === selectedVehicleId ? GOLD_LIGHT : c.surface, borderColor: vId === selectedVehicleId ? GOLD : c.border }]}
                    onPress={() => { setSelectedVehicleId(vId); setVehicleModalVisible(false); }}
                  >
                    <Ionicons name="bus-outline" size={18} color={GOLD} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemTitle, { color: c.text }]}>{item.registration}</Text>
                      <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.make} {item.model}{item.capacity ? ` · ${item.capacity} seats` : ''}</Text>
                    </View>
                    {vId === selectedVehicleId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>No vehicles assigned to this route</Text>}
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
                    onPress={() => { setSelectedDriverId(item.id); setDriverModalVisible(false); }}
                  >
                    <Ionicons name="person-outline" size={18} color={GOLD} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemTitle, { color: c.text }]}>{item.firstName} {item.lastName}</Text>
                      <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.userCode}</Text>
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

      {/* ===== PASSENGER EDIT MODAL ===== */}
      <Modal visible={paxModalVisible} animationType="slide" transparent onRequestClose={() => setPaxModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title={editingPaxIndex >= 0 ? 'Edit Passenger' : 'Add Passenger'} onClose={() => setPaxModalVisible(false)} c={c} />
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: c.textMuted }]}>Name *</Text>
              <TextInput value={paxForm.name} onChangeText={t => setPaxForm(p => ({ ...p, name: t }))} style={inp} placeholder="Full name" placeholderTextColor={c.textMuted} autoFocus />

              <Text style={[styles.label, { color: c.textMuted }]}>Contact Number</Text>
              <TextInput value={paxForm.contactNumber} onChangeText={t => setPaxForm(p => ({ ...p, contactNumber: t }))} style={inp} placeholder="072 123 4567" placeholderTextColor={c.textMuted} keyboardType="phone-pad" />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Next of Kin</Text>
                  <TextInput value={paxForm.nextOfKin} onChangeText={t => setPaxForm(p => ({ ...p, nextOfKin: t }))} style={inp} placeholder="Name" placeholderTextColor={c.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>NoK Contact</Text>
                  <TextInput value={paxForm.nextOfKinContact} onChangeText={t => setPaxForm(p => ({ ...p, nextOfKinContact: t }))} style={inp} placeholder="Phone" placeholderTextColor={c.textMuted} keyboardType="phone-pad" />
                </View>
              </View>

              <Text style={[styles.label, { color: c.textMuted }]}>Address</Text>
              <TextInput value={paxForm.address} onChangeText={t => setPaxForm(p => ({ ...p, address: t }))} style={inp} placeholder="Home address" placeholderTextColor={c.textMuted} />

              <Text style={[styles.label, { color: c.textMuted }]}>Destination Stop</Text>
              {routeStops.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {[
                    ...routeStops,
                    // Add final destination as a stop option
                    ...(selectedSchedule?.destinationStation ? [{
                      id: 'final-destination',
                      stopName: selectedSchedule.destinationStation,
                      stopOrder: 999,
                      fareFromOrigin: selectedSchedule.standardFare,
                      isFinalDestination: true,
                    }] : []),
                  ].map((stop, i) => (
                    <TouchableOpacity
                      key={stop.id || i}
                      style={[styles.destChip, { backgroundColor: paxForm.destination === stop.stopName ? GOLD : c.surface, borderColor: paxForm.destination === stop.stopName ? GOLD : c.border }]}
                      onPress={() => {
                        setPaxForm(p => ({ 
                          ...p, 
                          destination: stop.stopName,
                          fareAmount: String(stop.fareFromOrigin || selectedSchedule?.standardFare || '')
                        }));
                      }}
                    >
                      <View style={{ alignItems: 'center', paddingHorizontal: 4 }}>
                        <Text style={{ color: paxForm.destination === stop.stopName ? '#000' : c.text, fontWeight: '700', fontSize: 11, textAlign: 'center' }}>
                          {stop.isFinalDestination ? 'Final' : stop.stopName}
                        </Text>
                        <Text style={{ color: paxForm.destination === stop.stopName ? '#000' : GOLD, fontWeight: '800', fontSize: 10, marginTop: 1 }}>
                          R{stop.fareFromOrigin || selectedSchedule?.standardFare || '0'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <TextInput value={paxForm.destination} onChangeText={t => setPaxForm(p => ({ ...p, destination: t }))} style={inp} placeholder="Destination" placeholderTextColor={c.textMuted} />
              )}

              <Text style={[styles.label, { color: c.textMuted }]}>Fare Amount (R) *</Text>
              <TextInput value={paxForm.fareAmount} onChangeText={t => setPaxForm(p => ({ ...p, fareAmount: t }))} style={inp} placeholder="25.00" placeholderTextColor={c.textMuted} keyboardType="decimal-pad" />

              <TouchableOpacity style={styles.primaryBtn} onPress={savePassenger} activeOpacity={0.85}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={editingPaxIndex >= 0 ? 'checkmark-outline' : 'person-add-outline'} size={18} color="#000" />
                  <Text style={styles.primaryBtnText}>{editingPaxIndex >= 0 ? 'Update' : 'Add'} Passenger</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== TRIP DETAIL MODAL ===== */}
      <Modal visible={!!tripDetailModal} animationType="slide" transparent onRequestClose={() => setTripDetailModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Trip Details" onClose={() => setTripDetailModal(null)} c={c} />
            {tripDetailModal && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <DetailRow label="Date" value={formatDate(tripDetailModal.tripDate)} c={c} />
                <DetailRow label="Vehicle" value={getVehicleName(tripDetailModal.vehicleId)} c={c} />
                <DetailRow label="Route" value={getRouteName(tripDetailModal.routeId)} c={c} />
                <DetailRow label="Driver" value={getDriverName(tripDetailModal.driverId)} c={c} />
                <DetailRow label="Departure" value={tripDetailModal.departureTime || '-'} c={c} />
                <DetailRow label="Arrival" value={tripDetailModal.arrivalTime || '-'} c={c} />
                <DetailRow label="Passengers" value={String(tripDetailModal.passengerCount || tripDetailModal.passengers?.length || 0)} c={c} />
                <DetailRow label="Total Fare" value={`R${(tripDetailModal.totalFare || 0).toFixed(2)}`} c={c} gold />
                {tripDetailModal.notes ? <DetailRow label="Notes" value={tripDetailModal.notes} c={c} /> : null}

                {tripDetailModal.passengers?.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Passenger List</Text>
                    {tripDetailModal.passengers.map((p, i) => (
                      <View key={p.id || i} style={[styles.paxCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <View style={[styles.paxNum, { backgroundColor: GOLD_LIGHT }]}>
                          <Text style={styles.paxNumText}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.paxName, { color: c.text }]}>{p.name || 'Unnamed'}</Text>
                          <Text style={[styles.paxMeta, { color: c.textMuted }]}>
                            {p.destination ? `To: ${p.destination}` : ''}{p.contactNumber ? ` · ${p.contactNumber}` : ''}
                          </Text>
                        </View>
                        <Text style={{ color: GOLD, fontWeight: '800' }}>R{(p.fareAmount || 0).toFixed(2)}</Text>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            )}
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

function DetailRow({ label, value, c, gold }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: gold ? GOLD : c.text }]}>{value}</Text>
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

  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: GOLD },
  tabText: { fontSize: 12, fontWeight: '800' },

  body: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 10, fontWeight: '700', marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 2 },
  row: { flexDirection: 'row', gap: 10 },

  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 6 },
  pickerText: { flex: 1, fontSize: 14 },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },

  paxCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6, gap: 10 },
  paxNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  paxNumText: { fontSize: 12, fontWeight: '900', color: GOLD },
  paxName: { fontSize: 14, fontWeight: '700' },
  paxMeta: { fontSize: 11, marginTop: 2 },

  summaryCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, fontWeight: '600' },
  summaryVal: { fontSize: 15, fontWeight: '900' },

  primaryBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: '#000' },

  historyCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', gap: 10 },
  historyTitle: { fontSize: 14, fontWeight: '800' },
  historyMeta: { fontSize: 11, marginTop: 2 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },

  revSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  revCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  revCardVal: { fontSize: 18, fontWeight: '900' },
  revCardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  barRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6, gap: 8 },
  barLabel: { width: 80, fontSize: 11, fontWeight: '700' },
  barTrack: { flex: 1, height: 8, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: GOLD, borderRadius: 4 },
  barVal: { width: 60, textAlign: 'right', fontSize: 12, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, marginTop: 8 },

  destChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontSize: 17, fontWeight: '900' },
  modalBody: { padding: 16, paddingBottom: 40 },

  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  listItemTitle: { fontSize: 14, fontWeight: '700' },
  listItemSub: { fontSize: 11, marginTop: 2 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  detailLabel: { fontSize: 13, fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
});
