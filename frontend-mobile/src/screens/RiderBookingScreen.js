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
  const [paymentMethod, setPaymentMethod] = useState(''); // 'ozow' | 'wallet' | 'cash'
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cart state
  const [passengerCart, setPassengerCart] = useState([]);
  const [currentPassenger, setCurrentPassenger] = useState({
    name: '',
    contactNumber: '',
    email: '',
    idNumber: '',
    address: '',
    destination: ''
  });

  // UI state
  const [showCart, setShowCart] = useState(false);
  const [step, setStep] = useState('add'); // 'add' | 'cart' | 'payment' | 'confirmation'

  // Data state
  const [schedules, setSchedules] = useState([]);
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Modals
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [destinationModalVisible, setDestinationModalVisible] = useState(false);

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

  // ===== FARE CALCULATION =====
  const calculateFareForDestination = (destination) => {
    if (!selectedSchedule) return 0;
    
    const baseFare = selectedSchedule.standardFare || 0;
    
    // If destination is the final destination, use base fare
    if (destination === selectedSchedule.destinationStation) {
      return baseFare;
    }
    
    // Calculate fare based on stops along the route
    const stops = selectedSchedule.stops || [];
    const destinationIndex = stops.findIndex(stop => 
      stop.name === destination || stop.station === destination
    );
    
    if (destinationIndex >= 0) {
      // Use fare from the specific stop if available
      const stopFare = stops[destinationIndex].fare;
      if (stopFare) return stopFare;
      
      // Otherwise calculate proportionally based on stop position
      const stopProgress = (destinationIndex + 1) / (stops.length + 1);
      return Math.round(baseFare * stopProgress * 100) / 100;
    }
    
    // For destinations not on the route, use multipliers
    const destinationMultipliers = {
      // Major cities might have higher fares
      'Johannesburg': 1.5,
      'Pretoria': 1.3,
      'Durban': 1.4,
      'Cape Town': 1.6,
      'Port Elizabeth': 1.2,
      'Bloemfontein': 1.1,
      'Polokwane': 1.2,
      'Nelspruit': 1.3,
      'Kimberley': 1.1,
      // Smaller towns might have lower fares
      'Middelburg': 0.8,
      'Witbank': 0.9,
      'Secunda': 0.9,
      'Standerton': 0.8,
    };
    
    const multiplier = destinationMultipliers[destination] || 1.0;
    return Math.round(baseFare * multiplier * 100) / 100; // Round to 2 decimal places
  };

  const calculateTotalFare = () => {
    return passengerCart.reduce((total, passenger) => {
      const destination = passenger.destination?.trim() || selectedSchedule?.destinationStation;
      return total + calculateFareForDestination(destination);
    }, 0);
  };

  const getCartSize = () => passengerCart.length;

  // ===== ROUTE STOPS & DESTINATIONS =====
  const getRouteStopsAndDestinations = () => {
    if (!selectedSchedule) return [];
    
    const destinations = [];
    
    // Add actual route stops if available - these should be the primary destinations
    if (selectedSchedule.stops && selectedSchedule.stops.length > 0) {
      selectedSchedule.stops.forEach(stop => {
        const stopName = stop.name || stop.station || stop.destination;
        if (stopName && !destinations.includes(stopName)) {
          destinations.push(stopName);
        }
      });
    }
    
    // Always include the final destination
    const finalDestination = selectedSchedule.destinationStation || 'Route Destination';
    if (!destinations.includes(finalDestination)) {
      destinations.push(finalDestination);
    }
    
    // If no actual stops are available, use fallback destinations
    if (destinations.length <= 1) {
      const commonDestinations = [
        // Major cities (ordered by likely importance)
        'Johannesburg',
        'Pretoria', 
        'Durban',
        'Cape Town',
        'Port Elizabeth',
        'Bloemfontein',
        'Polokwane',
        'Nelspruit',
        'Kimberley',
        
        // Smaller towns and stops
        'Middelburg',
        'Witbank', 
        'Secunda',
        'Standerton',
        'Belfast',
        'Middelburg (Mpumalanga)',
        'Hendrina',
        'Kriel',
        'Ermelo',
        'Carolina',
        'Badplaas',
        'Barberton',
        'Malelane',
        'Komatiepoort',
        'Matsulu',
        'Kanyamazane',
        'Kaapmuiden',
        'Nelspruit Plaza',
        'Riverside Mall',
        'Ilanga Mall',
      ];
      
      destinations.push(...commonDestinations);
    }
    
    // Remove duplicates and filter out empty values
    return [...new Set(destinations.filter(Boolean))];
  };

  // ===== FORM HANDLERS =====
  function selectSchedule(schedule) {
    setSelectedSchedule(schedule);
    setScheduleModalVisible(false);
  }

  function selectPayment(method) {
    setPaymentMethod(method);
    setPaymentModalVisible(false);
  }

  // ===== DESTINATION SELECTION =====
  function selectDestination(destination) {
    updateCurrentPassenger('destination', destination);
    setDestinationModalVisible(false);
  }

  // ===== CART MANAGEMENT =====
  function updateCurrentPassenger(field, value) {
    setCurrentPassenger(prev => ({ ...prev, [field]: value }));
  }

  function addPassengerToCart() {
    // Validate current passenger
    if (!currentPassenger.name.trim()) {
      Alert.alert('Validation Error', 'Passenger name is required');
      return;
    }
    if (!currentPassenger.contactNumber.trim()) {
      Alert.alert('Validation Error', 'Contact number is required');
      return;
    }

    // Add to cart
    const newPassenger = {
      ...currentPassenger,
      id: Date.now().toString(), // Simple unique ID
      name: currentPassenger.name.trim(),
      contactNumber: currentPassenger.contactNumber.trim(),
      email: currentPassenger.email.trim() || '',
      idNumber: currentPassenger.idNumber.trim() || '',
      address: currentPassenger.address.trim() || '',
      destination: currentPassenger.destination.trim() || selectedSchedule?.destinationStation || '',
    };

    setPassengerCart(prev => [...prev, newPassenger]);
    
    // Reset current passenger form
    setCurrentPassenger({
      name: '',
      contactNumber: '',
      email: '',
      idNumber: '',
      address: '',
      destination: ''
    });

    Alert.alert('Success', `${newPassenger.name} added to cart`);
  }

  function removePassengerFromCart(passengerId) {
    const passenger = passengerCart.find(p => p.id === passengerId);
    setPassengerCart(prev => prev.filter(p => p.id !== passengerId));
    if (passenger) {
      Alert.alert('Removed', `${passenger.name} removed from cart`);
    }
  }

  function clearCart() {
    setPassengerCart([]);
    Alert.alert('Cart Cleared', 'All passengers removed from cart');
  }

  function proceedToCheckout() {
    if (passengerCart.length === 0) {
      Alert.alert('Cart Empty', 'Please add passengers to cart first');
      return;
    }
    setStep('payment');
  }

  function goBackToAddPassengers() {
    setStep('add');
  }

  function validateForm() {
    if (!selectedSchedule) return 'Please select a scheduled trip';
    if (!paymentMethod) return 'Please select a payment method';
    if (passengerCart.length === 0) return 'Please add passengers to cart';
    return null;
  }

  async function handleSubmit() {
    const error = validateForm();
    if (error) return Alert.alert('Validation Error', error);

    setSubmitting(true);
    try {
      const bookingData = {
        userId: user?.id,
        routeId: selectedSchedule.id, // Changed from tripScheduleId to routeId
        travelDate: selectedDate.toISOString(),
        seatsBooked: passengerCart.length,
        totalFare: calculateTotalFare(),
        passengers: passengerCart.map(p => ({
          name: p.name,
          contactNumber: p.contactNumber,
          email: p.email || null,
          idNumber: p.idNumber || null,
          address: p.address || null,
          destination: p.destination || selectedSchedule.destinationStation,
        })),
        paymentMethod,
        notes: notes.trim() || null,
      };

      const resp = await client.post('/ScheduledTripBookings', bookingData);
      Alert.alert('Booking Successful!', `${passengerCart.length} passenger(s) booked successfully! Booking ID: ${resp.data?.id}`);
      
      // Reset everything
      setSelectedSchedule(null);
      setPassengerCart([]);
      setCurrentPassenger({
        name: '',
        contactNumber: '',
        email: '',
        idNumber: '',
        address: '',
        destination: ''
      });
      setPaymentMethod('');
      setNotes('');
      setStep('add');
    } catch (err) {
      Alert.alert('Booking Failed', err?.response?.data?.message || err?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  // ===== RENDER HELPERS =====
  function renderAddPassengerForm() {
    return (
      <View>
        {/* Current Passenger Form */}
        <View style={[styles.passengerCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.passengerHeader}>
            <View style={styles.passengerHeaderLeft}>
              <Ionicons name="person-add-outline" size={20} color={GOLD} />
              <Text style={[styles.passengerTitle, { color: c.text, marginLeft: 8 }]}>Add Passenger</Text>
            </View>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getCartSize()}</Text>
            </View>
          </View>
          
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={[styles.label, { color: c.textMuted }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                placeholder="Enter full name"
                placeholderTextColor={c.textMuted}
                value={currentPassenger.name}
                onChangeText={(value) => updateCurrentPassenger('name', value)}
              />
            </View>
            
            <View style={styles.formHalf}>
              <Text style={[styles.label, { color: c.textMuted }]}>Contact Number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                placeholder="Phone number"
                placeholderTextColor={c.textMuted}
                value={currentPassenger.contactNumber}
                onChangeText={(value) => updateCurrentPassenger('contactNumber', value)}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={[styles.label, { color: c.textMuted }]}>Email Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                placeholder="Email (optional)"
                placeholderTextColor={c.textMuted}
                value={currentPassenger.email}
                onChangeText={(value) => updateCurrentPassenger('email', value)}
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.formHalf}>
              <Text style={[styles.label, { color: c.textMuted }]}>ID Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                placeholder="ID number (optional)"
                placeholderTextColor={c.textMuted}
                value={currentPassenger.idNumber}
                onChangeText={(value) => updateCurrentPassenger('idNumber', value)}
              />
            </View>
          </View>
          
          <Text style={[styles.label, { color: c.textMuted }]}>Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Address (optional)"
            placeholderTextColor={c.textMuted}
            value={currentPassenger.address}
            onChangeText={(value) => updateCurrentPassenger('address', value)}
          />
          
          <Text style={[styles.label, { color: c.textMuted }]}>Destination</Text>
          <TouchableOpacity 
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, justifyContent: 'center' }]} 
            onPress={() => setDestinationModalVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={[styles.pickerText, { color: currentPassenger.destination ? c.text : c.textMuted }]}>
                {currentPassenger.destination || 'Select destination...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={c.textMuted} style={styles.pickerIcon} />
            </View>
          </TouchableOpacity>
          
          {/* Show fare for this passenger's destination */}
          {currentPassenger.destination && (
            <View style={[styles.fareHint, { backgroundColor: GOLD_LIGHT, borderColor: GOLD }]}>
              <Ionicons name="cash-outline" size={14} color={GOLD} />
              <Text style={[styles.fareHintText, { color: GOLD }]}>
                Fare for {currentPassenger.destination}: R{calculateFareForDestination(currentPassenger.destination).toFixed(2)}
              </Text>
            </View>
          )}
          
          <View style={styles.formActions}>
            <TouchableOpacity 
              style={[styles.addToCartBtn, { backgroundColor: GOLD }]} 
              onPress={addPassengerToCart}
              activeOpacity={0.85}
            >
              <Ionicons name="cart-outline" size={18} color="#000" />
              <Text style={styles.addToCartBtnText}>Add to Cart</Text>
            </TouchableOpacity>
            
            {getCartSize() > 0 && (
              <TouchableOpacity 
                style={[styles.proceedBtn, { backgroundColor: c.surface, borderColor: GOLD, borderWidth: 1 }]} 
                onPress={proceedToCheckout}
                activeOpacity={0.85}
              >
                <Text style={[styles.proceedBtnText, { color: GOLD }]}>Proceed to Payment ({getCartSize()})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  function renderCart() {
    return (
      <View>
        <View style={[styles.cartHeader, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cartTitle, { color: c.text }]}>Shopping Cart ({getCartSize()} passengers)</Text>
          {getCartSize() > 0 && (
            <TouchableOpacity onPress={clearCart} style={styles.clearCartBtn}>
              <Ionicons name="trash-outline" size={16} color={RED} />
              <Text style={[styles.clearCartText, { color: RED }]}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {getCartSize() === 0 ? (
          <View style={[styles.emptyCart, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="cart-outline" size={48} color={c.textMuted} />
            <Text style={[styles.emptyCartText, { color: c.textMuted }]}>Your cart is empty</Text>
            <Text style={[styles.emptyCartSubText, { color: c.textMuted }]}>Add passengers to get started</Text>
          </View>
        ) : (
          <View>
            {passengerCart.map((passenger, index) => (
              <View key={passenger.id} style={[styles.cartItem, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.cartItemHeader}>
                  <Text style={[styles.cartItemTitle, { color: c.text }]}>Passenger {index + 1}</Text>
                  <TouchableOpacity onPress={() => removePassengerFromCart(passenger.id)}>
                    <Ionicons name="remove-circle-outline" size={20} color={RED} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cartItemDetail, { color: c.text }]}>Name: {passenger.name}</Text>
                <Text style={[styles.cartItemDetail, { color: c.text }]}>Phone: {passenger.contactNumber}</Text>
                {passenger.destination && (
                  <Text style={[styles.cartItemDetail, { color: c.text }]}>Destination: {passenger.destination}</Text>
                )}
                <Text style={[styles.cartItemFare, { color: GOLD }]}>
                  Fare: R{calculateFareForDestination(passenger.destination || selectedSchedule?.destinationStation).toFixed(2)}
                </Text>
              </View>
            ))}
            
            <View style={[styles.cartSummary, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cartTotal, { color: c.text }]}>Total Fare:</Text>
              <Text style={[styles.cartTotalAmount, { color: GOLD }]}>R{calculateTotalFare().toFixed(2)}</Text>
            </View>
          </View>
        )}
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

        {/* Step Navigation */}
        <View style={styles.stepNav}>
          <TouchableOpacity 
            style={[styles.stepBtn, step === 'add' && styles.activeStepBtn, { backgroundColor: step === 'add' ? GOLD : c.surface, borderColor: c.border }]}
            onPress={() => setStep('add')}
          >
            <Text style={[styles.stepBtnText, { color: step === 'add' ? '#000' : c.text }]}>Add Passengers</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.stepBtn, step === 'payment' && styles.activeStepBtn, { backgroundColor: step === 'payment' ? GOLD : c.surface, borderColor: c.border }]}
            onPress={() => getCartSize() > 0 && setStep('payment')}
            disabled={getCartSize() === 0}
          >
            <Text style={[styles.stepBtnText, { color: step === 'payment' ? '#000' : c.textMuted }]}>
              Payment ({getCartSize()})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Content Based on Step */}
        {step === 'add' && (
          <View>
            {renderAddPassengerForm()}
            {renderCart()}
          </View>
        )}

        {step === 'payment' && (
          <View>
            {/* Cart Summary */}
            {renderCart()}
            
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

            {/* Action Buttons */}
            <View style={styles.paymentActions}>
              <TouchableOpacity 
                style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} 
                onPress={goBackToAddPassengers}
              >
                <Ionicons name="arrow-back" size={18} color={c.text} />
                <Text style={[styles.backBtnText, { color: c.text }]}>Back to Cart</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.checkoutBtn, { backgroundColor: GOLD }]} 
                onPress={handleSubmit} 
                disabled={submitting || !paymentMethod}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
                    <Text style={styles.checkoutBtnText}>Pay R{calculateTotalFare().toFixed(2)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
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

      {/* Destination Dropdown Modal */}
      <Modal visible={destinationModalVisible} transparent animationType="fade" onRequestClose={() => setDestinationModalVisible(false)}>
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: 'center' }]} activeOpacity={1} onPress={() => setDestinationModalVisible(false)}>
          <View style={[styles.destinationPickerContent, { backgroundColor: c.background }]}>
            <View style={styles.destinationPickerHeader}>
              <Text style={[styles.destinationPickerTitle, { color: c.text }]}>Select Destination</Text>
              <TouchableOpacity onPress={() => setDestinationModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={getRouteStopsAndDestinations()}
              keyExtractor={(item, index) => `destination-${index}`}
              ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: 'center', padding: 20 }}>No destinations available</Text>}
              renderItem={({ item: destination }) => (
                <TouchableOpacity
                  style={[
                    styles.destinationPickerItem, 
                    { borderColor: c.border },
                    currentPassenger.destination === destination && { backgroundColor: GOLD_LIGHT }
                  ]}
                  onPress={() => selectDestination(destination)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons 
                      name="location-outline" 
                      size={18} 
                      color={currentPassenger.destination === destination ? GOLD : c.textMuted} 
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.destinationPickerName, { color: c.text }]}>{destination}</Text>
                      <Text style={[styles.destinationPickerFare, { color: GOLD }]}>
                        Fare: R{calculateFareForDestination(destination).toFixed(2)}
                      </Text>
                    </View>
                    {currentPassenger.destination === destination && (
                      <Ionicons name="checkmark-circle" size={20} color={GOLD} />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  passengerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  passengerHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  passengerTitle: { fontSize: 16, fontWeight: '600' },
  removeBtn: { padding: 4 },
  input: { padding: 12, borderRadius: 6, borderWidth: 1, fontSize: 16, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  formRow: { flexDirection: 'row', gap: 12 },
  formHalf: { flex: 1 },
  fareHint: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 8, 
    borderRadius: 6, 
    borderWidth: 1, 
    marginTop: 4,
    marginBottom: 12 
  },
  fareHintText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  textArea: { padding: 12, borderRadius: 6, borderWidth: 1, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
  
  // Cart UI
  cartBadge: { 
    backgroundColor: GOLD, 
    borderRadius: 12, 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center'
  },
  cartBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  formActions: { marginTop: 16 },
  addToCartBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 14, 
    borderRadius: 8,
    marginBottom: 8
  },
  addToCartBtnText: { fontSize: 16, fontWeight: '600', color: '#000', marginLeft: 8 },
  proceedBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 12, 
    borderRadius: 8
  },
  proceedBtnText: { fontSize: 14, fontWeight: '600' },
  
  // Step Navigation
  stepNav: { flexDirection: 'row', marginTop: 20, marginBottom: 20, gap: 8 },
  stepBtn: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeStepBtn: { borderWidth: 2 },
  stepBtnText: { fontSize: 14, fontWeight: '600' },
  
  // Cart Components
  cartHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 8, 
    borderWidth: 1, 
    marginBottom: 16 
  },
  cartTitle: { fontSize: 18, fontWeight: '700' },
  clearCartBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearCartText: { fontSize: 12, fontWeight: '600' },
  
  emptyCart: { 
    padding: 32, 
    borderRadius: 8, 
    borderWidth: 1, 
    alignItems: 'center',
    marginBottom: 16 
  },
  emptyCartText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyCartSubText: { fontSize: 14, marginTop: 4 },
  
  cartItem: { 
    padding: 16, 
    borderRadius: 8, 
    borderWidth: 1, 
    marginBottom: 12 
  },
  cartItemHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  cartItemTitle: { fontSize: 16, fontWeight: '600' },
  cartItemDetail: { fontSize: 14, marginBottom: 2, color: c.text },
  cartItemFare: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  
  cartSummary: { 
    padding: 16, 
    borderRadius: 8, 
    borderWidth: 1, 
    marginBottom: 16 
  },
  cartTotal: { fontSize: 16, fontWeight: '700' },
  cartTotalAmount: { fontSize: 16, fontWeight: '700' },
  
  // Payment Actions
  paymentActions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 24 
  },
  backBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 14, 
    borderRadius: 8, 
    borderWidth: 1 
  },
  backBtnText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  checkoutBtn: { 
    flex: 2, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 14, 
    borderRadius: 8 
  },
  checkoutBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  
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

  // Destination Picker Styles
  destinationPickerContent: {
    borderRadius: 16,
    marginHorizontal: 24,
    marginVertical: 'auto',
    maxHeight: '70%',
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  destinationPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  destinationPickerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  destinationPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  destinationPickerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  destinationPickerFare: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Picker Button Styles
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  pickerIcon: {
    position: 'absolute',
    right: 12,
  },
});
