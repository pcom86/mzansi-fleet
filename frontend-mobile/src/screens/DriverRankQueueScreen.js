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

  // ── Derived counts ──
  const waitingCnt = queue.filter(i => norm(i.status) === 'waiting').length;
  const dispatchedCnt = queue.filter(i => norm(i.status) === 'dispatched').length;
  const completedCnt = queue.filter(i => norm(i.status) === 'completed').length;
  const isToday = date === isoDate(new Date());
  const myPos = myEntry?.queuePosition ?? null;
  const aheadOfMe = myPos != null ? queue.filter(i => !i.isMine && norm(i.status) === 'waiting' && i.queuePosition < myPos).length : 0;
  const totalEarnings = dispatchedTrips.reduce((s, t) => s + (t.fareAmount || t.totalAmount || 0), 0);
  const activeTripsCount = dispatchedTrips.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length;

  // ── Loading ──
  if (loading) {
    return (
      <View style={[st.root, st.center, { paddingTop: insets.top }]}>
        <View style={st.loadingRing}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
        <Text style={st.loadingTitle}>Rank Queue</Text>
        <Text style={st.loadingTxt}>Fetching your queue position…</Text>
      </View>
    );
  }

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>

      {/* ════════════════ HEADER BAND ════════════════ */}
      <View style={st.hdrBand}>
        <TouchableOpacity style={st.hdrBack} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={st.hdrTitle}>Rank Queue</Text>
          {data?.rankName ? (
            <Text style={st.hdrRank} numberOfLines={1}>{data.rankName}</Text>
          ) : null}
        </View>

        {/* Tab pills */}
        <View style={st.hdrTabs}>
          {[
            { key: 'queue', label: 'Queue', cnt: queue.length },
            { key: 'dispatched', label: 'My Trips', cnt: dispatchedTrips.length },
          ].map(t => {
            const on = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[st.hdrTab, on && st.hdrTabOn]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.8}
              >
                <Text style={[st.hdrTabTxt, on && st.hdrTabTxtOn]}>{t.label}</Text>
                {t.cnt > 0 && (
                  <View style={[st.hdrTabBubble, on && st.hdrTabBubbleOn]}>
                    <Text style={[st.hdrTabBubbleTxt, on && st.hdrTabBubbleTxtOn]}>{t.cnt}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={st.hdrRefresh}
          onPress={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          hitSlop={10}
        >
          {refreshing
            ? <ActivityIndicator size="small" color={GOLD} />
            : <Ionicons name="refresh-outline" size={19} color={TEXT2} />}
        </TouchableOpacity>
      </View>

      {/* ════════════════ HERO SECTION ════════════════ */}
      {activeTab === 'queue' && (
        canCompleteTrip ? (
          /* ── DISPATCHED HERO ── */
          <View style={st.heroDispatched}>
            {/* Top stripe */}
            <View style={st.heroDispatchedStripe} />
            <View style={st.heroDispatchedInner}>
              {/* Live badge row */}
              <View style={st.heroLiveBadgeRow}>
                <View style={st.heroPulseWrap}>
                  <Animated.View style={[st.heroPulseRing, { opacity: pulseAnim }]} />
                  <View style={st.heroPulseDot} />
                </View>
                <Text style={st.heroLiveLabel}>LIVE  ·  EN ROUTE</Text>
                <View style={st.heroLiveBadge}><Text style={st.heroLiveBadgeTxt}>ACTIVE</Text></View>
              </View>

              {/* Vehicle + route */}
              <View style={st.heroDispatchedMain}>
                <Text style={st.heroDispatchedReg}>
                  {myDispatchedTrip?.vehicleRegistration || data?.vehicleRegistration || '—'}
                </Text>
                {(myDispatchedTrip?.routeName || data?.routeName) ? (
                  <View style={st.heroRouteRow}>
                    <Ionicons name="navigate" size={13} color="#22c55e" />
                    <Text style={st.heroRouteTxt} numberOfLines={1}>
                      {myDispatchedTrip?.routeName || data?.routeName}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Info pills */}
              <View style={st.heroPillRow}>
                {myDispatchedTrip?.fareAmount > 0 && (
                  <View style={[st.heroPill, { borderColor: '#22c55e55' }]}>
                    <Ionicons name="cash-outline" size={12} color="#22c55e" />
                    <Text style={[st.heroPillTxt, { color: '#22c55e' }]}>R{Number(myDispatchedTrip.fareAmount).toFixed(2)}</Text>
                  </View>
                )}
                {(myDispatchedTrip?.passengerCount ?? 0) > 0 && (
                  <View style={st.heroPill}>
                    <Ionicons name="people-outline" size={12} color={TEXT2} />
                    <Text style={st.heroPillTxt}>{myDispatchedTrip.passengerCount} pax</Text>
                  </View>
                )}
                {myDispatchedTrip?.departedAt && (
                  <View style={st.heroPill}>
                    <Ionicons name="time-outline" size={12} color={TEXT2} />
                    <Text style={st.heroPillTxt}>{fmtTime(myDispatchedTrip.departedAt)}</Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={st.heroDispatchedBtns}>
                <TouchableOpacity
                  style={st.heroDispatchedBtnSecondary}
                  onPress={() => openDetails(myDispatchedTrip)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="receipt-outline" size={16} color={GOLD} />
                  <Text style={[st.heroDispatchedBtnTxt, { color: GOLD }]}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={st.heroDispatchedBtnPrimary}
                  onPress={handleCompleteTrip}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={st.heroDispatchedBtnPrimaryTxt}>Complete Trip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : myEntry ? (
          /* ── WAITING IN QUEUE HERO ── */
          <View style={st.heroWaiting}>
            <View style={st.heroWaitingRow}>
              <View style={st.heroWaitingLeft}>
                <Text style={st.heroWaitingLabel}>YOUR POSITION</Text>
                <Text style={st.heroWaitingPos}>#{myPos}</Text>
                <Text style={st.heroWaitingAhead}>
                  {aheadOfMe === 0 ? 'Next up!' : `${aheadOfMe} vehicle${aheadOfMe > 1 ? 's' : ''} ahead`}
                </Text>
              </View>
              <View style={st.heroWaitingDivider} />
              <View style={st.heroWaitingRight}>
                <View style={st.heroWaitingPill}>
                  <Ionicons name="car-outline" size={12} color={GOLD} />
                  <Text style={st.heroWaitingPillTxt} numberOfLines={1}>
                    {myEntry.vehicleRegistration || '—'}
                  </Text>
                </View>
                {myEntry.routeName ? (
                  <View style={[st.heroWaitingPill, { marginTop: 6 }]}>
                    <Ionicons name="navigate-outline" size={12} color={TEXT2} />
                    <Text style={[st.heroWaitingPillTxt, { color: TEXT2 }]} numberOfLines={1}>
                      {myEntry.routeName}
                    </Text>
                  </View>
                ) : null}
                <View style={[st.heroWaitingPill, { marginTop: 6, borderColor: '#f59e0b55' }]}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#f59e0b' }} />
                  <Text style={[st.heroWaitingPillTxt, { color: '#f59e0b' }]}>
                    {(myEntry.status || 'Waiting').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Queue position progress strip */}
            {queue.length > 0 && (
              <View style={st.heroWaitingStrip}>
                {queue.slice(0, Math.min(12, queue.length)).map((q, i) => {
                  const qMine = q.isMine;
                  const qDone = norm(q.status) === 'completed';
                  const qRoute = norm(q.status) === 'dispatched';
                  return (
                    <View
                      key={q.id || i}
                      style={[
                        st.heroStripPip,
                        qMine && { backgroundColor: GOLD, width: 14, borderRadius: 4 },
                        qRoute && { backgroundColor: '#22c55e' },
                        qDone && { backgroundColor: '#334155', opacity: 0.4 },
                      ]}
                    />
                  );
                })}
                {queue.length > 12 && (
                  <Text style={st.heroStripMore}>+{queue.length - 12}</Text>
                )}
              </View>
            )}
          </View>
        ) : (
          /* ── NOT IN QUEUE HERO ── */
          <View style={st.heroEmpty}>
            <View style={st.heroEmptyIcon}>
              <Ionicons name="hourglass-outline" size={22} color={TEXT2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.heroEmptyTitle}>Not in queue today</Text>
              <Text style={st.heroEmptyTxt}>Contact your marshal to join the queue</Text>
            </View>
          </View>
        )
      )}

      {/* ════════════════ CONTROL ROW (date + stats) ════════════════ */}
      <View style={st.controlRow}>
        {/* Date picker */}
        <TouchableOpacity style={st.dateArrow} onPress={() => changeDate(-1)} hitSlop={6}>
          <Ionicons name="chevron-back" size={16} color={TEXT2} />
        </TouchableOpacity>
        <TouchableOpacity style={st.datePill} activeOpacity={0.7} onPress={() => {}}>
          <Ionicons name="calendar-outline" size={12} color={GOLD} />
          <Text style={st.dateTxt}>{fmtDateLabel(date)}</Text>
          {isToday && <View style={st.dateLiveDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={st.dateArrow} onPress={() => changeDate(1)} hitSlop={6}>
          <Ionicons name="chevron-forward" size={16} color={TEXT2} />
        </TouchableOpacity>

        {activeTab === 'queue' && queue.length > 0 && (
          <>
            <View style={st.controlDivider} />
            <View style={st.statMini}>
              <Text style={[st.statMiniNum, { color: '#f59e0b' }]}>{waitingCnt}</Text>
              <Text style={st.statMiniLbl}>wait</Text>
            </View>
            <View style={st.statMini}>
              <Text style={[st.statMiniNum, { color: '#22c55e' }]}>{dispatchedCnt}</Text>
              <Text style={st.statMiniLbl}>route</Text>
            </View>
            <View style={st.statMini}>
              <Text style={[st.statMiniNum, { color: TEXT2 }]}>{completedCnt}</Text>
              <Text style={st.statMiniLbl}>done</Text>
            </View>
          </>
        )}

        {activeTab === 'dispatched' && (
          <>
            <View style={st.controlDivider} />
            <View style={st.statMini}>
              <Text style={[st.statMiniNum, { color: GOLD }]}>{dispatchedTrips.length}</Text>
              <Text style={st.statMiniLbl}>trips</Text>
            </View>
            {totalEarnings > 0 && (
              <View style={st.statMini}>
                <Text style={[st.statMiniNum, { color: '#22c55e', fontSize: 12 }]}>R{totalEarnings.toFixed(0)}</Text>
                <Text style={st.statMiniLbl}>earned</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* ════════════════ FILTER CHIPS (queue tab) ════════════════ */}
      {activeTab === 'queue' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.filterScroll}
          contentContainerStyle={st.filterRow}
        >
          {[
            { key: 'all', label: 'All', cnt: queue.length, color: GOLD },
            { key: 'waiting', label: 'Waiting', cnt: waitingCnt, color: '#f59e0b' },
            { key: 'dispatched', label: 'En Route', cnt: dispatchedCnt, color: '#22c55e' },
            { key: 'completed', label: 'Done', cnt: completedCnt, color: '#64748b' },
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
      )}

      {/* ════════════════ CONTENT ════════════════ */}
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollInner}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={GOLD}
          />
        }
      >
        {activeTab === 'queue' ? (
          /* ══ QUEUE TAB ══ */
          filtered.length === 0 ? (
            <View style={st.empty}>
              <View style={st.emptyCircle}>
                <Ionicons name="car-outline" size={30} color={MUTED} />
              </View>
              <Text style={st.emptyTitle}>Queue is empty</Text>
              <Text style={st.emptySub}>{data?.message || `No vehicles queued for ${fmtDateLabel(date).toLowerCase()}`}</Text>
            </View>
          ) : (
            filtered.map((item, idx) => {
              const sc = statusColor(item.status);
              const isMine = item.isMine;
              const isEnRoute = norm(item.status) === 'dispatched';
              const isDone = norm(item.status) === 'completed';
              const hasTripDetails = Boolean(item.tripId);
              const isLast = idx === filtered.length - 1;
              return (
                <View key={item.id || idx} style={st.qRow}>
                  {/* Left timeline column */}
                  <View style={st.qTimelineCol}>
                    <View style={[
                      st.qPosBubble,
                      isMine && st.qPosBubbleMine,
                      isEnRoute && !isMine && st.qPosBubbleRoute,
                      isDone && st.qPosBubbleDone,
                    ]}>
                      {isDone ? (
                        <Ionicons name="checkmark" size={13} color="#475569" />
                      ) : isEnRoute ? (
                        <Ionicons name="navigate" size={13} color="#22c55e" />
                      ) : (
                        <Text style={[st.qPosNum, { color: isMine ? '#000' : TEXT2 }]}>
                          {item.queuePosition}
                        </Text>
                      )}
                    </View>
                    {!isLast && (
                      <View style={[st.qConnector, isDone && { opacity: 0.3 }]} />
                    )}
                  </View>

                  {/* Card */}
                  <TouchableOpacity
                    style={[
                      st.qCard,
                      isMine && st.qCardMine,
                      isDone && st.qCardDone,
                      isEnRoute && !isMine && st.qCardRoute,
                    ]}
                    activeOpacity={hasTripDetails ? 0.75 : 1}
                    onPress={hasTripDetails ? () => openDetails(item) : undefined}
                  >
                    {isMine && (
                      <View style={st.youBanner}>
                        <Ionicons name="star" size={8} color="#000" />
                        <Text style={st.youBannerTxt}>YOUR VEHICLE</Text>
                      </View>
                    )}

                    <View style={st.qTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[st.qReg, isDone && { color: '#475569' }]}>
                          {item.vehicleRegistration || '—'}
                        </Text>
                        <Text style={st.qDriver} numberOfLines={1}>{item.driverName || 'No driver'}</Text>
                      </View>
                      <View style={[st.qStatusBadge, { backgroundColor: sc + '1a', borderColor: sc + '55' }]}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isDone ? '#475569' : sc, marginRight: 4 }} />
                        <Text style={[st.qStatusTxt, { color: isDone ? '#475569' : sc }]}>
                          {isEnRoute ? 'EN ROUTE' : isDone ? 'DONE' : (item.status || 'WAITING').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {item.routeName && (
                      <View style={[st.qRouteRow, isEnRoute && { borderColor: '#22c55e33', backgroundColor: '#22c55e08' }]}>
                        <Ionicons name="navigate-outline" size={11} color={isEnRoute ? '#22c55e' : MUTED} />
                        <Text style={[st.qRouteTxt, isEnRoute && { color: '#22c55e' }]} numberOfLines={1}>
                          {item.routeName}
                        </Text>
                      </View>
                    )}

                    <View style={st.qMetaRow}>
                      {item.passengerCount > 0 && (
                        <View style={st.qMeta}>
                          <Ionicons name="people-outline" size={10} color={MUTED} />
                          <Text style={st.qMetaTxt}>{item.passengerCount} pax</Text>
                        </View>
                      )}
                      {item.fareAmount > 0 && (
                        <View style={[st.qMeta, { borderColor: '#22c55e44' }]}>
                          <Ionicons name="cash-outline" size={10} color="#22c55e" />
                          <Text style={[st.qMetaTxt, { color: '#22c55e' }]}>R{Number(item.fareAmount).toFixed(2)}</Text>
                        </View>
                      )}
                      {item.departedAt && (
                        <View style={st.qMeta}>
                          <Ionicons name="time-outline" size={10} color={MUTED} />
                          <Text style={st.qMetaTxt}>{fmtTime(item.departedAt)}</Text>
                        </View>
                      )}
                    </View>

                    {hasTripDetails && (
                      <View style={st.qTapHint}>
                        <Ionicons name="receipt-outline" size={10} color={GOLD} />
                        <Text style={st.qTapHintTxt}>View trip details</Text>
                        <Ionicons name="chevron-forward" size={12} color={GOLD + '80'} style={{ marginLeft: 'auto' }} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )
        ) : (
          /* ══ MY TRIPS TAB ══ */
          dispatchedTrips.length === 0 ? (
            <View style={st.empty}>
              <View style={st.emptyCircle}>
                <Ionicons name="car-sport-outline" size={30} color={MUTED} />
              </View>
              <Text style={st.emptyTitle}>No trips yet</Text>
              <Text style={st.emptySub}>
                Your dispatched trips for {fmtDateLabel(date).toLowerCase()} will appear here
              </Text>
            </View>
          ) : (
            <>
              {/* Earnings summary bar */}
              {totalEarnings > 0 && (
                <View style={st.earningsBar}>
                  <View style={st.earningsBarLeft}>
                    <Text style={st.earningsBarLabel}>Today's Earnings</Text>
                    <Text style={st.earningsBarAmount}>R {totalEarnings.toFixed(2)}</Text>
                  </View>
                  <View style={st.earningsBarRight}>
                    <View style={st.earningsStat}>
                      <Text style={st.earningsStatNum}>{dispatchedTrips.length}</Text>
                      <Text style={st.earningsStatLbl}>trips</Text>
                    </View>
                    {activeTripsCount > 0 && (
                      <View style={[st.earningsStat, { marginLeft: 16 }]}>
                        <Text style={[st.earningsStatNum, { color: '#22c55e' }]}>{activeTripsCount}</Text>
                        <Text style={st.earningsStatLbl}>active</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {dispatchedTrips.map((trip, idx) => {
                const sc = statusColor(trip.status || 'Dispatched');
                const isActive = trip.status !== 'Completed' && trip.status !== 'Cancelled';
                const isEnRoute = trip.status === 'Dispatched' || trip.status === 'Departed';
                const displayStatus = isEnRoute ? 'EN ROUTE' : (trip.status || 'Active');
                const fare = trip.fareAmount || trip.totalAmount || 0;
                const from = trip.departureStation || trip.origin || null;
                const to = trip.destinationStation || trip.destination || trip.route?.destinationStation || null;
                const depTime = fmtTime(trip.departedAt || trip.departureTime);
                return (
                  <TouchableOpacity
                    key={trip.id || idx}
                    style={[st.tripCard, isActive && { borderColor: sc + '55' }]}
                    onPress={() => openDetails({ id: trip.id, tripId: trip.id })}
                    activeOpacity={0.8}
                  >
                    <View style={[st.tripStripe, { backgroundColor: sc }]} />

                    <View style={st.tripBody}>
                      {/* Header row */}
                      <View style={st.tripHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={st.tripReg}>
                            {trip.vehicleRegistration || trip.vehicle?.registration || '—'}
                          </Text>
                          {trip.route?.routeName && (
                            <Text style={st.tripRouteName} numberOfLines={1}>{trip.route.routeName}</Text>
                          )}
                        </View>
                        <View style={st.tripHeaderRight}>
                          {depTime !== '—' && <Text style={st.tripTimeDisplay}>{depTime}</Text>}
                          <View style={[st.tripStatusBadge, { backgroundColor: sc + '1a', borderColor: sc + '55', marginTop: 3 }]}>
                            {isEnRoute && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: sc, marginRight: 4 }} />}
                            <Text style={[st.tripStatusTxt, { color: sc }]}>{displayStatus}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Journey visualization */}
                      {(from || to) && (
                        <View style={st.tripJourney}>
                          <View style={st.tripJourneyLine}>
                            <View style={st.tripJourneyOrigin} />
                            <View style={st.tripJourneyConnector} />
                            <View style={st.tripJourneyDest} />
                          </View>
                          <View style={st.tripJourneyLabels}>
                            <Text style={[st.tripJourneyStation, { color: TEXT }]} numberOfLines={1}>
                              {from || 'Departure'}
                            </Text>
                            <Text style={[st.tripJourneyStation, { color: TEXT2 }]} numberOfLines={1}>
                              {to || 'Destination'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Meta row */}
                      <View style={st.tripMetaRow}>
                        {fare > 0 && (
                          <View style={[st.tripMeta, { borderColor: '#22c55e44' }]}>
                            <Ionicons name="cash-outline" size={11} color="#22c55e" />
                            <Text style={[st.tripMetaTxt, { color: '#22c55e' }]}>R{Number(fare).toFixed(2)}</Text>
                          </View>
                        )}
                        {(trip.passengerCount ?? 0) > 0 && (
                          <View style={st.tripMeta}>
                            <Ionicons name="people-outline" size={11} color={MUTED} />
                            <Text style={st.tripMetaTxt}>{trip.passengerCount} pax</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }} />
                        <Ionicons name="chevron-forward" size={14} color={GOLD + '80'} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ════════════════ COMPLETE TRIP BOTTOM SHEET ════════════════ */}
      <Modal
        visible={completeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!completing) setCompleteVisible(false); }}
      >
        <View style={st.ctOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => { if (!completing) setCompleteVisible(false); }}
          />
          <View style={st.ctSheet}>
            <View style={st.ctHandle} />

            {/* Header */}
            <View style={st.ctHeaderRow}>
              <View style={st.ctHeaderIcon}>
                <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.ctTitle}>Complete Trip</Text>
                <Text style={st.ctSub} numberOfLines={1}>
                  {myDispatchedTrip?.vehicleRegistration || data?.vehicleRegistration || '—'}
                  {(myDispatchedTrip?.routeName || data?.routeName)
                    ? `  ·  ${myDispatchedTrip?.routeName || data?.routeName}`
                    : ''}
                </Text>
              </View>
            </View>

            {/* Fare */}
            <Text style={st.ctLabel}>Total Fare Collected</Text>
            <View style={st.ctFareRow}>
              <View style={st.ctCurrencyBox}>
                <Text style={st.ctCurrency}>R</Text>
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
            <Text style={[st.ctLabel, { marginTop: 14 }]}>
              Notes{'  '}
              <Text style={{ fontWeight: '400', color: MUTED }}>(optional)</Text>
            </Text>
            <TextInput
              style={st.ctNotesInput}
              placeholder="Add notes about this trip…"
              placeholderTextColor={MUTED}
              value={completeNotes}
              onChangeText={setCompleteNotes}
              multiline
              numberOfLines={2}
            />

            {/* Buttons */}
            <View style={st.ctBtnRow}>
              <TouchableOpacity
                style={st.ctCancelBtn}
                onPress={() => setCompleteVisible(false)}
                disabled={completing}
              >
                <Text style={st.ctCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.ctConfirmBtn, completing && { opacity: 0.65 }]}
                onPress={confirmCompleteTrip}
                disabled={completing}
              >
                {completing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={st.ctConfirmTxt}>Complete Trip</Text>
                    </>
                  )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: 'center', justifyContent: 'center' },

  // ── Loading ──
  loadingRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  loadingTitle: { fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 4 },
  loadingTxt: { color: TEXT2, fontSize: 13, fontWeight: '500' },

  // ── Header band ──
  hdrBand: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  hdrBack: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  hdrTitle: { fontSize: 15, fontWeight: '900', color: TEXT, letterSpacing: 0.2 },
  hdrRank: { fontSize: 10, fontWeight: '700', color: GOLD, marginTop: 1, letterSpacing: 0.4 },
  hdrTabs: { flexDirection: 'row', gap: 6 },
  hdrTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18,
    backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER,
  },
  hdrTabOn: { backgroundColor: GOLD, borderColor: GOLD },
  hdrTabTxt: { fontSize: 11, fontWeight: '800', color: TEXT2 },
  hdrTabTxtOn: { color: '#000' },
  hdrTabBubble: {
    backgroundColor: BORDER, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  hdrTabBubbleOn: { backgroundColor: 'rgba(0,0,0,0.18)' },
  hdrTabBubbleTxt: { fontSize: 9, fontWeight: '900', color: TEXT2 },
  hdrTabBubbleTxtOn: { color: '#000' },
  hdrRefresh: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },

  // ── Hero: dispatched ──
  heroDispatched: { backgroundColor: '#071a0f', borderBottomWidth: 1, borderBottomColor: '#22c55e30' },
  heroDispatchedStripe: { height: 3, backgroundColor: '#22c55e' },
  heroDispatchedInner: { padding: 16 },
  heroLiveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  heroPulseWrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  heroPulseRing: {
    position: 'absolute', width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#22c55e',
  },
  heroPulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', zIndex: 1 },
  heroLiveLabel: { flex: 1, fontSize: 10, fontWeight: '900', color: '#22c55e', letterSpacing: 1 },
  heroLiveBadge: {
    backgroundColor: '#22c55e22', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: '#22c55e55',
  },
  heroLiveBadgeTxt: { fontSize: 9, fontWeight: '900', color: '#22c55e', letterSpacing: 0.8 },
  heroDispatchedMain: { marginBottom: 12 },
  heroDispatchedReg: { fontSize: 26, fontWeight: '900', color: TEXT, letterSpacing: 0.5 },
  heroRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  heroRouteTxt: { fontSize: 13, fontWeight: '700', color: '#22c55e' },
  heroPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: SURFACE2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  heroPillTxt: { fontSize: 12, fontWeight: '700', color: TEXT2 },
  heroDispatchedBtns: { flexDirection: 'row', gap: 10 },
  heroDispatchedBtnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: SURFACE2, borderWidth: 1, borderColor: GOLD + '55',
  },
  heroDispatchedBtnTxt: { fontSize: 13, fontWeight: '800' },
  heroDispatchedBtnPrimary: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 12, borderRadius: 14, backgroundColor: '#16a34a',
  },
  heroDispatchedBtnPrimaryTxt: { fontSize: 13, fontWeight: '900', color: '#fff' },

  // ── Hero: waiting in queue ──
  heroWaiting: {
    backgroundColor: '#0d1a2e', borderBottomWidth: 1, borderBottomColor: GOLD + '30',
    paddingVertical: 16, paddingHorizontal: 20,
  },
  heroWaitingRow: { flexDirection: 'row', alignItems: 'center' },
  heroWaitingStrip: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, flexWrap: 'wrap' },
  heroStripPip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  heroStripMore: { fontSize: 10, color: TEXT2, fontWeight: '700', marginLeft: 4 },
  heroWaitingLeft: { alignItems: 'center', minWidth: 90 },
  heroWaitingLabel: { fontSize: 9, fontWeight: '900', color: GOLD, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  heroWaitingPos: { fontSize: 52, fontWeight: '900', color: GOLD, lineHeight: 58 },
  heroWaitingAhead: { fontSize: 11, fontWeight: '700', color: TEXT2, marginTop: 2 },
  heroWaitingDivider: { width: 1, height: 60, backgroundColor: BORDER, marginHorizontal: 18 },
  heroWaitingRight: { flex: 1 },
  heroWaitingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SURFACE2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: BORDER, alignSelf: 'flex-start',
  },
  heroWaitingPillTxt: { fontSize: 12, fontWeight: '700', color: TEXT, flexShrink: 1 },

  // ── Hero: not in queue ──
  heroEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  heroEmptyIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmptyTitle: { fontSize: 14, fontWeight: '800', color: TEXT },
  heroEmptyTxt: { fontSize: 12, color: TEXT2, marginTop: 2 },

  // ── Control row (date + stats) ──
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

  // ── Filter chips ──
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

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollInner: { padding: 14 },

  // ── Queue row + timeline ──
  qRow: { flexDirection: 'row', marginBottom: 10 },
  qTimelineCol: { width: 44, alignItems: 'center', paddingTop: 4 },
  qPosBubble: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: SURFACE2, borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  qPosBubbleMine: { backgroundColor: GOLD, borderColor: GOLD },
  qPosBubbleRoute: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22c55e55' },
  qPosBubbleDone: { opacity: 0.35 },
  qConnector: { width: 2, flex: 1, backgroundColor: BORDER, minHeight: 8, marginTop: 3 },

  // ── Queue card ──
  qCard: {
    flex: 1, backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 12, marginLeft: 6,
  },
  qCardMine: {
    borderColor: GOLD + '60', backgroundColor: '#130f00',
    shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  qCardDone: { opacity: 0.45 },
  qCardRoute: { borderColor: '#22c55e33' },

  youBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: GOLD, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  youBannerTxt: { fontSize: 8, fontWeight: '900', color: '#000', letterSpacing: 0.6 },

  qPosNum: { fontSize: 13, fontWeight: '900', color: TEXT2 },
  qTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  qReg: { fontSize: 15, fontWeight: '900', color: TEXT, letterSpacing: 0.3 },
  qDriver: { fontSize: 11, color: TEXT2, marginTop: 1 },
  qStatusBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2,
  },
  qStatusTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  qRouteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: SURFACE2, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER, marginBottom: 8, alignSelf: 'flex-start',
  },
  qRouteTxt: { fontSize: 11, fontWeight: '700', color: MUTED },
  qMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  qMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SURFACE2, borderRadius: 18, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: BORDER,
  },
  qMetaTxt: { fontSize: 10, fontWeight: '700', color: TEXT2 },
  qTapHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER,
  },
  qTapHintTxt: { fontSize: 11, color: GOLD, fontWeight: '600', flex: 1 },

  // ── My Trips: earnings bar ──
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

  // ── Trip card (My Trips tab) ──
  tripCard: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: SURFACE, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  tripStripe: { width: 3 },
  tripBody: { flex: 1, padding: 14 },
  tripHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tripHeaderRight: { alignItems: 'flex-end' },
  tripTimeDisplay: { fontSize: 18, fontWeight: '900', color: TEXT },
  tripReg: { fontSize: 15, fontWeight: '900', color: TEXT, letterSpacing: 0.3 },
  tripRouteName: { fontSize: 11, color: TEXT2, marginTop: 1 },
  tripStatusBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  tripStatusTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  tripJourney: {
    flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'stretch',
    backgroundColor: SURFACE2, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  tripJourneyLine: { alignItems: 'center', width: 14, justifyContent: 'space-between', paddingVertical: 2 },
  tripJourneyOrigin: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  tripJourneyConnector: { width: 2, flex: 1, backgroundColor: BORDER, marginVertical: 2, minHeight: 14 },
  tripJourneyDest: { width: 7, height: 7, borderRadius: 2, backgroundColor: '#ef4444' },
  tripJourneyLabels: { flex: 1, justifyContent: 'space-between' },
  tripJourneyStation: { fontSize: 12, fontWeight: '700' },

  tripMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  tripMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SURFACE2, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: BORDER,
  },
  tripMetaTxt: { fontSize: 11, fontWeight: '700', color: TEXT2 },

  // ── Empty state ──
  empty: { alignItems: 'center', paddingTop: 64, paddingBottom: 20 },
  emptyCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 6 },
  emptySub: { fontSize: 13, color: TEXT2, textAlign: 'center', lineHeight: 20, paddingHorizontal: 36 },

  // ── Complete trip bottom sheet ──
  ctOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  ctSheet: {
    backgroundColor: '#0d1624', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderColor: '#1e2d45',
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 24,
  },
  ctHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#1e2d45', alignSelf: 'center', marginBottom: 22 },
  ctHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  ctHeaderIcon: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#22c55e33',
  },
  ctTitle: { fontSize: 18, fontWeight: '900', color: TEXT },
  ctSub: { fontSize: 12, color: MUTED, marginTop: 3, fontWeight: '600' },
  ctLabel: { fontSize: 10, fontWeight: '900', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  ctFareRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE2, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 4, overflow: 'hidden',
  },
  ctCurrencyBox: {
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#162035', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: BORDER,
  },
  ctCurrency: { fontSize: 20, fontWeight: '900', color: '#22c55e' },
  ctFareInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, fontWeight: '900', color: TEXT },
  ctNotesInput: {
    backgroundColor: SURFACE2, borderRadius: 14, padding: 14,
    fontSize: 14, color: TEXT, borderWidth: 1, borderColor: BORDER,
    marginBottom: 20, minHeight: 60, textAlignVertical: 'top',
  },
  ctBtnRow: { flexDirection: 'row', gap: 10 },
  ctCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', backgroundColor: SURFACE2,
    borderWidth: 1, borderColor: BORDER,
  },
  ctCancelTxt: { color: TEXT2, fontWeight: '700', fontSize: 15 },
  ctConfirmBtn: {
    flex: 1.8, flexDirection: 'row', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a',
  },
  ctConfirmTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
