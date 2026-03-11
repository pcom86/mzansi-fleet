import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchAdminByUserId } from '../api/taxiRanks';
import Toast from '../components/Toast';
import { getVehiclesByTenantId, getVehiclesByTaxiRank, assignVehicleToTaxiRank, unassignVehicleFromTaxiRank } from '../api/vehicles';
import { getRequestsByTaxiRank, approveRequest, rejectRequest, searchVehiclesByRegistration } from '../api/vehicleTaxiRankRequests';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';

export default function TaxiRankVehiclesScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [assignedVehicles, setAssignedVehicles] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('assigned'); // assigned, pending, search
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
  }, []);
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true);

      // Only fetch admin profile for non-marshal roles
      let admin = null;
      const isMarshal = (user?.role || '').toLowerCase() === 'taximarshal';
      if (!isMarshal) {
        try {
          const adminResp = await fetchAdminByUserId(user.userId || user.id);
          admin = adminResp.data || adminResp;
        } catch (_) {}
      }
      setAdminProfile(admin);

      if (admin?.taxiRankId && admin?.tenantId) {
        // Admin path: get vehicles assigned to this taxi rank
        const assignedResp = await getVehiclesByTaxiRank(admin.taxiRankId);
        setAssignedVehicles(assignedResp.data || assignedResp || []);

        const allVehiclesResp = await getVehiclesByTenantId(admin.tenantId);
        const allVehicles = allVehiclesResp.data || allVehiclesResp || [];
        const available = allVehicles.filter(v => v.taxiRankId !== admin.taxiRankId);
        setAvailableVehicles(available);

        const requestsResp = await getRequestsByTaxiRank(admin.taxiRankId, 'Pending').catch(() => []);
        setPendingRequests(requestsResp || []);
      } else if (user?.tenantId) {
        // Marshal path: load vehicles by tenant
        try {
          const allVehiclesResp = await getVehiclesByTenantId(user.tenantId);
          setAssignedVehicles(allVehiclesResp.data || allVehiclesResp || []);
        } catch (_) {
          setAssignedVehicles([]);
        }
      }
    } catch (err) {
      console.error('Error loading vehicles:', err);
      showToast(err?.response?.data?.message || err?.message || 'Failed to load vehicles', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSearchVehicles() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await searchVehiclesByRegistration(searchQuery, adminProfile?.tenantId);
      setSearchResults(results || []);
    } catch (err) {
      showToast('Failed to search vehicles', 'error');
    } finally {
      setSearching(false);
    }
  }

  async function handleApproveRequest(request) {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Link ${request.vehicleRegistration} to this taxi rank?`)
      : await new Promise(resolve => {
          Alert.alert('Approve Request', `Link ${request.vehicleRegistration} to this taxi rank?`, [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Approve', onPress: () => resolve(true) },
          ]);
        });
    if (!confirmed) return;
    try {
      await approveRequest(request.id, user.userId || user.id, user.fullName || user.email);
      // Remove from pending list immediately so UI clears
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      setActiveTab('assigned');
      // Reload data in background to get updated assigned vehicles list
      loadData(true);
      showToast(`${request.vehicleRegistration} has been linked to this taxi rank`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to approve request', 'error');
    }
  }

  async function handleRejectRequest(request) {
    let reason = 'No reason provided';
    if (Platform.OS === 'web') {
      const input = window.prompt('Enter reason for rejection (optional):');
      if (input === null) return; // cancelled
      reason = input || 'No reason provided';
    } else {
      const result = await new Promise(resolve => {
        Alert.prompt('Reject Request', 'Enter reason for rejection (optional):', [
          { text: 'Cancel', onPress: () => resolve(null), style: 'cancel' },
          { text: 'Reject', style: 'destructive', onPress: (text) => resolve(text) },
        ], 'plain-text');
      });
      if (result === null) return;
      reason = result || 'No reason provided';
    }
    try {
      await rejectRequest(request.id, user.userId || user.id, user.fullName || user.email, reason);
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      showToast('Request rejected', 'success');
      loadData(true);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to reject request', 'error');
    }
  }

  async function handleAssignVehicle(vehicleId) {
    if (!adminProfile?.taxiRankId) return;
    
    try {
      await assignVehicleToTaxiRank(vehicleId, adminProfile.taxiRankId);
      setModalVisible(false);
      showToast('Vehicle assigned to taxi rank', 'success');
      loadData(true);
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to assign vehicle', 'error');
    }
  }

  async function handleUnassignVehicle(vehicleId) {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Remove this vehicle from the taxi rank?')
      : await new Promise(resolve => {
          Alert.alert('Unassign Vehicle', 'Remove this vehicle from the taxi rank?', [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
    if (!confirmed) return;
    try {
      await unassignVehicleFromTaxiRank(vehicleId);
      showToast('Vehicle removed from taxi rank', 'success');
      loadData(true);
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to unassign vehicle', 'error');
    }
  }

  const filteredAvailableVehicles = availableVehicles.filter(v =>
    v.registration?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading vehicles...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Fleet Management</Text>
          <Text style={[styles.headerSubtitle, { color: c.textMuted }]}>
            {assignedVehicles.length} assigned · {pendingRequests.length} pending
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assigned' && styles.activeTab]}
          onPress={() => setActiveTab('assigned')}
        >
          <Ionicons name="car" size={20} color={activeTab === 'assigned' ? GOLD : c.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'assigned' ? GOLD : c.textMuted }]}>Assigned</Text>
          {assignedVehicles.length > 0 && (
            <View style={[styles.badge, { backgroundColor: GOLD }]}>
              <Text style={styles.badgeText}>{assignedVehicles.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons name="time" size={20} color={activeTab === 'pending' ? GOLD : c.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'pending' ? GOLD : c.textMuted }]}>Requests</Text>
          {pendingRequests.length > 0 && (
            <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.badgeText}>{pendingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons name="search" size={20} color={activeTab === 'search' ? GOLD : c.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'search' ? GOLD : c.textMuted }]}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} tintColor={GOLD} />
        }
      >
        {/* Assigned Vehicles Tab */}
        {activeTab === 'assigned' && (
          assignedVehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color={c.textMuted} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>No Vehicles Assigned</Text>
              <Text style={[styles.emptyText, { color: c.textMuted }]}>
                Search for vehicles or approve pending requests
              </Text>
            </View>
          ) : (
            assignedVehicles.map(vehicle => (
              <View key={vehicle.id} style={[styles.vehicleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[styles.vehicleIconCircle, { backgroundColor: GOLD_LIGHT }]}>
                  <Ionicons name="car" size={24} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vehicleReg, { color: c.text }]}>{vehicle.registration}</Text>
                  <Text style={[styles.vehicleMake, { color: c.textMuted }]}>
                    {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
                  </Text>
                  {vehicle.status && (
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: vehicle.status === 'Active' ? '#22c55e' : '#9ca3af' }]} />
                      <Text style={[styles.statusText, { color: c.textMuted }]}>{vehicle.status}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.unassignBtn, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]}
                  onPress={() => handleUnassignVehicle(vehicle.id)}
                >
                  <Ionicons name="close" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          )
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          pendingRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={64} color={c.textMuted} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>No Pending Requests</Text>
              <Text style={[styles.emptyText, { color: c.textMuted }]}>
                Vehicle owners can request to link their vehicles to this taxi rank
              </Text>
            </View>
          ) : (
            pendingRequests.map(request => (
              <View key={request.id} style={[styles.requestCard, { backgroundColor: c.surface, borderColor: GOLD }]}>
                <View style={styles.requestHeader}>
                  <View style={[styles.vehicleIconCircle, { backgroundColor: GOLD_LIGHT }]}>
                    <Ionicons name="car" size={20} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vehicleReg, { color: c.text }]}>{request.vehicleRegistration}</Text>
                    <Text style={[styles.requestedBy, { color: c.textMuted }]}>
                      Requested by {request.requestedByName}
                    </Text>
                    <Text style={[styles.requestDate, { color: c.textMuted }]}>
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                {request.notes && (
                  <Text style={[styles.requestNotes, { color: c.textMuted }]}>{request.notes}</Text>
                )}
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]}
                    onPress={() => handleRejectRequest(request)}
                  >
                    <Ionicons name="close" size={18} color="#ef4444" />
                    <Text style={[styles.rejectBtnText, { color: '#ef4444' }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: GOLD }]}
                    onPress={() => handleApproveRequest(request)}
                  >
                    <Ionicons name="checkmark" size={18} color="#000" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <View>
            <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="search" size={20} color={c.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: c.text }]}
                placeholder="Search by registration number..."
                placeholderTextColor={c.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchVehicles}
              />
              <TouchableOpacity onPress={handleSearchVehicles} disabled={searching}>
                {searching ? (
                  <ActivityIndicator size="small" color={GOLD} />
                ) : (
                  <Ionicons name="arrow-forward" size={20} color={GOLD} />
                )}
              </TouchableOpacity>
            </View>

            {searchResults.length === 0 && searchQuery.trim() && !searching && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color={c.textMuted} />
                <Text style={[styles.emptyTitle, { color: c.text }]}>No Results</Text>
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No vehicles found with that registration</Text>
              </View>
            )}

            {searchResults.map(vehicle => (
              <View key={vehicle.id} style={[styles.vehicleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[styles.vehicleIconCircle, { backgroundColor: GOLD_LIGHT }]}>
                  <Ionicons name="car" size={24} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vehicleReg, { color: c.text }]}>{vehicle.registration}</Text>
                  <Text style={[styles.vehicleMake, { color: c.textMuted }]}>
                    {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
                  </Text>
                  {vehicle.taxiRankId && (
                    <Text style={[styles.alreadyLinked, { color: '#f59e0b' }]}>Already linked to a taxi rank</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.linkBtn, { backgroundColor: vehicle.taxiRankId ? '#9ca3af' : GOLD }]}
                  onPress={() => !vehicle.taxiRankId && handleAssignVehicle(vehicle.id)}
                  disabled={vehicle.taxiRankId}
                >
                  <Ionicons name="link" size={20} color={vehicle.taxiRankId ? '#fff' : '#000'} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6, position: 'relative' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: GOLD },
  tabText: { fontSize: 13, fontWeight: '700' },
  badge: { position: 'absolute', top: 8, right: 8, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#000', fontSize: 10, fontWeight: '900' },

  content: { padding: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },

  vehicleCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 12 },
  vehicleIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  vehicleReg: { fontSize: 16, fontWeight: '800' },
  vehicleMake: { fontSize: 13, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12 },
  unassignBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  linkBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  alreadyLinked: { fontSize: 11, marginTop: 4, fontWeight: '600' },

  requestCard: { padding: 16, borderRadius: 16, borderWidth: 2, marginBottom: 12 },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  requestedBy: { fontSize: 13, marginTop: 4 },
  requestDate: { fontSize: 11, marginTop: 2 },
  requestNotes: { fontSize: 13, marginBottom: 12, fontStyle: 'italic' },
  requestActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 6 },
  rejectBtnText: { fontSize: 14, fontWeight: '700' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 15 },
});
