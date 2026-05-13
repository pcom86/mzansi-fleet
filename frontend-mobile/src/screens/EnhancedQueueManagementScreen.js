import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, TextInput, Platform,
  FlatList, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  getQueueOverview, getAvailableVehicles, assignVehicleToQueue,
  priorityDispatch, getQueueAnalytics, formatWaitTime, getStatusColor,
  getUtilizationColor, getWaitTimeColor, calculateQueueMetrics,
  sortQueue, filterQueueByRoute, getNextVehicle,
} from '../api/queueManagement';
import { fetchVehiclesByRankId, fetchTaxiRanks } from '../api/taxiRanks';
import client from '../api/client';

const { width: screenWidth } = Dimensions.get('window');
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export default function EnhancedQueueManagementScreen({ navigation, route: navRoute }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const passedRank = navRoute?.params?.rank;

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rank, setRank] = useState(passedRank || null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('queue'); // queue, assignment, analytics
  
  // Queue data
  const [queueOverview, setQueueOverview] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [routes, setRoutes] = useState([]);
  
  // Vehicle assignment
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  
  // Analytics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('week'); // day, week, month
  
  // Modals
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [priorityModalVisible, setPriorityModalVisible] = useState(false);
  
  // Form states
  const [assignRouteId, setAssignRouteId] = useState(null);
  const [assignNotes, setAssignNotes] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [dispatchEntry, setDispatchEntry] = useState(null);
  const [dispatchPax, setDispatchPax] = useState('');
  const [dispatchPriority, setDispatchPriority] = useState('Normal');
  const [dispatchReason, setDispatchReason] = useState('');
  const [dispatchBusy, setDispatchBusy] = useState(false);

  // Load data based on active tab
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

      const dateString = selectedDate.toISOString().split('T')[0];

      if (activeTab === 'queue') {
        // Load queue overview
        const overviewData = await getQueueOverview(activeRank.id, dateString);
        setQueueOverview(overviewData);
        setQueue(overviewData.routeQueues?.flatMap(rq => 
          // Flatten route queues into individual queue items for display
          [] // This would need to be implemented based on the actual data structure
        ) || []);
        setStats(overviewData.totalStats);
        setRoutes(overviewData.routeQueues || []);
      } else if (activeTab === 'assignment') {
        // Load available vehicles
        const vehiclesData = await getAvailableVehicles(activeRank.id);
        setAvailableVehicles(vehiclesData);
      } else if (activeTab === 'analytics') {
        // Load analytics
        const startDate = getAnalyticsStartDate();
        const endDate = selectedDate.toISOString().split('T')[0];
        const analyticsData = await getQueueAnalytics(activeRank.id, startDate, endDate);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.warn('Queue load error', err?.message);
      if (!silent) Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rank, user, activeTab, selectedDate, analyticsPeriod]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // Get analytics start date based on period
  const getAnalyticsStartDate = () => {
    const now = new Date(selectedDate);
    switch (analyticsPeriod) {
      case 'day':
        return now.toISOString().split('T')[0];
      case 'week':
        now.setDate(now.getDate() - 7);
        return now.toISOString().split('T')[0];
      case 'month':
        now.setMonth(now.getMonth() - 1);
        return now.toISOString().split('T')[0];
      default:
        now.setDate(now.getDate() - 7);
        return now.toISOString().split('T')[0];
    }
  };

  // Filter queue by selected route
  const filteredQueue = useMemo(() => {
    if (!selectedRouteId || !queueOverview) return queue;
    const routeQueue = queueOverview.routeQueues?.find(rq => rq.routeId === selectedRouteId);
    return routeQueue ? [routeQueue] : [];
  }, [queue, queueOverview, selectedRouteId]);

  // Handle vehicle assignment
  const handleAssignVehicles = async () => {
    if (selectedVehicles.length === 0) {
      Alert.alert('Required', 'Please select at least one vehicle');
      return;
    }

    if (!assignRouteId) { Alert.alert('Required', 'Please select a route to assign the vehicle to.'); setAssignBusy(false); return; }
    setAssignBusy(true);
    try {
      if (selectedVehicles.length === 1) {
        // Single assignment
        await assignVehicleToQueue({
          taxiRankId: rank.id,
          routeId: assignRouteId,
          vehicleId: selectedVehicles[0],
          driverId: null, // Will be assigned automatically or can be enhanced
          tenantId: user?.tenantId,
          notes: assignNotes,
        });
      } else {
        // Bulk assignment
        const assignments = selectedVehicles.map(vehicleId => ({
          taxiRankId: rank.id,
          routeId: assignRouteId,
          vehicleId,
          driverId: null,
          tenantId: user?.tenantId,
          notes: assignNotes,
        }));
        
        // This would need to be implemented in the API
        // await bulkAssignVehicles(rank.id, assignments);
      }

      setAssignModalVisible(false);
      setSelectedVehicles([]);
      setAssignRouteId(null);
      setAssignNotes('');
      loadData(true);
      Alert.alert('Success', 'Vehicle(s) assigned successfully');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to assign vehicle(s)');
    } finally {
      setAssignBusy(false);
    }
  };

  // Handle priority dispatch
  const handlePriorityDispatch = async () => {
    if (!dispatchEntry) return;

    setDispatchBusy(true);
    try {
      await priorityDispatch(dispatchEntry.id, {
        dispatchedByUserId: user?.userId || user?.id,
        passengerCount: dispatchPax ? parseInt(dispatchPax, 10) : undefined,
        priority: dispatchPriority,
        reason: dispatchReason,
      });

      setPriorityModalVisible(false);
      setDispatchEntry(null);
      setDispatchPax('');
      setDispatchPriority('Normal');
      setDispatchReason('');
      loadData(true);
      Alert.alert('Success', 'Vehicle dispatched with priority');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to dispatch vehicle');
    } finally {
      setDispatchBusy(false);
    }
  };

  // Toggle vehicle selection
  const toggleVehicleSelection = (vehicleId) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  // Render tab bar
  const renderTabBar = () => (
    <View style={[styles.tabBar, { borderColor: c.border }]}>
      {[
        { key: 'queue', label: 'Queue', icon: 'list-outline' },
        { key: 'assignment', label: 'Assign', icon: 'car-outline' },
        { key: 'analytics', label: 'Analytics', icon: 'analytics-outline' },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabItem,
            activeTab === tab.key && { backgroundColor: c.primary + '20' }
          ]}
          onPress={() => setActiveTab(tab.key)}>
          <Ionicons 
            name={tab.icon} 
            size={20} 
            color={activeTab === tab.key ? c.primary : c.textMuted} 
          />
          <Text style={[
            styles.tabText,
            activeTab === tab.key && { color: c.primary }
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render queue tab content
  const renderQueueTab = () => {
    if (!queueOverview) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={56} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No Queue Data</Text>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Try refreshing or check your connection
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.queueContainer}>
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="hourglass-outline"
            label="Waiting"
            value={queueOverview.totalStats?.waiting || 0}
            color="#f59e0b"
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Dispatched"
            value={queueOverview.totalStats?.dispatched || 0}
            color="#22c55e"
          />
          <StatCard
            icon="people-outline"
            label="Passengers"
            value={queueOverview.totalStats?.totalPassengers || 0}
            color="#3b82f6"
          />
          <StatCard
            icon="time-outline"
            label="Avg Wait"
            value={`${Math.round(queueOverview.totalStats?.averageWaitMinutes || 0)}m`}
            color="#8b5cf6"
          />
        </View>

        {/* Route Queues */}
        <ScrollView style={styles.routeQueuesContainer}>
          {queueOverview.routeQueues?.map(routeQueue => (
            <RouteQueueCard
              key={routeQueue.routeId || 'general'}
              routeQueue={routeQueue}
              c={c}
              styles={styles}
              onDispatch={(entry) => {
                setDispatchEntry(entry);
                setPriorityModalVisible(true);
              }}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render assignment tab content
  const renderAssignmentTab = () => (
    <View style={styles.assignmentContainer}>
      <View style={styles.assignmentHeader}>
        <Text style={[styles.assignmentTitle, { color: c.text }]}>
          Available Vehicles
        </Text>
        <TouchableOpacity
          style={[styles.selectAllBtn, { borderColor: c.primary }]}
          onPress={() => {
            if (selectedVehicles.length === availableVehicles.length) {
              setSelectedVehicles([]);
            } else {
              setSelectedVehicles(availableVehicles.map(v => v.vehicleId));
            }
          }}>
          <Text style={[styles.selectAllBtnText, { color: c.primary }]}>
            {selectedVehicles.length === availableVehicles.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.vehiclesList}>
        {availableVehicles.map(vehicle => (
          <VehicleCard
            key={vehicle.vehicleId}
            vehicle={vehicle}
            isSelected={selectedVehicles.includes(vehicle.vehicleId)}
            onSelect={() => toggleVehicleSelection(vehicle.vehicleId)}
            c={c}
            styles={styles}
          />
        ))}
      </ScrollView>

      {selectedVehicles.length > 0 && (
        <View style={[styles.assignmentFooter, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <Text style={[styles.selectedCount, { color: c.text }]}>
            {selectedVehicles.length} vehicle(s) selected
          </Text>
          <TouchableOpacity
            style={[styles.assignNowBtn, { backgroundColor: c.primary }]}
            onPress={() => setAssignModalVisible(true)}>
            <Text style={styles.assignNowBtnText}>Assign to Queue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render analytics tab content
  const renderAnalyticsTab = () => {
    if (!analytics) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={56} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No Analytics Data</Text>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Select a different period or check back later
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.analyticsContainer}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {[
            { key: 'day', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
          ].map(period => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodBtn,
                analyticsPeriod === period.key && { backgroundColor: c.primary }
              ]}
              onPress={() => setAnalyticsPeriod(period.key)}>
              <Text style={[
                styles.periodBtnText,
                analyticsPeriod === period.key && { color: '#fff' }
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.analyticsStatsGrid}>
          <StatCard
            icon="directions-car"
            label="Total Processed"
            value={analytics.totalVehiclesProcessed}
            color="#22c55e"
          />
          <StatCard
            icon="people"
            label="Avg Queue Length"
            value={analytics.averageQueueLength?.toFixed(1) || '0'}
            color="#3b82f6"
          />
          <StatCard
            icon="schedule"
            label="Avg Wait Time"
            value={`${Math.round(analytics.averageWaitTime || 0)}m`}
            color="#f59e0b"
          />
        </View>

        {/* Peak Hours */}
        <AnalyticsCard title="Peak Hours" c={c} styles={styles}>
          {analytics.peakHours?.slice(0, 3).map((hour, index) => (
            <View key={hour.hour} style={[styles.peakHourItem, { borderBottomColor: c.border }]}>
              <Text style={[styles.peakHourTime, { color: c.text }]}>
                {hour.hour}:00
              </Text>
              <Text style={[styles.peakHourCount, { color: c.textMuted }]}>
                {hour.dispatchCount} dispatches
              </Text>
              <Text style={[styles.peakHourWait, { color: getWaitTimeColor(hour.averageWaitTime) }]}>
                {Math.round(hour.averageWaitTime)}m avg
              </Text>
            </View>
          ))}
        </AnalyticsCard>

        {/* Route Performance */}
        <AnalyticsCard title="Route Performance" c={c} styles={styles}>
          {analytics.routePerformance?.slice(0, 3).map((route, index) => (
            <View key={route.routeId || index} style={[styles.routePerfItem, { borderBottomColor: c.border }]}>
              <View style={styles.routePerfHeader}>
                <Text style={[styles.routePerfName, { color: c.text }]}>
                  {route.routeName || 'Unknown Route'}
                </Text>
                <Text style={[styles.routePerfUtil, { color: getUtilizationColor(route.utilizationRate) }]}>
                  {route.utilizationRate?.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.routePerfBar}>
                <View 
                  style={[
                    styles.routePerfFill,
                    { 
                      width: `${Math.min(route.utilizationRate || 0, 100)}%`,
                      backgroundColor: getUtilizationColor(route.utilizationRate)
                    }
                  ]}
                />
              </View>
              <Text style={[styles.routePerfDetails, { color: c.textMuted }]}>
                {route.totalDispatches} dispatches • {Math.round(route.averageWaitTime)}m avg wait
              </Text>
            </View>
          ))}
        </AnalyticsCard>
      </ScrollView>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading queue management…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Queue Management</Text>
          <Text style={[styles.headerSub, { color: c.textMuted }]}>
            {rank?.name || 'Loading...'}
          </Text>
        </View>
        <TouchableOpacity style={styles.dateBtn} onPress={() => {
          // Date picker implementation would go here
          Alert.alert('Date Selection', 'Date picker to be implemented');
        }}>
          <Ionicons name="calendar-outline" size={20} color={c.primary} />
          <Text style={[styles.dateBtnText, { color: c.primary }]}>
            {selectedDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'queue' && renderQueueTab()}
        {activeTab === 'assignment' && renderAssignmentTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </View>

      {/* Assignment Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Assign to Queue</Text>
            
            <Text style={[styles.label, { color: c.textMuted }]}>Route (required)</Text>
            <ScrollView horizontal style={styles.routeSelector}>
              {routes.map(route => (
                <TouchableOpacity
                  key={route.routeId}
                  style={[styles.routeChip, assignRouteId === route.routeId && styles.routeChipActive]}
                  onPress={() => setAssignRouteId(route.routeId)}>
                  <Text style={[styles.routeChipText, assignRouteId === route.routeId && styles.routeChipTextActive]}>
                    {route.routeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: c.textMuted }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
              value={assignNotes}
              onChangeText={setAssignNotes}
              placeholder="Add notes..."
              placeholderTextColor={c.textMuted}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: c.border }]}
                onPress={() => setAssignModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: c.primary }]}
                onPress={handleAssignVehicles}
                disabled={assignBusy}>
                {assignBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Assign {selectedVehicles.length} Vehicle(s)</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Priority Dispatch Modal */}
      <Modal visible={priorityModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Priority Dispatch</Text>
            
            {dispatchEntry && (
              <View style={[styles.dispatchPreview, { borderColor: c.border }]}>
                <Ionicons name="car-sport" size={24} color={c.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.dispatchReg, { color: c.text }]}>
                    {dispatchEntry.vehicleRegistration}
                  </Text>
                  <Text style={[styles.dispatchMeta, { color: c.textMuted }]}>
                    Position #{dispatchEntry.queuePosition}
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.label, { color: c.textMuted }]}>Passenger Count</Text>
            <TextInput
              style={[styles.textInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
              value={dispatchPax}
              onChangeText={setDispatchPax}
              keyboardType="numeric"
              placeholder="e.g. 15"
              placeholderTextColor={c.textMuted}
            />

            <Text style={[styles.label, { color: c.textMuted }]}>Priority Level</Text>
            <View style={styles.prioritySelector}>
              {['Normal', 'High', 'Urgent'].map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityChip,
                    dispatchPriority === priority && styles.priorityChipActive
                  ]}
                  onPress={() => setDispatchPriority(priority)}>
                  <Text style={[
                    styles.priorityChipText,
                    dispatchPriority === priority && styles.priorityChipTextActive
                  ]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: c.textMuted }]}>Reason (optional)</Text>
            <TextInput
              style={[styles.textInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
              value={dispatchReason}
              onChangeText={setDispatchReason}
              placeholder="Reason for priority dispatch..."
              placeholderTextColor={c.textMuted}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: c.border }]}
                onPress={() => setPriorityModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: '#ef4444' }]}
                onPress={handlePriorityDispatch}
                disabled={dispatchBusy}>
                {dispatchBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Priority Dispatch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RouteQueueCard({ routeQueue, c, styles, onDispatch }) {
  const nextVehicle = routeQueue.nextVehicle;
  
  return (
    <View style={[styles.routeQueueCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.routeQueueHeader}>
        <Text style={[styles.routeQueueName, { color: c.text }]}>
          {routeQueue.routeName || 'General Queue'}
        </Text>
        <Text style={[styles.routeQueueStats, { color: c.textMuted }]}>
          {routeQueue.waitingVehicles} waiting • {routeQueue.dispatchedVehicles} dispatched
        </Text>
      </View>
      
      {nextVehicle && (
        <View style={styles.nextVehicleSection}>
          <Text style={[styles.nextVehicleLabel, { color: c.textMuted }]}>Next Vehicle:</Text>
          <View style={[styles.nextVehicleCard, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={styles.nextVehicleInfo}>
              <Text style={[styles.nextVehicleReg, { color: c.text }]}>
                {nextVehicle.vehicleRegistration}
              </Text>
              <Text style={[styles.nextVehicleDriver, { color: c.textMuted }]}>
                {nextVehicle.driverName}
              </Text>
              <Text style={[styles.nextVehicleCapacity, { color: c.textMuted }]}>
                Capacity: {nextVehicle.passengerCapacity}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.dispatchBtn, { backgroundColor: '#22c55e' }]}
              onPress={() => onDispatch(nextVehicle)}>
              <Ionicons name="send" size={16} color="#fff" />
              <Text style={styles.dispatchBtnText}>Dispatch</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <View style={styles.routeQueueMetrics}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: c.textMuted }]}>Avg Wait:</Text>
          <Text style={[styles.metricValue, { color: getWaitTimeColor(routeQueue.averageWaitTime) }]}>
            {Math.round(routeQueue.averageWaitTime)}m
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: c.textMuted }]}>Total:</Text>
          <Text style={[styles.metricValue, { color: c.text }]}>
            {routeQueue.totalVehicles}
          </Text>
        </View>
      </View>
    </View>
  );
}

function VehicleCard({ vehicle, isSelected, onSelect, c, styles }) {
  return (
    <TouchableOpacity
      style={[
        styles.vehicleCard,
        { backgroundColor: c.surface, borderColor: c.border },
        isSelected && { borderColor: c.primary, backgroundColor: c.primary + '10' }
      ]}
      onPress={onSelect}>
      <View style={styles.vehicleCardHeader}>
        <View style={[styles.vehicleIcon, { backgroundColor: isSelected ? c.primary + '20' : c.background }]}>
          <Ionicons name="car-sport" size={20} color={isSelected ? c.primary : c.textMuted} />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={[styles.vehicleReg, { color: c.text }]}>{vehicle.registration}</Text>
          <Text style={[styles.vehicleMeta, { color: c.textMuted }]}>
            {vehicle.make} {vehicle.model} • {vehicle.capacity} seats
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={c.primary} />
        )}
      </View>
      <View style={styles.vehicleStatus}>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(vehicle.currentStatus) }
        ]}>
          <Text style={styles.statusBadgeText}>
            {vehicle.currentStatus}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AnalyticsCard({ title, children, c, styles }) {
  return (
    <View style={[styles.analyticsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.analyticsCardTitle, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    headerSub: { fontSize: 12, marginTop: 1 },
    dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateBtnText: { fontSize: 12, fontWeight: '600' },

    // Tab Bar
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 16 },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
    tabText: { fontSize: 12, fontWeight: '700' },

    // Tab Content
    tabContent: { flex: 1 },

    // Queue Tab
    queueContainer: { flex: 1 },
    statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
    statCard: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border },
    statValue: { fontSize: 20, fontWeight: '900', marginTop: 8, color: c.text },
    statLabel: { fontSize: 10, fontWeight: '600', marginTop: 4, color: c.textMuted },

    routeQueuesContainer: { flex: 1, paddingHorizontal: 16 },
    routeQueueCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
    routeQueueHeader: { marginBottom: 12 },
    routeQueueName: { fontSize: 16, fontWeight: '800' },
    routeQueueStats: { fontSize: 12, marginTop: 2 },

    nextVehicleSection: { marginBottom: 12 },
    nextVehicleLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
    nextVehicleCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
    nextVehicleInfo: { flex: 1 },
    nextVehicleReg: { fontSize: 14, fontWeight: '800' },
    nextVehicleDriver: { fontSize: 12, marginTop: 2 },
    nextVehicleCapacity: { fontSize: 12, marginTop: 2 },
    dispatchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    dispatchBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    routeQueueMetrics: { flexDirection: 'row', gap: 24 },
    metricItem: { alignItems: 'center' },
    metricLabel: { fontSize: 10, fontWeight: '600' },
    metricValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },

    // Assignment Tab
    assignmentContainer: { flex: 1 },
    assignmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    assignmentTitle: { fontSize: 18, fontWeight: '900' },
    selectAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    selectAllBtnText: { fontSize: 12, fontWeight: '600' },

    vehiclesList: { flex: 1, paddingHorizontal: 16 },
    vehicleCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
    vehicleCardHeader: { flexDirection: 'row', alignItems: 'center' },
    vehicleIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    vehicleInfo: { flex: 1 },
    vehicleReg: { fontSize: 14, fontWeight: '800' },
    vehicleMeta: { fontSize: 12, marginTop: 2 },
    vehicleStatus: { marginTop: 8, alignItems: 'flex-start' },
    vehicleStatusText: { fontSize: 10, fontWeight: '600' },
    
    // Status Badge Styling
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
    },

    assignmentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1 },
    selectedCount: { fontSize: 14, fontWeight: '600' },
    assignNowBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    assignNowBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    // Analytics Tab
    analyticsContainer: { flex: 1, padding: 16 },
    periodSelector: { flexDirection: 'row', marginBottom: 16, gap: 8 },
    periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    periodBtnText: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: c.text },

    analyticsStatsGrid: { flexDirection: 'row', marginBottom: 16, gap: 12 },
    analyticsCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
    analyticsCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },

    peakHourItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    peakHourTime: { fontSize: 14, fontWeight: '600' },
    peakHourCount: { fontSize: 12, color: c.textMuted },
    peakHourWait: { fontSize: 12, fontWeight: '600' },

    routePerfItem: { paddingBottom: 12, borderBottomWidth: 1 },
    routePerfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    routePerfName: { fontSize: 14, fontWeight: '600' },
    routePerfUtil: { fontSize: 12, fontWeight: '600' },
    routePerfBar: { height: 4, backgroundColor: c.background, borderRadius: 2, marginBottom: 8 },
    routePerfFill: { height: '100%', borderRadius: 2 },
    routePerfDetails: { fontSize: 11 },

    // Empty State
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
    emptyText: { fontSize: 13, marginTop: 4, textAlign: 'center' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
    textInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 },

    routeSelector: { marginBottom: 16 },
    routeChip: { 
      paddingHorizontal: 14, 
      paddingVertical: 7, 
      borderRadius: 20, 
      borderWidth: 1, 
      borderColor: c.border, 
      marginRight: 8,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    routeChipText: { 
      fontSize: 12, 
      fontWeight: '700', 
      color: c.text,
      textAlign: 'center',
    },
    routeChipTextActive: { color: '#fff' },

    dispatchPreview: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    dispatchReg: { fontSize: 14, fontWeight: '800' },
    dispatchMeta: { fontSize: 12, marginTop: 2 },

    prioritySelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    priorityChip: { 
      paddingHorizontal: 14, 
      paddingVertical: 7, 
      borderRadius: 20, 
      borderWidth: 1, 
      borderColor: c.border,
      minWidth: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    priorityChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    priorityChipText: { 
      fontSize: 12, 
      fontWeight: '700', 
      color: c.text,
      textAlign: 'center',
    },
    priorityChipTextActive: { color: '#fff' },

    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    modalBtnText: { fontSize: 14, fontWeight: '600' },
    modalBtnPrimary: { borderWidth: 0 },
    modalBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  });
}
