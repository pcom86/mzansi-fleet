import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { fetchAdminByUserId, fetchSchedules, createSchedule, updateSchedule, deleteSchedule, assignVehicleToRoute, unassignVehicleFromRoute } from '../api/taxiRanks';
import { fetchVehiclesByTenant } from '../api/vehicles';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TaxiRankRoutesScreen({ route: navRoute, navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const rank = navRoute?.params?.rank;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [routeName, setRouteName] = useState('');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [fare, setFare] = useState('');
  const [duration, setDuration] = useState('');
  const [maxPassengers, setMaxPassengers] = useState('');
  const [notes, setNotes] = useState('');

  // Stops state: [{id, stopName, fareFromOrigin, estimatedMinutes}]
  const [stops, setStops] = useState([]);

  const loadData = useCallback(async (silent = false) => {
    if (!user?.userId && !user?.id) return;
    if (!silent) setLoading(true);
    try {
      // Check if user is Rank Admin or Rank Manager (both have same permissions)
      const isAdmin = user?.role === 'TaxiRankAdmin';
      const isManager = user?.role === 'TaxiRankManager';
      const hasPermission = isAdmin || isManager;
      
      if (hasPermission) {
        // For admins, fetch admin profile
        const adminResp = await fetchAdminByUserId(user.userId || user.id);
        const admin = adminResp.data || adminResp;
        
        // If admin profile doesn't exist but user has admin/manager role, create a mock profile
        if (!admin && (user?.role === 'TaxiRankAdmin' || user?.role === 'TaxiRankManager')) {
          console.warn('Admin/Manager profile not found, creating mock profile for user with admin/manager role');
          const mockAdminProfile = {
            id: user.id,
            userId: user.userId || user.id,
            tenantId: user.tenantId,
            role: user.role,
            fullName: user.fullName || 'Admin User',
            email: user.email,
            taxiRankId: null,
            adminCode: user?.role === 'TaxiRankAdmin' ? 'ADMIN' : 'MANAGER',
            status: 'Active'
          };
          setAdminProfile(mockAdminProfile);
          
          // Load schedules for mock admin
          const schedResp = await fetchSchedules(user.userId || user.id);
          setRoutes(Array.isArray(schedResp) ? schedResp : (schedResp?.data || []));
            // Load vehicles for the taxi rank
            try {
              const vehResp = await fetchVehiclesByTenant(mockAdminProfile.tenantId);
              setVehicles(vehResp || []);
            } catch (vehicleErr) {
              console.error('Failed to load vehicles:', vehicleErr?.message, vehicleErr?.response?.data);
              setVehicles([]);
            }
        } else {
          setAdminProfile(admin);

          if (admin?.id) {
            const schedResp = await fetchSchedules(user.userId || user.id);
            setRoutes(Array.isArray(schedResp) ? schedResp : (schedResp?.data || []));
            // Load vehicles for the taxi rank
            try {
              const vehResp = await fetchVehiclesByTenant(admin.tenantId);
              setVehicles(vehResp || []);
            } catch (vehicleErr) {
              console.error('Failed to load vehicles:', vehicleErr?.message, vehicleErr?.response?.data);
              setVehicles([]);
            }
          } else {
            console.warn('No tenantId found for admin:', admin);
          }
        }
      } else if (isManager && user?.tenantId) {
        // For managers, create a mock admin profile with tenant info
        const mockAdminProfile = {
          id: user.id,
          tenantId: user.tenantId,
          role: user.role,
          userId: user.userId || user.id
        };
        setAdminProfile(mockAdminProfile);

        // Load routes for the tenant
        try {
          const schedResp = await fetchSchedules(user.tenantId);
          setRoutes(Array.isArray(schedResp) ? schedResp : (schedResp?.data || []));
        } catch (routeErr) {
          console.warn('Failed to load routes for manager:', routeErr?.message);
          setRoutes([]);
        }

        // Load vehicles for the tenant
        try {
          const vehiclesResp = await fetchVehiclesByTenant(user.tenantId);
          const vehiclesList = vehiclesResp.data || vehiclesResp || [];
          setVehicles(vehiclesList);
        } catch (vehicleErr) {
          console.error('Failed to load vehicles for manager:', vehicleErr?.message);
          setVehicles([]);
        }
      } else {
        console.warn('User does not have permission to manage routes. Role:', user?.role);
        setAdminProfile(null);
      }
    } catch (err) {
      console.warn('Routes load error', err?.response?.data?.message || err?.message);
      if (!silent) {
        // If admin profile not found, still allow viewing the screen
        if (err?.response?.status === 404) {
          setAdminProfile(null);
          setRoutes([]);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(true); };

  function resetForm() {
    setRouteName(''); setDeparture(''); setDestination('');
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setFare(''); setDuration(''); setMaxPassengers(''); setNotes('');
    setStops([]);
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    if (rank?.name) {
      setDeparture(rank.name);
    }
    setModalVisible(true);
  }

  function openEdit(r) {
    setEditing(r);
    setRouteName(r.routeName || '');
    setDeparture(r.departureStation || '');
    setDestination(r.destinationStation || '');
    setSelectedDays(r.daysOfWeek ? r.daysOfWeek.split(',') : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setFare(String(r.standardFare || ''));
    setDuration(r.expectedDurationMinutes ? String(r.expectedDurationMinutes) : '');
    setMaxPassengers(r.maxPassengers ? String(r.maxPassengers) : '');
    setNotes(r.notes || '');
    // Load existing stops
    const existingStops = (r.stops || []).sort((a, b) => a.stopOrder - b.stopOrder).map(s => ({
      id: s.id || String(Math.random()),
      stopName: s.stopName || '',
      fareFromOrigin: String(s.fareFromOrigin || ''),
    }));
    setStops(existingStops);
    setModalVisible(true);
  }

  // Stop helpers
  function addStop() {
    setStops(prev => [...prev, { id: String(Date.now()), stopName: '', fareFromOrigin: '' }]);
  }

  function removeStop(id) {
    setStops(prev => prev.filter(s => s.id !== id));
  }

  function updateStop(id, field, value) {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  function toggleDay(day) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }


  async function handleSave() {
    if (!routeName.trim()) return Alert.alert('Validation', 'Route name is required');
    if (!departure.trim()) return Alert.alert('Validation', 'Departure station is required');
    if (!destination.trim()) return Alert.alert('Validation', 'Destination station is required');
    if (!fare.trim() || isNaN(Number(fare))) return Alert.alert('Validation', 'Valid fare is required');
    if (selectedDays.length === 0) return Alert.alert('Validation', 'Select at least one day');
    if (!adminProfile?.id) return Alert.alert('Error', 'User profile not found. Only rank admins and managers can manage routes.');

    // Validate stops
    for (const s of stops) {
      if (!s.stopName.trim()) return Alert.alert('Validation', 'Each stop must have a name');
      if (!s.fareFromOrigin || isNaN(Number(s.fareFromOrigin))) return Alert.alert('Validation', `Stop "${s.stopName}" needs a valid fare`);
    }

    const body = {
      routeName: routeName.trim(),
      departureStation: departure.trim(),
      destinationStation: destination.trim(),
      departureTime: '00:00:00',
      frequencyMinutes: 0,
      daysOfWeek: selectedDays.join(','),
      standardFare: parseFloat(fare),
      expectedDurationMinutes: duration ? parseInt(duration, 10) : null,
      maxPassengers: maxPassengers ? parseInt(maxPassengers, 10) : null,
      notes: notes.trim() || null,
      stops: stops.map((s, i) => ({
        stopName: s.stopName.trim(),
        stopOrder: i + 1,
        fareFromOrigin: parseFloat(s.fareFromOrigin),
      })),
    };

    setSaving(true);
    try {
      // Check if we're using a mock admin profile (no real admin profile exists)
      if (adminProfile.id === user.id && adminProfile.adminCode === 'ADMIN') {
        Alert.alert('Cannot Save', 'Cannot create or edit routes when using a temporary admin profile. Please contact your system administrator to create a proper admin profile.');
        setSaving(false);
        return;
      }
      
      if (editing) {
        await updateSchedule(adminProfile.id, editing.id, body);
        Alert.alert('Success', 'Route updated');
      } else {
        await createSchedule(adminProfile.id, body);
        Alert.alert('Success', 'Route created');
      }
      setModalVisible(false);
      resetForm();
      loadData(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r) {
    if (!adminProfile?.id) {
      return;
    }
    
    // Check if we're using a mock admin profile (no real admin profile exists)
    const isMockProfile = adminProfile.id === user.id && adminProfile.adminCode === 'ADMIN';
    
    if (isMockProfile) {
      Alert.alert('Cannot Delete', 'Cannot delete routes when using a temporary admin profile. Please contact your system administrator to create a proper admin profile.');
      return;
    }
    
    // Check if route has active vehicles assigned
    const assignedVehicles = r.routeVehicles?.filter(rv => rv.isActive !== false) || [];
    
    if (assignedVehicles.length > 0) {
      const vehicleNames = assignedVehicles
        .map(rv => rv.vehicle?.registration || rv.vehicle?.registrationNumber || 'Unknown Vehicle')
        .join(', ');
      
      Alert.alert(
        'Cannot Delete Route', 
        `This route has ${assignedVehicles.length} vehicle(s) assigned: ${vehicleNames}. Please unassign all vehicles before deleting this route.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    setRouteToDelete(r);
    setDeleteModalVisible(true);
  }

  function openVehicleModal(route) {
    setSelectedRoute(route);
    setVehicleModalVisible(true);
  }

  async function confirmDelete() {
    if (!routeToDelete || !adminProfile?.id) return;
    
    try {
      await deleteSchedule(adminProfile.id, routeToDelete.id);
      setDeleteModalVisible(false);
      setRouteToDelete(null);
      Alert.alert('Success', 'Route deleted successfully');
      loadData(true);
    } catch (err) {
      console.error('Delete error:', err);
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Delete failed');
      setDeleteModalVisible(false);
      setRouteToDelete(null);
    }
  }

  function cancelDelete() {
    setDeleteModalVisible(false);
    setRouteToDelete(null);
  }

  async function handleAssignVehicle(vehicleId) {
    if (!adminProfile?.id || !selectedRoute?.id) {
      return;
    }
    
    // Check if we're using a mock admin profile (no real admin profile exists)
    if (adminProfile.id === user.id && adminProfile.adminCode === 'ADMIN') {
      Alert.alert('Cannot Assign', 'Cannot assign vehicles when using a temporary admin profile. Please contact your system administrator to create a proper admin profile.');
      return;
    }
    
    try {
      await assignVehicleToRoute(adminProfile.id, selectedRoute.id, vehicleId);
      Alert.alert('Success', 'Vehicle assigned to route');
      setVehicleModalVisible(false);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Assignment failed');
    }
  }

  async function handleUnassignVehicle(vehicleId) {
    if (!adminProfile?.id || !selectedRoute?.id) return;
    
    // Check if we're using a mock admin profile (no real admin profile exists)
    if (adminProfile.id === user.id && adminProfile.adminCode === 'ADMIN') {
      Alert.alert('Cannot Unassign', 'Cannot unassign vehicles when using a temporary admin profile. Please contact your system administrator to create a proper admin profile.');
      return;
    }
    
    Alert.alert('Unassign Vehicle', 'Remove this vehicle from the route?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await unassignVehicleFromRoute(adminProfile.id, selectedRoute.id, vehicleId);
            Alert.alert('Success', 'Vehicle unassigned from route');
            setVehicleModalVisible(false);
            loadData(true);
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || err?.message || 'Unassign failed');
          }
        }
      },
    ]);
  }

  const inp = [styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Routes & Schedules</Text>
          <Text style={styles.headerSub}>{rank?.name || 'Taxi Rank'}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* No admin guard */}
      {!adminProfile && (
        <View style={[styles.center, { flex: 1 }]}>
          <Ionicons name="lock-closed-outline" size={40} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>Only Rank Admins can manage routes.</Text>
        </View>
      )}

      {/* Route list */}
      {adminProfile && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
        >
          {!Array.isArray(routes) || routes.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="map-outline" size={48} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No routes yet</Text>
              <Text style={[styles.emptyHint, { color: c.textMuted }]}>Tap + to create a route</Text>
            </View>
          ) : (
            routes.map((r) => (
              <TouchableOpacity key={r.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => openEdit(r)} activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: GOLD_LIGHT }]}>
                    <Ionicons name="git-branch-outline" size={20} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{r.routeName}</Text>
                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>
                      {r.departureStation} → {r.destinationStation}
                    </Text>
                  </View>
                  {(() => {
                    const assignedVehicles = r.routeVehicles?.filter(rv => rv.isActive !== false) || [];
                    const hasAssignedVehicles = assignedVehicles.length > 0;
                    console.log(`Route ${r.routeName}: ${assignedVehicles.length} assigned vehicles, hasAssigned: ${hasAssignedVehicles}`);
                    return (
                      <TouchableOpacity 
                        onPress={() => {
                          console.log('Delete button pressed for route:', r.routeName);
                          handleDelete(r);
                        }} 
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        disabled={hasAssignedVehicles}
                        style={{ opacity: hasAssignedVehicles ? 0.4 : 1 }}
                      >
                        <Ionicons 
                          name="trash-outline" 
                          size={18} 
                          color={hasAssignedVehicles ? c.textMuted : "#dc3545"} 
                        />
                      </TouchableOpacity>
                    );
                  })()}
                </View>
                <View style={styles.cardDetails}>
                  <Tag icon="cash-outline" label={`R${r.standardFare}`} c={c} />
                  {r.maxPassengers && <Tag icon="people-outline" label={`${r.maxPassengers} pax`} c={c} />}
                  {r.stops?.length > 0 && <Tag icon="location-outline" label={`${r.stops.length} stop${r.stops.length > 1 ? 's' : ''}`} c={c} />}
                  {(() => {
                    const activeVehicles = r.routeVehicles?.filter(rv => rv.isActive !== false) || [];
                    return activeVehicles.length > 0 && (
                      <Tag icon="car-outline" label={`${activeVehicles.length} vehicle${activeVehicles.length > 1 ? 's' : ''} assigned`} c={c} />
                    );
                  })()}
                </View>
                {r.routeVehicles?.length > 0 && (
                  <View style={styles.vehiclesRow}>
                    <Text style={[styles.vehiclesLabel, { color: c.textMuted }]}>Vehicles:</Text>
                    {r.routeVehicles.map(rv => {
                      const isActive = rv.isActive !== false;
                      return (
                        <View 
                          key={rv.id} 
                          style={[
                            styles.vehicleChip, 
                            { 
                              backgroundColor: isActive ? GOLD_LIGHT : c.surface, 
                              borderColor: isActive ? GOLD : c.border,
                              opacity: isActive ? 1 : 0.6
                            }
                          ]}
                        >
                          <Text style={[styles.vehicleChipText, { color: isActive ? c.text : c.textMuted }]}>
                            {rv.vehicle?.registration || rv.vehicle?.registrationNumber || 'Unknown'}
                            {!isActive && ' (Inactive)'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                <TouchableOpacity 
                  style={[styles.manageVehiclesBtn, { backgroundColor: GOLD_LIGHT, borderColor: GOLD }]} 
                  onPress={(e) => { e.stopPropagation(); openVehicleModal(r); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="car-outline" size={16} color={GOLD} />
                  <Text style={[styles.manageVehiclesText, { color: GOLD }]}>Manage Vehicles</Text>
                </TouchableOpacity>
                {r.stops?.length > 0 && (
                  <View style={styles.cardStops}>
                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>{r.departureStation}</Text>
                    {[...r.stops].sort((a, b) => a.stopOrder - b.stopOrder).map(s => (
                      <React.Fragment key={s.id}>
                        <Ionicons name="chevron-forward" size={10} color={c.textMuted} />
                        <Text style={[styles.cardMeta, { color: c.textMuted }]}>{s.stopName} <Text style={{ color: GOLD }}>R{s.fareFromOrigin}</Text></Text>
                      </React.Fragment>
                    ))}
                    <Ionicons name="chevron-forward" size={10} color={c.textMuted} />
                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>{r.destinationStation}</Text>
                  </View>
                )}
                <View style={styles.daysRow}>
                  {DAYS.map(d => (
                    <View key={d} style={[styles.dayChip, (r.daysOfWeek || '').includes(d) && styles.dayChipActive]}>
                      <Text style={[styles.dayText, (r.daysOfWeek || '').includes(d) && styles.dayTextActive]}>{d.charAt(0)}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>{editing ? 'Edit Route' : 'New Route'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: c.textMuted }]}>Route Name</Text>
              <TextInput placeholder="e.g. JHB to PTA" placeholderTextColor={c.textMuted} value={routeName} onChangeText={setRouteName} style={inp} />

              <Text style={[styles.label, { color: c.textMuted }]}>Departure Station</Text>
              <TextInput placeholder="From" placeholderTextColor={c.textMuted} value={departure} onChangeText={setDeparture} style={inp} />

              <Text style={[styles.label, { color: c.textMuted }]}>Destination Station</Text>
              <TextInput placeholder="To" placeholderTextColor={c.textMuted} value={destination} onChangeText={setDestination} style={inp} />

              <Text style={[styles.label, { color: c.textMuted }]}>Days of Operation</Text>
              <View style={styles.daysSelector}>
                {DAYS.map(d => (
                  <TouchableOpacity key={d} style={[styles.daySel, selectedDays.includes(d) && styles.daySelActive]} onPress={() => toggleDay(d)}>
                    <Text style={[styles.daySelText, selectedDays.includes(d) && styles.daySelTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Fare (R)</Text>
                  <TextInput placeholder="25.00" placeholderTextColor={c.textMuted} value={fare} onChangeText={setFare} style={inp} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Duration (min)</Text>
                  <TextInput placeholder="45" placeholderTextColor={c.textMuted} value={duration} onChangeText={setDuration} style={inp} keyboardType="numeric" />
                </View>
              </View>

              <Text style={[styles.label, { color: c.textMuted }]}>Max Passengers</Text>
              <TextInput placeholder="15" placeholderTextColor={c.textMuted} value={maxPassengers} onChangeText={setMaxPassengers} style={inp} keyboardType="numeric" />

              <Text style={[styles.label, { color: c.textMuted }]}>Notes (optional)</Text>
              <TextInput placeholder="Any additional info" placeholderTextColor={c.textMuted} value={notes} onChangeText={setNotes} style={[...inp, { minHeight: 60 }]} multiline />

              {/* Stops & Fares */}
              <View style={styles.stopsHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Stops & Fares</Text>
                  <Text style={[styles.sectionHint, { color: c.textMuted }]}>Intermediate stops with fares from origin</Text>
                </View>
                <TouchableOpacity style={styles.addStopBtn} onPress={addStop}>
                  <Ionicons name="add" size={18} color="#000" />
                  <Text style={styles.addStopText}>Add Stop</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.stopPill, styles.stopPillOrigin]}>
                <View style={styles.stopDot} />
                <Text style={[styles.stopPillLabel, { color: c.text }]}>{departure || 'Origin'}</Text>
                <Text style={[styles.stopPillFare, { color: c.textMuted }]}>R0.00</Text>
              </View>

              {stops.map((s, idx) => (
                <View key={s.id}>
                  <View style={styles.stopLine} />
                  <View style={[styles.stopRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={[styles.stopNumBadge, { backgroundColor: GOLD_LIGHT }]}>
                      <Text style={styles.stopNum}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <TextInput
                        value={s.stopName}
                        onChangeText={v => updateStop(s.id, 'stopName', v)}
                        style={[styles.stopInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                        placeholder="Stop name"
                        placeholderTextColor={c.textMuted}
                      />
                      <View style={{ marginTop: 4 }}>
                        <Text style={[styles.stopFieldLabel, { color: c.textMuted }]}>Fare from origin (R)</Text>
                        <TextInput
                          value={s.fareFromOrigin}
                          onChangeText={v => updateStop(s.id, 'fareFromOrigin', v)}
                          style={[styles.stopInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                          placeholder="15.00"
                          placeholderTextColor={c.textMuted}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => removeStop(s.id)} style={styles.removeStopBtn}>
                      <Ionicons name="close-circle" size={20} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {stops.length > 0 && <View style={styles.stopLine} />}

              <View style={[styles.stopPill, styles.stopPillDest]}>
                <View style={[styles.stopDot, styles.stopDotDest]} />
                <Text style={[styles.stopPillLabel, { color: c.text }]}>{destination || 'Destination'}</Text>
                <Text style={[styles.stopPillFare, { color: GOLD }]}>R{fare || '0'}</Text>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{editing ? 'Update Route' : 'Create Route'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Vehicle Selection Modal */}
      <Modal visible={vehicleModalVisible} animationType="slide" transparent onRequestClose={() => setVehicleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Manage Vehicles</Text>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>{selectedRoute?.routeName}</Text>
              <Text style={[styles.sectionHint, { color: c.textMuted, marginBottom: 16 }]}>
                {selectedRoute?.departureStation} → {selectedRoute?.destinationStation}
              </Text>

              {/* Currently Assigned Vehicles */}
              {selectedRoute?.routeVehicles?.length > 0 && (
                <>
                  <Text style={[styles.label, { color: c.textMuted }]}>Assigned Vehicles</Text>
                  {selectedRoute.routeVehicles.map(rv => (
                    <View key={rv.id} style={[styles.vehicleItem, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.vehicleReg, { color: c.text }]}>{rv.vehicle?.registration || rv.vehicle?.registrationNumber}</Text>
                        <Text style={[styles.vehicleMake, { color: c.textMuted }]}>
                          {rv.vehicle?.make} {rv.vehicle?.model}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnassignVehicle(rv.vehicleId)} style={styles.unassignBtn}>
                        <Ionicons name="close-circle" size={24} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {/* Available Vehicles to Assign */}
              <Text style={[styles.label, { color: c.textMuted, marginTop: 20 }]}>
                Available Vehicles ({vehicles.filter(v => !selectedRoute?.routeVehicles?.some(rv => rv.vehicleId === v.id)).length})
              </Text>
              {vehicles.length === 0 ? (
                <View style={[styles.emptyState, { marginTop: 20 }]}>
                  <Ionicons name="car-outline" size={48} color={c.textMuted} />
                  <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 12 }]}>
                    No vehicles found for this taxi rank
                  </Text>
                  <Text style={[styles.emptyHint, { color: c.textMuted, textAlign: 'center', marginTop: 4 }]}>
                    Add vehicles to your fleet first
                  </Text>
                </View>
              ) : vehicles.filter(v => !selectedRoute?.routeVehicles?.some(rv => rv.vehicleId === v.id)).length === 0 ? (
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 20 }]}>
                  All vehicles are assigned to this route
                </Text>
              ) : (
                vehicles
                  .filter(v => !selectedRoute?.routeVehicles?.some(rv => rv.vehicleId === v.id))
                  .map(v => (
                    <TouchableOpacity 
                      key={v.id} 
                      style={[styles.vehicleItem, { backgroundColor: c.surface, borderColor: GOLD, borderWidth: 1.5 }]}
                      onPress={() => {
                        handleAssignVehicle(v.id);
                      }}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.vehicleIconCircle, { backgroundColor: GOLD_LIGHT }]}>
                        <Ionicons name="car" size={20} color={GOLD} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.vehicleReg, { color: c.text }]}>{v.registration || v.registrationNumber}</Text>
                        <Text style={[styles.vehicleMake, { color: c.textMuted }]}>
                          {v.make} {v.model}
                        </Text>
                      </View>
                      <View style={[styles.addVehicleBtn, { backgroundColor: GOLD }]}>
                        <Ionicons name="add" size={20} color="#000" />
                      </View>
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent onRequestClose={cancelDelete}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background, margin: 20, borderRadius: 14 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Delete Route</Text>
              <TouchableOpacity onPress={cancelDelete}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.deleteMessage, { color: c.text, marginBottom: 24 }]}>
                Are you sure you want to delete "{routeToDelete?.routeName}"? This action cannot be undone.
              </Text>
              
              <View style={styles.deleteActions}>
                <TouchableOpacity 
                  style={[styles.deleteCancelBtn, { backgroundColor: c.surface, borderColor: c.border }]} 
                  onPress={cancelDelete}
                >
                  <Text style={[styles.deleteCancelText, { color: c.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.deleteConfirmBtn, { backgroundColor: '#dc3545' }]} 
                  onPress={confirmDelete}
                >
                  <Text style={[styles.deleteConfirmText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Tag({ icon, label, c }) {
  return (
    <View style={[tagStyles.tag, { backgroundColor: GOLD_LIGHT }]}>
      <Ionicons name={icon} size={12} color={GOLD} />
      <Text style={[tagStyles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  text: { fontSize: 11, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },

  header: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: GOLD, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  addBtn: { backgroundColor: GOLD, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  listContent: { padding: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 12 },

  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardStops: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  daysRow: { flexDirection: 'row', gap: 4 },
  dayChip: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: GOLD },
  dayText: { fontSize: 10, fontWeight: '700', color: '#999' },
  dayTextActive: { color: '#000' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalBody: { padding: 16, paddingBottom: 40 },

  // Delete modal styles
  deleteMessage: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  deleteActions: { flexDirection: 'row', gap: 12 },
  deleteCancelBtn: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 10, 
    borderWidth: 1, 
    alignItems: 'center' 
  },
  deleteCancelText: { fontSize: 16, fontWeight: '600' },
  deleteConfirmBtn: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  deleteConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  label: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },

  daysSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  daySel: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.06)' },
  daySelActive: { backgroundColor: GOLD },
  daySelText: { fontSize: 12, fontWeight: '700', color: '#999' },
  daySelTextActive: { color: '#000' },

  saveBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },

  stopsHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionHint: { fontSize: 11, marginTop: 2 },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, gap: 4 },
  addStopText: { fontSize: 12, fontWeight: '800', color: '#000' },

  stopPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  stopPillOrigin: { borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'rgba(0,0,0,0.04)' },
  stopPillDest: { borderColor: GOLD, backgroundColor: GOLD_LIGHT },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6c757d' },
  stopDotDest: { backgroundColor: GOLD },
  stopPillLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  stopPillFare: { fontSize: 12, fontWeight: '700' },

  stopLine: { width: 2, height: 16, backgroundColor: 'rgba(0,0,0,0.12)', marginLeft: 16, marginVertical: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 10, gap: 10 },
  stopNumBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  stopNum: { fontSize: 11, fontWeight: '900', color: GOLD },
  stopInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  stopFareRow: { flexDirection: 'row', gap: 8 },
  stopFieldLabel: { fontSize: 10, fontWeight: '600', marginBottom: 3 },
  removeStopBtn: { paddingTop: 8 },

  vehiclesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  vehiclesLabel: { fontSize: 11, fontWeight: '600' },
  vehicleChip: { borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  vehicleChipText: { fontSize: 11, fontWeight: '700' },
  manageVehiclesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 10 },
  manageVehiclesText: { fontSize: 12, fontWeight: '700' },

  vehicleItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 10 },
  vehicleReg: { fontSize: 15, fontWeight: '800' },
  vehicleMake: { fontSize: 12, marginTop: 2 },
  unassignBtn: { padding: 4 },
  vehicleIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addVehicleBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyHint: { fontSize: 12 },
});
