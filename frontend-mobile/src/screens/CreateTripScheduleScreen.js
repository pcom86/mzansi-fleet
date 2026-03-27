import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, Modal, Platform, FlatList, RefreshControl,
  Animated, Easing, Vibration, Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { completeTrip, updateTrip, fetchTripPassengers } from '../api/taxiRanks';
import client from '../api/client';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const GREEN_LIGHT = 'rgba(25,135,84,0.12)';
const RED = '#dc3545';
const RED_LIGHT = 'rgba(220,53,69,0.10)';
const BLUE = '#0d6efd';
const BLUE_LIGHT = 'rgba(13,110,253,0.10)';
const PURPLE = '#6f42c1';
const DARK = '#1a1a2e';

const STATUS_MAP = {
  Loading:   { color: GOLD,      bg: GOLD_LIGHT,                icon: 'time-outline',            label: 'Loading' },
  Departed:  { color: BLUE,      bg: BLUE_LIGHT,                icon: 'navigate-outline',        label: 'Departed' },
  InTransit: { color: PURPLE,    bg: 'rgba(111,66,193,0.12)',   icon: 'swap-horizontal-outline', label: 'In Transit' },
  Arrived:   { color: GREEN,     bg: GREEN_LIGHT,               icon: 'flag-outline',            label: 'Arrived' },
  Completed: { color: '#0c5460', bg: 'rgba(209,236,241,0.5)',   icon: 'checkmark-done-outline',  label: 'Completed' },
  Cancelled: { color: RED,       bg: RED_LIGHT,                 icon: 'close-circle-outline',    label: 'Cancelled' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'Loading', label: 'Loading' },
  { key: 'Departed', label: 'Departed' },
  { key: 'Completed', label: 'Done' },
];

export default function CreateTripScheduleScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const [taxiRanks, setTaxiRanks] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [displayVehicles, setDisplayVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [vehicleRouteAssignments, setVehicleRouteAssignments] = useState([]);
  const [marshals, setMarshals] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedTaxiRankId, setSelectedTaxiRankId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedMarshalId, setSelectedMarshalId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [departureTime, setDepartureTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editVehicleId, setEditVehicleId] = useState('');
  const [editDriverId, setEditDriverId] = useState('');
  const [editMarshalId, setEditMarshalId] = useState('');
  const [editDepartureTime, setEditDepartureTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [detailTrip, setDetailTrip] = useState(null);
  const [detailPassengers, setDetailPassengers] = useState([]);
  const [loadingPax, setLoadingPax] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const [paxFormVisible, setPaxFormVisible] = useState(false);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerFrom, setPassengerFrom] = useState('');
  const [passengerTo, setPassengerTo] = useState('');
  const [passengerAmount, setPassengerAmount] = useState('');
  const [passengerPayment, setPassengerPayment] = useState('Cash');
  const [passengerSeat, setPassengerSeat] = useState('');
  const [tripStops, setTripStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [stopModalVisible, setStopModalVisible] = useState(false);

  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [cardStatus, setCardStatus] = useState('idle');
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardTxnRef, setCardTxnRef] = useState('');
  const [nfcSupported, setNfcSupported] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanTimeout = useRef(null);

  const [pickerCtx, setPickerCtx] = useState('create');
  const [taxiRankPicker, setTaxiRankPicker] = useState(false);
  const [routePicker, setRoutePicker] = useState(false);
  const [vehiclePicker, setVehiclePicker] = useState(false);
  const [driverPicker, setDriverPicker] = useState(false);
  const [marshalPicker, setMarshalPicker] = useState(false);
  const [datePicker, setDatePicker] = useState(false);
  const [timePicker, setTimePicker] = useState(false);
  const [editTimePicker, setEditTimePicker] = useState(false);
  const [timePickerDate, setTimePickerDate] = useState(new Date());
  const [deleteModal, setDeleteModal] = useState(false);

  const normalizeRouteDeparture = (route) => route?.departureStation ?? route?.DepartureStation ?? route?.origin ?? route?.Origin ?? route?.routeOrigin ?? route?.RouteOrigin ?? '';
  const normalizeRouteDestination = (route) => route?.destinationStation ?? route?.DestinationStation ?? route?.destination ?? route?.Destination ?? route?.routeDestination ?? route?.RouteDestination ?? '';
  const normalizeTripDeparture = (trip) => trip?.departureStation ?? trip?.DepartureStation ?? trip?.origin ?? trip?.Origin ?? '';
  const normalizeTripDestination = (trip) => trip?.destinationStation ?? trip?.DestinationStation ?? trip?.destination ?? trip?.Destination ?? '';
  const normalizeRouteStops = (route) => {
    const rawStops = route?.stops ?? route?.Stops ?? route?.routeStops ?? route?.RouteStops;
    if (!Array.isArray(rawStops)) return [];
    return rawStops;
  };

  const getStopsFromRoute = (route) => {
    const rawStops = normalizeRouteStops(route);
    const mapped = (rawStops || []).map((stop, idx) => {
      const name = stop?.stopName ?? stop?.StopName ?? stop?.name ?? stop?.Name ?? `${idx + 1}`;
      const order = stop?.stopOrder ?? stop?.StopOrder ?? stop?.order ?? stop?.Order ?? (idx + 1);
      const fare = stop?.fareFromOrigin ?? stop?.FareFromOrigin ?? stop?.fare ?? 0;
      const mins = stop?.estimatedMinutesFromDeparture ?? stop?.EstimatedMinutesFromDeparture ?? 0;
      return { id: name, name, fare, order, mins };
    });
    return mapped.sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const [tripToDelete, setTripToDelete] = useState(null);

  // DATA LOADING
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?.userId || user?.id;
      if (!userId) return;
      let adminProfile = null;
      const isMarshal = (user.role || '').toLowerCase() === 'taximarshal';
      if (!isMarshal) {
        try { const r = await client.get(`/TaxiRankAdmin/user/${userId}`); adminProfile = r.data; } catch (_) {}
      }
      setAdmin(adminProfile);
      const [rankR, tripsR, vraR, driverR, marshalR] = await Promise.all([
        client.get('/TaxiRanks').catch(() => ({ data: [] })),
        client.get('/TaxiRankTrips').catch(() => ({ data: [] })),
        client.get('/VehicleRouteAssignments').catch(() => ({ data: [] })),
        client.get('/Drivers').catch(() => ({ data: [] })),
        client.get('/TaxiRankUsers/marshals').catch(() => ({ data: [] })),
      ]);
      setTaxiRanks(rankR.data || []);
      setVehicleRouteAssignments((vraR.data || []).filter(a => a.isActive));
      setMarshals(marshalR.data || []);
      setTrips(tripsR.data || []);
      setDrivers((driverR.data || []).map(d => ({
        id: d.id,
        name: d.name || `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim() || 'Unknown',
        assignedVehicleId: d.assignedVehicleId || null,
      })));
      const rankId = adminProfile?.taxiRankId || (rankR.data?.length > 0 ? rankR.data[0].id : '');
      if (rankId) setSelectedTaxiRankId(rankId);
    } catch (err) { console.warn('Load error:', err?.message); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (selectedTaxiRankId) { loadTrips(); loadRoutes(selectedTaxiRankId); } }, [selectedTaxiRankId]);

  async function loadTrips(silent) {
    try {
      if (!silent) setRefreshing(true);
      const url = admin?.tenantId ? `/TaxiRankTrips?tenantId=${admin.tenantId}` : '/TaxiRankTrips';
      const r = await client.get(url);
      const all = r.data || [];
      setTrips(selectedTaxiRankId ? all.filter(t => t.taxiRankId === selectedTaxiRankId) : all);
    } catch (e) { console.warn('Load trips:', e?.message); }
    finally { setRefreshing(false); }
  }
  async function loadRoutes(rankId) {
    if (!rankId) return;
    try { const r = await client.get(`/Routes?taxiRankId=${rankId}`); setRoutes(r.data || []); } catch (_) { setRoutes([]); }
  }
  function loadVehiclesForRoute(routeId) {
    const route = routes.find(r => r.id === routeId);
    if (route?.vehicles?.length) { setDisplayVehicles(route.vehicles); return; }
    const assigned = vehicleRouteAssignments.filter(a => a.routeId === routeId && a.isActive).map(a => a.vehicle).filter(Boolean);
    if (assigned.length) { setDisplayVehicles(assigned); return; }
    client.get('/Vehicles').then(r => setDisplayVehicles(r.data || [])).catch(() => setDisplayVehicles([]));
  }

  // NFC
  useEffect(() => {
    (async () => { try { const ok = await NfcManager.isSupported(); setNfcSupported(ok); if (ok) await NfcManager.start(); } catch (_) { setNfcSupported(false); } })();
    return () => { NfcManager.cancelTechnologyRequest().catch(() => {}); };
  }, []);
  function startPulse() {
    pulseAnim.setValue(1);
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }
  function genRef() { const ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let r = 'TXN-'; for (let i = 0; i < 8; i++) r += ch.charAt(Math.floor(Math.random() * ch.length)); return r; }
  async function initiateCardPayment() {
    const amt = parseFloat(passengerAmount);
    if (!amt || amt <= 0) { Alert.alert('Validation', 'Enter a valid fare amount first.'); return; }
    setCardStatus('scanning'); setCardLastFour(''); setCardTxnRef(''); setCardModalVisible(true); startPulse();
    if (!nfcSupported) { scanTimeout.current = setTimeout(() => { Alert.alert('NFC Not Available', 'Record as manual?', [{ text: 'Cancel', style: 'cancel', onPress: cancelCard }, { text: 'Manual', onPress: manualCard }]); }, 2000); return; }
    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep, { alertMessage: 'Hold card near device' });
      const tag = await NfcManager.getTag(); Vibration.vibrate(200);
      let last4 = '****'; if (tag?.id) { const s = tag.id.replace(/[^0-9A-Fa-f]/g, ''); last4 = s.slice(-4).toUpperCase() || '****'; }
      setCardLastFour(last4); setCardTxnRef(genRef()); setCardStatus('success'); pulseAnim.stopAnimation();
    } catch (e) { if (e?.message !== 'cancelled') { setCardStatus('failed'); pulseAnim.stopAnimation(); } else cancelCard(); }
    finally { NfcManager.cancelTechnologyRequest().catch(() => {}); }
  }
  function manualCard() { Vibration.vibrate(100); setCardLastFour('MANUAL'); setCardTxnRef(genRef()); setCardStatus('success'); pulseAnim.stopAnimation(); }
  function cancelCard() { if (scanTimeout.current) clearTimeout(scanTimeout.current); NfcManager.cancelTechnologyRequest().catch(() => {}); setCardStatus('idle'); setCardLastFour(''); setCardTxnRef(''); setCardModalVisible(false); pulseAnim.stopAnimation(); }
  function confirmCard() { 
    setCardModalVisible(false); 
    // Auto-submit passenger form after successful card payment
    setTimeout(() => submitPax(), 500);
  }
  function retryCard() { setCardStatus('idle'); initiateCardPayment(); }

  // COMPUTED
  const filteredTrips = useMemo(() => {
    let r = [...trips];
    if (statusFilter === 'today') { const td = new Date().toDateString(); r = r.filter(t => t.departureTime && new Date(t.departureTime).toDateString() === td); }
    else if (statusFilter !== 'all') r = r.filter(t => t.status === statusFilter);
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); r = r.filter(t => (t.departureStation||'').toLowerCase().includes(q) || (t.destinationStation||'').toLowerCase().includes(q) || (t.vehicle?.registration||'').toLowerCase().includes(q) || (t.driver?.name||'').toLowerCase().includes(q)); }
    return r;
  }, [trips, statusFilter, searchQuery]);

  const { groupedTrips, tripDates } = useMemo(() => {
    const g = {};
    filteredTrips.forEach(t => { if (t.departureTime) { const d = new Date(t.departureTime).toDateString(); if (!g[d]) g[d] = []; g[d].push(t); } });
    Object.values(g).forEach(arr => arr.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime)));
    return { groupedTrips: g, tripDates: Object.keys(g).sort((a, b) => new Date(b) - new Date(a)) };
  }, [filteredTrips]);

  const stats = useMemo(() => {
    const td = new Date().toDateString();
    const todayT = trips.filter(t => t.departureTime && new Date(t.departureTime).toDateString() === td);
    return { total: trips.length, today: todayT.length, active: trips.filter(t => ['Loading','Departed','InTransit'].includes(t.status)).length, completed: trips.filter(t => t.status === 'Completed').length, earnings: trips.reduce((s, t) => s + (t.totalAmount || 0), 0) };
  }, [trips]);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const inp = [S.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }];
  function fmt(iso) { if (!iso) return '--:--'; return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }); }
  function fmtDate(ds) { const d = new Date(ds); return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}, ${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`; }
  function isToday(ds) { return new Date(ds).toDateString() === new Date().toDateString(); }

  // CREATE / EDIT / DELETE
  function selectTaxiRank(rank) { setSelectedTaxiRankId(rank.id); setSelectedRouteId(''); setSelectedVehicleId(''); setSelectedDriverId(''); setSelectedMarshalId(''); setTaxiRankPicker(false); loadRoutes(rank.id); }
  function selectRoute(route) { setSelectedRouteId(route.id); setSelectedVehicleId(''); setSelectedDriverId(''); setRoutePicker(false); loadVehiclesForRoute(route.id); }
  function selectVehicle(v) { if (pickerCtx==='edit') setEditVehicleId(v.id); else setSelectedVehicleId(v.id); const d = drivers.find(dr => dr.assignedVehicleId === v.id); if (d) { if (pickerCtx==='edit') setEditDriverId(d.id); else setSelectedDriverId(d.id); } setVehiclePicker(false); }
  function selectDriver(d) { if (pickerCtx==='edit') setEditDriverId(d.id); else setSelectedDriverId(d.id); setDriverPicker(false); }
  function selectMarshal(m) { if (pickerCtx==='edit') setEditMarshalId(m.id); else setSelectedMarshalId(m.id); setMarshalPicker(false); }

  async function handleCreate() {
    if (!selectedTaxiRankId) return Alert.alert('Required','Select a taxi rank');
    if (!selectedRoute) return Alert.alert('Required','Select a route');
    if (!selectedVehicleId) return Alert.alert('Required','Select a vehicle');
    if (!selectedDriverId) return Alert.alert('Required','Select a driver');
    if (!admin) return Alert.alert('Error','Admin profile not loaded');
    setSubmitting(true);
    try {
      const dt = new Date(scheduledDate); const [h,m] = departureTime.split(':').map(Number); dt.setHours(h||8,m||0,0,0);
      await client.post('/TaxiRankTrips', { tenantId: admin.tenantId, vehicleId: selectedVehicleId, driverId: selectedDriverId, marshalId: selectedMarshalId||null, taxiRankId: selectedTaxiRankId, departureStation: selectedRoute.departureStation||'', destinationStation: selectedRoute.destinationStation||'', departureTime: dt.toISOString(), notes: notes.trim()||`Trip: ${selectedRoute.routeName||selectedRoute.name}` });
      Alert.alert('Success','Trip created!'); setSelectedRouteId(''); setSelectedVehicleId(''); setSelectedDriverId(''); setSelectedMarshalId(''); setNotes(''); setCreateModalVisible(false); loadTrips();
    } catch (e) { Alert.alert('Error', e?.response?.data?.message||e?.message||'Failed'); } finally { setSubmitting(false); }
  }
  function openEdit(trip) { setEditingTrip(trip); setEditVehicleId(trip.vehicleId||''); setEditDriverId(trip.driverId||''); setEditMarshalId(trip.marshalId||''); setEditDepartureTime(trip.departureTime?fmt(trip.departureTime):'08:00'); setEditNotes(trip.notes||''); setEditStatus(trip.status||'Loading'); setDetailTrip(null); setEditModalVisible(true); }
  async function handleSaveEdit() {
    if (!editingTrip) return; setSavingEdit(true);
    try {
      const u = {};
      if (editVehicleId && editVehicleId !== editingTrip.vehicleId) u.vehicleId = editVehicleId;
      if (editDriverId && editDriverId !== editingTrip.driverId) u.driverId = editDriverId;
      if (editMarshalId !== (editingTrip.marshalId||'')) u.marshalId = editMarshalId||null;
      if (editStatus !== editingTrip.status) u.status = editStatus;
      if (editNotes !== (editingTrip.notes||'')) u.notes = editNotes;
      await updateTrip(editingTrip.id, u); Alert.alert('Success','Trip updated'); setEditModalVisible(false); setEditingTrip(null); loadTrips();
    } catch (e) { Alert.alert('Error', e?.response?.data?.message||e?.message||'Failed'); } finally { setSavingEdit(false); }
  }
  function askDelete(trip) { setTripToDelete(trip); setDeleteModal(true); setDetailTrip(null); }
  async function doDelete() { if (!tripToDelete) return; try { await client.delete(`/TaxiRankTrips/${tripToDelete.id}`); setDeleteModal(false); setTripToDelete(null); Alert.alert('Deleted','Trip removed'); loadTrips(); } catch (e) { Alert.alert('Error', e?.message||'Failed'); setDeleteModal(false); setTripToDelete(null); } }

  // TRIP DETAIL + COMPLETE
  async function openDetail(trip) { setDetailTrip(trip); setCompletionNotes(''); setDetailPassengers([]); setLoadingPax(true); try { const r = await fetchTripPassengers(trip.id); setDetailPassengers(r.data||r||[]); } catch (_) {} finally { setLoadingPax(false); } }
  async function handleComplete() {
    if (!detailTrip) return;
    const pax = detailPassengers.length||detailTrip.passengerCount||0;
    const total = detailPassengers.reduce((s,p) => s+(p.amount||0), 0)||detailTrip.totalAmount||0;
    Alert.alert('Complete Trip?', `${detailTrip.departureStation} → ${detailTrip.destinationStation}\n${pax} passengers · R${total.toFixed(2)}\n\nRecords earnings & notifies owner.`,
      [{ text:'Cancel', style:'cancel' }, { text:'Complete', onPress: async () => { setCompleting(true); try { const res = await completeTrip(detailTrip.id, completionNotes); Alert.alert('Completed!', `R${(res.totalEarnings||total).toFixed(2)} recorded.`, [{ text:'OK', onPress:() => { setDetailTrip(null); loadTrips(); } }]); } catch (e) { Alert.alert('Error', e?.response?.data?.message||e?.message||'Failed'); } finally { setCompleting(false); } }}]);
  }

  // PASSENGER CAPTURE
  async function openPaxForm() {
    if (!detailTrip) return;
    setPassengerName(''); setPassengerPhone(''); setPassengerAmount(''); setPassengerPayment('Cash'); setPassengerSeat('');
    setPassengerFrom(normalizeTripDeparture(detailTrip)); setPassengerTo(normalizeTripDestination(detailTrip));
    setCardStatus('idle'); setCardLastFour(''); setCardTxnRef(''); setSelectedStop(null);

    let route = detailTrip.route ?? detailTrip.Route;
    if (!route) {
      route = routes.find(r => r.id === detailTrip.routeId || r.id === detailTrip.RouteId);
    }
    if (!route) {
      route = routes.find(r =>
        normalizeRouteDeparture(r) === normalizeTripDeparture(detailTrip) &&
        normalizeRouteDestination(r) === normalizeTripDestination(detailTrip)
      );
    }

    let allStops = getStopsFromRoute(route || {});

    if (!allStops.length && detailTrip.taxiRankId) {
      try {
        const resp = await client.get(`/Routes?taxiRankId=${detailTrip.taxiRankId}`);
        const fetchedRoutes = resp.data || [];
        const matches = fetchedRoutes.filter(r =>
          normalizeRouteDeparture(r) === normalizeTripDeparture(detailTrip) &&
          normalizeRouteDestination(r) === normalizeTripDestination(detailTrip)
        );
        if (matches.length > 0) {
          route = matches[0];
          allStops = getStopsFromRoute(route);
        }
      } catch (_) {}
    }

    // Add final destination stop if present
    const finalDestination = normalizeTripDestination(detailTrip) || normalizeRouteDestination(route || {});
    const finalFare = route?.standardFare ?? route?.StandardFare ?? route?.fare ?? 0;
    if (finalDestination) {
      const hasFinal = allStops.some(s => s.name === finalDestination);
      if (!hasFinal) {
        allStops.push({ id: '__dest__', name: finalDestination, fare: finalFare, order: 999, mins: route?.expectedDurationMinutes ?? route?.ExpectedDurationMinutes ?? 0 });
      }
    }

    setTripStops(allStops);
    setPaxFormVisible(true);
  }
  function selectStopItem(stop) { setSelectedStop(stop); setPassengerTo(stop.name); setPassengerAmount(stop.fare!=null?String(stop.fare):''); setStopModalVisible(false); }
  async function submitPax() {
    if (!detailTrip) return;
    if (!passengerName.trim()) return Alert.alert('Required','Enter passenger name');
    if (!passengerPhone.trim()) return Alert.alert('Required','Enter phone number');
    if (!passengerAmount.trim()) return Alert.alert('Required','Enter fare amount');
    if (passengerPayment==='Card' && cardStatus!=='success') return Alert.alert('Card Required','Process card payment first');
    const payNotes = passengerPayment==='Card' && cardTxnRef ? `Card: ref ${cardTxnRef}, ending ${cardLastFour}` : '';
    try {
      await client.post(`/TaxiRankTrips/${detailTrip.id}/passengers`, { passengerName: passengerName.trim(), passengerPhone: passengerPhone.trim(), departureStation: passengerFrom.trim(), arrivalStation: passengerTo.trim(), amount: parseFloat(passengerAmount)||0, paymentMethod: passengerPayment, seatNumber: passengerSeat?parseInt(passengerSeat):null, notes: payNotes });
      Alert.alert('Added','Passenger recorded'); setPaxFormVisible(false); setCardStatus('idle'); setCardLastFour(''); setCardTxnRef('');
      const r = await fetchTripPassengers(detailTrip.id); setDetailPassengers(r.data||r||[]); loadTrips(true);
    } catch (e) { Alert.alert('Error', e?.response?.data?.message||e?.message||'Failed'); }
  }
  async function removePax(paxId) {
    if (!detailTrip) return;
    Alert.alert('Remove?','This cannot be undone.', [{ text:'Cancel', style:'cancel' }, { text:'Remove', style:'destructive', onPress: async () => { try { await client.delete(`/TaxiRankTrips/${detailTrip.id}/passengers/${paxId}`); const r = await fetchTripPassengers(detailTrip.id); setDetailPassengers(r.data||r||[]); loadTrips(true); } catch (e) { Alert.alert('Error', e?.message||'Failed'); } } }]);
  }

  const onTimeChange = (ev,d) => { if (ev.type==='set' && d) setDepartureTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`); setTimePicker(false); };
  const onDateChange = (ev,d) => { if (ev.type==='set' && d) setScheduledDate(d); setDatePicker(false); };
  const onEditTimeChange = (ev,d) => { if (ev.type==='set' && d) setEditDepartureTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`); setEditTimePicker(false); };


  if (loading) return (
    <View style={[S.center, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={GOLD} />
      <Text style={{ color: c.textMuted, marginTop: 12, fontSize: 13 }}>Loading trip data...</Text>
    </View>
  );

  const listData = tripDates.flatMap(d => [
    { type: 'header', date: d },
    ...(groupedTrips[d] || []).map(t => ({ type: 'trip', data: t })),
  ]);

  return (
    <View style={[S.root, { backgroundColor: c.background }]}>
      {/* HEADER */}
      <View style={[S.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>Trip Management</Text>
          <Text style={S.headerSub}>{taxiRanks.find(r => r.id === selectedTaxiRankId)?.name || 'All Ranks'}</Text>
        </View>
        <TouchableOpacity onPress={() => { setPickerCtx('create'); setCreateModalVisible(true); }} style={S.headerAddBtn}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={S.headerAddText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* STATS */}
      <View style={[S.statsRow, { backgroundColor: c.surface, borderColor: c.border }]}>
        {[{ label:'Today', value:stats.today, color:BLUE }, { label:'Active', value:stats.active, color:GOLD }, { label:'Done', value:stats.completed, color:GREEN }, { label:'Earnings', value:`R${stats.earnings}`, color:GOLD }].map(s => (
          <View key={s.label} style={S.statPill}>
            <Text style={[S.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[S.statLabel, { color: c.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* FILTERS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
        {FILTERS.map(f => { const on = statusFilter === f.key; return (
          <TouchableOpacity key={f.key} style={[S.filterTab, { backgroundColor: on ? GOLD : c.surface, borderColor: on ? GOLD : c.border }]} onPress={() => setStatusFilter(f.key)}>
            <Text style={[S.filterText, { color: on ? '#000' : c.text }]}>{f.label}</Text>
          </TouchableOpacity>
        ); })}
      </ScrollView>

      {/* SEARCH */}
      <View style={[S.searchRow, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Ionicons name="search-outline" size={16} color={c.textMuted} />
        <TextInput value={searchQuery} onChangeText={setSearchQuery} style={[S.searchInput, { color: c.text }]} placeholder="Search route, vehicle..." placeholderTextColor={c.textMuted} />
        {!!searchQuery && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={16} color={c.textMuted} /></TouchableOpacity>}
      </View>

      {/* TRIP LIST */}
      <FlatList
        data={listData}
        keyExtractor={(item, i) => item.type === 'trip' ? item.data.id : `h-${i}`}
        contentContainerStyle={S.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTrips()} tintColor={GOLD} colors={[GOLD]} />}
        ListEmptyComponent={
          <View style={S.emptyWrap}>
            <View style={[S.emptyIcon, { backgroundColor: GOLD_LIGHT }]}><Ionicons name="calendar-outline" size={40} color={GOLD} /></View>
            <Text style={[S.emptyTitle, { color: c.text }]}>No Trips Found</Text>
            <Text style={[S.emptySub, { color: c.textMuted }]}>{statusFilter !== 'all' ? 'Change filter or tap ' : 'Tap '}"New" to schedule a trip.</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            const today = isToday(item.date);
            return (
              <View style={S.dateRow}>
                {today && <View style={[S.todayDot, { backgroundColor: GOLD }]} />}
                <Text style={[S.dateText, { color: today ? GOLD : c.text }]}>{today ? 'Today' : fmtDate(item.date)}</Text>
                <Text style={[S.dateCount, { color: c.textMuted }]}>{(groupedTrips[item.date]||[]).length}</Text>
                <View style={[S.dateLine, { backgroundColor: c.border }]} />
              </View>
            );
          }
          const trip = item.data;
          const sc = STATUS_MAP[trip.status] || STATUS_MAP.Loading;
          const pax = trip.passengerCount || 0;
          const amt = trip.totalAmount || 0;
          return (
            <TouchableOpacity style={[S.card, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => openDetail(trip)} activeOpacity={0.8}>
              <View style={[S.cardAccent, { backgroundColor: sc.color }]} />
              <View style={S.cardBody}>
                <View style={S.cardTop}>
                  <View style={[S.badge, { backgroundColor: sc.bg }]}>
                    <Ionicons name={sc.icon} size={11} color={sc.color} />
                    <Text style={[S.badgeText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                  <Text style={[S.cardTime, { color: c.textMuted }]}>{fmt(trip.departureTime)}</Text>
                </View>
                <View style={S.routeRow}>
                  <View style={S.routeDots}>
                    <View style={[S.dot, { backgroundColor: GOLD }]} />
                    <View style={[S.dotLine, { backgroundColor: c.border }]} />
                    <View style={[S.dot, { backgroundColor: GREEN }]} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[S.stationText, { color: c.text }]} numberOfLines={1}>{trip.departureStation || '-'}</Text>
                    <Text style={[S.stationText, { color: c.text, marginTop: 8 }]} numberOfLines={1}>{trip.destinationStation || '-'}</Text>
                  </View>
                </View>
                <View style={S.cardMeta}>
                  <View style={S.chip}><Ionicons name="bus-outline" size={11} color={c.textMuted} /><Text style={[S.chipText, { color: c.textMuted }]}>{trip.vehicle?.registration || '-'}</Text></View>
                  <View style={S.chip}><Ionicons name="people-outline" size={11} color={c.textMuted} /><Text style={[S.chipText, { color: c.textMuted }]}>{pax}</Text></View>
                  {amt > 0 && <View style={S.chip}><Ionicons name="cash-outline" size={11} color={GOLD} /><Text style={[S.chipText, { color: GOLD, fontWeight: '800' }]}>R{amt}</Text></View>}
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} style={{ marginLeft: 'auto' }} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={S.fab} onPress={() => { setPickerCtx('create'); setCreateModalVisible(true); }} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>

      {/* TRIP DETAIL MODAL */}
      <Modal visible={!!detailTrip} animationType="slide" transparent onRequestClose={() => !completing && setDetailTrip(null)}>
        <View style={S.overlay}>
          <View style={[S.sheet, { backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <SheetHeader title="Trip Details" onClose={() => !completing && setDetailTrip(null)} c={c} />
            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {detailTrip && (() => {
                const sc = STATUS_MAP[detailTrip.status] || STATUS_MAP.Loading;
                const done = detailTrip.status === 'Completed' || detailTrip.status === 'Cancelled';
                const cashPax = detailPassengers.filter(p => (p.paymentMethod||'Cash')==='Cash');
                const cardPaxList = detailPassengers.filter(p => (p.paymentMethod||'Cash')==='Card');
                const cashTotal = cashPax.reduce((s,p) => s+(p.amount||0), 0);
                const cardTotal = cardPaxList.reduce((s,p) => s+(p.amount||0), 0);
                const totalFare = detailPassengers.reduce((s,p) => s+(p.amount||0), 0) || detailTrip.totalAmount || 0;

                return (<>
                  {/* Route Card */}
                  <View style={[S.detailCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={[S.detailAccent, { backgroundColor: sc.color }]} />
                    <View style={{ flex: 1, padding: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={[S.badge, { backgroundColor: sc.bg }]}>
                          <Ionicons name={sc.icon} size={12} color={sc.color} />
                          <Text style={[S.badgeText, { color: sc.color }]}>{sc.label}</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: c.textMuted }}>{fmt(detailTrip.departureTime)}</Text>
                      </View>
                      <View style={S.routeRow}>
                        <View style={S.routeDots}>
                          <View style={[S.dot, { backgroundColor: GOLD }]} />
                          <View style={[S.dotLine, { backgroundColor: c.border }]} />
                          <View style={[S.dot, { backgroundColor: GREEN }]} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[S.stationText, { color: c.text, fontSize: 15 }]}>{detailTrip.departureStation}</Text>
                          <Text style={[S.stationText, { color: c.text, fontSize: 15, marginTop: 10 }]}>{detailTrip.destinationStation}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                        <View style={S.chip}><Ionicons name="bus-outline" size={13} color={c.textMuted} /><Text style={{ fontSize: 12, color: c.text, fontWeight: '700' }}>{detailTrip.vehicle?.registration||'-'}</Text></View>
                        <View style={S.chip}><Ionicons name="person-outline" size={13} color={c.textMuted} /><Text style={{ fontSize: 12, color: c.text }}>{detailTrip.driver?.name||'-'}</Text></View>
                      </View>
                    </View>
                  </View>

                  {/* Earnings */}
                  <View style={[S.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[S.secLabel, { color: c.textMuted }]}>EARNINGS</Text>
                    <View style={{ alignItems: 'center', marginVertical: 8 }}>
                      <Text style={{ fontSize: 32, fontWeight: '900', color: GOLD }}>R{totalFare.toFixed(2)}</Text>
                      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{detailPassengers.length} passenger{detailPassengers.length!==1?'s':''}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={[S.splitCard, { backgroundColor: GREEN_LIGHT }]}>
                        <Ionicons name="cash-outline" size={18} color={GREEN} />
                        <Text style={{ fontSize: 10, color: GREEN, fontWeight: '700', marginTop: 4 }}>CASH</Text>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: GREEN }}>R{cashTotal.toFixed(0)}</Text>
                        <Text style={{ fontSize: 10, color: GREEN }}>{cashPax.length} pax</Text>
                      </View>
                      <View style={[S.splitCard, { backgroundColor: BLUE_LIGHT }]}>
                        <Ionicons name="card-outline" size={18} color={BLUE} />
                        <Text style={{ fontSize: 10, color: BLUE, fontWeight: '700', marginTop: 4 }}>CARD</Text>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: BLUE }}>R{cardTotal.toFixed(0)}</Text>
                        <Text style={{ fontSize: 10, color: BLUE }}>{cardPaxList.length} pax</Text>
                      </View>
                    </View>
                  </View>

                  {/* Passengers */}
                  <View style={[S.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={[S.secLabel, { color: c.textMuted }]}>PASSENGERS ({detailPassengers.length})</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {loadingPax && <ActivityIndicator size="small" color={GOLD} />}
                        {!done && <TouchableOpacity onPress={openPaxForm} style={S.addPaxBtn}><Ionicons name="add" size={14} color={GREEN} /><Text style={{ fontSize: 11, fontWeight: '700', color: GREEN }}>Add</Text></TouchableOpacity>}
                      </View>
                    </View>
                    {detailPassengers.length === 0 && !loadingPax ? (
                      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                        <Ionicons name="people-outline" size={28} color={c.textMuted} />
                        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 6 }}>No passengers yet</Text>
                      </View>
                    ) : detailPassengers.map((p, i) => {
                      const isCard = (p.paymentMethod||'Cash')==='Card';
                      return (
                        <View key={p.id||i} style={[S.paxRow, { borderColor: c.border }]}>
                          <View style={[S.paxNum, { backgroundColor: GOLD_LIGHT }]}>
                            <Text style={{ fontSize: 11, fontWeight: '900', color: GOLD }}>{p.seatNumber||i+1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{p.passengerName||'Unnamed'}</Text>
                            {p.arrivalStation ? <Text style={{ fontSize: 10, color: c.textMuted }}>→ {p.arrivalStation}</Text> : null}
                          </View>
                          <View style={[S.payBadge, { backgroundColor: isCard ? BLUE_LIGHT : GOLD_LIGHT }]}>
                            <Ionicons name={isCard?'card-outline':'cash-outline'} size={10} color={isCard?BLUE:'#b8860b'} />
                            <Text style={{ fontSize: 9, fontWeight: '700', color: isCard?BLUE:'#b8860b' }}>{p.paymentMethod||'Cash'}</Text>
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: c.text, marginLeft: 6 }}>R{p.amount||0}</Text>
                          {!done && <TouchableOpacity onPress={() => removePax(p.id)} style={{ marginLeft: 4, padding: 4 }}><Ionicons name="close-circle-outline" size={16} color={RED} /></TouchableOpacity>}
                        </View>
                      );
                    })}
                  </View>

                  {/* Completion Notes */}
                  {!done && (
                    <View style={[S.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <Text style={[S.secLabel, { color: c.textMuted, marginBottom: 8 }]}>COMPLETION NOTES</Text>
                      <TextInput value={completionNotes} onChangeText={setCompletionNotes} style={[S.input, { backgroundColor: c.background, borderColor: c.border, color: c.text, minHeight: 54 }]} placeholder="e.g. Trip arrived on time" placeholderTextColor={c.textMuted} multiline />
                    </View>
                  )}

                  {!done && (
                    <View style={[S.infoBar, { backgroundColor: BLUE_LIGHT, borderColor: 'rgba(13,110,253,0.2)' }]}>
                      <Ionicons name="notifications-outline" size={15} color={BLUE} />
                      <Text style={{ fontSize: 11, color: BLUE, flex: 1, marginLeft: 8 }}>Owner will be notified of earnings upon completion.</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={{ gap: 10, marginTop: 4 }}>
                    {!done && (
                      <TouchableOpacity style={[S.actionBtn, { backgroundColor: GOLD }, completing && { opacity: 0.6 }]} onPress={handleComplete} disabled={completing}>
                        {completing ? <ActivityIndicator color="#000" /> : <View style={S.actionRow}><Ionicons name="checkmark-done-outline" size={20} color="#000" /><Text style={S.actionBtnText}>Complete Trip & Record Earnings</Text></View>}
                      </TouchableOpacity>
                    )}
                    {!done && (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[S.actionBtnSec, { borderColor: GOLD, flex: 1 }]} onPress={() => openEdit(detailTrip)}><Ionicons name="create-outline" size={16} color={GOLD} /><Text style={{ fontSize: 13, fontWeight: '700', color: GOLD }}>Edit</Text></TouchableOpacity>
                        <TouchableOpacity style={[S.actionBtnSec, { borderColor: RED, flex: 1 }]} onPress={() => askDelete(detailTrip)}><Ionicons name="trash-outline" size={16} color={RED} /><Text style={{ fontSize: 13, fontWeight: '700', color: RED }}>Delete</Text></TouchableOpacity>
                      </View>
                    )}
                    {done && (
                      <View style={[S.infoBar, { backgroundColor: GREEN_LIGHT, borderColor: GREEN }]}>
                        <Ionicons name="checkmark-done-outline" size={16} color={GREEN} />
                        <Text style={{ fontSize: 12, color: GREEN, fontWeight: '700', flex: 1, marginLeft: 8 }}>This trip is {detailTrip.status.toLowerCase()}.</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ height: 16 }} />
                </>);
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Remaining modals rendered via renderModals below */}
      {renderModals()}
    </View>
  );

  // All remaining modals grouped
  function renderModals() { return (<>
    {/* CREATE */}
    <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => !submitting && setCreateModalVisible(false)}>
      <View style={S.overlay}><View style={[S.sheet, { backgroundColor: c.background }]}>
        <SheetHeader title="New Trip" onClose={() => !submitting && setCreateModalVisible(false)} c={c} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <PickerField label="TAXI RANK *" icon="location-outline" value={selectedTaxiRankId?(taxiRanks.find(r=>r.id===selectedTaxiRankId)?.name):null} placeholder="Select taxi rank" onPress={()=>{setPickerCtx('create');setTaxiRankPicker(true);}} c={c} />
          <PickerField label="ROUTE *" icon="git-branch-outline" value={selectedRouteId?(routes.find(r=>r.id===selectedRouteId)?.routeName||routes.find(r=>r.id===selectedRouteId)?.name):null} placeholder="Select route" onPress={()=>{setPickerCtx('create');setRoutePicker(true);}} c={c} />
          <PickerField label="VEHICLE *" icon="bus-outline" value={selectedVehicleId?(displayVehicles.find(v=>v.id===selectedVehicleId)?.registration):null} placeholder="Select vehicle" onPress={()=>{setPickerCtx('create');setVehiclePicker(true);}} c={c} />
          <PickerField label="DRIVER *" icon="person-outline" value={selectedDriverId?(drivers.find(d=>d.id===selectedDriverId)?.name):null} placeholder="Select driver" onPress={()=>{setPickerCtx('create');setDriverPicker(true);}} c={c} />
          <PickerField label="MARSHAL" icon="shield-outline" value={selectedMarshalId?(marshals.find(m=>m.id===selectedMarshalId)?.fullName):null} placeholder="Optional" onPress={()=>{setPickerCtx('create');setMarshalPicker(true);}} c={c} />
          <Text style={[S.label, { color: c.textMuted }]}>DATE & TIME</Text>
          <View style={S.row}>
            <TouchableOpacity style={[inp,{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}]} onPress={()=>setDatePicker(true)}>
              <Text style={{color:c.text}}>{scheduledDate.toLocaleDateString()}</Text><Ionicons name="calendar-outline" size={16} color={c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[inp,{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}]} onPress={()=>{const[h,m]=departureTime.split(':').map(Number);const d=new Date();d.setHours(h,m,0,0);setTimePickerDate(d);setTimePicker(true);}}>
              <Text style={{color:c.text}}>{departureTime}</Text><Ionicons name="time-outline" size={16} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[S.label, { color: c.textMuted }]}>NOTES</Text>
          <TextInput value={notes} onChangeText={setNotes} style={[inp,{minHeight:56}]} placeholder="Optional notes" placeholderTextColor={c.textMuted} multiline />
          <TouchableOpacity style={[S.actionBtn,{backgroundColor:GOLD,marginTop:16},submitting&&{opacity:0.6}]} onPress={handleCreate} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#000" /> : <View style={S.actionRow}><Ionicons name="checkmark-circle-outline" size={20} color="#000" /><Text style={S.actionBtnText}>Create Trip</Text></View>}
          </TouchableOpacity>
        </ScrollView>
      </View></View>
    </Modal>

    {/* EDIT */}
    <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => !savingEdit && setEditModalVisible(false)}>
      <View style={S.overlay}><View style={[S.sheet, { backgroundColor: c.background }]}>
        <SheetHeader title="Edit Trip" onClose={() => !savingEdit && setEditModalVisible(false)} c={c} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <PickerField label="VEHICLE" icon="bus-outline" value={editVehicleId?(displayVehicles.find(v=>v.id===editVehicleId)?.registration):null} placeholder="Select" onPress={()=>{setPickerCtx('edit');setVehiclePicker(true);}} c={c} />
          <PickerField label="DRIVER" icon="person-outline" value={editDriverId?(drivers.find(d=>d.id===editDriverId)?.name):null} placeholder="Select" onPress={()=>{setPickerCtx('edit');setDriverPicker(true);}} c={c} />
          <PickerField label="MARSHAL" icon="shield-outline" value={editMarshalId?(marshals.find(m=>m.id===editMarshalId)?.fullName):null} placeholder="No marshal" onPress={()=>{setPickerCtx('edit');setMarshalPicker(true);}} c={c} />
          <Text style={[S.label, { color: c.textMuted }]}>DEPARTURE TIME</Text>
          <TouchableOpacity style={[inp,{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}]} onPress={()=>{const[h,m]=(editDepartureTime||'08:00').split(':').map(Number);const d=new Date();d.setHours(h,m,0,0);setTimePickerDate(d);setEditTimePicker(true);}}>
            <Text style={{color:c.text}}>{editDepartureTime||'08:00'}</Text><Ionicons name="time-outline" size={16} color={c.textMuted} />
          </TouchableOpacity>
          <Text style={[S.label, { color: c.textMuted }]}>STATUS</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
            {['Loading','Departed','InTransit','Arrived'].map(s => {const sc=STATUS_MAP[s]; return (
              <TouchableOpacity key={s} onPress={()=>setEditStatus(s)} style={[S.statusChip,{backgroundColor:editStatus===s?sc.bg:c.surface,borderColor:editStatus===s?sc.color:c.border}]}>
                <Text style={{fontSize:12,fontWeight:'600',color:editStatus===s?sc.color:c.textMuted}}>{s}</Text>
              </TouchableOpacity>
            );})}
          </View>
          <Text style={[S.label, { color: c.textMuted }]}>NOTES</Text>
          <TextInput value={editNotes} onChangeText={setEditNotes} style={[inp,{minHeight:56}]} placeholder="Notes" placeholderTextColor={c.textMuted} multiline />
          <View style={{flexDirection:'row',gap:12,marginTop:20}}>
            <TouchableOpacity style={[S.actionBtnSec,{borderColor:c.border,flex:1}]} onPress={()=>setEditModalVisible(false)}><Text style={{fontSize:14,fontWeight:'700',color:c.text}}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[S.actionBtn,{backgroundColor:GOLD,flex:1},savingEdit&&{opacity:0.6}]} onPress={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <ActivityIndicator color="#000" /> : <Text style={S.actionBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View></View>
    </Modal>

    {/* ADD PASSENGER */}
    <Modal visible={paxFormVisible} animationType="slide" transparent onRequestClose={()=>setPaxFormVisible(false)}>
      <View style={S.overlay}><View style={[S.sheet, { backgroundColor: c.background }]}>
        <SheetHeader title="Add Passenger" onClose={()=>setPaxFormVisible(false)} c={c} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={[S.label,{color:c.textMuted}]}>NAME *</Text>
          <TextInput value={passengerName} onChangeText={setPassengerName} style={inp} placeholder="Passenger name" placeholderTextColor={c.textMuted} />
          <Text style={[S.label,{color:c.textMuted}]}>PHONE *</Text>
          <TextInput value={passengerPhone} onChangeText={setPassengerPhone} style={inp} placeholder="Phone" placeholderTextColor={c.textMuted} keyboardType="phone-pad" />
          <Text style={[S.label,{color:c.textMuted}]}>ALIGHTING STOP</Text>
          {tripStops.length>0 ? (
            <TouchableOpacity style={[S.picker,{backgroundColor:c.surface,borderColor:selectedStop?GOLD:c.border}]} onPress={()=>setStopModalVisible(true)}>
              <Ionicons name="flag-outline" size={16} color={GOLD} />
              <View style={{flex:1}}>
                <Text style={{fontSize:14,color:selectedStop?c.text:c.textMuted}}>{selectedStop?selectedStop.name:'Select stop'}</Text>
                {selectedStop && <Text style={{color:GOLD,fontSize:11,fontWeight:'600',marginTop:2}}>R{Number(selectedStop.fare).toFixed(2)}{selectedStop.mins?` · ~${selectedStop.mins}min`:''}</Text>}
              </View>
              <Ionicons name="chevron-down" size={14} color={c.textMuted} />
            </TouchableOpacity>
          ) : <TextInput value={passengerTo} onChangeText={setPassengerTo} style={inp} placeholder="Destination" placeholderTextColor={c.textMuted} />}
          <Text style={[S.label,{color:c.textMuted}]}>FARE (R) *</Text>
          <TextInput value={passengerAmount} onChangeText={setPassengerAmount} style={[inp,selectedStop&&{backgroundColor:GOLD_LIGHT}]} placeholder="0.00" placeholderTextColor={c.textMuted} keyboardType="decimal-pad" />
          <Text style={[S.label,{color:c.textMuted}]}>PAYMENT</Text>
          <View style={{flexDirection:'row',gap:10,marginBottom:8}}>
            {['Cash','Card'].map(m => (
              <TouchableOpacity key={m} style={[S.payToggle,{borderColor:passengerPayment===m?GOLD:c.border,backgroundColor:passengerPayment===m?GOLD_LIGHT:c.surface}]} onPress={()=>{setPassengerPayment(m);if(m==='Cash'){setCardStatus('idle');setCardLastFour('');setCardTxnRef('');}}}>
                <Ionicons name={m==='Cash'?'cash-outline':'card-outline'} size={18} color={passengerPayment===m?GOLD:c.textMuted} />
                <Text style={{fontSize:13,fontWeight:passengerPayment===m?'700':'400',color:passengerPayment===m?c.text:c.textMuted,marginTop:2}}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {passengerPayment==='Card' && (
            <View style={{marginBottom:12}}>
              {cardStatus!=='success' ? (
                <TouchableOpacity style={S.posBtn} onPress={initiateCardPayment} activeOpacity={0.8}>
                  <Ionicons name="wifi-outline" size={22} color={GOLD} style={{transform:[{rotate:'90deg'}]}} />
                  <View style={{flex:1}}><Text style={{color:'#fff',fontSize:14,fontWeight:'800'}}>Tap or Insert Card</Text><Text style={{color:'rgba(255,255,255,0.5)',fontSize:10,marginTop:2}}>{nfcSupported?'NFC ready':'Process card'}</Text></View>
                  <Text style={{color:GOLD,fontSize:16,fontWeight:'900'}}>R{parseFloat(passengerAmount||'0').toFixed(2)}</Text>
                </TouchableOpacity>
              ) : (
                <View style={[S.cardOk,{borderColor:GREEN}]}>
                  <View style={S.cardOkIcon}><Ionicons name="checkmark" size={18} color="#fff" /></View>
                  <View style={{flex:1}}><Text style={{color:GREEN,fontSize:13,fontWeight:'800'}}>Payment Confirmed</Text><Text style={{color:GREEN,fontSize:10,opacity:0.8,marginTop:1}}>{cardLastFour==='MANUAL'?'Manual':`Card ····${cardLastFour}`} · {cardTxnRef}</Text></View>
                  <Text style={{color:GREEN,fontSize:15,fontWeight:'900'}}>R{parseFloat(passengerAmount||'0').toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}
          <Text style={[S.label,{color:c.textMuted}]}>SEAT (optional)</Text>
          <TextInput value={passengerSeat} onChangeText={setPassengerSeat} style={inp} placeholder="e.g. 5" placeholderTextColor={c.textMuted} keyboardType="numeric" />
          <View style={{flexDirection:'row',gap:12,marginTop:20}}>
            <TouchableOpacity style={[S.actionBtnSec,{borderColor:c.border,flex:1}]} onPress={()=>setPaxFormVisible(false)}><Text style={{fontSize:14,fontWeight:'700',color:c.text}}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[S.actionBtn,{backgroundColor:GREEN,flex:1}]} onPress={submitPax}><View style={S.actionRow}><Ionicons name="person-add-outline" size={16} color="#fff" /><Text style={[S.actionBtnText,{color:'#fff'}]}>Add</Text></View></TouchableOpacity>
          </View>
        </ScrollView>
      </View></View>
    </Modal>

    {/* PICKERS */}
    <PickerModal visible={taxiRankPicker} title="Select Taxi Rank" data={taxiRanks} selectedId={selectedTaxiRankId} onSelect={selectTaxiRank} onClose={()=>setTaxiRankPicker(false)} icon="business-outline" labelKey="name" subKey="location" c={c} />
    <PickerModal visible={routePicker} title="Select Route" data={routes} selectedId={selectedRouteId} onSelect={selectRoute} onClose={()=>setRoutePicker(false)} icon="git-branch-outline" labelKey={r=>r.routeName||r.name} subKey={r=>`${r.departureStation} → ${r.destinationStation} · R${r.standardFare}`} c={c} />
    <PickerModal visible={vehiclePicker} title="Select Vehicle" data={displayVehicles} selectedId={pickerCtx==='edit'?editVehicleId:selectedVehicleId} onSelect={selectVehicle} onClose={()=>setVehiclePicker(false)} icon="bus-outline" labelKey="registration" subKey={v=>`${v.make||''} ${v.model||''}`} c={c} empty={selectedRouteId?'No vehicles for route':'Select route first'} />
    <PickerModal visible={driverPicker} title="Select Driver" data={drivers} selectedId={pickerCtx==='edit'?editDriverId:selectedDriverId} onSelect={selectDriver} onClose={()=>setDriverPicker(false)} icon="person-outline" labelKey="name" c={c} />
    <PickerModal visible={marshalPicker} title="Select Marshal" data={marshals} selectedId={pickerCtx==='edit'?editMarshalId:selectedMarshalId} onSelect={selectMarshal} onClose={()=>setMarshalPicker(false)} icon="shield-outline" labelKey="fullName" subKey="marshalCode" c={c} />

    {/* STOP PICKER */}
    <Modal visible={stopModalVisible} animationType="slide" transparent onRequestClose={()=>setStopModalVisible(false)}>
      <View style={S.overlay}><View style={[S.sheet, { backgroundColor: c.background }]}>
        <SheetHeader title="Select Stop" onClose={()=>setStopModalVisible(false)} c={c} />
        <FlatList data={tripStops} keyExtractor={i=>i.id} contentContainerStyle={{padding:16}} renderItem={({item})=>(
          <TouchableOpacity style={[S.listItem,{backgroundColor:selectedStop?.id===item.id?GOLD_LIGHT:c.surface,borderColor:selectedStop?.id===item.id?GOLD:c.border}]} onPress={()=>selectStopItem(item)}>
            <View style={[S.stopNum,{backgroundColor:item.id==='__dest__'?GREEN:GOLD_LIGHT}]}><Text style={{fontSize:11,fontWeight:'700',color:item.id==='__dest__'?'#fff':GOLD}}>{item.id==='__dest__'?'\u2605':item.order}</Text></View>
            <View style={{flex:1}}><Text style={{fontSize:14,fontWeight:'700',color:c.text}}>{item.name}{item.id==='__dest__'?' (Final)':''}</Text><Text style={{color:GOLD,fontSize:12,fontWeight:'600'}}>R{Number(item.fare).toFixed(2)}{item.mins?` · ~${item.mins}min`:''}</Text></View>
            {selectedStop?.id===item.id && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
          </TouchableOpacity>
        )} />
      </View></View>
    </Modal>

    {/* DELETE */}
    <Modal visible={deleteModal} animationType="fade" transparent onRequestClose={()=>{setDeleteModal(false);setTripToDelete(null);}}>
      <View style={S.overlay}><View style={[S.deleteSheet, { backgroundColor: c.background }]}>
        <SheetHeader title="Delete Trip" onClose={()=>{setDeleteModal(false);setTripToDelete(null);}} c={c} />
        <View style={{padding:20}}>
          <Text style={{color:c.text,fontSize:14,lineHeight:22,textAlign:'center',marginBottom:20}}>{tripToDelete?`Delete trip from ${tripToDelete.departureStation} to ${tripToDelete.destinationStation}?\n\nThis cannot be undone.`:'Delete this trip?'}</Text>
          <View style={{flexDirection:'row',gap:12}}>
            <TouchableOpacity style={[S.actionBtnSec,{borderColor:c.border,flex:1}]} onPress={()=>{setDeleteModal(false);setTripToDelete(null);}}><Text style={{fontSize:14,fontWeight:'700',color:c.text}}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[S.actionBtn,{backgroundColor:RED,flex:1}]} onPress={doDelete}><Text style={[S.actionBtnText,{color:'#fff'}]}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      </View></View>
    </Modal>

    {/* CARD POS FULLSCREEN */}
    <Modal visible={cardModalVisible} animationType="fade" transparent onRequestClose={cancelCard}>
      <View style={{flex:1,backgroundColor:DARK}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:Math.max(insets.top,20)+12,paddingHorizontal:20,paddingBottom:12}}>
          <View><Text style={{color:GOLD,fontSize:10,fontWeight:'700',textTransform:'uppercase',letterSpacing:1}}>Mzansi Fleet POS</Text><Text style={{color:'#fff',fontSize:17,fontWeight:'900',marginTop:2}}>Card Payment</Text></View>
          <TouchableOpacity onPress={cancelCard} style={{padding:8}}><Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
        </View>
        <View style={{alignItems:'center',paddingVertical:16}}>
          <Text style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>AMOUNT</Text>
          <Text style={{color:'#fff',fontSize:44,fontWeight:'900',marginTop:4}}>R{parseFloat(passengerAmount||'0').toFixed(2)}</Text>
        </View>
        <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
          {cardStatus==='scanning' && <View style={{alignItems:'center'}}>
            <Animated.View style={{width:130,height:130,borderRadius:65,backgroundColor:'rgba(212,175,55,0.08)',alignItems:'center',justifyContent:'center',transform:[{scale:pulseAnim}]}}>
              <View style={{width:90,height:90,borderRadius:45,backgroundColor:'rgba(212,175,55,0.15)',alignItems:'center',justifyContent:'center'}}><Ionicons name="wifi-outline" size={44} color={GOLD} style={{transform:[{rotate:'90deg'}]}} /></View>
            </Animated.View>
            <Text style={{color:'#fff',fontSize:17,fontWeight:'800',marginTop:28}}>Ready to Accept Payment</Text>
            <Text style={{color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:6,textAlign:'center',paddingHorizontal:40}}>Hold card near device</Text>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:20,backgroundColor:'rgba(255,255,255,0.06)',paddingHorizontal:14,paddingVertical:8,borderRadius:20}}><ActivityIndicator size="small" color={GOLD} /><Text style={{color:GOLD,fontSize:12,fontWeight:'600'}}>Waiting...</Text></View>
          </View>}
          {cardStatus==='success' && <View style={{alignItems:'center'}}>
            <View style={{width:110,height:110,borderRadius:55,backgroundColor:'rgba(25,135,84,0.15)',alignItems:'center',justifyContent:'center'}}><View style={{width:74,height:74,borderRadius:37,backgroundColor:GREEN,alignItems:'center',justifyContent:'center'}}><Ionicons name="checkmark" size={44} color="#fff" /></View></View>
            <Text style={{color:GREEN,fontSize:20,fontWeight:'900',marginTop:20}}>Payment Successful</Text>
            <Text style={{color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:6}}>{cardLastFour==='MANUAL'?'Manual':`Card ····${cardLastFour}`}</Text>
            <Text style={{color:'rgba(255,255,255,0.3)',fontSize:11,marginTop:2}}>Ref: {cardTxnRef}</Text>
          </View>}
          {cardStatus==='failed' && <View style={{alignItems:'center'}}>
            <View style={{width:110,height:110,borderRadius:55,backgroundColor:RED_LIGHT,alignItems:'center',justifyContent:'center'}}><View style={{width:74,height:74,borderRadius:37,backgroundColor:RED,alignItems:'center',justifyContent:'center'}}><Ionicons name="close" size={44} color="#fff" /></View></View>
            <Text style={{color:RED,fontSize:20,fontWeight:'900',marginTop:20}}>Payment Failed</Text>
            <Text style={{color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:6,textAlign:'center',paddingHorizontal:40}}>Could not read card.</Text>
          </View>}
        </View>
        <View style={{paddingHorizontal:20,paddingBottom:Math.max(insets.bottom,20)+10}}>
          {cardStatus==='scanning' && <View style={{gap:10}}>
            <TouchableOpacity style={S.posSecBtn} onPress={manualCard}><Text style={{color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:'700'}}>Manual Entry</Text></TouchableOpacity>
            <TouchableOpacity style={[S.posSecBtn,{backgroundColor:RED_LIGHT}]} onPress={cancelCard}><Text style={{color:RED,fontSize:14,fontWeight:'700'}}>Cancel</Text></TouchableOpacity>
          </View>}
          {cardStatus==='success' && <TouchableOpacity style={[S.actionBtn,{backgroundColor:GREEN}]} onPress={confirmCard}><View style={S.actionRow}><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={[S.actionBtnText,{color:'#fff'}]}>Done</Text></View></TouchableOpacity>}
          {cardStatus==='failed' && <View style={{gap:10}}>
            <TouchableOpacity style={[S.actionBtn,{backgroundColor:GOLD}]} onPress={retryCard}><View style={S.actionRow}><Ionicons name="refresh-outline" size={16} color="#000" /><Text style={S.actionBtnText}>Retry</Text></View></TouchableOpacity>
            <TouchableOpacity style={S.posSecBtn} onPress={manualCard}><Text style={{color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:'700'}}>Manual Entry</Text></TouchableOpacity>
            <TouchableOpacity style={{padding:10,alignItems:'center'}} onPress={cancelCard}><Text style={{color:'rgba(255,255,255,0.4)',fontSize:12}}>Cancel</Text></TouchableOpacity>
          </View>}
        </View>
      </View>
    </Modal>

    {/* PICKERS */}
    {datePicker && <DateTimePicker value={scheduledDate} mode="date" display="default" minimumDate={new Date()} onChange={onDateChange} />}
    {timePicker && <DateTimePicker value={timePickerDate} mode="time" is24Hour display="default" onChange={onTimeChange} />}
    {editTimePicker && <DateTimePicker value={timePickerDate} mode="time" is24Hour display="default" onChange={onEditTimeChange} />}
  </>); }
}

function SheetHeader({ title, onClose, c }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.15)' }}>
      <Text style={{ fontSize: 17, fontWeight: '900', color: c.text }}>{title}</Text>
      <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={c.textMuted} /></TouchableOpacity>
    </View>
  );
}

function PickerField({ label, icon, value, placeholder, onPress, c }) {
  return (
    <>
      <Text style={[S.label, { color: c.textMuted }]}>{label}</Text>
      <TouchableOpacity style={[S.picker, { backgroundColor: c.surface, borderColor: value ? GOLD : c.border }]} onPress={onPress}>
        <Ionicons name={icon} size={16} color={GOLD} />
        <Text style={{ flex: 1, fontSize: 14, color: value ? c.text : c.textMuted }}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={14} color={c.textMuted} />
      </TouchableOpacity>
    </>
  );
}

function PickerModal({ visible, title, data, selectedId, onSelect, onClose, icon, labelKey, subKey, c, empty }) {
  const getLabel = typeof labelKey === 'function' ? labelKey : (item) => item[labelKey] || '';
  const getSub = typeof subKey === 'function' ? subKey : subKey ? (item) => item[subKey] || '' : null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={S.overlay}><View style={[S.sheet, { backgroundColor: c.background }]}>
        <SheetHeader title={title} onClose={onClose} c={c} />
        <FlatList data={data} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[S.listItem, { backgroundColor: item.id === selectedId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedId ? GOLD : c.border }]} onPress={() => onSelect(item)}>
              <Ionicons name={icon} size={16} color={GOLD} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{getLabel(item)}</Text>
                {getSub && <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{getSub(item)}</Text>}
              </View>
              {item.id === selectedId && <Ionicons name="checkmark-circle" size={18} color={GOLD} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: 'center', padding: 20 }}>{empty || 'No items'}</Text>}
        />
      </View></View>
    </Modal>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1a1a2e', paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: '#D4AF37', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 1 },
  headerAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D4AF37', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  headerAddText: { fontSize: 13, fontWeight: '800', color: '#000' },
  statsRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1 },
  statPill: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  listContent: { paddingHorizontal: 12, paddingBottom: 100 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 6, paddingHorizontal: 4 },
  todayDot: { width: 8, height: 8, borderRadius: 4 },
  dateText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  dateCount: { fontSize: 11, fontWeight: '600' },
  dateLine: { flex: 1, height: 1, marginLeft: 8 },
  card: { borderWidth: 1, borderRadius: 14, marginBottom: 10, flexDirection: 'row', overflow: 'hidden' },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardTime: { fontSize: 12, fontWeight: '600' },
  routeRow: { flexDirection: 'row', marginBottom: 10 },
  routeDots: { alignItems: 'center', paddingTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLine: { width: 2, height: 12, marginVertical: 2 },
  stationText: { fontSize: 13, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chipText: { fontSize: 11, fontWeight: '500' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 32 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', minHeight: '40%' },
  deleteSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '50%' },
  label: { fontSize: 10, fontWeight: '700', marginBottom: 4, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 2 },
  row: { flexDirection: 'row', gap: 10 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  actionBtn: { borderRadius: 12, padding: 15, alignItems: 'center' },
  actionBtnText: { fontSize: 15, fontWeight: '900', color: '#000' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtnSec: { borderWidth: 1.5, borderRadius: 12, padding: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  stopNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailCard: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  detailAccent: { width: 4 },
  section: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  secLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  splitCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  paxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5 },
  paxNum: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  payBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  addPaxBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#198754', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  infoBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  payToggle: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  posBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16 },
  cardOk: { backgroundColor: 'rgba(25,135,84,0.12)', borderRadius: 12, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardOkIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#198754', alignItems: 'center', justifyContent: 'center' },
  posSecBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, alignItems: 'center' },
});
