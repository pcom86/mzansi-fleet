import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { fetchUserBookings, cancelTripBooking, updateTripBooking } from '../api/taxiRanks';
import { fetchUserQueueBookings, cancelQueueBooking } from '../api/queueBooking';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function fmtTimeSpan(ts) {
  if (!ts) return '';
  const parts = ts.toString().split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${suffix}`;
  }
  return ts;
}

const STATUS_COLORS = {
  Confirmed: { bg: 'rgba(25,135,84,0.12)', text: '#198754' },
  Pending: { bg: 'rgba(255,193,7,0.12)', text: '#cc9a00' },
  Cancelled: { bg: 'rgba(220,53,69,0.12)', text: '#dc3545' },
  Completed: { bg: 'rgba(13,110,253,0.12)', text: '#0d6efd' },
  NoShow: { bg: 'rgba(108,117,125,0.12)', text: '#6c757d' },
};

export default function MyBookingsScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [queueBookings, setQueueBookings] = useState([]);
  // Only show queue bookings
  const [bookingType] = useState('queue');
  const [filter, setFilter] = useState('all'); // all, upcoming, past, cancelled

  // Edit booking state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editPassengers, setEditPassengers] = useState([]);
  const [newPassenger, setNewPassenger] = useState({ name: '', contactNumber: '', email: '', destination: '' });
  const [saving, setSaving] = useState(false);

  const userId = user?.userId || user?.id;

  const loadData = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setLoading(true);
    try {
      const [scheduledResp, queueResp] = await Promise.all([
        fetchUserBookings(userId).catch(() => []),
        fetchUserQueueBookings(userId).catch(() => []),
      ]);
      setBookings(scheduledResp.data || scheduledResp || []);
      setQueueBookings(queueResp.data || queueResp || []);
    } catch (err) {
      console.warn('Load bookings error', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  async function handleCancel(booking) {
    Alert.alert('Cancel Booking', `Cancel your trip on ${fmtDate(booking.travelDate)}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive', onPress: async () => {
          try {
            await cancelTripBooking(booking.id, 'Cancelled by user');
            loadData(true);
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || err?.message || 'Cancel failed');
          }
        }
      },
    ]);
  }

  function openEditModal(booking) {
    setEditingBooking(booking);
    setEditPassengers((booking.passengers || []).map(p => ({ ...p })));
    setNewPassenger({ name: '', contactNumber: '', email: '', destination: '' });
    setEditModalVisible(true);
  }

  function closeEditModal() {
    setEditModalVisible(false);
    setEditingBooking(null);
    setEditPassengers([]);
    setNewPassenger({ name: '', contactNumber: '', email: '', destination: '' });
  }

  function updateEditPassenger(index, field, value) {
    setEditPassengers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  async function handleSaveEdit() {
    if (!editingBooking) return;
    setSaving(true);
    try {
      const updatedPassengers = editPassengers.filter(p => p.id).map(p => ({
        id: p.id,
        name: p.name,
        contactNumber: p.contactNumber,
        email: p.email || '',
        destination: p.destination || '',
      }));

      const newPassengers = editPassengers.filter(p => !p.id).map(p => ({
        name: p.name,
        contactNumber: p.contactNumber,
        email: p.email || '',
        destination: p.destination || '',
      }));

      const nextSeatBase = Math.max(...(editingBooking.seatNumbers || [0]), 0);
      const newSeatNumbers = newPassengers.map((_, i) => nextSeatBase + i + 1);

      await updateTripBooking(editingBooking.id, {
        updatedPassengers,
        newPassengers: newPassengers.length > 0 ? newPassengers : null,
        newSeatNumbers: newSeatNumbers.length > 0 ? newSeatNumbers : null,
      });

      Alert.alert('Success', 'Booking updated successfully');
      closeEditModal();
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  function addNewPassengerToEdit() {
    if (!newPassenger.name || !newPassenger.contactNumber) {
      return Alert.alert('Validation', 'Name and phone are required');
    }
    setEditPassengers(prev => [...prev, { ...newPassenger, id: null }]);
    setNewPassenger({ name: '', contactNumber: '', email: '', destination: '' });
  }

  const now = new Date();

  async function handleCancelQueueBooking(booking) {
    Alert.alert('Cancel Booking', `Cancel your queue booking at ${booking.taxiRankName || 'rank'}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive', onPress: async () => {
          try {
            await cancelQueueBooking(booking.id, 'Cancelled by user');
            loadData(true);
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || err?.message || 'Cancel failed');
          }
        }
      },
    ]);
  }

  const activeList = queueBookings;
  const totalCount = queueBookings.length;

  const filtered = activeList.filter(b => {
    const dateField = bookingType === 'queue' ? (b.queueDate || b.createdAt) : b.travelDate;
    if (filter === 'upcoming') return new Date(dateField) >= now && b.status !== 'Cancelled';
    if (filter === 'past') return new Date(dateField) < now && b.status !== 'Cancelled';
    if (filter === 'cancelled') return b.status === 'Cancelled';
    return true;
  });

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
          <View><Ionicons name="arrow-back" size={22} color="#fff" /></View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSub}>{totalCount} total booking{totalCount !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('BookTrip')} style={styles.addBtn}>
          <View><Ionicons name="add" size={22} color="#000" /></View>
        </TouchableOpacity>
      </View>

      {/* Type Toggle Removed: Only queue bookings shown */}

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'past', label: 'Past' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              No {bookingType === 'queue' ? 'queue' : 'scheduled'} bookings found
            </Text>
            {bookingType === 'scheduled' ? (
              <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('BookTrip')}>
                <Text style={styles.browseBtnText}>Browse Trips</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : bookingType === 'queue' ? (
          filtered.map((qb) => {
            const sc = STATUS_COLORS[qb.status] || STATUS_COLORS.Pending;
            const queueDate = qb.queueDate || qb.createdAt;
            const isPast = new Date(queueDate) < now;
            const canCancel = !isPast && qb.status !== 'Cancelled' && qb.status !== 'Completed' && qb.status !== 'Expired';
            const bookingRef = qb.id ? qb.id.toString().substring(0, 8).toUpperCase() : '';

            return (
              <View key={qb.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                    <View><Ionicons name="people" size={20} color="#8b5cf6" /></View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{qb.routeName || 'Queue Booking'}</Text>
                    <Text style={[styles.cardRoute, { color: c.textMuted }]}>
                      {qb.departureStation || '?'} → {qb.destinationStation || '?'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{qb.status}</Text>
                  </View>
                </View>

                {bookingRef ? (
                  <View style={[styles.refBadge, { backgroundColor: 'rgba(139,92,246,0.08)' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Booking Ref</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#8b5cf6', letterSpacing: 1 }}>{bookingRef}</Text>
                  </View>
                ) : null}

                <View style={styles.infoGrid}>
                  <InfoItem icon="calendar-outline" label="Queue Date" value={fmtDate(queueDate)} c={c} />
                  <InfoItem icon="location-outline" label="Rank" value={qb.taxiRankName || '--'} c={c} />
                  <InfoItem icon="people-outline" label="Seats" value={String(qb.seatsBooked || 0)} c={c} />
                  <InfoItem icon="cash-outline" label="Total Fare" value={`R${(qb.totalFare || 0).toFixed(2)}`} c={c} />
                  <InfoItem icon="card-outline" label="Payment" value={qb.paymentMethod || '--'} c={c} />
                  <InfoItem icon="receipt-outline" label="Pay Status" value={qb.paymentStatus || '--'} c={c} />
                  {qb.vehicleRegistration ? <InfoItem icon="car-outline" label="Vehicle" value={`${qb.vehicleRegistration}${qb.vehicleMake ? ` (${qb.vehicleMake} ${qb.vehicleModel || ''})` : ''}`} c={c} /> : null}
                  {qb.queueStatus ? <InfoItem icon="list-outline" label="Queue Status" value={qb.queueStatus} c={c} /> : null}
                </View>

                {qb.passengers && qb.passengers.length > 0 ? (
                  <View style={[styles.passengersWrap, { borderColor: c.border }]}>
                    <Text style={[styles.passengersTitle, { color: c.textMuted }]}>Passengers</Text>
                    {qb.passengers.map((p, i) => (
                      <View key={p.id || i} style={styles.passengerRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.passengerName, { color: c.text }]}>{p.name}</Text>
                          <Text style={{ fontSize: 11, color: c.textMuted }}>
                            {p.contactNumber}{p.destination ? ` → ${p.destination}` : ''}
                            {p.fare ? ` · R${p.fare.toFixed(2)}` : ''}
                          </Text>
                        </View>
                        {p.seatNumber ? (
                          <View style={[styles.seatBadge, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#8b5cf6' }}>Seat {p.seatNumber}</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {qb.notes ? (
                  <Text style={[styles.notesText, { color: c.textMuted }]}>{qb.notes}</Text>
                ) : null}

                {qb.confirmedAt ? (
                  <Text style={[styles.confirmedAt, { color: c.textMuted }]}>
                    Confirmed {fmtDate(qb.confirmedAt)} at {fmtTime(qb.confirmedAt)}
                  </Text>
                ) : null}

                {qb.paymentReference ? (
                  <View style={[styles.refBadge, { backgroundColor: GOLD_LIGHT, marginTop: 4 }]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Payment Ref</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD, letterSpacing: 1 }}>{qb.paymentReference}</Text>
                  </View>
                ) : null}

                {canCancel ? (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelQueueBooking(qb)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="close-circle-outline" size={14} color="#dc3545" />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          filtered.map((b) => {
            const sc = STATUS_COLORS[b.status] || STATUS_COLORS.Pending;
            const route = b.route;
            const rank = b.taxiRank;
            const isPast = new Date(b.travelDate) < now;
            const canCancel = !isPast && b.status !== 'Cancelled' && b.status !== 'Completed';
            const bookingRef = b.id ? b.id.toString().substring(0, 8).toUpperCase() : '';
            const vehicle = b.scheduledTrip?.vehicle;
            const canEdit = !isPast && b.status !== 'Cancelled' && b.status !== 'Completed';

            return (
              <View key={b.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: GOLD_LIGHT }]}>
                    <View><Ionicons name="ticket-outline" size={20} color={GOLD} /></View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{route?.routeName || 'Trip'}</Text>
                    <Text style={[styles.cardRoute, { color: c.textMuted }]}>
                      {route?.departureStation || '?'} → {route?.destinationStation || '?'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{b.status}</Text>
                  </View>
                </View>

                {bookingRef ? (
                  <View style={[styles.refBadge, { backgroundColor: GOLD_LIGHT }]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Booking Ref</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: GOLD, letterSpacing: 1 }}>{bookingRef}</Text>
                  </View>
                ) : null}

                <View style={styles.infoGrid}>
                  <InfoItem icon="calendar-outline" label="Date" value={fmtDate(b.travelDate)} c={c} />
                  <InfoItem icon="time-outline" label="Departure" value={fmtTimeSpan(route?.departureTime) || '--'} c={c} />
                  <InfoItem icon="people-outline" label="Seats" value={`${b.seatsBooked} (${(b.seatNumbers || []).join(', ') || '--'})`} c={c} />
                  <InfoItem icon="cash-outline" label="Total Fare" value={`R${(b.totalFare || 0).toFixed(2)}`} c={c} />
                  <InfoItem icon="card-outline" label="Payment" value={b.paymentMethod || '--'} c={c} />
                  <InfoItem icon="receipt-outline" label="Pay Status" value={b.paymentStatus || '--'} c={c} />
                  {vehicle ? <InfoItem icon="car-outline" label="Vehicle" value={vehicle.registration || '--'} c={c} /> : null}
                  {rank ? <InfoItem icon="location-outline" label="Rank" value={rank.name || ''} c={c} /> : null}
                </View>

                {b.passengers && b.passengers.length > 0 ? (
                  <View style={[styles.passengersWrap, { borderColor: c.border }]}>
                    <Text style={[styles.passengersTitle, { color: c.textMuted }]}>Passengers</Text>
                    {b.passengers.map((p, i) => (
                      <View key={p.id || i} style={styles.passengerRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.passengerName, { color: c.text }]}>{p.name}</Text>
                          <Text style={{ fontSize: 11, color: c.textMuted }}>
                            {p.contactNumber}{p.destination ? ` → ${p.destination}` : ''}
                          </Text>
                        </View>
                        {(b.seatNumbers || [])[i] ? (
                          <View style={[styles.seatBadge, { backgroundColor: GOLD_LIGHT }]}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: GOLD }}>Seat {b.seatNumbers[i]}</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {b.notes ? (
                  <Text style={[styles.notesText, { color: c.textMuted }]}>{b.notes}</Text>
                ) : null}

                {b.confirmedAt ? (
                  <Text style={[styles.confirmedAt, { color: c.textMuted }]}>
                    Confirmed {fmtDate(b.confirmedAt)} at {fmtTime(b.confirmedAt)}
                  </Text>
                ) : null}

                {b.cancellationReason ? (
                  <Text style={[styles.cancelReason, { color: '#dc3545' }]}>
                    Reason: {b.cancellationReason}
                  </Text>
                ) : null}

                {canEdit ? (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.editBtn, { borderColor: GOLD }]} onPress={() => openEditModal(b)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="create-outline" size={14} color={GOLD} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: GOLD }}>Edit / Add Passengers</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(b)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="close-circle-outline" size={14} color="#dc3545" />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Edit Booking Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Edit Booking</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <View><Ionicons name="close" size={24} color={c.textMuted} /></View>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {editingBooking ? (
                <View style={{ padding: 16 }}>
                  {/* Booking Ref */}
                  <View style={[styles.refBadge, { backgroundColor: GOLD_LIGHT, marginBottom: 16 }]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Booking Ref</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: GOLD, letterSpacing: 1 }}>{editingBooking.id?.toString().substring(0, 8).toUpperCase()}</Text>
                  </View>

                  {/* Existing Passengers */}
                  <Text style={[styles.editSectionTitle, { color: c.text }]}>Passengers ({editPassengers.length})</Text>
                  {editPassengers.map((p, i) => (
                    <View key={p.id || `new-${i}`} style={[styles.editPassengerCard, { backgroundColor: c.surface, borderColor: p.id ? c.border : GOLD }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: p.id ? c.text : GOLD }}>
                          {p.id ? `Passenger ${i + 1}` : 'New Passenger'}
                        </Text>
                        {!p.id ? (
                          <TouchableOpacity onPress={() => setEditPassengers(prev => prev.filter((_, idx) => idx !== i))}>
                            <View><Ionicons name="trash-outline" size={16} color="#dc3545" /></View>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <TextInput
                        style={[styles.editInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                        placeholder="Name"
                        placeholderTextColor={c.textMuted}
                        value={p.name}
                        onChangeText={v => updateEditPassenger(i, 'name', v)}
                      />
                      <TextInput
                        style={[styles.editInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                        placeholder="Phone"
                        placeholderTextColor={c.textMuted}
                        value={p.contactNumber}
                        onChangeText={v => updateEditPassenger(i, 'contactNumber', v)}
                        keyboardType="phone-pad"
                      />
                      <TextInput
                        style={[styles.editInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                        placeholder="Email (optional)"
                        placeholderTextColor={c.textMuted}
                        value={p.email || ''}
                        onChangeText={v => updateEditPassenger(i, 'email', v)}
                        keyboardType="email-address"
                      />
                      <TextInput
                        style={[styles.editInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                        placeholder="Destination (optional)"
                        placeholderTextColor={c.textMuted}
                        value={p.destination || ''}
                        onChangeText={v => updateEditPassenger(i, 'destination', v)}
                      />
                    </View>
                  ))}

                  {/* Add New Passenger */}
                  <Text style={[styles.editSectionTitle, { color: c.text, marginTop: 16 }]}>Add New Passenger</Text>
                  <View style={[styles.editPassengerCard, { backgroundColor: c.surface, borderColor: c.border, borderStyle: 'dashed' }]}>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="Name *"
                      placeholderTextColor={c.textMuted}
                      value={newPassenger.name}
                      onChangeText={v => setNewPassenger(prev => ({ ...prev, name: v }))}
                    />
                    <TextInput
                      style={[styles.editInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="Phone *"
                      placeholderTextColor={c.textMuted}
                      value={newPassenger.contactNumber}
                      onChangeText={v => setNewPassenger(prev => ({ ...prev, contactNumber: v }))}
                      keyboardType="phone-pad"
                    />
                    <TextInput
                      style={[styles.editInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="Email (optional)"
                      placeholderTextColor={c.textMuted}
                      value={newPassenger.email}
                      onChangeText={v => setNewPassenger(prev => ({ ...prev, email: v }))}
                      keyboardType="email-address"
                    />
                    <TextInput
                      style={[styles.editInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="Destination (optional)"
                      placeholderTextColor={c.textMuted}
                      value={newPassenger.destination}
                      onChangeText={v => setNewPassenger(prev => ({ ...prev, destination: v }))}
                    />
                    <TouchableOpacity style={[styles.addPassBtn, { borderColor: GOLD }]} onPress={addNewPassengerToEdit}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Ionicons name="add-circle-outline" size={18} color={GOLD} />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: GOLD }}>Add Passenger</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Save / Cancel */}
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 40 }}>
                    <TouchableOpacity
                      style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}
                      onPress={closeEditModal}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: c.textMuted }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 2, padding: 14, borderRadius: 10, backgroundColor: GOLD, alignItems: 'center' }}
                      onPress={handleSaveEdit}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#000' }}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoItem({ icon, label, value, c }) {
  return (
    <View style={infoStyles.wrap}>
      <Ionicons name={icon} size={14} color={GOLD} />
      <View>
        <Text style={[infoStyles.label, { color: c.textMuted }]}>{label}</Text>
        <Text style={[infoStyles.value, { color: c.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '45%', marginBottom: 4 },
  label: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  value: { fontSize: 13, fontWeight: '700' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  addBtn: { backgroundColor: GOLD, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.06)' },
  filterChipActive: { backgroundColor: GOLD },
  filterText: { fontSize: 12, fontWeight: '700', color: '#999' },
  filterTextActive: { color: '#000' },

  listContent: { padding: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: '700' },
  browseBtn: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 8 },
  browseBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },

  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardRoute: { fontSize: 12, marginTop: 2 },

  statusBadge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingTop: 4 },

  confirmedAt: { fontSize: 11, fontStyle: 'italic' },
  cancelReason: { fontSize: 11, fontStyle: 'italic' },

  cancelBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(220,53,69,0.3)' },
  cancelBtnText: { color: '#dc3545', fontSize: 12, fontWeight: '700' },

  typeToggleRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  typeToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: 'transparent' },
  typeToggleBtnActive: { backgroundColor: GOLD_LIGHT, borderColor: GOLD },
  typeToggleText: { fontSize: 13, fontWeight: '700', color: '#999' },
  typeToggleTextActive: { color: '#000' },

  refBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4 },
  passengersWrap: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  passengersTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  passengerName: { fontSize: 13, fontWeight: '600' },
  seatBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  notesText: { fontSize: 11, fontStyle: 'italic', marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.06)', paddingTop: 10, marginTop: 6, justifyContent: 'flex-end' },
  editBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  modalTitle: { fontSize: 18, fontWeight: '900' },

  editSectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  editPassengerCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 },
  editInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  addPassBtn: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 4 },
});
