import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getDriverDispatchedTrips } from '../api/queueManagement';
import client from '../api/client';

const GOLD = '#D4AF37';
const BG = '#080c14';
const SURFACE = '#0d1624';
const SURFACE2 = '#162035';
const BORDER = '#1e2d45';
const MUTED = '#475569';
const TEXT = '#f1f5f9';
const TEXT2 = '#64748b';

function isoDate(d) { return d.toISOString().split('T')[0]; }

function fmtDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (dateStr === isoDate(today)) return 'Today';
  if (dateStr === isoDate(y)) return 'Yesterday';
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' });
}

function fmtTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function statusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'dispatched': case 'departed': return '#22c55e';
    case 'intransit': return '#3b82f6';
    case 'completed': return '#16a34a';
    case 'cancelled': return '#ef4444';
    default: return '#f59e0b';
  }
}

function statusLabel(status) {
  const s = (status || '').toLowerCase();
  if (s === 'dispatched' || s === 'departed') return 'EN ROUTE';
  if (s === 'intransit') return 'IN TRANSIT';
  if (s === 'completed') return 'COMPLETED';
  if (s === 'cancelled') return 'CANCELLED';
  return (status || 'UNKNOWN').toUpperCase();
}

export default function DriverDispatchedTripsScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverId, setDriverId] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
  const [filter, setFilter] = useState('all');

  const resolveDriverId = useCallback(async () => {
    try {
      const r = await client.get('/Identity/driverprofiles');
      const profiles = Array.isArray(r.data) ? r.data : [];
      const me = profiles.find(p => p.userId === user?.id || p.userId === user?.userId);
      if (me?.id) { setDriverId(me.id); return me.id; }
    } catch {}
    return null;
  }, [user?.id, user?.userId]);

  const loadTrips = useCallback(async (did) => {
    const id = did || driverId;
    if (!id) return;
    try {
      const data = await getDriverDispatchedTrips(id, selectedDate);
      setTrips(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to load trips');
      setTrips([]);
    }
  }, [driverId, selectedDate]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const did = await resolveDriverId();
      if (did && active) await loadTrips(did);
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [resolveDriverId, loadTrips]);

  useFocusEffect(useCallback(() => { loadTrips(); }, [loadTrips]));

  function changeDate(delta) {
    const d = new Date(selectedDate); d.setDate(d.getDate() + delta);
    setSelectedDate(isoDate(d));
  }

  const isToday = selectedDate === isoDate(new Date());
  const totalEarnings = trips.reduce((s, t) => s + (t.fareAmount || t.totalAmount || 0), 0);
  const activeCount = trips.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length;
  const completedCount = trips.filter(t => t.status === 'Completed').length;

  const filtered = useMemo(() => {
    if (filter === 'all') return trips;
    if (filter === 'active') return trips.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
    if (filter === 'completed') return trips.filter(t => t.status === 'Completed');
    return trips;
  }, [trips, filter]);

  // ── Loading ──
  if (loading) {
    return (
      <View style={[st.root, st.center, { paddingTop: insets.top }]}>
        <View style={st.loadingRing}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
        <Text style={st.loadingTitle}>Trip History</Text>
        <Text style={st.loadingTxt}>Loading your trips…</Text>
      </View>
    );
  }

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={st.hdr}>
        <TouchableOpacity style={st.hdrBack} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.hdrTitle}>Trip History</Text>
          <Text style={st.hdrSub}>Your dispatched trips</Text>
        </View>
        <TouchableOpacity
          style={st.hdrRefresh}
          onPress={async () => { setRefreshing(true); await loadTrips(); setRefreshing(false); }}
          hitSlop={10}
        >
          {refreshing
            ? <ActivityIndicator size="small" color={GOLD} />
            : <Ionicons name="refresh-outline" size={19} color={TEXT2} />}
        </TouchableOpacity>
      </View>

      {/* ── Control row: date + stats ── */}
      <View style={st.controlRow}>
        <TouchableOpacity style={st.dateArrow} onPress={() => changeDate(-1)} hitSlop={6}>
          <Ionicons name="chevron-back" size={16} color={TEXT2} />
        </TouchableOpacity>
        <View style={st.datePill}>
          <Ionicons name="calendar-outline" size={12} color={GOLD} />
          <Text style={st.dateTxt}>{fmtDateLabel(selectedDate)}</Text>
          {isToday && <View style={st.dateLiveDot} />}
        </View>
        <TouchableOpacity style={st.dateArrow} onPress={() => changeDate(1)} hitSlop={6}>
          <Ionicons name="chevron-forward" size={16} color={TEXT2} />
        </TouchableOpacity>

        {trips.length > 0 && (
          <>
            <View style={st.controlDivider} />
            <View style={st.statMini}>
              <Text style={[st.statMiniNum, { color: GOLD }]}>{trips.length}</Text>
              <Text style={st.statMiniLbl}>trips</Text>
            </View>
            {activeCount > 0 && (
              <View style={st.statMini}>
                <Text style={[st.statMiniNum, { color: '#22c55e' }]}>{activeCount}</Text>
                <Text style={st.statMiniLbl}>active</Text>
              </View>
            )}
            {completedCount > 0 && (
              <View style={st.statMini}>
                <Text style={[st.statMiniNum, { color: TEXT2 }]}>{completedCount}</Text>
                <Text style={st.statMiniLbl}>done</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={st.filterScroll}
        contentContainerStyle={st.filterRow}
      >
        {[
          { key: 'all', label: 'All', cnt: trips.length, color: GOLD },
          { key: 'active', label: 'Active', cnt: activeCount, color: '#22c55e' },
          { key: 'completed', label: 'Completed', cnt: completedCount, color: '#64748b' },
        ].map(f => {
          const on = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[st.chip, on && { backgroundColor: f.color + '22', borderColor: f.color + '88' }]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              {on && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: f.color }} />}
              <Text style={[st.chipTxt, on && { color: f.color }]}>{f.label}</Text>
              <View style={[st.chipBubble, on && { backgroundColor: f.color + '33' }]}>
                <Text style={[st.chipBubbleTxt, on && { color: f.color }]}>{f.cnt}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content ── */}
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollInner}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadTrips(); setRefreshing(false); }}
            tintColor={GOLD}
          />
        }
      >
        {/* Earnings summary */}
        {totalEarnings > 0 && (
          <View style={st.earningsBar}>
            <View style={st.earningsBarLeft}>
              <Text style={st.earningsBarLabel}>{fmtDateLabel(selectedDate)}'s Earnings</Text>
              <Text style={st.earningsBarAmount}>R {totalEarnings.toFixed(2)}</Text>
            </View>
            <View style={st.earningsBarRight}>
              <View style={st.earningsStat}>
                <Text style={st.earningsStatNum}>{trips.length}</Text>
                <Text style={st.earningsStatLbl}>trips</Text>
              </View>
              {completedCount > 0 && (
                <View style={[st.earningsStat, { marginLeft: 18 }]}>
                  <Text style={[st.earningsStatNum, { color: '#22c55e' }]}>{completedCount}</Text>
                  <Text style={st.earningsStatLbl}>done</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {filtered.length === 0 ? (
          <View style={st.empty}>
            <View style={st.emptyCircle}>
              <Ionicons name="car-sport-outline" size={30} color={MUTED} />
            </View>
            <Text style={st.emptyTitle}>No trips found</Text>
            <Text style={st.emptySub}>
              {filter !== 'all'
                ? `No ${filter} trips for ${fmtDateLabel(selectedDate).toLowerCase()}`
                : `No dispatched trips for ${fmtDateLabel(selectedDate).toLowerCase()}`}
            </Text>
          </View>
        ) : (
          filtered.map((trip, idx) => {
            const sc = statusColor(trip.status);
            const isActive = trip.status !== 'Completed' && trip.status !== 'Cancelled';
            const fare = trip.fareAmount || trip.totalAmount || 0;
            const from = trip.route?.departureStation || trip.departureStation || null;
            const to = trip.route?.destinationStation || trip.destinationStation || null;
            const reg = trip.vehicle?.registration || '—';
            const vehicleDesc = [trip.vehicle?.make, trip.vehicle?.model].filter(Boolean).join(' ');
            return (
              <TouchableOpacity
                key={trip.id || idx}
                style={[st.tripCard, isActive && { borderColor: sc + '55' }]}
                onPress={() => navigation.navigate('DriverTripDetails', { queueEntryId: trip.id })}
                activeOpacity={0.8}
              >
                <View style={[st.tripStripe, { backgroundColor: sc }]} />
                <View style={st.tripBody}>
                  {/* Header */}
                  <View style={st.tripTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.tripRoute} numberOfLines={1}>
                        {trip.route?.routeName || 'Trip'}
                      </Text>
                      <Text style={st.tripReg} numberOfLines={1}>
                        {reg}{vehicleDesc ? `  ·  ${vehicleDesc}` : ''}
                      </Text>
                    </View>
                    <View style={[st.statusBadge, { backgroundColor: sc + '22', borderColor: sc + '55' }]}>
                      <Text style={[st.statusTxt, { color: sc }]}>{statusLabel(trip.status)}</Text>
                    </View>
                  </View>

                  {/* Route visualiser */}
                  {(from || to) && (
                    <View style={st.routeBlock}>
                      <View style={st.routeLeft}>
                        <View style={[st.routeDot, { backgroundColor: '#22c55e' }]} />
                        <View style={st.routeLine} />
                        <View style={[st.routeSquare, { backgroundColor: '#ef4444' }]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        {from && <Text style={st.routeStation} numberOfLines={1}>{from}</Text>}
                        {to && <Text style={[st.routeStation, { marginTop: 8, color: TEXT2 }]} numberOfLines={1}>{to}</Text>}
                      </View>
                    </View>
                  )}

                  {/* Meta pills */}
                  <View style={st.metaRow}>
                    {(trip.passengerCount ?? 0) > 0 && (
                      <View style={st.metaPill}>
                        <Ionicons name="people-outline" size={11} color={MUTED} />
                        <Text style={st.metaPillTxt}>{trip.passengerCount} pax</Text>
                      </View>
                    )}
                    {fare > 0 && (
                      <View style={[st.metaPill, { borderColor: '#22c55e44' }]}>
                        <Ionicons name="cash-outline" size={11} color="#22c55e" />
                        <Text style={[st.metaPillTxt, { color: '#22c55e' }]}>R{Number(fare).toFixed(2)}</Text>
                      </View>
                    )}
                    {trip.departedAt && (
                      <View style={st.metaPill}>
                        <Ionicons name="time-outline" size={11} color={MUTED} />
                        <Text style={st.metaPillTxt}>{fmtTime(trip.departedAt)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={st.tripCta}>
                    <Ionicons name="receipt-outline" size={11} color={GOLD} />
                    <Text style={st.tripCtaTxt}>View full trip details</Text>
                  </View>
                </View>
                <View style={st.tripChevron}>
                  <Ionicons name="chevron-forward" size={16} color={GOLD + '80'} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: 'center', justifyContent: 'center' },

  loadingRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  loadingTitle: { fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 4 },
  loadingTxt: { color: TEXT2, fontSize: 13, fontWeight: '500' },

  hdr: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  hdrBack: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  hdrTitle: { fontSize: 17, fontWeight: '900', color: TEXT },
  hdrSub: { fontSize: 10, fontWeight: '700', color: GOLD, marginTop: 1, letterSpacing: 0.4 },
  hdrRefresh: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },

  controlRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingHorizontal: 8, paddingVertical: 9, gap: 2,
  },
  dateArrow: { padding: 8 },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SURFACE2, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  dateTxt: { fontSize: 12, fontWeight: '700', color: TEXT },
  dateLiveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22c55e' },
  controlDivider: { width: 1, height: 22, backgroundColor: BORDER, marginHorizontal: 8 },
  statMini: { alignItems: 'center', paddingHorizontal: 6 },
  statMiniNum: { fontSize: 16, fontWeight: '900', color: TEXT },
  statMiniLbl: { fontSize: 9, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },

  filterScroll: { backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  filterRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 9, gap: 7 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 18,
    backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER,
  },
  chipTxt: { fontSize: 12, fontWeight: '700', color: TEXT2 },
  chipBubble: { backgroundColor: BORDER, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  chipBubbleTxt: { fontSize: 10, fontWeight: '800', color: TEXT2 },

  scroll: { flex: 1 },
  scrollInner: { padding: 14 },

  earningsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#071a0f', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#22c55e30', marginBottom: 14,
  },
  earningsBarLeft: { flex: 1 },
  earningsBarLabel: { fontSize: 10, fontWeight: '800', color: '#22c55e', textTransform: 'uppercase', letterSpacing: 0.8 },
  earningsBarAmount: { fontSize: 28, fontWeight: '900', color: '#22c55e', marginTop: 2 },
  earningsBarRight: { flexDirection: 'row', alignItems: 'center' },
  earningsStat: { alignItems: 'center' },
  earningsStatNum: { fontSize: 22, fontWeight: '900', color: TEXT },
  earningsStatLbl: { fontSize: 10, fontWeight: '700', color: TEXT2, textTransform: 'uppercase' },

  tripCard: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: SURFACE, borderRadius: 18, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  tripStripe: { width: 4 },
  tripBody: { flex: 1, padding: 14 },
  tripTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  tripRoute: { fontSize: 16, fontWeight: '900', color: TEXT, letterSpacing: 0.2 },
  tripReg: { fontSize: 12, color: TEXT2, marginTop: 2 },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, marginTop: 2 },
  statusTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  routeBlock: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  routeLeft: { alignItems: 'center', paddingTop: 4 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, flex: 1, backgroundColor: BORDER, marginVertical: 3 },
  routeSquare: { width: 7, height: 7, borderRadius: 2 },
  routeStation: { fontSize: 12, fontWeight: '700', color: TEXT },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SURFACE2, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: BORDER,
  },
  metaPillTxt: { fontSize: 11, fontWeight: '700', color: TEXT2 },
  tripCta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tripCtaTxt: { fontSize: 11, color: GOLD, fontWeight: '600' },
  tripChevron: { justifyContent: 'center', paddingRight: 12, paddingLeft: 4 },

  empty: { alignItems: 'center', paddingTop: 64, paddingBottom: 20 },
  emptyCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 6 },
  emptySub: { fontSize: 13, color: TEXT2, textAlign: 'center', lineHeight: 20, paddingHorizontal: 36 },
});
