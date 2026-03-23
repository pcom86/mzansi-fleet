import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, Modal, FlatList, RefreshControl, TextInput, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';
import { fetchSchedules, fetchVehicles } from '../api/taxiRanks';
import { getRequestsByTaxiRank, approveRequest, rejectRequest } from '../api/vehicleTaxiRankRequests';
import { getVehiclesByTenantId, assignVehicleToTaxiRank, unassignVehicleFromTaxiRank } from '../api/vehicles';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const RED = '#dc3545';

// Modal Header Component
function ModalHeader({ title, onClose, c }) {
  return (
    <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
      <Text style={[styles.modalTitle, { color: c.text }]}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: c.surface }]}>
        <Ionicons name="close" size={20} color={c.text} />
      </TouchableOpacity>
    </View>
  );
}

export default function VehicleRouteAssignmentScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  // State
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [allTenantVehicles, setAllTenantVehicles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('routes'); // routes, vehicles, requests
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Modal states
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [vehicleManageModalVisible, setVehicleManageModalVisible] = useState(false);
  const [selectedVehicleForManage, setSelectedVehicleForManage] = useState(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?.userId || user?.id;
      if (!userId) return;

      // Check if user is Rank Admin, Rank Manager, or Marshal
      const isAdmin = user?.role === 'TaxiRankAdmin';
      const isManager = user?.role === 'TaxiRankManager';
      const isMarshal = (user?.role || '').toLowerCase() === 'taximarshal';
      const hasPermission = isAdmin || isManager || isMarshal;
      
      if (hasPermission) {
        // Only fetch admin profile for non-marshal roles
        let admin = null;
        if (!isMarshal) {
          const adminResp = await client.get(`/TaxiRankAdmin/user/${userId}`).catch(() => ({ data: null }));
          admin = adminResp.data;
        }

        if (admin?.id) {
          setAdminProfile(admin);

          const [schedulesResp, vehiclesResp] = await Promise.all([
            client.get(`/TaxiRankAdmin/user/${userId}/schedules`).catch(() => ({ data: [] })),
            client.get('/Vehicles').catch(() => ({ data: [] }))
          ]);

          setSchedules(schedulesResp.data || []);
          setVehicles(vehiclesResp.data || []);
          
          // Load all vehicles for vehicle management (show all vehicles regardless of tenant)
          try {
            // Use the working /Vehicles API and show all vehicles
            const allVehiclesResp = await client.get('/Vehicles');
            // Show all vehicles (no tenant filtering)
            const allVehicles = allVehiclesResp.data || [];
            setAllTenantVehicles(allVehicles);
          } catch (err) {
            console.error('Failed to load all vehicles:', err);
            setAllTenantVehicles([]);
          }

          // Load existing assignments
          await loadAssignments();

          // Load pending requests if admin has taxi rank
          if (admin?.taxiRankId) {
            try {
              const requestsResp = await getRequestsByTaxiRank(admin.taxiRankId, 'Pending');
              setPendingRequests(requestsResp || []);
            } catch (err) {
              console.error('Load requests error:', err);
              setPendingRequests([]);
            }
          }
        } else {
          // Marshal or admin without profile — use JWT-based endpoints
          const [schedulesResp, vehiclesResp] = await Promise.all([
            client.get('/TripSchedules').catch(() => ({ data: [] })),
            client.get('/Vehicles').catch(() => ({ data: [] }))
          ]);
          setSchedules(schedulesResp.data || []);
          setVehicles(vehiclesResp.data || []);
          setAllTenantVehicles(vehiclesResp.data || []);
          setPendingRequests([]);
        }
      } else {
        console.warn('User does not have permission to manage vehicle and route assignments. Role:', user?.role);
        setAdminProfile(null);
        setSchedules([]);
        setVehicles([]);
        setPendingRequests([]);
      }
    } catch (err) {
      console.error('Load data error:', err);
      setAdminProfile(null);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadAssignments = async () => {
    try {
      const userId = user?.userId || user?.id;
      const resp = await client.get(`/RouteVehicle/assignments/${userId}`);
      setAssignments(resp.data || []);
    } catch (err) {
      console.error('Load assignments error:', err);
      // If endpoint doesn't exist yet, show empty assignments
      setAssignments([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Assignment functions
  const openAssignModal = (schedule) => {
    setSelectedSchedule(schedule);
    
    // Pre-select vehicles already assigned to this route
    const assignedVehicleIds = assignments
      .filter(a => a.routeId === schedule.id && a.isActive)
      .map(a => a.vehicleId);
    
    setSelectedVehicles(assignedVehicleIds);
    setAssignModalVisible(true);
  };

  const toggleVehicleSelection = (vehicleId) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId)
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const saveAssignments = async () => {
    if (!selectedSchedule) return;

    try {
      const userId = user?.userId || user?.id;
      await client.post(`/RouteVehicle/assign/${userId}`, {
        routeId: selectedSchedule.id,
        vehicleIds: selectedVehicles
      });

      Alert.alert('Success', 'Vehicle assignments updated successfully');
      setAssignModalVisible(false);
      await loadAssignments();
    } catch (err) {
      console.error('Save assignments error:', err);
      Alert.alert('Error', 'Failed to save assignments');
    }
  };

  const removeAssignment = async (assignmentId) => {
    try {
      await client.delete(`/RouteVehicle/${assignmentId}`);
      Alert.alert('Success', 'Assignment removed successfully');
      await loadAssignments();
    } catch (err) {
      console.error('Remove assignment error:', err);
      Alert.alert('Error', 'Failed to remove assignment');
    }
  };

  // Vehicle management functions
  const handleSearchVehicles = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      // Search in all tenant vehicles
      const filtered = allTenantVehicles.filter(v => 
        v.registration?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error('Search vehicles error:', err);
      Alert.alert('Error', 'Failed to search vehicles');
    } finally {
      setSearching(false);
    }
  };

  const openVehicleManageModal = (vehicle) => {
    setSelectedVehicleForManage(vehicle);
    setVehicleManageModalVisible(true);
  };

  const handleAssignVehicleToTaxiRank = async (vehicleId) => {
    if (!adminProfile?.taxiRankId) {
      Alert.alert('Error', 'No taxi rank assigned to admin profile');
      return;
    }

    try {
      await assignVehicleToTaxiRank(vehicleId, adminProfile.taxiRankId);
      Alert.alert('Success', 'Vehicle assigned to taxi rank successfully');
      setVehicleManageModalVisible(false);
      loadData(true); // Reload data
    } catch (err) {
      console.error('Assign vehicle to taxi rank error:', err);
      Alert.alert('Error', 'Failed to assign vehicle to taxi rank');
    }
  };

  const handleUnassignVehicleFromTaxiRank = async (vehicleId) => {
    try {
      await unassignVehicleFromTaxiRank(vehicleId);
      Alert.alert('Success', 'Vehicle unassigned from taxi rank successfully');
      setVehicleManageModalVisible(false);
      loadData(true); // Reload data
    } catch (err) {
      console.error('Unassign vehicle from taxi rank error:', err);
      Alert.alert('Error', 'Failed to unassign vehicle from taxi rank');
    }
  };

  const handleApproveRequest = async (request) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Link ${request.vehicleRegistration} to this taxi rank?`)
      : await new Promise(resolve => {
        Alert.alert(
          'Approve Request',
          `Link ${request.vehicleRegistration} to this taxi rank?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Approve', style: 'default', onPress: () => resolve(true) }
          ]
        );
      });
    if (!confirmed) return;
    try {
      await approveRequest(request.id, user.userId || user.id, user.fullName || user.email);
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      Alert.alert('Success', 'Vehicle linked successfully');
      loadData(true);
    } catch (err) {
      console.error('Approve request error:', err);
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (request) => {
    let reason = 'No reason provided';
    if (Platform.OS === 'web') {
      const input = window.prompt('Enter reason for rejection (optional):');
      reason = input || 'No reason provided';
    } else {
      // For mobile, you could implement a modal with text input
      // For now, using a simple reason
    }
    try {
      await rejectRequest(request.id, user.userId || user.id, user.fullName || user.email, reason);
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      Alert.alert('Success', 'Request rejected');
      loadData(true);
    } catch (err) {
      console.error('Reject request error:', err);
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  // Render functions
  const renderScheduleItem = ({ item }) => {
    const assignedCount = assignments.filter(a => a.routeId === item.id && a.isActive).length;
    const assignedVehicles = assignments
      .filter(a => a.routeId === item.id && a.isActive)
      .map(a => vehicles.find(v => v.id === a.vehicleId))
      .filter(Boolean);

    return (
      <View style={[styles.scheduleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleInfo}>
            <Text style={[styles.scheduleName, { color: c.text }]}>{item.routeName}</Text>
            <Text style={[styles.scheduleRoute, { color: c.textMuted }]}>
              {item.departureStation} → {item.destinationStation}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.assignButton, { backgroundColor: GOLD }]}
            onPress={() => openAssignModal(item)}
          >
            <Ionicons name="settings-outline" size={16} color="white" />
            <Text style={styles.assignButtonText}>Assign</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.assignedSection}>
          <Text style={[styles.assignedTitle, { color: c.text }]}>
            Assigned Vehicles ({assignedCount})
          </Text>
          {assignedVehicles.length > 0 ? (
            <View style={styles.assignedVehicles}>
              {assignedVehicles.map(vehicle => (
                <View key={vehicle.id} style={[styles.vehicleChip, { backgroundColor: GOLD_LIGHT }]}>
                  <Text style={[styles.vehicleChipText, { color: GOLD }]}>
                    {vehicle.registration}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeChip}
                    onPress={() => {
                      const assignment = assignments.find(
                        a => a.routeId === item.id && a.vehicleId === vehicle.id && a.isActive
                      );
                      if (assignment) {
                        Alert.alert(
                          'Remove Assignment',
                          `Remove ${vehicle.registration} from this route?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Remove', style: 'destructive', onPress: () => removeAssignment(assignment.id) }
                          ]
                        );
                      }
                    }}
                  >
                    <Ionicons name="close-circle" size={16} color={GOLD} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noVehiclesText, { color: c.textMuted }]}>
              No vehicles assigned to this route
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderVehicleItem = ({ item }) => {
    const isSelected = selectedVehicles.includes(item.id);
    const isCurrentlyAssigned = assignments.some(
      a => a.routeId === selectedSchedule?.id && a.vehicleId === item.id && a.isActive
    );

    return (
      <TouchableOpacity
        style={[
          styles.vehicleItem,
          {
            backgroundColor: isSelected ? GOLD_LIGHT : c.surface,
            borderColor: isSelected ? GOLD : c.border
          }
        ]}
        onPress={() => toggleVehicleSelection(item.id)}
      >
        <View style={styles.vehicleInfo}>
          <Text style={[styles.vehicleName, { color: c.text }]}>
            {item.registration || 'No Reg'}
          </Text>
          <Text style={[styles.vehicleDetails, { color: c.textMuted }]}>
            {item.make || 'No Make'} {item.model || 'No Model'}
          </Text>
        </View>
        <View style={styles.vehicleCheck}>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
          {isCurrentlyAssigned && !isSelected && (
            <Text style={[styles.currentlyAssignedText, { color: c.textMuted }]}>Currently assigned</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestItem = ({ item }) => (
    <View key={item.id} style={[styles.requestCard, { backgroundColor: c.surface, borderColor: GOLD }]}>
      <View style={styles.requestHeader}>
        <View style={[styles.vehicleIconCircle, { backgroundColor: GOLD_LIGHT }]}>
          <Ionicons name="car-outline" size={24} color={GOLD} />
        </View>
        <View style={styles.requestInfo}>
          <Text style={[styles.vehicleRegistration, { color: c.text }]}>
            {item.vehicleRegistration}
          </Text>
          <Text style={[styles.requestMeta, { color: c.textMuted }]}>
            Requested {new Date(item.requestedAt).toLocaleDateString()}
          </Text>
          {item.driverName && (
            <Text style={[styles.driverName, { color: c.textMuted }]}>
              Driver: {item.driverName}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.rejectBtn, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]}
          onPress={() => handleRejectRequest(item)}
        >
          <Ionicons name="close" size={18} color="#ef4444" />
          <Text style={[styles.rejectBtnText, { color: '#ef4444' }]}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.approveBtn, { backgroundColor: GOLD }]}
          onPress={() => handleApproveRequest(item)}
        >
          <Ionicons name="checkmark" size={18} color="#000" />
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.text }]}>Loading assignments...</Text>
      </View>
    );
  }

  // Only Rank Admins and Rank Managers can manage vehicle and route assignments
  if (!adminProfile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: c.background }]}>
        <Ionicons name="lock-closed-outline" size={40} color={c.textMuted} />
        <Text style={[styles.emptyText, { color: c.textMuted, marginTop: 8 }]}>Only Rank Admins and Rank Managers can manage vehicle and route assignments.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Fleet Management</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'routes' && styles.activeTab]}
          onPress={() => setActiveTab('routes')}
        >
          <Ionicons name="git-branch-outline" size={20} color={activeTab === 'routes' ? GOLD : c.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'routes' ? GOLD : c.textMuted }]}>Routes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vehicles' && styles.activeTab]}
          onPress={() => setActiveTab('vehicles')}
        >
          <Ionicons name="car-outline" size={20} color={activeTab === 'vehicles' ? GOLD : c.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'vehicles' ? GOLD : c.textMuted }]}>Vehicles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Ionicons name="time" size={20} color={activeTab === 'requests' ? GOLD : c.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'requests' ? GOLD : c.textMuted }]}>Requests</Text>
          {pendingRequests.length > 0 && (
            <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.badgeText}>{pendingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
      >
        {activeTab === 'routes' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Routes</Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: GOLD }]}
                onPress={() => navigation.navigate('TaxiRankRoutes', { rank: { id: user?.tenantId, name: 'All Ranks' } })}
              >
                <Ionicons name="add" size={16} color="#000" />
                <Text style={styles.createButtonText}>Manage Routes</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={schedules}
              keyExtractor={item => item.id}
              renderItem={renderScheduleItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="git-branch-outline" size={48} color={c.textMuted} />
                  <Text style={[styles.emptyText, { color: c.textMuted }]}>
                    No routes found. Create routes first to assign vehicles.
                  </Text>
                  <TouchableOpacity
                    style={[styles.createEmptyButton, { backgroundColor: GOLD }]}
                    onPress={() => navigation.navigate('TaxiRankRoutes', { rank: { id: user?.tenantId, name: 'All Ranks' } })}
                  >
                    <Ionicons name="add" size={16} color="#000" />
                    <Text style={styles.createButtonText}>Manage Routes</Text>
                  </TouchableOpacity>
                </View>
              }
              scrollEnabled={false}
            />
          </View>
        ) : activeTab === 'vehicles' ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>All Vehicles</Text>
            
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="search" size={20} color={c.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: c.text }]}
                placeholder="Search vehicles by registration, make, or model..."
                placeholderTextColor={c.textMuted}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  // Trigger real-time search
                  if (text.trim()) {
                    const filtered = allTenantVehicles.filter(v => 
                      v.registration?.toLowerCase().includes(text.toLowerCase()) ||
                      v.make?.toLowerCase().includes(text.toLowerCase()) ||
                      v.model?.toLowerCase().includes(text.toLowerCase())
                    );
                    setSearchResults(filtered);
                  } else {
                    setSearchResults([]);
                  }
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={20} color={c.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Vehicle List */}
            {searchQuery.trim() ? (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.vehicleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={styles.vehicleInfo}>
                      <Text style={[styles.vehicleRegistration, { color: c.text }]}>{item.registration}</Text>
                      <Text style={[styles.vehicleDetails, { color: c.textMuted }]}>
                        {item.make} {item.model} • {item.capacity || 'N/A'} seats
                      </Text>
                      <Text style={[styles.vehicleStatus, { color: item.taxiRankId ? GREEN : GOLD }]}>
                        {item.taxiRankId ? 'Assigned to Taxi Rank' : 'Available'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.manageButton, { backgroundColor: GOLD }]}
                      onPress={() => openVehicleManageModal(item)}
                    >
                      <Ionicons name="settings-outline" size={16} color="#000" />
                      <Text style={styles.manageButtonText}>Manage</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: c.textMuted }]}>
                    No vehicles found matching "{searchQuery}"
                  </Text>
                }
                scrollEnabled={false}
              />
            ) : (
              <FlatList
                data={allTenantVehicles}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.vehicleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={styles.vehicleInfo}>
                      <Text style={[styles.vehicleRegistration, { color: c.text }]}>{item.registration}</Text>
                      <Text style={[styles.vehicleDetails, { color: c.textMuted }]}>
                        {item.make} {item.model} • {item.capacity || 'N/A'} seats
                      </Text>
                      <Text style={[styles.vehicleStatus, { color: item.taxiRankId ? GREEN : GOLD }]}>
                        {item.taxiRankId ? 'Assigned to Taxi Rank' : 'Available'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.manageButton, { backgroundColor: GOLD }]}
                      onPress={() => openVehicleManageModal(item)}
                    >
                      <Ionicons name="settings-outline" size={16} color="#000" />
                      <Text style={styles.manageButtonText}>Manage</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="car-outline" size={64} color={c.textMuted} />
                    <Text style={[styles.emptyTitle, { color: c.text }]}>No Vehicles Found</Text>
                    <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
                      No vehicles are available in your tenant
                    </Text>
                  </View>
                }
                scrollEnabled={false}
              />
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Pending Vehicle Requests</Text>
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={64} color={c.textMuted} />
                <Text style={[styles.emptyTitle, { color: c.text }]}>No Pending Requests</Text>
                <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
                  When vehicle owners request to join your taxi rank, they'll appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={pendingRequests}
                keyExtractor={item => item.id}
                renderItem={renderRequestItem}
                scrollEnabled={false}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Assignment Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader
              title={`Assign Vehicles - ${selectedSchedule?.routeName}`}
              onClose={() => setAssignModalVisible(false)}
              c={c}
            />
            
            <FlatList
              data={vehicles}
              keyExtractor={item => item.id}
              renderItem={renderVehicleItem}
              contentContainerStyle={{ padding: 16 }}
              ListHeaderComponent={() => null}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>
                  No vehicles available
                </Text>
              }
            />

            <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: GOLD }]}
                onPress={saveAssignments}
              >
                <Text style={styles.saveButtonText}>Save Assignments</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vehicle Management Modal */}
      <Modal
        visible={vehicleManageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setVehicleManageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader 
              title="Manage Vehicle" 
              onClose={() => setVehicleManageModalVisible(false)} 
              c={c} 
            />
            
            <ScrollView contentContainerStyle={styles.modalBody}>
              {selectedVehicleForManage && (
                <>
                  <View style={[styles.vehicleDetailCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[styles.vehicleRegistration, { color: c.text }]}>
                      {selectedVehicleForManage.registration}
                    </Text>
                    <Text style={[styles.vehicleDetails, { color: c.textMuted }]}>
                      {selectedVehicleForManage.make} {selectedVehicleForManage.model}
                    </Text>
                    <Text style={[styles.vehicleDetails, { color: c.textMuted }]}>
                      Capacity: {selectedVehicleForManage.capacity || 'N/A'} seats
                    </Text>
                    <Text style={[styles.vehicleStatus, { color: selectedVehicleForManage.taxiRankId ? GREEN : GOLD }]}>
                      {selectedVehicleForManage.taxiRankId ? 'Assigned to Taxi Rank' : 'Available'}
                    </Text>
                  </View>

                  <View style={styles.vehicleActions}>
                    {!selectedVehicleForManage.taxiRankId ? (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: GREEN }]}
                        onPress={() => handleAssignVehicleToTaxiRank(selectedVehicleForManage.id)}
                      >
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Assign to Taxi Rank</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                        onPress={() => handleUnassignVehicleFromTaxiRank(selectedVehicleForManage.id)}
                      >
                        <Ionicons name="remove-circle-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Unassign from Taxi Rank</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    right: 20,
    top: 12,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  scheduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleRoute: {
    fontSize: 14,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  assignedSection: {
    marginTop: 8,
  },
  assignedTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  assignedVehicles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  vehicleChipText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  removeChip: {
    marginLeft: 4,
  },
  noVehiclesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  // Request styles
  requestCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  requestInfo: {
    flex: 1,
  },
  vehicleRegistration: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  requestMeta: {
    fontSize: 14,
    marginBottom: 2,
  },
  driverName: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Vehicle management styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleRegistration: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  vehicleStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  vehicleDetailCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  vehicleActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  vehicleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
  },
  vehicleCheck: {
    alignItems: 'center',
  },
  currentlyAssignedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  // Empty state styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  createEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
});
