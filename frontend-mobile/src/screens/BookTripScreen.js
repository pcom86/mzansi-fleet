import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { fetchAvailableSchedules, createTripBooking } from '../api/taxiRanks';
import {
  createTripRequest, getMyTripRequests, cancelTripRequest, getTripRequest,
} from '../api/tripRequests';
import RiderTripProgress from '../components/RiderTripProgress';
import client from '../api/client';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDate(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const BLUE = '#0d6efd';
const GREEN = '#198754';
const RED = '#dc3545';
const SCREEN_H = Dimensions.get('window').height;

// ── Geo helpers ──────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreRouteMatch(route, pickTxt, dropTxt) {
  const rDest = (route.destinationStation || route.DestinationStation || '').toLowerCase();
  const rDep  = (route.departureStation  || route.DepartureStation  || '').toLowerCase();
  const rName = (route.routeName || route.RouteName || '').toLowerCase();
  const stops = route.stops || route.Stops || [];
  let score = 0;
  if (rDest.includes(dropTxt) || dropTxt.includes(rDest)) score += 40;
  if (rDep.includes(pickTxt)  || pickTxt.includes(rDep))  score += 30;
  if (rName.includes(dropTxt) || rName.includes(pickTxt)) score += 8;
  stops.forEach(s => {
    const sn = (s.stopName || s.StopName || '').toLowerCase();
    if (sn.includes(dropTxt) || dropTxt.includes(sn)) score += 20;
    if (sn.includes(pickTxt) || pickTxt.includes(sn)) score += 8;
  });
  return score;
}

function findBestStopFare(route, dropTxt) {
  const stops = [...(route.stops || route.Stops || [])]
    .sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));
  for (const s of stops) {
    const sn   = (s.stopName || s.StopName || '').toLowerCase();
    const fare = s.fareFromOrigin ?? s.FareFromOrigin ?? 0;
    if (fare > 0 && (sn.includes(dropTxt) || dropTxt.includes(sn))) {
      return { stopName: s.stopName || s.StopName || sn, fare };
    }
  }
  return null;
}

function getDayAbbr(d) {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

const STATE_CONFIG = {
  Requested:      { label: 'Searching for driver…', color: '#f59e0b', icon: 'search-outline' },
  OffersReceived: { label: 'Driver found!',          color: GREEN,     icon: 'checkmark-circle' },
  Booked:         { label: 'Trip booked',            color: BLUE,      icon: 'car-outline' },
  InProgress:     { label: 'Trip in progress',       color: '#22c55e', icon: 'navigate-circle-outline' },
  Completed:      { label: 'Completed',              color: GREEN,     icon: 'checkmark-done-circle-outline' },
  Cancelled:      { label: 'Cancelled',              color: RED,       icon: 'close-circle-outline' },
  Pending:        { label: 'Pending',                color: '#f59e0b', icon: 'time-outline' },
};

export default function BookTripScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  const userId = user?.userId || user?.id;

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('ondemand'); // 'ondemand' | 'scheduled'

  // ── Shared loading ──
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ──────────────────────────────────────────────────────────────────────
  // ON-DEMAND STATE
  // ──────────────────────────────────────────────────────────────────────
  const [pickup, setPickup] = useState({ description: '', placeId: null, latitude: null, longitude: null });
  const [dropoff, setDropoff] = useState({ description: '', placeId: null, latitude: null, longitude: null });
  const [tripType, setTripType] = useState('individual'); // 'individual' | 'group'
  const [paxCount, setPaxCount] = useState('1');
  const [odNotes, setOdNotes] = useState('');
  const [matchingRanks, setMatchingRanks] = useState([]);
  const [rankSearchDone, setRankSearchDone] = useState(false);
  const [searching, setSearching] = useState(false);
  const [estimatedDistanceKm, setEstimatedDistanceKm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Scheduling state ──
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [trackingReq, setTrackingReq] = useState(null);
  const pollRef = useRef(null);

  // ──────────────────────────────────────────────────────────────────────
  // SCHEDULED STATE
  // ──────────────────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState([]);
  const [schedLoading, setSchedLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(false);
  const [travelDate, setTravelDate] = useState('');
  const [seats, setSeats] = useState('1');
  const [passengerName, setPassengerName] = useState(user?.fullName || '');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [availableDates, setAvailableDates] = useState([]);

  // ──────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ──────────────────────────────────────────────────────────────────────
  const loadSchedules = useCallback(async (silent = false) => {
    if (!silent) setSchedLoading(true);
    try {
      const resp = await fetchAvailableSchedules();
      setSchedules(resp.data || resp || []);
    } catch (err) {
      console.warn('Load schedules error', err?.message);
    } finally {
      setSchedLoading(false);
    }
  }, []);

  const loadMyRequests = useCallback(async () => {
    if (!userId) return;
    setRequestsLoading(true);
    try {
      const data = await getMyTripRequests(userId);
      setMyRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Load requests error', err?.message);
    } finally {
      setRequestsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSchedules();
    loadMyRequests();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadSchedules, loadMyRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([loadSchedules(true), loadMyRequests()]).finally(() => setRefreshing(false));
  };

  // ──────────────────────────────────────────────────────────────────────
  // ON-DEMAND: find matching ranks by comparing dropoff text with route destinations
  // ──────────────────────────────────────────────────────────────────────
  async function handleFindRanks() {
    if (!pickup.description.trim()) return Alert.alert('Required', 'Please enter a pickup location');
    if (!dropoff.description.trim()) return Alert.alert('Required', 'Please enter a destination');
    setSearching(true);
    setRankSearchDone(false);
    try {
      // ── Straight-line distance between pickup and dropoff (when coords available) ──
      let distKm = null;
      if (pickup.latitude && pickup.longitude && dropoff.latitude && dropoff.longitude) {
        distKm = haversineKm(
          Number(pickup.latitude), Number(pickup.longitude),
          Number(dropoff.latitude), Number(dropoff.longitude),
        );
      }
      setEstimatedDistanceKm(distKm);

      const resp = await client.get('/TaxiRanks');
      const ranks = resp.data || [];
      const dropTxt = dropoff.description.toLowerCase();
      const pickTxt = pickup.description.toLowerCase();

      const matched = [];
      for (const rank of ranks) {
        try {
          const routeResp = await client.get(`/Routes?taxiRankId=${rank.id}`);
          const routes = routeResp.data || [];

          // Score and enrich every route for this rank
          const scoredRoutes = routes
            .map(r => {
              const score     = scoreRouteMatch(r, pickTxt, dropTxt);
              const stopMatch = findBestStopFare(r, dropTxt);
              const routeFare = stopMatch
                ? stopMatch.fare
                : Number(r.standardFare ?? r.StandardFare ?? 0);
              const ratePerKm = Number(rank.ratePerKm ?? rank.RatePerKm ?? 0);
              const distFare  = distKm && ratePerKm > 0
                ? +(distKm * ratePerKm).toFixed(2)
                : 0;
              return { ...r, _score: score, _stopMatch: stopMatch, _routeFare: routeFare, _distFare: distFare };
            })
            .filter(r => r._score > 0)
            .sort((a, b) => b._score - a._score);

          if (scoredRoutes.length === 0) continue;

          // Boost rank score by proximity to pickup when coords are available
          let rankScore = scoredRoutes[0]._score;
          const rankLat = Number(rank.latitude ?? rank.Latitude ?? 0);
          const rankLon = Number(rank.longitude ?? rank.Longitude ?? 0);
          if (pickup.latitude && pickup.longitude && rankLat && rankLon) {
            const rankDist = haversineKm(
              Number(pickup.latitude), Number(pickup.longitude),
              rankLat, rankLon,
            );
            rankScore += Math.max(0, 25 - rankDist * 2);
          }

          matched.push({ ...rank, _rankScore: rankScore, matchingRoutes: scoredRoutes });
        } catch {}
      }

      // Best matches first
      matched.sort((a, b) => b._rankScore - a._rankScore);
      setMatchingRanks(matched);
      setRankSearchDone(true);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to search for routes');
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmitRequest() {
    if (!pickup.description.trim()) return Alert.alert('Required', 'Please enter a pickup location');
    if (!dropoff.description.trim()) return Alert.alert('Required', 'Please enter a destination');
    if (!userId) return Alert.alert('Error', 'You must be logged in to request a trip');

    setSubmitting(true);
    try {
      const bestRank = matchingRanks[0] ?? null;
      const bestRoute = bestRank?.matchingRoutes?.[0] ?? null;
      const result = await createTripRequest({
        passengerId: userId,
        taxiRankId: bestRank?.id ?? null,
        routeId: bestRoute?.id ?? null,
        pickupLocation: pickup.description.trim(),
        dropoffLocation: dropoff.description.trim(),
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        dropoffLatitude: dropoff.latitude,
        dropoffLongitude: dropoff.longitude,
        pickupTime: isScheduled ? scheduledDate.toISOString() : new Date().toISOString(),
        isScheduled,
        passengers: tripType === 'group' ? (parseInt(paxCount, 10) || 2) : 1,
        status: 'Requested',
        notes: `${isScheduled ? `Scheduled: ${scheduledDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. ` : ''}${tripType === 'group' ? `Group trip (${paxCount} pax). ` : ''}${odNotes.trim()}`,
        totalPrice: (() => {
          const r = matchingRanks[0]?.matchingRoutes?.[0];
          const fare = r?._routeFare ?? 0;
          const pax  = tripType === 'group' ? (parseInt(paxCount, 10) || 2) : 1;
          const ratePerKm = Number(matchingRanks[0]?.ratePerKm ?? matchingRanks[0]?.RatePerKm ?? 0);
          const distFare  = estimatedDistanceKm && ratePerKm > 0
            ? estimatedDistanceKm * ratePerKm * pax
            : 0;
          return fare * pax || distFare || 0;
        })(),
      });

      setMyRequests(prev => [result, ...prev]);
      setPickup({ description: '', placeId: null, latitude: null, longitude: null });
      setDropoff({ description: '', placeId: null, latitude: null, longitude: null });
      setOdNotes('');
      setPaxCount('1');
      setMatchingRanks([]);
      setRankSearchDone(false);

      Alert.alert('Request Sent!', 'Drivers near your route will see your request. You\'ll be notified when a driver accepts.');

      startPollingForAcceptance(result.id);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  function startPollingForAcceptance(requestId) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const updated = await getTripRequest(requestId);
        const newState = updated?.state;
        if (newState === 'OffersReceived' || newState === 'Booked') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setMyRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updated } : r));
          Alert.alert('Driver Found!', 'A driver has accepted your trip request.');
        } else if (newState === 'InProgress') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setMyRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updated } : r));
          setTrackingReq(updated);
        } else if (newState === 'Completed' || newState === 'Cancelled') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setMyRequests(prev => prev.map(r => r.id === requestId ? { ...r, state: newState } : r));
        }
      } catch {}
    }, 8000);
    setTimeout(() => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, 600000);
  }

  async function handleCancelRequest(req) {
    Alert.alert('Cancel Request', 'Cancel this trip request?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel', style: 'destructive', onPress: async () => {
          try {
            await cancelTripRequest(req.id);
            setMyRequests(prev => prev.map(r => r.id === req.id ? { ...r, state: 'Cancelled' } : r));
          } catch (err) {
            Alert.alert('Error', err?.message || 'Failed to cancel');
          }
        },
      },
    ]);
  }

  // ──────────────────────────────────────────────────────────────────────
  // SCHEDULED: booking helpers
  // ──────────────────────────────────────────────────────────────────────
  function openBooking(schedule) {
    setSelected(schedule);
    setPassengerName(user?.fullName || '');
    setSeats('1');
    setNotes('');
    setTravelDate('');
    const days = (schedule.daysOfWeek || '').split(',').map(d => d.trim());
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30 && dates.length < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const abbr = getDayAbbr(d);
      if (days.length === 0 || days.includes(abbr)) dates.push(d);
    }
    setAvailableDates(dates);
    if (dates.length > 0) setTravelDate(dates[0].toISOString());
    setModalVisible(true);
  }

  async function handleBook() {
    if (!selected) return;
    if (!travelDate) return Alert.alert('Validation', 'Please select a travel date');
    if (!passengerName.trim()) return Alert.alert('Validation', 'Passenger name is required');
    const MIN_LEAD = 60;
    if (selected.departureTime && travelDate) {
      const [hh, mm] = (selected.departureTime || '00:00').split(':').map(Number);
      const dep = new Date(travelDate);
      dep.setHours(hh, mm, 0, 0);
      if ((dep.getTime() - Date.now()) / 60000 < MIN_LEAD) {
        return Alert.alert('Too Late', `Bookings must be made at least ${MIN_LEAD / 60}h before departure.`);
      }
    }
    setBooking(true);
    try {
      await createTripBooking({
        userId,
        tripScheduleId: selected.id,
        travelDate,
        seatsBooked: parseInt(seats, 10) || 1,
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        notes: notes.trim() || null,
      });
      setModalVisible(false);
      Alert.alert('Booking Confirmed!', `Trip on ${selected.routeName} booked for ${formatDate(new Date(travelDate))}.`, [
        { text: 'View My Bookings', onPress: () => navigation.navigate('MyBookings') },
        { text: 'OK' },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  }

  const totalFare = selected ? (selected.standardFare * (parseInt(seats, 10) || 1)) : 0;

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Book a Trip</Text>
          <Text style={styles.headerSub}>On-demand or scheduled routes</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MyBookings')} style={styles.historyBtn}>
          <Ionicons name="receipt-outline" size={20} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
      <View style={[styles.tabBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {[
          { key: 'ondemand', label: 'On-Demand', icon: 'navigate-outline' },
          { key: 'scheduled', label: 'Scheduled', icon: 'calendar-outline' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon} size={16} color={activeTab === t.key ? GOLD : c.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === t.key ? GOLD : c.textMuted }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'ondemand' ? renderOnDemand() : renderScheduled()}
      </ScrollView>

      {/* ── Rider trip progress screen ── */}
      <RiderTripProgress
        visible={!!trackingReq}
        req={trackingReq}
        onClose={() => setTrackingReq(null)}
        onCompleted={() => {
          const id = trackingReq?.id ?? trackingReq?.Id;
          setMyRequests(prev => prev.map(r => r.id === id ? { ...r, state: 'Completed' } : r));
        }}
      />

      {/* ── Scheduled booking modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background, height: Math.round(SCREEN_H * 0.88) }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Book Trip</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {selected && (
                <View style={[styles.routeSummary, { backgroundColor: GOLD_LIGHT, borderColor: c.border }]}>
                  <Text style={[styles.routeSumTitle, { color: c.text }]}>{selected.routeName}</Text>
                  <Text style={[styles.routeSumRoute, { color: c.textMuted }]}>{selected.departureStation} → {selected.destinationStation}</Text>
                  <Text style={[styles.routeSumMeta, { color: c.textMuted }]}>Departs {selected.departureTime} · {selected.taxiRankName}</Text>
                </View>
              )}
              <Text style={[styles.label, { color: c.textMuted }]}>Select Travel Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {availableDates.map(d => {
                  const iso = d.toISOString();
                  const isSel = travelDate === iso;
                  return (
                    <TouchableOpacity key={iso} style={[styles.dateChip, isSel && styles.dateChipActive, { borderColor: c.border }]} onPress={() => setTravelDate(iso)}>
                      <Text style={[styles.dateDay, isSel && styles.dateDayActive]}>{getDayAbbr(d)}</Text>
                      <Text style={[styles.dateNum, isSel && styles.dateNumActive]}>{d.getDate()}</Text>
                      <Text style={[styles.dateMonth, isSel && styles.dateMonthActive]}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={[styles.label, { color: c.textMuted }]}>Number of Seats</Text>
              <View style={styles.seatsRow}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity key={n} style={[styles.seatBtn, parseInt(seats,10)===n && styles.seatBtnActive]} onPress={() => setSeats(String(n))}>
                    <Text style={[styles.seatText, parseInt(seats,10)===n && styles.seatTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: c.textMuted }]}>Passenger Name</Text>
              <TextInput value={passengerName} onChangeText={setPassengerName} style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]} placeholderTextColor={c.textMuted} placeholder="Your name" />
              <Text style={[styles.label, { color: c.textMuted }]}>Phone Number</Text>
              <TextInput value={passengerPhone} onChangeText={setPassengerPhone} style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]} placeholderTextColor={c.textMuted} placeholder="072 123 4567" keyboardType="phone-pad" />
              <Text style={[styles.label, { color: c.textMuted }]}>Notes (optional)</Text>
              <TextInput value={notes} onChangeText={setNotes} style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, minHeight: 50 }]} placeholderTextColor={c.textMuted} placeholder="Special requests" multiline />
              <View style={[styles.fareSummary, { borderColor: c.border }]}>
                <View style={styles.fareRow}><Text style={[styles.fareLabel2, { color: c.textMuted }]}>Fare per seat</Text><Text style={[styles.fareVal, { color: c.text }]}>R{selected?.standardFare || 0}</Text></View>
                <View style={styles.fareRow}><Text style={[styles.fareLabel2, { color: c.textMuted }]}>Seats</Text><Text style={[styles.fareVal, { color: c.text }]}>× {parseInt(seats,10)||1}</Text></View>
                <View style={[styles.fareRow, styles.fareTotalRow]}><Text style={[styles.fareTotalLabel, { color: c.text }]}>Total</Text><Text style={styles.fareTotalVal}>R{totalFare.toFixed(2)}</Text></View>
              </View>
              <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={booking} activeOpacity={0.85}>
                {booking ? <ActivityIndicator color="#000" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
                    <Text style={styles.bookBtnText}>Confirm Booking — R{totalFare.toFixed(2)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────
  // ON-DEMAND TAB
  // ──────────────────────────────────────────────────────────────────────
  function renderOnDemand() {
    const activeRequests = myRequests.filter(r => r.state !== 'Cancelled' && r.state !== 'Completed');
    return (
      <>
        {/* ── Request form ── */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <View style={[styles.cardIcon, { backgroundColor: GOLD_LIGHT }]}>
              <Ionicons name="navigate" size={20} color={GOLD} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: c.text }]}>Request a Trip</Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>Tell drivers where you're going</Text>
            </View>
          </View>

          {/* Pickup */}
          <Text style={[styles.label, { color: c.textMuted }]}>Pickup Location</Text>
          <PlacesAutocomplete
            value={pickup.description}
            onSelect={place => { setPickup(place); setRankSearchDone(false); setMatchingRanks([]); }}
            placeholder="e.g. Sandton City, Joburg"
            iconName="radio-button-on"
            iconColor={GREEN}
            c={c}
          />

          {/* Destination */}
          <Text style={[styles.label, { color: c.textMuted }]}>Destination</Text>
          <PlacesAutocomplete
            value={dropoff.description}
            onSelect={place => { setDropoff(place); setRankSearchDone(false); setMatchingRanks([]); }}
            placeholder="e.g. Pretoria Station"
            iconName="location"
            iconColor={RED}
            c={c}
          />

          {/* Trip type */}
          <Text style={[styles.label, { color: c.textMuted }]}>Trip Type</Text>
          <View style={styles.seatsRow}>
            {[
              { key: 'individual', label: 'Individual', icon: 'person-outline' },
              { key: 'group', label: 'Group', icon: 'people-outline' },
            ].map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeBtn, { borderColor: tripType === t.key ? GOLD : c.border, backgroundColor: tripType === t.key ? GOLD_LIGHT : c.background }]}
                onPress={() => setTripType(t.key)}
              >
                <Ionicons name={t.icon} size={16} color={tripType === t.key ? GOLD : c.textMuted} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: tripType === t.key ? GOLD : c.textMuted, marginLeft: 6 }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Passenger count for group */}
          {tripType === 'group' && (
            <>
              <Text style={[styles.label, { color: c.textMuted }]}>Number of Passengers</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { borderColor: c.border, backgroundColor: c.background }]}
                  onPress={() => setPaxCount(prev => String(Math.max(2, parseInt(prev, 10) - 1)))}
                >
                  <Ionicons name="remove" size={20} color={c.text} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.stepperInput, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
                  value={paxCount}
                  onChangeText={t => { const n = t.replace(/[^0-9]/g, ''); setPaxCount(n === '' ? '2' : String(Math.max(2, parseInt(n, 10)))); }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={[styles.stepperBtn, { borderColor: c.border, backgroundColor: c.background }]}
                  onPress={() => setPaxCount(prev => String(parseInt(prev, 10) + 1))}
                >
                  <Ionicons name="add" size={20} color={c.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: c.textMuted, marginLeft: 8 }}>passengers</Text>
              </View>
            </>
          )}

          {/* Notes */}
          <Text style={[styles.label, { color: c.textMuted }]}>Notes (optional)</Text>
          <TextInput
            value={odNotes} onChangeText={setOdNotes}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholderTextColor={c.textMuted}
            placeholder="e.g. Need baby seat, wheelchair access…"
            multiline
          />

          {/* When */}
          <Text style={[styles.label, { color: c.textMuted }]}>When</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[
              { key: false, label: 'Leave Now', icon: 'flash' },
              { key: true,  label: 'Schedule',  icon: 'calendar' },
            ].map(opt => (
              <TouchableOpacity
                key={String(opt.key)}
                style={[styles.typeBtn, {
                  borderColor: isScheduled === opt.key ? GOLD : c.border,
                  backgroundColor: isScheduled === opt.key ? GOLD_LIGHT : c.background,
                }]}
                onPress={() => setIsScheduled(opt.key)}
              >
                <Ionicons name={opt.icon} size={16} color={isScheduled === opt.key ? GOLD : c.textMuted} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: isScheduled === opt.key ? GOLD : c.textMuted, marginLeft: 6 }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isScheduled && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* Date button */}
                <TouchableOpacity
                  style={[styles.findBtn, { flex: 1, borderColor: GOLD + '60', backgroundColor: GOLD_LIGHT }]}
                  onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={15} color={GOLD} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginLeft: 6 }}>{formatDate(scheduledDate)}</Text>
                </TouchableOpacity>
                {/* Time button */}
                <TouchableOpacity
                  style={[styles.findBtn, { flex: 1, borderColor: GOLD + '60', backgroundColor: GOLD_LIGHT }]}
                  onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
                >
                  <Ionicons name="time-outline" size={15} color={GOLD} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginLeft: 6 }}>
                    {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {Platform.OS !== 'web' && showDatePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="date"
                  minimumDate={new Date()}
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, date) => {
                    if (Platform.OS !== 'ios') setShowDatePicker(false);
                    if (date) {
                      const d = new Date(scheduledDate);
                      d.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setScheduledDate(d);
                    }
                  }}
                />
              )}
              {Platform.OS !== 'web' && showTimePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    if (Platform.OS !== 'ios') setShowTimePicker(false);
                    if (date) {
                      const d = new Date(scheduledDate);
                      d.setHours(date.getHours(), date.getMinutes(), 0, 0);
                      setScheduledDate(d);
                    }
                  }}
                />
              )}
            </View>
          )}

          {/* Find ranks */}
          <TouchableOpacity
            style={[styles.findBtn, { borderColor: BLUE + '50', backgroundColor: BLUE + '08' }, searching && { opacity: 0.6 }]}
            onPress={handleFindRanks}
            disabled={searching}
            activeOpacity={0.8}
          >
            {searching ? <ActivityIndicator size="small" color={BLUE} /> : <Ionicons name="search" size={16} color={BLUE} />}
            <Text style={{ fontSize: 13, fontWeight: '700', color: BLUE, marginLeft: 8 }}>
              {searching ? 'Searching routes…' : 'Find Matching Ranks'}
            </Text>
          </TouchableOpacity>

          {/* Matching ranks result */}
          {rankSearchDone && (
            <View style={{ marginTop: 10 }}>
              {matchingRanks.length === 0 ? (
                <View style={[styles.noRankBox, { borderColor: c.border, backgroundColor: c.background }]}>
                  <Ionicons name="information-circle-outline" size={20} color={c.textMuted} />
                  <Text style={{ fontSize: 13, color: c.textMuted, marginLeft: 8 }}>
                    No exact route match found. You can still submit a request and nearby drivers will see it.
                  </Text>
                </View>
              ) : (
                matchingRanks.map((rank, rankIdx) => (
                  <View key={rank.id} style={[styles.rankMatchCard, { borderColor: GREEN + '30', backgroundColor: GREEN + '06', marginBottom: 8, flexDirection: 'column' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: c.text, flex: 1, marginLeft: 6 }}>{rank.name}</Text>
                      {rankIdx === 0 && (
                        <View style={{ backgroundColor: GOLD, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: '#000' }}>BEST MATCH</Text>
                        </View>
                      )}
                    </View>
                    {rank.matchingRoutes.map((r, rIdx) => {
                      const rName = r.routeName || r.RouteName ||
                        `${r.departureStation ?? r.DepartureStation} → ${r.destinationStation ?? r.DestinationStation}`;
                      return (
                        <View key={r.id} style={{ marginTop: rIdx === 0 ? 0 : 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: c.text, flex: 1 }} numberOfLines={1}>
                              {rName}
                            </Text>
                            {r._routeFare > 0 && (
                              <View style={{ backgroundColor: GOLD, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#000' }}>R{r._routeFare.toFixed(2)}</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 }}>
                            {r._stopMatch ? (
                              <Text style={{ fontSize: 10, color: GREEN }}>
                                ✓ Stop fare to {r._stopMatch.stopName}
                              </Text>
                            ) : (
                              <Text style={{ fontSize: 10, color: c.textMuted }}>Standard route fare</Text>
                            )}
                            {r._distFare > 0 && (
                              <Text style={{ fontSize: 10, color: c.textMuted }}>
                                · km-rate est. R{r._distFare.toFixed(2)}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Fare estimate */}
          {(() => {
            const bestRank  = matchingRanks[0] ?? null;
            const bestRoute = bestRank?.matchingRoutes?.[0] ?? null;
            const fare = bestRoute?._routeFare ?? 0;
            const pax  = tripType === 'group' ? (parseInt(paxCount, 10) || 2) : 1;
            const total = fare * pax;
            const ratePerKm = Number(bestRank?.ratePerKm ?? bestRank?.RatePerKm ?? 0);
            const distFare  = estimatedDistanceKm && ratePerKm > 0
              ? +(estimatedDistanceKm * ratePerKm * pax).toFixed(2)
              : 0;
            if (!rankSearchDone || (fare <= 0 && distFare <= 0 && !estimatedDistanceKm)) return null;
            return (
              <View style={[styles.fareSummary, { borderColor: c.border, marginTop: 12 }]}>
                {estimatedDistanceKm != null && (
                  <View style={styles.fareRow}>
                    <Text style={[styles.fareLabel2, { color: c.textMuted }]}>Est. distance</Text>
                    <Text style={[styles.fareVal, { color: c.text }]}>{estimatedDistanceKm.toFixed(1)} km</Text>
                  </View>
                )}
                {fare > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={[styles.fareLabel2, { color: c.textMuted }]}>
                      {bestRoute?._stopMatch ? `Stop fare (${bestRoute._stopMatch.stopName})` : 'Route fare'}
                    </Text>
                    <Text style={[styles.fareVal, { color: c.text }]}>R{fare.toFixed(2)}</Text>
                  </View>
                )}
                {distFare > 0 && fare <= 0 && (
                  <View style={styles.fareRow}>
                    <Text style={[styles.fareLabel2, { color: c.textMuted }]}>Distance-based fare</Text>
                    <Text style={[styles.fareVal, { color: c.text }]}>R{distFare.toFixed(2)}</Text>
                  </View>
                )}
                {pax > 1 && fare > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={[styles.fareLabel2, { color: c.textMuted }]}>Passengers</Text>
                    <Text style={[styles.fareVal, { color: c.text }]}>× {pax}</Text>
                  </View>
                )}
                {(total > 0 || distFare > 0) && (
                  <View style={[styles.fareRow, styles.fareTotalRow]}>
                    <Text style={[styles.fareTotalLabel, { color: c.text }]}>Estimated Total</Text>
                    <Text style={styles.fareTotalVal}>R{(total > 0 ? total : distFare).toFixed(2)}</Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.bookBtn, { marginTop: 16 }, submitting && { opacity: 0.6 }]}
            onPress={handleSubmitRequest}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#000" /> : (() => {
              const bestRank  = matchingRanks[0] ?? null;
              const bestRoute = bestRank?.matchingRoutes?.[0] ?? null;
              const fare = bestRoute?._routeFare ?? 0;
              const pax  = tripType === 'group' ? (parseInt(paxCount, 10) || 2) : 1;
              const total = fare * pax;
              const ratePerKm = Number(bestRank?.ratePerKm ?? bestRank?.RatePerKm ?? 0);
              const distFare  = estimatedDistanceKm && ratePerKm > 0
                ? +(estimatedDistanceKm * ratePerKm * pax).toFixed(2)
                : 0;
              const displayTotal = total > 0 ? total : distFare;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="send" size={18} color="#000" />
                  <Text style={styles.bookBtnText}>
                    {isScheduled
                      ? `Schedule for ${scheduledDate.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${displayTotal > 0 ? ` — R${displayTotal.toFixed(2)}` : ''}`
                      : displayTotal > 0
                        ? `Request Trip — R${displayTotal.toFixed(2)}`
                        : tripType === 'group' ? `Request Group Trip (${paxCount} pax)` : 'Request Trip'}
                  </Text>
                </View>
              );
            })()}
          </TouchableOpacity>
        </View>

        {/* ── My active requests ── */}
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name="list-outline" size={17} color={GOLD} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>My Trip Requests</Text>
            {requestsLoading && <ActivityIndicator size="small" color={GOLD} style={{ marginLeft: 6 }} />}
          </View>

          {myRequests.length === 0 && !requestsLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="car-outline" size={32} color={c.textMuted} />
              <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 8 }}>No trip requests yet</Text>
            </View>
          ) : (
            myRequests.map(req => {
              const sc = STATE_CONFIG[req.state] || STATE_CONFIG.Pending;
              return (
                <View key={req.id} style={[styles.requestCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name={sc.icon} size={15} color={sc.color} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: sc.color }}>{sc.label}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }} numberOfLines={1}>
                        {req.pickupLocation} → {req.dropoffLocation}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>
                          {req.passengerCount > 1 ? `${req.passengerCount} passengers · ` : ''}
                          {new Date(req.requestedTime || Date.now()).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {(req.totalPrice ?? 0) > 0 && (
                          <View style={{ backgroundColor: GOLD, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#000' }}>R{Number(req.totalPrice).toFixed(2)}</Text>
                          </View>
                        )}
                      </View>
                      {req.notes ? <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }} numberOfLines={1}>{req.notes}</Text> : null}
                    </View>
                    <View style={{ flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      {(req.state === 'Requested' || req.state === 'Pending') && (
                        <TouchableOpacity
                          style={[styles.cancelReqBtn, { borderColor: RED + '50' }]}
                          onPress={() => handleCancelRequest(req)}
                        >
                          <Ionicons name="close" size={14} color={RED} />
                        </TouchableOpacity>
                      )}
                      {req.state === 'InProgress' && (
                        <TouchableOpacity
                          style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                          onPress={() => setTrackingReq(req)}
                        >
                          <Ionicons name="navigate" size={13} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>Track</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // SCHEDULED TAB
  // ──────────────────────────────────────────────────────────────────────
  function renderScheduled() {
    if (schedLoading) {
      return (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={[styles.loadingText, { color: c.textMuted }]}>Finding available trips…</Text>
        </View>
      );
    }
    if (schedules.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="bus-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>No scheduled trips available</Text>
          <Text style={[styles.emptyHint, { color: c.textMuted }]}>Check back later for new routes</Text>
        </View>
      );
    }
    return schedules.map(s => (
      <TouchableOpacity key={s.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => openBooking(s)} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: GOLD_LIGHT }]}>
            <Ionicons name="bus-outline" size={22} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{s.routeName}</Text>
            <Text style={[styles.cardRoute, { color: c.textMuted }]}>{s.departureStation} → {s.destinationStation}</Text>
          </View>
          <View style={styles.fareBox}><Text style={styles.fareLabel}>R{s.standardFare}</Text></View>
        </View>
        <View style={styles.cardMeta}>
          <MetaTag icon="location-outline" label={s.taxiRankName || 'Rank'} c={c} />
          <MetaTag icon="time-outline" label={s.departureTime || '--:--'} c={c} />
          {s.expectedDurationMinutes && <MetaTag icon="hourglass-outline" label={`${s.expectedDurationMinutes}m`} c={c} />}
          {s.maxPassengers && <MetaTag icon="people-outline" label={`${s.maxPassengers} seats`} c={c} />}
        </View>
        <View style={styles.daysRow}>
          {DAYS_SHORT.map(d => (
            <View key={d} style={[styles.dayChip, (s.daysOfWeek || '').includes(d) && styles.dayChipActive]}>
              <Text style={[styles.dayText, (s.daysOfWeek || '').includes(d) && styles.dayTextActive]}>{d.charAt(0)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.bookRow}>
          <Ionicons name="calendar-outline" size={14} color={GOLD} />
          <Text style={[styles.bookCta, { color: GOLD }]}>Tap to book this trip</Text>
        </View>
      </TouchableOpacity>
    ));
  }
}

function MetaTag({ icon, label, c }) {
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
  centerBlock: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  loadingText: { marginTop: 8, fontSize: 13 },

  header: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  historyBtn: { padding: 6, backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: 10 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: GOLD },
  tabLabel: { fontSize: 13, fontWeight: '700' },

  body: { padding: 16, paddingBottom: 48 },

  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 12 },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 14, borderWidth: 1 },

  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardRoute: { fontSize: 12, marginTop: 2 },
  fareBox: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  fareLabel: { color: '#000', fontSize: 14, fontWeight: '900' },

  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  daysRow: { flexDirection: 'row', gap: 4 },
  dayChip: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: GOLD },
  dayText: { fontSize: 10, fontWeight: '700', color: '#999' },
  dayTextActive: { color: '#000' },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: 4 },
  bookCta: { fontSize: 12, fontWeight: '700' },

  label: { fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  locationRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2 },
  locationInput: { flex: 1, fontSize: 14 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 10, paddingVertical: 10 },
  findBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 12, marginTop: 8 },
  noRankBox: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, padding: 12 },
  rankMatchCard: { flexDirection: 'column', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6 },

  requestCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cancelReqBtn: { borderWidth: 1, borderRadius: 8, padding: 6, marginLeft: 8 },

  seatsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seatBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  seatBtnActive: { backgroundColor: GOLD },
  seatText: { fontSize: 16, fontWeight: '800', color: '#999' },
  seatTextActive: { color: '#000' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stepperBtn: { width: 44, height: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepperInput: { width: 64, height: 44, borderWidth: 1, borderRadius: 10, textAlign: 'center', fontSize: 18, fontWeight: '800', marginHorizontal: 6 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalBody: { padding: 16, paddingBottom: 40 },
  routeSummary: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  routeSumTitle: { fontSize: 15, fontWeight: '800' },
  routeSumRoute: { fontSize: 12, marginTop: 2 },
  routeSumMeta: { fontSize: 11, marginTop: 4 },
  dateChip: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, minWidth: 56 },
  dateChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  dateDay: { fontSize: 10, fontWeight: '700', color: '#999' },
  dateDayActive: { color: '#000' },
  dateNum: { fontSize: 18, fontWeight: '900', marginVertical: 2, color: '#333' },
  dateNumActive: { color: '#000' },
  dateMonth: { fontSize: 10, fontWeight: '600', color: '#999' },
  dateMonthActive: { color: '#000' },
  fareSummary: { borderTopWidth: 1, marginTop: 16, paddingTop: 12, gap: 6 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fareLabel2: { fontSize: 13 },
  fareVal: { fontSize: 13, fontWeight: '600' },
  fareTotalRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  fareTotalLabel: { fontSize: 15, fontWeight: '800' },
  fareTotalVal: { fontSize: 18, fontWeight: '900', color: GOLD },
  bookBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  bookBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },
});
