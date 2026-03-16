import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, Modal, RefreshControl, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  fetchTaxiRanks, fetchTripsByRank, fetchTripPassengers,
  completeTrip, fetchAdminByUserId,
} from '../api/taxiRanks';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const GREEN_LIGHT = 'rgba(25,135,84,0.12)';
const RED = '#dc3545';
const BLUE = '#0d6efd';
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export default function CompleteTripScreen({ route: navRoute, navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const rank = navRoute?.params?.rank || null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState([]);
  const [activeRank, setActiveRank] = useState(rank);

  // Detail modal
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const hasTenant = user?.tenantId && user.tenantId !== EMPTY_GUID;

  const loadData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      let rankId = rank?.id;

      // If no rank passed, resolve from tenant
      if (!rankId && hasTenant) {
        const ranksResp = await fetchTaxiRanks(user.tenantId);
        const ranks = ranksResp.data || ranksResp || [];
        if (ranks.length > 0) {
          setActiveRank(ranks[0]);
          rankId = ranks[0].id;
        }
      }

      if (rankId) {
        const tripsResp = await fetchTripsByRank(rankId);
        const all = tripsResp.data || tripsResp || [];
        // Show trips that can be completed: Departed, InTransit, Loading, Active, Pending
        const completable = all.filter(t =>
          t.status !== 'Completed' && t.status !== 'Cancelled'
        );
        // Sort: Departed first, then by departure time desc
        completable.sort((a, b) => {
          const order = { Departed: 0, InTransit: 1, Active: 2, Loading: 3, Pending: 4 };
          const oa = order[a.status] ?? 5;
          const ob = order[b.status] ?? 5;
          if (oa !== ob) return oa - ob;
          return new Date(b.departureTime || 0) - new Date(a.departureTime || 0);
        });
        setTrips(completable);
      }
    } catch (err) {
      console.warn('CompleteTripScreen load error:', err?.message);
      if (!silent) Alert.alert('Error', 'Failed to load trips');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, rank, hasTenant]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // Open trip detail
  async function openTripDetail(trip) {
    setSelectedTrip(trip);
    setCompletionNotes('');
    setPassengers([]);
    setLoadingPassengers(true);
    try {
      const resp = await fetchTripPassengers(trip.id);
      setPassengers(resp.data || resp || []);
    } catch (err) {
      console.warn('Failed to load passengers:', err?.message);
    } finally {
      setLoadingPassengers(false);
    }
  }

  // Complete trip
  async function handleCompleteTrip() {
    if (!selectedTrip) return;

    const paxCount = passengers.length || selectedTrip.passengerCount || 0;
    const totalFare = passengers.reduce((s, p) => s + (p.amount || 0), 0) || selectedTrip.totalAmount || 0;

    Alert.alert(
      'Complete This Trip?',
      `Route: ${selectedTrip.departureStation} → ${selectedTrip.destinationStation}\n` +
      `Vehicle: ${selectedTrip.vehicle?.registration || selectedTrip.vehicleRegistration || '?'}\n` +
      `Passengers: ${paxCount}\n` +
      `Total Earnings: R${totalFare.toFixed(2)}\n\n` +
      `This will record R${totalFare.toFixed(2)} in vehicle earnings and notify the taxi owner.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Trip',
          style: 'default',
          onPress: async () => {
            setCompleting(true);
            try {
              const result = await completeTrip(selectedTrip.id, completionNotes);
              Alert.alert(
                '✅ Trip Completed!',
                `Earnings of R${(result.totalEarnings || totalFare).toFixed(2)} recorded against ${result.vehicleRegistration || 'vehicle'}.\n\n` +
                `Owner notification: ${result.ownerNotified === 'none' ? 'No owner found' : 'Sent'}`,
                [{ text: 'OK', onPress: () => { setSelectedTrip(null); loadData(true); } }]
              );
            } catch (err) {
              const msg = err?.response?.data?.message || err?.message || 'Failed to complete trip';
              Alert.alert('Error', msg);
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  }

  // Helpers
  function formatTime(iso) {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  const statusConfig = {
    Departed: { color: BLUE, bg: 'rgba(13,110,253,0.12)', icon: 'navigate-outline' },
    InTransit: { color: '#6f42c1', bg: 'rgba(111,66,193,0.12)', icon: 'swap-horizontal-outline' },
    Active: { color: GREEN, bg: GREEN_LIGHT, icon: 'pulse-outline' },
    Loading: { color: GOLD, bg: GOLD_LIGHT, icon: 'time-outline' },
    Pending: { color: '#6c757d', bg: 'rgba(108,117,125,0.12)', icon: 'hourglass-outline' },
  };

  // Loading
  if (loading) {
    return (
      <View style={[styles.centerFull, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading trips...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ====== HEADER ====== */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Complete Trip</Text>
          <Text style={styles.headerSub}>{activeRank?.name || 'Taxi Rank'}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="checkmark-done-outline" size={16} color={GOLD} />
          <Text style={styles.headerBadgeText}>{trips.length}</Text>
        </View>
      </View>

      {/* ====== TRIP LIST ====== */}
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: GOLD_LIGHT }]}>
              <Ionicons name="checkmark-done-outline" size={40} color={GOLD} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>No Active Trips</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>
              All trips are completed or no trips have been captured yet.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back-outline" size={16} color={GOLD} />
              <Text style={styles.emptyBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: trip }) => {
          const sc = statusConfig[trip.status] || statusConfig.Pending;
          const paxCount = trip.passengerCount || 0;
          const total = trip.totalAmount || 0;
          const vehReg = trip.vehicle?.registration || trip.vehicleRegistration || '—';

          return (
            <TouchableOpacity
              style={[styles.tripCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => openTripDetail(trip)}
              activeOpacity={0.85}
            >
              {/* Status accent */}
              <View style={[styles.tripAccent, { backgroundColor: sc.color }]} />

              <View style={styles.tripBody}>
                {/* Top row */}
                <View style={styles.tripTopRow}>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Ionicons name={sc.icon} size={12} color={sc.color} />
                    <Text style={[styles.statusText, { color: sc.color }]}>{trip.status}</Text>
                  </View>
                  <Text style={[styles.tripTime, { color: c.textMuted }]}>{formatTime(trip.departureTime)}</Text>
                </View>

                {/* Route */}
                <View style={styles.routeRow}>
                  <View style={styles.routeDots}>
                    <View style={[styles.dot, { backgroundColor: GOLD }]} />
                    <View style={[styles.dotLine, { backgroundColor: c.border }]} />
                    <View style={[styles.dot, { backgroundColor: GREEN }]} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.stationText, { color: c.text }]}>{trip.departureStation || '?'}</Text>
                    <Text style={[styles.stationText, { color: c.text, marginTop: 12 }]}>{trip.destinationStation || '?'}</Text>
                  </View>
                </View>

                {/* Bottom stats */}
                <View style={styles.tripStats}>
                  <View style={styles.tripStatItem}>
                    <Ionicons name="bus-outline" size={13} color={c.textMuted} />
                    <Text style={[styles.tripStatText, { color: c.textMuted }]}>{vehReg}</Text>
                  </View>
                  <View style={styles.tripStatItem}>
                    <Ionicons name="people-outline" size={13} color={c.textMuted} />
                    <Text style={[styles.tripStatText, { color: c.textMuted }]}>{paxCount}</Text>
                  </View>
                  <View style={styles.tripStatItem}>
                    <Ionicons name="cash-outline" size={13} color={GOLD} />
                    <Text style={[styles.tripStatText, { color: GOLD, fontWeight: '800' }]}>R{total}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} style={{ marginLeft: 'auto' }} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ====== TRIP DETAIL / COMPLETE MODAL ====== */}
      <Modal visible={!!selectedTrip} animationType="slide" transparent onRequestClose={() => !completing && setSelectedTrip(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Trip Summary</Text>
                <Text style={{ fontSize: 11, color: c.textMuted }}>Review and complete this trip</Text>
              </View>
              <TouchableOpacity onPress={() => !completing && setSelectedTrip(null)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {selectedTrip && (() => {
                const cashPax = passengers.filter(p => (p.paymentMethod || 'Cash') === 'Cash');
                const cardPax = passengers.filter(p => (p.paymentMethod || 'Cash') === 'Card');
                const cashTotal = cashPax.reduce((s, p) => s + (p.amount || 0), 0);
                const cardTotal = cardPax.reduce((s, p) => s + (p.amount || 0), 0);
                const totalFare = passengers.reduce((s, p) => s + (p.amount || 0), 0) || selectedTrip.totalAmount || 0;
                const vehReg = selectedTrip.vehicle?.registration || selectedTrip.vehicleRegistration || '—';

                return (
                  <>
                    {/* Route card */}
                    <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <View style={[styles.summaryAccent, { backgroundColor: GOLD }]} />
                      <View style={{ flex: 1, padding: 14 }}>
                        <Text style={[styles.summaryLabel, { color: c.textMuted }]}>ROUTE</Text>
                        <Text style={[styles.summaryRoute, { color: c.text }]}>
                          {selectedTrip.departureStation} → {selectedTrip.destinationStation}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="bus-outline" size={14} color={c.textMuted} />
                            <Text style={{ fontSize: 12, color: c.text, fontWeight: '700' }}>{vehReg}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="time-outline" size={14} color={c.textMuted} />
                            <Text style={{ fontSize: 12, color: c.text }}>{formatDate(selectedTrip.departureTime)} {formatTime(selectedTrip.departureTime)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Earnings breakdown */}
                    <View style={[styles.earningsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <Text style={[styles.summaryLabel, { color: c.textMuted, marginBottom: 12 }]}>EARNINGS BREAKDOWN</Text>

                      <View style={styles.earningsTotal}>
                        <Text style={{ fontSize: 13, color: c.textMuted }}>Total Earnings</Text>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: GOLD }}>R{totalFare.toFixed(2)}</Text>
                      </View>

                      <View style={styles.earningsSplit}>
                        <View style={[styles.splitCard, { backgroundColor: GREEN_LIGHT }]}>
                          <Ionicons name="cash-outline" size={18} color={GREEN} />
                          <Text style={{ fontSize: 10, color: GREEN, fontWeight: '700', marginTop: 4 }}>CASH</Text>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: GREEN }}>R{cashTotal.toFixed(0)}</Text>
                          <Text style={{ fontSize: 10, color: GREEN }}>{cashPax.length} pax</Text>
                        </View>
                        <View style={[styles.splitCard, { backgroundColor: 'rgba(13,110,253,0.1)' }]}>
                          <Ionicons name="card-outline" size={18} color={BLUE} />
                          <Text style={{ fontSize: 10, color: BLUE, fontWeight: '700', marginTop: 4 }}>CARD</Text>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: BLUE }}>R{cardTotal.toFixed(0)}</Text>
                          <Text style={{ fontSize: 10, color: BLUE }}>{cardPax.length} pax</Text>
                        </View>
                      </View>
                    </View>

                    {/* Passengers */}
                    <View style={[styles.paxSection, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Text style={[styles.summaryLabel, { color: c.textMuted }]}>PASSENGERS ({passengers.length})</Text>
                        {loadingPassengers && <ActivityIndicator size="small" color={GOLD} />}
                      </View>

                      {passengers.length === 0 && !loadingPassengers ? (
                        <Text style={{ color: c.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
                          No passengers recorded
                        </Text>
                      ) : (
                        passengers.map((p, i) => (
                          <View key={p.id || i} style={[styles.paxRow, { borderColor: c.border }]}>
                            <View style={[styles.paxNum, { backgroundColor: GOLD_LIGHT }]}>
                              <Text style={{ fontSize: 12, fontWeight: '900', color: GOLD }}>{p.seatNumber || i + 1}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.paxName, { color: c.text }]}>{p.passengerName || 'Unnamed'}</Text>
                              {p.passengerPhone ? <Text style={{ fontSize: 11, color: c.textMuted }}>{p.passengerPhone}</Text> : null}
                            </View>
                            <View style={[
                              styles.payBadge,
                              { backgroundColor: (p.paymentMethod || 'Cash') === 'Card' ? 'rgba(13,110,253,0.1)' : GOLD_LIGHT }
                            ]}>
                              <Ionicons
                                name={(p.paymentMethod || 'Cash') === 'Card' ? 'card-outline' : 'cash-outline'}
                                size={11}
                                color={(p.paymentMethod || 'Cash') === 'Card' ? BLUE : '#b8860b'}
                              />
                              <Text style={{
                                fontSize: 10, fontWeight: '700',
                                color: (p.paymentMethod || 'Cash') === 'Card' ? BLUE : '#b8860b'
                              }}>{p.paymentMethod || 'Cash'}</Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: c.text, marginLeft: 8 }}>R{p.amount || 0}</Text>
                          </View>
                        ))
                      )}
                    </View>

                    {/* Completion notes */}
                    <View style={[styles.notesCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <Text style={[styles.summaryLabel, { color: c.textMuted, marginBottom: 8 }]}>COMPLETION NOTES (optional)</Text>
                      <TextInput
                        value={completionNotes}
                        onChangeText={setCompletionNotes}
                        style={[styles.notesInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                        placeholder="e.g. Trip arrived on time, all passengers delivered safely"
                        placeholderTextColor={c.textMuted}
                        multiline
                      />
                    </View>

                    {/* Owner notification info */}
                    <View style={[styles.infoRow, { backgroundColor: 'rgba(13,110,253,0.08)', borderColor: 'rgba(13,110,253,0.2)' }]}>
                      <Ionicons name="notifications-outline" size={16} color={BLUE} />
                      <Text style={{ fontSize: 12, color: BLUE, flex: 1, marginLeft: 8 }}>
                        The taxi owner will be notified about this trip's earnings upon completion.
                      </Text>
                    </View>

                    {/* Complete button */}
                    <TouchableOpacity
                      style={[styles.completeBtn, completing && { opacity: 0.7 }]}
                      onPress={handleCompleteTrip}
                      disabled={completing}
                      activeOpacity={0.85}
                    >
                      {completing ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="checkmark-done-outline" size={20} color="#000" />
                          <Text style={styles.completeBtnText}>Complete Trip & Record Earnings</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={{ height: 20 }} />
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1 },
    centerFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 14, marginTop: 12 },

    // Header
    header: {
      backgroundColor: '#1a1a2e',
      paddingHorizontal: 16,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    headerSub: { color: GOLD, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    headerBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: GOLD_LIGHT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    },
    headerBadgeText: { color: GOLD, fontSize: 14, fontWeight: '900' },

    // List
    listContent: { padding: 16, paddingBottom: 40 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '900' },
    emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 },
    emptyBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20,
      backgroundColor: GOLD_LIGHT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    },
    emptyBtnText: { fontSize: 13, fontWeight: '700', color: GOLD },

    // Trip card
    tripCard: {
      flexDirection: 'row', borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden',
    },
    tripAccent: { width: 4 },
    tripBody: { flex: 1, padding: 14 },
    tripTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    tripTime: { fontSize: 12, fontWeight: '600' },

    routeRow: { flexDirection: 'row', marginBottom: 12 },
    routeDots: { alignItems: 'center', paddingTop: 3 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotLine: { width: 2, height: 16, marginVertical: 2 },
    stationText: { fontSize: 14, fontWeight: '700' },

    tripStats: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    tripStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tripStatText: { fontSize: 12, fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 16, borderBottomWidth: 1, borderColor: 'rgba(128,128,128,0.2)',
    },
    modalTitle: { fontSize: 18, fontWeight: '900' },

    // Summary cards
    summaryCard: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
    summaryAccent: { width: 4 },
    summaryLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryRoute: { fontSize: 16, fontWeight: '900', marginTop: 4 },

    earningsCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
    earningsTotal: { alignItems: 'center', marginBottom: 14 },
    earningsSplit: { flexDirection: 'row', gap: 10 },
    splitCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },

    // Passengers
    paxSection: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
    paxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5 },
    paxNum: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    paxName: { fontSize: 13, fontWeight: '700' },
    payBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },

    // Notes
    notesCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
    notesInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, minHeight: 60, textAlignVertical: 'top' },

    // Info row
    infoRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16 },

    // Complete button
    completeBtn: { backgroundColor: GOLD, borderRadius: 14, padding: 16, alignItems: 'center' },
    completeBtnText: { fontSize: 15, fontWeight: '900', color: '#000' },
  });
}
