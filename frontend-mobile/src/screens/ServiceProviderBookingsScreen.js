import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
  TextInput, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  getMyProviderBookings,
  acceptMechanicalRequest,
  startMechanicalRequest,
  completeMechanicalRequest,
  declineMechanicalRequest,
  deleteMechanicalRequestByProvider,
  scheduleMechanicalRequest,
} from '../api/maintenance';
import { getMyServiceProviderProfile } from '../api/serviceProviderProfiles';

export default function ServiceProviderBookingsScreen({ navigation }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const { signOut } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [mileage, setMileage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);

  const load = useCallback(async () => {
    try {
      const [bookingsData, profileData] = await Promise.all([
        getMyProviderBookings(),
        getMyServiceProviderProfile().catch(() => null)
      ]);
      setBookings(bookingsData || []);
      setProfile(profileData);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onAccept(id) {
    try {
      await acceptMechanicalRequest(id);
      await load();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to accept booking');
    }
  }

  async function onStart(id) {
    try {
      await startMechanicalRequest(id);
      await load();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to start job');
    }
  }

  async function onComplete() {
    if (!completingId) return;
    try {
      setSubmitting(true);
      await completeMechanicalRequest(completingId, {
        mileageAtService: mileage ? parseInt(mileage, 10) : null,
        serviceCost: repairCost ? parseFloat(repairCost) : null,
        completionNotes: completionNotes || null,
        invoiceNumber: invoiceNumber || null,
      });
      await load();
      setModalVisible(false);
      setCompletingId(null);
      setCompletionNotes('');
      setRepairCost('');
      setInvoiceNumber('');
      setMileage('');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to complete job');
    } finally {
      setSubmitting(false);
    }
  }

  async function calculateDefaultCost(category, profile) {
    // Base rates for different service types
    const baseRates = {
      'Full Service': 800,
      'Oil Change': 350,
      'Mechanical': 600,
      'Electrical': 550,
      'Bodywork': 1200,
      'Towing': 450,
      'Diagnostics': 400,
      'Panel Beating': 1000,
    };
    
    // Get provider's hourly rate if available
    const hourlyRate = profile?.hourlyRate ? parseFloat(profile.hourlyRate) : 300;
    
    // Get call-out fee if available
    const callOutFee = profile?.callOutFee ? parseFloat(profile.callOutFee) : 150;
    
    // Calculate base cost
    let cost = baseRates[category] || hourlyRate * 2; // Default to 2 hours if unknown service
    
    // Add call-out fee if applicable
    if (category !== 'Full Service' && category !== 'Oil Change') {
      cost += callOutFee;
    }
    
    return cost;
  }

  function generateInvoiceNumber(businessName, date) {
    const prefix = businessName ? businessName.substring(0, 3).toUpperCase() : 'SP';
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${dateStr}-${random}`;
  }

  function openCompletionModal(booking) {
    setCompletingId(booking.id);
    // Auto-calculate cost if not already set
    if (!repairCost && profile) {
      const defaultCost = calculateDefaultCost(booking.category, profile);
      setRepairCost(defaultCost.toString());
    }
    // Auto-generate invoice number if not already set
    if (!invoiceNumber && profile) {
      const invoiceNum = generateInvoiceNumber(profile.businessName, new Date());
      setInvoiceNumber(invoiceNum);
    }
  }

  async function onDecline() {
    if (!decliningId || !declineReason.trim()) {
      Alert.alert('Validation', 'Please provide a reason for declining');
      return;
    }
    try {
      setSubmitting(true);
      await declineMechanicalRequest(decliningId, { reason: declineReason });
      await load();
      setDecliningId(null);
      setDeclineReason('');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to decline booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id) {
    Alert.alert(
      'Delete Booking',
      'Are you sure you want to delete this booking? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMechanicalRequestByProvider(id);
              await load();
              Alert.alert('Deleted', 'Booking has been deleted');
            } catch (err) {
              Alert.alert('Error', err?.message || 'Failed to delete booking');
            }
          }
        }
      ]
    );
  }

  function renderBooking({ item }) {
    const actions = [];
    if (item.state === 'Pending') {
      actions.push(
        <TouchableOpacity key="accept" style={[styles.actionBtn, { backgroundColor: '#22c55e' }]} onPress={() => onAccept(item.id)}>
          <Ionicons name="checkmark" size={14} color="#fff" />
          <Text style={styles.actionBtnTxt}>Accept</Text>
        </TouchableOpacity>,
        <TouchableOpacity key="decline" style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => setDecliningId(item.id)}>
          <Ionicons name="close" size={14} color="#fff" />
          <Text style={styles.actionBtnTxt}>Decline</Text>
        </TouchableOpacity>
      );
    }
    if (item.state === 'Accepted') {
      actions.push(
        <TouchableOpacity key="start" style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={() => onStart(item.id)}>
          <Ionicons name="play" size={14} color="#fff" />
          <Text style={styles.actionBtnTxt}>Start</Text>
        </TouchableOpacity>
      );
    }
    if (item.state === 'In Progress') {
      actions.push(
        <TouchableOpacity key="complete" style={[styles.actionBtn, { backgroundColor: '#22c55e' }]} onPress={() => openCompletionModal(item)}>
          <Ionicons name="checkmark" size={14} color="#fff" />
          <Text style={styles.actionBtnTxt}>Complete</Text>
        </TouchableOpacity>
      );
    }
    if (item.state === 'Scheduled') {
      actions.push(
        <TouchableOpacity key="decline" style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => setDecliningId(item.id)}>
          <Ionicons name="close" size={14} color="#fff" />
          <Text style={styles.actionBtnTxt}>Decline</Text>
        </TouchableOpacity>,
        <TouchableOpacity key="delete" style={[styles.actionBtn, { backgroundColor: '#6b7280' }]} onPress={() => onDelete(item.id)}>
          <Ionicons name="trash" size={14} color="#fff" />
          <Text style={styles.actionBtnTxt}>Delete</Text>
        </TouchableOpacity>
      );
    }

    const statusColors = {
      Pending: '#f59e0b',
      Accepted: '#3b82f6',
      InProgress: '#8b5cf6',
      Completed: '#22c55e',
      Declined: '#ef4444',
    };

    return (
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{item.category}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColors[item.state] + '20', borderColor: statusColors[item.state] }]}>
            <Text style={[styles.statusText, { color: statusColors[item.state] }]}>{item.state}</Text>
          </View>
        </View>
        <Text style={[styles.cardDesc, { color: c.text }]}>{item.description}</Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.metaText, { color: c.textMuted }]}>
            {new Date(item.createdAt).toLocaleDateString('en-ZA')}
          </Text>
          {item.scheduledDate && (
            <Text style={[styles.metaText, { color: c.primary }]}>
              Scheduled: {new Date(item.scheduledDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(item.scheduledDate).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
          {item.vehicleRegistration && (
            <Text style={[styles.metaText, { color: c.textMuted }]}>
              Vehicle: {item.vehicleRegistration}
            </Text>
          )}
        </View>
        {actions.length > 0 && <View style={styles.actionRow}>{actions}</View>}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
      >
        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="calendar-outline" size={48} color={c.textMuted} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>No Bookings</Text>
              <Text style={[styles.emptySub, { color: c.textMuted }]}>You don't have any service bookings yet</Text>
            </View>
          }
          scrollEnabled={false}
        />
      </ScrollView>

      {/* Complete Job Modal */}
      <Modal visible={!!completingId} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Complete Job</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="Completion notes (optional)"
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
            />
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="Repair cost (R)"
              value={repairCost}
              onChangeText={setRepairCost}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="Invoice number (optional)"
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
            />
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="Mileage at service (optional)"
              value={mileage}
              onChangeText={setMileage}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: c.border }]} onPress={() => {
                setCompletingId(null);
                setCompletionNotes('');
                setRepairCost('');
                setInvoiceNumber('');
                setMileage('');
              }}>
                <Text style={[styles.modalBtnText, { color: c.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.primary }]} onPress={onComplete} disabled={submitting}>
                <Text style={styles.modalBtnText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Decline Modal */}
      <Modal visible={!!decliningId} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Decline Booking</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="Reason for declining"
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: c.border }]} onPress={() => setDecliningId(null)}>
                <Text style={[styles.modalBtnText, { color: c.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#ef4444' }]} onPress={onDecline} disabled={submitting}>
                <Text style={styles.modalBtnText}>Decline</Text>
              </TouchableOpacity>
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
    card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: '800' },
    statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '800' },
    cardDesc: { fontSize: 14, color: '#666', marginBottom: 8 },
    cardMeta: { gap: 4 },
    metaText: { fontSize: 12 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
    actionBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    empty: { borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 20 },
    emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
    emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    modalBtnText: { fontSize: 14, fontWeight: '700' },
  });
}
