import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Modal, TextInput, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';
import { getQueueByRank, getQueueStats, addToQueue, dispatchVehicle, removeFromQueue } from '../api/queueManagement';
import { fetchTrips, fetchTripsByRank, fetchVehiclesByRankId, fetchTaxiRanks } from '../api/taxiRanks';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';

export default function TripManagementScreen({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  
  const { rank } = route.params || {};
  const [activeTab, setActiveTab] = useState('queues'); // 'queues' or 'trips'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Queue states
  const [queueData, setQueueData] = useState([]);
  const [queueStats, setQueueStats] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all', 'waiting', 'loading', 'dispatched', 'removed'
  
  // Trips states
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripModalVisible, setTripModalVisible] = useState(false);
  
  // Modal states for queue management
  const [addVehicleModalVisible, setAddVehicleModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [estimatedDeparture, setEstimatedDeparture] = useState('');
  const [showETDPicker, setShowETDPicker] = useState(false);

  const formatDateLabel = (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    return d.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Filter queue data by status
  const getFilteredQueueData = () => {
    if (selectedStatusFilter === 'all') {
      return queueData;
    }
    return queueData.filter(item => {
      const normalizedStatus = String(item.status || '').toLowerCase();
      return normalizedStatus === selectedStatusFilter.toLowerCase();
    });
  };

  const filteredQueueData = getFilteredQueueData();

  const loadQueueData = useCallback(async () => {
    if (!rank?.id) return;
    
    try {
      const isToday = selectedDate === new Date().toISOString().split('T')[0];
      const dateParam = isToday ? undefined : selectedDate;
      
      const [queueResp, statsResp, routesResp, vehiclesResp, driversResp] = await Promise.all([
        getQueueByRank(rank.id, dateParam).catch(() => []),
        getQueueStats(rank.id, dateParam).catch(() => null),
        client.get(`/Routes?taxiRankId=${rank.id}`).catch(() => ({ data: [] })),
        fetchVehiclesByRankId(rank.id).catch(() => ({ data: [] })),
        // Try multiple driver endpoints
        Promise.any([
          client.get(`/Drivers?taxiRankId=${rank.id}`).catch(() => ({ data: [] })),
          client.get(`/Drivers?tenantId=${user?.tenantId}`).catch(() => ({ data: [] })),
          client.get('/Drivers').catch(() => ({ data: [] }))
        ]).catch(() => ({ data: [] }))
      ]);
      
      setQueueData(Array.isArray(queueResp) ? queueResp : []);
      setQueueStats(statsResp || { Loading: 0, Dispatched: 0, Removed: 0, Total: 0 });
      
      // Process routes
      const allRoutes = routesResp?.data || routesResp || [];
      const rankName = (rank?.name || '').trim().toLowerCase();
      const rankAddress = (rank?.address || '').trim().toLowerCase();
      const matchRank = (departure, rankStr) => {
        if (!departure || !rankStr) return false;
        return departure.includes(rankStr) || rankStr.includes(departure);
      };

      const filteredRoutes = Array.isArray(allRoutes)
        ? allRoutes.filter(r => {
            if (r?.taxiRankId || r?.rankId) {
              return r.taxiRankId === rank.id || r.rankId === rank.id;
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
      setDrivers(driversResp?.data || driversResp || []);
    } catch (error) {
      setQueueData([]);
      setQueueStats({ Loading: 0, Dispatched: 0, Removed: 0, Total: 0 });
      setRoutes([]);
      setVehicles([]);
      setDrivers([]);
    }
  }, [rank?.id, selectedDate]);

  const loadTripsData = useCallback(async () => {
    if (!rank?.id) return;
    
    try {
      const tripsResp = await fetchTripsByRank(rank.id);
      setTrips(Array.isArray(tripsResp.data) ? tripsResp.data : []);
    } catch (error) {
      setTrips([]);
    }
  }, [rank?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadQueueData(), loadTripsData()]);
    setLoading(false);
  }, [loadQueueData, loadTripsData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadQueueData();
    loadTripsData();
  }, [selectedDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDispatchVehicle = (queueEntry) => {
    // Navigate to QueueManagementScreen with the entry pre-selected for dispatch
    navigation.navigate('QueueManagement', { 
      rank, 
      dispatchEntry: queueEntry,
      openDispatchModal: true 
    });
  };

  const handleAddVehicle = async () => {
    if (!selectedVehicle) { Alert.alert('Select Vehicle', 'Please select a vehicle to add.'); return; }
    try {
      setAddingVehicle(true);
      await addToQueue({
        taxiRankId: rank?.id,
        routeId: selectedRoute?.id || null,
        vehicleId: selectedVehicle.id,
        driverId: selectedVehicle.driverId || null,
        tenantId: user?.tenantId,
        queueDate: selectedDate,
        estimatedDepartureTime: estimatedDeparture ? new Date(`${new Date().toISOString().split('T')[0]}T${estimatedDeparture}`).toISOString() : undefined,
      });
      Alert.alert('Success', `${selectedVehicle.registration || 'Vehicle'} added to queue`);
      setAddVehicleModalVisible(false);
      setSelectedVehicle(null);
      setSelectedRoute(null);
      setEstimatedDeparture('');
      setShowETDPicker(false);
      await loadQueueData();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to add vehicle');
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleRemoveVehicle = async (queueEntry) => {
    Alert.alert(
      'Remove Vehicle',
      `Remove ${queueEntry.vehicle?.registration || 'vehicle'} from the queue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromQueue(queueEntry.id);
              Alert.alert('Success', 'Vehicle removed from queue');
              await loadQueueData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove vehicle');
            }
          }
        }
      ]
    );
  };

  const getDriverName = (item) => {
    if (item.driverName) return item.driverName;
    if (item.driver?.name || item.driver?.Name) return item.driver.name || item.driver.Name;
    if (drivers.length > 0 && item.driverId) {
      const d = drivers.find(d => d.id === item.driverId);
      if (d?.name || d?.Name) return d.name || d.Name;
    }
    return null;
  };

  const getVehicleReg = (item) =>
    item.vehicleRegistration || item.vehicle?.registration || '—';

  const getRouteName = (item) =>
    item.routeName || item.route?.name || null;

  const statusColors = {
    Waiting: '#f59e0b', Loading: '#3b82f6', Dispatched: '#22c55e', Removed: '#ef4444',
    Departed: '#22c55e', InTransit: '#3b82f6', Completed: '#16a34a', Cancelled: '#ef4444',
  };

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={s.loadingTxt}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>  
      {/* ── Header ── */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.hdrTitle}>Trip Management</Text>
          <Text style={s.hdrSub}>{rank?.name || 'Taxi Rank'}</Text>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabs}>
        {['queues', 'trips'].map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, activeTab === t && s.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[s.tabTxt, activeTab === t && s.tabTxtActive]}>
              {t === 'queues' ? `Queues (${queueData.length})` : `Trips (${trips.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Date Selector ── */}
      <View style={s.dateRow}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={s.dateArrow}>
          <Ionicons name="chevron-back" size={18} color="#64748b" />
        </TouchableOpacity>
        <Text style={s.dateTxt}>{formatDateLabel(selectedDate)}</Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={s.dateArrow}>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* ── Inline Filter (queues only) ── */}
      {activeTab === 'queues' && (
        <View style={s.filterRow}>
          {['all','waiting','loading','dispatched','removed'].map(key => {
            const cnt = key === 'all' ? queueData.length : queueData.filter(i => (i.status||'').toLowerCase() === key).length;
            const on = selectedStatusFilter === key;
            return (
              <TouchableOpacity key={key} style={[s.chip, on && s.chipOn]} onPress={() => setSelectedStatusFilter(key)}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{key === 'all' ? 'All' : key.charAt(0).toUpperCase()+key.slice(1)} {cnt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Content ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'queues' ? (
          /* ══════ QUEUES TAB ══════ */
          filteredQueueData.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyCircle}><Ionicons name="car-outline" size={32} color="#cbd5e1" /></View>
              <Text style={s.emptyTitle}>No vehicles in queue</Text>
              <Text style={s.emptySub}>
                {selectedStatusFilter === 'all' ? 'Tap + to add a vehicle' : `No ${selectedStatusFilter} vehicles`}
              </Text>
            </View>
          ) : (
            filteredQueueData.map((item, idx) => {
              const sc = statusColors[item.status] || '#94a3b8';
              const reg = getVehicleReg(item);
              const drvName = getDriverName(item) || 'No Driver';
              const rtName = getRouteName(item);

              return (
                <View key={item.id || idx} style={s.card}>
                  {/* Left accent */}
                  <View style={[s.cardAccent, { backgroundColor: sc }]} />

                  <View style={s.cardBody}>
                    {/* Row 1: reg + status */}
                    <View style={s.cardRow}>
                      <View style={s.cardLeft}>
                        <View style={[s.posBadge, { backgroundColor: sc + '18' }]}>
                          <Text style={[s.posText, { color: sc }]}>#{item.queuePosition}</Text>
                        </View>
                        <Text style={s.regText}>{reg}</Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: sc }]}>
                        <Text style={s.badgeText}>{item.status}</Text>
                      </View>
                    </View>

                    {/* Row 2: driver + route */}
                    <View style={s.cardMeta}>
                      <View style={s.metaItem}>
                        <Ionicons name="person-outline" size={13} color="#64748b" />
                        <Text style={s.metaText}>{drvName}</Text>
                      </View>
                      {rtName ? (
                        <View style={s.metaItem}>
                          <Ionicons name="navigate-outline" size={13} color="#64748b" />
                          <Text style={s.metaText}>{rtName}</Text>
                        </View>
                      ) : null}
                      <View style={s.metaItem}>
                        <Ionicons name="time-outline" size={13} color="#64748b" />
                        <Text style={s.metaText}>{item.joinedAt || '—'}</Text>
                      </View>
                      {item.estimatedDepartureTime ? (
                        <View style={s.metaItem}>
                          <Ionicons name="log-out-outline" size={13} color="#f59e0b" />
                          <Text style={[s.metaText, { color: '#f59e0b' }]}>ETD {new Date(item.estimatedDepartureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Row 3: actions */}
                    {(item.status === 'Waiting' || item.status === 'Loading') && (
                      <View style={s.cardActions}>
                        <TouchableOpacity style={s.btnGo} onPress={() => handleDispatchVehicle(item)}>
                          <Ionicons name="send" size={14} color="#fff" />
                          <Text style={s.btnGoTxt}>Dispatch</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.btnRm} onPress={() => handleRemoveVehicle(item)}>
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                          <Text style={s.btnRmTxt}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )
        ) : (
          /* ══════ TRIPS TAB ══════ */
          trips.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyCircle}><Ionicons name="document-text-outline" size={32} color="#cbd5e1" /></View>
              <Text style={s.emptyTitle}>No trips yet</Text>
              <Text style={s.emptySub}>Completed trips will appear here</Text>
            </View>
          ) : (
            trips.map((trip, idx) => {
              const sc = statusColors[trip.status] || '#94a3b8';
              return (
                <TouchableOpacity
                  key={trip.id || idx}
                  style={s.card}
                  activeOpacity={0.7}
                  onPress={() => { setSelectedTrip(trip); setTripModalVisible(true); }}
                >
                  <View style={[s.cardAccent, { backgroundColor: sc }]} />
                  <View style={s.cardBody}>
                    {/* Row 1: route + status */}
                    <View style={s.cardRow}>
                      <Text style={s.regText} numberOfLines={1}>
                        {trip.departureStation || '—'} → {trip.destinationStation || '—'}
                      </Text>
                      <View style={[s.badge, { backgroundColor: sc }]}>
                        <Text style={s.badgeText}>{trip.status}</Text>
                      </View>
                    </View>

                    {/* Row 2: meta */}
                    <View style={s.cardMeta}>
                      <View style={s.metaItem}>
                        <Ionicons name="car-outline" size={13} color="#64748b" />
                        <Text style={s.metaText}>{trip.vehicle?.registration || '—'}</Text>
                      </View>
                      <View style={s.metaItem}>
                        <Ionicons name="person-outline" size={13} color="#64748b" />
                        <Text style={s.metaText}>{trip.driver?.name || '—'}</Text>
                      </View>
                    </View>

                    {/* Row 3: stats */}
                    <View style={s.tripStats}>
                      <View style={s.tripStat}>
                        <Ionicons name="people-outline" size={13} color="#64748b" />
                        <Text style={s.tripStatTxt}>{trip.passengerCount ?? 0} pax</Text>
                      </View>
                      <View style={s.tripStat}>
                        <Ionicons name="cash-outline" size={13} color="#64748b" />
                        <Text style={s.tripStatTxt}>R{(trip.totalAmount ?? 0).toFixed(2)}</Text>
                      </View>
                      <View style={s.tripStat}>
                        <Ionicons name="time-outline" size={13} color="#64748b" />
                        <Text style={s.tripStatTxt}>
                          {trip.departureTime
                            ? new Date(trip.departureTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )
        )}
      </ScrollView>

      {/* ── FAB: Add Vehicle (queue tab only) ── */}
      {activeTab === 'queues' && (
        <TouchableOpacity
          style={s.fab}
          activeOpacity={0.85}
          onPress={() => { setSelectedVehicle(null); setSelectedRoute(null); setEstimatedDeparture(''); setShowETDPicker(false); setAddVehicleModalVisible(true); }}
        >
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>
      )}

      {/* ── Add Vehicle Modal ── */}
      <Modal visible={addVehicleModalVisible} transparent animationType="slide" onRequestClose={() => setAddVehicleModalVisible(false)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <View style={s.modalHdr}>
              <Text style={s.modalTitle}>Add Vehicle to Queue</Text>
              <TouchableOpacity onPress={() => setAddVehicleModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {/* Route Selection */}
              <Text style={s.fieldLabel}>Route (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pickerRow}>
                <TouchableOpacity
                  style={[s.pickerChip, !selectedRoute && s.pickerChipOn]}
                  onPress={() => setSelectedRoute(null)}
                >
                  <Text style={[s.pickerChipTxt, !selectedRoute && s.pickerChipTxtOn]}>Any Route</Text>
                </TouchableOpacity>
                {routes.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[s.pickerChip, selectedRoute?.id === r.id && s.pickerChipOn]}
                    onPress={() => setSelectedRoute(r)}
                  >
                    <Text style={[s.pickerChipTxt, selectedRoute?.id === r.id && s.pickerChipTxtOn]} numberOfLines={1}>
                      {r.name || r.routeName || `${r.departureStation} → ${r.destinationStation}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Vehicle Selection */}
              <Text style={s.fieldLabel}>Select Vehicle</Text>
              {vehicles.length === 0 ? (
                <Text style={s.noItems}>No vehicles available for this rank</Text>
              ) : (
                vehicles.map(v => {
                  const alreadyQueued = queueData.some(
                    q => q.vehicleId === v.id && (q.status === 'Waiting' || q.status === 'Loading')
                  );
                  const selected = selectedVehicle?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[s.vehicleOption, selected && s.vehicleOptionOn, alreadyQueued && s.vehicleOptionDisabled]}
                      onPress={() => !alreadyQueued && setSelectedVehicle(v)}
                      activeOpacity={alreadyQueued ? 1 : 0.7}
                    >
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={alreadyQueued ? '#cbd5e1' : selected ? GOLD : '#94a3b8'}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[s.vehicleReg, alreadyQueued && { color: '#94a3b8' }]}>
                          {v.registration || v.registrationNumber || '—'}
                        </Text>
                        <Text style={s.vehicleMeta}>
                          {v.make ? `${v.make} ${v.model || ''}` : v.type || 'Vehicle'}
                          {v.capacity ? ` · ${v.capacity} seats` : ''}
                        </Text>
                      </View>
                      {alreadyQueued && (
                        <View style={s.inQueueBadge}><Text style={s.inQueueTxt}>In Queue</Text></View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
              {/* Estimated Departure Time */}
              <Text style={s.fieldLabel}>Est. Departure Time (optional)</Text>
              <TouchableOpacity
                style={[s.vehicleOption, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    const t = window.prompt('Enter estimated departure time (HH:MM)', estimatedDeparture || '');
                    if (t && /^\d{1,2}:\d{2}$/.test(t.trim())) setEstimatedDeparture(t.trim());
                  } else {
                    setShowETDPicker(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time-outline" size={16} color={GOLD} />
                  <Text style={{ color: estimatedDeparture ? '#1e293b' : '#94a3b8', fontSize: 14 }}>
                    {estimatedDeparture || 'Select time'}
                  </Text>
                </View>
                {estimatedDeparture ? (
                  <TouchableOpacity onPress={() => setEstimatedDeparture('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
              {showETDPicker && (
                <DateTimePicker
                  value={estimatedDeparture ? new Date(`2000-01-01T${estimatedDeparture}:00`) : new Date()}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowETDPicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const hh = String(selectedDate.getHours()).padStart(2, '0');
                      const mm = String(selectedDate.getMinutes()).padStart(2, '0');
                      setEstimatedDeparture(`${hh}:${mm}`);
                    }
                  }}
                />
              )}
            </ScrollView>

            {/* Add Button */}
            <View style={s.modalFooter}>
              <TouchableOpacity
                style={[s.addBtn, !selectedVehicle && { opacity: 0.5 }]}
                onPress={handleAddVehicle}
                disabled={!selectedVehicle || addingVehicle}
              >
                {addingVehicle ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={18} color="#000" />
                    <Text style={s.addBtnTxt}>Add to Queue</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Trip Detail Modal ── */}
      <Modal visible={tripModalVisible} transparent animationType="slide" onRequestClose={() => setTripModalVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalHdr}>
              <Text style={s.modalTitle}>Trip Details</Text>
              <TouchableOpacity onPress={() => setTripModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            {selectedTrip && (() => {
              const driverName = selectedTrip.driver?.name || selectedTrip.driver?.Name
                || selectedTrip.driverName || '—';
              const pax = selectedTrip.passengers || [];
              return (
                <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                  {[
                    { icon: 'navigate-outline', label: 'Route', value: `${selectedTrip.departureStation || '—'} → ${selectedTrip.destinationStation || '—'}` },
                    { icon: 'car-outline', label: 'Vehicle', value: selectedTrip.vehicle?.registration || selectedTrip.vehicle?.registrationNumber || '—' },
                    { icon: 'person-outline', label: 'Driver', value: driverName },
                    { icon: 'flag-outline', label: 'Status', value: selectedTrip.status },
                    { icon: 'time-outline', label: 'Departed', value: selectedTrip.departureTime ? new Date(selectedTrip.departureTime).toLocaleString('en-ZA') : '—' },
                    { icon: 'people-outline', label: 'Passengers', value: String(selectedTrip.passengerCount ?? pax.length ?? 0) },
                    { icon: 'cash-outline', label: 'Amount', value: `R${(selectedTrip.totalAmount ?? 0).toFixed(2)}` },
                    ...(selectedTrip.notes ? [{ icon: 'document-text-outline', label: 'Notes', value: selectedTrip.notes }] : []),
                  ].map((row, i) => (
                    <View key={i} style={s.modalRow}>
                      <View style={s.modalRowIcon}>
                        <Ionicons name={row.icon} size={16} color={GOLD} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.modalLabel}>{row.label}</Text>
                        <Text style={s.modalValue}>{row.value}</Text>
                      </View>
                    </View>
                  ))}

                  {/* Passenger List */}
                  <Text style={s.paxHeading}>Passengers ({pax.length})</Text>
                  {pax.length === 0 ? (
                    <Text style={s.paxNone}>No passengers recorded</Text>
                  ) : (
                    pax.map((p, i) => (
                      <View key={p.id || i} style={s.paxCard}>
                        <View style={s.paxCardRow}>
                          <Ionicons name="person" size={14} color={GOLD} />
                          <Text style={s.paxName}>{p.passengerName || 'Passenger'}</Text>
                          <Text style={s.paxAmt}>R{(p.amount ?? 0).toFixed(2)}</Text>
                        </View>
                        <View style={s.paxCardMeta}>
                          {p.passengerPhone ? <Text style={s.paxMeta}>{p.passengerPhone}</Text> : null}
                          <Text style={s.paxMeta}>
                            {p.departureStation || '—'} → {p.arrivalStation || '—'}
                          </Text>
                          <Text style={s.paxMeta}>{p.paymentMethod || 'Cash'}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  // ── Layout ──
  root: { flex: 1, backgroundColor: '#f8fafc' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingTxt: { marginTop: 12, fontSize: 14, color: '#94a3b8' },

  // ── Header ──
  hdr: {
    backgroundColor: '#1a1a2e', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  hdrTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  hdrSub: { color: GOLD, fontSize: 12, marginTop: 2 },

  // ── Tabs ──
  tabs: {
    flexDirection: 'row', backgroundColor: '#1a1a2e',
    paddingHorizontal: 16, paddingBottom: 12, gap: 10,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: { backgroundColor: GOLD },
  tabTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  tabTxtActive: { color: '#000', fontWeight: '700' },

  // ── Date Row ──
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  dateArrow: { padding: 8 },
  dateTxt: { fontSize: 15, fontWeight: '600', color: '#334155', marginHorizontal: 16 },

  // ── Filter Row ──
  filterRow: {
    flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12,
    paddingVertical: 6, gap: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  chip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  chipOn: { backgroundColor: GOLD },
  chipTxt: { fontSize: 11, fontWeight: '500', color: '#64748b' },
  chipTxtOn: { color: '#000', fontWeight: '600' },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollInner: { padding: 16, paddingBottom: 32 },

  // ── Shared Card ──
  card: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },

  // ── Position badge ──
  posBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  posText: { fontSize: 12, fontWeight: '700' },

  // ── Registration ──
  regText: { fontSize: 15, fontWeight: '600', color: '#1e293b', flexShrink: 1 },

  // ── Status badge ──
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // ── Meta rows ──
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#64748b' },

  // ── Queue action buttons ──
  cardActions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  btnGo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#22c55e', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8,
  },
  btnGoTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  btnRm: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#fecaca',
  },
  btnRmTxt: { color: '#ef4444', fontSize: 12, fontWeight: '600' },

  // ── Trip stats row ──
  tripStats: { flexDirection: 'row', marginTop: 10, gap: 16 },
  tripStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripStatTxt: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  // ── Empty state ──
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 40 },

  // ── Modal ──
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 24,
  },
  modalHdr: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalBody: { paddingHorizontal: 16 },
  modalRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  modalRowIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: GOLD_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  modalLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  modalValue: { fontSize: 14, fontWeight: '500', color: '#1e293b' },

  // ── Passenger List (modal) ──
  paxHeading: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginTop: 16, marginBottom: 8 },
  paxNone: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 12 },
  paxCard: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  paxCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paxName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b' },
  paxAmt: { fontSize: 13, fontWeight: '700', color: '#b45309' },
  paxCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, marginLeft: 22 },
  paxMeta: { fontSize: 11, color: '#64748b' },

  // ── FAB ──
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28, backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 6, elevation: 6,
  },

  // ── Add Vehicle Modal extras ──
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 16, marginBottom: 8 },
  noItems: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 12 },
  pickerRow: { flexDirection: 'row', marginBottom: 4 },
  pickerChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: '#f1f5f9', marginRight: 8,
  },
  pickerChipOn: { backgroundColor: GOLD },
  pickerChipTxt: { fontSize: 12, fontWeight: '500', color: '#64748b' },
  pickerChipTxtOn: { color: '#000', fontWeight: '600' },

  vehicleOption: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 12, backgroundColor: '#f8fafc', marginBottom: 8,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  vehicleOptionOn: { borderColor: GOLD, backgroundColor: GOLD_LIGHT },
  vehicleOptionDisabled: { opacity: 0.55 },
  vehicleReg: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  vehicleMeta: { fontSize: 12, color: '#64748b', marginTop: 1 },
  inQueueBadge: {
    backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  inQueueTxt: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },

  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GOLD, paddingVertical: 14, borderRadius: 12,
  },
  addBtnTxt: { fontSize: 15, fontWeight: '700', color: '#000' },
});
