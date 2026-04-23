import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import { fetchMarshals, fetchTrips } from '../api/taxiRanks';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';

function fmtTime(iso) {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return '--:--'; }
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  } catch { return ''; }
}

const STATUS_COLORS = {
  Departed:  { bg: 'rgba(13,110,253,0.12)',  text: '#0d6efd' },
  InTransit: { bg: 'rgba(255,193,7,0.12)',   text: '#cc9a00' },
  Arrived:   { bg: 'rgba(25,135,84,0.12)',   text: '#198754' },
  Completed: { bg: 'rgba(25,135,84,0.12)',   text: '#198754' },
};

export default function TaxiRankDetailsScreen({ route, navigation }) {
  const { rank } = route.params || {};
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const [marshals, setMarshals] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadDetails = useCallback(async (silent = false) => {
    if (!rank?.id) { setLoading(false); return; }
    if (!silent) setLoading(true);
    setError(null);

    const [mResult, tResult] = await Promise.allSettled([
      fetchMarshals(rank.id),
      fetchTrips(rank.id),
    ]);

    if (mResult.status === 'fulfilled') {
      setMarshals(mResult.value?.data || mResult.value || []);
    } else {
      console.warn('fetchMarshals error:', mResult.reason?.message);
      setMarshals([]);
    }

    if (tResult.status === 'fulfilled') {
      setTrips(tResult.value?.data || tResult.value || []);
    } else {
      console.warn('fetchTrips error:', tResult.reason?.message);
      setTrips([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [rank?.id]);

  useEffect(() => { loadDetails(); }, [loadDetails]);
  const onRefresh = () => { setRefreshing(true); loadDetails(true); };

  if (!rank) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.textMuted} />
        <Text style={[styles.emptyText, { color: c.textMuted }]}>No rank data provided</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.emptyHint, { color: c.textMuted }]}>Loading rank details…</Text>
      </View>
    );
  }

  const todayTrips = trips.filter(t => {
    try { return new Date(t.departureTime).toDateString() === new Date().toDateString(); }
    catch { return false; }
  });
  const totalPassengers = trips.reduce((s, t) => s + (t.passengerCount || 0), 0);
  const totalRevenue = trips.reduce((s, t) => s + (t.totalAmount || 0), 0);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{rank.name || 'Taxi Rank'}</Text>
          <Text style={styles.headerSub}>{rank.city || rank.address || 'Rank Details'}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: rank.status === 'Active' ? 'rgba(25,135,84,0.2)' : 'rgba(108,117,125,0.2)' }]}>
          <Text style={[styles.statusText, { color: rank.status === 'Active' ? '#198754' : '#6c757d' }]}>
            {rank.status || 'Active'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard icon="bus-outline"     label="Today's Trips" value={todayTrips.length}             c={c} />
          <StatCard icon="people-outline"  label="Total Pax"     value={totalPassengers}               c={c} />
          <StatCard icon="cash-outline"    label="Revenue"       value={`R${totalRevenue.toFixed(0)}`} c={c} />
          <StatCard icon="shield-outline"  label="Marshals"      value={marshals.length}               c={c} />
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <ActionBtn icon="add-circle-outline" label="Trip Management"
            onPress={() => navigation.navigate('TripManagement', { rank })} c={c} />
          <ActionBtn icon="git-branch-outline" label="Routes"
            onPress={() => navigation.navigate('TaxiRankRoutes', { rank })} c={c} />
          <ActionBtn icon="create-outline" label="Edit Rank"
            onPress={() => navigation.navigate('TaxiRankEdit', { rank })} c={c} />
        </View>

        {/* Marshals */}
        <SectionHeader title="Marshals on Duty" count={marshals.length} c={c} />
        {marshals.length === 0 ? (
          <EmptyState icon="shield-outline" text="No marshals assigned to this rank" c={c} />
        ) : (
          marshals.map((m, i) => (
            <View key={m.id || i} style={[styles.listCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[styles.listIcon, { backgroundColor: GOLD_LIGHT }]}>
                <Ionicons name="shield-outline" size={18} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listTitle, { color: c.text }]}>{m.fullName || m.name || 'Marshal'}</Text>
                <Text style={[styles.listSub, { color: c.textMuted }]}>
                  {m.marshalCode ? `Code: ${m.marshalCode}` : ''}
                  {m.phoneNumber ? (m.marshalCode ? ' · ' : '') + m.phoneNumber : ''}
                  {!m.marshalCode && !m.phoneNumber ? 'No contact info' : ''}
                </Text>
              </View>
              <View style={[styles.activeDot, { backgroundColor: m.isActive !== false ? '#198754' : '#9ca3af' }]} />
            </View>
          ))
        )}

        {/* Recent Trips */}
        <SectionHeader title="Recent Trips" count={trips.length} c={c} />
        {trips.length === 0 ? (
          <EmptyState icon="bus-outline" text="No trips recorded for this rank" c={c} />
        ) : (
          trips.slice(0, 20).map((t, i) => {
            const sc = STATUS_COLORS[t.status] || { bg: 'rgba(0,0,0,0.06)', text: c.textMuted };
            return (
              <View key={t.id || i} style={[styles.tripCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.tripCardLeft}>
                  <View style={[styles.listIcon, { backgroundColor: GOLD_LIGHT }]}>
                    <Ionicons name="navigate-outline" size={16} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, { color: c.text }]} numberOfLines={1}>
                      {t.departureStation || '?'} → {t.destinationStation || '?'}
                    </Text>
                    <Text style={[styles.listSub, { color: c.textMuted }]}>
                      {fmtDate(t.departureTime)} {fmtTime(t.departureTime)}
                      {t.vehicle?.registration ? ' · ' + t.vehicle.registration : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.tripCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: sc.text }]}>{t.status || 'Unknown'}</Text>
                  </View>
                  <Text style={[styles.tripPax, { color: c.textMuted }]}>
                    {t.passengerCount || 0} pax
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, c }) {
  return (
    <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Ionicons name={icon} size={18} color={GOLD} />
      <Text style={[styles.statVal, { color: c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, c }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={20} color={GOLD} />
      <Text style={[styles.actionBtnLabel, { color: c.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, count, c }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {count > 0 && <Text style={[styles.sectionCount, { color: c.textMuted }]}>{count}</Text>}
    </View>
  );
}

function EmptyState({ icon, text, c }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name={icon} size={32} color={c.textMuted} />
      <Text style={[styles.emptyText, { color: c.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },

  header: { backgroundColor: '#1a1a2e', paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  statusPill: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },

  body: { padding: 16, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },

  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 6 },
  actionBtnLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '600' },

  listCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  listIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontSize: 14, fontWeight: '700' },
  listSub: { fontSize: 11, marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },

  tripCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  tripCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  tripCardRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  tripPax: { fontSize: 10 },

  emptyWrap: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 12, marginTop: 4 },
});
