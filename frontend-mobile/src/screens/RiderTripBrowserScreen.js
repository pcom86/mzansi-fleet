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

export default function RiderTripBrowserScreen({ navigation, route: navRoute }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const preSelectedRankId = navRoute?.params?.preSelectedRankId || '';

  // Data state
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [scheduledTrips, setScheduledTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [selectedRankId, setSelectedRankId] = useState(preSelectedRankId);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [rankPickerVisible, setRankPickerVisible] = useState(false);

  // Booking modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cart state
  const [passengerCart, setPassengerCart] = useState([]);
  const [bookingForSelf, setBookingForSelf] = useState(false);
  const [currentPassenger, setCurrentPassenger] = useState({
    name: '',
    contactNumber: '',
    email: '',
    destination: ''
  });

  // UI state
  const [step, setStep] = useState('add'); // 'add' | 'payment' | 'confirmation'
  const [bookingConfirmation, setBookingConfirmation] = useState(null);
  
  // Destination dropdown state
  const [destinationModalVisible, setDestinationModalVisible] = useState(false);

  // ===== DATA LOADING =====
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const promises = [
        client.get('/TaxiRanks').catch(() => ({ data: [] })),
      ];

      const [rankResp] = await Promise.all(promises);
      const ranks = rankResp.data || [];
      setTaxiRanks(ranks);

      // Auto-select first rank if none is selected yet
      if (!selectedRankId && ranks.length > 0) {
        setSelectedRankId(ranks[0].id);
      }

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

  const formatLocalDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const loadScheduledTrips = async (rankId) => {
    try {
      const dateStr = formatLocalDate(selectedDate);
      const resp = await client.get('/ScheduledTrips/by-rank', {
        params: { 
          taxiRankId: rankId,
          date: dateStr 
        }
      });
      const trips = resp.data || [];
      setScheduledTrips(trips);
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

  const getTripRoute = (trip) => {
    // Try to get route information from the trip object itself
    if (trip.route) return trip.route;
    if (trip.Route) return trip.Route;
    if (trip.routeSchedule) return trip.routeSchedule;
    if (trip.RouteSchedule) return trip.RouteSchedule;
    
    // Try to get route information from nested properties
    if (trip.routeId && trip.routeId === trip.id) return trip;
    if (trip.RouteId && trip.RouteId === trip.id) return trip;
    
    // Return the trip itself as fallback (it contains route info)
    return trip;
  };

  // ===== FARE CALCULATION =====
  const calculateFareForDestination = (destination) => {
    if (!selectedTrip) return 0;
    
    const baseRoute = getTripRoute(selectedTrip);
    const route = selectedRoute || baseRoute;
    const baseFare = route?.standardFare || 0;
    
    // If destination is the final destination, use base fare
    if (destination === route?.destinationStation) {
      return baseFare;
    }
    
    // Check stops fetched from API - use FareFromOrigin directly
    const stops = selectedRoute?.stops || [];
    const matchedStop = stops.find(stop => 
      (stop.stopName || stop.StopName || stop.name) === destination
    );
    
    if (matchedStop) {
      // Use FareFromOrigin directly from the stop data
      const stopFare = matchedStop.fareFromOrigin || matchedStop.FareFromOrigin || matchedStop.fare;
      if (stopFare) return stopFare;
      
      // Otherwise calculate proportionally based on stop position
      const stopIndex = stops.indexOf(matchedStop);
      const stopProgress = (stopIndex + 1) / (stops.length + 1);
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
      const destination = passenger.destination?.trim() || getTripRoute(selectedTrip)?.destinationStation;
      return total + calculateFareForDestination(destination);
    }, 0);
  };

  const getCartSize = () => passengerCart.length;

  // ===== ROUTE STOPS & DESTINATIONS =====
  const getRouteStopsAndDestinations = () => {
    if (!selectedTrip) return [];
    
    const baseRoute = getTripRoute(selectedTrip);
    const route = selectedRoute || baseRoute;
    if (!route) return [];
    
    const destinations = [];
    const departureStation = (route.departureStation || '').trim().toLowerCase();
    
    // Use actual stops from the fetched route (StopName from API)
    // Filter out the departure station since passenger is already there
    const stops = selectedRoute?.stops || [];
    stops.forEach(stop => {
      const stopName = stop.stopName || stop.StopName || stop.name;
      const normalizedStopName = (stopName || '').trim().toLowerCase();
      if (stopName && !destinations.includes(stopName) && normalizedStopName !== departureStation) {
        destinations.push(stopName);
      }
    });
    
    // Always include the final destination (if it's not the departure station)
    const finalDestination = route.destinationStation || 'Route Destination';
    if (!destinations.includes(finalDestination) && finalDestination !== departureStation) {
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

  const addMinutesToTime = (timeStr, minutesToAdd) => {
    if (!timeStr || !Number.isFinite(minutesToAdd)) return null;
    const parts = String(timeStr).split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const total = (h * 60 + m + minutesToAdd) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}:00`;
  };

  // ===== BOOKING HANDLERS =====
  const openBookingModal = async (trip) => {
    setSelectedTrip(trip);
    setSelectedRoute(null);
    setSelectedSeats([]);
    setPassengerCart([]);
    setCurrentPassenger({
      name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
      contactNumber: user?.phoneNumber || '',
      email: user?.email || '',
      destination: ''
    });
    setPaymentMethod('');
    setStep('add');
    setBookingModalVisible(true);
    // Fetch full route with stops
    const routeId = trip.routeId || trip.RouteId;
    if (routeId) {
      try {
        const resp = await client.get(`/Routes/${routeId}`);
        setSelectedRoute(resp.data);
      } catch (err) {
        console.warn('Failed to load route stops:', err?.message);
      }
    }
  };

  const closeBookingModal = () => {
    setBookingModalVisible(false);
    setSelectedTrip(null);
    setSelectedRoute(null);
    setSelectedSeats([]);
    setPassengerCart([]);
    setCurrentPassenger({ name: '', contactNumber: '', email: '', destination: '' });
    setPaymentMethod('');
    setBookingForSelf(false);
    setBookingConfirmation(null);
    setStep('add');
  };

  const toggleSeat = (seatNumber) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatNumber)) {
        return prev.filter(s => s !== seatNumber);
      }
      return [...prev, seatNumber].sort((a, b) => a - b);
    });
  };

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

    const maxPassengers = getTripRoute(selectedTrip)?.maxPassengers || 16;
    if (passengerCart.length >= maxPassengers) {
      Alert.alert('Validation Error', 'Maximum passengers reached for this trip');
      return;
    }

    // Auto-assign next available seat
    const nextSeat = passengerCart.length + 1;
    if (!selectedSeats.includes(nextSeat)) {
      setSelectedSeats(prev => [...prev, nextSeat].sort((a, b) => a - b));
    }

    // Add to cart
    const newPassenger = {
      ...currentPassenger,
      id: Date.now().toString(),
      name: currentPassenger.name.trim(),
      contactNumber: currentPassenger.contactNumber.trim(),
      email: currentPassenger.email.trim() || '',
      destination: currentPassenger.destination.trim() || getTripRoute(selectedTrip)?.destinationStation || '',
      seatNumber: nextSeat,
    };

    setPassengerCart(prev => [...prev, newPassenger]);
    
    // Reset current passenger form
    setCurrentPassenger({
      name: '',
      contactNumber: '',
      email: '',
      destination: ''
    });

    if (getCartSize() > 0 && bookingForSelf) {
      // Reset the toggle after adding self to cart
      setBookingForSelf(false);
    }
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
    if (passengerCart.length !== selectedSeats.length) {
      Alert.alert('Seat Mismatch', `Please add ${selectedSeats.length - passengerCart.length} more passenger(s) or adjust seat selection`);
      return;
    }
    setStep('payment');
  }

  function goBackToAddPassengers() {
    setStep('add');
  }

  // ===== DESTINATION SELECTION =====
  function selectDestination(destination) {
    updateCurrentPassenger('destination', destination);
    setDestinationModalVisible(false);
  }

  const handleBooking = async () => {
    if (!selectedTrip) return;
    if (!paymentMethod) return Alert.alert('Validation', 'Please select payment method');
    if (selectedSeats.length === 0) return Alert.alert('Validation', 'Please select at least one seat');
    if (passengerCart.length === 0) return Alert.alert('Validation', 'Please add passengers to cart');
    if (passengerCart.length !== selectedSeats.length) return Alert.alert('Validation', 'Number of passengers must match selected seats');

    setSubmitting(true);
    try {
      const routeId = selectedRoute?.id || selectedTrip.routeId || selectedTrip.RouteId;
      const bookingData = {
        userId: user.id,
        routeId,
        scheduledTripId: selectedTrip.id,
        travelDate: (() => {
          // Extract date part to avoid timezone shift (e.g. 2026-03-13T00:00:00 local -> 2026-03-12T22:00:00Z)
          const d = new Date(selectedTrip.scheduledDate);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}T12:00:00Z`;
        })(),
        seatsBooked: passengerCart.length,
        seatNumbers: selectedSeats.slice(0, passengerCart.length),
        totalFare: calculateTotalFare(),
        passengers: passengerCart.map(p => ({
          name: p.name,
          contactNumber: p.contactNumber,
          email: p.email || null,
          destination: p.destination || selectedRoute?.destinationStation || getTripRoute(selectedTrip)?.destinationStation || '',
        })),
        paymentMethod,
        notes: `Seats: ${selectedSeats.slice(0, passengerCart.length).join(', ')}`
      };

      const result = await createTripBooking(bookingData);
      
      // Store confirmation details and switch to confirmation step
      const route = selectedRoute || getTripRoute(selectedTrip);
      setBookingConfirmation({
        reference: (result?.id || '').toString().substring(0, 8).toUpperCase(),
        routeName: route?.routeName || `${route?.departureStation} → ${route?.destinationStation}`,
        departure: route?.departureStation || '',
        destination: route?.destinationStation || '',
        date: new Date(selectedTrip.scheduledDate).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: selectedTrip.scheduledTime || '',
        seats: selectedSeats.slice(0, passengerCart.length),
        passengers: [...passengerCart],
        totalFare: calculateTotalFare(),
        paymentMethod,
      });
      setStep('confirmation');
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.title || JSON.stringify(err?.response?.data);
      console.warn('Booking error:', serverMsg, 'Status:', err?.response?.status);
      Alert.alert('Booking Failed', serverMsg || err?.message || 'Failed to create booking');
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
          <View><Ionicons name="arrow-back" size={22} color="#fff" /></View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text style={styles.headerTitle}>Book a Trip</Text>
          <Text style={styles.headerSub}>Find and book available taxis</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MyBookings')} style={styles.bookingsBtn}>
          <View><Ionicons name="ticket-outline" size={20} color={GOLD} /></View>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[styles.filterSection, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.filterRow}>
          {/* Taxi Rank Selector */}
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: c.background, borderColor: c.border, flex: 2 }]}
            onPress={() => setRankPickerVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="business-outline" size={16} color={GOLD} />
              <Text style={[styles.filterText, { color: selectedRankId ? c.text : c.textMuted, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
                {selectedRank?.name || 'Select Rank'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={c.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Date Selector */}
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: c.background, borderColor: c.border }]}
            onPress={() => setDatePickerVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="calendar-outline" size={16} color={GOLD} />
              <Text style={[styles.filterText, { color: c.text, marginLeft: 8 }]}>
                {DAYS[selectedDate.getDay()]}
              </Text>
            </View>
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
                <Text style={[styles.dateChipDay, { color: isSelected ? '#000' : c.textMuted }]}>{DAYS[date.getDay()]}</Text>
                <Text style={[styles.dateChipDate, { color: isSelected ? '#000' : c.text }]}>{date.getDate()}</Text>
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
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="bus-outline" size={64} color={c.textMuted} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>No Trips Available</Text>
              <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
                {selectedRankId 
                  ? `No scheduled trips for ${selectedDate.toLocaleDateString()}`
                  : 'Please select a taxi rank to see available trips'
                }
              </Text>
            </View>
          </View>
        )}
        renderItem={({ item: trip }) => {
          const schedule = getTripRoute(trip);
          const vehicle = trip.vehicle || {};
          const availableSeats = trip.availableSeats || schedule?.maxPassengers || 16;
          const isFull = availableSeats === 0;
          const computedArrival = trip.estimatedArrivalTime
            || addMinutesToTime(trip.scheduledTime, schedule?.expectedDurationMinutes || 60);
          const duration = calculateDuration(trip.scheduledTime, computedArrival);

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
                  <Text style={[styles.timeValue, { color: GREEN }]}>{formatTime(computedArrival)}</Text>
                </View>
              </View>

              {/* Route Info */}
              <View style={styles.routeInfo}>
                <View style={styles.routeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="map-outline" size={16} color={GOLD} />
                    <Text style={[styles.routeName, { color: c.text, marginLeft: 8 }]}>
                      {schedule?.routeName || `${schedule?.departureStation || 'Departure'} → ${schedule?.destinationStation || 'Destination'}`}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.stationRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="location" size={14} color={GREEN} />
                    <Text style={[styles.stationText, { color: c.text, marginLeft: 8 }]}>
                      {schedule?.departureStation || 'Departure Station'}
                    </Text>
                  </View>
                </View>
                <View style={styles.stationRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="flag" size={14} color={RED} />
                    <Text style={[styles.stationText, { color: c.text, marginLeft: 8 }]}>
                      {schedule?.destinationStation || 'Destination Station'}
                    </Text>
                  </View>
                </View>
                
                {schedule?.stops && schedule.stops.length > 0 && (
                  <View style={styles.stopsRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons name="swap-horizontal" size={14} color={c.textMuted} />
                      <Text style={[styles.stopsText, { color: c.textMuted, marginLeft: 8 }]}>
                        {schedule.stops.length} stops available
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Vehicle & Seats */}
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="bus-outline" size={16} color={GOLD} />
                    <Text style={[styles.vehicleText, { color: c.textMuted, marginLeft: 8 }]}>
                      {vehicle.registration || vehicle.make || 'Standard Taxi'}
                    </Text>
                  </View>
                </View>
                <View style={styles.seatsRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="people-outline" size={16} color={isFull ? RED : GREEN} />
                    <Text style={[styles.seatsText, { color: isFull ? RED : c.textMuted, marginLeft: 8 }]}>
                      {isFull ? 'Fully Booked' : `${availableSeats} seats available`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Fare & Book Button */}
              <View style={styles.actionRow}>
                <View>
                  <Text style={[styles.fareLabel, { color: c.textMuted }]}>Fare per person</Text>
                  <Text style={[styles.fareValue, { color: c.text }]}>
                    R{schedule?.standardFare || 0}
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

      {/* Taxi Rank Picker Modal */}
      <Modal visible={rankPickerVisible} transparent animationType="fade" onRequestClose={() => setRankPickerVisible(false)}>
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: 'center' }]} activeOpacity={1} onPress={() => setRankPickerVisible(false)}>
          <View style={[styles.rankPickerContent, { backgroundColor: c.background }]}>
            <Text style={[styles.rankPickerTitle, { color: c.text }]}>Select Taxi Rank</Text>
            <FlatList
              data={taxiRanks}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: 'center', padding: 20 }}>No taxi ranks available</Text>}
              renderItem={({ item: rank }) => (
                <TouchableOpacity
                  style={[styles.rankPickerItem, { borderColor: c.border }, selectedRankId === rank.id && { backgroundColor: GOLD_LIGHT }]}
                  onPress={() => { setSelectedRankId(rank.id); setRankPickerVisible(false); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="business-outline" size={18} color={selectedRankId === rank.id ? GOLD : c.textMuted} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.rankPickerName, { color: c.text }]}>{rank.name}</Text>
                      {rank.city ? <Text style={{ color: c.textMuted, fontSize: 12 }}>{rank.city}</Text> : null}
                    </View>
                    {selectedRankId === rank.id && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

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
                <View><Ionicons name="close" size={24} color={c.textMuted} /></View>
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
                        {getTripRoute(selectedTrip)?.routeName}
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
                      {(() => {
                        const computedArrival = selectedTrip.estimatedArrivalTime
                          || addMinutesToTime(selectedTrip.scheduledTime, getTripRoute(selectedTrip)?.expectedDurationMinutes || 60);
                        return (
                      <Text style={[styles.summaryValue, { color: c.text }]}>
                        {formatTime(selectedTrip.scheduledTime)} - {formatTime(computedArrival)}
                      </Text>
                        );
                      })()}
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Fare</Text>
                      <Text style={[styles.summaryValue, { color: GOLD }]}>
                        R{getTripRoute(selectedTrip)?.standardFare || 0} per person
                      </Text>
                    </View>
                  </View>

                  {/* Seat Selection */}
                  <Text style={[styles.sectionLabel, { color: c.text }]}>Select Seats</Text>
                  <View style={styles.seatGrid}>
                    {Array.from({ length: getTripRoute(selectedTrip)?.maxPassengers || 16 }, (_, i) => i + 1).map(seatNum => {
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
                        Payment ({getCartSize()}/{selectedSeats.length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Dynamic Content Based on Step */}
                  {step === 'add' && (
                    <View>
                      {/* Add Passenger Form */}
                      <View style={[styles.passengerCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        {/* Toggle: Booking for self vs someone else */}
                        <TouchableOpacity
                          style={[styles.selfBookingToggle, { backgroundColor: bookingForSelf ? GOLD_LIGHT : c.background, borderColor: bookingForSelf ? GOLD : c.border }]}
                          onPress={() => {
                            const newValue = !bookingForSelf;
                            setBookingForSelf(newValue);
                            if (newValue && user) {
                              // Auto-fill with logged-in user details
                              setCurrentPassenger({
                                name: user.fullName || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''),
                                contactNumber: user.phone || '',
                                email: user.email || '',
                                destination: currentPassenger.destination || ''
                              });
                            } else if (!newValue) {
                              // Clear to allow manual entry
                              setCurrentPassenger({
                                name: '',
                                contactNumber: '',
                                email: '',
                                destination: currentPassenger.destination || ''
                              });
                            }
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Ionicons
                              name={bookingForSelf ? 'checkbox-outline' : 'square-outline'}
                              size={22}
                              color={bookingForSelf ? GOLD : c.textMuted}
                            />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                              <Text style={[styles.selfBookingTitle, { color: c.text }]}>
                                This is for me
                              </Text>
                              <Text style={[styles.selfBookingSubtitle, { color: c.textMuted }]}>
                                {bookingForSelf ? 'Using my profile details' : 'Tap to auto-fill my details'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.passengerHeader}>
                          <View style={styles.passengerHeaderLeft}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Ionicons name="person-add-outline" size={20} color={GOLD} />
                              <Text style={[styles.passengerTitle, { color: c.text, marginLeft: 8 }]}>Add Passenger</Text>
                            </View>
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
                        
                        <Text style={[styles.label, { color: c.textMuted }]}>Email Address</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                          placeholder="Email (optional)"
                          placeholderTextColor={c.textMuted}
                          value={currentPassenger.email}
                          onChangeText={(value) => updateCurrentPassenger('email', value)}
                          keyboardType="email-address"
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Ionicons name="cash-outline" size={14} color={GOLD} />
                              <Text style={[styles.fareHintText, { color: GOLD, marginLeft: 8 }]}>
                                Fare for {currentPassenger.destination}: R{calculateFareForDestination(currentPassenger.destination).toFixed(2)}
                              </Text>
                            </View>
                          </View>
                        )}
                        
                        <View style={styles.formActions}>
                          {(currentPassenger.name || currentPassenger.contactNumber || currentPassenger.email || currentPassenger.destination) && (
                            <TouchableOpacity 
                              style={[styles.clearFormBtn, { backgroundColor: c.surface, borderColor: c.border }]} 
                              onPress={() => {
                                setCurrentPassenger({
                                  name: '',
                                  contactNumber: '',
                                  email: '',
                                  destination: ''
                                });
                                setBookingForSelf(false);
                              }}
                              activeOpacity={0.85}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <Ionicons name="close-circle-outline" size={18} color={c.textMuted} />
                                <Text style={[styles.clearFormBtnText, { color: c.textMuted }]}>Clear</Text>
                              </View>
                            </TouchableOpacity>
                          )}
                          
                          <TouchableOpacity 
                            style={[styles.addToCartBtn, { backgroundColor: GOLD }]} 
                            onPress={addPassengerToCart}
                            activeOpacity={0.85}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                              <Ionicons name="cart-outline" size={18} color="#000" />
                              <Text style={styles.addToCartBtnText}>Add to Cart</Text>
                            </View>
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

                      {/* Cart Display */}
                      <View style={[styles.cartHeader, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.cartTitle, { color: c.text }]}>Shopping Cart ({getCartSize()} passengers)</Text>
                        {getCartSize() > 0 && (
                          <TouchableOpacity onPress={clearCart} style={styles.clearCartBtn}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Ionicons name="trash-outline" size={16} color={RED} />
                              <Text style={[styles.clearCartText, { color: RED, marginLeft: 8 }]}>Clear All</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      {getCartSize() === 0 ? (
                        <View style={[styles.emptyCart, { backgroundColor: c.surface, borderColor: c.border }]}>
                          <View style={{ alignItems: 'center' }}>
                            <Ionicons name="cart-outline" size={48} color={c.textMuted} />
                            <Text style={[styles.emptyCartText, { color: c.textMuted }]}>Your cart is empty</Text>
                            <Text style={[styles.emptyCartSubText, { color: c.textMuted }]}>Add passengers to get started</Text>
                          </View>
                        </View>
                      ) : (
                        <View>
                          {passengerCart.map((passenger, index) => (
                            <View key={passenger.id} style={[styles.cartItem, { backgroundColor: c.surface, borderColor: c.border }]}>
                              <View style={styles.cartItemHeader}>
                                <Text style={[styles.cartItemTitle, { color: c.text }]}>Passenger {index + 1} (Seat {selectedSeats[index]})</Text>
                                <TouchableOpacity onPress={() => removePassengerFromCart(passenger.id)}>
                                  <View><Ionicons name="remove-circle-outline" size={20} color={RED} /></View>
                                </TouchableOpacity>
                              </View>
                              <Text style={[styles.cartItemDetail, { color: c.text }]}>Name: {passenger.name}</Text>
                              <Text style={[styles.cartItemDetail, { color: c.text }]}>Phone: {passenger.contactNumber}</Text>
                              {passenger.destination && (
                                <Text style={[styles.cartItemDetail, { color: c.text }]}>Destination: {passenger.destination}</Text>
                              )}
                              <Text style={[styles.cartItemFare, { color: GOLD }]}>
                                Fare: R{calculateFareForDestination(passenger.destination || getTripRoute(selectedTrip)?.destinationStation).toFixed(2)}
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
                  )}

                  {step === 'payment' && (
                    <View>
                      {/* Cart Summary */}
                      <View style={[styles.cartHeader, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.cartTitle, { color: c.text }]}>Booking Summary ({getCartSize()} passengers)</Text>
                      </View>
                      
                      {passengerCart.map((passenger, index) => (
                        <View key={passenger.id} style={[styles.cartItem, { backgroundColor: c.surface, borderColor: c.border }]}>
                          <View style={styles.cartItemHeader}>
                            <Text style={[styles.cartItemTitle, { color: c.text }]}>Passenger {index + 1} (Seat {selectedSeats[index]})</Text>
                          </View>
                          <Text style={[styles.cartItemDetail, { color: c.text }]}>Name: {passenger.name}</Text>
                          <Text style={[styles.cartItemDetail, { color: c.text }]}>Phone: {passenger.contactNumber}</Text>
                          {passenger.destination && (
                            <Text style={[styles.cartItemDetail, { color: c.text }]}>Destination: {passenger.destination}</Text>
                          )}
                          <Text style={[styles.cartItemFare, { color: GOLD }]}>
                            Fare: R{calculateFareForDestination(passenger.destination || getTripRoute(selectedTrip)?.destinationStation).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                      
                      <View style={[styles.cartSummary, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.cartTotal, { color: c.text }]}>Total Fare:</Text>
                        <Text style={[styles.cartTotalAmount, { color: GOLD }]}>R{calculateTotalFare().toFixed(2)}</Text>
                      </View>

                      {/* Payment Method */}
                      <Text style={[styles.sectionLabel, { color: c.text }]}>Payment Method</Text>
                      <View style={styles.paymentOptions}>
                        {['EFT', 'Wallet'].map(method => (
                          <TouchableOpacity
                            key={method}
                            style={[
                              styles.paymentOption,
                              paymentMethod === method && { backgroundColor: GOLD, borderColor: GOLD },
                              paymentMethod !== method && { backgroundColor: c.surface, borderColor: c.border }
                            ]}
                            onPress={() => setPaymentMethod(method)}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
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
                                styles.paymentOptionText,
                                { color: paymentMethod === method ? '#000' : c.text, marginLeft: 6 }
                              ]}>
                                {method}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.paymentActions}>
                        <TouchableOpacity 
                          style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} 
                          onPress={goBackToAddPassengers}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Ionicons name="arrow-back" size={18} color={c.text} />
                            <Text style={[styles.backBtnText, { color: c.text, marginLeft: 8 }]}>Back</Text>
                          </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.checkoutBtn, { backgroundColor: paymentMethod ? GOLD : c.border }]} 
                          onPress={handleBooking} 
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

                  {step !== 'confirmation' && (
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
                  )}

                  {/* Confirmation Step */}
                  {step === 'confirmation' && bookingConfirmation && (
                    <View style={{ marginTop: 8 }}>
                      {/* Success Icon */}
                      <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ backgroundColor: '#E8F5E9', borderRadius: 50, width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          <View><Ionicons name="checkmark-circle" size={56} color={GREEN} /></View>
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: GREEN, textAlign: 'center' }}>Booking Confirmed!</Text>
                        <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 4 }}>
                          A confirmation has been sent to your inbox
                        </Text>
                      </View>

                      {/* Booking Reference */}
                      <View style={[styles.confirmationCard, { backgroundColor: GOLD_LIGHT, borderColor: GOLD }]}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Booking Reference</Text>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: GOLD, marginTop: 4, letterSpacing: 2 }}>
                          {bookingConfirmation.reference || 'N/A'}
                        </Text>
                      </View>

                      {/* Trip Details */}
                      <View style={[styles.confirmationCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.confirmationSectionTitle, { color: c.text }]}>Trip Details</Text>
                        <View style={styles.confirmationRow}>
                          <Text style={[styles.confirmationLabel, { color: c.textMuted }]}>Route</Text>
                          <Text style={[styles.confirmationValue, { color: c.text }]}>{bookingConfirmation.routeName}</Text>
                        </View>
                        <View style={styles.confirmationRow}>
                          <Text style={[styles.confirmationLabel, { color: c.textMuted }]}>From</Text>
                          <Text style={[styles.confirmationValue, { color: c.text }]}>{bookingConfirmation.departure}</Text>
                        </View>
                        <View style={styles.confirmationRow}>
                          <Text style={[styles.confirmationLabel, { color: c.textMuted }]}>To</Text>
                          <Text style={[styles.confirmationValue, { color: c.text }]}>{bookingConfirmation.destination}</Text>
                        </View>
                        <View style={styles.confirmationRow}>
                          <Text style={[styles.confirmationLabel, { color: c.textMuted }]}>Date</Text>
                          <Text style={[styles.confirmationValue, { color: c.text }]}>{bookingConfirmation.date}</Text>
                        </View>
                        {bookingConfirmation.time ? (
                          <View style={styles.confirmationRow}>
                            <Text style={[styles.confirmationLabel, { color: c.textMuted }]}>Time</Text>
                            <Text style={[styles.confirmationValue, { color: c.text }]}>{bookingConfirmation.time}</Text>
                          </View>
                        ) : null}
                        <View style={styles.confirmationRow}>
                          <Text style={[styles.confirmationLabel, { color: c.textMuted }]}>Seats</Text>
                          <Text style={[styles.confirmationValue, { color: c.text }]}>{bookingConfirmation.seats.join(', ')}</Text>
                        </View>
                        <View style={styles.confirmationRow}>
                          <Text style={[styles.confirmationLabel, { color: c.textMuted }]}>Payment</Text>
                          <Text style={[styles.confirmationValue, { color: c.text }]}>{bookingConfirmation.paymentMethod}</Text>
                        </View>
                      </View>

                      {/* Passengers */}
                      <View style={[styles.confirmationCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.confirmationSectionTitle, { color: c.text }]}>Passengers</Text>
                        {bookingConfirmation.passengers.map((p, i) => (
                          <View key={i} style={[styles.confirmationRow, { paddingVertical: 8 }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{p.name}</Text>
                              <Text style={{ fontSize: 12, color: c.textMuted }}>{p.contactNumber}{p.destination ? ` → ${p.destination}` : ''}</Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: GOLD }}>Seat {bookingConfirmation.seats[i]}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Total */}
                      <View style={[styles.confirmationCard, { backgroundColor: GOLD_LIGHT, borderColor: GOLD }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>Total Fare</Text>
                          <Text style={{ fontSize: 24, fontWeight: '900', color: GOLD }}>R{bookingConfirmation.totalFare.toFixed(2)}</Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <TouchableOpacity
                          style={{ flex: 1, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: GOLD, alignItems: 'center' }}
                          onPress={() => {
                            setBookingConfirmation(null);
                            closeBookingModal();
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '700', color: GOLD }}>Done</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 2, padding: 16, borderRadius: 10, backgroundColor: GOLD, alignItems: 'center' }}
                          onPress={() => {
                            setBookingConfirmation(null);
                            closeBookingModal();
                            navigation.navigate('MyBookings');
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#000' }}>View My Bookings</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Destination Dropdown Modal */}
      <Modal visible={destinationModalVisible} transparent animationType="fade" onRequestClose={() => setDestinationModalVisible(false)}>
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: 'center' }]} activeOpacity={1} onPress={() => setDestinationModalVisible(false)}>
          <View style={[styles.destinationPickerContent, { backgroundColor: c.background }]}>
            <View style={styles.destinationPickerHeader}>
              <Text style={[styles.destinationPickerTitle, { color: c.text }]}>Select Destination</Text>
              <TouchableOpacity onPress={() => setDestinationModalVisible(false)}>
                <View><Ionicons name="close" size={24} color={c.textMuted} /></View>
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
  backBtn: { padding: 6, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: GOLD, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  bookingsBtn: { padding: 6, justifyContent: 'center', alignItems: 'center' },

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
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  dateChipDay: { fontSize: 11, fontWeight: '600' },
  dateChipDate: { fontSize: 16, fontWeight: '800', marginTop: 2 },

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
  routeHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  routeName: { fontSize: 16, fontWeight: '700', flex: 1 },
  stationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stationText: { fontSize: 15, fontWeight: '600' },
  stopsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  stopsText: { fontSize: 13, fontWeight: '500' },

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
  paymentOptionText: { fontSize: 13, fontWeight: '600' },

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
  formActions: { marginTop: 16, flexDirection: 'row', gap: 12 },
  clearFormBtn: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 14, 
    borderRadius: 8,
    borderWidth: 1
  },
  clearFormBtnText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  addToCartBtn: { 
    flex: 2,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 14, 
    borderRadius: 8
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
  cartItemDetail: { fontSize: 14, marginBottom: 2 },
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

  // Enhanced Form Styles
  passengerCard: { padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  passengerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  passengerHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  passengerTitle: { fontSize: 16, fontWeight: '600' },
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

  rankPickerContent: {
    borderRadius: 16,
    marginHorizontal: 24,
    marginVertical: 'auto',
    maxHeight: '60%',
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  rankPickerTitle: {
    fontSize: 16,
    fontWeight: '900',
    padding: 20,
    paddingBottom: 12,
  },
  rankPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  rankPickerName: {
    fontSize: 15,
    fontWeight: '700',
  },

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

  // Self booking toggle styles
  selfBookingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  selfBookingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  selfBookingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Confirmation styles
  confirmationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  confirmationSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  confirmationLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  confirmationValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
});
