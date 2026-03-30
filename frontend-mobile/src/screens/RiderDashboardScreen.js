import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { fetchAllTaxiRanks, fetchUserBookings } from '../api/taxiRanks';
import ThemeToggle from '../components/ThemeToggle';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const BLUE = '#0d6efd';

export default function RiderDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [bookings, setBookings] = useState([]);

  const userId = user?.userId || user?.id;

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [rankResp, bookingResp] = await Promise.all([
        fetchAllTaxiRanks().catch(() => ({ data: [] })),
        userId ? fetchUserBookings(userId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setTaxiRanks(rankResp.data || rankResp || []);
      setBookings(bookingResp.data || bookingResp || []);
    } catch (err) {
      console.warn('RiderDashboard load error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // Derived data
  const now = new Date();
  const upcomingBookings = bookings.filter(b => {
    if (b.status === 'Cancelled') return false;
    const d = new Date(b.travelDate);
    return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }).sort((a, b) => new Date(a.travelDate) - new Date(b.travelDate));

  const completedCount = bookings.filter(b => b.status === 'Completed').length;
  const walletBalance = 0; // Mzansi Wallet — to be developed

  // Loading
  if (loading) {
    return (
      <View style={[styles.centerFull, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ====== HEADER ====== */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerGreeting}>Hello, {user?.fullName || user?.email || 'Rider'} 👋</Text>
            <Text style={styles.headerSub}>Where are you heading today?</Text>
          </View>
          <ThemeToggle showBackground={false} size={22} />
        </View>

        {/* Wallet Card */}
        <TouchableOpacity style={styles.walletCard} activeOpacity={0.85}>
          <View style={styles.walletLeft}>
            <Ionicons name="wallet-outline" size={22} color="#000" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.walletLabel}>Mzansi Wallet</Text>
              <Text style={styles.walletBalance}>R{walletBalance.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.walletAction}>
            <Ionicons name="add-circle" size={20} color="#000" />
            <Text style={styles.walletActionText}>Top Up</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ====== BODY ====== */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
      >
        {/* ====== QUICK ACTIONS ====== */}
        <View style={styles.quickGrid}>
          <QuickAction
            icon="bus-outline" label="Book Trip"
            desc="Browse & book"
            color={GOLD} bg={GOLD_LIGHT}
            onPress={() => navigation.navigate('RiderTripBrowser')}
          />
          <QuickAction
            icon="ticket-outline" label="My Bookings"
            desc={`${upcomingBookings.length} upcoming`}
            color={BLUE} bg="rgba(13,110,253,0.1)"
            onPress={() => navigation.navigate('MyBookings')}
          />
          <QuickAction
            icon="car-outline" label="Live Queue"
            desc="Book a seat now"
            color={GREEN} bg="rgba(25,135,84,0.1)"
            onPress={() => navigation.navigate('RiderQueue')}
          />
          <QuickAction
            icon="star-outline" label="History"
            desc={`${completedCount} trips`}
            color="#6f42c1" bg="rgba(111,66,193,0.1)"
            onPress={() => navigation.navigate('MyBookings')}
          />
        </View>

        {/* ====== UPCOMING BOOKINGS ====== */}
        <SectionHeader icon="calendar-outline" title="Upcoming Trips" color={c.text} />
        {upcomingBookings.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="calendar-outline" size={36} color={c.textMuted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No upcoming trips</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>Book a trip to get started!</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('RiderTripBrowser')}
            >
              <Ionicons name="search-outline" size={16} color={GOLD} />
              <Text style={styles.emptyBtnText}>Browse Trips</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingBookings.slice(0, 3).map((booking) => (
            <BookingCard key={booking.id} booking={booking} c={c} onPress={() => navigation.navigate('MyBookings')} />
          ))
        )}

        {upcomingBookings.length > 3 && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('MyBookings')}>
            <Text style={styles.viewAllText}>View all bookings ({upcomingBookings.length})</Text>
            <Ionicons name="chevron-forward" size={16} color={GOLD} />
          </TouchableOpacity>
        )}

        {/* ====== MY TRIPS ====== */}
        <SectionHeader icon="car-outline" title="My Trips" color={c.text} />
        <QuickAction
          icon="list-outline"
          label="View Trip History"
          desc="Rate and review your completed trips"
          color={GOLD}
          bg={GOLD_LIGHT}
          onPress={() => navigation.navigate('PassengerTrips')}
        />

        {/* ====== TAXI RANKS ====== */}
        <SectionHeader icon="business-outline" title="Taxi Ranks" color={c.text} />
        {taxiRanks.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="business-outline" size={36} color={c.textMuted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No taxi ranks found</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>Pull down to refresh</Text>
          </View>
        ) : (
          taxiRanks.slice(0, 6).map((rank) => (
            <TouchableOpacity
              key={rank.id}
              style={[styles.rankCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => navigation.navigate('RiderTripBrowser', { preSelectedRankId: rank.id })}
              activeOpacity={0.85}
            >
              <View style={[styles.rankIcon, { backgroundColor: GOLD_LIGHT }]}>
                <Ionicons name="business-outline" size={20} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rankName, { color: c.text }]}>{rank.name}</Text>
                <Text style={[styles.rankMeta, { color: c.textMuted }]}>
                  {[rank.city, rank.province].filter(Boolean).join(', ') || rank.address || 'Taxi rank'}
                </Text>
              </View>
              <View style={styles.rankAction}>
                <Text style={styles.rankActionText}>Trips</Text>
                <Ionicons name="chevron-forward" size={16} color={GOLD} />
              </View>
            </TouchableOpacity>
          ))
        )}

        {taxiRanks.length > 6 && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('RiderTripBrowser')}>
            <Text style={styles.viewAllText}>View all ranks ({taxiRanks.length})</Text>
            <Ionicons name="chevron-forward" size={16} color={GOLD} />
          </TouchableOpacity>
        )}

        {/* ====== PAYMENT INFO ====== */}
        <SectionHeader icon="card-outline" title="Payment Options" color={c.text} />
        <View style={[styles.paymentGrid]}>
          <PaymentCard icon="swap-horizontal-outline" label="EFT / Ozow" desc="Instant bank transfer" color="#0d6efd" c={c} />
          <PaymentCard icon="wallet-outline" label="Mzansi Wallet" desc="Coming soon" color={GOLD} c={c} />
          <PaymentCard icon="cash-outline" label="Cash" desc="Pay the driver" color={GREEN} c={c} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ====== BOTTOM BAR ====== */}
      <View style={[styles.bottomBar, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <BottomTab icon="home-outline" label="Home" active onPress={() => {}} c={c} />
        <BottomTab icon="search-outline" label="Trips" onPress={() => navigation.navigate('RiderTripBrowser')} c={c} />
        <BottomTab icon="ticket-outline" label="Bookings" onPress={() => navigation.navigate('MyBookings')} c={c} />
        <BottomTab icon="person-outline" label="Profile" onPress={() => {}} c={c} />
        <BottomTab icon="log-out-outline" label="Logout" onPress={() => { signOut(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); }} c={c} />
      </View>
    </View>
  );
}

// ===== SUB-COMPONENTS =====

function SectionHeader({ icon, title, color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 }}>
      <Ionicons name={icon} size={18} color={GOLD} />
      <Text style={{ fontSize: 16, fontWeight: '900', color }}>{title}</Text>
    </View>
  );
}

function QuickAction({ icon, label, desc, color, bg, onPress }) {
  return (
    <TouchableOpacity style={[qStyles.card, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[qStyles.iconWrap, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <Text style={[qStyles.label, { color: '#333' }]}>{label}</Text>
      <Text style={qStyles.desc}>{desc}</Text>
    </TouchableOpacity>
  );
}

function BookingCard({ booking, c, onPress }) {
  const date = new Date(booking.travelDate);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const route = booking.route;
  const vehicle = booking.scheduledTrip?.vehicle;
  const statusColors = {
    Confirmed: { bg: 'rgba(25,135,84,0.12)', text: GREEN },
    Pending: { bg: GOLD_LIGHT, text: '#cc9a00' },
  };
  const sc = statusColors[booking.status] || { bg: 'rgba(108,117,125,0.12)', text: '#6c757d' };

  return (
    <TouchableOpacity style={[bStyles.card, { backgroundColor: c.surface, borderColor: c.border }]} onPress={onPress} activeOpacity={0.85}>
      <View style={bStyles.dateBlock}>
        <Text style={[bStyles.dateDay, { color: GOLD }]}>{date.getDate()}</Text>
        <Text style={[bStyles.dateMonth, { color: c.textMuted }]}>{months[date.getMonth()].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={[bStyles.route, { color: c.text }]}>{route?.routeName || 'Scheduled Trip'}</Text>
        <Text style={[bStyles.stations, { color: c.textMuted }]}>
          {route?.departureStation || '—'} → {route?.destinationStation || '—'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View style={[bStyles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[bStyles.badgeText, { color: sc.text }]}>{booking.status}</Text>
          </View>
          <Text style={[bStyles.seats, { color: c.textMuted }]}>{booking.seatsBooked || 1} seat(s)</Text>
          {vehicle?.registration ? (
            <View style={[bStyles.badge, { backgroundColor: GOLD_LIGHT }]}>
              <Text style={[bStyles.badgeText, { color: GOLD }]}>{vehicle.registration}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[bStyles.fare, { color: c.text }]}>R{(booking.totalFare || 0).toFixed(0)}</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function PaymentCard({ icon, label, desc, color, c }) {
  return (
    <View style={[pStyles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[pStyles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[pStyles.label, { color: c.text }]}>{label}</Text>
      <Text style={[pStyles.desc, { color: c.textMuted }]}>{desc}</Text>
    </View>
  );
}

function BottomTab({ icon, label, active, onPress, c }) {
  return (
    <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }} onPress={onPress}>
      <Ionicons name={icon} size={22} color={active ? GOLD : c.textMuted} />
      <Text style={{ fontSize: 10, fontWeight: active ? '800' : '600', color: active ? GOLD : c.textMuted, marginTop: 2 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ===== STYLES =====

const qStyles = StyleSheet.create({
  card: { width: '48%', borderRadius: 14, padding: 14, marginBottom: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '800' },
  desc: { fontSize: 11, color: '#888', marginTop: 2 },
});

const bStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  dateBlock: { width: 44, alignItems: 'center' },
  dateDay: { fontSize: 22, fontWeight: '900' },
  dateMonth: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  route: { fontSize: 14, fontWeight: '800' },
  stations: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  seats: { fontSize: 11 },
  fare: { fontSize: 16, fontWeight: '900' },
});

const pStyles = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  desc: { fontSize: 10, textAlign: 'center', marginTop: 2 },
});

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1 },
    centerFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 14, marginTop: 12 },

    // Header
    header: {
      backgroundColor: '#1a1a2e',
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerGreeting: { color: '#fff', fontSize: 20, fontWeight: '900' },
    headerSub: { color: GOLD, fontSize: 12, fontWeight: '600', marginTop: 2 },

    walletCard: {
      backgroundColor: GOLD,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    walletLeft: { flexDirection: 'row', alignItems: 'center' },
    walletLabel: { fontSize: 11, fontWeight: '700', color: '#000', textTransform: 'uppercase', letterSpacing: 1 },
    walletBalance: { fontSize: 22, fontWeight: '900', color: '#000' },
    walletAction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    walletActionText: { fontSize: 12, fontWeight: '800', color: '#000' },

    // Body
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },

    // Quick actions
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 },

    // Empty state
    emptyCard: { borderRadius: 14, borderWidth: 1, padding: 28, alignItems: 'center' },
    emptyTitle: { fontSize: 15, fontWeight: '800', marginTop: 10 },
    emptySub: { fontSize: 12, marginTop: 4 },
    emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: GOLD_LIGHT, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    emptyBtnText: { fontSize: 13, fontWeight: '700', color: GOLD },

    // View all
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 },
    viewAllText: { fontSize: 13, fontWeight: '700', color: GOLD },

    // Rank cards
    rankCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
    rankIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    rankName: { fontSize: 14, fontWeight: '800', marginLeft: 12 },
    rankMeta: { fontSize: 12, marginLeft: 12, marginTop: 2 },
    rankAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rankActionText: { fontSize: 12, fontWeight: '700', color: GOLD },

    // Payment grid
    paymentGrid: { flexDirection: 'row', gap: 10 },

    // Bottom bar
    bottomBar: {
      flexDirection: 'row',
      borderTopWidth: 1,
      paddingTop: 6,
    },
  });
}
