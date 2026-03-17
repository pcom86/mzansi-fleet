import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, TextInput, Platform,
  Dimensions, Animated, PanResponder, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  getQueueByRank, getQueueStats, addToQueue,
  dispatchVehicle, reorderVehicle, removeFromQueue,
} from '../api/queueManagement';
import { fetchVehiclesByRankId, fetchTaxiRanks } from '../api/taxiRanks';
import client from '../api/client';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
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
  const [selectedRouteId, setSelectedRouteId] = useState(null); // null = All
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  // Enhanced UI state
  const [activeView, setActiveView] = useState('overview'); // overview, queue, analytics
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [animatedValues] = useState({
    headerHeight: new Animated.Value(120),
    fabScale: new Animated.Value(1),
  });

  // Add modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addRouteId, setAddRouteId] = useState(null);
  const [addVehicleId, setAddVehicleId] = useState(null);
  const [addDriverId, setAddDriverId] = useState(null);
  const [addNotes, setAddNotes] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  // Dispatch modal
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchEntry, setDispatchEntry] = useState(null);
  const [dispatchPax, setDispatchPax] = useState('');
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [includePassengerList, setIncludePassengerList] = useState(false);
  const [passengerList, setPassengerList] = useState([{ name: '', contact: '' }]);

  // Quick actions modal
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Load data
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

      console.log('[Queue] Loading routes for taxiRankId:', activeRank.id);
      console.log('[Queue] Routes response:', routesResp);
      console.log('[Queue] Active rank:', { id: activeRank?.id, name: activeRank?.name, address: activeRank?.address });
      console.log('[Queue] Raw routes:', (routesResp?.data || routesResp || []).map(r => ({
        id: r?.id,
        routeName: r?.routeName,
        departureStation: r?.departureStation,
        taxiRankId: r?.taxiRankId || r?.rankId || r?.taxiRank?.id,
        keys: Object.keys(r || {}).sort(),
      })));

      setQueue(queueData || []);
      setStats(statsData);

      // Sometimes the backend returns routes for multiple ranks; enforce filtering by current rank
      const allRoutes = routesResp?.data || routesResp || [];
      const filteredRoutes = Array.isArray(allRoutes)
        ? allRoutes.filter(r => {
            // Route DTOs from the API may not include the taxiRankId, so only filter when present
            if (r?.taxiRankId || r?.rankId) {
              return r.taxiRankId === activeRank.id || r.rankId === activeRank.id;
            }
            return true;
          })
        : allRoutes;

      // Further enforce correct rank by matching the route's departure station to the rank name/address.
      // This is important when the backend returns multiple routes tied to the rank but not actually departing from it.
      const rankName = (activeRank?.name || '').trim().toLowerCase();
      const rankAddress = (activeRank?.address || '').trim().toLowerCase();

      const matchRank = (departure, rankStr) => {
        if (!departure || !rankStr) return false;
        return departure.includes(rankStr) || rankStr.includes(departure);
      };

      const rankFilteredRoutes = Array.isArray(filteredRoutes)
        ? filteredRoutes.filter(r => {
            const departure = String(r?.departureStation || '').trim().toLowerCase();
            if (!departure) return true;
            // Accept route if departure station matches the rank name/address loosely
            return matchRank(departure, rankName) || matchRank(departure, rankAddress);
          })
        : filteredRoutes;

      console.log('[Queue] Filtered routes after rank filtering:', rankFilteredRoutes.map(r => ({id: r.id, routeName: r.routeName, departure: r.departureStation}))); 
      setRoutes(rankFilteredRoutes);
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

  // Filter queue by selected route
  const filteredQueue = useMemo(() => {
    if (!selectedRouteId) return queue.filter(q => q.status !== 'Removed');
    return queue.filter(q => q.routeId === selectedRouteId && q.status !== 'Removed');
  }, [queue, selectedRouteId]);

  const activeQueue = filteredQueue.filter(q => q.status !== 'Dispatched');
  const dispatchedQueue = filteredQueue.filter(q => q.status === 'Dispatched');

  // Add to queue handler
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

  // Dispatch handler
  async function handleDispatch() {
    if (!dispatchEntry) return;
    setDispatchBusy(true);
    try {
      // Filter out empty passengers
      const validPassengers = includePassengerList 
        ? passengerList.filter(p => p.name.trim() || p.contact.trim())
        : [];
      
      // Calculate passenger count
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

  // Remove handler
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

  // Reorder handlers
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

  // Already queued vehicle IDs (for filtering in add modal)
  const queuedVehicleIds = new Set(
    queue.filter(q => q.status !== 'Dispatched' && q.status !== 'Removed').map(q => q.vehicleId)
  );

  // View Components
  function OverviewView() {
    const nextVehicle = activeQueue[0];
    const urgentQueue = activeQueue.filter(q => q.queuePosition <= 3);

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {/* Next Vehicle Priority Card */}
        {nextVehicle && (
          <View style={[styles.priorityCard, { backgroundColor: c.surface }]}>
            <View style={styles.priorityHeader}>
              <Ionicons name="star" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={[styles.priorityTitle, { color: c.text }]}>Next to Dispatch</Text>
            </View>
            <View style={styles.priorityContent}>
              <View style={[styles.vehicleIcon, { backgroundColor: c.primary + '20' }]}>
                <Ionicons name="car-sport" size={24} color={c.primary} />
              </View>
              <View style={styles.priorityInfo}>
                <Text style={[styles.priorityReg, { color: c.text }]}>{nextVehicle.vehicleRegistration}</Text>
                <Text style={[styles.priorityMeta, { color: c.textMuted }]}>
                  {nextVehicle.driverName || 'No driver'} • {nextVehicle.routeName || 'No route'}
                </Text>
                <Text style={[styles.priorityTime, { color: c.textMuted }]}>
                  Waiting since {nextVehicle.joinedAt}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.priorityAction, { backgroundColor: '#22c55e' }]}
                onPress={() => { setDispatchEntry(nextVehicle); setDispatchModalVisible(true); }}
              >
                <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.priorityActionText}>Dispatch</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: c.surface }]} onPress={() => setAddModalVisible(true)}>
            <View style={[styles.actionIcon, { backgroundColor: c.primary + '20' }]}>
              <Ionicons name="add-circle" size={24} color={c.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: c.text }]}>Add Vehicle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: c.surface }]} onPress={() => setActiveView('queue')}>
            <View style={[styles.actionIcon, { backgroundColor: '#3b82f6' + '20' }]}>
              <Ionicons name="list" size={24} color="#3b82f6" />
            </View>
            <Text style={[styles.actionLabel, { color: c.text }]}>View Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: c.surface }]} onPress={() => setActiveView('analytics')}>
            <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' + '20' }]}>
              <Ionicons name="bar-chart" size={24} color="#8b5cf6" />
            </View>
            <Text style={[styles.actionLabel, { color: c.text }]}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: c.surface }]} onPress={() => setShowFilters(!showFilters)}>
            <View style={[styles.actionIcon, { backgroundColor: '#f59e0b' + '20' }]}>
              <Ionicons name="filter" size={24} color="#f59e0b" />
            </View>
            <Text style={[styles.actionLabel, { color: c.text }]}>Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Route Overview */}
        <View style={[styles.sectionCard, { backgroundColor: c.surface }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Route Overview</Text>
          {routes.filter(r => r.isActive !== false).slice(0, 3).map(route => {
            const routeQueue = queue.filter(q => q.routeId === route.id && q.status !== 'Removed' && q.status !== 'Dispatched');
            return (
              <TouchableOpacity
                key={route.id}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedRouteId(route.id);
                  setActiveView('queue');
                }}
                style={[styles.routeOverview, { borderBottomColor: c.border }]}
              >
                <View style={styles.routeOverviewLeft}>
                  <Text style={[styles.routeName, { color: c.text }]}>{route.routeName || route.destinationStation}</Text>
                  <Text style={[styles.routeStats, { color: c.textMuted }]}> 
                    {route.routeName || route.destinationStation}: {routeQueue.length} vehicles waiting
                  </Text>
                </View>
                <View style={styles.routeOverviewRight}>
                  <View style={[styles.routeStatus, {
                    backgroundColor: routeQueue.length > 0 ? '#f59e0b' : '#22c55e'
                  }]}>
                    <Text style={styles.routeStatusText}>
                      {routeQueue.length > 0 ? 'Active' : 'Clear'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function QueueView() {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {/* Active queue */}
        {activeQueue.length === 0 && dispatchedQueue.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: c.primary + '20' }]}>
              <Ionicons name="car-outline" size={48} color={c.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>Queue is Empty</Text>
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              No vehicles are currently waiting to be dispatched
            </Text>
            <TouchableOpacity
              style={[styles.emptyAction, { backgroundColor: c.primary }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.emptyActionText}>Add First Vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeQueue.length > 0 && (
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={20} color={c.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, { color: c.text }]}>
                  Waiting Queue ({activeQueue.length})
                </Text>
              </View>
            )}
            {activeQueue.map((entry, idx) => (
              <ModernQueueCard
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
                onQuickActions={() => { setSelectedEntry(entry); setQuickActionsVisible(true); }}
              />
            ))}

            {dispatchedQueue.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" style={{ marginRight: 8 }} />
                  <Text style={[styles.sectionTitle, { color: c.text }]}>
                    Dispatched Today ({dispatchedQueue.length})
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

  function AnalyticsView() {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <View style={[styles.analyticsCard, { backgroundColor: c.surface }]}>
          <Text style={[styles.analyticsTitle, { color: c.text }]}>Performance Analytics</Text>
          <Text style={[styles.analyticsSubtitle, { color: c.textMuted }]}>
            Real-time insights for today
          </Text>

          {/* Analytics Content Placeholder */}
          <View style={styles.analyticsPlaceholder}>
            <Ionicons name="bar-chart-outline" size={48} color={c.textMuted} />
            <Text style={[styles.placeholderText, { color: c.textMuted }]}>
              Advanced analytics coming soon
            </Text>
            <Text style={[styles.placeholderSubtext, { color: c.textMuted }]}>
              Peak hours, route performance, and efficiency metrics
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading queue management…</Text>
      </View>
    );
  }

  if (!rank) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.textMuted} />
        <Text style={[styles.emptyTitle, { color: c.text }]}>No Taxi Rank</Text>
        <Text style={[styles.emptyText, { color: c.textMuted }]}>No taxi rank found for your association</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />

      {/* Modern Header with Gradient */}
      <Animated.View style={[styles.header, {
        paddingTop: Math.max(insets.top, 16) + 8,
        height: animatedValues.headerHeight,
        backgroundColor: c.surface,
        shadowColor: c.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={c.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: c.text }]}>Queue Management</Text>
            <Text style={[styles.headerSub, { color: c.textMuted }]}>{rank.name}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterBtn}>
            <Ionicons name="filter" size={20} color={c.primary} />
          </TouchableOpacity>
        </View>

        {/* Enhanced Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <StatsCard
              styles={styles}
              icon="time-outline"
              label="Waiting"
              value={stats.loading}
              color="#f59e0b"
              trend={stats.loading > 5 ? 'up' : 'down'}
            />
            <StatsCard
              styles={styles}
              icon="checkmark-circle-outline"
              label="Dispatched"
              value={stats.dispatched}
              color="#22c55e"
              trend="up"
            />
            <StatsCard
              styles={styles}
              icon="people-outline"
              label="Passengers"
              value={stats.totalPassengers}
              color="#3b82f6"
              trend="neutral"
            />
            <StatsCard
              styles={styles}
              icon="hourglass-outline"
              label="Avg Wait"
              value={`${stats.averageWaitMinutes}m`}
              color="#8b5cf6"
              trend={stats.averageWaitMinutes > 10 ? 'down' : 'up'}
            />
          </View>
        )}
      </Animated.View>

      {/* Modern Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {[
          { key: 'overview', icon: 'grid-outline', label: 'Overview' },
          { key: 'queue', icon: 'list-outline', label: 'Queue' },
          { key: 'analytics', icon: 'bar-chart-outline', label: 'Analytics' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeView === tab.key && styles.tabActive]}
            onPress={() => setActiveView(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeView === tab.key ? c.primary : c.textMuted}
            />
            <Text style={[styles.tabLabel, activeView === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Route Filter Bar */}
      {showFilters && (
        <Animated.View style={[styles.filterBar, { backgroundColor: c.surface2 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeFilter}>
            <TouchableOpacity
              style={[styles.routeChip, !selectedRouteId && styles.routeChipActive]}
              onPress={() => setSelectedRouteId(null)}
            >
              <Text style={[styles.routeChipText, !selectedRouteId && styles.routeChipTextActive]}>
                All Routes
              </Text>
              <View style={[styles.routeBadge, { marginLeft: 6 }, !selectedRouteId && { backgroundColor: c.primary }]}>
                <Text style={[styles.routeBadgeText, !selectedRouteId && { color: '#fff' }]}>
                  {queue.filter(q => q.status !== 'Removed' && q.status !== 'Dispatched').length}
                </Text>
              </View>
            </TouchableOpacity>
            {routes.filter(r => r.isActive !== false).map(r => {
              const count = queue.filter(q => q.routeId === r.id && q.status !== 'Removed' && q.status !== 'Dispatched').length;
              const isActive = selectedRouteId === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.routeChip, isActive && styles.routeChipActive]}
                  onPress={() => setSelectedRouteId(r.id)}
                >
                  <Text style={[styles.routeChipText, isActive && styles.routeChipTextActive]} numberOfLines={1}>
                    {r.routeName || r.destinationStation}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.routeBadge, { marginLeft: 6 }, isActive && { backgroundColor: '#fff' }]}>
                      <Text style={[styles.routeBadgeText, isActive && { color: c.primary }]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* Main Content Area */}
      <View style={styles.content}>
        {activeView === 'overview' && <OverviewView />}
        {activeView === 'queue' && <QueueView />}
        {activeView === 'analytics' && <AnalyticsView />}
      </View>

      {/* Floating Action Button */}
      <Animated.View style={[styles.fabContainer, {
        transform: [{ scale: animatedValues.fabScale }],
        bottom: Math.max(insets.bottom, 16) + 16,
      }]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: c.primary }]}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Add to Queue Modal ── */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}> 
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Add Vehicle to Queue</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={c.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} keyboardShouldPersistTaps="handled">
              {/* Route selector */}
              <Text style={[styles.label, { color: c.textMuted }]}>Route (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routeScroll} contentContainerStyle={styles.routeScrollContent}>
                <TouchableOpacity
                  style={[styles.chipBtn, !addRouteId && styles.chipBtnActive]}
                  onPress={() => setAddRouteId(null)}>
                  <Text style={[styles.chipBtnTxt, !addRouteId && styles.chipBtnTxtActive]}>No Route</Text>
                </TouchableOpacity>
                {routes.filter(r => r.isActive !== false).map(r => (
                  <TouchableOpacity key={r.id}
                    style={[styles.chipBtn, addRouteId === r.id && styles.chipBtnActive]}
                    onPress={() => setAddRouteId(r.id)}>
                    <Text style={[styles.chipBtnTxt, addRouteId === r.id && styles.chipBtnTxtActive]} numberOfLines={1}>
                      {r.destinationStation || r.routeName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Vehicle selector */}
              <Text style={[styles.label, { color: c.textMuted, marginTop: 14 }]}>Vehicle *</Text>
              <View style={styles.vehicleListContainer}>
                {vehicles.filter(v => !queuedVehicleIds.has(v.id)).length === 0 ? (
                  <Text style={[styles.emptyTxt, { color: c.textMuted, textAlign: 'center', paddingVertical: 20 }]}> 
                    No available vehicles (all are already queued)
                  </Text>
                ) : (
                  vehicles.filter(v => !queuedVehicleIds.has(v.id)).map(v => (
                    <TouchableOpacity key={v.id}
                      style={[styles.vehicleOption, { borderColor: c.border },
                        addVehicleId === v.id && { borderColor: c.primary, backgroundColor: c.primary + '10' }]}
                      onPress={() => setAddVehicleId(v.id)}>
                      <View style={[styles.vehicleOptionIcon, { backgroundColor: addVehicleId === v.id ? c.primary + '20' : c.background }]}> 
                        <Ionicons name="car-sport" size={18} color={addVehicleId === v.id ? c.primary : c.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.vehicleOptionReg, { color: c.text }]}>{v.registration || 'Unknown'}</Text>
                        <Text style={[styles.vehicleOptionMeta, { color: c.textMuted }]}> 
                          {[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}{v.capacity ? ` · ${v.capacity} seats` : ''}
                        </Text>
                      </View>
                      {addVehicleId === v.id && <Ionicons name="checkmark-circle" size={22} color={c.primary} />}
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Notes */}
              <Text style={[styles.label, { color: c.textMuted, marginTop: 14 }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={addNotes} onChangeText={setAddNotes}
                placeholder="Optional notes..." placeholderTextColor={c.textMuted}
              />
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.sheetBtn, { borderColor: c.border }]} onPress={() => { setAddModalVisible(false); setAddVehicleId(null); setAddRouteId(null); setAddNotes(''); }}>
                <Text style={[styles.sheetBtnTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnPrimary, { backgroundColor: c.primary }]}
                onPress={handleAddToQueue} disabled={addBusy}>
                {addBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sheetBtnPrimaryTxt}>Add to Queue</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Dispatch Modal ── */}
      <Modal visible={dispatchModalVisible} transparent animationType="slide" onRequestClose={() => setDispatchModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: c.surface }]}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Dispatch Vehicle</Text>
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
              {dispatchEntry && (
                <View style={[styles.dispatchPreview, { borderColor: c.border }]}>
                  <Ionicons name="car-sport" size={24} color={c.primary} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.dispatchReg, { color: c.text }]}>{dispatchEntry.vehicleRegistration}</Text>
                    <Text style={[styles.dispatchMeta, { color: c.textMuted }]}>
                      Position #{dispatchEntry.queuePosition} · {dispatchEntry.driverName || 'No driver'}
                    </Text>
                  </View>
                </View>
              )}
              <Text style={[styles.label, { color: c.textMuted }]}>Passenger Count (optional)</Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={includePassengerList ? String(passengerList.filter(p => p.name.trim() || p.contact.trim()).length) : dispatchPax}
                onChangeText={setDispatchPax}
                keyboardType="numeric" placeholder="e.g. 15" placeholderTextColor={c.textMuted}
                editable={!includePassengerList}
              />

              {/* Passenger List Toggle */}
              <TouchableOpacity 
                style={[styles.toggleRow, { marginTop: 16 }]}
                onPress={() => setIncludePassengerList(!includePassengerList)}>
                <View style={[styles.toggleBox, { borderColor: includePassengerList ? c.primary : c.border, backgroundColor: includePassengerList ? c.primary + '20' : 'transparent' }]}>
                  {includePassengerList && <Ionicons name="checkmark" size={16} color={c.primary} />}
                </View>
                <Text style={[styles.toggleLabel, { color: c.text }]}>Include Passenger List</Text>
              </TouchableOpacity>
              <Text style={[styles.toggleHint, { color: c.textMuted }]}>
                Add passenger names and contact details for this trip
              </Text>

              {/* Passenger List Inputs */}
              {includePassengerList && (
                <View style={styles.passengerListContainer}>
                  <Text style={[styles.passengerListLabel, { color: c.textMuted }]}>
                    Passengers ({passengerList.length})
                  </Text>
                  {passengerList.map((passenger, index) => (
                    <View key={index} style={[styles.passengerRow, { borderColor: c.border }]}>
                      <View style={styles.passengerNumber}>
                        <Text style={[styles.passengerNumberTxt, { color: c.textMuted }]}>#{index + 1}</Text>
                      </View>
                      <View style={styles.passengerInputs}>
                        <TextInput
                          style={[styles.passengerInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                          value={passenger.name}
                          onChangeText={(text) => {
                            const updated = [...passengerList];
                            updated[index].name = text;
                            setPassengerList(updated);
                          }}
                          placeholder="Name (optional)"
                          placeholderTextColor={c.textMuted}
                        />
                        <TextInput
                          style={[styles.passengerInput, { color: c.text, borderColor: c.border, backgroundColor: c.background, marginTop: 8 }]}
                          value={passenger.contact}
                          onChangeText={(text) => {
                            const updated = [...passengerList];
                            updated[index].contact = text;
                            setPassengerList(updated);
                          }}
                          placeholder="Phone/Contact (optional)"
                          placeholderTextColor={c.textMuted}
                          keyboardType="phone-pad"
                        />
                      </View>
                      {passengerList.length > 1 && (
                        <TouchableOpacity
                          style={styles.removePassengerBtn}
                          onPress={() => {
                            const updated = passengerList.filter((_, i) => i !== index);
                            setPassengerList(updated);
                          }}>
                          <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.addPassengerBtn, { borderColor: c.primary }]}
                    onPress={() => setPassengerList([...passengerList, { name: '', contact: '' }])}>
                    <Ionicons name="add-circle-outline" size={18} color={c.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.addPassengerTxt, { color: c.primary }]}>Add Another Passenger</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.sheetBtn, { borderColor: c.border }]}
                onPress={() => { setDispatchModalVisible(false); setDispatchEntry(null); }}>
                <Text style={[styles.sheetBtnTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, { backgroundColor: '#22c55e' }]}
                onPress={handleDispatch} disabled={dispatchBusy}>
                {dispatchBusy ? <ActivityIndicator color="#fff" size="small" /> :
                  <>
                    <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetBtnPrimaryTxt}> Dispatch</Text>
                  </>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatsCard({ icon, label, value, color, trend, styles }) {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.statsContent}>
        <Text style={[styles.statsValue, { color }]}>{value}</Text>
        <Text style={styles.statsLabel}>{label}</Text>
      </View>
      {trend && (
        <View style={styles.statsTrend}>
          <Ionicons
            name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
            size={12}
            color={trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#6b7280'}
          />
        </View>
      )}
    </View>
  );
}

function ModernQueueCard({ entry, isFirst, isLast, c, styles, onDispatch, onRemove, onMoveUp, onMoveDown, onQuickActions }) {
  const posColor = entry.queuePosition === 1 ? '#22c55e' : entry.queuePosition <= 3 ? '#3b82f6' : c.textMuted;

  return (
    <View style={[styles.modernQueueCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.queueCardHeader}>
        <View style={[styles.positionBadge, { backgroundColor: posColor + '20' }]}>
          <Text style={[styles.positionText, { color: posColor }]}>#{entry.queuePosition}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={onQuickActions}>
          <Ionicons name="ellipsis-vertical" size={20} color={c.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.queueCardContent}>
        <View style={[styles.vehicleAvatar, { backgroundColor: c.primary + '20' }]}>
          <Ionicons name="car-sport" size={20} color={c.primary} />
        </View>

        <View style={styles.vehicleInfo}>
          <Text style={[styles.vehicleReg, { color: c.text }]}>{entry.vehicleRegistration || 'Unknown'}</Text>
          <Text style={[styles.vehicleModel, { color: c.textMuted }]}>
            {[entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ')}
          </Text>
          <View style={styles.vehicleMeta}>
            {entry.driverName && (
              <View style={styles.metaItem}>
                <Ionicons name="person" size={12} color={c.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.metaText, { color: c.textMuted }]}>{entry.driverName}</Text>
              </View>
            )}
            {entry.routeName && (
              <View style={styles.metaItem}>
                <Ionicons name="navigate" size={12} color={c.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.metaText, { color: c.textMuted }]}>{entry.routeDestination || entry.routeName}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="time" size={12} color={c.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.metaText, { color: c.textMuted }]}>{entry.joinedAt}</Text>
            </View>
          </View>
        </View>

        {entry.queuePosition === 1 && (
          <TouchableOpacity
            style={[styles.primaryAction, { backgroundColor: '#22c55e' }]}
            onPress={onDispatch}
          >
            <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionText}>Dispatch</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.queueCardFooter, { borderTopColor: c.border }]}>
        <TouchableOpacity
          style={[styles.footerAction, isFirst && styles.footerActionDisabled]}
          onPress={onMoveUp}
          disabled={isFirst}
        >
          <Ionicons name="chevron-up" size={16} color={isFirst ? c.textMuted : c.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerAction} onPress={onRemove}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerAction, isLast && styles.footerActionDisabled]}
          onPress={onMoveDown}
          disabled={isLast}
        >
          <Ionicons name="chevron-down" size={16} color={isLast ? c.textMuted : c.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LegacyQueueCard({ entry, isFirst, isLast, c, onDispatch, onRemove, onMoveUp, onMoveDown }) {
  const posColor = entry.queuePosition === 1 ? '#22c55e' : entry.queuePosition <= 3 ? '#3b82f6' : c.textMuted;
  return (
    <View style={[styles.queueCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Position badge */}
        <View style={[styles.posBadge, { backgroundColor: posColor + '18' }]}>
          <Text style={[styles.posNum, { color: posColor }]}>#{entry.queuePosition}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.queueReg, { color: c.text }]}>{entry.vehicleRegistration || 'Unknown'}</Text>
          <Text style={[styles.queueMeta, { color: c.textMuted }]}>
            {[entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ')}{entry.vehicleCapacity ? ` · ${entry.vehicleCapacity} seats` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
            {entry.driverName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="person" size={10} color={c.textMuted} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, color: c.textMuted }}>{entry.driverName}</Text>
              </View>
            )}
            {entry.routeName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="navigate" size={10} color={c.textMuted} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, color: c.textMuted }}>{entry.routeDestination || entry.routeName}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time" size={10} color={c.textMuted} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, color: c.textMuted }}>{entry.joinedAt}</Text>
            </View>
          </View>
        </View>

        {/* Reorder buttons */}
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity onPress={onMoveUp} disabled={isFirst} style={{ opacity: isFirst ? 0.25 : 1, marginBottom: 6 }}>
            <Ionicons name="chevron-up" size={20} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onMoveDown} disabled={isLast} style={{ opacity: isLast ? 0.25 : 1 }}>
            <Ionicons name="chevron-down" size={20} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action buttons */}
      <View style={[styles.queueActions, { borderTopColor: c.border }]}>
        {entry.queuePosition === 1 && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22c55e15' }]} onPress={onDispatch}>
            <Ionicons name="send" size={14} color="#22c55e" style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnTxt, { color: '#22c55e' }]}>Dispatch</Text>
          </TouchableOpacity>
        )}
        {entry.queuePosition !== 1 && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.primary + '15' }]} onPress={onDispatch}>
            <Ionicons name="send" size={14} color={c.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnTxt, { color: c.primary }]}>Dispatch</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef444415' }]} onPress={onRemove}>
          <Ionicons name="close-circle" size={14} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnTxt, { color: '#ef4444' }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DispatchedCard({ entry, c, styles }) {
  const time = entry.departedAt ? new Date(entry.departedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  return (
    <View style={[styles.queueCard, { backgroundColor: c.surface, borderColor: c.border, opacity: 0.7 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.posBadge, { backgroundColor: '#22c55e18' }]}>
          <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.queueReg, { color: c.text }]}>{entry.vehicleRegistration || 'Unknown'}</Text>
          <Text style={[styles.queueMeta, { color: c.textMuted }]}>
            Departed {time}{entry.passengerCount ? ` · ${entry.passengerCount} pax` : ''}
          </Text>
        </View>
        <View style={[styles.statusTag, { backgroundColor: '#22c55e18' }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#22c55e' }}>GONE</Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(c) {
  const modalWidth = Math.min(screenWidth - 40, 520);

  return StyleSheet.create({
    root: { flex: 1, flexDirection: 'column' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingTxt: { marginTop: 12, fontSize: 14 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    headerSub: { fontSize: 12, marginTop: 1 },
    addBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

    // Route pills
    routeRow: { maxHeight: 48, marginBottom: 8 },
    routePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    routePillActive: { backgroundColor: c.primary, borderColor: c.primary },
    routePillTxt: { fontSize: 12, fontWeight: '700', color: c.text, maxWidth: 120 },
    routePillTxtActive: { color: '#fff' },
    routePillBadge: { backgroundColor: c.border, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    routePillBadgeTxt: { fontSize: 10, fontWeight: '800', color: c.text },

    // Stats
    statsBar: { flexDirection: 'row', paddingVertical: 10, marginHorizontal: 16, borderBottomWidth: 1, marginBottom: 4 },

    // Section label
    sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },

    // Queue card
    queueCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
    posBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    posNum: { fontSize: 15, fontWeight: '900' },
    queueReg: { fontSize: 15, fontWeight: '800' },
    queueMeta: { fontSize: 11, marginTop: 2 },
    queueActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center', paddingVertical: 8, borderRadius: 10 },
    actionBtnTxt: { fontSize: 12, fontWeight: '700' },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
    emptyTxt: { fontSize: 13, marginTop: 4, textAlign: 'center' },

    // Modal
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 12, zIndex: 9999 },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%', width: '100%', maxWidth: 520, alignSelf: 'center', marginHorizontal: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 20 },
    modalCard: { width: '100%', maxWidth: 520, maxHeight: screenHeight * 0.9, alignSelf: 'center', borderRadius: 20, backgroundColor: c.surface, shadowColor: c.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: screenWidth < 400 ? 14 : 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    modalTitle: { fontSize: screenWidth < 400 ? 16 : 18, fontWeight: '900', flexShrink: 1 },
    modalClose: { padding: 8, borderRadius: 12, marginLeft: 8 },
    modalBody: { flexShrink: 1 },
    modalBodyContent: { padding: screenWidth < 400 ? 14 : 20, paddingBottom: 12 },
    modalFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: screenWidth < 400 ? 12 : 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, gap: screenWidth < 400 ? 8 : 12 },
    routeScroll: { marginBottom: 12 },
    routeScrollContent: { paddingRight: 16, gap: 10 },
    vehicleListContainer: { maxHeight: Math.min(220, screenHeight * 0.3) },
    sheetScroll: { flex: 1, marginBottom: 16 },
    sheetScrollContent: { paddingBottom: 20 },
    sheetTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
    input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 14 },
    chipBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: c.border, backgroundColor: c.background },
    chipBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipBtnTxt: { fontSize: 12, fontWeight: '700', color: c.text },
    chipBtnTxtActive: { color: '#fff' },
    vehicleOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 6 },
    vehicleOptionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    vehicleOptionReg: { fontSize: 14, fontWeight: '800' },
    vehicleOptionMeta: { fontSize: 11, marginTop: 1 },
    sheetActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    sheetBtn: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', borderRadius: 12, padding: screenWidth < 400 ? 10 : 14 },
    sheetBtnPrimary: { borderWidth: 0 },
    sheetBtnTxt: { fontSize: screenWidth < 400 ? 12 : 14, fontWeight: '700' },
    sheetBtnPrimaryTxt: { fontSize: screenWidth < 400 ? 12 : 14, fontWeight: '800', color: '#fff' },

    // Dispatch preview
    dispatchPreview: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
    dispatchReg: { fontSize: 16, fontWeight: '900' },
    dispatchMeta: { fontSize: 12, marginTop: 2 },

    // Passenger List
    toggleRow: { flexDirection: 'row', alignItems: 'center' },
    toggleBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    toggleLabel: { fontSize: 14, fontWeight: '700' },
    toggleHint: { fontSize: 11, marginLeft: 32, marginTop: 4, marginBottom: 8 },
    passengerListContainer: { marginTop: 12, marginBottom: 8 },
    passengerListLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
    passengerRow: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
    passengerNumber: { width: 28, alignItems: 'center' },
    passengerNumberTxt: { fontSize: 11, fontWeight: '700' },
    passengerInputs: { flex: 1, marginLeft: 8 },
    passengerInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13 },
    removePassengerBtn: { padding: 4, marginLeft: 4 },
    addPassengerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, marginTop: 4 },
    addPassengerTxt: { fontSize: 13, fontWeight: '700' },

    // New styles for redesigned components
    // Header Styles
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },

    // Stats Styles
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    statsCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 80,
      shadowColor: c.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    statsIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statsContent: {
      alignItems: 'center',
    },
    statsValue: {
      fontSize: 18,
      fontWeight: '800',
    },
    statsLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: c.textMuted,
      marginTop: 2,
    },
    statsTrend: {
      position: 'absolute',
      top: 8,
      right: 8,
    },

    // Tab Navigation
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      height: 56,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: c.primary,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
      marginTop: 4,
    },
    tabLabelActive: {
      color: c.primary,
    },

    // Filter Bar
    filterBar: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      flexDirection: 'row',
    },
    routeFilter: {
      paddingHorizontal: 16,
    },
    routeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    routeChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    routeChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    routeChipTextActive: {
      color: '#fff',
    },
    routeBadge: {
      backgroundColor: c.textMuted,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },

    // Content Area
    content: {
      flex: 1,
      flexDirection: 'column',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },

    // Overview View Styles
    priorityCard: {
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: c.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    priorityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    priorityTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    priorityContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    vehicleIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    priorityInfo: {
      flex: 1,
    },
    priorityReg: {
      fontSize: 18,
      fontWeight: '700',
    },
    priorityMeta: {
      fontSize: 14,
      marginTop: 2,
    },
    priorityTime: {
      fontSize: 12,
      marginTop: 4,
    },
    priorityAction: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    priorityActionText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },

    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 20,
    },
    actionCard: {
      width: (screenWidth - 32 - 12) / 2,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      shadowColor: c.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    actionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    actionLabel: {
      fontSize: 14,
      fontWeight: '600',
    },

    sectionCard: {
      borderRadius: 16,
      padding: 20,
      shadowColor: c.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 16,
    },
    routeOverview: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    routeOverviewLeft: {
      flex: 1,
    },
    routeName: {
      fontSize: 16,
      fontWeight: '600',
    },
    routeStats: {
      fontSize: 14,
      marginTop: 2,
    },
    routeOverviewRight: {
      alignItems: 'flex-end',
    },
    routeStatus: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    routeStatusText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },

    // Queue View Styles
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyAction: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
    },
    emptyActionText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },

    // Modern Queue Card
    modernQueueCard: {
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: c.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    queueCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 8,
    },
    positionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    positionText: {
      fontSize: 12,
      fontWeight: '700',
    },
    moreButton: {
      padding: 4,
    },
    queueCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    vehicleAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    vehicleInfo: {
      flex: 1,
    },
    vehicleReg: {
      fontSize: 16,
      fontWeight: '700',
    },
    vehicleModel: {
      fontSize: 14,
      marginTop: 2,
    },
    vehicleMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 6,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaText: {
      fontSize: 12,
    },
    primaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    primaryActionText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    queueCardFooter: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingVertical: 8,
    },
    footerAction: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    footerActionDisabled: {
      opacity: 0.3,
    },

    // Analytics View
    analyticsCard: {
      borderRadius: 16,
      padding: 20,
      shadowColor: c.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    analyticsTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 4,
    },
    analyticsSubtitle: {
      fontSize: 16,
      marginBottom: 24,
    },
    analyticsPlaceholder: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    placeholderText: {
      fontSize: 16,
      marginTop: 16,
      marginBottom: 8,
    },
    placeholderSubtext: {
      fontSize: 14,
      textAlign: 'center',
    },

    // FAB
    fabContainer: {
      position: 'absolute',
      right: 16,
      bottom: 16,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },

    // Loading & Empty States
    loadingText: {
      fontSize: 16,
      marginTop: 16,
    },
  });
}
