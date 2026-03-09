import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { client } from '../api/client';

const GOLD = '#FFD700';
const GREEN = '#28a745';
const RED = '#dc3545';
const BLUE = '#007bff';

export default function MarshalManagementScreen({ navigation, route }) {
  const { colors: c } = useTheme();
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
      
      let url = '/QueueMarshals';
      const params = {};
      
      if (filterRank) {
        url = `/QueueMarshals/by-rank/${filterRank}`;
      }
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      const response = await client.get(url, { params });
      let marshalsData = response.data || [];
      
      // Apply search filter
      if (searchQuery) {
        marshalsData = marshalsData.filter(marshal => 
          marshal.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          marshal.marshalCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          marshal.phoneNumber.includes(searchQuery)
        );
      }
      
      setMarshals(marshalsData);
    } catch (error) {
      console.error('Load marshals error:', error);
      Alert.alert('Error', 'Failed to load marshals');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMarshals();
    setRefreshing(false);
  }, [filterRank, filterStatus, searchQuery]);

  const confirmDelete = (marshal) => {
    setSelectedMarshal(marshal);
    setDeleteModalVisible(true);
  };

  const deleteMarshal = async () => {
    if (!selectedMarshal) return;
    
    try {
      await client.delete(`/QueueMarshals/${selectedMarshal.id}`);
      Alert.alert('Success', 'Marshal deactivated successfully');
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
      await client.put(`/QueueMarshals/${marshal.id}`, {
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
      case 'Suspended': return GOLD;
      default: return c.textMuted;
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
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterStatus === 'all' && { backgroundColor: GOLD }
            ]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === 'all' && { color: '#000' }
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterStatus === 'Active' && { backgroundColor: GREEN }
            ]}
            onPress={() => setFilterStatus('Active')}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === 'Active' && { color: '#fff' }
            ]}>
              Active
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterStatus === 'Inactive' && { backgroundColor: RED }
            ]}
            onPress={() => setFilterStatus('Inactive')}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === 'Inactive' && { color: '#fff' }
            ]}>
              Inactive
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GOLD]} />
        }
        showsVerticalScrollIndicator={false}
      >
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
              {/* Header */}
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

              {/* Contact Info */}
              <View style={styles.contactInfo}>
                <View style={styles.contactItem}>
                  <Ionicons name="phone-portrait-outline" size={16} color={c.textMuted} />
                  <Text style={[styles.contactText, { color: c.text }]}>{marshal.phoneNumber}</Text>
                </View>
                {marshal.email && (
                  <View style={styles.contactItem}>
                    <Ionicons name="mail-outline" size={16} color={c.textMuted} />
                    <Text style={[styles.contactText, { color: c.text }]}>{marshal.email}</Text>
                  </View>
                )}
              </View>

              {/* Assignment */}
              <View style={styles.assignmentInfo}>
                <View style={styles.assignmentItem}>
                  <Ionicons name="location-outline" size={16} color={c.textMuted} />
                  <Text style={[styles.assignmentText, { color: c.text }]}>
                    {marshal.taxiRank?.name || 'Unassigned'}
                  </Text>
                </View>
                <View style={styles.assignmentItem}>
                  <Ionicons name="shield-outline" size={16} color={c.textMuted} />
                  <Text style={[styles.assignmentText, { color: c.text }]}>
                    {getPermissionSummary(marshal.permissions)}
                  </Text>
                </View>
              </View>

              {/* Emergency Contact */}
              {marshal.emergencyContact && (
                <View style={styles.emergencyInfo}>
                  <Ionicons name="call-outline" size={16} color={RED} />
                  <Text style={[styles.emergencyText, { color: c.text }]}>
                    Emergency: {marshal.emergencyContact}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton, { backgroundColor: GOLD }]}
                  onPress={() => navigation.navigate('EditMarshal', { marshal })}
                >
                  <Ionicons name="create-outline" size={14} color="#000" />
                  <Text style={[styles.actionButtonText, { color: '#000' }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.statusButton,
                    { backgroundColor: marshal.status === 'Active' ? RED : GREEN }
                  ]}
                  onPress={() => toggleMarshalStatus(marshal)}
                >
                  <Ionicons 
                    name={marshal.status === 'Active' ? 'pause-outline' : 'play-outline'} 
                    size={14} 
                    color="#fff" 
                  />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                    {marshal.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton, { backgroundColor: RED }]}
                  onPress={() => confirmDelete(marshal)}
                >
                  <Ionicons name="trash-outline" size={14} color="#fff" />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>Delete</Text>
                </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  loadingText: {
    marginTop: 16,
    fontSize: 16
  },

  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16
  },
  filtersScroll: {
    flexDirection: 'row',
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)'
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600'
  },

  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800'
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4
  },

  content: { flex: 1, paddingHorizontal: 20 },
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
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600'
  },

  marshalCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden'
  },
  marshalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8
  },
  marshalInfo: {
    flex: 1
  },
  marshalName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4
  },
  marshalCode: {
    fontSize: 14,
    fontWeight: '600'
  },
  marshalStatus: {
    alignItems: 'flex-end'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },

  contactInfo: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500'
  },

  assignmentInfo: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  assignmentText: {
    fontSize: 13,
    fontWeight: '500'
  },

  emergencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,0,0,0.05)'
  },
  emergencyText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600'
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
    backgroundColor: RED
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});
