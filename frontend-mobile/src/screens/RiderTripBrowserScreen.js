import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, Modal, FlatList, RefreshControl, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';
import { createTripBooking } from '../api/taxiRanks';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const RED = '#dc3545';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RiderTripBrowserScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  // Data state
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [scheduledTrips, setScheduledTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [selectedRankId, setSelectedRankId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Booking modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ===== DATA LOADING =====
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const promises = [
        client.get('/TaxiRanks').catch(() => ({ data: [] })),
      ];

      const [rankResp] = await Promise.all(promises);
      setTaxiRanks(rankResp.data || []);

      // Load scheduled trips if we have a selected rank
      if (selectedRankId) {
        await loadScheduledTrips(selectedRankId);
      }
    } catch (err) {
      console.warn('Load data error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRankId, selectedDate]);

  const loadScheduledTrips = async (rankId) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const resp = await client.get('/ScheduledTrips/by-rank', {
        params: { 
          taxiRankId: rankId,
          date: dateStr 
        }
      });
      setScheduledTrips(resp.data || []);
    } catch (err) {
      console.warn('Load scheduled trips error:', err?.message);
      setScheduledTrips([]);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (selectedRankId) {
      loadScheduledTrips(selectedRankId);
    }
  }, [selectedRankId, selectedDate]);

  // ===== HELPERS =====
  const formatTime = (time) => {
    if (!time) return '--:--';
    if (typeof time === 'string' && time.includes(':')) {
      const parts = time.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return time;
  };

  const calculateDuration = (departure, arrival) => {
    if (!departure || !arrival) return null;
    const depParts = departure.split(':');
    const arrParts = arrival.split(':');
    if (depParts.length < 2 || arrParts.length < 2) return null;
    
    const depMinutes = parseInt(depParts[0]) * 60 + parseInt(depParts[1]);
    let arrMinutes = parseInt(arrParts[0]) * 60 + parseInt(arrParts[1]);
    
    // Handle overnight trips
    if (arrMinutes < depMinutes) arrMinutes += 24 * 60;
    
    const duration = arrMinutes - depMinutes;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // ===== BOOKING HANDLERS =====
  const openBookingModal = (trip) => {
    setSelectedTrip(trip);
    setSeatsToBook(1);
    setSelectedSeats([]);
    setPassengerName(user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '');
    setPassengerPhone(user?.phoneNumber || '');
    setPassengerEmail(user?.email || '');
    setPaymentMethod('');
    setBookingModalVisible(true);
  };

  const closeBookingModal = () => {
    setBookingModalVisible(false);
    setSelectedTrip(null);
  };

  const toggleSeat = (seatNumber) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatNumber)) {
        return prev.filter(s => s !== seatNumber);
      }
      if (prev.length >= seatsToBook) {
        // Remove first seat and add new one
        return [...prev.slice(1), seatNumber];
      }
      return [...prev, seatNumber].sort((a, b) => a - b);
    });
  };

  const handleBooking = async () => {
    if (!selectedTrip) return;
    if (!passengerName.trim()) return Alert.alert('Validation', 'Please enter passenger name');
    if (!passengerPhone.trim()) return Alert.alert('Validation', 'Please enter phone number');
    if (!paymentMethod) return Alert.alert('Validation', 'Please select payment method');
    if (selectedSeats.length === 0) return Alert.alert('Validation', 'Please select at least one seat');

    setSubmitting(true);
    try {
      const bookingData = {
        userId: user?.id || user?.userId,
        tripScheduleId: selectedTrip.tripScheduleId,
        taxiRankId: selectedTrip.taxiRankId,
        scheduledTripId: selectedTrip.id,
        travelDate: selectedTrip.scheduledDate,
        seatsBooked: selectedSeats.length,
        seatNumbers: selectedSeats,
        totalFare: (selectedTrip.tripSchedule?.standardFare || 0) * selectedSeats.length,
        paymentMethod,
        passengers: [{
          name: passengerName.trim(),
          contactNumber: passengerPhone.trim(),
          email: passengerEmail.trim() || null,
          destination: selectedTrip.tripSchedule?.destinationStation || ''
        }],
        notes: `Seats: ${selectedSeats.join(', ')}`
      };

      await createTripBooking(bookingData);
      
      Alert.alert(
        'Booking Successful!',
        `Your booking for ${selectedSeats.length} seat(s) on the ${formatTime(selectedTrip.scheduledTime)} trip has been confirmed.`,
        [
          { 
            text: 'View My Bookings', 
            onPress: () => {
              closeBookingModal();
              navigation.navigate('MyBookings');
            }
          },
          { 
            text: 'Continue Browsing', 
            onPress: closeBookingModal 
          }
        ]
      );
    } catch (err) {
      Alert.alert(
        'Booking Failed', 
        err?.response?.data?.message || err?.message || 'Failed to create booking. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading available trips...</Text>
      </View>
    );
  }

  const selectedRank = taxiRanks.find(r => r.id === selectedRankId);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Book a Trip</Text>
          <Text style={styles.headerSub}>Find and book available taxis</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MyBookings')} style={styles.bookingsBtn}>
          <Ionicons name="ticket-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[styles.filterSection, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.filterRow}>
          {/* Taxi Rank Selector */}
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: c.background, borderColor: c.border, flex: 2 }]}
            onPress={() => {
              Alert.alert(
                'Select Taxi Rank',
                'Choose a taxi rank to see available trips',
                taxiRanks.map(rank => ({
                  text: rank.name,
                  onPress: () => setSelectedRankId(rank.id)
                }))
              );
            }}
          >
            <Ionicons name="business-outline" size={16} color={GOLD} />
            <Text style={[styles.filterText, { color: selectedRankId ? c.text : c.textMuted, flex: 1 }]} numberOfLines={1}>
              {selectedRank?.name || 'Select Rank'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </TouchableOpacity>

          {/* Date Selector */}
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: c.background, borderColor: c.border }]}
            onPress={() => setDatePickerVisible(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={GOLD} />
            <Text style={[styles.filterText, { color: c.text }]}>
              {DAYS[selectedDate.getDay()]}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Quick Select */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {[0, 1, 2, 3, 4, 5, 6].map(offset => {
            const date = new Date();
            date.setDate(date.getDate() + offset);
            const isSelected = selectedDate.toDateString() === date.toDateString();
            return (
              <TouchableOpacity
                key={offset}
                style={[styles.dateChip, isSelected && { backgroundColor: GOLD }]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dateChipDay, isSelected && { color: '#000' }]}>{DAYS[date.getDay()]}</Text>
                <Text style={[styles.dateChipDate, isSelected && { color: '#000' }]}>{date.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Trip List */}
      <FlatList
        data={scheduledTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.tripList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[GOLD]} />}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <Ionicons name="bus-outline" size={64} color={c.textMuted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No Trips Available</Text>
            <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
              {selectedRankId 
                ? `No scheduled trips for ${selectedDate.toLocaleDateString()}`
                : 'Please select a taxi rank to see available trips'
              }
            </Text>
          </View>
        )}
        renderItem={({ item: trip }) => {
          const schedule = trip.tripSchedule || {};
          const vehicle = trip.vehicle || {};
          const availableSeats = trip.availableSeats || schedule.maxPassengers || 16;
          const isFull = availableSeats === 0;
          const duration = calculateDuration(trip.scheduledTime, trip.estimatedArrivalTime);

          return (
            <View style={[styles.tripCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              {/* Time Header */}
              <View style={styles.timeHeader}>
                <View style={styles.timeBlock}>
                  <Text style={[styles.timeLabel, { color: c.textMuted }]}>Departure</Text>
                  <Text style={[styles.timeValue, { color: c.text }]}>{formatTime(trip.scheduledTime)}</Text>
                </View>
                
                <View style={styles.durationBlock}>
                  <View style={styles.durationLine} />
                  <Text style={[styles.durationText, { color: c.textMuted }]}>
                    {duration || '--'}
                  </Text>
                  <View style={styles.durationLine} />
                </View>

                <View style={styles.timeBlock}>
                  <Text style={[styles.timeLabel, { color: c.textMuted }]}>Arrival</Text>
                  <Text style={[styles.timeValue, { color: GREEN }]}>{formatTime(trip.estimatedArrivalTime)}</Text>
                </View>
              </View>

              {/* Route Info */}
              <View style={styles.routeInfo}>
                <View style={styles.stationRow}>
                  <Ionicons name="location" size={14} color={GREEN} />
                  <Text style={[styles.stationText, { color: c.text }]}>
                    {schedule.departureStation || 'Departure Station'}
                  </Text>
                </View>
                <View style={styles.stationRow}>
                  <Ionicons name="flag" size={14} color={RED} />
                  <Text style={[styles.stationText, { color: c.text }]}>
                    {schedule.destinationStation || 'Destination Station'}
                  </Text>
                </View>
              </View>

              {/* Vehicle & Seats */}
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleRow}>
                  <Ionicons name="bus-outline" size={16} color={GOLD} />
                  <Text style={[styles.vehicleText, { color: c.textMuted }]}>
                    {vehicle.registration || vehicle.make || 'Standard Taxi'}
                  </Text>
                </View>
                <View style={styles.seatsRow}>
                  <Ionicons name="people-outline" size={16} color={isFull ? RED : GREEN} />
                  <Text style={[styles.seatsText, { color: isFull ? RED : c.textMuted }]}>
                    {isFull ? 'Fully Booked' : `${availableSeats} seats available`}
                  </Text>
                </View>
              </View>

              {/* Fare & Book Button */}
              <View style={styles.actionRow}>
                <View>
                  <Text style={[styles.fareLabel, { color: c.textMuted }]}>Fare per person</Text>
                  <Text style={[styles.fareValue, { color: c.text }]}>
                    R{schedule.standardFare || 0}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.bookBtn,
                    { backgroundColor: isFull ? c.border : GOLD },
                    isFull && { opacity: 0.5 }
                  ]}
                  onPress={() => openBookingModal(trip)}
                  disabled={isFull}
                >
                  <Text style={[styles.bookBtnText, { color: isFull ? c.textMuted : '#000' }]}>
                    {isFull ? 'Full' : 'Book Now'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Date Picker */}
      {datePickerVisible && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setDatePickerVisible(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Booking Modal */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeBookingModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Book Your Trip</Text>
              <TouchableOpacity onPress={closeBookingModal}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedTrip && (
                <>
                  {/* Trip Summary */}
                  <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Route</Text>
                      <Text style={[styles.summaryValue, { color: c.text }]}>
                        {selectedTrip.tripSchedule?.routeName}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Date</Text>
                      <Text style={[styles.summaryValue, { color: c.text }]}>
                        {new Date(selectedTrip.scheduledDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Time</Text>
                      <Text style={[styles.summaryValue, { color: c.text }]}>
                        {formatTime(selectedTrip.scheduledTime)} - {formatTime(selectedTrip.estimatedArrivalTime)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Fare</Text>
                      <Text style={[styles.summaryValue, { color: GOLD }]}>
                        R{selectedTrip.tripSchedule?.standardFare || 0} per person
                      </Text>
                    </View>
                  </View>

                  {/* Seat Selection */}
                  <Text style={[styles.sectionLabel, { color: c.text }]}>Select Seats</Text>
                  <View style={styles.seatGrid}>
                    {Array.from({ length: selectedTrip.tripSchedule?.maxPassengers || 16 }, (_, i) => i + 1).map(seatNum => {
                      const isSelected = selectedSeats.includes(seatNum);
                      const isBooked = (selectedTrip.bookedSeats || []).includes(seatNum);
                      return (
                        <TouchableOpacity
                          key={seatNum}
                          style={[
                            styles.seat,
                            isBooked && { backgroundColor: '#ffcccc', borderColor: RED },
                            isSelected && { backgroundColor: GOLD, borderColor: GOLD },
                            !isBooked && !isSelected && { backgroundColor: c.surface, borderColor: c.border }
                          ]}
                          onPress={() => !isBooked && toggleSeat(seatNum)}
                          disabled={isBooked}
                        >
                          <Text style={[
                            styles.seatNumber,
                            isBooked && { color: RED },
                            isSelected && { color: '#000' },
                            !isBooked && !isSelected && { color: c.text }
                          ]}>
                            {seatNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.seatLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendBox, { backgroundColor: c.surface, borderColor: c.border }]} />
                      <Text style={[styles.legendText, { color: c.textMuted }]}>Available</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendBox, { backgroundColor: GOLD, borderColor: GOLD }]} />
                      <Text style={[styles.legendText, { color: c.textMuted }]}>Selected</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendBox, { backgroundColor: '#ffcccc', borderColor: RED }]} />
                      <Text style={[styles.legendText, { color: c.textMuted }]}>Booked</Text>
                    </View>
                  </View>

                  {/* Passenger Info */}
                  <Text style={[styles.sectionLabel, { color: c.text }]}>Passenger Details</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                    placeholder="Full Name"
                    placeholderTextColor={c.textMuted}
                    value={passengerName}
                    onChangeText={setPassengerName}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                    placeholder="Phone Number"
                    placeholderTextColor={c.textMuted}
                    value={passengerPhone}
                    onChangeText={setPassengerPhone}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                    placeholder="Email (optional)"
                    placeholderTextColor={c.textMuted}
                    value={passengerEmail}
                    onChangeText={setPassengerEmail}
                    keyboardType="email-address"
                  />

                  {/* Payment Method */}
                  <Text style={[styles.sectionLabel, { color: c.text }]}>Payment Method</Text>
                  <View style={styles.paymentOptions}>
                    {['EFT', 'Card', 'Cash', 'Wallet'].map(method => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.paymentOption,
                          paymentMethod === method && { backgroundColor: GOLD, borderColor: GOLD },
                          paymentMethod !== method && { backgroundColor: c.surface, borderColor: c.border }
                        ]}
                        onPress={() => setPaymentMethod(method)}
                      >
                        <Ionicons
                          name={
                            method === 'EFT' ? 'swap-horizontal-outline' :
                            method === 'Card' ? 'card-outline' :
                            method === 'Cash' ? 'cash-outline' :
                            'wallet-outline'
                          }
                          size={20}
                          color={paymentMethod === method ? '#000' : c.textMuted}
                        />
                        <Text style={[
                          styles.paymentText,
                          paymentMethod === method ? { color: '#000' } : { color: c.textMuted }
                        ]}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Total */}
                  <View style={[styles.totalRow, { borderTopColor: c.border }]}>
                    <Text style={[styles.totalLabel, { color: c.text }]}>Total</Text>
                    <Text style={[styles.totalValue, { color: GOLD }]}>
                      R{((selectedTrip.tripSchedule?.standardFare || 0) * selectedSeats.length).toFixed(2)}
                    </Text>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: GOLD }, selectedSeats.length === 0 && { opacity: 0.5 }]}
                    onPress={handleBooking}
                    disabled={selectedSeats.length === 0 || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        Confirm Booking ({selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''})
                      </Text>
                    )}
                  </TouchableOpacity>
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
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: GOLD, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  bookingsBtn: { padding: 8 },

  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterText: { fontSize: 14, fontWeight: '600' },

  dateScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  dateChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dateChipDay: { fontSize: 11, color: '#666', fontWeight: '600' },
  dateChipDate: { fontSize: 16, color: '#333', fontWeight: '800', marginTop: 2 },

  tripList: { padding: 16, paddingBottom: 32 },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },

  tripCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeBlock: { alignItems: 'center' },
  timeLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },

  durationBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  durationLine: {
    height: 2,
    backgroundColor: GOLD,
    width: '100%',
    borderRadius: 1,
  },
  durationText: { fontSize: 12, marginVertical: 4, fontWeight: '600' },

  routeInfo: { gap: 8, marginBottom: 16 },
  stationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stationText: { fontSize: 15, fontWeight: '600' },

  vehicleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vehicleText: { fontSize: 13, fontWeight: '500' },
  seatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seatsText: { fontSize: 13, fontWeight: '600' },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabel: { fontSize: 11, fontWeight: '600' },
  fareValue: { fontSize: 20, fontWeight: '800' },
  bookBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  bookBtnText: { fontSize: 14, fontWeight: '800' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalBody: { padding: 20, paddingBottom: 40 },

  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: '700' },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 16,
  },

  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  seat: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatNumber: { fontSize: 14, fontWeight: '700' },

  seatLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1 },
  legendText: { fontSize: 12 },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 14,
  },

  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  paymentText: { fontSize: 13, fontWeight: '600' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 20,
  },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalValue: { fontSize: 24, fontWeight: '900' },

  submitBtn: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
});
