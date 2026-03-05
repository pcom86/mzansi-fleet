import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { fetchUserBookings, cancelTripBooking } from '../api/taxiRanks';

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
  const [filter, setFilter] = useState('all'); // all, upcoming, past, cancelled

  const userId = user?.userId || user?.id;

  const loadData = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setLoading(true);
    try {
      const resp = await fetchUserBookings(userId);
      setBookings(resp.data || resp || []);
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

  const now = new Date();
  const filtered = bookings.filter(b => {
    if (filter === 'upcoming') return new Date(b.travelDate) >= now && b.status !== 'Cancelled';
    if (filter === 'past') return new Date(b.travelDate) < now && b.status !== 'Cancelled';
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
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSub}>{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('BookTrip')} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

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
            <Text style={[styles.emptyText, { color: c.textMuted }]}>No bookings found</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('BookTrip')}>
              <Text style={styles.browseBtnText}>Browse Trips</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((b) => {
            const sc = STATUS_COLORS[b.status] || STATUS_COLORS.Pending;
            const schedule = b.tripSchedule;
            const rank = b.taxiRank;
            const isPast = new Date(b.travelDate) < now;
            const canCancel = !isPast && b.status !== 'Cancelled' && b.status !== 'Completed';

            return (
              <View key={b.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: GOLD_LIGHT }]}>
                    <Ionicons name="ticket-outline" size={20} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{schedule?.routeName || 'Trip'}</Text>
                    <Text style={[styles.cardRoute, { color: c.textMuted }]}>
                      {schedule?.departureStation || '?'} → {schedule?.destinationStation || '?'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{b.status}</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <InfoItem icon="calendar-outline" label="Date" value={fmtDate(b.travelDate)} c={c} />
                  <InfoItem icon="people-outline" label="Seats" value={String(b.seatsBooked)} c={c} />
                  <InfoItem icon="cash-outline" label="Fare" value={`R${b.totalFare}`} c={c} />
                  {rank && <InfoItem icon="location-outline" label="Rank" value={rank.name || ''} c={c} />}
                </View>

                {b.confirmedAt && (
                  <Text style={[styles.confirmedAt, { color: c.textMuted }]}>
                    Confirmed {fmtDate(b.confirmedAt)} at {fmtTime(b.confirmedAt)}
                  </Text>
                )}

                {b.cancellationReason && (
                  <Text style={[styles.cancelReason, { color: '#dc3545' }]}>
                    Reason: {b.cancellationReason}
                  </Text>
                )}

                {canCancel && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(b)}>
                    <Ionicons name="close-circle-outline" size={16} color="#dc3545" />
                    <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
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

  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 8, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.06)', marginTop: 4 },
  cancelBtnText: { color: '#dc3545', fontSize: 13, fontWeight: '700' },
});
