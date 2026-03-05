import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { fetchTaxiRanks, fetchMarshals, fetchTrips } from '../api/taxiRanks';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const { width: SCREEN_W } = Dimensions.get('window');

export default function TaxiRankDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const hasTenant = user?.tenantId && user.tenantId !== EMPTY_GUID;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [marshals, setMarshals] = useState([]);
  const [trips, setTrips] = useState([]);
  const [activeRank, setActiveRank] = useState(null);

  const loadData = useCallback(async (silent = false) => {
    if (!user || !hasTenant) return;
    if (!silent) setLoading(true);
    try {
      const ranksResp = await fetchTaxiRanks(user.tenantId);
      const ranks = ranksResp.data || ranksResp || [];
      setTaxiRanks(ranks);

      const rank = ranks[0] || null;
      setActiveRank(rank);

      if (rank?.id) {
        const [mResp, tResp] = await Promise.all([
          fetchMarshals(rank.id).catch(() => ({ data: [] })),
          fetchTrips(rank.id).catch(() => ({ data: [] })),
        ]);
        setMarshals(mResp.data || mResp || []);
        setTrips(tResp.data || tResp || []);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      console.warn('Dashboard load error', msg);
      if (!silent) Alert.alert('Error', `Unable to load dashboard: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, hasTenant]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // Derived stats
  const todayTrips = trips.filter(t => {
    const d = new Date(t.departureTime || t.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const totalPassengers = todayTrips.reduce((sum, t) => sum + (t.passengerCount || 0), 0);
  const todayRevenue = todayTrips.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const activeTrips = trips.filter(t => t.status === 'InProgress' || t.status === 'Active');

  const roleLabel = user?.role === 'TaxiRankAdmin' ? 'Rank Manager' : 'Taxi Marshal';

  // --- No tenant guard ---
  if (!user || !hasTenant) {
    return (
      <View style={[styles.centerFull, { backgroundColor: c.background }]}>
        <Ionicons name="business-outline" size={48} color={GOLD} />
        <Text style={[styles.noTenantTitle, { color: c.text }]}>No Tenant Linked</Text>
        <Text style={[styles.noTenantSub, { color: c.textMuted }]}>
          Your account is not associated with a tenant. Taxi rank features require a tenant.
        </Text>
      </View>
    );
  }

  // --- Loading ---
  if (loading) {
    return (
      <View style={[styles.centerFull, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ====== HEADER ====== */}
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerRank} numberOfLines={1}>
                {activeRank?.name || 'Taxi Rank'}
              </Text>
              <Text style={styles.headerRole}>{roleLabel} Portal</Text>
            </View>
            <TouchableOpacity style={styles.headerAvatar} onPress={() => {}}>
              <Ionicons name="person-circle-outline" size={34} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.headerWelcome}>
            Welcome, {user?.fullName || user?.email || 'User'}
          </Text>

          {/* Quick action pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow} contentContainerStyle={{ gap: 8 }}>
            <QuickPill icon="car-sport-outline" label="Active Trips" badge={activeTrips.length} onPress={() => {}} />
            <QuickPill icon="people-outline" label="Queue" badge={totalPassengers} onPress={() => {}} />
            <QuickPill icon="warning-outline" label="Incidents" badge={0} onPress={() => {}} />
          </ScrollView>
        </View>
      </View>

      {/* ====== BODY ====== */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard icon="navigate-outline" label="Today's Trips" value={todayTrips.length} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
          <StatCard icon="people-outline" label="Passengers" value={totalPassengers} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
          <StatCard icon="cash-outline" label="Revenue" value={`R${todayRevenue.toFixed(0)}`} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
          <StatCard icon="bus-outline" label="Marshals" value={marshals.length} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
        </View>

        {/* Action cards grid */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Operations</Text>
        <View style={styles.cardGrid}>
          <ActionCard
            icon="git-branch-outline" title="Manage Routes"
            desc="Create, edit and link routes to this rank"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('TaxiRankRoutes', { rank: activeRank })}
          />
          <ActionCard
            icon="create-outline" title="Edit Rank Details"
            desc="Update rank name, address, hours & status"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('TaxiRankEdit', { rank: activeRank })}
          />
          <ActionCard
            icon="add-circle-outline" title="Capture Trip"
            desc="Record departing trip details and passenger list"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('CaptureTrip', { rank: activeRank })}
          />
          <ActionCard
            icon="time-outline" title="Trip History"
            desc="View all trips recorded for your assigned rank"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('TaxiRankDetails', { rank: activeRank, tab: 'history' })}
          />
          <ActionCard
            icon="calendar-outline" title="Today's Schedule"
            desc="Your shift and scheduled tasks for today"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('TaxiRankRoutes', { rank: activeRank })}
          />
          <ActionCard
            icon="bus-outline" title="Active Vehicles"
            desc={taxiRanks.length > 0 ? `${taxiRanks.length} rank(s) active` : 'No vehicles assigned'}
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('TaxiRankDetails', { rank: activeRank })}
          />
          <ActionCard
            icon="people-circle-outline" title="Passenger Management"
            desc="Manage passenger queues and boarding"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => {}}
          />
          <ActionCard
            icon="alert-circle-outline" title="Incidents"
            desc="Report and track incidents at your rank"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => {}}
          />
        </View>

        {/* Booking section */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Trip Bookings</Text>
        <View style={styles.cardGrid}>
          <ActionCard
            icon="ticket-outline" title="Book a Trip"
            desc="Browse scheduled routes and book seats in advance"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('BookTrip')}
          />
          <ActionCard
            icon="receipt-outline" title="My Bookings"
            desc="View and manage your upcoming and past bookings"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('MyBookings')}
          />
        </View>

        {/* Taxi Ranks list */}
        {taxiRanks.length > 1 && (
          <>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Your Taxi Ranks</Text>
            {taxiRanks.map((rank) => (
              <TouchableOpacity
                key={rank.id}
                style={[styles.rankItem, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => navigation.navigate('TaxiRankDetails', { rank })}
              >
                <View style={[styles.rankIcon, { backgroundColor: GOLD_LIGHT }]}>
                  <Ionicons name="location-outline" size={20} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankName, { color: c.text }]}>{rank.name || 'Unnamed rank'}</Text>
                  <Text style={[styles.rankMeta, { color: c.textMuted }]}>
                    {rank.city || rank.address || 'No address'} · {rank.status || 'Active'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Marshals preview */}
        {marshals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Marshals on Duty</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {marshals.slice(0, 8).map((m, i) => (
                <View key={m.id || i} style={[styles.marshalChip, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Ionicons name="shield-outline" size={16} color={GOLD} />
                  <Text style={[styles.marshalName, { color: c.text }]} numberOfLines={1}>{m.fullName || 'Marshal'}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {/* ====== BOTTOM BAR ====== */}
      <View style={[styles.bottomBar, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <BottomTab icon="grid-outline" label="Dashboard" active onPress={() => {}} textColor={c.text} muted={c.textMuted} />
        <BottomTab icon="add-circle-outline" label="Capture" onPress={() => navigation.navigate('TaxiRankDetails', { rank: activeRank, tab: 'capture' })} textColor={c.text} muted={c.textMuted} />
        <BottomTab icon="list-outline" label="Trips" onPress={() => navigation.navigate('TaxiRankDetails', { rank: activeRank, tab: 'history' })} textColor={c.text} muted={c.textMuted} />
        <BottomTab icon="chatbubble-outline" label="Messages" onPress={() => {}} textColor={c.text} muted={c.textMuted} />
        <BottomTab icon="log-out-outline" label="Logout" onPress={() => { signOut(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); }} textColor={c.text} muted={c.textMuted} />
      </View>
    </View>
  );
}

/* ===== Sub-components ===== */

function QuickPill({ icon, label, badge, onPress }) {
  return (
    <TouchableOpacity style={styles.quickPill} activeOpacity={0.8} onPress={onPress}>
      <Ionicons name={icon} size={16} color={GOLD} />
      <Text style={styles.quickLabel}>{label}</Text>
      {badge > 0 && <View style={styles.quickBadge}><Text style={styles.quickBadgeText}>{badge}</Text></View>}
    </TouchableOpacity>
  );
}

function StatCard({ icon, label, value, bg, border, text, muted }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={icon} size={20} color={GOLD} />
      <Text style={[styles.statValue, { color: text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, title, desc, bg, border, text, muted, onPress }) {
  return (
    <TouchableOpacity style={[styles.actionCard, { backgroundColor: bg, borderColor: border }]} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.actionIconWrap, { backgroundColor: GOLD_LIGHT }]}>
        <Ionicons name={icon} size={22} color={GOLD} />
      </View>
      <Text style={[styles.actionTitle, { color: text }]}>{title}</Text>
      <Text style={[styles.actionDesc, { color: muted }]} numberOfLines={2}>{desc}</Text>
    </TouchableOpacity>
  );
}

function BottomTab({ icon, label, active, onPress, textColor, muted }) {
  return (
    <TouchableOpacity style={styles.bottomTab} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={active ? GOLD : muted} />
      <Text style={[styles.bottomTabLabel, { color: active ? GOLD : muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ===== Styles ===== */

const CARD_GAP = 10;
const CARD_W = (SCREEN_W - 32 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: { overflow: 'hidden' },
  headerGradient: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerRank: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerRole: { fontSize: 11, color: GOLD, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  headerAvatar: { marginLeft: 12 },
  headerWelcome: { fontSize: 13, color: '#ffffffcc', marginBottom: 10 },

  quickRow: { marginTop: 4 },
  quickPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, gap: 6 },
  quickLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  quickBadge: { backgroundColor: GOLD, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  quickBadgeText: { color: '#000', fontSize: 11, fontWeight: '800' },

  /* Body */
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 24 },

  /* Stats */
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 18 },
  statCard: { width: CARD_W, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600' },

  /* Section */
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 6 },

  /* Action cards */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 18 },
  actionCard: { width: CARD_W, borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionTitle: { fontSize: 14, fontWeight: '800' },
  actionDesc: { fontSize: 11, lineHeight: 16 },

  /* Rank list */
  rankItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  rankIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rankName: { fontSize: 14, fontWeight: '700' },
  rankMeta: { fontSize: 11, marginTop: 2 },

  /* Marshals */
  marshalChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, gap: 6 },
  marshalName: { fontSize: 12, fontWeight: '600', maxWidth: 100 },

  /* Bottom bar */
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 4 },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, minHeight: 52 },
  bottomTabLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  /* Utility */
  centerFull: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  noTenantTitle: { fontSize: 18, fontWeight: '800' },
  noTenantSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  loadingText: { marginTop: 12, fontSize: 13 },
});
