import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Modal, TextInput, Animated,
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
const BG = '#0a0f1e';
const SURFACE = '#0f172a';
const SURFACE2 = '#1e293b';
const BORDER = '#1e293b';
const MUTED = '#475569';
const TEXT = '#f1f5f9';
const TEXT2 = '#94a3b8';

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

  // Complete trip modal state
  const [completeVisible, setCompleteVisible] = useState(false);
  const [completeFare, setCompleteFare] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  // Pulse animation for live dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

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

  function handleCompleteTrip() {
    if (!myDispatchedQueueEntryId) return;
    const fare = myDispatchedTrip?.fareAmount || data?.fareAmount || '';
    setCompleteFare(fare ? String(fare) : '');
    setCompleteNotes('');
    setCompleteVisible(true);
  }

  async function confirmCompleteTrip() {
    if (!myDispatchedQueueEntryId) return;
    setCompleting(true);
    try {
      const ctx = await captureCompletionContext();
      await completeQueueTrip(myDispatchedQueueEntryId, {
        notes: completeNotes || 'Completed by driver',
        completedByDriverId: driverId,
        totalAmount: completeFare ? parseFloat(completeFare) : undefined,
        ...ctx,
      });
      setCompleteVisible(false);
      Alert.alert('Done', 'Trip completed successfully.');
      await load();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed');
    } finally {
      setCompleting(false);
    }
  }

  function openDetails(item) {
    if (!item?.id) { Alert.alert('Trip', 'No details for this entry.'); return; }
    navigation.navigate('DriverTripDetails', { queueEntryId: item.id });
  }

  // ── Loading state ──
  if (loading) {
    return (
      <View style={[st.root, st.center, { paddingTop: insets.top }]}>
        <View style={st.loadingIconWrap}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
        <Text style={st.loadingTxt}>Loading queue…</Text>
      </View>
    );
  }

  const waitingCnt = queue.filter(i => norm(i.status) === 'waiting').length;
  const dispatchedCnt = queue.filter(i => norm(i.status) === 'dispatched').length;
  const completedCnt = queue.filter(i => norm(i.status) === 'completed').length;
  const isToday = date === isoDate(new Date());

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={st.hdr}>
        <TouchableOpacity style={st.hdrBack} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.hdrTitle}>Rank Queue</Text>
          <Text style={st.hdrSub} numberOfLines={1}>{data?.rankName || 'Your Assigned Rank'}</Text>
        </View>
        <TouchableOpacity
          style={st.hdrRefresh}
          onPress={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          hitSlop={8}
        >
          {refreshing
            ? <ActivityIndicator size="small" color={GOLD} />
            : <Ionicons name="refresh" size={20} color={TEXT2} />}
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
      <View style={st.tabBar}>
        {[
          { key: 'queue', icon: 'list-outline', label: 'Queue', cnt: queue.length },
          { key: 'dispatched', icon: 'car-sport-outline', label: 'My Trips', cnt: dispatchedTrips.length },
        ].map(t => {
          const on = activeTab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[st.tabItem, on && st.tabItemOn]} onPress={() => setActiveTab(t.key)} activeOpacity={0.8}>
              <Ionicons name={t.icon} size={16} color={on ? '#000' : TEXT2} />
              <Text style={[st.tabLabel, on && st.tabLabelOn]}>{t.label}</Text>
              {t.cnt > 0 && (
                <View style={[st.tabBubble, on && st.tabBubbleOn]}>
                  <Text style={[st.tabBubbleTxt, on && st.tabBubbleTxtOn]}>{t.cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Date picker row ── */}
      <View style={st.dateRow}>
        <TouchableOpacity style={st.dateArrow} onPress={() => changeDate(-1)}>
          <Ionicons name="chevron-back" size={18} color={TEXT2} />
        </TouchableOpacity>
        <View style={st.datePill}>
          <Ionicons name="calendar-outline" size={13} color={GOLD} />
          <Text style={st.dateTxt}>{fmtDateLabel(date)}</Text>
          {isToday && <View style={st.dateLiveDot} />}
        </View>
        <TouchableOpacity style={st.dateArrow} onPress={() => changeDate(1)}>
          <Ionicons name="chevron-forward" size={18} color={TEXT2} />
        </TouchableOpacity>
      </View>

      {/* ── Stats bar (queue tab) ── */}
      {activeTab === 'queue' && queue.length > 0 && (
        <View style={st.statsBar}>
          <View style={st.statItem}>
            <Text style={[st.statNum, { color: '#f59e0b' }]}>{waitingCnt}</Text>
            <Text style={st.statLabel}>Waiting</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statItem}>
            <Text style={[st.statNum, { color: '#22c55e' }]}>{dispatchedCnt}</Text>
            <Text style={st.statLabel}>En Route</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statItem}>
            <Text style={[st.statNum, { color: TEXT2 }]}>{completedCnt}</Text>
            <Text style={st.statLabel}>Done</Text>
          </View>
        </View>
      )}

      {/* ── Active trip banner ── */}
      {canCompleteTrip && (
        <View style={st.liveCard}>
          <View style={st.liveStripe} />
          <View style={{ flex: 1 }}>
            <View style={st.liveHeader}>
              <View style={st.liveDotWrap}>
                <Animated.View style={[st.livePulse, { opacity: pulseAnim }]} />
                <View style={st.liveDot} />
              </View>
              <Text style={st.liveLabel}>LIVE · EN ROUTE</Text>
              <View style={st.liveStatusBadge}>
                <Text style={st.liveStatusTxt}>ACTIVE</Text>
              </View>
            </View>
            <View style={st.liveInfo}>
              <View style={st.liveInfoItem}>
                <Ionicons name="car-outline" size={13} color={GOLD} />
                <Text style={st.liveInfoTxt}>{myDispatchedTrip?.vehicleRegistration || data?.vehicleRegistration || '—'}</Text>
              </View>
              {(myDispatchedTrip?.routeName || data?.routeName) && (
                <View style={st.liveInfoItem}>
                  <Ionicons name="navigate-outline" size={13} color={TEXT2} />
                  <Text style={st.liveInfoTxt}>{myDispatchedTrip?.routeName || data?.routeName}</Text>
                </View>
              )}
              {myDispatchedTrip?.fareAmount > 0 && (
                <View style={st.liveInfoItem}>
                  <Ionicons name="cash-outline" size={13} color="#22c55e" />
                  <Text style={[st.liveInfoTxt, { color: '#22c55e' }]}>R{Number(myDispatchedTrip.fareAmount).toFixed(2)}</Text>
                </View>
              )}
            </View>
            <View style={st.liveBtnRow}>
              <TouchableOpacity style={st.liveBtnSecondary} onPress={() => openDetails(myDispatchedTrip)} activeOpacity={0.8}>
                <Ionicons name="document-text-outline" size={15} color={GOLD} />
                <Text style={[st.liveBtnTxt, { color: GOLD }]}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.liveBtnComplete} onPress={handleCompleteTrip} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={15} color="#fff" />
                <Text style={st.liveBtnCompleteTxt}>Complete Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Filter chips (queue tab only) ── */}
      {activeTab === 'queue' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={st.filterRow}>
          {[
            { key: 'all', label: 'All', cnt: queue.length },
            { key: 'waiting', label: 'Waiting', cnt: waitingCnt, color: '#f59e0b' },
            { key: 'dispatched', label: 'En Route', cnt: dispatchedCnt, color: '#22c55e' },
            { key: 'completed', label: 'Completed', cnt: completedCnt, color: TEXT2 },
          ].map(f => {
            const on = filter === f.key;
            return (
              <TouchableOpacity key={f.key} style={[st.chip, on && { backgroundColor: f.color || GOLD, borderColor: f.color || GOLD }]} onPress={() => setFilter(f.key)}>
                <Text style={[st.chipTxt, on && st.chipTxtOn]}>{f.label}</Text>
                <View style={[st.chipBubble, on && { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                  <Text style={[st.chipBubbleTxt, on && { color: '#fff' }]}>{f.cnt}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
            {filtered.length === 0 ? (
              <View style={st.empty}>
                <View style={st.emptyCircle}>
                  <Ionicons name="car-outline" size={28} color={MUTED} />
                </View>
                <Text style={st.emptyTitle}>No vehicles in queue</Text>
                <Text style={st.emptySub}>{data?.message || 'Queue is empty for this date'}</Text>
              </View>
            ) : (
              filtered.map((item, idx) => {
                const sc = statusColor(item.status);
                const isMine = item.isMine;
                const statusNorm = norm(item.status);
                const hasTripDetails = Boolean(item.tripId);
                const isEnRoute = statusNorm === 'dispatched';
                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={[st.qCard, isMine && { borderColor: GOLD + '80' }]}
                    activeOpacity={hasTripDetails ? 0.75 : 1}
                    onPress={hasTripDetails ? () => openDetails(item) : undefined}
                  >
                    {/* Left accent */}
                    <View style={[st.qAccent, { backgroundColor: isMine ? GOLD : sc }]} />

                    {/* Position badge */}
                    <View style={[st.qPosBadge, { backgroundColor: isMine ? GOLD : SURFACE2 }]}>
                      <Text style={[st.qPosNum, { color: isMine ? '#000' : sc }]}>#{item.queuePosition}</Text>
                    </View>

                    {/* Body */}
                    <View style={st.qBody}>
                      <View style={st.qTopRow}>
                        <View style={{ flex: 1 }}>
                          <View style={st.qRegRow}>
                            <Text style={st.qReg}>{item.vehicleRegistration || '—'}</Text>
                            {isMine && <View style={st.youBadge}><Text style={st.youTxt}>YOU</Text></View>}
                          </View>
                          <Text style={st.qDriver} numberOfLines={1}>
                            <Ionicons name="person-outline" size={11} color={MUTED} /> {item.driverName || 'No driver assigned'}
                          </Text>
                        </View>
                        <View style={[st.qStatusBadge, { backgroundColor: sc + '22', borderColor: sc + '55' }]}>
                          <Text style={[st.qStatusTxt, { color: sc }]}>
                            {isEnRoute ? 'EN ROUTE' : (item.status || '—').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Meta row */}
                      <View style={st.qMetaRow}>
                        {item.routeName && (
                          <View style={st.qMeta}>
                            <Ionicons name="navigate-outline" size={11} color={MUTED} />
                            <Text style={st.qMetaTxt} numberOfLines={1}>{item.routeName}</Text>
                          </View>
                        )}
                        {item.passengerCount > 0 && (
                          <View style={st.qMeta}>
                            <Ionicons name="people-outline" size={11} color={MUTED} />
                            <Text style={st.qMetaTxt}>{item.passengerCount} pax</Text>
                          </View>
                        )}
                        {item.fareAmount > 0 && (
                          <View style={st.qMeta}>
                            <Ionicons name="cash-outline" size={11} color="#22c55e" />
                            <Text style={[st.qMetaTxt, { color: '#22c55e' }]}>R{Number(item.fareAmount).toFixed(2)}</Text>
                          </View>
                        )}
                        {item.departedAt && (
                          <View style={st.qMeta}>
                            <Ionicons name="time-outline" size={11} color={MUTED} />
                            <Text style={st.qMetaTxt}>{fmtTime(item.departedAt)}</Text>
                          </View>
                        )}
                      </View>

                      {hasTripDetails && (
                        <View style={st.qHint}>
                          <Ionicons name="chevron-forward" size={12} color={MUTED} />
                          <Text style={st.qHintTxt}>View trip details & passengers</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          /* ══ MY TRIPS TAB ══ */
          dispatchedTrips.length === 0 ? (
            <View style={st.empty}>
              <View style={st.emptyCircle}>
                <Ionicons name="car-sport-outline" size={28} color={MUTED} />
              </View>
              <Text style={st.emptyTitle}>No trips yet</Text>
              <Text style={st.emptySub}>Your dispatched trips for {fmtDateLabel(date).toLowerCase()} will appear here</Text>
            </View>
          ) : (
            dispatchedTrips.map((trip, idx) => {
              const sc = statusColor(trip.status || 'Dispatched');
              const isActive = trip.status !== 'Completed' && trip.status !== 'Cancelled';
              const displayStatus = (trip.status === 'Dispatched' || trip.status === 'Departed') ? 'EN ROUTE' : (trip.status || 'Active');
              const fare = trip.fareAmount || trip.totalAmount || 0;
              return (
                <TouchableOpacity
                  key={trip.id || idx}
                  style={st.tripCard}
                  onPress={() => openDetails({ id: trip.id, tripId: trip.id })}
                  activeOpacity={0.8}
                >
                  <View style={[st.tripAccent, { backgroundColor: sc }]} />
                  <View style={st.tripBody}>
                    <View style={st.tripTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.tripReg}>{trip.vehicleRegistration || trip.vehicle?.registration || '—'}</Text>
                        {trip.route?.routeName && (
                          <Text style={st.tripRoute} numberOfLines={1}>
                            <Ionicons name="navigate-outline" size={11} color={MUTED} /> {trip.route.routeName}
                          </Text>
                        )}
                      </View>
                      <View style={[st.tripStatusBadge, { backgroundColor: sc + '22', borderColor: sc + '55' }]}>
                        <Text style={[st.tripStatusTxt, { color: sc }]}>{displayStatus}</Text>
                      </View>
                    </View>

                    <View style={st.tripMetaRow}>
                      {(trip.passengerCount ?? 0) > 0 && (
                        <View style={st.tripMeta}>
                          <Ionicons name="people-outline" size={12} color={MUTED} />
                          <Text style={st.tripMetaTxt}>{trip.passengerCount} pax</Text>
                        </View>
                      )}
                      {fare > 0 && (
                        <View style={st.tripMeta}>
                          <Ionicons name="cash-outline" size={12} color="#22c55e" />
                          <Text style={[st.tripMetaTxt, { color: '#22c55e' }]}>R{Number(fare).toFixed(2)}</Text>
                        </View>
                      )}
                      {trip.departedAt && (
                        <View style={st.tripMeta}>
                          <Ionicons name="time-outline" size={12} color={MUTED} />
                          <Text style={st.tripMetaTxt}>{fmtTime(trip.departedAt)}</Text>
                        </View>
                      )}
                    </View>

                    {isActive && (
                      <View style={st.tripCta}>
                        <Ionicons name="open-outline" size={12} color={GOLD} />
                        <Text style={[st.qHintTxt, { color: GOLD }]}>Tap to view details</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )
        )}
      </ScrollView>

      {/* ── Complete Trip Bottom Sheet ── */}
      <Modal visible={completeVisible} transparent animationType="slide" onRequestClose={() => { if (!completing) setCompleteVisible(false); }}>
        <View style={st.ctOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { if (!completing) setCompleteVisible(false); }} />
          <View style={st.ctSheet}>
            <View style={st.ctHandle} />

            {/* Title */}
            <View style={st.ctTitleRow}>
              <View style={st.ctTitleIcon}>
                <Ionicons name="checkmark-circle" size={26} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.ctTitle}>Complete Trip</Text>
                <Text style={st.ctRouteSub} numberOfLines={1}>
                  {myDispatchedTrip?.vehicleRegistration || data?.vehicleRegistration || '—'} · {myDispatchedTrip?.routeName || data?.routeName || 'En route'}
                </Text>
              </View>
            </View>

            {/* Fare input */}
            <Text style={st.ctFieldLabel}>Total Fare Collected</Text>
            <View style={st.ctFareRow}>
              <View style={st.ctFareCurrencyBox}>
                <Text style={st.ctFareCurrency}>R</Text>
              </View>
              <TextInput
                style={st.ctFareInput}
                placeholder="0.00"
                placeholderTextColor={MUTED}
                value={completeFare}
                onChangeText={setCompleteFare}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Notes */}
            <Text style={[st.ctFieldLabel, { marginTop: 14 }]}>Notes <Text style={{ color: MUTED, fontWeight: '400' }}>(optional)</Text></Text>
            <TextInput
              style={st.ctNotesInput}
              placeholder="Add completion notes…"
              placeholderTextColor={MUTED}
              value={completeNotes}
              onChangeText={setCompleteNotes}
              multiline
              numberOfLines={2}
            />

            {/* Buttons */}
            <View style={st.ctBtnRow}>
              <TouchableOpacity style={st.ctCancelBtn} onPress={() => setCompleteVisible(false)} disabled={completing}>
                <Text style={st.ctCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.ctConfirmBtn, completing && { opacity: 0.7 }]} onPress={confirmCompleteTrip} disabled={completing}>
                {completing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="checkmark-circle" size={17} color="#fff" />
                      <Text style={st.ctConfirmTxt}>Complete Trip</Text>
                    </>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  loadingTxt: { color: TEXT2, fontSize: 13, fontWeight: '600' },

  // ── Header ──
  hdr: { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10 },
  hdrBack: { width: 36, height: 36, borderRadius: 10, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center' },
  hdrTitle: { fontSize: 18, fontWeight: '900', color: TEXT },
  hdrSub: { fontSize: 11, fontWeight: '700', color: GOLD, marginTop: 1 },
  hdrRefresh: { width: 36, height: 36, borderRadius: 10, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center' },

  // ── Tab bar ──
  tabBar: { flexDirection: 'row', backgroundColor: SURFACE, paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 22, backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER },
  tabItemOn: { backgroundColor: GOLD, borderColor: GOLD },
  tabLabel: { fontSize: 13, fontWeight: '700', color: TEXT2 },
  tabLabelOn: { color: '#000' },
  tabBubble: { backgroundColor: BORDER, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBubbleOn: { backgroundColor: 'rgba(0,0,0,0.2)' },
  tabBubbleTxt: { fontSize: 10, fontWeight: '800', color: TEXT2 },
  tabBubbleTxtOn: { color: '#000' },

  // ── Date row ──
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  dateArrow: { padding: 10 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: SURFACE2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: BORDER },
  dateTxt: { fontSize: 13, fontWeight: '700', color: TEXT },
  dateLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },

  // ── Stats bar ──
  statsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', color: TEXT2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: BORDER },

  // ── Live active trip card ──
  liveCard: { flexDirection: 'row', backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: '#22c55e40', overflow: 'hidden' },
  liveStripe: { width: 4, backgroundColor: '#22c55e' },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  liveDotWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  livePulse: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#22c55e' },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e', zIndex: 1 },
  liveLabel: { flex: 1, fontSize: 10, fontWeight: '900', color: '#22c55e', letterSpacing: 0.8 },
  liveStatusBadge: { backgroundColor: '#22c55e22', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#22c55e55' },
  liveStatusTxt: { fontSize: 9, fontWeight: '900', color: '#22c55e', letterSpacing: 0.5 },
  liveInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, paddingBottom: 8 },
  liveInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: SURFACE2, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: BORDER },
  liveInfoTxt: { fontSize: 11, fontWeight: '700', color: TEXT2 },
  liveBtnRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  liveBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: GOLD + '60', backgroundColor: SURFACE2 },
  liveBtnTxt: { fontSize: 13, fontWeight: '800' },
  liveBtnComplete: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#16a34a' },
  liveBtnCompleteTxt: { fontSize: 13, fontWeight: '900', color: '#fff' },

  // ── Filter chips ──
  filterScroll: { backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  filterRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER },
  chipTxt: { fontSize: 12, fontWeight: '700', color: TEXT2 },
  chipTxtOn: { color: '#000' },
  chipBubble: { backgroundColor: BORDER, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  chipBubbleTxt: { fontSize: 10, fontWeight: '800', color: TEXT2 },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollInner: { padding: 14, paddingBottom: 40 },

  // ── Queue card ──
  qCard: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: SURFACE, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  qAccent: { width: 4 },
  qPosBadge: { width: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  qPosNum: { fontSize: 12, fontWeight: '900' },
  qBody: { flex: 1, paddingVertical: 12, paddingRight: 14, paddingLeft: 4 },
  qTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  qRegRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  qReg: { fontSize: 15, fontWeight: '900', color: TEXT },
  youBadge: { backgroundColor: GOLD, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  youTxt: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  qDriver: { fontSize: 12, color: TEXT2, fontWeight: '500' },
  qStatusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  qStatusTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  qMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: SURFACE2, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BORDER },
  qMetaTxt: { fontSize: 11, fontWeight: '700', color: TEXT2 },
  qHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  qHintTxt: { fontSize: 11, color: MUTED },

  // ── Trip card (My Trips tab) ──
  tripCard: { flexDirection: 'row', backgroundColor: SURFACE, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  tripAccent: { width: 4 },
  tripBody: { flex: 1, padding: 14 },
  tripTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  tripReg: { fontSize: 15, fontWeight: '900', color: TEXT, marginBottom: 2 },
  tripRoute: { fontSize: 12, color: TEXT2 },
  tripStatusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tripStatusTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  tripMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: SURFACE2, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BORDER },
  tripMetaTxt: { fontSize: 11, fontWeight: '700', color: TEXT2 },
  tripCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },

  // ── Empty state ──
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 6 },
  emptySub: { fontSize: 13, color: TEXT2, textAlign: 'center', lineHeight: 18, paddingHorizontal: 32 },

  // ── Complete trip bottom sheet ──
  ctOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  ctSheet: { backgroundColor: SURFACE, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: BORDER },
  ctHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: SURFACE2, alignSelf: 'center', marginBottom: 20 },
  ctTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  ctTitleIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center' },
  ctTitle: { fontSize: 18, fontWeight: '900', color: TEXT },
  ctRouteSub: { fontSize: 12, color: MUTED, marginTop: 2, fontWeight: '600' },
  ctFieldLabel: { fontSize: 11, fontWeight: '800', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  ctFareRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE2, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 4, overflow: 'hidden' },
  ctFareCurrencyBox: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1e293b', justifyContent: 'center', borderRightWidth: 1, borderColor: BORDER },
  ctFareCurrency: { fontSize: 18, fontWeight: '900', color: '#22c55e' },
  ctFareInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 22, fontWeight: '900', color: TEXT },
  ctNotesInput: { backgroundColor: SURFACE2, borderRadius: 14, padding: 14, fontSize: 14, color: TEXT, borderWidth: 1, borderColor: BORDER, marginBottom: 20, minHeight: 60, textAlignVertical: 'top' },
  ctBtnRow: { flexDirection: 'row', gap: 10 },
  ctCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER },
  ctCancelTxt: { color: TEXT2, fontWeight: '700', fontSize: 15 },
  ctConfirmBtn: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a' },
  ctConfirmTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
