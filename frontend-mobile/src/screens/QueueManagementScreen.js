import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, TextInput, Platform,
  Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  getQueueByRank, getQueueStats, addToQueue,
  dispatchVehicle, reorderVehicle, removeFromQueue, updateQueueRoute,
} from '../api/queueManagement';
import { fetchVehiclesByRankId, fetchTaxiRanks } from '../api/taxiRanks';
import client from '../api/client';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export default function QueueManagementScreen({ navigation, route: navRoute }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const passedRank = navRoute?.params?.rank;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rank, setRank] = useState(passedRank || null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  const [activeView, setActiveView] = useState('queue');
  const [showFilters, setShowFilters] = useState(true);

  // Add modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addRouteId, setAddRouteId] = useState(null);
  const [addVehicleId, setAddVehicleId] = useState(null);
  const [addDriverId, setAddDriverId] = useState(null);
  const [addNotes, setAddNotes] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  // Route assign modal
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [routeModalEntry, setRouteModalEntry] = useState(null);
  const [routeModalBusy, setRouteModalBusy] = useState(false);

  // Dispatch modal
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchEntry, setDispatchEntry] = useState(null);
  const [dispatchPax, setDispatchPax] = useState('');
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [includePassengerList, setIncludePassengerList] = useState(false);
  const [passengerList, setPassengerList] = useState([{ name: '', contact: '' }]);

  // ── Data Loading ──────────────────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let activeRank = rank;
      if (!activeRank && user?.tenantId && user.tenantId !== EMPTY_GUID) {
        const ranksResp = await fetchTaxiRanks(user.tenantId);
        const ranks = ranksResp.data || ranksResp || [];
        activeRank = ranks[0] || null;
        setRank(activeRank);
      }
      if (!activeRank?.id) { setLoading(false); return; }

      const [queueData, statsData, routesResp, vehiclesResp] = await Promise.all([
        getQueueByRank(activeRank.id).catch(() => []),
        getQueueStats(activeRank.id).catch(() => null),
        client.get(`/Routes?taxiRankId=${activeRank.id}`).catch(() => ({ data: [] })),
        fetchVehiclesByRankId(activeRank.id).catch(() => ({ data: [] })),
      ]);

      setQueue(queueData || []);
      setStats(statsData);

      const allRoutes = routesResp?.data || routesResp || [];
      const rankName = (activeRank?.name || '').trim().toLowerCase();
      const rankAddress = (activeRank?.address || '').trim().toLowerCase();
      const matchRank = (departure, rankStr) => {
        if (!departure || !rankStr) return false;
        return departure.includes(rankStr) || rankStr.includes(departure);
      };

      const filteredRoutes = Array.isArray(allRoutes)
        ? allRoutes.filter(r => {
            if (r?.taxiRankId || r?.rankId) {
              return r.taxiRankId === activeRank.id || r.rankId === activeRank.id;
            }
            return true;
          }).filter(r => {
            const departure = String(r?.departureStation || '').trim().toLowerCase();
            if (!departure) return true;
            return matchRank(departure, rankName) || matchRank(departure, rankAddress);
          })
        : allRoutes;

      setRoutes(filteredRoutes);
      setVehicles(vehiclesResp.data || vehiclesResp || []);
    } catch (err) {
      console.warn('Queue load error', err?.message);
      if (!silent) Alert.alert('Error', 'Failed to load queue data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rank, user]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // ── Derived data ──────────────────────────────────────────────────────

  const filteredQueue = useMemo(() => {
    if (!selectedRouteId) return queue.filter(q => q.status !== 'Removed');
    return queue.filter(q => (q.routeId === selectedRouteId || !q.routeId) && q.status !== 'Removed');
  }, [queue, selectedRouteId]);

  const activeQueue = filteredQueue.filter(q => q.status !== 'Dispatched');
  const dispatchedQueue = filteredQueue.filter(q => q.status === 'Dispatched');

  const queuedVehicleIds = new Set(
    queue.filter(q => q.status !== 'Dispatched' && q.status !== 'Removed').map(q => q.vehicleId)
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  async function handleAddToQueue() {
    if (!addVehicleId) return Alert.alert('Required', 'Please select a vehicle');
    setAddBusy(true);
    try {
      await addToQueue({
        taxiRankId: rank.id,
        routeId: addRouteId,
        vehicleId: addVehicleId,
        driverId: addDriverId,
        tenantId: user?.tenantId,
        notes: addNotes || undefined,
      });
      setAddModalVisible(false);
      setAddVehicleId(null);
      setAddRouteId(null);
      setAddDriverId(null);
      setAddNotes('');
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to add vehicle');
    } finally {
      setAddBusy(false);
    }
  }

  async function handleDispatch() {
    if (!dispatchEntry) return;
    setDispatchBusy(true);
    try {
      const validPassengers = includePassengerList
        ? passengerList.filter(p => p.name.trim() || p.contact.trim())
        : [];
      const finalPassengerCount = includePassengerList
        ? validPassengers.length
        : (dispatchPax ? parseInt(dispatchPax, 10) : undefined);

      await dispatchVehicle(dispatchEntry.id, {
        dispatchedByUserId: user?.userId || user?.id,
        passengerCount: finalPassengerCount,
        passengers: validPassengers.length > 0 ? validPassengers : undefined,
      });
      setDispatchModalVisible(false);
      setDispatchEntry(null);
      setDispatchPax('');
      setIncludePassengerList(false);
      setPassengerList([{ name: '', contact: '' }]);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to dispatch');
    } finally {
      setDispatchBusy(false);
    }
  }

  function handleRemove(entry) {
    const doRemove = async () => {
      try {
        await removeFromQueue(entry.id);
        loadData(true);
      } catch (err) {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to remove');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${entry.vehicleRegistration || 'this vehicle'} from queue?`)) doRemove();
    } else {
      Alert.alert('Remove', `Remove ${entry.vehicleRegistration || 'this vehicle'} from queue?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  }

  async function handleAssignRoute(entry, routeId) {
    setRouteModalBusy(true);
    try {
      await updateQueueRoute(entry.id, routeId || null);
      setRouteModalVisible(false);
      setRouteModalEntry(null);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to assign route');
    } finally {
      setRouteModalBusy(false);
    }
  }

  async function handleMoveUp(entry) {
    if (entry.queuePosition <= 1) return;
    try {
      await reorderVehicle(entry.id, entry.queuePosition - 1);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reorder');
    }
  }

  async function handleMoveDown(entry) {
    try {
      await reorderVehicle(entry.id, entry.queuePosition + 1);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reorder');
    }
  }

  // ── Sub-Views ─────────────────────────────────────────────────────────

  function QueueView() {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {activeQueue.length === 0 && dispatchedQueue.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: c.primary + '15' }]}>
              <Ionicons name="car-outline" size={40} color={c.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>Queue is Empty</Text>
            <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
              No vehicles waiting. Tap below to add one.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: c.primary }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyBtnTxt}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeQueue.length > 0 && (
              <>
                <View style={styles.listHeader}>
                  <View style={[styles.listHeaderDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={[styles.listHeaderTxt, { color: c.text }]}>
                    Waiting ({activeQueue.length})
                  </Text>
                </View>
                {activeQueue.map((entry, idx) => (
                  <QueueCard
                    key={entry.id}
                    entry={entry}
                    isFirst={idx === 0}
                    isLast={idx === activeQueue.length - 1}
                    c={c}
                    styles={styles}
                    onDispatch={() => { setDispatchEntry(entry); setDispatchModalVisible(true); }}
                    onRemove={() => handleRemove(entry)}
                    onMoveUp={() => handleMoveUp(entry)}
                    onMoveDown={() => handleMoveDown(entry)}
                    onAssignRoute={() => { setRouteModalEntry(entry); setRouteModalVisible(true); }}
                  />
                ))}
              </>
            )}

            {dispatchedQueue.length > 0 && (
              <>
                <View style={[styles.listHeader, { marginTop: 20 }]}>
                  <View style={[styles.listHeaderDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={[styles.listHeaderTxt, { color: c.text }]}>
                    Dispatched ({dispatchedQueue.length})
                  </Text>
                </View>
                {dispatchedQueue.map(entry => (
                  <DispatchedCard key={entry.id} entry={entry} c={c} styles={styles} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    );
  }

  function OverviewView() {
    const nextVehicle = activeQueue[0];
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {/* Next to Dispatch */}
        {nextVehicle && (
          <View style={[styles.nextCard, { backgroundColor: c.surface }]}>
            <View style={styles.nextCardTop}>
              <View style={[styles.nextIcon, { backgroundColor: '#22c55e20' }]}>
                <Ionicons name="flash" size={20} color="#22c55e" />
              </View>
              <Text style={[styles.nextLabel, { color: c.textMuted }]}>Next to Dispatch</Text>
            </View>
            <View style={styles.nextCardBody}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nextReg, { color: c.text }]}>{nextVehicle.vehicleRegistration}</Text>
                <Text style={[styles.nextMeta, { color: c.textMuted }]}>
                  {nextVehicle.driverName || 'No driver'} {nextVehicle.routeName ? `· ${nextVehicle.routeName}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dispatchBtn}
                onPress={() => { setDispatchEntry(nextVehicle); setDispatchModalVisible(true); }}
              >
                <Ionicons name="send" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.dispatchBtnTxt}>Dispatch</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.surface }]} onPress={() => setAddModalVisible(true)}>
            <View style={[styles.quickBtnIcon, { backgroundColor: c.primary + '15' }]}>
              <Ionicons name="add-circle" size={22} color={c.primary} />
            </View>
            <Text style={[styles.quickBtnLabel, { color: c.text }]}>Add Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.surface }]} onPress={() => setActiveView('queue')}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="list" size={22} color="#3b82f6" />
            </View>
            <Text style={[styles.quickBtnLabel, { color: c.text }]}>View Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.surface }]} onPress={() => setActiveView('analytics')}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#8b5cf615' }]}>
              <Ionicons name="stats-chart" size={22} color="#8b5cf6" />
            </View>
            <Text style={[styles.quickBtnLabel, { color: c.text }]}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Routes Summary */}
        {routes.filter(r => r.isActive !== false).length > 0 && (
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Routes</Text>
            {routes.filter(r => r.isActive !== false).slice(0, 5).map(route => {
              const count = queue.filter(q => q.routeId === route.id && q.status !== 'Removed' && q.status !== 'Dispatched').length;
              return (
                <TouchableOpacity
                  key={route.id}
                  style={[styles.routeRow, { borderBottomColor: c.border }]}
                  onPress={() => { setSelectedRouteId(route.id); setActiveView('queue'); }}
                >
                  <View style={[styles.routeDot, { backgroundColor: count > 0 ? '#f59e0b' : '#22c55e' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.routeRowName, { color: c.text }]} numberOfLines={1}>
                      {route.routeName || route.destinationStation}
                    </Text>
                  </View>
                  <View style={[styles.routeCount, { backgroundColor: count > 0 ? '#f59e0b15' : '#22c55e15' }]}>
                    <Text style={[styles.routeCountTxt, { color: count > 0 ? '#f59e0b' : '#22c55e' }]}>{count}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  }

  function AnalyticsView() {
    const totalWaiting = activeQueue.length;
    const totalDispatched = dispatchedQueue.length;
    const totalPax = stats?.totalPassengers ?? 0;
    const avgWait = stats?.averageWaitMinutes ?? 0;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Today's Summary</Text>
          <View style={styles.analyticsGrid}>
            <View style={[styles.analyticsTile, { backgroundColor: '#f59e0b10' }]}>
              <Ionicons name="time-outline" size={22} color="#f59e0b" />
              <Text style={[styles.analyticsTileValue, { color: '#f59e0b' }]}>{totalWaiting}</Text>
              <Text style={[styles.analyticsTileLabel, { color: c.textMuted }]}>Waiting</Text>
            </View>
            <View style={[styles.analyticsTile, { backgroundColor: '#22c55e10' }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#22c55e" />
              <Text style={[styles.analyticsTileValue, { color: '#22c55e' }]}>{totalDispatched}</Text>
              <Text style={[styles.analyticsTileLabel, { color: c.textMuted }]}>Dispatched</Text>
            </View>
            <View style={[styles.analyticsTile, { backgroundColor: '#3b82f610' }]}>
              <Ionicons name="people-outline" size={22} color="#3b82f6" />
              <Text style={[styles.analyticsTileValue, { color: '#3b82f6' }]}>{totalPax}</Text>
              <Text style={[styles.analyticsTileLabel, { color: c.textMuted }]}>Passengers</Text>
            </View>
            <View style={[styles.analyticsTile, { backgroundColor: '#8b5cf610' }]}>
              <Ionicons name="hourglass-outline" size={22} color="#8b5cf6" />
              <Text style={[styles.analyticsTileValue, { color: '#8b5cf6' }]}>{avgWait}m</Text>
              <Text style={[styles.analyticsTileLabel, { color: c.textMuted }]}>Avg Wait</Text>
            </View>
          </View>
        </View>

        {/* Route breakdown */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Route Breakdown</Text>
          {routes.filter(r => r.isActive !== false).length === 0 ? (
            <Text style={[styles.cardEmpty, { color: c.textMuted }]}>No routes configured</Text>
          ) : (
            routes.filter(r => r.isActive !== false).map(route => {
              const waiting = queue.filter(q => q.routeId === route.id && q.status !== 'Removed' && q.status !== 'Dispatched').length;
              const dispatched = queue.filter(q => q.routeId === route.id && q.status === 'Dispatched').length;
              const total = waiting + dispatched;
              const pct = total > 0 ? Math.round((dispatched / total) * 100) : 0;
              return (
                <View key={route.id} style={[styles.breakdownRow, { borderBottomColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.breakdownName, { color: c.text }]} numberOfLines={1}>
                      {route.routeName || route.destinationStation}
                    </Text>
                    <Text style={[styles.breakdownMeta, { color: c.textMuted }]}>
                      {waiting} waiting · {dispatched} dispatched
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: '#22c55e' }]} />
                  </View>
                  <Text style={[styles.breakdownPct, { color: c.textMuted }]}>{pct}%</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  }

  // ── Loading / Empty states ────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingTxt, { color: c.textMuted }]}>Loading queue…</Text>
      </View>
    );
  }

  if (!rank) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.textMuted} />
        <Text style={[styles.emptyTitle, { color: c.text, marginTop: 12 }]}>No Taxi Rank</Text>
        <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>No taxi rank found for your association</Text>
      </View>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4, backgroundColor: c.surface }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
            <Ionicons name="chevron-back" size={22} color={c.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: c.text }]}>Queue</Text>
            <Text style={[styles.headerSubtitle, { color: c.textMuted }]}>{rank.name}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={[styles.headerAction, showFilters && { backgroundColor: c.primary + '15' }]}>
            <Ionicons name="options-outline" size={18} color={showFilters ? c.primary : c.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Stats Strip ── */}
        {stats && (
          <View style={styles.statsStrip}>
            <StatPill icon="time-outline" label="Waiting" value={stats.loading ?? 0} color="#f59e0b" c={c} styles={styles} />
            <StatPill icon="checkmark-circle" label="Gone" value={stats.dispatched ?? 0} color="#22c55e" c={c} styles={styles} />
            <StatPill icon="people" label="Pax" value={stats.totalPassengers ?? 0} color="#3b82f6" c={c} styles={styles} />
            <StatPill icon="hourglass" label="Wait" value={`${stats.averageWaitMinutes ?? 0}m`} color="#8b5cf6" c={c} styles={styles} />
          </View>
        )}
      </View>

      {/* ── Tabs ── */}
      <View style={[styles.tabs, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {[
          { key: 'overview', icon: 'grid-outline', label: 'Overview' },
          { key: 'queue', icon: 'list-outline', label: 'Queue' },
          { key: 'analytics', icon: 'stats-chart-outline', label: 'Analytics' },
        ].map(tab => {
          const active = activeView === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveView(tab.key)}
            >
              <Ionicons name={tab.icon} size={18} color={active ? c.primary : c.textMuted} />
              <Text style={[styles.tabLabel, active && { color: c.primary, fontWeight: '700' }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Route Filter ── */}
      {showFilters && (
        <View style={[styles.filterBar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedRouteId && styles.filterChipActive]}
              onPress={() => setSelectedRouteId(null)}
            >
              <Text style={[styles.filterChipTxt, !selectedRouteId && styles.filterChipTxtActive]}>All</Text>
              <View style={[styles.filterBadge, !selectedRouteId && { backgroundColor: c.primary }]}>
                <Text style={[styles.filterBadgeTxt, !selectedRouteId && { color: '#fff' }]}>
                  {queue.filter(q => q.status !== 'Removed' && q.status !== 'Dispatched').length}
                </Text>
              </View>
            </TouchableOpacity>
            {routes.filter(r => r.isActive !== false).map(r => {
              const count = queue.filter(q => q.routeId === r.id && q.status !== 'Removed' && q.status !== 'Dispatched').length;
              const on = selectedRouteId === r.id;
              return (
                <TouchableOpacity key={r.id} style={[styles.filterChip, on && styles.filterChipActive]} onPress={() => setSelectedRouteId(r.id)}>
                  <Text style={[styles.filterChipTxt, on && styles.filterChipTxtActive]} numberOfLines={1}>
                    {r.routeName || r.destinationStation}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.filterBadge, on && { backgroundColor: '#fff' }]}>
                      <Text style={[styles.filterBadgeTxt, on && { color: c.primary }]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Content ── */}
      <View style={styles.content}>
        {activeView === 'overview' && <OverviewView />}
        {activeView === 'queue' && <QueueView />}
        {activeView === 'analytics' && <AnalyticsView />}
      </View>

      {/* ── FAB ── */}
      <View style={[styles.fabWrap, { bottom: Math.max(insets.bottom, 12) + 12 }]}>
        <TouchableOpacity style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => setAddModalVisible(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ══════════ Add to Queue Modal ══════════ */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: c.primary + '15' }]}>
                  <Ionicons name="add-circle" size={20} color={c.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Add to Queue</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={[styles.modalClose, { backgroundColor: c.background }]}>
                <Ionicons name="close" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyPad} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Route (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity style={[styles.chip, !addRouteId && styles.chipActive]} onPress={() => setAddRouteId(null)}>
                  <Text style={[styles.chipTxt, !addRouteId && styles.chipTxtActive]}>None</Text>
                </TouchableOpacity>
                {routes.filter(r => r.isActive !== false).map(r => (
                  <TouchableOpacity key={r.id} style={[styles.chip, addRouteId === r.id && styles.chipActive]} onPress={() => setAddRouteId(r.id)}>
                    <Text style={[styles.chipTxt, addRouteId === r.id && styles.chipTxtActive]} numberOfLines={1}>
                      {r.destinationStation || r.routeName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Vehicle *</Text>
              <View style={styles.vehicleList}>
                {vehicles.filter(v => !queuedVehicleIds.has(v.id)).length === 0 ? (
                  <Text style={[styles.noVehicles, { color: c.textMuted }]}>All vehicles are already queued</Text>
                ) : (
                  vehicles.filter(v => !queuedVehicleIds.has(v.id)).map(v => {
                    const sel = addVehicleId === v.id;
                    return (
                      <TouchableOpacity key={v.id}
                        style={[styles.vehicleItem, { borderColor: sel ? c.primary : c.border, backgroundColor: sel ? c.primary + '08' : 'transparent' }]}
                        onPress={() => setAddVehicleId(v.id)}
                      >
                        <View style={[styles.vehicleItemIcon, { backgroundColor: sel ? c.primary + '20' : c.background }]}>
                          <Ionicons name="car-sport" size={16} color={sel ? c.primary : c.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.vehicleItemReg, { color: c.text }]}>{v.registration || 'Unknown'}</Text>
                          <Text style={[styles.vehicleItemMeta, { color: c.textMuted }]}>
                            {[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}{v.capacity ? ` · ${v.capacity} seats` : ''}
                          </Text>
                        </View>
                        {sel && <Ionicons name="checkmark-circle" size={20} color={c.primary} />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 16 }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={addNotes} onChangeText={setAddNotes}
                placeholder="Optional notes…" placeholderTextColor={c.textMuted}
              />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity style={[styles.btnOutline, { borderColor: c.border }]} onPress={() => { setAddModalVisible(false); setAddVehicleId(null); setAddRouteId(null); setAddNotes(''); }}>
                <Text style={[styles.btnOutlineTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: c.primary }]} onPress={handleAddToQueue} disabled={addBusy}>
                {addBusy ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.btnPrimaryTxt}>Add to Queue</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ Dispatch Modal ══════════ */}
      <Modal visible={dispatchModalVisible} transparent animationType="fade" onRequestClose={() => setDispatchModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: '#22c55e15' }]}>
                  <Ionicons name="send" size={18} color="#22c55e" />
                </View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Dispatch Vehicle</Text>
              </View>
              <TouchableOpacity onPress={() => { setDispatchModalVisible(false); setDispatchEntry(null); }} style={[styles.modalClose, { backgroundColor: c.background }]}>
                <Ionicons name="close" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyPad} keyboardShouldPersistTaps="handled">
              {dispatchEntry && (
                <View style={[styles.dispatchPreview, { borderColor: c.border, backgroundColor: c.background }]}>
                  <View style={[styles.dispatchPreviewIcon, { backgroundColor: c.primary + '15' }]}>
                    <Ionicons name="car-sport" size={20} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dispatchPreviewReg, { color: c.text }]}>{dispatchEntry.vehicleRegistration}</Text>
                    <Text style={[styles.dispatchPreviewMeta, { color: c.textMuted }]}>
                      #{dispatchEntry.queuePosition} · {dispatchEntry.driverName || 'No driver'}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Passengers (optional)</Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={includePassengerList ? String(passengerList.filter(p => p.name.trim() || p.contact.trim()).length) : dispatchPax}
                onChangeText={setDispatchPax}
                keyboardType="numeric"
                placeholder="e.g. 15"
                placeholderTextColor={c.textMuted}
                editable={!includePassengerList}
              />

              {/* Passenger list toggle */}
              <TouchableOpacity style={styles.toggleRow} onPress={() => setIncludePassengerList(!includePassengerList)}>
                <View style={[styles.toggleBox, { borderColor: includePassengerList ? c.primary : c.border, backgroundColor: includePassengerList ? c.primary + '15' : 'transparent' }]}>
                  {includePassengerList && <Ionicons name="checkmark" size={14} color={c.primary} />}
                </View>
                <Text style={[styles.toggleLabel, { color: c.text }]}>Include passenger details</Text>
              </TouchableOpacity>

              {includePassengerList && (
                <View style={{ marginTop: 12 }}>
                  {passengerList.map((pax, idx) => (
                    <View key={idx} style={[styles.paxRow, { borderColor: c.border }]}>
                      <Text style={[styles.paxNum, { color: c.textMuted }]}>#{idx + 1}</Text>
                      <View style={{ flex: 1, gap: 6 }}>
                        <TextInput
                          style={[styles.paxInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                          value={pax.name}
                          onChangeText={t => { const u = [...passengerList]; u[idx].name = t; setPassengerList(u); }}
                          placeholder="Name" placeholderTextColor={c.textMuted}
                        />
                        <TextInput
                          style={[styles.paxInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                          value={pax.contact}
                          onChangeText={t => { const u = [...passengerList]; u[idx].contact = t; setPassengerList(u); }}
                          placeholder="Phone" placeholderTextColor={c.textMuted}
                          keyboardType="phone-pad"
                        />
                      </View>
                      {passengerList.length > 1 && (
                        <TouchableOpacity onPress={() => setPassengerList(passengerList.filter((_, i) => i !== idx))} style={{ padding: 4 }}>
                          <Ionicons name="close-circle" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity style={[styles.addPaxBtn, { borderColor: c.primary }]} onPress={() => setPassengerList([...passengerList, { name: '', contact: '' }])}>
                    <Ionicons name="add-circle-outline" size={16} color={c.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.addPaxBtnTxt, { color: c.primary }]}>Add Passenger</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity style={[styles.btnOutline, { borderColor: c.border }]} onPress={() => { setDispatchModalVisible(false); setDispatchEntry(null); }}>
                <Text style={[styles.btnOutlineTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#22c55e' }]} onPress={handleDispatch} disabled={dispatchBusy}>
                {dispatchBusy ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="send" size={14} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.btnPrimaryTxt}>Dispatch</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ Assign Route Modal ══════════ */}
      <Modal visible={routeModalVisible} transparent animationType="fade" onRequestClose={() => setRouteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: '#3b82f615' }]}>
                  <Ionicons name="navigate" size={18} color="#3b82f6" />
                </View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Assign Route</Text>
              </View>
              <TouchableOpacity onPress={() => { setRouteModalVisible(false); setRouteModalEntry(null); }} style={[styles.modalClose, { backgroundColor: c.background }]}>
                <Ionicons name="close" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyPad}>
              {routeModalEntry && (
                <View style={[styles.dispatchPreview, { borderColor: c.border, backgroundColor: c.background }]}>
                  <View style={[styles.dispatchPreviewIcon, { backgroundColor: c.primary + '15' }]}>
                    <Ionicons name="car-sport" size={20} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dispatchPreviewReg, { color: c.text }]}>{routeModalEntry.vehicleRegistration}</Text>
                    <Text style={[styles.dispatchPreviewMeta, { color: c.textMuted }]}>
                      Current: {routeModalEntry.routeName || routeModalEntry.routeDestination || 'No route'}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Select Route</Text>
              <TouchableOpacity
                style={[styles.chip, { marginBottom: 8 }, !routeModalEntry?.routeId && styles.chipActive]}
                onPress={() => handleAssignRoute(routeModalEntry, null)}
                disabled={routeModalBusy}
              >
                <Text style={[styles.chipTxt, !routeModalEntry?.routeId && styles.chipTxtActive]}>None (unassigned)</Text>
              </TouchableOpacity>
              {routes.filter(r => r.isActive !== false).map(r => {
                const isCurrent = routeModalEntry?.routeId === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, { marginBottom: 8 }, isCurrent && styles.chipActive]}
                    onPress={() => handleAssignRoute(routeModalEntry, r.id)}
                    disabled={routeModalBusy}
                  >
                    <Text style={[styles.chipTxt, isCurrent && styles.chipTxtActive]}>
                      {r.routeName || r.destinationStation}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {routeModalBusy && <ActivityIndicator style={{ marginTop: 12 }} color={c.primary} />}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════════════════════

function StatPill({ icon, label, value, color, c, styles }) {
  return (
    <View style={[styles.statPill, { backgroundColor: color + '10' }]}>
      <Ionicons name={icon} size={14} color={color} style={{ marginRight: 6 }} />
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
      <Text style={[styles.statPillLabel, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

function QueueCard({ entry, isFirst, isLast, c, styles, onDispatch, onRemove, onMoveUp, onMoveDown, onAssignRoute }) {
  const posColor = entry.queuePosition === 1 ? '#22c55e' : entry.queuePosition <= 3 ? '#3b82f6' : c.textMuted;

  return (
    <View style={[styles.queueCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      {/* Top row: position + vehicle info + dispatch */}
      <View style={styles.queueCardTop}>
        <View style={[styles.posBadge, { backgroundColor: posColor + '15' }]}>
          <Text style={[styles.posText, { color: posColor }]}>#{entry.queuePosition}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.queueReg, { color: c.text }]}>{entry.vehicleRegistration || 'Unknown'}</Text>
          <View style={styles.queueMetaRow}>
            {entry.driverName ? (
              <View style={styles.metaChip}>
                <Ionicons name="person" size={10} color={c.textMuted} style={{ marginRight: 3 }} />
                <Text style={[styles.metaChipTxt, { color: c.textMuted }]}>{entry.driverName}</Text>
              </View>
            ) : null}
            {(entry.routeDestination || entry.routeName) ? (
              <View style={styles.metaChip}>
                <Ionicons name="navigate" size={10} color={c.textMuted} style={{ marginRight: 3 }} />
                <Text style={[styles.metaChipTxt, { color: c.textMuted }]}>{entry.routeDestination || entry.routeName}</Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <Ionicons name="time" size={10} color={c.textMuted} style={{ marginRight: 3 }} />
              <Text style={[styles.metaChipTxt, { color: c.textMuted }]}>{entry.joinedAt}</Text>
            </View>
          </View>
        </View>
        {entry.queuePosition === 1 && (
          <TouchableOpacity style={styles.dispatchBtn} onPress={onDispatch}>
            <Ionicons name="send" size={13} color="#fff" style={{ marginRight: 5 }} />
            <Text style={styles.dispatchBtnTxt}>Go</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Bottom actions */}
      <View style={[styles.queueCardActions, { borderTopColor: c.border }]}>
        <TouchableOpacity style={styles.queueAction} onPress={onMoveUp} disabled={isFirst}>
          <Ionicons name="chevron-up" size={16} color={isFirst ? c.border : c.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onAssignRoute}>
          <Ionicons name="navigate-outline" size={14} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onDispatch}>
          <Ionicons name="send-outline" size={14} color={c.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onRemove}>
          <Ionicons name="trash-outline" size={14} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onMoveDown} disabled={isLast}>
          <Ionicons name="chevron-down" size={16} color={isLast ? c.border : c.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DispatchedCard({ entry, c, styles }) {
  const time = entry.departedAt ? new Date(entry.departedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  return (
    <View style={[styles.dispatchedCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.doneBadge, { backgroundColor: '#22c55e15' }]}>
        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={[styles.queueReg, { color: c.text }]}>{entry.vehicleRegistration || 'Unknown'}</Text>
        <Text style={[styles.metaChipTxt, { color: c.textMuted }]}>
          Departed {time}{entry.passengerCount ? ` · ${entry.passengerCount} pax` : ''}
        </Text>
      </View>
      <View style={[styles.goneTag, { backgroundColor: '#22c55e15' }]}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#22c55e' }}>GONE</Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════════════════════

function createStyles(c) {
  return StyleSheet.create({
    // ── Layout
    root: { flex: 1, flexDirection: 'column' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, flexDirection: 'column' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 80 },
    loadingTxt: { fontSize: 14, marginTop: 12 },

    // ── Header
    header: {
      paddingBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    headerBack: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, marginLeft: 8 },
    headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    headerSubtitle: { fontSize: 12, marginTop: 1 },
    headerAction: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },

    // ── Stats Strip
    statsStrip: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      gap: 6,
    },
    statPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 10,
    },
    statPillValue: { fontSize: 13, fontWeight: '800', marginRight: 3 },
    statPillLabel: { fontSize: 10, fontWeight: '600' },

    // ── Tabs
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      height: 48,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: c.primary,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textMuted,
    },

    // ── Filter Bar
    filterBar: {
      borderBottomWidth: 1,
      paddingVertical: 10,
    },
    filterContent: {
      paddingHorizontal: 12,
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    filterChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterChipTxt: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
      maxWidth: 120,
    },
    filterChipTxtActive: { color: '#fff' },
    filterBadge: {
      backgroundColor: c.border,
      borderRadius: 10,
      minWidth: 20, height: 20,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 5,
      marginLeft: 6,
    },
    filterBadgeTxt: {
      fontSize: 10,
      fontWeight: '800',
      color: c.text,
    },

    // ── FAB
    fabWrap: { position: 'absolute', right: 16 },
    fab: {
      width: 52, height: 52, borderRadius: 26,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
    },

    // ── Queue Cards
    queueCard: {
      borderWidth: 1,
      borderRadius: 14,
      marginBottom: 10,
      overflow: 'hidden',
    },
    queueCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    posBadge: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    posText: { fontSize: 13, fontWeight: '800' },
    queueReg: { fontSize: 15, fontWeight: '700' },
    queueMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    metaChip: { flexDirection: 'row', alignItems: 'center' },
    metaChipTxt: { fontSize: 11 },
    queueCardActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
    },
    queueAction: {
      flex: 1,
      alignItems: 'center', justifyContent: 'center',
      paddingVertical: 8,
    },
    dispatchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#22c55e',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
    },
    dispatchBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // ── Dispatched Card
    dispatchedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      opacity: 0.7,
    },
    doneBadge: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    goneTag: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },

    // ── List headers
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    listHeaderDot: {
      width: 8, height: 8, borderRadius: 4, marginRight: 8,
    },
    listHeaderTxt: { fontSize: 15, fontWeight: '700' },

    // ── Empty state
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyIcon: {
      width: 72, height: 72, borderRadius: 36,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700' },
    emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20 },
    emptyBtn: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    },
    emptyBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

    // ── Overview
    nextCard: {
      borderRadius: 14, padding: 16, marginBottom: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    },
    nextCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    nextIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    nextLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    nextCardBody: { flexDirection: 'row', alignItems: 'center' },
    nextReg: { fontSize: 17, fontWeight: '800' },
    nextMeta: { fontSize: 13, marginTop: 2 },
    quickActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quickBtn: {
      flex: 1, alignItems: 'center', borderRadius: 12, padding: 14,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
    },
    quickBtnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    quickBtnLabel: { fontSize: 12, fontWeight: '600' },

    // ── Card (shared)
    card: {
      borderRadius: 14, padding: 16, marginBottom: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    cardEmpty: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },
    routeRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 11, borderBottomWidth: 1,
    },
    routeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    routeRowName: { fontSize: 14, fontWeight: '600' },
    routeCount: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    routeCountTxt: { fontSize: 12, fontWeight: '700' },

    // ── Analytics
    analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    analyticsTile: {
      width: '47%', borderRadius: 12, padding: 16, alignItems: 'center',
    },
    analyticsTileValue: { fontSize: 24, fontWeight: '800', marginTop: 6 },
    analyticsTileLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    breakdownRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1,
    },
    breakdownName: { fontSize: 14, fontWeight: '600' },
    breakdownMeta: { fontSize: 11, marginTop: 2 },
    breakdownPct: { fontSize: 12, fontWeight: '700', marginLeft: 8, width: 36, textAlign: 'right' },
    progressBarBg: {
      width: 60, height: 6, borderRadius: 3,
      backgroundColor: c.border, overflow: 'hidden',
    },
    progressBarFill: { height: 6, borderRadius: 3 },

    // ── Modal (shared)
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '90%',
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    modalIcon: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 10,
    },
    modalTitle: { fontSize: 17, fontWeight: '800' },
    modalClose: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    modalBody: { flexShrink: 1 },
    modalBodyPad: { padding: 16, paddingBottom: 8 },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
    },
    fieldLabel: {
      fontSize: 12, fontWeight: '700',
      letterSpacing: 0.3,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    input: {
      borderWidth: 1, borderRadius: 10,
      padding: 12, fontSize: 14,
      marginBottom: 4,
    },
    chip: {
      borderRadius: 18,
      paddingHorizontal: 14, paddingVertical: 7,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { fontSize: 12, fontWeight: '700', color: c.text },
    chipTxtActive: { color: '#fff' },
    vehicleList: { maxHeight: 220 },
    noVehicles: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
    vehicleItem: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 12,
      padding: 10, marginBottom: 6,
    },
    vehicleItemIcon: {
      width: 34, height: 34, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 10,
    },
    vehicleItemReg: { fontSize: 14, fontWeight: '700' },
    vehicleItemMeta: { fontSize: 11, marginTop: 1 },
    btnOutline: {
      flex: 1,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderRadius: 12,
      paddingVertical: 12,
    },
    btnOutlineTxt: { fontSize: 14, fontWeight: '600' },
    btnPrimary: {
      flex: 1,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 12,
    },
    btnPrimaryTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

    // ── Dispatch modal extras
    dispatchPreview: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 12,
      padding: 12, marginBottom: 16,
    },
    dispatchPreviewIcon: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 12,
    },
    dispatchPreviewReg: { fontSize: 16, fontWeight: '800' },
    dispatchPreviewMeta: { fontSize: 12, marginTop: 2 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    toggleBox: {
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 10,
    },
    toggleLabel: { fontSize: 14, fontWeight: '600' },
    paxRow: {
      flexDirection: 'row', alignItems: 'flex-start',
      borderWidth: 1, borderRadius: 10,
      padding: 10, marginBottom: 8,
    },
    paxNum: { fontSize: 11, fontWeight: '700', width: 28, paddingTop: 8 },
    paxInput: {
      borderWidth: 1, borderRadius: 8,
      padding: 8, fontSize: 13,
    },
    addPaxBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderStyle: 'dashed',
      borderRadius: 10, paddingVertical: 10, marginTop: 4,
    },
    addPaxBtnTxt: { fontSize: 13, fontWeight: '600' },
  });
}
