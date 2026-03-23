import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, Modal, TextInput, RefreshControl, Clipboard, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  fetchRanksWithQueues, fetchLiveQueue, createQueueBooking,
  confirmQueuePayment, fetchUserQueueBookings, cancelQueueBooking,
} from '../api/queueBooking';
import { getRouteStops } from '../api/queueManagement';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const BLUE = '#0d6efd';
const RED = '#dc3545';

export default function RiderQueueScreen({ navigation, route: navRoute }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const preSelectedRankId = navRoute?.params?.rankId || '';

  // Data
  const [ranks, setRanks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Route/booking helpers
  const [routeStops, setRouteStops] = useState([]);
  const [includeMe, setIncludeMe] = useState(false);

  // Selection
  const [selectedRankId, setSelectedRankId] = useState(preSelectedRankId);
  const [rankPickerVisible, setRankPickerVisible] = useState(false);

  // Booking modal
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState(null);
  const [seatCount, setSeatCount] = useState('1');
  const [passengers, setPassengers] = useState([{ name: '', contactNumber: '', email: '', destination: '' }]);
  const [bookingStep, setBookingStep] = useState('details'); // details | eft | confirmation
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // My bookings tab
  const [activeTab, setActiveTab] = useState('queue'); // queue | bookings

  const userId = user?.userId || user?.id;

  // ===== DATA LOADING =====
  const loadLiveQueue = useCallback(async (rankId) => {
    if (!rankId) {
      setQueue([]);
      return;
    }
    try {
      const data = await fetchLiveQueue(rankId);
      setQueue(data || []);
    } catch (err) {
      console.warn('Live queue fetch error:', err?.message);
      setQueue([]);
    }
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ranksData, bookingsData] = await Promise.all([
        fetchRanksWithQueues().catch(() => []),
        userId ? fetchUserQueueBookings(userId).catch(() => []) : Promise.resolve([]),
      ]);
      const ranksList = ranksData || [];
      setRanks(ranksList);
      setMyBookings(bookingsData || []);

      const newRankId = selectedRankId || (ranksList.length > 0 ? ranksList[0].id : '');
      if (newRankId !== selectedRankId) {
        setSelectedRankId(newRankId);
      }
      await loadLiveQueue(newRankId);
    } catch (err) {
      console.warn('Load error:', err?.message);
      setQueue([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, selectedRankId, loadLiveQueue]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedRankId) return;
    loadLiveQueue(selectedRankId);
  }, [selectedRankId, loadLiveQueue]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const selectedRank = ranks.find(r => r.id === selectedRankId);

  // ===== BOOKING HANDLERS =====
  function openBookModal(entry) {
    setSelectedQueueEntry(entry);
    setSeatCount('1');
    setIncludeMe(false);

    const initialDest = entry.destinationStation || '';
    setPassengers([{
      name: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      contactNumber: user?.phoneNumber || '',
      email: user?.email || '',
      destination: initialDest,
      routeStopId: null,
      fare: Number(entry.standardFare || 0),
    }]);

    // load route stops if routeId available
    if (entry.routeId) {
      getRouteStops(entry.routeId)
        .then(stops => {
          const sorted = (stops || []).slice().sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));
          setRouteStops(sorted);
        })
        .catch(() => setRouteStops([]));
    } else {
      setRouteStops([]);
    }

    setBookingStep('details');
    setBookingResult(null);
    setBookModalVisible(true);
  }

  function updatePassenger(index, field, value) {
    setPassengers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      // update fare when selecting destination stop
      if (field === 'routeStopId') {
        const routeStop = routeStops.find(s => s.id === value);
        const fare = routeStop ? Number(routeStop.fareFromOrigin || 0) : Number(selectedQueueEntry?.standardFare || 0);
        copy[index] = { ...copy[index], fare, destination: routeStop?.stopName || selectedQueueEntry?.destinationStation || '' };
      }
      if (field === 'destination' && !routeStops.length) {
        copy[index] = { ...copy[index], fare: Number(selectedQueueEntry?.standardFare || 0) };
      }
      return copy;
    });
  }

  function addLoggedInAsPassenger() {
    if (!user) return;
    const existing = passengers.some(p => p.name === (user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim()));
    if (existing) return;

    const defaultDest = selectedQueueEntry?.destinationStation || (routeStops[routeStops.length - 1]?.stopName || '');
    const autoFare = selectedQueueEntry?.standardFare ? Number(selectedQueueEntry.standardFare) : 0;

    setPassengers(prev => [...prev, {
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      contactNumber: user.phoneNumber || '',
      email: user.email || '',
      destination: defaultDest,
      routeStopId: null,
      fare: autoFare,
    }]);
  }

  const calculatePassengerFare = (p) => {
    if (p.fare != null) return Number(p.fare);
    if (p.routeStopId) {
      const stop = routeStops.find(s => s.id === p.routeStopId);
      if (stop) return Number(stop.fareFromOrigin || 0);
    }
    return Number(selectedQueueEntry?.standardFare || 0);
  };

  const totalFare = passengers.reduce((sum, p) => sum + calculatePassengerFare(p), 0);

  function addPassengerRow() {
    const max = selectedQueueEntry?.seatsAvailable || 4;
    if (passengers.length >= max) {
      Alert.alert('Maximum Reached', `Only ${max} seat(s) available`);
      return;
    }
    const firstStop = routeStops[0];
    const destination = firstStop ? firstStop.stopName : (selectedQueueEntry?.destinationStation || '');
    const fare = firstStop ? Number(firstStop.fareFromOrigin || 0) : Number(selectedQueueEntry?.standardFare || 0);
    setPassengers(prev => [...prev, { name: '', contactNumber: '', email: '', destination, routeStopId: firstStop?.id || 'destination', fare }]);
    setSeatCount(String(passengers.length + 1));
  }

  function removePassengerRow(index) {
    if (passengers.length <= 1) return;
    setPassengers(prev => prev.filter((_, i) => i !== index));
    setSeatCount(String(passengers.length - 1));
  }

  async function handleBookSeats() {
    const validPassengers = passengers.filter(p => p.name.trim());
    if (validPassengers.length === 0) {
      Alert.alert('Required', 'Please enter at least one passenger name');
      return;
    }

    setSubmitting(true);
    try {
      const total = validPassengers.reduce((sum, p) => sum + calculatePassengerFare(p), 0);
      const result = await createQueueBooking({
        userId,
        queueEntryId: selectedQueueEntry.id,
        seatsBooked: validPassengers.length,
        paymentMethod: 'EFT',
        totalFare: total,
        passengers: validPassengers.map(p => ({
          name: p.name.trim(),
          contactNumber: p.contactNumber.trim(),
          email: p.email.trim() || null,
          destination: p.destination?.trim() || selectedQueueEntry?.destinationStation || null,
          fare: calculatePassengerFare(p),
        })),
      });
      setBookingResult(result);
      setBookingStep('eft');
    } catch (err) {
      Alert.alert('Booking Failed', err?.response?.data?.message || err?.message || 'Failed to book seats');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmEft() {
    if (!bookingResult?.id) return;
    setSubmitting(true);
    try {
      await confirmQueuePayment(bookingResult.id, `EFT-${Date.now()}`);
      setBookingStep('confirmation');
      loadData(true);
      if (selectedRankId) {
        fetchLiveQueue(selectedRankId)
          .then(data => setQueue(data || []))
          .catch(() => {});
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelBooking(booking) {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive', onPress: async () => {
          try {
            await cancelQueueBooking(booking.id, 'Cancelled by rider');
            loadData(true);
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Cancel failed');
          }
        },
      },
    ]);
  }

  function copyToClipboard(text) {
    if (Clipboard?.setString) {
      Clipboard.setString(text);
      Alert.alert('Copied', 'Copied to clipboard');
    }
  }

  // ===== RENDER =====
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading live queues...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ===== HEADER ===== */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Live Queue</Text>
          <Text style={styles.headerSub}>View queues & book seats</Text>
        </View>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'bookings' && styles.tabBtnActive]}
          onPress={() => setActiveTab(activeTab === 'queue' ? 'bookings' : 'queue')}
        >
          <Ionicons name={activeTab === 'queue' ? 'ticket-outline' : 'list-outline'} size={18} color={activeTab === 'bookings' ? GOLD : '#fff'} />
          <Text style={[styles.tabBtnText, activeTab === 'bookings' && { color: GOLD }]}>
            {activeTab === 'queue' ? 'My Bookings' : 'Queue'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ===== RANK SELECTOR ===== */}
      {activeTab === 'queue' && (
        <TouchableOpacity
          style={[styles.rankSelector, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => setRankPickerVisible(true)}
        >
          <Ionicons name="business-outline" size={18} color={GOLD} />
          <Text style={[styles.rankSelectorText, { color: c.text }]} numberOfLines={1}>
            {selectedRank?.name || 'Select Taxi Rank'}
          </Text>
          <View style={styles.rankSelectorBadge}>
            <Text style={styles.rankSelectorBadgeText}>{queue.length}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>
      )}

      {/* ===== BODY ===== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
      >
        {activeTab === 'queue' ? renderQueue() : renderMyBookings()}
      </ScrollView>

      {/* ===== RANK PICKER MODAL ===== */}
      <Modal visible={rankPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: c.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: c.text }]}>Select Taxi Rank</Text>
              <TouchableOpacity onPress={() => setRankPickerVisible(false)}>
                <Ionicons name="close-circle" size={26} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {ranks.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No ranks with active queues</Text>
              ) : ranks.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pickerItem, r.id === selectedRankId && { backgroundColor: GOLD_LIGHT, borderColor: GOLD }]}
                  onPress={() => { setSelectedRankId(r.id); setRankPickerVisible(false); }}
                >
                  <Ionicons name="business" size={18} color={r.id === selectedRankId ? GOLD : c.textMuted} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.pickerItemTitle, { color: c.text }]}>{r.name}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>{[r.city, r.province].filter(Boolean).join(', ')}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: GOLD_LIGHT }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: GOLD }}>{r.activeVehicles} taxis</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== BOOKING MODAL ===== */}
      <Modal visible={bookModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.bookCard, { backgroundColor: c.surface }]}>
            {bookingStep === 'details' && renderBookingDetails()}
            {bookingStep === 'eft' && renderEftPayment()}
            {bookingStep === 'confirmation' && renderConfirmation()}
          </View>
        </View>
      </Modal>
    </View>
  );

  // ===== QUEUE LIST =====
  function renderQueue() {
    if (!selectedRankId) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="business-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>Select a taxi rank</Text>
          <Text style={[styles.emptySub, { color: c.textMuted }]}>Choose a rank to see live queues</Text>
        </View>
      );
    }

    if (queue.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="car-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No vehicles in queue</Text>
          <Text style={[styles.emptySub, { color: c.textMuted }]}>Check back later or try another rank</Text>
        </View>
      );
    }

    return queue.map((entry, idx) => {
      const available = entry.seatsAvailable || 0;
      const isFull = available <= 0;
      return (
        <View key={entry.id} style={[styles.queueCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {/* Position badge */}
          <View style={styles.queueCardTop}>
            <View style={[styles.posBadge, { backgroundColor: idx === 0 ? GOLD : c.background }]}>
              <Text style={[styles.posBadgeText, { color: idx === 0 ? '#000' : c.text }]}>#{entry.queuePosition}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.queueReg, { color: c.text }]}>{entry.vehicleRegistration || 'Unknown'}</Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>
                {[entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ')} · {entry.driverName || 'No driver'}
              </Text>
            </View>
            <View style={[styles.seatsBadge, { backgroundColor: isFull ? RED + '15' : GREEN + '15' }]}>
              <Ionicons name="people" size={13} color={isFull ? RED : GREEN} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: isFull ? RED : GREEN, marginLeft: 4 }}>
                {available} seat{available !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Route info */}
          {entry.routeName && (
            <View style={styles.queueRoute}>
              <Ionicons name="navigate-outline" size={13} color={BLUE} />
              <Text style={{ fontSize: 12, color: BLUE, fontWeight: '600', marginLeft: 4 }}>{entry.routeName}</Text>
              {entry.standardFare > 0 && (
                <Text style={{ fontSize: 12, color: GREEN, fontWeight: '700', marginLeft: 'auto' }}>R{Number(entry.standardFare).toFixed(2)}</Text>
              )}
            </View>
          )}

          {/* Meta row */}
          <View style={styles.queueMeta}>
            {entry.estimatedDepartureTime && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={11} color="#f59e0b" />
                <Text style={{ fontSize: 11, color: '#f59e0b', marginLeft: 3 }}>
                  ETD {new Date(entry.estimatedDepartureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Ionicons name="car-outline" size={11} color={c.textMuted} />
              <Text style={{ fontSize: 11, color: c.textMuted, marginLeft: 3 }}>{entry.vehicleCapacity} capacity</Text>
            </View>
          </View>

          {/* Book button */}
          {!isFull && (
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => openBookModal(entry)}
              activeOpacity={0.85}
            >
              <Ionicons name="ticket" size={16} color="#000" />
              <Text style={styles.bookBtnText}>Book Seat{available > 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          )}
          {isFull && (
            <View style={[styles.bookBtn, { backgroundColor: c.border, opacity: 0.6 }]}>
              <Text style={[styles.bookBtnText, { color: c.textMuted }]}>Full</Text>
            </View>
          )}
        </View>
      );
    });
  }

  // ===== BOOKING DETAILS STEP =====
  function renderBookingDetails() {
    const entry = selectedQueueEntry;
    if (!entry) return null;

    const destinations = [
      ...(routeStops || []).map(s => ({ id: s.id, label: s.stopName, fare: Number(s.fareFromOrigin || 0) })),
      { id: 'destination', label: entry.destinationStation || 'Destination', fare: Number(entry.standardFare || 0) },
    ];
    const total = totalFare;

    return (
      <>
        <View style={styles.bookHeader}>
          <View>
            <Text style={[styles.bookTitle, { color: c.text }]}>Book Seats</Text>
            <Text style={{ fontSize: 12, color: c.textMuted }}>{entry.vehicleRegistration} · {entry.routeName || 'Route'}</Text>
          </View>
          <TouchableOpacity onPress={() => setBookModalVisible(false)}>
            <Ionicons name="close-circle" size={28} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <TouchableOpacity
            style={[styles.addMeBtn, { borderColor: c.border, backgroundColor: includeMe ? '#dce5ff' : c.surface }]}
            onPress={() => {
              setIncludeMe(prev => !prev);
              if (!includeMe) addLoggedInAsPassenger();
            }}
          >
            <Ionicons name={includeMe ? 'person-circle' : 'person-add'} size={18} color={includeMe ? GREEN : c.text} />
            <Text style={[styles.addMeText, { color: includeMe ? GREEN : c.text }]}>Add me as a passenger</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
          {/* Route summary */}
          <View style={[styles.routeSummary, { backgroundColor: BLUE + '08', borderColor: BLUE + '30' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="navigate" size={14} color={BLUE} />
              <Text style={{ fontSize: 13, color: BLUE, fontWeight: '600', marginLeft: 6 }}>
                {entry.departureStation || 'Origin'} → {entry.destinationStation || 'Destination'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>
              Standard fare: R{Number(entry.standardFare || 0).toFixed(2)} · {entry.seatsAvailable} available
            </Text>
          </View>

          {/* Passengers */}
          {passengers.map((p, i) => {
            const passengerFare = calculatePassengerFare(p);
            return (
              <View key={i} style={[styles.paxCard, { borderColor: c.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.paxLabel, { color: c.text }]}>Passenger {i + 1}</Text>
                {passengers.length > 1 && (
                  <TouchableOpacity onPress={() => removePassengerRow(i)}>
                    <Ionicons name="remove-circle" size={20} color={RED} />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[styles.paxInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={p.name}
                onChangeText={v => updatePassenger(i, 'name', v)}
                placeholder="Full name *"
                placeholderTextColor={c.textMuted}
              />
              <TextInput
                style={[styles.paxInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={p.contactNumber}
                onChangeText={v => updatePassenger(i, 'contactNumber', v)}
                placeholder="Phone number *"
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.paxInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={p.email}
                onChangeText={v => updatePassenger(i, 'email', v)}
                placeholder="Email (optional)"
                placeholderTextColor={c.textMuted}
                keyboardType="email-address"
              />

              <View style={[styles.paxInput, { padding: 0, marginTop: 8, backgroundColor: c.background, borderColor: c.border }]}> 
                <Picker
                  selectedValue={p.routeStopId || 'destination'}
                  onValueChange={(val) => updatePassenger(i, 'routeStopId', val)}
                  style={{ color: c.text, height: 44 }}
                >
                  {(routeStops || []).map(stop => (
                    <Picker.Item key={stop.id} label={`${stop.stopName} (R${Number(stop.fareFromOrigin || 0).toFixed(2)})`} value={stop.id} />
                  ))}
                  <Picker.Item key="destination" label={`${entry.destinationStation || 'Destination'} (R${Number(entry.standardFare || 0).toFixed(2)})`} value="destination" />
                </Picker>
              </View>

              <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: c.textMuted }}>Fare</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: GREEN }}>R{passengerFare.toFixed(2)}</Text>
              </View>
            </View>
          );
          })}

          {passengers.length < (entry.seatsAvailable || 4) && (
            <TouchableOpacity style={[styles.addPaxBtn, { borderColor: GOLD }]} onPress={addPassengerRow}>
              <Ionicons name="add-circle-outline" size={16} color={GOLD} />
              <Text style={{ fontSize: 13, color: GOLD, fontWeight: '600', marginLeft: 6 }}>Add Another Passenger</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.bookFooter, { borderColor: c.border }]}>
          <View>
            <Text style={{ fontSize: 12, color: c.textMuted }}>{passengers.length} seat(s)</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: GREEN }}>R{total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.payBtn, submitting && { opacity: 0.6 }]}
            onPress={handleBookSeats}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="card-outline" size={16} color="#000" />
                <Text style={styles.payBtnText}>Pay via EFT</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // ===== EFT PAYMENT STEP =====
  function renderEftPayment() {
    const eft = bookingResult?.eftDetails;
    if (!eft) return null;

    return (
      <>
        <View style={styles.bookHeader}>
          <View>
            <Text style={[styles.bookTitle, { color: c.text }]}>EFT Payment Details</Text>
            <Text style={{ fontSize: 12, color: c.textMuted }}>Transfer the amount below via EFT</Text>
          </View>
          <TouchableOpacity onPress={() => setBookModalVisible(false)}>
            <Ionicons name="close-circle" size={28} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Amount */}
          <View style={[styles.eftAmountCard, { backgroundColor: GREEN + '10' }]}>
            <Text style={{ fontSize: 13, color: GREEN, fontWeight: '600' }}>Amount to Pay</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: GREEN, marginTop: 4 }}>
              R{Number(bookingResult.totalFare).toFixed(2)}
            </Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              {bookingResult.seatsBooked} seat(s) · R{Number(bookingResult.farePerSeat).toFixed(2)} each
            </Text>
          </View>

          {/* Banking details */}
          <View style={[styles.eftCard, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.eftCardTitle, { color: c.text }]}>Banking Details</Text>

            <EftRow label="Account Name" value={eft.accountName} c={c} onCopy={() => copyToClipboard(eft.accountName)} />
            <EftRow label="Bank" value={eft.bank} c={c} onCopy={() => copyToClipboard(eft.bank)} />
            <EftRow label="Account Number" value={eft.accountNumber} c={c} onCopy={() => copyToClipboard(eft.accountNumber)} />
            <EftRow label="Branch Code" value={eft.branchCode} c={c} onCopy={() => copyToClipboard(eft.branchCode)} />

            <View style={[styles.eftRefRow, { backgroundColor: GOLD_LIGHT, borderColor: GOLD }]}>
              <View>
                <Text style={{ fontSize: 11, color: GOLD, fontWeight: '600' }}>PAYMENT REFERENCE</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: GOLD, marginTop: 2 }}>{eft.reference}</Text>
              </View>
              <TouchableOpacity onPress={() => copyToClipboard(eft.reference)} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={16} color={GOLD} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, color: RED, marginTop: 10, textAlign: 'center' }}>
              ⚠️ Use the reference above so we can match your payment
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.bookFooter, { borderColor: c.border }]}>
          <TouchableOpacity
            style={[styles.payBtn, { flex: 1 }, submitting && { opacity: 0.6 }]}
            onPress={handleConfirmEft}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#000" />
                <Text style={styles.payBtnText}>I've Made the Payment</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // ===== CONFIRMATION STEP =====
  function renderConfirmation() {
    return (
      <>
        <View style={{ alignItems: 'center', padding: 24 }}>
          <View style={[styles.confirmIcon, { backgroundColor: GREEN + '15' }]}>
            <Ionicons name="checkmark-circle" size={48} color={GREEN} />
          </View>
          <Text style={[styles.confirmTitle, { color: c.text }]}>Booking Confirmed!</Text>
          <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 8 }}>
            Your payment confirmation has been received. Your seat(s) are reserved.
          </Text>

          {bookingResult && (
            <View style={[styles.confirmCard, { backgroundColor: c.background, borderColor: c.border }]}>
              <ConfirmRow label="Reference" value={bookingResult.paymentReference} c={c} />
              <ConfirmRow label="Vehicle" value={bookingResult.vehicleRegistration} c={c} />
              <ConfirmRow label="Route" value={bookingResult.routeName || `${bookingResult.departureStation} → ${bookingResult.destinationStation}`} c={c} />
              <ConfirmRow label="Seats" value={String(bookingResult.seatsBooked)} c={c} />
              <ConfirmRow label="Total" value={`R${Number(bookingResult.totalFare).toFixed(2)}`} c={c} bold />
            </View>
          )}

          <TouchableOpacity
            style={[styles.payBtn, { marginTop: 16, paddingHorizontal: 32 }]}
            onPress={() => { setBookModalVisible(false); setActiveTab('bookings'); loadData(true); }}
            activeOpacity={0.85}
          >
            <Text style={styles.payBtnText}>View My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 12 }}
            onPress={() => setBookModalVisible(false)}
          >
            <Text style={{ fontSize: 13, color: c.textMuted }}>Close</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // ===== MY BOOKINGS TAB =====
  function renderMyBookings() {
    if (myBookings.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="ticket-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No bookings yet</Text>
          <Text style={[styles.emptySub, { color: c.textMuted }]}>Book a seat on the queue tab</Text>
        </View>
      );
    }

    return myBookings.map(b => {
      const sc = STATUS_COLORS[b.status] || STATUS_COLORS.Pending;
      return (
        <View key={b.id} style={[styles.bookingCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: sc.text }}>{b.status}</Text>
            </View>
            <Text style={{ fontSize: 11, color: c.textMuted }}>{new Date(b.createdAt).toLocaleDateString()}</Text>
          </View>

          <Text style={[styles.bookingRoute, { color: c.text }]}>
            {b.routeName || `${b.departureStation || '?'} → ${b.destinationStation || '?'}`}
          </Text>
          <Text style={{ fontSize: 12, color: c.textMuted }}>{b.vehicleRegistration} · {b.taxiRankName}</Text>

          <View style={styles.bookingMeta}>
            <View style={styles.bookingMetaItem}>
              <Ionicons name="people-outline" size={13} color={c.textMuted} />
              <Text style={{ fontSize: 12, color: c.textMuted, marginLeft: 4 }}>{b.seatsBooked} seat(s)</Text>
            </View>
            <View style={styles.bookingMetaItem}>
              <Ionicons name="cash-outline" size={13} color={GREEN} />
              <Text style={{ fontSize: 12, color: GREEN, fontWeight: '700', marginLeft: 4 }}>R{Number(b.totalFare).toFixed(2)}</Text>
            </View>
            <View style={styles.bookingMetaItem}>
              <Ionicons name="card-outline" size={13} color={BLUE} />
              <Text style={{ fontSize: 12, color: BLUE, marginLeft: 4 }}>{b.paymentMethod}</Text>
            </View>
          </View>

          {b.paymentReference && (
            <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>Ref: {b.paymentReference}</Text>
          )}

          {b.passengers?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {b.passengers.map((p, pi) => (
                <Text key={p.id || pi} style={{ fontSize: 11, color: c.textMuted }}>
                  {pi + 1}. {p.name} {p.contactNumber ? `(${p.contactNumber})` : ''}
                </Text>
              ))}
            </View>
          )}

          {(b.status === 'Pending' || b.status === 'Confirmed') && (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: RED }]}
              onPress={() => handleCancelBooking(b)}
            >
              <Ionicons name="close-circle-outline" size={14} color={RED} />
              <Text style={{ fontSize: 12, color: RED, fontWeight: '600', marginLeft: 4 }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    });
  }
}

// ===== HELPER COMPONENTS =====
function EftRow({ label, value, c, onCopy }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
      <Text style={{ fontSize: 12, color: c.textMuted }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{value}</Text>
        {onCopy && (
          <TouchableOpacity onPress={onCopy} style={{ marginLeft: 8 }}>
            <Ionicons name="copy-outline" size={14} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function ConfirmRow({ label, value, c, bold }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontSize: 12, color: c.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: bold ? '800' : '600', color: bold ? '#198754' : c.text }}>{value}</Text>
    </View>
  );
}

const STATUS_COLORS = {
  Pending: { bg: 'rgba(255,193,7,0.12)', text: '#cc9a00' },
  Confirmed: { bg: 'rgba(25,135,84,0.12)', text: '#198754' },
  Cancelled: { bg: 'rgba(220,53,69,0.12)', text: '#dc3545' },
  Completed: { bg: 'rgba(13,110,253,0.12)', text: '#0d6efd' },
  Expired: { bg: 'rgba(108,117,125,0.12)', text: '#6c757d' },
};

// ===== STYLES =====
function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14 },

    // Header
    header: {
      backgroundColor: '#1a1a2e',
      paddingHorizontal: 16, paddingBottom: 14,
      flexDirection: 'row', alignItems: 'center',
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    tabBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    tabBtnActive: { backgroundColor: 'rgba(212,175,55,0.15)' },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },

    // Rank selector
    rankSelector: {
      flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0,
      padding: 12, borderRadius: 12, borderWidth: 1, gap: 8,
    },
    rankSelectorText: { flex: 1, fontSize: 14, fontWeight: '600' },
    rankSelectorBadge: {
      backgroundColor: '#D4AF37', borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    rankSelectorBadgeText: { fontSize: 11, fontWeight: '700', color: '#000' },

    // Queue cards
    queueCard: {
      borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12,
    },
    queueCardTop: { flexDirection: 'row', alignItems: 'center' },
    posBadge: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    posBadgeText: { fontSize: 14, fontWeight: '800' },
    queueReg: { fontSize: 15, fontWeight: '700' },
    seatsBadge: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    queueRoute: {
      flexDirection: 'row', alignItems: 'center',
      marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
    },
    queueMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    metaChip: { flexDirection: 'row', alignItems: 'center' },
    bookBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#D4AF37', borderRadius: 10, paddingVertical: 10, marginTop: 10, gap: 6,
    },
    bookBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

    // Empty states
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
    emptySub: { fontSize: 13, marginTop: 4 },
    emptyText: { textAlign: 'center', padding: 24, fontSize: 14 },

    // Picker modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    pickerCard: {
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 16, maxHeight: '70%',
    },
    pickerHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12,
    },
    pickerTitle: { fontSize: 18, fontWeight: '700' },
    pickerItem: {
      flexDirection: 'row', alignItems: 'center',
      padding: 12, borderRadius: 10, borderWidth: 1,
      borderColor: 'transparent', marginBottom: 6,
    },
    pickerItemTitle: { fontSize: 14, fontWeight: '600' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },

    // Booking modal
    bookCard: {
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 16, maxHeight: '85%',
    },
    bookHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12, paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    },
    bookTitle: { fontSize: 18, fontWeight: '700' },
    routeSummary: {
      padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12,
    },
    paxCard: {
      borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8,
    },
    paxLabel: { fontSize: 13, fontWeight: '700' },
    paxInput: {
      borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
      fontSize: 14, marginTop: 6,
    },
    addPaxBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderStyle: 'dashed', borderRadius: 10,
      paddingVertical: 10, marginTop: 4,
    },
    addMeBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderRadius: 10, paddingVertical: 10, marginBottom: 10,
      gap: 8,
    },
    addMeText: {
      fontSize: 13, fontWeight: '700', marginLeft: 6,
    },
    bookFooter: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 12, borderTopWidth: 1,
    },
    payBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#D4AF37', borderRadius: 10,
      paddingHorizontal: 20, paddingVertical: 12,
    },
    payBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

    // EFT payment
    eftAmountCard: {
      padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12,
    },
    eftCard: {
      padding: 14, borderRadius: 12, borderWidth: 1,
    },
    eftCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
    eftRefRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12,
    },
    copyBtn: {
      padding: 6, borderRadius: 8, backgroundColor: 'rgba(212,175,55,0.1)',
    },

    // Confirmation
    confirmIcon: {
      width: 80, height: 80, borderRadius: 40,
      alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    confirmTitle: { fontSize: 22, fontWeight: '800' },
    confirmCard: {
      width: '100%', padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 16,
    },

    // My Bookings
    bookingCard: {
      borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12,
    },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    bookingRoute: { fontSize: 15, fontWeight: '700', marginTop: 8 },
    bookingMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
    bookingMetaItem: { flexDirection: 'row', alignItems: 'center' },
    cancelBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderRadius: 8, paddingVertical: 8, marginTop: 10,
    },
  });
}
