import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Platform, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { fetchTaxiRanks, fetchMarshals, fetchTrips, fetchAllTaxiRanks, linkTaxiRankToAssociation } from '../api/taxiRanks';
import ThemeToggle from '../components/ThemeToggle';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

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

  // Link taxi rank modal state
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [allRanks, setAllRanks] = useState([]);
  const [rankSearchQuery, setRankSearchQuery] = useState('');
  const [loadingAllRanks, setLoadingAllRanks] = useState(false);
  const [linking, setLinking] = useState(false);

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
          fetchTrips(rank.id, user?.tenantId).catch(() => ({ data: [] })),
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

  async function handleOpenLinkModal() {
    setLinkModalVisible(true);
    setRankSearchQuery('');
    setLoadingAllRanks(true);
    try {
      const resp = await fetchAllTaxiRanks();
      const ranks = resp.data || resp || [];
      // Filter out ranks already linked to this association
      const linkedIds = new Set(taxiRanks.map(r => r.id));
      const available = ranks.filter(r => !linkedIds.has(r.id));
      setAllRanks(available);
    } catch (err) {
      console.error('Error loading taxi ranks:', err);
      Alert.alert('Error', 'Failed to load available taxi ranks');
    } finally {
      setLoadingAllRanks(false);
    }
  }

  async function handleLinkRank(rank) {
    Alert.alert(
      'Link Taxi Rank',
      `Link "${rank.name}" to your association?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Link',
          onPress: async () => {
            try {
              setLinking(true);
              await linkTaxiRankToAssociation(rank.id, user.tenantId);
              Alert.alert('Success', `"${rank.name}" has been linked to your association`);
              setLinkModalVisible(false);
              loadData(true);
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to link taxi rank');
            } finally {
              setLinking(false);
            }
          }
        }
      ]
    );
  }

  const filteredRanks = rankSearchQuery.trim()
    ? allRanks.filter(r =>
        (r.name || '').toLowerCase().includes(rankSearchQuery.toLowerCase()) ||
        (r.code || '').toLowerCase().includes(rankSearchQuery.toLowerCase()) ||
        (r.city || '').toLowerCase().includes(rankSearchQuery.toLowerCase())
      )
    : allRanks;

  // Derived stats - revenue API already returns today's trips
  const todayTrips = trips || [];
  
  // Debug: Log the actual data structure
  if (typeof __DEV__ !== 'undefined' && __DEV__ && todayTrips.length > 0) {
    console.log('[Dashboard] First trip data structure:', todayTrips[0]);
    console.log('[Dashboard] All trips keys:', todayTrips.map(t => Object.keys(t)));
  }
  
  const totalPassengers = todayTrips.reduce((sum, t) => sum + (t.passengerCount || t.passengers || 0), 0);
  const todayRevenue = todayTrips.reduce((sum, t) => sum + (t.totalFare || t.fare || t.revenue || 0), 0);
  const activeTrips = trips.filter(t => t.status === 'InProgress' || t.status === 'Active');

  // Calculate current month trips and revenue
  const monthTrips = trips.filter(t => {
    if (t.tripDate || t.date) {
      const tripDate = new Date(t.tripDate || t.date);
      const now = new Date();
      return tripDate.getMonth() === now.getMonth() && tripDate.getFullYear() === now.getFullYear();
    }
    return false;
  });

  const currentMonthRevenue = monthTrips.reduce((sum, t) => sum + (t.totalFare || t.fare || t.revenue || 0), 0);

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
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerRank} numberOfLines={1}>
                {activeRank?.name || 'Taxi Rank'}
              </Text>
              {activeRank && (
                <TouchableOpacity 
                  onPress={() => navigation.navigate('TaxiRankEdit', { rank: activeRank })}
                  style={{ marginLeft: 8, padding: 4 }}
                >
                  <Ionicons name="pencil-outline" size={18} color="#ffffffcc" />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ marginRight: 8 }}>
              <ThemeToggle showBackground={false} size={24} />
            </View>
          </View>
          <Text style={styles.headerRole}>{roleLabel} Portal</Text>

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
        {/* ====== STATS OVERVIEW ====== */}
        <View style={styles.statsRow}>
          <StatCard icon="navigate-outline" label="Today's Trips" value={todayTrips.length} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
          <StatCard icon="people-outline" label="Passengers" value={totalPassengers} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
          <StatCard icon="cash-outline" label="Today Rev." value={`R${todayRevenue.toFixed(0)}`} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
          <StatCard icon="trending-up-outline" label="Month Rev." value={`R${currentMonthRevenue.toFixed(0)}`} bg={c.surface} border={c.border} text={c.text} muted={c.textMuted} />
        </View>

        {/* ====== MONTHLY PERFORMANCE ====== */}
        <View style={[styles.monthlyRevenueCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.monthlyRevenueHeader}>
            <View style={styles.monthlyRevenueIcon}>
              <Ionicons name="analytics-outline" size={24} color={GOLD} />
            </View>
            <View style={styles.monthlyRevenueText}>
              <Text style={[styles.monthlyRevenueTitle, { color: c.text }]}>Monthly Performance</Text>
              <Text style={[styles.monthlyRevenueSubtitle, { color: c.textMuted }]}>
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <View style={styles.monthlyRevenueStats}>
            <View style={styles.monthlyRevenueStat}>
              <Text style={[styles.monthlyRevenueValue, { color: c.text }]}>R{currentMonthRevenue.toFixed(2)}</Text>
              <Text style={[styles.monthlyRevenueLabel, { color: c.textMuted }]}>Revenue</Text>
            </View>
            <View style={styles.monthlyRevenueStat}>
              <Text style={[styles.monthlyRevenueValue, { color: c.text }]}>{monthTrips.length}</Text>
              <Text style={[styles.monthlyRevenueLabel, { color: c.textMuted }]}>Trips</Text>
            </View>
            <View style={styles.monthlyRevenueStat}>
              <Text style={[styles.monthlyRevenueValue, { color: c.text }]}>
                R{monthTrips.length > 0 ? (currentMonthRevenue / monthTrips.length).toFixed(0) : '0'}
              </Text>
              <Text style={[styles.monthlyRevenueLabel, { color: c.textMuted }]}>Avg / Trip</Text>
            </View>
          </View>
        </View>

        {/* ====== YOUR TAXI RANKS ====== */}
        <SectionHeader icon="location-outline" title="Your Taxi Ranks" color={c.text} />
        {taxiRanks.length === 0 ? (
          <View style={[styles.emptySection, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="location-outline" size={32} color={c.textMuted} />
            <Text style={[styles.emptySectionText, { color: c.textMuted }]}>No taxi ranks linked yet</Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={handleOpenLinkModal}>
              <Ionicons name="add-circle" size={18} color={GOLD} />
              <Text style={styles.emptyActionText}>Link a Taxi Rank</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
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
            <TouchableOpacity
              style={[styles.linkRankBtn, { borderColor: c.border }]}
              onPress={handleOpenLinkModal}
            >
              <Ionicons name="add-circle-outline" size={18} color={GOLD} />
              <Text style={[styles.linkRankText, { color: GOLD }]}>Link Another Rank</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ====== RANK OPERATIONS ====== */}
        <SectionHeader icon="settings-outline" title="Rank Operations" color={c.text} />
        <View style={styles.cardGrid}>
          <ActionCard
            icon="git-branch-outline" title="Manage Routes"
            desc="Create and manage routes for your ranks"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('TaxiRankRoutes', { rank: activeRank })}
          />
          <ActionCard
            icon="calendar-outline" title="Trip Schedules"
            desc="Plan daily rosters and assign vehicles"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('CreateTripSchedule')}
          />
          <ActionCard
            icon="car-outline" title="Fleet Management"
            desc="Assign vehicles to routes and ranks"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('VehicleRouteAssignment')}
          />
          <ActionCard
            icon="list-outline" title="Queue Management"
            desc="FIFO vehicle queue per route"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('QueueManagement', { rank: activeRank })}
          />
          <ActionCard
            icon="document-text-outline" title="Trip Capture"
            desc="Record trips, view history & analytics"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('AdminTripDetails')}
          />
          <ActionCard
            icon="checkmark-done-outline" title="Complete Trip"
            desc="Finalize trip, record earnings & notify owner"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('CreateTripSchedule')}
          />
        </View>

        {/* ====== PEOPLE MANAGEMENT ====== */}
        <SectionHeader icon="people-outline" title="People Management" color={c.text} />
        <View style={styles.cardGrid}>
          <ActionCard
            icon="shield-outline" title="Marshal Management"
            desc="Create and manage queue marshals"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('MarshalManagement', { adminId: user?.userId })}
          />
          <ActionCard
            icon="people-circle-outline" title="Passengers"
            desc="View passenger queues and boarding"
            bg={c.surface} border={c.border} text={c.text} muted={c.textMuted}
            onPress={() => navigation.navigate('BookTrip')}
          />
        </View>

        {/* Marshals on duty */}
        {marshals.length > 0 && (
          <View style={[styles.marshalSection, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.marshalSectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={GOLD} />
              <Text style={[styles.marshalSectionTitle, { color: c.text }]}>Marshals on Duty ({marshals.length})</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {marshals.slice(0, 8).map((m, i) => (
                <View key={m.id || i} style={[styles.marshalChip, { backgroundColor: c.background, borderColor: c.border }]}>
                  <View style={[styles.marshalAvatar, { backgroundColor: GOLD_LIGHT }]}>
                    <Ionicons name="person" size={14} color={GOLD} />
                  </View>
                  <Text style={[styles.marshalName, { color: c.text }]} numberOfLines={1}>{m.fullName || 'Marshal'}</Text>
                  <View style={[styles.marshalStatus, { backgroundColor: '#28a745' }]} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ====== TRIP BOOKINGS ====== */}
        <SectionHeader icon="ticket-outline" title="Trip Bookings" color={c.text} />
        <View style={styles.cardGrid}>
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
      </ScrollView>

      {/* ====== LINK TAXI RANK MODAL ====== */}
      <Modal visible={linkModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Link Taxi Rank</Text>
              <TouchableOpacity onPress={() => setLinkModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: c.textMuted }]}>
              Search and link a taxi rank to your association
            </Text>

            {/* Search Input */}
            <View style={[styles.searchRow, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="search" size={18} color={c.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: c.text }]}
                placeholder="Search by name, code or city..."
                placeholderTextColor={c.textMuted}
                value={rankSearchQuery}
                onChangeText={setRankSearchQuery}
              />
              {rankSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setRankSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={c.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Results */}
            {loadingAllRanks ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={GOLD} />
                <Text style={[{ color: c.textMuted, marginTop: 8, fontSize: 13 }]}>Loading taxi ranks...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalList} contentContainerStyle={{ paddingBottom: 16 }}>
                {filteredRanks.length === 0 ? (
                  <View style={styles.modalCenter}>
                    <Ionicons name="search-outline" size={40} color={c.textMuted} />
                    <Text style={[{ color: c.textMuted, marginTop: 8, fontSize: 13, textAlign: 'center' }]}>
                      {rankSearchQuery.trim() ? 'No taxi ranks match your search' : 'No available taxi ranks to link'}
                    </Text>
                  </View>
                ) : (
                  filteredRanks.map(rank => (
                    <TouchableOpacity
                      key={rank.id}
                      style={[styles.rankLinkItem, { backgroundColor: c.surface, borderColor: c.border }]}
                      onPress={() => handleLinkRank(rank)}
                      disabled={linking}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.rankLinkIcon, { backgroundColor: GOLD_LIGHT }]}>
                        <Ionicons name="location-outline" size={20} color={GOLD} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rankLinkName, { color: c.text }]}>{rank.name}</Text>
                        <Text style={[styles.rankLinkMeta, { color: c.textMuted }]}>
                          {[rank.code, rank.city, rank.province].filter(Boolean).join(' · ')}
                        </Text>
                        {rank.address ? (
                          <Text style={[styles.rankLinkMeta, { color: c.textMuted }]} numberOfLines={1}>{rank.address}</Text>
                        ) : null}
                      </View>
                      <Ionicons name="add-circle" size={24} color={GOLD} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            {linking && (
              <View style={styles.linkingOverlay}>
                <ActivityIndicator size="large" color={GOLD} />
                <Text style={{ color: '#fff', marginTop: 8, fontWeight: '700' }}>Linking...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ====== BOTTOM BAR ====== */}
      <View style={[styles.bottomBar, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <BottomTab icon="grid-outline" label="Dashboard" active onPress={() => {}} textColor={c.text} muted={c.textMuted} />
        <BottomTab icon="add-circle-outline" label="Capture" onPress={() => navigation.navigate('AdminTripDetails')} textColor={c.text} muted={c.textMuted} />
        <BottomTab icon="shield-outline" label="Marshals" onPress={() => navigation.navigate('MarshalManagement', { adminId: user?.userId })} textColor={c.text} muted={c.textMuted} />
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
  statCard: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600' },

  /* Section */
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },

  /* Action cards */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 18 },
  actionCard: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionTitle: { fontSize: 14, fontWeight: '800' },
  actionDesc: { fontSize: 11, lineHeight: 16 },

  /* Rank list */
  rankItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  rankIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rankName: { fontSize: 14, fontWeight: '700' },
  rankMeta: { fontSize: 11, marginTop: 2 },

  /* Marshals */
  marshalSection: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 18 },
  marshalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  marshalSectionTitle: { fontSize: 14, fontWeight: '700' },
  marshalChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, gap: 6 },
  marshalAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  marshalName: { fontSize: 12, fontWeight: '600', maxWidth: 100 },
  marshalStatus: { width: 8, height: 8, borderRadius: 4 },

  /* Empty section */
  emptySection: { borderWidth: 1, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8, marginBottom: 18 },
  emptySectionText: { fontSize: 13, fontWeight: '600' },
  emptyActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: GOLD_LIGHT },
  emptyActionText: { fontSize: 13, fontWeight: '700', color: GOLD },

  /* Link rank button */
  linkRankBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 12, marginBottom: 18 },
  linkRankText: { fontSize: 13, fontWeight: '700' },

  /* Monthly Revenue Card */
  monthlyRevenueCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 18 },
  monthlyRevenueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  monthlyRevenueIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: GOLD_LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  monthlyRevenueText: { flex: 1 },
  monthlyRevenueTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  monthlyRevenueSubtitle: { fontSize: 12, fontWeight: '500' },
  monthlyRevenueStats: { flexDirection: 'row', justifyContent: 'space-between' },
  monthlyRevenueStat: { alignItems: 'center' },
  monthlyRevenueValue: { fontSize: 18, fontWeight: '900', marginBottom: 2 },
  monthlyRevenueLabel: { fontSize: 11, fontWeight: '600' },

  /* Bottom bar */
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 4 },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, minHeight: 52 },
  bottomTabLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  /* Utility */
  centerFull: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  noTenantTitle: { fontSize: 18, fontWeight: '800' },
  noTenantSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  loadingText: { marginTop: 12, fontSize: 13 },

  /* Link Taxi Rank Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalSubtitle: { fontSize: 13, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  modalList: { flex: 1 },
  modalCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  rankLinkItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  rankLinkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rankLinkName: { fontSize: 14, fontWeight: '700' },
  rankLinkMeta: { fontSize: 11, marginTop: 2 },
  linkingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
