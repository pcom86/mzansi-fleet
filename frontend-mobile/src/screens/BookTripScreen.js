import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { fetchAvailableSchedules, createTripBooking } from '../api/taxiRanks';
import VoiceRecorderButton from '../components/VoiceRecorderButton';
import AIService from '../services/AIService';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDate(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getDayAbbr(d) {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

export default function BookTripScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(false);

  // Booking form
  const [travelDate, setTravelDate] = useState('');
  const [seats, setSeats] = useState('1');
  const [passengerName, setPassengerName] = useState(user?.fullName || '');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Voice command state
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const aiService = new AIService();

  // Handle voice command result
  async function handleVoiceCommand(audioBlob) {
    setVoiceProcessing(true);
    try {
      const result = await aiService.processVoiceCommand(audioBlob);
      if (!result || !result.action) {
        Alert.alert('Voice Command', 'Sorry, I could not understand your command.');
        return;
      }
      if (result.action === 'book_trip') {
        // Example: "Book a trip to [destination] on [date] for [n] passengers"
        // You may want to parse parameters more robustly depending on backend
        if (schedules.length > 0) {
          // Try to find a matching schedule by destination if provided
          let schedule = schedules[0];
          if (result.parameters && result.parameters.destination) {
            schedule = schedules.find(s => (s.destinationStation || '').toLowerCase().includes(result.parameters.destination.toLowerCase())) || schedules[0];
          }
          openBooking(schedule);
          // Optionally pre-fill form fields
          if (result.parameters) {
            if (result.parameters.date) setTravelDate(result.parameters.date);
            if (result.parameters.seats) setSeats(String(result.parameters.seats));
            if (result.parameters.name) setPassengerName(result.parameters.name);
          }
        }
      } else if (result.action === 'add_passenger') {
        // Example: "Add passenger John Doe"
        if (result.parameters && result.parameters.name) {
          setPassengerName(result.parameters.name);
          Alert.alert('Voice Command', `Passenger name set to ${result.parameters.name}`);
        }
      } else {
        Alert.alert('Voice Command', `Recognized action: ${result.action}`);
      }
    } catch (err) {
      Alert.alert('Voice Command Error', err.message || 'Failed to process voice command.');
    } finally {
      setVoiceProcessing(false);
    }
  }

  // Generate next 7 available dates for the selected schedule
  const [availableDates, setAvailableDates] = useState([]);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const resp = await fetchAvailableSchedules();
      setSchedules(resp.data || resp || []);
    } catch (err) {
      console.warn('Load schedules error', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  function openBooking(schedule) {
    setSelected(schedule);
    setPassengerName(user?.fullName || '');
    setSeats('1');
    setNotes('');
    setTravelDate('');

    // Calculate next 7 valid dates based on schedule's daysOfWeek
    const days = (schedule.daysOfWeek || '').split(',').map(d => d.trim());
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30 && dates.length < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const abbr = getDayAbbr(d);
      if (days.length === 0 || days.includes(abbr)) {
        dates.push(d);
      }
    }
    setAvailableDates(dates);
    if (dates.length > 0) setTravelDate(dates[0].toISOString());
    setModalVisible(true);
  }

  async function handleBook() {
    if (!selected) return;
    if (!travelDate) return Alert.alert('Validation', 'Please select a travel date');
    if (!passengerName.trim()) return Alert.alert('Validation', 'Passenger name is required');

    // Check minimum booking lead time (must be at least 1 hour before departure)
    const MIN_BOOKING_LEAD_MINUTES = 60;
    if (selected.departureTime && travelDate) {
      const [hh, mm] = (selected.departureTime || '00:00').split(':').map(Number);
      const depDate = new Date(travelDate);
      depDate.setHours(hh, mm, 0, 0);
      const minutesUntilDeparture = (depDate.getTime() - Date.now()) / 60000;
      if (minutesUntilDeparture < MIN_BOOKING_LEAD_MINUTES) {
        const hours = MIN_BOOKING_LEAD_MINUTES / 60;
        return Alert.alert('Too Late to Book', `Bookings must be made at least ${hours} hour(s) before departure time (${selected.departureTime}).`);
      }
    }

    const body = {
      userId: user?.userId || user?.id,
      tripScheduleId: selected.id,
      travelDate: travelDate,
      seatsBooked: parseInt(seats, 10) || 1,
      passengerName: passengerName.trim(),
      passengerPhone: passengerPhone.trim(),
      notes: notes.trim() || null,
    };

    setBooking(true);
    try {
      await createTripBooking(body);
      setModalVisible(false);
      Alert.alert('Booking Confirmed!', `Your trip on ${selected.routeName} has been booked for ${formatDate(new Date(travelDate))}.`, [
        { text: 'View My Bookings', onPress: () => navigation.navigate('MyBookings') },
        { text: 'OK' },
      ]);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Booking failed';
      Alert.alert('Error', msg);
    } finally {
      setBooking(false);
    }
  }

  const totalFare = selected ? (selected.standardFare * (parseInt(seats, 10) || 1)) : 0;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Finding available trips…</Text>
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
          <Text style={styles.headerTitle}>Book a Trip</Text>
          <Text style={styles.headerSub}>Browse scheduled routes & book in advance</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MyBookings')} style={styles.historyBtn}>
          <Ionicons name="receipt-outline" size={20} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* Voice Command Button */}
      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <VoiceRecorderButton onRecordingComplete={handleVoiceCommand} />
        {voiceProcessing && <Text style={{ color: c.textMuted, marginTop: 6 }}>Processing voice command…</Text>}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
      >
        {schedules.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="bus-outline" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>No scheduled trips available</Text>
            <Text style={[styles.emptyHint, { color: c.textMuted }]}>Check back later for new routes</Text>
          </View>
        ) : (
          schedules.map((s) => (
            <TouchableOpacity key={s.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => openBooking(s)} activeOpacity={0.85}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: GOLD_LIGHT }]}> 
                  <Ionicons name="bus-outline" size={22} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: c.text }]}>{s.routeName}</Text>
                  <Text style={[styles.cardRoute, { color: c.textMuted }]}> 
                    {s.departureStation} → {s.destinationStation}
                  </Text>
                </View>
                <View style={styles.fareBox}>
                  <Text style={styles.fareLabel}>R{s.standardFare}</Text>
                </View>
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
          ))
        )}
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Book Trip</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Route summary */}
              {selected && (
                <View style={[styles.routeSummary, { backgroundColor: GOLD_LIGHT, borderColor: c.border }]}>
                  <Text style={[styles.routeSumTitle, { color: c.text }]}>{selected.routeName}</Text>
                  <Text style={[styles.routeSumRoute, { color: c.textMuted }]}>
                    {selected.departureStation} → {selected.destinationStation}
                  </Text>
                  <Text style={[styles.routeSumMeta, { color: c.textMuted }]}>
                    Departs {selected.departureTime} · {selected.taxiRankName}
                  </Text>
                </View>
              )}

              {/* Date selection */}
              <Text style={[styles.label, { color: c.textMuted }]}>Select Travel Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {availableDates.map((d) => {
                  const iso = d.toISOString();
                  const isSelected = travelDate === iso;
                  return (
                    <TouchableOpacity
                      key={iso}
                      style={[styles.dateChip, isSelected && styles.dateChipActive, { borderColor: c.border }]}
                      onPress={() => setTravelDate(iso)}
                    >
                      <Text style={[styles.dateDay, isSelected && styles.dateDayActive, { color: isSelected ? '#000' : c.textMuted }]}>{getDayAbbr(d)}</Text>
                      <Text style={[styles.dateNum, isSelected && styles.dateNumActive, { color: isSelected ? '#000' : c.text }]}>{d.getDate()}</Text>
                      <Text style={[styles.dateMonth, isSelected && styles.dateMonthActive, { color: isSelected ? '#000' : c.textMuted }]}>
                        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Seats */}
              <Text style={[styles.label, { color: c.textMuted }]}>Number of Seats</Text>
              <View style={styles.seatsRow}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.seatBtn, parseInt(seats, 10) === n && styles.seatBtnActive]}
                    onPress={() => setSeats(String(n))}
                  >
                    <Text style={[styles.seatText, parseInt(seats, 10) === n && styles.seatTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Passenger info */}
              <Text style={[styles.label, { color: c.textMuted }]}>Passenger Name</Text>
              <TextInput
                value={passengerName} onChangeText={setPassengerName}
                style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                placeholderTextColor={c.textMuted} placeholder="Your name"
              />

              <Text style={[styles.label, { color: c.textMuted }]}>Phone Number</Text>
              <TextInput
                value={passengerPhone} onChangeText={setPassengerPhone}
                style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                placeholderTextColor={c.textMuted} placeholder="e.g. 072 123 4567" keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: c.textMuted }]}>Notes (optional)</Text>
              <TextInput
                value={notes} onChangeText={setNotes}
                style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, minHeight: 50 }]}
                placeholderTextColor={c.textMuted} placeholder="Special requests" multiline
              />

              {/* Fare summary */}
              <View style={[styles.fareSummary, { borderColor: c.border }]}>
                <View style={styles.fareRow}>
                  <Text style={[styles.fareLabel2, { color: c.textMuted }]}>Fare per seat</Text>
                  <Text style={[styles.fareVal, { color: c.text }]}>R{selected?.standardFare || 0}</Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={[styles.fareLabel2, { color: c.textMuted }]}>Seats</Text>
                  <Text style={[styles.fareVal, { color: c.text }]}>× {parseInt(seats, 10) || 1}</Text>
                </View>
                <View style={[styles.fareRow, styles.fareTotalRow]}>
                  <Text style={[styles.fareTotalLabel, { color: c.text }]}>Total</Text>
                  <Text style={styles.fareTotalVal}>R{totalFare.toFixed(2)}</Text>
                </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { marginTop: 8, fontSize: 13 },

  header: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  historyBtn: { padding: 6, backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: 10 },

  listContent: { padding: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 12 },

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

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalBody: { padding: 16, paddingBottom: 40 },

  routeSummary: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  routeSumTitle: { fontSize: 15, fontWeight: '800' },
  routeSumRoute: { fontSize: 12, marginTop: 2 },
  routeSumMeta: { fontSize: 11, marginTop: 4 },

  label: { fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },

  dateChip: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, minWidth: 56 },
  dateChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  dateDay: { fontSize: 10, fontWeight: '700' },
  dateDayActive: { color: '#000' },
  dateNum: { fontSize: 18, fontWeight: '900', marginVertical: 2 },
  dateNumActive: { color: '#000' },
  dateMonth: { fontSize: 10, fontWeight: '600' },
  dateMonthActive: { color: '#000' },

  seatsRow: { flexDirection: 'row', gap: 8 },
  seatBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  seatBtnActive: { backgroundColor: GOLD },
  seatText: { fontSize: 16, fontWeight: '800', color: '#999' },
  seatTextActive: { color: '#000' },

  fareSummary: { borderTopWidth: 1, marginTop: 16, paddingTop: 12, gap: 6 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fareLabel2: { fontSize: 13 },
  fareVal: { fontSize: 13, fontWeight: '600' },
  fareTotalRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  fareTotalLabel: { fontSize: 15, fontWeight: '800' },
  fareTotalVal: { fontSize: 18, fontWeight: '900', color: GOLD },

  bookBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  bookBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },
});
