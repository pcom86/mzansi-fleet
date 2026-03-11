import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  fetchTaxiRanks, fetchTrips, fetchTripSchedules,
} from '../api/taxiRanks';
import ThemeToggle from '../components/ThemeToggle';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const { width: SCREEN_W } = Dimensions.get('window');

export default function MarshalDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const hasTenant = user?.tenantId && user.tenantId !== EMPTY_GUID;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRank, setActiveRank] = useState(null);
  const [trips, setTrips] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const loadData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      // Load taxi ranks for tenant
      if (hasTenant) {
        const ranksResp = await fetchTaxiRanks(user.tenantId);
        const ranks = ranksResp.data || ranksResp || [];
        const rank = ranks[0] || null;
        setActiveRank(rank);

        // Load trips and schedules in parallel
        const [tripsResp, schedResp] = await Promise.all([
          rank?.id
            ? fetchTrips(rank.id, user.tenantId).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          fetchTripSchedules(rank?.id, user.tenantId).catch(() => ({ data: [] })),
        ]);
        setTrips(tripsResp.data || tripsResp || []);
        setSchedules(schedResp.data || schedResp || []);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      console.warn('Marshal dashboard load error', msg);
      if (!silent) Alert.alert('Error', `Unable to load dashboard: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, hasTenant]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // Derived stats
  const todayTrips = trips || [];
  const totalPassengers = todayTrips.reduce((sum, t) => sum + (t.passengerCount || t.passengers || 0), 0);
  const todayRevenue = todayTrips.reduce((sum, t) => sum + (t.totalFare || t.fare || t.revenue || 0), 0);
  const activeTrips = trips.filter(t => t.status === 'InProgress' || t.status === 'Active');
  const activeSchedules = schedules.filter(s => s.isActive);

  // Card revenue
  const cardRevenue = todayTrips.reduce((sum, t) => {
    if (t.paymentMethod === 'Card') return sum + (t.totalFare || t.fare || 0);
    return sum;
  }, 0);

  // No tenant guard
  if (!user || !hasTenant) {
    return (
      <View style={[styles.centerFull, { backgroundColor: c.background }]}>
        <Ionicons name="shield-outline" size={48} color={GOLD} />
        <Text style={[styles.noTenantTitle, { color: c.text }]}>No Association Linked</Text>
        <Text style={[styles.noTenantSub, { color: c.textMuted }]}>
          Your account is not associated with a taxi rank association yet.
        </Text>
      </View>
    );
  }

  // Loading
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
            </View>
            <View style={styles.marshalBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color={GOLD} />
              <Text style={styles.marshalBadgeText}>Marshal</Text>
            </View>
            <View style={{ marginLeft: 8 }}>
              <ThemeToggle showBackground={false} size={24} />
            </View>
          </View>
          <Text style={styles.headerRole}>Queue Marshal Portal</Text>
          <Text style={styles.headerWelcome}>
            Welcome, {user?.fullName || user?.email || 'Marshal'}
          </Text>

          {/* Quick status pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow} contentContainerStyle={{ gap: 8 }}>
            <QuickPill icon="car-sport-outline" label="Active Trips" badge={activeTrips.length} />
            <QuickPill icon="people-outline" label="Passengers" badge={totalPassengers} />
            <QuickPill icon="calendar-outline" label="Schedules" badge={activeSchedules.length} />
          </ScrollView>
        </View>
      </View>

      {/* ====== BODY ====== */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
      >
        {/* ====== STATS OVERVIEW ====== */}
        <View style={styles.statsRow}>
          <StatCard icon="navigate-outline" label="Today's Trips" value={todayTrips.length} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
          <StatCard icon="people-outline" label="Passengers" value={totalPassengers} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
          <StatCard icon="cash-outline" label="Cash Rev." value={`R${(todayRevenue - cardRevenue).toFixed(0)}`} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
          <StatCard icon="card-outline" label="Card Rev." value={`R${cardRevenue.toFixed(0)}`} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
        </View>

        {/* ====== CAPTURE TRIP CTA ====== */}
        <TouchableOpacity
          style={styles.captureCta}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TripDetails', { rank: activeRank })}
        >
          <View style={styles.captureCtaIcon}>
            <Ionicons name="scan-outline" size={28} color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.captureCtaTitle}>Capture Trip Details</Text>
            <Text style={styles.captureCtaSub}>Record passengers, collect fares (Cash / Card)</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#000" />
        </TouchableOpacity>

        {/* ====== MARSHAL ACTIONS ====== */}
        <SectionHeader icon="apps-outline" title="Actions" color={c.text} />
        <View style={styles.cardGrid}>
          <ActionCard
            icon="calendar-outline" title="View Schedules"
            desc="Browse today's route schedules"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('CreateTripSchedule')}
          />
          <ActionCard
            icon="document-text-outline" title="Trip History"
            desc="View your captured trips"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('AdminTripDetails')}
          />
          <ActionCard
            icon="ticket-outline" title="Book a Trip"
            desc="Browse routes and book seats"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('BookTrip')}
          />
          <ActionCard
            icon="receipt-outline" title="My Bookings"
            desc="View upcoming and past bookings"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('MyBookings')}
          />
        </View>

        {/* ====== RANK INFO ====== */}
        {activeRank && (
          <>
            <SectionHeader icon="location-outline" title="Your Taxi Rank" color={c.text} />
            <View style={[styles.rankInfoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[styles.rankIcon, { backgroundColor: GOLD_LIGHT }]}>
                <Ionicons name="location-outline" size={22} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rankName, { color: c.text }]}>{activeRank.name}</Text>
                <Text style={[styles.rankMeta, { color: c.textMuted }]}>
                  {activeRank.city || activeRank.address || 'No address'} · {activeRank.status || 'Active'}
                </Text>
                {activeRank.code && (
                  <Text style={[styles.rankMeta, { color: GOLD, fontWeight: '600' }]}>Code: {activeRank.code}</Text>
                )}
              </View>
            </View>
          </>
        )}

        {/* ====== TODAY'S SCHEDULES ====== */}
        <SectionHeader icon="time-outline" title="Today's Schedules" color={c.text} />
        {activeSchedules.length === 0 ? (
          <View style={[styles.emptySection, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="calendar-outline" size={32} color={c.textMuted} />
            <Text style={[styles.emptySectionText, { color: c.textMuted }]}>No active schedules</Text>
          </View>
        ) : (
          activeSchedules.slice(0, 5).map((s) => (
            <View key={s.id} style={[styles.scheduleItem, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[styles.scheduleIcon, { backgroundColor: GOLD_LIGHT }]}>
                <Ionicons name="git-branch-outline" size={18} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.scheduleTitle, { color: c.text }]}>{s.routeName || 'Route'}</Text>
                <Text style={[styles.scheduleSub, { color: c.textMuted }]}>
                  {s.departureStation} → {s.destinationStation} · R{s.standardFare}
                </Text>
                {s.departureTime && (
                  <Text style={[styles.scheduleSub, { color: GOLD, fontWeight: '600' }]}>
                    Departs: {s.departureTime}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.scheduleCapBtn}
                onPress={() => navigation.navigate('TripDetails', { rank: activeRank, preSelectedSchedule: s })}
              >
                <Ionicons name="add-circle" size={28} color={GOLD} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* ====== RECENT TRIPS ====== */}
        <SectionHeader icon="navigate-outline" title="Recent Trips" color={c.text} />
        {todayTrips.length === 0 ? (
          <View style={[styles.emptySection, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="car-outline" size={32} color={c.textMuted} />
            <Text style={[styles.emptySectionText, { color: c.textMuted }]}>No trips recorded today</Text>
          </View>
        ) : (
          todayTrips.slice(0, 5).map((t, i) => (
            <View key={t.id || i} style={[styles.tripItem, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tripRoute, { color: c.text }]}>
                  {t.departureStation || t.origin || 'Origin'} → {t.destinationStation || t.destination || 'Dest'}
                </Text>
                <Text style={[styles.tripMeta, { color: c.textMuted }]}>
                  {t.passengerCount || 0} passengers · R{t.totalFare || t.fare || 0}
                </Text>
              </View>
              <View style={[styles.tripStatusBadge, {
                backgroundColor: t.status === 'Completed' ? 'rgba(25,135,84,0.15)' : t.status === 'Departed' ? 'rgba(37,99,235,0.15)' : GOLD_LIGHT
              }]}>
                <Text style={[styles.tripStatusText, {
                  color: t.status === 'Completed' ? '#22C55E' : t.status === 'Departed' ? '#60A5FA' : GOLD
                }]}>{t.status || 'Pending'}</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ====== BOTTOM BAR ====== */}
      <View style={[styles.bottomBar, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <BottomTab icon="grid-outline" label="Dashboard" active onPress={() => {}} textColor={c.text} muted={c.textMuted} />
        <BottomTab
          icon="scan-outline" label="Capture" highlight
          onPress={() => navigation.navigate('TripDetails', { rank: activeRank })}
          textColor={c.text} muted={c.textMuted}
        />
        <BottomTab icon="ticket-outline" label="Bookings" onPress={() => navigation.navigate('BookTrip')} textColor={c.text} muted={c.textMuted} />
        <BottomTab
          icon="log-out-outline" label="Logout"
          onPress={() => { signOut(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); }}
          textColor={c.text} muted={c.textMuted}
        />
      </View>
    </View>
  );
}

/* ===== Sub-components ===== */

function QuickPill({ icon, label, badge }) {
  return (
    <View style={styles.quickPill}>
      <Ionicons name={icon} size={16} color={GOLD} />
      <Text style={styles.quickLabel}>{label}</Text>
      {badge > 0 && <View style={styles.quickBadge}><Text style={styles.quickBadgeText}>{badge}</Text></View>}
    </View>
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

function BottomTab({ icon, label, active, highlight, onPress, textColor, muted }) {
  return (
    <TouchableOpacity style={styles.bottomTab} onPress={onPress} activeOpacity={0.7}>
      {highlight ? (
        <View style={styles.highlightBtn}>
          <Ionicons name={icon} size={22} color="#000" />
        </View>
      ) : (
        <Ionicons name={icon} size={22} color={active ? GOLD : muted} />
      )}
      <Text style={[styles.bottomTabLabel, { color: active ? GOLD : highlight ? GOLD : muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ icon, title, color }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon} size={18} color={GOLD} />
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
    </View>
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
  headerWelcome: { fontSize: 13, color: '#ffffffcc', marginBottom: 10 },

  marshalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(212,175,55,0.18)', borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)' },
  marshalBadgeText: { color: GOLD, fontSize: 11, fontWeight: '800' },

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

  /* Capture CTA */
  captureCta: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: GOLD, borderRadius: 16, padding: 16, marginBottom: 20,
  },
  captureCtaIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  captureCtaTitle: { fontSize: 17, fontWeight: '900', color: '#000' },
  captureCtaSub: { fontSize: 12, color: '#000000aa', marginTop: 2 },

  /* Section */
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },

  /* Action cards */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 18 },
  actionCard: { width: CARD_W, borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionTitle: { fontSize: 14, fontWeight: '800' },
  actionDesc: { fontSize: 11, lineHeight: 16 },

  /* Rank info */
  rankInfoCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 18, gap: 12 },
  rankIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rankName: { fontSize: 15, fontWeight: '800' },
  rankMeta: { fontSize: 11, marginTop: 2 },

  /* Schedules */
  scheduleItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  scheduleIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  scheduleTitle: { fontSize: 13, fontWeight: '700' },
  scheduleSub: { fontSize: 11, marginTop: 2 },
  scheduleCapBtn: { padding: 4 },

  /* Trips */
  tripItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  tripRoute: { fontSize: 13, fontWeight: '700' },
  tripMeta: { fontSize: 11, marginTop: 2 },
  tripStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tripStatusText: { fontSize: 10, fontWeight: '700' },

  /* Empty section */
  emptySection: { borderWidth: 1, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8, marginBottom: 18 },
  emptySectionText: { fontSize: 13, fontWeight: '600' },

  /* Bottom bar */
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 4 },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, minHeight: 52 },
  bottomTabLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  highlightBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', marginTop: -18, shadowColor: GOLD, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },

  /* Utility */
  centerFull: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  noTenantTitle: { fontSize: 18, fontWeight: '800' },
  noTenantSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  loadingText: { marginTop: 12, fontSize: 13 },
});
