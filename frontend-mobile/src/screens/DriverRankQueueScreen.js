import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';
import { getDriverQueueView, completeQueueTrip, getDriverDispatchedTrips } from '../api/queueManagement';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';

function isoDate(d) { return d.toISOString().split('T')[0]; }

function fmtDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  if (dateStr === isoDate(today)) return 'Today';
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (dateStr === isoDate(y)) return 'Yesterday';
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' });
}

const SC = {
  Waiting: '#f59e0b', Loading: '#3b82f6', Dispatched: '#22c55e',
  Completed: '#16a34a', Arrived: '#16a34a',
};
function statusColor(st) { return SC[st] || '#94a3b8'; }

function norm(st) {
  const s = (st || '').toLowerCase();
  if (s === 'dispatched') return 'dispatched';
  if (s === 'completed' || s === 'arrived') return 'completed';
  return 'waiting';
}

export default function DriverRankQueueScreen({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverId, setDriverId] = useState(route?.params?.driverId || null);
  const [date, setDate] = useState(() => isoDate(new Date()));
  const [data, setData] = useState(null);
  const [dispatchedTrips, setDispatchedTrips] = useState([]);
  const [activeTab, setActiveTab] = useState('queue');
  const [filter, setFilter] = useState('all');

  const queue = data?.queue || [];
  const filtered = useMemo(() => {
    if (filter === 'all') return queue;
    return queue.filter(i => norm(i.status) === filter);
  }, [queue, filter]);

  const myEntry = useMemo(() => queue.find(i => i.isMine), [queue]);
  const myDispatchedTrip = useMemo(
    () => queue.find(i => i.isMine && norm(i.status) === 'dispatched' && i.tripId),
    [queue]
  );
  const myDispatchedQueueEntryId = myDispatchedTrip?.id
    || (((data?.myStatus || '').toLowerCase() === 'dispatched') ? data?.myQueueEntryId : null);
  const canCompleteTrip = Boolean(myDispatchedQueueEntryId);

  const fmtTime = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  };

  const resolveDriverId = useCallback(async () => {
    if (driverId) return driverId;
    try {
      const r = await client.get('/Identity/driverprofiles');
      const profs = Array.isArray(r.data) ? r.data : [];
      const me = profs.find(p => p.userId === user?.id || p.userId === user?.userId);
      if (me?.id) { setDriverId(me.id); return me.id; }
    } catch {}
    return null;
  }, [driverId, user?.id, user?.userId]);

  const load = useCallback(async () => {
    try {
      const did = await resolveDriverId();
      if (!did) { setData({ message: 'Driver profile not found', queue: [] }); return; }
      const resp = await getDriverQueueView(did, date);
      setData(resp || { queue: [] });
      // Load active/recent trips for this driver
      const driverToUse = did || driverId;
      if (driverToUse) {
        try {
          const resp = await client.get(`/TaxiRankTrips/driver/${driverToUse}/active`);
          setDispatchedTrips(Array.isArray(resp.data) ? resp.data : []);
        } catch { setDispatchedTrips([]); }
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load queue';
      Alert.alert('Queue', msg);
      setData({ queue: [] });
    }
  }, [date, resolveDriverId]);

  useEffect(() => {
    let active = true;
    (async () => { setLoading(true); await load(); if (active) setLoading(false); })();
    return () => { active = false; };
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function changeDate(delta) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + delta);
    setDate(isoDate(d));
  }

  async function captureCompletionContext() {
    const ctx = { completedAt: new Date().toISOString() };
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (pos?.coords) { ctx.latitude = pos.coords.latitude; ctx.longitude = pos.coords.longitude; }
      }
    } catch {}
    return ctx;
  }

  async function handleCompleteTrip() {
    if (!myDispatchedQueueEntryId) return;
    Alert.alert(
      'Complete Trip?',
      `Mark ${myDispatchedTrip?.vehicleRegistration || data?.vehicleRegistration || 'vehicle'} as completed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const ctx = await captureCompletionContext();
              await completeQueueTrip(myDispatchedQueueEntryId, {
                notes: 'Completed by driver',
                completedByDriverId: driverId, ...ctx,
              });
              Alert.alert('Done', 'Trip completed successfully.');
              await load();
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed');
            }
          },
        },
      ]
    );
  }

  function openDetails(item) {
    if (!item?.id) { Alert.alert('Trip', 'No details for this entry.'); return; }
    navigation.navigate('DriverTripDetails', { queueEntryId: item.id });
  }

  // ── Loading state ──
  if (loading) {
    return (
      <View style={[st.root, st.center]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={st.loadingTxt}>Loading…</Text>
      </View>
    );
  }

  const waitingCnt = queue.filter(i => norm(i.status) === 'waiting').length;
  const dispatchedCnt = queue.filter(i => norm(i.status) === 'dispatched').length;
  const completedCnt = queue.filter(i => norm(i.status) === 'completed').length;

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={st.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={st.hdrTitle}>Trip Management</Text>
          <Text style={st.hdrSub}>{data?.rankName || 'Assigned Rank'}</Text>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={st.tabs}>
        {[
          { key: 'queue', label: `Queue (${queue.length})` },
          { key: 'dispatched', label: `Trips (${dispatchedTrips.length})` },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[st.tab, activeTab === t.key && st.tabOn]} onPress={() => setActiveTab(t.key)}>
            <Text style={[st.tabTxt, activeTab === t.key && st.tabTxtOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Date Row ── */}
      <View style={st.dateRow}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={st.dateArrow}>
          <Ionicons name="chevron-back" size={18} color="#64748b" />
        </TouchableOpacity>
        <Text style={st.dateTxt}>{fmtDateLabel(date)}</Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={st.dateArrow}>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* ── Active Trip Banner ── */}
      {canCompleteTrip && (
        <View style={st.banner}>
          <View style={st.bannerRow}>
            <View style={st.bannerDot} />
            <View style={{ flex: 1 }}>
              <Text style={st.bannerTitle}>Active Trip</Text>
              <Text style={st.bannerSub}>
                {myDispatchedTrip?.vehicleRegistration || data?.vehicleRegistration} · {myDispatchedTrip?.routeName || data?.routeName || 'En route'}
              </Text>
            </View>
            <View style={st.bannerBadge}><Text style={st.bannerBadgeTxt}>Dispatched</Text></View>
          </View>
          <View style={st.bannerActions}>
            <TouchableOpacity style={st.bannerBtn} onPress={() => openDetails(myDispatchedTrip)}>
              <Ionicons name="eye-outline" size={15} color="#fff" />
              <Text style={st.bannerBtnTxt}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.bannerBtn, st.bannerBtnGreen]} onPress={handleCompleteTrip}>
              <Ionicons name="checkmark-circle" size={15} color="#fff" />
              <Text style={st.bannerBtnTxt}>Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Filter chips (queue tab only) ── */}
      {activeTab === 'queue' && (
        <View style={st.filterRow}>
          {[
            { key: 'all', label: 'All', cnt: queue.length },
            { key: 'waiting', label: 'Waiting', cnt: waitingCnt },
            { key: 'dispatched', label: 'Dispatched', cnt: dispatchedCnt },
            { key: 'completed', label: 'Completed', cnt: completedCnt },
          ].map(f => (
            <TouchableOpacity key={f.key} style={[st.chip, filter === f.key && st.chipOn]} onPress={() => setFilter(f.key)}>
              <Text style={[st.chipTxt, filter === f.key && st.chipTxtOn]}>{f.label} {f.cnt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Content ── */}
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={GOLD} />}
      >
        {activeTab === 'queue' ? (
          /* ══ QUEUE TAB ══ */
          <>
            {/* My vehicle summary */}
            {myEntry && (
              <View style={st.myCard}>
                <View style={st.myCardRow}>
                  <View style={st.myBadge}><Text style={st.myBadgeTxt}>#{data?.myPosition || myEntry.queuePosition}</Text></View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={st.myReg}>{data?.vehicleRegistration || myEntry.vehicleRegistration}</Text>
                    <Text style={st.mySub}>{data?.myStatus || myEntry.status} · {myEntry.routeName || data?.routeName || '—'}</Text>
                  </View>
                  {myEntry.tripId && (
                    <TouchableOpacity style={st.myDetailBtn} onPress={() => openDetails(myEntry)}>
                      <Ionicons name="open-outline" size={14} color={GOLD} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {filtered.length === 0 ? (
              <View style={st.empty}>
                <View style={st.emptyCircle}><Ionicons name="car-outline" size={32} color="#cbd5e1" /></View>
                <Text style={st.emptyTitle}>No vehicles in queue</Text>
                <Text style={st.emptySub}>{data?.message || 'Your vehicle is not currently in a rank queue'}</Text>
              </View>
            ) : (
              filtered.map((item, idx) => {
                const sc = statusColor(item.status);
                const isMine = item.isMine;
                const hasTripDetails = Boolean(item.tripId);
                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={[st.card, isMine && st.cardMine]}
                    activeOpacity={hasTripDetails ? 0.7 : 1}
                    onPress={hasTripDetails ? () => openDetails(item) : undefined}
                  >
                    <View style={[st.cardAccent, { backgroundColor: sc }]} />
                    <View style={st.cardBody}>
                      <View style={st.cardRow}>
                        <View style={st.cardLeft}>
                          <View style={[st.posBadge, { backgroundColor: isMine ? GOLD : sc + '18' }]}>
                            <Text style={[st.posText, { color: isMine ? '#000' : sc }]}>#{item.queuePosition}</Text>
                          </View>
                          <Text style={st.regText}>{item.vehicleRegistration || '—'}{isMine ? '  (You)' : ''}</Text>
                        </View>
                        <View style={[st.badge, { backgroundColor: sc }]}>
                          <Text style={st.badgeText}>{item.status}</Text>
                        </View>
                      </View>
                      <View style={st.cardMeta}>
                        <View style={st.metaItem}>
                          <Ionicons name="person-outline" size={13} color="#64748b" />
                          <Text style={st.metaText}>{item.driverName || 'No Driver'}</Text>
                        </View>
                        {item.routeName ? (
                          <View style={st.metaItem}>
                            <Ionicons name="navigate-outline" size={13} color="#64748b" />
                            <Text style={st.metaText}>{item.routeName}</Text>
                          </View>
                        ) : null}
                        <View style={st.metaItem}>
                          <Ionicons name="time-outline" size={13} color="#64748b" />
                          <Text style={st.metaText}>{item.joinedAt || '—'}</Text>
                        </View>
                      </View>
                      {hasTripDetails && (
                        <View style={st.tapHint}>
                          <Ionicons name="open-outline" size={12} color="#94a3b8" />
                          <Text style={st.tapHintTxt}>Tap for trip details & passengers</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          /* ══ DISPATCHED TRIPS TAB ══ */
          dispatchedTrips.length === 0 ? (
            <View style={st.empty}>
              <View style={st.emptyCircle}><Ionicons name="document-text-outline" size={32} color="#cbd5e1" /></View>
              <Text style={st.emptyTitle}>No trips yet</Text>
              <Text style={st.emptySub}>Dispatched trips for {fmtDateLabel(date).toLowerCase()} will appear here</Text>
            </View>
          ) : (
            dispatchedTrips.map((trip, idx) => {
              const sc = statusColor(trip.status || 'Dispatched');
              const isActive = trip.status !== 'Completed' && trip.status !== 'Cancelled';
              return (
                <TouchableOpacity
                  key={trip.id || idx}
                  style={st.card}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('DriverTripDetails', { tripId: trip.id, driverProfileId: driverId })}
                >
                  <View style={[st.cardAccent, { backgroundColor: sc }]} />
                  <View style={st.cardBody}>
                    <View style={st.cardRow}>
                      <Text style={st.regText} numberOfLines={1}>
                        {trip.departureStation || '—'} → {trip.destinationStation || '—'}
                      </Text>
                      <View style={[st.badge, { backgroundColor: sc }]}>
                        <Text style={st.badgeText}>{trip.status || 'Active'}</Text>
                      </View>
                    </View>
                    <View style={st.cardMeta}>
                      <View style={st.metaItem}>
                        <Ionicons name="car-outline" size={13} color="#64748b" />
                        <Text style={st.metaText}>{trip.vehicle?.registration || '—'}</Text>
                      </View>
                      <View style={st.metaItem}>
                        <Ionicons name="people-outline" size={13} color="#64748b" />
                        <Text style={st.metaText}>{trip.passengerCount ?? 0} pax</Text>
                      </View>
                      <View style={st.metaItem}>
                        <Ionicons name="time-outline" size={13} color="#64748b" />
                        <Text style={st.metaText}>{fmtTime(trip.departureTime)}</Text>
                      </View>
                    </View>
                    {isActive && (
                      <View style={st.tapHint}>
                        <Ionicons name="checkmark-circle-outline" size={12} color="#22c55e" />
                        <Text style={[st.tapHintTxt, { color: '#22c55e' }]}>Tap to view & complete</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingTxt: { marginTop: 12, color: '#94a3b8', fontSize: 13 },

  // ── Header ──
  hdr: {
    backgroundColor: '#1a1a2e', paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  hdrTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  hdrSub: { color: GOLD, fontSize: 11, fontWeight: '700', marginTop: 1 },

  // ── Tabs ──
  tabs: {
    flexDirection: 'row', backgroundColor: '#1a1a2e',
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabOn: { backgroundColor: GOLD },
  tabTxt: { color: '#ffffffcc', fontSize: 14, fontWeight: '600' },
  tabTxtOn: { color: '#000', fontWeight: '700' },

  // ── Date Row ──
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  dateArrow: { padding: 8 },
  dateTxt: { fontSize: 15, fontWeight: '600', color: '#334155', marginHorizontal: 16 },

  // ── Banner ──
  banner: {
    marginHorizontal: 16, marginTop: 12, backgroundColor: '#1a1a2e',
    borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#22c55e',
  },
  bannerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bannerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', marginRight: 10 },
  bannerTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  bannerSub: { color: '#ffffffaa', fontSize: 12, marginTop: 1 },
  bannerBadge: { backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  bannerBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bannerActions: { flexDirection: 'row', gap: 10 },
  bannerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingVertical: 9, gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  bannerBtnGreen: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  bannerBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // ── Filter Row ──
  filterRow: {
    flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12,
    paddingVertical: 6, gap: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: '#f1f5f9' },
  chipOn: { backgroundColor: GOLD },
  chipTxt: { fontSize: 11, fontWeight: '500', color: '#64748b' },
  chipTxtOn: { color: '#000', fontWeight: '600' },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollInner: { padding: 16, paddingBottom: 32 },

  // ── My Vehicle Card ──
  myCard: {
    backgroundColor: GOLD_LIGHT, borderRadius: 14, padding: 14,
    marginBottom: 14, borderWidth: 1.5, borderColor: GOLD,
  },
  myCardRow: { flexDirection: 'row', alignItems: 'center' },
  myBadge: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
  },
  myBadgeTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  myReg: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  mySub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  myDetailBtn: { padding: 8 },

  // ── Shared Card ──
  card: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardMine: { borderWidth: 1.5, borderColor: GOLD },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  posBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  posText: { fontSize: 12, fontWeight: '800' },
  regText: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // ── Card Meta ──
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#64748b' },

  // ── Tap Hint ──
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  tapHintTxt: { fontSize: 11, color: '#94a3b8' },

  // ── Empty State ──
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155' },
  emptySub: { fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
});
