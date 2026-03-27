import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, ActivityIndicator, Modal, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const GREEN = '#28a745';
const RED = '#dc3545';

export default function MarshalManagementScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const { admin, refresh } = route.params || {};
  
  // State
  const [marshals, setMarshals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMarshal, setSelectedMarshal] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [filterRank, setFilterRank] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMarshals();
  }, [refresh]);

  const loadMarshals = async () => {
    try {
      setLoading(true);
      
      let url = '/TaxiRankUsers/marshals';
      const params = {};
      
      if (filterRank) {
        params.taxiRankId = filterRank;
      }
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      const response = await client.get(url, { params });
      let marshalsData = response.data || [];
      
      // Apply search filter
      if (searchQuery) {
        marshalsData = marshalsData.filter(marshal => 
          marshal.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          marshal.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          marshal.phoneNumber?.includes(searchQuery)
        );
      }
      
      setMarshals(marshalsData);
    } catch (error) {
      console.error('Load marshals error:', error);
      Alert.alert('Error', 'Failed to load marshals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMarshals();
  };

  const confirmDelete = (marshal) => {
    setSelectedMarshal(marshal);
    setDeleteModalVisible(true);
  };

  const deleteMarshal = async () => {
    try {
      // Implement delete logic
      setDeleteModalVisible(false);
      setSelectedMarshal(null);
      loadMarshals();
    } catch (error) {
      console.error('Delete marshal error:', error);
      Alert.alert('Error', 'Failed to deactivate marshal');
    }
  };

  const toggleMarshalStatus = async (marshal) => {
    try {
      const newStatus = marshal.status === 'Active' ? 'Inactive' : 'Active';
      await client.put(`/TaxiRankUsers/${marshal.id}`, {
        ...marshal,
        status: newStatus
      });
      
      Alert.alert('Success', `Marshal ${newStatus.toLowerCase()} successfully`);
      loadMarshals();
    } catch (error) {
      console.error('Toggle status error:', error);
      Alert.alert('Error', 'Failed to update marshal status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return GREEN;
      case 'Inactive': return RED;
      case 'Suspended': return '#ff9500';
      default: return '#8e8e93';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active': return 'checkmark-circle';
      case 'Inactive': return 'close-circle';
      case 'Suspended': return 'warning';
      default: return 'help-circle';
    }
  };

  const getPermissionSummary = (permissions) => {
    if (!permissions || typeof permissions !== 'object') {
      return 'No permissions set';
    }
    const enabledPermissions = Object.keys(permissions).filter(key => permissions[key]);
    return `${enabledPermissions.length} permissions enabled`;
  };

  const filteredMarshals = marshals.filter(marshal => {
    if (filterStatus === 'all') return true;
    return marshal.status === filterStatus;
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Marshal Management</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={[styles.loadingText, { color: c.text }]}>Loading marshals...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marshal Management</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateMarshal', { admin })}>
          <Ionicons name="add-circle" size={24} color={GOLD} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GOLD]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search and Filters */}
        <View style={styles.searchSection}>
          <View style={[styles.searchContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="search-outline" size={20} color={c.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: c.text }]}
              placeholder="Search marshals..."
              placeholderTextColor={c.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.statNumber, { color: c.text }]}>{marshals.length}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Total Marshals</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.statNumber, { color: GREEN }]}>
              {marshals.filter(m => m.status === 'Active').length}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Active</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.statNumber, { color: RED }]}>
              {marshals.filter(m => m.status === 'Inactive').length}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Inactive</Text>
          </View>
        </View>

        {/* Marshals List */}
        {filteredMarshals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              {searchQuery ? 'No marshals found' : 'No marshals available'}
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: GOLD }]}
              onPress={() => navigation.navigate('CreateMarshal', { admin })}
            >
              <Ionicons name="add" size={16} color="#000" />
              <Text style={[styles.createButtonText, { color: '#000' }]}>Create Marshal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredMarshals.map((marshal) => (
            <View key={marshal.id} style={[styles.marshalCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.marshalHeader}>
                <View style={styles.marshalInfo}>
                  <Text style={[styles.marshalName, { color: c.text }]}>{marshal.fullName}</Text>
                  <Text style={[styles.marshalCode, { color: GOLD }]}>Code: {marshal.marshalCode}</Text>
                </View>
                <View style={styles.marshalStatus}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(marshal.status) + '20' }]}>
                    <Ionicons name={getStatusIcon(marshal.status)} size={12} color={getStatusColor(marshal.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(marshal.status) }]}>
                      {marshal.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Deactivate Marshal</Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.modalMessage, { color: c.text }]}>
                Are you sure you want to deactivate {selectedMarshal?.fullName}? 
                {'\n\n'}This will prevent them from accessing the marshal system.
              </Text>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: c.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton, { backgroundColor: RED }]}
                  onPress={deleteMarshal}
                >
                  <Text style={[styles.confirmButtonText, { color: '#fff' }]}>Deactivate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
  container: { flex: 1 },
  mainScroll: { flex: 1 },
  mainScrollContent: { paddingBottom: 20 },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: { marginTop: 12, fontSize: 16 },
  searchSection: { padding: 20 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4
  },
  statNumber: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  createButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600'
  },
  marshalCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1
  },
  marshalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  marshalInfo: { flex: 1 },
  marshalName: {
    fontSize: 16,
    fontWeight: '600'
  },
  marshalCode: {
    fontSize: 12,
    marginTop: 2
  },
  marshalStatus: { marginLeft: 12 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  modalContent: {
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxWidth: 400
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  modalBody: {
    padding: 20
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  cancelButton: {
    borderWidth: 1
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButton: {
    backgroundColor: '#dc3545'
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});
}
