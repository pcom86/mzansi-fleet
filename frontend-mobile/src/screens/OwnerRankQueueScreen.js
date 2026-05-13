import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';

function statusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'waiting': return '#3b82f6';
    case 'loading': return '#f59e0b';
    case 'dispatched': return '#22c55e';
    case 'departed': return '#10b981';
    case 'completed': return '#16a34a';
    case 'cancelled': return '#ef4444';
    default: return '#94a3b8';
  }
}

function fmtTime(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d)) return String(val).slice(0, 5);
    return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function fmtCurrency(v) {
  const n = Number(v) || 0;
  return `R${n.toFixed(2)}`;
}

export default function OwnerRankQueueScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const ownerIds = useMemo(() => {
    return [user?.tenantId, user?.id, user?.userId].filter(Boolean);
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [expandedRanks, setExpandedRanks] = useState({});
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'trips'
  const [selectedRoutes, setSelectedRoutes] = useState({}); // { [rankId]: routeKey }

  function selectRoute(rankId, routeKey) {
    setSelectedRoutes(prev => ({ ...prev, [rankId]: routeKey }));
  }

  const load = useCallback(async () => {
    if (!ownerIds.length) return;
    try {
      let result = null;
      // Try each owner ID until we find one with vehicles
      for (const oid of ownerIds) {
        const resp = await client.get(`/DailyTaxiQueue/owner/${oid}/rank-queues`);
        if (resp.data?.totalVehicles > 0 || resp.data?.totalRanks > 0) {
          result = resp.data;
          break;
        }
        if (!result) result = resp.data; // keep first response as fallback
      }
      setData(result);
      const expanded = {};
      (result?.ranks || []).forEach(r => { expanded[r.rank.id] = true; });
      setExpandedRanks(expanded);
    } catch (e) {
      console.warn('Failed to load owner rank queues:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ownerIds.join(',')]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggleRank(rankId) {
    setExpandedRanks(prev => ({ ...prev, [rankId]: !prev[rankId] }));
  }

  const ranks = data?.ranks || [];

  // Summary stats
  const totalInQueue = ranks.reduce((sum, r) => sum + (r.totalInQueue || 0), 0);
  const totalWaiting = ranks.reduce((sum, r) => sum + (r.waitingCount || 0), 0);
  const totalDispatched = ranks.reduce((sum, r) => sum + (r.dispatchedCount || 0), 0);
  const totalActiveTrips = ranks.reduce((sum, r) => sum + (r.activeTrips?.length || 0), 0);
  const totalOwnerInQueue = ranks.reduce((sum, r) => sum + (r.ownerVehiclesInQueue || 0), 0);

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Rank Queues</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[s.emptyTxt, { marginTop: 12 }]}>Loading rank queues…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Rank Queues</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Summary Cards */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={s.summaryNum}>{data?.totalRanks || 0}</Text>
            <Text style={s.summaryLabel}>Ranks</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={s.summaryNum}>{totalOwnerInQueue}</Text>
            <Text style={s.summaryLabel}>Your Vehicles</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: '#22c55e' }]}>
            <Text style={s.summaryNum}>{totalActiveTrips}</Text>
            <Text style={s.summaryLabel}>Active Trips</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'queue' && s.tabActive]}
            onPress={() => setActiveTab('queue')}
          >
            <Ionicons name="list-outline" size={16} color={activeTab === 'queue' ? '#fff' : c.textMuted} />
            <Text style={[s.tabTxt, activeTab === 'queue' && s.tabTxtActive]}>Queue ({totalInQueue})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'trips' && s.tabActive]}
            onPress={() => setActiveTab('trips')}
          >
            <Ionicons name="car-outline" size={16} color={activeTab === 'trips' ? '#fff' : c.textMuted} />
            <Text style={[s.tabTxt, activeTab === 'trips' && s.tabTxtActive]}>Trips ({totalActiveTrips})</Text>
          </TouchableOpacity>
        </View>

        {ranks.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="location-outline" size={48} color={c.textMuted} />
            <Text style={s.emptyTitle}>No Ranks Found</Text>
            <Text style={s.emptyTxt}>
              {data?.message || 'Your vehicles are not assigned to any taxi ranks yet.'}
            </Text>
          </View>
        ) : (
          ranks.map((rankData) => {
            const rank = rankData.rank;
            const isExpanded = expandedRanks[rank.id];
            const queue = rankData.queue || [];
            const trips = rankData.activeTrips || [];

            return (
              <View key={rank.id} style={s.rankCard}>
                {/* Rank Header */}
                <TouchableOpacity style={s.rankHeader} onPress={() => toggleRank(rank.id)} activeOpacity={0.7}>
                  <View style={s.rankIconWrap}>
                    <Ionicons name="location" size={20} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rankName}>{rank.name}</Text>
                    <Text style={s.rankMeta}>
                      {rank.city}{rank.province ? `, ${rank.province}` : ''}
                      {rank.code ? ` · ${rank.code}` : ''}
                    </Text>
                  </View>
                  <View style={s.rankStats}>
                    <View style={s.rankStatBadge}>
                      <Text style={s.rankStatNum}>{rankData.waitingCount}</Text>
                      <Text style={s.rankStatLabel}>Wait</Text>
                    </View>
                    <View style={[s.rankStatBadge, { backgroundColor: '#22c55e15' }]}>
                      <Text style={[s.rankStatNum, { color: '#22c55e' }]}>{rankData.dispatchedCount}</Text>
                      <Text style={s.rankStatLabel}>Disp</Text>
                    </View>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={c.textMuted} />
                </TouchableOpacity>

                {/* Owner vehicles badge */}
                {rankData.ownerVehiclesInQueue > 0 && (
                  <View style={s.ownerBadgeRow}>
                    <View style={s.ownerBadge}>
                      <Ionicons name="car-sport" size={12} color={c.primary} />
                      <Text style={s.ownerBadgeTxt}>{rankData.ownerVehiclesInQueue} of your vehicles in queue</Text>
                    </View>
                  </View>
                )}

                {/* Expanded Content */}
                {isExpanded && (
                  <View style={s.rankBody}>
                    {activeTab === 'queue' ? (() => {
                      if (queue.length === 0) return <Text style={s.noDataTxt}>No vehicles in queue today</Text>;

                      // Build unique routes for this rank
                      const routeMap = new Map();
                      queue.forEach(e => {
                        const key = e.routeId || e.routeName || 'unassigned';
                        if (!routeMap.has(key)) routeMap.set(key, { id: key, name: e.routeName || 'Unassigned' });
                      });
                      const rankRoutes = [{ id: 'all', name: 'All Routes' }, ...Array.from(routeMap.values())];
                      const activeRoute = selectedRoutes[rank.id] || 'all';
                      const visibleQueue = activeRoute === 'all'
                        ? queue
                        : queue.filter(e => (e.routeId || e.routeName || 'unassigned') === activeRoute);

                      return (
                        <>
                          {/* Route selector — only when multiple routes */}
                          {rankRoutes.length > 2 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                              style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}
                              contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row' }}>
                              {rankRoutes.map(r => {
                                const isOn = activeRoute === r.id;
                                const cnt = r.id === 'all' ? queue.length : queue.filter(e => (e.routeId || e.routeName || 'unassigned') === r.id).length;
                                const hasOwner = r.id !== 'all' && queue.filter(e => (e.routeId || e.routeName || 'unassigned') === r.id).some(e => e.isOwnerVehicle);
                                return (
                                  <TouchableOpacity key={r.id}
                                    style={[s.routeChip, isOn && s.routeChipOn, hasOwner && !isOn && s.routeChipOwner]}
                                    onPress={() => selectRoute(rank.id, r.id)}>
                                    {hasOwner && !isOn && <View style={s.routeOwnerDot} />}
                                    <Text style={[s.routeChipTxt, isOn && s.routeChipTxtOn]}>{r.name}</Text>
                                    <Text style={[s.routeChipCnt, isOn && { color: 'rgba(255,255,255,0.7)' }]}>{cnt}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          )}
                          {visibleQueue.map((entry, idx) => (
                            <View key={entry.id || idx} style={[s.queueItem, entry.isOwnerVehicle && s.queueItemOwner]}>
                              <View style={s.queuePos}>
                                <Text style={s.queuePosNum}>#{entry.queuePosition}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text style={s.queueVehicle}>{entry.vehicleRegistration || '—'}</Text>
                                  {entry.isOwnerVehicle && (
                                    <View style={s.yoursBadge}><Text style={s.yoursBadgeTxt}>Yours</Text></View>
                                  )}
                                </View>
                                <Text style={s.queueDriver}>{entry.driverName || 'No driver'}</Text>
                                {activeRoute === 'all' && entry.routeName && (
                                  <Text style={s.queueRoute}>{entry.routeName}</Text>
                                )}
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <View style={[s.statusBadge, { backgroundColor: statusColor(entry.status) + '20' }]}>
                                  <Text style={[s.statusBadgeTxt, { color: statusColor(entry.status) }]}>{entry.status}</Text>
                                </View>
                                {entry.passengerCount > 0 && <Text style={s.queuePax}>{entry.passengerCount} pax</Text>}
                                <Text style={s.queueTime}>{entry.joinedAt || '—'}</Text>
                                {entry.estimatedDepartureTime ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 3 }}>
                                    <Ionicons name="log-out-outline" size={10} color="#f59e0b" />
                                    <Text style={[s.queueTime, { color: '#f59e0b' }]}>ETD {fmtTime(entry.estimatedDepartureTime)}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </>
                      );
                    })() : (
                      /* Trips View */
                      trips.length === 0 ? (
                        <Text style={s.noDataTxt}>No active trips at this rank</Text>
                      ) : (
                        trips.map((trip, idx) => (
                          <TouchableOpacity
                            key={trip.id || idx}
                            style={[s.tripItem, trip.isOwnerVehicle && s.queueItemOwner]}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('DriverTripDetails', { tripId: trip.id })}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={s.tripRoute}>
                                  {trip.departureStation || '—'} → {trip.destinationStation || '—'}
                                </Text>
                                {trip.isOwnerVehicle && (
                                  <View style={s.yoursBadge}>
                                    <Text style={s.yoursBadgeTxt}>Yours</Text>
                                  </View>
                                )}
                              </View>
                              <View style={s.tripMeta}>
                                <Ionicons name="car-outline" size={12} color={c.textMuted} />
                                <Text style={s.tripMetaTxt}>{trip.vehicleRegistration || '—'}</Text>
                                <Ionicons name="person-outline" size={12} color={c.textMuted} style={{ marginLeft: 8 }} />
                                <Text style={s.tripMetaTxt}>{trip.driverName || 'No driver'}</Text>
                              </View>
                              <View style={s.tripMeta}>
                                <Ionicons name="people-outline" size={12} color={c.textMuted} />
                                <Text style={s.tripMetaTxt}>{trip.passengerCount ?? 0} pax</Text>
                                <Ionicons name="cash-outline" size={12} color="#10b981" style={{ marginLeft: 8 }} />
                                <Text style={[s.tripMetaTxt, { color: '#10b981' }]}>{fmtCurrency(trip.totalAmount)}</Text>
                                <Ionicons name="time-outline" size={12} color={c.textMuted} style={{ marginLeft: 8 }} />
                                <Text style={s.tripMetaTxt}>{fmtTime(trip.departureTime)}</Text>
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <View style={[s.statusBadge, { backgroundColor: statusColor(trip.status) + '20' }]}>
                                <Text style={[s.statusBadgeTxt, { color: statusColor(trip.status) }]}>{trip.status}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={16} color={c.textMuted} style={{ marginTop: 4 }} />
                            </View>
                          </TouchableOpacity>
                        ))
                      )
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center' },

    // Summary
    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    summaryCard: {
      flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 12,
      borderLeftWidth: 3, elevation: 1,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    },
    summaryNum: { fontSize: 22, fontWeight: '800', color: c.text },
    summaryLabel: { fontSize: 11, color: c.textMuted, marginTop: 2 },

    // Tabs
    tabRow: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 10, padding: 3, marginBottom: 16 },
    tab: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 8, borderRadius: 8, gap: 6,
    },
    tabActive: { backgroundColor: c.primary },
    tabTxt: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    tabTxtActive: { color: '#fff' },

    // Empty
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginTop: 12 },
    emptyTxt: { fontSize: 13, color: c.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },

    // Rank card
    rankCard: {
      backgroundColor: c.surface, borderRadius: 14, marginBottom: 12,
      overflow: 'hidden', elevation: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4,
    },
    rankHeader: {
      flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10,
    },
    rankIconWrap: {
      width: 38, height: 38, borderRadius: 10, backgroundColor: c.primary + '15',
      justifyContent: 'center', alignItems: 'center',
    },
    rankName: { fontSize: 15, fontWeight: '700', color: c.text },
    rankMeta: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    rankStats: { flexDirection: 'row', gap: 6 },
    rankStatBadge: {
      backgroundColor: '#3b82f615', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center',
    },
    rankStatNum: { fontSize: 14, fontWeight: '800', color: '#3b82f6' },
    rankStatLabel: { fontSize: 9, color: c.textMuted },

    ownerBadgeRow: { paddingHorizontal: 14, paddingBottom: 8 },
    ownerBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.primary + '10', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
    },
    ownerBadgeTxt: { fontSize: 11, color: c.primary, fontWeight: '600' },

    // Rank body
    rankBody: { borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 8 },
    noDataTxt: { fontSize: 13, color: c.textMuted, textAlign: 'center', paddingVertical: 16 },

    // Queue items
    queueItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    },
    queueItemOwner: { backgroundColor: c.primary + '08' },
    queuePos: {
      width: 32, height: 32, borderRadius: 8, backgroundColor: c.surface2,
      justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    queuePosNum: { fontSize: 12, fontWeight: '800', color: c.text },
    queueVehicle: { fontSize: 13, fontWeight: '700', color: c.text },
    queueDriver: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    queueRoute: { fontSize: 10, color: c.primary, marginTop: 1 },
    queuePax: { fontSize: 10, color: c.textMuted, marginTop: 2 },
    queueTime: { fontSize: 10, color: c.textMuted, marginTop: 1 },

    yoursBadge: {
      marginLeft: 6, backgroundColor: c.primary + '20', borderRadius: 4,
      paddingHorizontal: 5, paddingVertical: 1,
    },
    yoursBadgeTxt: { fontSize: 9, fontWeight: '700', color: c.primary },

    statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusBadgeTxt: { fontSize: 10, fontWeight: '700' },

    // Route chips
    routeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
      backgroundColor: c.card,
    },
    routeChipOn: { backgroundColor: c.primary },
    routeChipOwner: { borderWidth: 1.5, borderColor: c.primary },
    routeOwnerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.primary },
    routeChipTxt: { fontSize: 12, fontWeight: '600', color: c.text },
    routeChipTxtOn: { color: '#fff' },
    routeChipCnt: { fontSize: 11, color: c.textMuted },

    // Trip items
    tripItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    },
    tripRoute: { fontSize: 13, fontWeight: '700', color: c.text },
    tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    tripMetaTxt: { fontSize: 11, color: c.textMuted },
  });
}
