import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, TextInput, Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  getQueueByRank, getQueueStats, addToQueue,
  dispatchVehicle, reorderVehicle, removeFromQueue,
  getRouteStops,
} from '../api/queueManagement';
import { fetchVehiclesByRankId, fetchTaxiRanks } from '../api/taxiRanks';
import client from '../api/client';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// QUEUE MANAGEMENT SCREEN â€” Full redesign
// Single-scroll, card-based, mobile-first. No tabs.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function QueueManagementScreen({ navigation, route: navRoute }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const styles = useMemo(() => createStyles(c), [c]);

  const passedRank = navRoute?.params?.rank;

  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rank, setRank] = useState(passedRank || null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [showDispatched, setShowDispatched] = useState(false);

  // â”€â”€ Modal State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addRouteId, setAddRouteId] = useState(null);
  const [addVehicleId, setAddVehicleId] = useState(null);
  const [addNotes, setAddNotes] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchEntry, setDispatchEntry] = useState(null);
  const [dispatchPax, setDispatchPax] = useState('');
  const [dispatchPassengers, setDispatchPassengers] = useState([]);
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [routeStops, setRouteStops] = useState([]);

  // â”€â”€ Data Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      const matchRank = (dep, str) => dep && str && (dep.includes(str) || str.includes(dep));

      const filteredRoutes = Array.isArray(allRoutes) ? allRoutes.filter(r => {
        if (r?.taxiRankId || r?.rankId) {
          return r.taxiRankId === activeRank.id || r.rankId === activeRank.id;
        }
        const dep = String(r?.departureStation || '').trim().toLowerCase();
        if (!dep) return true;
        return matchRank(dep, rankName) || matchRank(dep, rankAddress);
      }) : allRoutes;

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
  
  // Clear dispatch modal if the selected entry no longer exists in queue
  useEffect(() => {
    if (dispatchEntry && !queue.find(item => item.id === dispatchEntry.id)) {
      setDispatchModalVisible(false);
      setDispatchEntry(null);
      setDispatchPax('');
    }
  }, [queue, dispatchEntry]);
  
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // â”€â”€ Derived State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredQueue = useMemo(() => {
    const base = queue.filter(q => q.status !== 'Removed');
    if (!selectedRouteId) return base;
    return base.filter(q => q.routeId === selectedRouteId);
  }, [queue, selectedRouteId]);

  const activeQueue = filteredQueue.filter(q => q.status !== 'Dispatched');
  const dispatchedQueue = filteredQueue.filter(q => q.status === 'Dispatched');
  const queuedVehicleIds = new Set(
    queue.filter(q => q.status !== 'Dispatched' && q.status !== 'Removed').map(q => q.vehicleId)
  );

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleAddToQueue() {
    if (!addVehicleId) return Alert.alert('Required', 'Please select a vehicle');
    if (!addRouteId) return Alert.alert('Required', 'Please select a route');
    setAddBusy(true);
    try {
      await addToQueue({
        taxiRankId: rank.id,
        routeId: addRouteId,
        vehicleId: addVehicleId,
        tenantId: user?.tenantId,
        notes: addNotes || undefined,
      });
      setAddModalVisible(false);
      setAddVehicleId(null);
      setAddRouteId(null);
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
    
    // Verify the entry still exists in the current queue data
    const currentEntry = queue.find(item => item.id === dispatchEntry.id);
    if (!currentEntry) {
      Alert.alert('Error', 'Vehicle no longer exists in queue. Please refresh.');
      setDispatchModalVisible(false);
      setDispatchEntry(null);
      setDispatchPax('');
      setDispatchPassengers([]);
      return;
    }
    
    // Check if already dispatched
    if (currentEntry.status === 'Dispatched') {
      Alert.alert('Info', 'Vehicle has already been dispatched.');
      setDispatchModalVisible(false);
      setDispatchEntry(null);
      setDispatchPax('');
      setDispatchPassengers([]);
      loadData(true);
      return;
    }
    
    setDispatchBusy(true);
    try {
      // Build passenger list with only valid entries
      const validPassengers = dispatchPassengers.filter(p => p.name && p.name.trim());
      
      const dispatchData = {
        // Auto-calculate from passenger list, fallback to manual input, default to 0
        passengerCount: validPassengers.length > 0 ? validPassengers.length : (dispatchPax ? parseInt(dispatchPax, 10) : 0),
        passengers: validPassengers.length > 0 ? validPassengers : undefined,
      };
      
      // Only add dispatchedByUserId if it's a valid GUID format
      const userId = user?.userId || user?.id;
      if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        dispatchData.dispatchedByUserId = userId;
      }
      
      await dispatchVehicle(dispatchEntry.id, dispatchData);
      setDispatchModalVisible(false);
      setDispatchEntry(null);
      setDispatchPax('');
      setDispatchPassengers([]);
      loadData(true);
    } catch (err) {
      console.error('Dispatch error:', err);
      let errorMessage = 'Failed to dispatch vehicle';
      
      if (err?.response?.status === 404) {
        errorMessage = 'Vehicle not found in queue. Please refresh the queue.';
      } else if (err?.response?.status === 400) {
        errorMessage = err?.response?.data?.message || 'Invalid dispatch request';
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('Error', errorMessage);
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
      Alert.alert('Remove', `Remove ${entry.vehicleRegistration || 'this vehicle'}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  }

  async function handleMoveUp(entry) {
    if (entry.queuePosition <= 1) return;
    try { await reorderVehicle(entry.id, entry.queuePosition - 1); loadData(true); }
    catch { Alert.alert('Error', 'Failed to reorder'); }
  }

  async function handleMoveDown(entry) {
    try { await reorderVehicle(entry.id, entry.queuePosition + 1); loadData(true); }
    catch { Alert.alert('Error', 'Failed to reorder'); }
  }

  async function openDispatch(entry) {
    console.log('[Dispatch] Opening dispatch modal for entry:', entry);
    setDispatchEntry(entry);
    setDispatchPax('');
    setDispatchPassengers([]);
    setRouteStops([]);
    
    // Load route stops if route is assigned
    if (entry.routeId) {
      console.log('[Dispatch] Loading stops for routeId:', entry.routeId);
      try {
        const stops = await getRouteStops(entry.routeId);
        // Add final destination if not already in stops
        if (entry.routeDestination && !stops.find(s => s.stopName === entry.routeDestination)) {
          stops.push({
            stopName: entry.routeDestination,
            stopOrder: stops.length + 1,
            fareFromOrigin: stops[stops.length - 1]?.fareFromOrigin || 0,
            isFinalDestination: true
          });
        }
        console.log('[Dispatch] Loaded stops:', stops);
        setRouteStops(stops);
      } catch (err) {
        console.error('[Dispatch] Failed to load route stops:', err);
      }
    } else {
      console.warn('[Dispatch] No routeId in entry:', entry);
    }
    
    setDispatchModalVisible(true);
  }

  // â”€â”€ Modal dimensions (reactive) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const modalW = Math.min(winW - 32, 520);
  const modalMaxH = winH * 0.85;

  // â”€â”€ Loading / Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading queueâ€¦</Text>
      </View>
    );
  }

  if (!rank) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.textMuted} />
        <Text style={[styles.emptyTitle, { color: c.text, marginTop: 12 }]}>No Taxi Rank</Text>
        <Text style={[styles.emptySubText, { color: c.textMuted }]}>No rank found for your account</Text>
      </View>
    );
  }

  const nextInQueue = activeQueue[0];

  // â”€â”€ Main Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>

      {/* â”€â”€ Header â”€â”€ */}
      <View style={[styles.header, {
        paddingTop: Math.max(insets.top, 16),
        backgroundColor: c.surface,
        borderBottomColor: c.border,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Queue Management</Text>
          <Text style={[styles.headerSub, { color: c.textMuted }]} numberOfLines={1}>{rank.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerBtn} 
          onPress={() => navigation.navigate('DispatchedItems')}
        >
          <Ionicons name="list-outline" size={20} color={c.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: c.primary }]}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnTxt}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* â”€â”€ Stats Bar â”€â”€ */}
      {stats && (
        <View style={[styles.statsBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <StatChip label="Waiting" value={stats.waiting} color="#f59e0b" icon="time-outline" />
          <StatChip label="Dispatched" value={stats.dispatched} color="#22c55e" icon="checkmark-circle-outline" />
          <StatChip label="Passengers" value={stats.totalPassengers} color="#3b82f6" icon="people-outline" />
          <StatChip label="Avg Wait" value={`${stats.avgWaitMinutes}m`} color="#8b5cf6" icon="hourglass-outline" />
        </View>
      )}

      {/* â”€â”€ Route Filter Pills â”€â”€ */}
      {routes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.pillRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}
          contentContainerStyle={styles.pillContent}
        >
          <TouchableOpacity
            style={[styles.pill, { borderColor: !selectedRouteId ? c.primary : c.border, backgroundColor: !selectedRouteId ? c.primary : 'transparent' }]}
            onPress={() => setSelectedRouteId(null)}
          >
            <Text style={[styles.pillTxt, { color: !selectedRouteId ? '#fff' : c.text }]}>All</Text>
            <View style={[styles.pillBadge, { backgroundColor: !selectedRouteId ? 'rgba(255,255,255,0.25)' : c.border }]}>
              <Text style={[styles.pillBadgeTxt, { color: !selectedRouteId ? '#fff' : c.text }]}>
                {queue.filter(q => q.status !== 'Removed' && q.status !== 'Dispatched').length}
              </Text>
            </View>
          </TouchableOpacity>
          {routes.filter(r => r.isActive !== false).map(r => {
            const count = queue.filter(q => q.routeId === r.id && q.status !== 'Removed' && q.status !== 'Dispatched').length;
            const active = selectedRouteId === r.id;
            return (
              <TouchableOpacity key={r.id}
                style={[styles.pill, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : 'transparent' }]}
                onPress={() => setSelectedRouteId(r.id)}
              >
                <Text style={[styles.pillTxt, { color: active ? '#fff' : c.text }]} numberOfLines={1}>
                  {r.destinationStation || r.routeName}
                </Text>
                {count > 0 && (
                  <View style={[styles.pillBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : c.border }]}>
                    <Text style={[styles.pillBadgeTxt, { color: active ? '#fff' : c.text }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* â”€â”€ Main Content â”€â”€ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {activeQueue.length === 0 && dispatchedQueue.length === 0 ? (

          /* â”€â”€ Empty State â”€â”€ */
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: c.primary + '18' }]}>
              <Ionicons name="car-outline" size={52} color={c.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>Queue is Empty</Text>
            <Text style={[styles.emptySubText, { color: c.textMuted }]}>No vehicles are waiting to be dispatched</Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: c.primary }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Add First Vehicle</Text>
            </TouchableOpacity>
          </View>

        ) : (
          <>
            {/* â”€â”€ Next to Dispatch Hero Card â”€â”€ */}
            {nextInQueue && (
              <View style={[styles.heroCard, { backgroundColor: c.surface, borderColor: '#22c55e30' }]}>
                <View style={styles.heroLabel}>
                  <View style={[styles.heroDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={[styles.heroLabelTxt, { color: '#22c55e' }]}>NEXT TO DISPATCH</Text>
                </View>
                <View style={styles.heroBody}>
                  <View style={[styles.heroIcon, { backgroundColor: c.primary + '18' }]}>
                    <Ionicons name="car-sport" size={28} color={c.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.heroReg, { color: c.text }]}>{nextInQueue.vehicleRegistration || 'â€”'}</Text>
                    <Text style={[styles.heroMeta, { color: c.textMuted }]} numberOfLines={1}>
                      {[nextInQueue.vehicleMake, nextInQueue.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
                      {nextInQueue.vehicleCapacity ? ` Â· ${nextInQueue.vehicleCapacity} seats` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, gap: 10 }}>
                      {nextInQueue.driverName && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="person-outline" size={12} color={c.textMuted} style={{ marginRight: 4 }} />
                          <Text style={[styles.heroDetail, { color: c.textMuted }]}>{nextInQueue.driverName}</Text>
                        </View>
                      )}
                      {(nextInQueue.routeDestination || nextInQueue.routeName) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="navigate-outline" size={12} color={c.textMuted} style={{ marginRight: 4 }} />
                          <Text style={[styles.heroDetail, { color: c.textMuted }]}>{nextInQueue.routeDestination || nextInQueue.routeName}</Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="time-outline" size={12} color={c.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.heroDetail, { color: c.textMuted }]}>Since {nextInQueue.joinedAt}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.heroDispatchBtn, { backgroundColor: '#22c55e' }]}
                  onPress={() => openDispatch(nextInQueue)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.heroDispatchTxt}>Dispatch Now</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* â”€â”€ Waiting Queue â”€â”€ */}
            {activeQueue.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Waiting Queue</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: '#f59e0b18' }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#f59e0b' }}>{activeQueue.length}</Text>
                  </View>
                </View>
                {activeQueue.map((entry, idx) => (
                  <QueueCard
                    key={entry.id}
                    entry={entry}
                    isFirst={idx === 0}
                    isLast={idx === activeQueue.length - 1}
                    c={c}
                    onDispatch={() => openDispatch(entry)}
                    onRemove={() => handleRemove(entry)}
                    onMoveUp={() => handleMoveUp(entry)}
                    onMoveDown={() => handleMoveDown(entry)}
                  />
                ))}
              </View>
            )}

            {/* â”€â”€ Dispatched Today â”€â”€ */}
            {dispatchedQueue.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setShowDispatched(v => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Dispatched Today</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.sectionBadge, { backgroundColor: '#22c55e18' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#22c55e' }}>{dispatchedQueue.length}</Text>
                    </View>
                    <Ionicons name={showDispatched ? 'chevron-up' : 'chevron-down'} size={16} color={c.textMuted} />
                  </View>
                </TouchableOpacity>
                {showDispatched && dispatchedQueue.map(entry => (
                  <DispatchedCard key={entry.id} entry={entry} c={c} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* â”€â”€ Add to Queue Modal â”€â”€ */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: c.surface, width: modalW, maxHeight: modalMaxH }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Add Vehicle to Queue</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Route *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 16 }}>
                {routes.filter(r => r.isActive !== false).map(r => (
                  <TouchableOpacity key={r.id}
                    style={[styles.chip, { borderColor: addRouteId === r.id ? c.primary : c.border, backgroundColor: addRouteId === r.id ? c.primary : 'transparent' }]}
                    onPress={() => setAddRouteId(r.id)}
                  >
                    <Text style={[styles.chipTxt, { color: addRouteId === r.id ? '#fff' : c.text }]} numberOfLines={1}>
                      {r.destinationStation || r.routeName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Vehicle *</Text>
              {vehicles.filter(v => !queuedVehicleIds.has(v.id)).length === 0 ? (
                <Text style={[styles.emptySubText, { color: c.textMuted, textAlign: 'center', paddingVertical: 16 }]}>
                  All vehicles are already queued
                </Text>
              ) : vehicles.filter(v => !queuedVehicleIds.has(v.id)).map(v => (
                <TouchableOpacity key={v.id}
                  style={[styles.vehicleRow, {
                    borderColor: addVehicleId === v.id ? c.primary : c.border,
                    backgroundColor: addVehicleId === v.id ? c.primary + '0e' : 'transparent',
                  }]}
                  onPress={() => setAddVehicleId(v.id)}
                >
                  <View style={[styles.vehicleRowIcon, { backgroundColor: addVehicleId === v.id ? c.primary + '20' : c.background }]}>
                    <Ionicons name="car-sport" size={18} color={addVehicleId === v.id ? c.primary : c.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vehicleRowReg, { color: c.text }]}>{v.registration || 'Unknown'}</Text>
                    <Text style={[styles.vehicleRowMeta, { color: c.textMuted }]}>
                      {[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}{v.capacity ? ` Â· ${v.capacity} seats` : ''}
                    </Text>
                  </View>
                  {addVehicleId === v.id && <Ionicons name="checkmark-circle" size={22} color={c.primary} />}
                </TouchableOpacity>
              ))}

              <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 12 }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={addNotes}
                onChangeText={setAddNotes}
                placeholder="Optional notesâ€¦"
                placeholderTextColor={c.textMuted}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity
                style={[styles.footerBtn, { borderColor: c.border }]}
                onPress={() => { setAddModalVisible(false); setAddVehicleId(null); setAddRouteId(null); setAddNotes(''); }}
              >
                <Text style={[styles.footerBtnTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: c.primary, borderColor: c.primary }]}
                onPress={handleAddToQueue}
                disabled={addBusy}
              >
                {addBusy
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[styles.footerBtnTxt, { color: '#fff' }]}>Add to Queue</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* â”€â”€ Dispatch Modal â”€â”€ */}
      <Modal visible={dispatchModalVisible} transparent animationType="fade" onRequestClose={() => setDispatchModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: c.surface, width: modalW, maxHeight: modalMaxH }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Dispatch Vehicle</Text>
              <TouchableOpacity onPress={() => setDispatchModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {dispatchEntry && (
                <View style={[styles.dispatchPreview, { backgroundColor: '#22c55e0e', borderColor: '#22c55e35' }]}>
                  <View style={[styles.dispatchPreviewIcon, { backgroundColor: '#22c55e20' }]}>
                    <Ionicons name="car-sport" size={22} color="#22c55e" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.dispatchReg, { color: c.text }]}>{dispatchEntry.vehicleRegistration}</Text>
                    <Text style={[styles.dispatchMeta, { color: c.textMuted }]}>
                      Position #{dispatchEntry.queuePosition}{dispatchEntry.driverName ? ` Â· ${dispatchEntry.driverName}` : ''}
                    </Text>
                    {(dispatchEntry.routeDestination || dispatchEntry.routeName) && (
                      <Text style={[styles.dispatchMeta, { color: c.textMuted, marginTop: 2 }]}>
                        {dispatchEntry.routeDestination || dispatchEntry.routeName}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Passenger Count (optional)</Text>
              <TextInput
                style={[styles.textInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={dispatchPax}
                onChangeText={(text) => {
                  setDispatchPax(text);
                  // Clear passenger list when manual count is entered
                  if (text && dispatchPassengers.length > 0) {
                    setDispatchPassengers([]);
                  }
                }}
                keyboardType="numeric"
                placeholder={dispatchPassengers.length > 0 ? `${dispatchPassengers.length} (from list)` : "e.g. 15"}
                placeholderTextColor={c.textMuted}
              />
              <Text style={[styles.fieldHint, { color: c.textMuted }]}>
                Enter number manually OR use passenger list below
              </Text>

              {/* Passenger List Section */}
              <View style={{ marginTop: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={[styles.fieldLabel, { color: c.textMuted }]}>
                    Passengers ({dispatchPassengers.length})
                  </Text>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 6 }}
                    onPress={() => {
                      setDispatchPassengers([...dispatchPassengers, { name: '', contact: '', nextOfKinName: '', nextOfKinContact: '', destination: '', amount: 0, paymentMethod: 'Cash' }]);
                      setDispatchPax('');
                    }}
                  >
                    <Ionicons name="add-circle" size={18} color="#22c55e" />
                    <Text style={{ color: '#22c55e', fontSize: 13, marginLeft: 4 }}>Add Passenger</Text>
                  </TouchableOpacity>
                </View>

                {dispatchPassengers.map((p, i) => (
                  <View key={i} style={[styles.passengerCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>
                        Passenger {i + 1}
                      </Text>
                      <TouchableOpacity onPress={() => setDispatchPassengers(prev => prev.filter((_, idx) => idx !== i))}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.passengerInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="Name *"
                      placeholderTextColor={c.textMuted}
                      value={p.name ?? ''}
                      onChangeText={v => {
                        const updated = [...dispatchPassengers];
                        updated[i].name = v;
                        setDispatchPassengers(updated);
                        setDispatchPax('');
                      }}
                    />
                    <TextInput
                      style={[styles.passengerInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="Phone"
                      placeholderTextColor={c.textMuted}
                      value={p.contact ?? ''}
                      onChangeText={v => {
                        const updated = [...dispatchPassengers];
                        updated[i].contact = v;
                        setDispatchPassengers(updated);
                      }}
                      keyboardType="phone-pad"
                    />
                    <TextInput
                      style={[styles.passengerInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="Next of Kin Name (optional)"
                      placeholderTextColor={c.textMuted}
                      value={p.nextOfKinName ?? ''}
                      onChangeText={v => {
                        const updated = [...dispatchPassengers];
                        updated[i].nextOfKinName = v;
                        setDispatchPassengers(updated);
                      }}
                    />
                    <TextInput
                      style={[styles.passengerInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="Next of Kin Contact (optional)"
                      placeholderTextColor={c.textMuted}
                      value={p.nextOfKinContact ?? ''}
                      onChangeText={v => {
                        const updated = [...dispatchPassengers];
                        updated[i].nextOfKinContact = v;
                        setDispatchPassengers(updated);
                      }}
                      keyboardType="phone-pad"
                    />
                    {routeStops.length > 0 ? (
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ color: c.textMuted, fontSize: 11, marginBottom: 6 }}>Select Destination:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {routeStops.map((stop, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: p.destination === stop.stopName ? '#22c55e' : c.border,
                                backgroundColor: p.destination === stop.stopName ? '#22c55e20' : c.background,
                              }}
                              onPress={() => {
                                const updated = [...dispatchPassengers];
                                updated[i].destination = stop.stopName;
                                updated[i].amount = stop.fareFromOrigin || 0;
                                setDispatchPassengers(updated);
                                setDispatchPax('');
                              }}
                            >
                              <Text style={{ 
                                color: p.destination === stop.stopName ? '#22c55e' : c.text, 
                                fontSize: 13,
                                fontWeight: p.destination === stop.stopName ? '600' : '400'
                              }}>
                                {stop.stopName}
                              </Text>
                              {stop.fareFromOrigin > 0 && (
                                <Text style={{ color: c.textMuted, fontSize: 11 }}>
                                  R{stop.fareFromOrigin.toFixed(2)}
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <TextInput
                        style={[styles.passengerInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                        placeholder="Destination (optional)"
                        placeholderTextColor={c.textMuted}
                        value={p.destination ?? ''}
                        onChangeText={v => {
                          const updated = [...dispatchPassengers];
                          updated[i].destination = v;
                          setDispatchPassengers(updated);
                        }}
                      />
                    )}
                    {/* Payment Method Selection */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ color: c.textMuted, fontSize: 11, marginBottom: 6 }}>Payment Method:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {['Cash', 'Card', 'Mzansi Wallet'].map((method) => (
                          <TouchableOpacity
                            key={method}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 20,
                              borderWidth: 1,
                              borderColor: p.paymentMethod === method ? '#22c55e' : c.border,
                              backgroundColor: p.paymentMethod === method ? '#22c55e20' : c.background,
                            }}
                            onPress={() => {
                              const updated = [...dispatchPassengers];
                              updated[i].paymentMethod = method;
                              setDispatchPassengers(updated);
                              // If Card selected, show POS payment UI
                              if (method === 'Card') {
                                Alert.alert(
                                  'Card Payment',
                                  'Please use the POS device to process card payment.',
                                  [
                                    { text: 'Payment Complete', onPress: () => console.log('[Payment] Card payment processed via POS') },
                                    { text: 'Cancel', style: 'cancel', onPress: () => {
                                      const reset = [...dispatchPassengers];
                                      reset[i].paymentMethod = 'Cash';
                                      setDispatchPassengers(reset);
                                    }}
                                  ]
                                );
                              }
                            }}
                          >
                            <Text style={{ 
                              color: p.paymentMethod === method ? '#22c55e' : c.text, 
                              fontSize: 13,
                              fontWeight: p.paymentMethod === method ? '600' : '400'
                            }}>
                              {method === 'Mzansi Wallet' ? 'Wallet' : method}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    {/* Fare Display */}
                    {p.amount > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 10, backgroundColor: '#22c55e10', borderRadius: 8, borderWidth: 1, borderColor: '#22c55e30' }}>
                        <Ionicons name="cash-outline" size={18} color="#22c55e" />
                        <View style={{ marginLeft: 8, flex: 1 }}>
                          <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: '700' }}>
                            Fare: R{p.amount.toFixed(2)}
                          </Text>
                          <Text style={{ color: c.textMuted, fontSize: 12 }}>
                            Payment: {p.paymentMethod || 'Cash'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))}

                {dispatchPassengers.length === 0 && (
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                    No passengers added yet. Tap "Add Passenger" to create a passenger list.
                  </Text>
                )}

                {/* Running Total */}
                {dispatchPassengers.length > 0 && (
                  <View style={{ marginTop: 16, padding: 12, backgroundColor: '#22c55e15', borderRadius: 12, borderWidth: 2, borderColor: '#22c55e40' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>
                        Total Passengers: {dispatchPassengers.length}
                      </Text>
                      <Text style={{ color: '#22c55e', fontSize: 20, fontWeight: '800' }}>
                        Total: R{dispatchPassengers.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity
                style={[styles.footerBtn, { borderColor: c.border }]}
                onPress={() => { setDispatchModalVisible(false); setDispatchEntry(null); setDispatchPax(''); setDispatchPassengers([]); setRouteStops([]); }}
              >
                <Text style={[styles.footerBtnTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: '#22c55e', borderColor: '#22c55e' }]}
                onPress={handleDispatch}
                disabled={dispatchBusy}
              >
                {dispatchBusy ? <ActivityIndicator color="#fff" size="small" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={[styles.footerBtnTxt, { color: '#fff' }]}>Dispatch</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sub-components
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatChip({ label, value, color, icon }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <Ionicons name={icon} size={13} color={color} style={{ marginRight: 4 }} />
        <Text style={{ fontSize: 17, fontWeight: '800', color }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 10, fontWeight: '600', color, opacity: 0.75, letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function QueueCard({ entry, isFirst, isLast, c, onDispatch, onRemove, onMoveUp, onMoveDown }) {
  const pos = entry.queuePosition;
  const posColor = pos === 1 ? '#22c55e' : pos <= 3 ? '#3b82f6' : c.textMuted;

  return (
    <View style={{
      borderRadius: 16,
      borderWidth: 1,
      borderColor: pos === 1 ? '#22c55e35' : c.border,
      backgroundColor: c.surface,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        {/* Position badge */}
        <View style={{
          width: 42, height: 42, borderRadius: 13,
          backgroundColor: posColor + '18',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 12,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: posColor }}>#{pos}</Text>
        </View>

        {/* Vehicle info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: c.text }} numberOfLines={1}>
            {entry.vehicleRegistration || 'Unknown'}
          </Text>
          <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }} numberOfLines={1}>
            {[entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ')}
            {entry.vehicleCapacity ? ` · ${entry.vehicleCapacity} seats` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 8 }}>
            {entry.driverName && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person-outline" size={11} color={c.textMuted} style={{ marginRight: 3 }} />
                <Text style={{ fontSize: 11, color: c.textMuted }}>{entry.driverName}</Text>
              </View>
            )}
            {(entry.routeDestination || entry.routeName) && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="navigate-outline" size={11} color={c.textMuted} style={{ marginRight: 3 }} />
                <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                  {entry.routeDestination || entry.routeName}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={11} color={c.textMuted} style={{ marginRight: 3 }} />
              <Text style={{ fontSize: 11, color: c.textMuted }}>{entry.joinedAt}</Text>
            </View>
          </View>
        </View>

        {/* Reorder arrows */}
        <View style={{ alignItems: 'center', marginLeft: 8 }}>
          <TouchableOpacity onPress={onMoveUp} disabled={isFirst} style={{ padding: 6, opacity: isFirst ? 0.2 : 1 }}>
            <Ionicons name="chevron-up" size={18} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onMoveDown} disabled={isLast} style={{ padding: 6, opacity: isLast ? 0.2 : 1 }}>
            <Ionicons name="chevron-down" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action footer */}
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border }}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRightWidth: 1, borderRightColor: c.border, backgroundColor: '#22c55e0a' }}
          onPress={onDispatch}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={14} color="#22c55e" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#22c55e' }}>Dispatch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, backgroundColor: '#ef44440a' }}
          onPress={onRemove}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={14} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DispatchedCard({ entry, c }) {
  const time = entry.departedAt
    ? new Date(entry.departedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'â€”';
  return (
    <View style={{
      borderRadius: 12, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.surface, padding: 12, marginBottom: 8,
      flexDirection: 'row', alignItems: 'center', opacity: 0.72,
    }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#22c55e18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Ionicons name="checkmark" size={16} color="#22c55e" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{entry.vehicleRegistration || 'Unknown'}</Text>
        <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 1 }}>
          Departed {time}{entry.passengerCount ? ` Â· ${entry.passengerCount} pax` : ''}
        </Text>
      </View>
      <View style={{ backgroundColor: '#22c55e18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: '#22c55e' }}>DISPATCHED</Text>
      </View>
    </View>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Styles
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingText: { marginTop: 12, fontSize: 14 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
    backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800' },
    headerSub: { fontSize: 12, marginTop: 1 },
    addBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
    addBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },

    // Stats bar
    statsBar: { flexDirection: 'row', borderBottomWidth: 1 },

    // Route pills
    pillRow: { borderBottomWidth: 1, maxHeight: 52 },
    pillContent: { paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', gap: 8, alignItems: 'center' },
    pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
    pillTxt: { fontSize: 12, fontWeight: '700' },
    pillBadge: { borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginLeft: 6 },
    pillBadgeTxt: { fontSize: 10, fontWeight: '800' },

    // Scroll
    scrollContent: { padding: 16 },

    // Empty state
    emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
    emptyIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    emptySubText: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    emptyAddBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },

    // Hero card (next to dispatch)
    heroCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 20 },
    heroLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    heroDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    heroLabelTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    heroBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    heroIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    heroReg: { fontSize: 22, fontWeight: '900' },
    heroMeta: { fontSize: 13, marginTop: 2 },
    heroDetail: { fontSize: 12 },
    heroDispatchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14 },
    heroDispatchTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

    // Section
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '800' },
    sectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalBox: { borderRadius: 22, overflow: 'hidden', flexDirection: 'column' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    modalTitle: { fontSize: 17, fontWeight: '900' },
    modalBody: { padding: 20 },
    modalFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
    footerBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 14 },
    footerBtnTxt: { fontSize: 14, fontWeight: '700' },

    // Form fields
    fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.4 },
    fieldHint: { fontSize: 11, marginTop: -8, marginBottom: 8 },
    textInput: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 14 },
    chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
    chipTxt: { fontSize: 13, fontWeight: '700' },
    vehicleRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 8 },
    vehicleRowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    vehicleRowReg: { fontSize: 14, fontWeight: '800' },
    vehicleRowMeta: { fontSize: 11, marginTop: 2 },

    // Dispatch preview
    dispatchPreview: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 18 },
    dispatchPreviewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dispatchReg: { fontSize: 16, fontWeight: '900' },
    dispatchMeta: { fontSize: 12, marginTop: 2 },

    // Passenger card styles
    passengerCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 },
    passengerInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  });
}
