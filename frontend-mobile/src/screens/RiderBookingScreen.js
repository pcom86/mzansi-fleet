import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, FlatList, RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const RED = '#dc3545';

export default function RiderBookingScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  // Form state
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [passengerCount, setPassengerCount] = useState(1);
  const [passengers, setPassengers] = useState([
    { name: '', contactNumber: '', email: '', idNumber: '', address: '', destination: '' }
  ]);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'ozow' | 'wallet' | 'cash'
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Data state
  const [schedules, setSchedules] = useState([]);
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Modals
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // ===== DATA LOADING =====
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const promises = [
        client.get('/TaxiRanks').catch(() => ({ data: [] })),
        client.get('/ScheduledTripBookings/schedules').catch(() => ({ data: [] })),
      ];

      const [rankResp, scheduleResp] = await Promise.all(promises);
      setTaxiRanks(rankResp.data || []);
      setSchedules(scheduleResp.data || []);
    } catch (err) {
      console.warn('Load data error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ===== HELPERS =====
  const selectedTaxiRank = taxiRanks.find(r => r.id === selectedSchedule?.taxiRankId);

  // ===== FORM HANDLERS =====
  function selectSchedule(schedule) {
    setSelectedSchedule(schedule);
    setScheduleModalVisible(false);
  }

  function selectPayment(method) {
    setPaymentMethod(method);
    setPaymentModalVisible(false);
  }

  function updatePassenger(index, field, value) {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  }

  function addPassenger() {
    setPassengers([...passengers, { name: '', contactNumber: '', email: '', idNumber: '', address: '', destination: '' }]);
  }

  function removePassenger(index) {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((_, i) => i !== index));
    }
  }

  function validateForm() {
    if (!selectedSchedule) return 'Please select a scheduled trip';
    if (!paymentMethod) return 'Please select a payment method';
    
    for (let i = 0; i < passengerCount; i++) {
      const p = passengers[i];
      if (!p.name.trim()) return `Passenger ${i + 1}: Name is required`;
      if (!p.contactNumber.trim()) return `Passenger ${i + 1}: Contact number is required`;
    }
    
    return null;
  }

  async function handleSubmit() {
    const error = validateForm();
    if (error) return Alert.alert('Validation Error', error);

    setSubmitting(true);
    try {
      const bookingData = {
        userId: user?.id,
        tripScheduleId: selectedSchedule.id,
        taxiRankId: selectedSchedule.taxiRankId,
        travelDate: selectedDate.toISOString(),
        seatsBooked: passengerCount,
        totalFare: selectedSchedule.standardFare * passengerCount,
        passengers: passengers.slice(0, passengerCount).map(p => ({
          name: p.name.trim(),
          contactNumber: p.contactNumber.trim(),
          email: p.email.trim() || null,
          idNumber: p.idNumber.trim() || null,
          address: p.address.trim() || null,
          destination: p.destination.trim() || selectedSchedule.destinationStation,
        })),
        paymentMethod,
        notes: notes.trim() || null,
      };

      const resp = await client.post('/ScheduledTripBookings', bookingData);
      Alert.alert('Booking Successful!', `Your booking has been confirmed. Booking ID: ${resp.data?.id}`);
      
      // Reset form
      setSelectedSchedule(null);
      setPassengers([{ name: '', contactNumber: '', email: '', idNumber: '', address: '', destination: '' }]);
      setPassengerCount(1);
      setPaymentMethod('');
      setNotes('');
    } catch (err) {
      Alert.alert('Booking Failed', err?.response?.data?.message || err?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  // ===== RENDER HELPERS =====
  function renderPassengerInput(index, passenger) {
    return (
      <View key={index} style={[styles.passengerCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.passengerHeader}>
          <Text style={[styles.passengerTitle, { color: c.text }]}>Passenger {index + 1}</Text>
          {passengerCount > 1 && (
            <TouchableOpacity onPress={() => removePassenger(index)} style={styles.removeBtn}>
              <Ionicons name="remove-circle-outline" size={20} color={RED} />
            </TouchableOpacity>
          )}
        </View>
        
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          placeholder="Full Name *"
          placeholderTextColor={c.textMuted}
          value={passenger.name}
          onChangeText={(value) => updatePassenger(index, 'name', value)}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          placeholder="Contact Number *"
          placeholderTextColor={c.textMuted}
          value={passenger.contactNumber}
          onChangeText={(value) => updatePassenger(index, 'contactNumber', value)}
          keyboardType="phone-pad"
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          placeholder="Email Address"
          placeholderTextColor={c.textMuted}
          value={passenger.email}
          onChangeText={(value) => updatePassenger(index, 'email', value)}
          keyboardType="email-address"
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          placeholder="ID Number"
          placeholderTextColor={c.textMuted}
          value={passenger.idNumber}
          onChangeText={(value) => updatePassenger(index, 'idNumber', value)}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          placeholder="Address"
          placeholderTextColor={c.textMuted}
          value={passenger.address}
          onChangeText={(value) => updatePassenger(index, 'address', value)}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          placeholder="Destination (if different from route destination)"
          placeholderTextColor={c.textMuted}
          value={passenger.destination}
          onChangeText={(value) => updatePassenger(index, 'destination', value)}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centerFull, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.textMuted, marginTop: 16 }]}>Loading available trips...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: GOLD }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Book a Trip</Text>
          <Text style={styles.headerSub}>Reserve your seat on a scheduled trip</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Schedule Selection */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Select Scheduled Trip *</Text>
        <TouchableOpacity 
          style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} 
          onPress={() => setScheduleModalVisible(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={GOLD} />
          <Text style={[styles.pickerText, { color: selectedSchedule ? c.text : c.textMuted }]}>
            {selectedSchedule
              ? `${selectedSchedule.routeName} (${selectedSchedule.departureStation} → ${selectedSchedule.destinationStation})`
              : 'Select a scheduled trip'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        {/* Travel Date */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Travel Date *</Text>
        <TouchableOpacity 
          style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} 
          onPress={() => setDatePickerVisible(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={GOLD} />
          <Text style={[styles.pickerText, { color: c.text }]}>
            {selectedDate.toLocaleDateString()}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        {/* Passenger Count */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Number of Passengers *</Text>
        <View style={styles.passengerCountRow}>
          <TouchableOpacity 
            style={[styles.passengerCountBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setPassengerCount(Math.max(1, passengerCount - 1))}
          >
            <Ionicons name="remove-outline" size={20} color={GOLD} />
          </TouchableOpacity>
          <Text style={[styles.passengerCountText, { color: c.text }]}>{passengerCount}</Text>
          <TouchableOpacity 
            style={[styles.passengerCountBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setPassengerCount(Math.min(10, passengerCount + 1))}
          >
            <Ionicons name="add-outline" size={20} color={GOLD} />
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Payment Method *</Text>
        <TouchableOpacity 
          style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} 
          onPress={() => setPaymentModalVisible(true)}
        >
          <Ionicons name="card-outline" size={18} color={GOLD} />
          <Text style={[styles.pickerText, { color: paymentMethod ? c.text : c.textMuted }]}>
            {paymentMethod === 'ozow' ? 'Ozow (EFT)' : paymentMethod === 'wallet' ? 'Mzansi Wallet' : paymentMethod === 'cash' ? 'Cash' : 'Select payment method'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        {/* Fare Summary */}
        {selectedSchedule && (
          <View style={[styles.fareSummary, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.fareTitle, { color: c.text }]}>Fare Summary</Text>
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: c.textMuted }]}>Standard Fare:</Text>
              <Text style={[styles.fareValue, { color: c.text }]}>R{selectedSchedule.standardFare}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: c.textMuted }]}>Passengers:</Text>
              <Text style={[styles.fareValue, { color: c.text }]}>×{passengerCount}</Text>
            </View>
            <View style={[styles.fareDivider, { backgroundColor: c.border }]} />
            <View style={styles.fareRow}>
              <Text style={[styles.fareTotal, { color: c.text }]}>Total Fare:</Text>
              <Text style={[styles.fareTotal, { color: GOLD }]}>R{(selectedSchedule.standardFare * passengerCount).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Passenger Details */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>Passenger Details *</Text>
        {passengers.slice(0, passengerCount).map((passenger, index) => renderPassengerInput(index, passenger))}

        {/* Notes */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Additional Notes</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
          placeholder="Any special requirements or notes"
          placeholderTextColor={c.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: GOLD }]} 
          onPress={handleSubmit} 
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
              <Text style={styles.submitBtnText}>Complete Booking</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Schedule Modal */}
      <Modal visible={scheduleModalVisible} animationType="slide" transparent onRequestClose={() => setScheduleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Scheduled Trip</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={schedules.filter(s => s.isActive)}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: selectedSchedule?.id === item.id ? GOLD_LIGHT : c.surface, borderColor: selectedSchedule?.id === item.id ? GOLD : c.border }]}
                  onPress={() => selectSchedule(item)}
                >
                  <Ionicons name="calendar-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.routeName}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.departureStation} → {item.destinationStation}</Text>
                    <Text style={[styles.listItemSub, { color: GOLD, fontWeight: '600', marginTop: 2 }]}>R{item.standardFare} per seat</Text>
                  </View>
                  {selectedSchedule?.id === item.id && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center', marginTop: 40 }]}>No scheduled trips available</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <TouchableOpacity
                style={[styles.paymentOption, { backgroundColor: paymentMethod === 'ozow' ? GOLD_LIGHT : c.surface, borderColor: c.border }]}
                onPress={() => selectPayment('ozow')}
              >
                <Ionicons name="card-outline" size={24} color={GOLD} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.paymentTitle, { color: c.text }]}>Ozow (EFT)</Text>
                  <Text style={[styles.paymentSub, { color: c.textMuted }]}>Pay via electronic funds transfer</Text>
                </View>
                {paymentMethod === 'ozow' && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentOption, { backgroundColor: paymentMethod === 'wallet' ? GOLD_LIGHT : c.surface, borderColor: c.border }]}
                onPress={() => selectPayment('wallet')}
              >
                <Ionicons name="wallet-outline" size={24} color={GOLD} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.paymentTitle, { color: c.text }]}>Mzansi Wallet</Text>
                  <Text style={[styles.paymentSub, { color: c.textMuted }]}>Pay using your Mzansi Wallet balance</Text>
                </View>
                {paymentMethod === 'wallet' && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentOption, { backgroundColor: paymentMethod === 'cash' ? GOLD_LIGHT : c.surface, borderColor: c.border }]}
                onPress={() => selectPayment('cash')}
              >
                <Ionicons name="cash-outline" size={24} color={GOLD} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.paymentTitle, { color: c.text }]}>Cash</Text>
                  <Text style={[styles.paymentSub, { color: c.textMuted }]}>Pay cash to the driver</Text>
                </View>
                {paymentMethod === 'cash' && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {datePickerVisible && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          minimumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setDatePickerVisible(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 50 },
  headerBack: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: '#fff', opacity: 0.9 },
  
  // Body
  body: { padding: 16 },
  
  // Form elements
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  pickerText: { flex: 1, marginLeft: 12, fontSize: 16 },
  
  // Passenger count
  passengerCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  passengerCountBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  passengerCountText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 24 },
  
  // Fare summary
  fareSummary: { padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  fareTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fareLabel: { fontSize: 14 },
  fareValue: { fontSize: 14, fontWeight: '500' },
  fareDivider: { height: 1, marginVertical: 8 },
  fareTotal: { fontSize: 16, fontWeight: 'bold' },
  
  // Passenger cards
  passengerCard: { padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  passengerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  passengerTitle: { fontSize: 16, fontWeight: '600' },
  removeBtn: { padding: 4 },
  input: { padding: 12, borderRadius: 6, borderWidth: 1, fontSize: 16, marginBottom: 12 },
  textArea: { padding: 12, borderRadius: 6, borderWidth: 1, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
  
  // Submit
  submitBtn: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  
  // List items
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  listItemTitle: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
  listItemSub: { fontSize: 14, marginLeft: 12, marginTop: 2 },
  emptyText: { fontSize: 16 },
  
  // Payment options
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  paymentTitle: { fontSize: 16, fontWeight: '600' },
  paymentSub: { fontSize: 14, marginTop: 2 },
});
