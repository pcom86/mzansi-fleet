import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, FlatList, RefreshControl,
  DatePickerIOS, Button as RNButton,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const GREEN_LIGHT = 'rgba(25,135,84,0.12)';
const RED = '#dc3545';

export default function CreateTripScheduleScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;

  // Form state
  const [selectedTaxiRankId, setSelectedTaxiRankId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedMarshalId, setSelectedMarshalId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [departureTime, setDepartureTime] = useState('08:00');
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Data state
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [displayVehicles, setDisplayVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [groupedTrips, setGroupedTrips] = useState({});
  const [tripDates, setTripDates] = useState([]);
  const [vehicleRouteAssignments, setVehicleRouteAssignments] = useState([]);
  const [marshals, setMarshals] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Schedule management state
  // Filters
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [taxiRankModalVisible, setTaxiRankModalVisible] = useState(false);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [marshalModalVisible, setMarshalModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [arrivalTimePickerVisible, setArrivalTimePickerVisible] = useState(false);
  const [timePickerDate, setTimePickerDate] = useState(new Date());
  const [endDatePickerVisible, setEndDatePickerVisible] = useState(false);
  
  // Multi-trip generation settings
  const [scheduleEndDate, setScheduleEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Default 7 days
    return d;
  });
  const [frequencyMinutes, setFrequencyMinutes] = useState(60);
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [generateMultipleTrips, setGenerateMultipleTrips] = useState(true);

  // Passenger capture modal
  const [passengerModalVisible, setPassengerModalVisible] = useState(false);
  const [selectedTripForPassengers, setSelectedTripForPassengers] = useState(null);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerDepartureStation, setPassengerDepartureStation] = useState('');
  const [passengerArrivalStation, setPassengerArrivalStation] = useState('');
  const [passengerAmount, setPassengerAmount] = useState('');
  const [passengerPaymentMethod, setPassengerPaymentMethod] = useState('Cash');
  const [passengerSeatNumber, setPassengerSeatNumber] = useState('');
  const [tripStops, setTripStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [stopModalVisible, setStopModalVisible] = useState(false);

  // Delete confirmation
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);

  // ===== DATA LOADING - Aligned with Web =====
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?.userId || user?.id;
      if (!userId) return;

      // Only fetch admin profile for non-marshal roles
      let admin = null;
      const isMarshal = (user.role || '').toLowerCase() === 'taximarshal';
      if (!isMarshal) {
        try {
          const adminResp = await client.get(`/TaxiRankAdmin/user/${userId}`);
          admin = adminResp.data;
        } catch (_) {}
      }
      setAdmin(admin);

      // Load data using same APIs as web
      const promises = [
        client.get('/TaxiRanks').catch(() => ({ data: [] })),
        client.get('/TaxiRankTrips').catch(() => ({ data: [] })),
        client.get('/VehicleRouteAssignments').catch(() => ({ data: [] })),
        client.get('/Drivers').catch(() => ({ data: [] })),
        client.get('/TaxiRankUsers/marshals').catch(() => ({ data: [] })),
      ];

      const [rankResp, tripsResp, vraResp, driverResp, marshalResp] = await Promise.all(promises);
      setTaxiRanks(rankResp.data || []);
      setVehicleRouteAssignments((vraResp.data || []).filter(a => a.isActive));
      setMarshals(marshalResp.data || []);

      // Process trips like web does
      const loadedTrips = tripsResp.data || [];
      setTrips(loadedTrips);
      groupTripsByDate(loadedTrips);

      const mappedDrivers = (driverResp.data || []).map(d => ({
        id: d.id,
        name: d.name || `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim() || 'Unknown',
        assignedVehicleId: d.assignedVehicleId || null,
      }));
      setDrivers(mappedDrivers);

      // Auto-select admin's taxi rank or first available rank
      if (admin?.taxiRankId) {
        setSelectedTaxiRankId(admin.taxiRankId);
      } else if (rankResp.data?.length > 0) {
        setSelectedTaxiRankId(rankResp.data[0].id);
      }
    } catch (err) {
      console.warn('Load data error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Group trips by date like web does
  const groupTripsByDate = (tripsData) => {
    const groups = {};
    tripsData.forEach(trip => {
      if (trip.departureTime) {
        const date = new Date(trip.departureTime).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(trip);
      }
    });
    
    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(groups).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    setGroupedTrips(groups);
    setTripDates(sortedDates);
  };

  // Load routes when taxi rank changes
  useEffect(() => {
    if (selectedTaxiRankId) {
      loadTripsForRank();
      loadRoutesForTaxiRank(selectedTaxiRankId);
    }
  }, [selectedTaxiRankId]);

  async function loadTripsForRank() {
    try {
      setLoadingSchedules(true);
      // Use the same endpoint as web
      const url = admin?.tenantId 
        ? `/TaxiRankTrips?tenantId=${admin.tenantId}`
        : '/TaxiRankTrips';
      
      const resp = await client.get(url);
      const loadedTrips = resp.data || [];
      
      // Filter by taxi rank if selected
      const filteredTrips = selectedTaxiRankId 
        ? loadedTrips.filter(t => t.taxiRankId === selectedTaxiRankId)
        : loadedTrips;
      
      setTrips(filteredTrips);
      groupTripsByDate(filteredTrips);
    } catch (err) {
      console.warn('Load trips error:', err?.message);
    } finally {
      setLoadingSchedules(false);
    }
  }

  // Load routes for taxi rank using dedicated Routes endpoint
  async function loadRoutesForTaxiRank(taxiRankId) {
    try {
      if (!taxiRankId) {
        console.warn('No taxiRankId provided for loading routes');
        return;
      }
      
      console.log(`Loading routes for taxi rank: ${taxiRankId}`);
      const resp = await client.get(`/Routes?taxiRankId=${taxiRankId}`);
      const loadedRoutes = resp.data || [];
      
      console.log(`Loaded ${loadedRoutes.length} routes for taxi rank ${taxiRankId}`, loadedRoutes.map(r => r.routeName || r.name));
      setRoutes(loadedRoutes);
    } catch (err) {
      console.warn('Load routes error:', err?.response?.status, err?.response?.data || err?.message);
      setRoutes([]);
    }
  }

  // Load vehicles for route - use vehicles embedded in route data from Routes API
  function loadVehiclesForRoute(routeId) {
    // First try to get vehicles from the route data (Routes API includes them)
    const route = routes.find(r => r.id === routeId);
    if (route?.vehicles && route.vehicles.length > 0) {
      console.log(`Found ${route.vehicles.length} vehicles embedded in route`);
      setDisplayVehicles(route.vehicles);
      return;
    }

    // Fallback: check VehicleRouteAssignments
    const assignedVehicles = vehicleRouteAssignments
      .filter(assignment => assignment.routeId === routeId && assignment.isActive)
      .map(assignment => assignment.vehicle)
      .filter(vehicle => vehicle != null);
    
    if (assignedVehicles.length > 0) {
      console.log(`Found ${assignedVehicles.length} vehicles from assignments`);
      setDisplayVehicles(assignedVehicles);
      return;
    }

    // Final fallback: load all vehicles from the /Vehicles endpoint
    console.log('No route-specific vehicles found, loading all vehicles');
    client.get('/Vehicles')
      .then(resp => {
        const allVehicles = resp.data || [];
        console.log(`Loaded ${allVehicles.length} vehicles as fallback`);
        setDisplayVehicles(allVehicles);
      })
      .catch(err => {
        console.warn('Failed to load fallback vehicles:', err?.message);
        setDisplayVehicles([]);
      });
  }

  // ===== HELPERS =====
  const selectedTaxiRank = taxiRanks.find(r => r.id === selectedTaxiRankId);
  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const selectedMarshal = marshals.find(m => m.id === selectedMarshalId);

  // Helper function to format departure time (TimeSpan or string)
  function formatDepartureTime(time) {
    if (!time) return 'Not set';
    
    // If it's a TimeSpan object or string like "08:00:00"
    if (typeof time === 'string') {
      // Handle TimeSpan format (HH:MM:SS)
      if (time.includes(':')) {
        const parts = time.split(':');
        if (parts.length >= 2) {
          const hours = parts[0];
          const minutes = parts[1];
          return `${hours}:${minutes}`;
        }
      }
      return time;
    }
    
    // If it's a Date object
    if (time instanceof Date) {
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Fallback
    return String(time);
  };

  // Load scheduled trips when filter date changes
  useEffect(() => {
    if (admin) {
      loadTripsForRank();
    }
  }, [filterDate, admin]);

  // ===== DELETE FUNCTIONS - Aligned with Web =====
  const confirmDeleteTrip = (trip) => {
    console.log('Delete trip button clicked:', trip);
    setTripToDelete(trip);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;
    
    console.log('User confirmed delete, calling delete with ID:', tripToDelete.id);
    try {
      setLoadingSchedules(true);
      // Use the same endpoint as web
      await client.delete(`/TaxiRankTrips/${tripToDelete.id}`);
      console.log('API call successful');
      setDeleteModalVisible(false);
      setTripToDelete(null);
      Alert.alert('Success', 'Trip deleted successfully');
      loadTripsForRank(); // Refresh using web-compatible function
    } catch (err) {
      console.error('Delete trip error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete trip';
      Alert.alert('Error', errorMessage);
      setDeleteModalVisible(false);
      setTripToDelete(null);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const cancelDelete = () => {
    console.log('Delete cancelled');
    setDeleteModalVisible(false);
    setTripToDelete(null);
  };

  // ===== PASSENGER CAPTURE - Matches Web Functionality =====
  const openPassengerCapture = async (trip) => {
    setSelectedTripForPassengers(trip);
    // Pre-fill with trip route info
    setPassengerDepartureStation(trip.departureStation || '');
    setPassengerArrivalStation(trip.destinationStation || trip.arrivalStation || '');
    setPassengerName('');
    setPassengerPhone('');
    setPassengerAmount('');
    setPassengerPaymentMethod('Cash');
    setPassengerSeatNumber('');
    setSelectedStop(null);

    // Find matching route stops for this trip
    // First check loaded routes, then fetch from API if needed
    let matchedStops = [];
    const matchedRoute = routes.find(r =>
      r.departureStation === trip.departureStation &&
      r.destinationStation === trip.destinationStation
    );

    if (matchedRoute?.stops?.length > 0) {
      matchedStops = matchedRoute.stops;
    } else if (trip.taxiRankId) {
      // Fetch routes for this taxi rank to get stops
      try {
        const resp = await client.get(`/Routes?taxiRankId=${trip.taxiRankId}`);
        const fetchedRoutes = resp.data || [];
        const found = fetchedRoutes.find(r =>
          r.departureStation === trip.departureStation &&
          r.destinationStation === trip.destinationStation
        );
        if (found?.stops?.length > 0) {
          matchedStops = found.stops;
        }
      } catch (err) {
        console.warn('Could not fetch route stops:', err?.message);
      }
    }

    // Build stop list: origin + intermediate stops + final destination
    const allStops = [];
    // Add intermediate stops sorted by order
    const sorted = [...matchedStops].sort((a, b) => a.stopOrder - b.stopOrder);
    sorted.forEach(stop => {
      allStops.push({
        id: stop.stopName,
        name: stop.stopName,
        fare: stop.fareFromOrigin,
        order: stop.stopOrder,
        estimatedMinutes: stop.estimatedMinutesFromDeparture,
      });
    });
    // Add final destination with standard fare
    if (matchedRoute) {
      allStops.push({
        id: '__destination__',
        name: trip.destinationStation || matchedRoute.destinationStation,
        fare: matchedRoute.standardFare,
        order: 999,
        estimatedMinutes: matchedRoute.expectedDurationMinutes,
      });
    }

    console.log(`Loaded ${allStops.length} stops for passenger capture`);
    setTripStops(allStops);
    setPassengerModalVisible(true);
  };

  const selectStop = (stop) => {
    setSelectedStop(stop);
    setPassengerArrivalStation(stop.name);
    setPassengerAmount(stop.fare != null ? String(stop.fare) : '');
    setStopModalVisible(false);
  };

  const closePassengerModal = () => {
    setPassengerModalVisible(false);
    setSelectedTripForPassengers(null);
    setTripStops([]);
    setSelectedStop(null);
  };

  const submitPassenger = async () => {
    if (!selectedTripForPassengers) return;
    if (!passengerName.trim()) return Alert.alert('Validation', 'Please enter passenger name');
    if (!passengerPhone.trim()) return Alert.alert('Validation', 'Please enter passenger phone');
    if (!passengerAmount.trim()) return Alert.alert('Validation', 'Please enter fare amount');

    try {
      const passengerData = {
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        departureStation: passengerDepartureStation.trim(),
        arrivalStation: passengerArrivalStation.trim(),
        amount: parseFloat(passengerAmount) || 0,
        paymentMethod: passengerPaymentMethod,
        seatNumber: passengerSeatNumber ? parseInt(passengerSeatNumber) : null,
        notes: ''
      };

      // Use the same endpoint as web
      await client.post(`/TaxiRankTrips/${selectedTripForPassengers.id}/passengers`, passengerData);
      
      Alert.alert('Success', 'Passenger captured successfully!');
      closePassengerModal();
      loadTripsForRank(); // Refresh to update passenger count
    } catch (err) {
      console.error('Add passenger error:', err);
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to add passenger');
    }
  };

  // ===== FORM HANDLERS - Aligned with Web =====
  function selectTaxiRank(rank) {
    setSelectedTaxiRankId(rank.id);
    setSelectedRouteId('');
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setSelectedMarshalId('');
    setTaxiRankModalVisible(false);
    // Load routes for this taxi rank like web does
    loadRoutesForTaxiRank(rank.id);
  }

  function selectRoute(route) {
    setSelectedRouteId(route.id);
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setRouteModalVisible(false);
    // Load vehicles for this route using VehicleRouteAssignments like web
    loadVehiclesForRoute(route.id);
  }

  function selectVehicle(vehicle) {
    setSelectedVehicleId(vehicle.id);
    
    // Auto-populate driver if one is assigned to this vehicle
    const assignedDriver = drivers.find(driver => driver.assignedVehicleId === vehicle.id);
    if (assignedDriver) {
      setSelectedDriverId(assignedDriver.id);
      // Show toast or alert for auto-assignment
      Alert.alert('Driver Auto-Assigned', `${assignedDriver.name} is automatically selected as they are assigned to this vehicle.`);
    } else {
      setSelectedDriverId('');
    }
    
    setVehicleModalVisible(false);
  }

  function selectDriver(driver) {
    setSelectedDriverId(driver.id);
    setDriverModalVisible(false);
  }

  function selectMarshal(marshal) {
    setSelectedMarshalId(marshal.id);
    setMarshalModalVisible(false);
  }

  async function handleSubmit() {
    if (!selectedTaxiRankId) return Alert.alert('Validation', 'Please select a taxi rank');
    if (!selectedRoute) return Alert.alert('Validation', 'Please select a route');
    if (!selectedVehicleId) return Alert.alert('Validation', 'Please select a vehicle');
    if (!selectedDriverId) return Alert.alert('Validation', 'Please select a driver');
    if (!departureTime) return Alert.alert('Validation', 'Please set departure time');
    if (!admin) return Alert.alert('Error', 'Admin profile not loaded');

    setSubmitting(true);
    try {
      // Combine scheduled date and departure time into a DateTime like web
      const scheduledDateTime = new Date(scheduledDate);
      const [hours, minutes] = departureTime.split(':').map(Number);
      scheduledDateTime.setHours(hours || 8, minutes || 0, 0, 0);

      // Transform form data to match web's CreateTripDto
      const tripData = {
        tenantId: admin.tenantId,
        vehicleId: selectedVehicleId,
        driverId: selectedDriverId || null,
        marshalId: selectedMarshalId || null,
        taxiRankId: selectedTaxiRankId,
        departureStation: selectedRoute.departureStation || selectedRoute.origin || '',
        destinationStation: selectedRoute.destinationStation || selectedRoute.destination || '',
        departureTime: scheduledDateTime.toISOString(),
        notes: notes.trim() || `Trip scheduled for ${selectedRoute.routeName || selectedRoute.name}`
      };

      console.log('Creating trip with data:', tripData);
      
      // Use the same endpoint as web
      await client.post('/TaxiRankTrips', tripData);
      
      Alert.alert('Success', 'Trip scheduled successfully!');
      resetForm();
      loadTripsForRank(); // Refresh using web-compatible function
    } catch (err) {
      console.error('Create trip error:', err);
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedRouteId('');
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setSelectedMarshalId('');
    setScheduledDate(new Date());
    setScheduleEndDate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d;
    });
    setDepartureTime('08:00');
    setEstimatedArrivalTime('');
    setFrequencyMinutes(60);
    setSelectedDays([1, 2, 3, 4, 5]);
    setGenerateMultipleTrips(true);
    setNotes('');
  }

  const inp = [styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }];

  const handleTimeChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setDepartureTime(`${hours}:${minutes}`);
    }
    setTimePickerVisible(false);
  };

  const handleArrivalTimeChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setEstimatedArrivalTime(`${hours}:${minutes}`);
    }
    setArrivalTimePickerVisible(false);
  };

  const handleEndDateChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      setScheduleEndDate(selectedDate);
    }
    setEndDatePickerVisible(false);
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      setScheduledDate(selectedDate);
    }
    setDatePickerVisible(false);
  };

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
          <Text style={styles.headerTitle}>Create Trip Schedule</Text>
          <Text style={styles.headerSub}>Plan daily trip rosters</Text>
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        data={[
          { type: 'header', title: 'Create New Trip' },
          { type: 'scheduleManagementHeader' },
          // Flatten grouped trips by date
          ...tripDates.flatMap(date => [
            { type: 'dateHeader', date },
            ...(groupedTrips[date] || []).map(trip => ({ type: 'trip', data: trip }))
          ])
        ]}
        keyExtractor={(item, index) => {
          if (item.type === 'trip') return `trip-${item.data.id}`;
          if (item.type === 'dateHeader') return `date-${item.date}-${index}`;
          return `section-${item.type}-${index}`;
        }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View>
                {/* Taxi Rank */}
                <Text style={[styles.sectionTitle, { color: c.text }]}>Taxi Rank *</Text>
                <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setTaxiRankModalVisible(true)}>
                  <Ionicons name="location-outline" size={18} color={GOLD} />
                  <Text style={[styles.pickerText, { color: selectedTaxiRankId ? c.text : c.textMuted }]}>
                    {selectedTaxiRankId ? (taxiRanks.find(r => r.id === selectedTaxiRankId)?.name || 'Selected') : 'Select taxi rank'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                </TouchableOpacity>

                {/* Route */}
                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Route *</Text>
                <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setRouteModalVisible(true)}>
                  <Ionicons name="git-branch-outline" size={18} color={GOLD} />
                  <Text style={[styles.pickerText, { color: selectedRouteId ? c.text : c.textMuted }]}>
                    {selectedRouteId ? (routes.find(r => r.id === selectedRouteId)?.routeName || routes.find(r => r.id === selectedRouteId)?.name || 'Selected') : 'Select route'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                </TouchableOpacity>

                {/* Vehicle */}
                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Vehicle *</Text>
                <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setVehicleModalVisible(true)}>
                  <Ionicons name="bus-outline" size={18} color={GOLD} />
                  <Text style={[styles.pickerText, { color: selectedVehicleId ? c.text : c.textMuted }]}>
                    {selectedVehicleId ? (displayVehicles.find(v => v.id === selectedVehicleId)?.registration || 'Selected') : 'Select vehicle'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                </TouchableOpacity>

                {/* Driver */}
                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Driver *</Text>
                <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setDriverModalVisible(true)}>
                  <Ionicons name="person-outline" size={18} color={GOLD} />
                  <Text style={[styles.pickerText, { color: selectedDriverId ? c.text : c.textMuted }]}>
                    {selectedDriverId ? (drivers.find(d => d.id === selectedDriverId)?.name || 'Selected') : 'Select driver'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                </TouchableOpacity>

                {/* Marshal */}
                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Marshal (Optional)</Text>
                <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => setMarshalModalVisible(true)}>
                  <Ionicons name="shield-outline" size={18} color={GOLD} />
                  <Text style={[styles.pickerText, { color: selectedMarshalId ? c.text : c.textMuted }]}>
                    {selectedMarshalId ? (marshals.find(m => m.id === selectedMarshalId)?.fullName || 'Selected') : 'Select marshal'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                </TouchableOpacity>

                {/* Date & Time */}
                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>Schedule Time</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: c.textMuted }]}>Scheduled Date</Text>
                    <TouchableOpacity style={[inp, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setDatePickerVisible(true)}>
                      <Text style={{ color: c.text }}>{scheduledDate.toLocaleDateString()}</Text>
                      <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: c.textMuted }]}>Departure Time</Text>
                    <TouchableOpacity style={[inp, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => {
                      const [hours, minutes] = departureTime.split(':').map(Number);
                      const newDate = new Date();
                      newDate.setHours(hours, minutes, 0, 0);
                      setTimePickerDate(newDate);
                      setTimePickerVisible(true);
                    }}>
                      <Text style={{ color: c.text }}>{departureTime}</Text>
                      <Ionicons name="time-outline" size={18} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Estimated Arrival Time */}
                <Text style={[styles.label, { color: c.textMuted }]}>Estimated Arrival Time</Text>
                <TouchableOpacity style={[inp, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => {
                  const [hours, minutes] = (estimatedArrivalTime || '09:00').split(':').map(Number);
                  const newDate = new Date();
                  newDate.setHours(hours || 9, minutes || 0, 0, 0);
                  setTimePickerDate(newDate);
                  setArrivalTimePickerVisible(true);
                }}>
                  <Text style={{ color: estimatedArrivalTime ? c.text : c.textMuted }}>
                    {estimatedArrivalTime || 'Select arrival time'}
                  </Text>
                  <Ionicons name="flag-outline" size={18} color={c.textMuted} />
                </TouchableOpacity>

                {/* Multi-Trip Generation Settings */}
                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Trip Generation Settings</Text>
                
                {/* Toggle for single vs multiple trips */}
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}
                  onPress={() => setGenerateMultipleTrips(!generateMultipleTrips)}
                >
                  <View style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: generateMultipleTrips ? GOLD : c.border,
                    justifyContent: 'center',
                    paddingHorizontal: 2
                  }}>
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#fff',
                      transform: [{ translateX: generateMultipleTrips ? 22 : 0 }]
                    }} />
                  </View>
                  <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>
                    Generate multiple trips
                  </Text>
                </TouchableOpacity>

                {generateMultipleTrips && (
                  <>
                    {/* End Date */}
                    <Text style={[styles.label, { color: c.textMuted }]}>End Date</Text>
                    <TouchableOpacity style={[inp, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setEndDatePickerVisible(true)}>
                      <Text style={{ color: c.text }}>{scheduleEndDate.toLocaleDateString()}</Text>
                      <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
                    </TouchableOpacity>

                    {/* Frequency */}
                    <Text style={[styles.label, { color: c.textMuted }]}>Frequency (minutes)</Text>
                    <View style={[inp, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                      <TextInput
                        value={String(frequencyMinutes)}
                        onChangeText={(text) => setFrequencyMinutes(parseInt(text) || 60)}
                        style={{ flex: 1, color: c.text, fontSize: 14 }}
                        keyboardType="numeric"
                      />
                      <Text style={{ color: c.textMuted, fontSize: 12 }}>min</Text>
                    </View>

                    {/* Days of Week */}
                    <Text style={[styles.label, { color: c.textMuted, marginTop: 8 }]}>Operating Days</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {[
                        { key: 1, label: 'Mon' },
                        { key: 2, label: 'Tue' },
                        { key: 3, label: 'Wed' },
                        { key: 4, label: 'Thu' },
                        { key: 5, label: 'Fri' },
                        { key: 6, label: 'Sat' },
                        { key: 7, label: 'Sun' },
                      ].map(day => (
                        <TouchableOpacity
                          key={day.key}
                          onPress={() => toggleDay(day.key)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: selectedDays.includes(day.key) ? GOLD : c.surface,
                            borderWidth: 1,
                            borderColor: selectedDays.includes(day.key) ? GOLD : c.border
                          }}
                        >
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: selectedDays.includes(day.key) ? '#000' : c.textMuted
                          }}>
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={[styles.label, { color: c.textMuted }]}>Notes</Text>
                <TextInput value={notes} onChangeText={setNotes} style={[inp, { minHeight: 56 }]} placeholder="Optional notes" placeholderTextColor={c.textMuted} multiline />

                <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
                  {submitting ? <ActivityIndicator color="#000" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
                      <Text style={styles.primaryBtnText}>Create Trip Schedule</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          }

          if (item.type === 'scheduleManagementHeader') {
            return (
              <View style={[styles.scheduleSection, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.scheduleHeader}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>All Trip Schedules</Text>
                  <View style={styles.scheduleActions}>
                    <TouchableOpacity
                      style={[styles.filterToggle, { backgroundColor: showFilters ? GOLD : c.background }]}
                      onPress={() => setShowFilters(!showFilters)}
                    >
                      <Ionicons name="options-outline" size={16} color={showFilters ? '#000' : c.text} />
                      <Text style={[styles.filterToggleText, { color: showFilters ? '#000' : c.text }]}>
                        Filters
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.viewToggle, { backgroundColor: showAllTrips ? GOLD : c.background }]}
                      onPress={() => setShowAllTrips(!showAllTrips)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={showAllTrips ? '#000' : c.text} />
                      <Text style={[styles.viewToggleText, { color: showAllTrips ? '#000' : c.text }]}>
                        {showAllTrips ? 'All' : 'Today'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {showFilters && (
                  <View style={styles.filterControls}>
                    <View style={styles.filterRow}>
                      <TouchableOpacity
                        style={[styles.filterBtn, { backgroundColor: c.background, borderColor: c.border }]}
                        onPress={() => setFilterDate(new Date())}
                      >
                        <Ionicons name="calendar-outline" size={16} color={GOLD} />
                        <Text style={[styles.filterBtnText, { color: c.text }]}>
                          {filterDate.toLocaleDateString()}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {loadingSchedules && (
                  <View style={[styles.center, { paddingVertical: 20 }]}>
                    <ActivityIndicator size="small" color={GOLD} />
                    <Text style={[styles.label, { color: c.textMuted, marginTop: 8 }]}>Loading trips...</Text>
                  </View>
                )}

                {!loadingSchedules && tripDates.length === 0 && (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="calendar-outline" size={48} color={c.textMuted} />
                    <Text style={[styles.emptyTitle, { color: c.text }]}>No Trip Schedules Found</Text>
                    <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
                      Create your first trip schedule using the form above.
                    </Text>
                  </View>
                )}
              </View>
            );
          }

          if (item.type === 'dateHeader') {
            return (
              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <Text style={[styles.dateHeader, { color: c.text }]}>{item.date}</Text>
              </View>
            );
          }

          if (item.type === 'trip') {
            const trip = item.data;
            const departureTime = trip.departureTime ? new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not set';
            
            // Status colors matching web
            const getStatusColor = (status) => {
              switch (status) {
                case 'Departed': return { bg: '#fff3cd', text: '#856404' };
                case 'InTransit': return { bg: '#cce5ff', text: '#004085' };
                case 'Arrived': return { bg: '#d4edda', text: '#155724' };
                case 'Completed': return { bg: '#d1ecf1', text: '#0c5460' };
                default: return { bg: GREEN_LIGHT, text: GREEN };
              }
            };
            const statusColors = getStatusColor(trip.status);
            
            return (
              <View key={trip.id} style={[styles.newScheduleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                {/* Trip Header */}
                <View style={styles.cardScheduleHeader}>
                  <View style={styles.scheduleHeaderLeft}>
                    <View style={styles.scheduleTimeContainer}>
                      <Ionicons name="time-outline" size={16} color={GOLD} />
                      <Text style={[styles.scheduleTime, { color: c.text }]}>
                        {departureTime}
                      </Text>
                    </View>
                    <Text style={[styles.scheduleRouteName, { color: c.text }]}>
                      {trip.departureStation} → {trip.destinationStation}
                    </Text>
                  </View>
                  <View style={styles.scheduleHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusText, { color: statusColors.text }]}>
                        {trip.status || 'Scheduled'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Trip Info - Vehicle, Driver, Marshal, Passengers */}
                <View style={styles.scheduleInfo}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Ionicons name="bus-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.infoText, { color: c.text }]}>
                        {trip.vehicle?.registration || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="person-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.infoText, { color: c.text }]}>
                        {trip.driver?.name || 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Ionicons name="shield-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.infoText, { color: c.text }]}>
                        {trip.marshal?.fullName || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="people-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.infoText, { color: c.text }]}>
                        {trip.passengerCount || 0} passengers
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons - Passenger Capture + Delete */}
                <View style={styles.scheduleActions}>
                  <TouchableOpacity
                    style={[styles.editScheduleBtn, { backgroundColor: GOLD }]}
                    onPress={() => openPassengerCapture(trip)}
                  >
                    <Ionicons name="people-outline" size={14} color="#000" />
                    <Text style={[styles.editBtnText, { color: '#000' }]}>Capture Passenger</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: RED }]}
                    onPress={() => confirmDeleteTrip(trip)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#fff" />
                    <Text style={[styles.deleteBtnText, { color: '#fff' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return null;
        }}
        ListHeaderComponent={null}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} colors={[GOLD]} tintColor={GOLD} />
        }
      />

      {/* ===== TAXI RANK PICKER MODAL ===== */}
      <Modal visible={taxiRankModalVisible} animationType="slide" transparent onRequestClose={() => setTaxiRankModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Taxi Rank" onClose={() => setTaxiRankModalVisible(false)} c={c} />
            <FlatList
              data={taxiRanks}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: item.id === selectedTaxiRankId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedTaxiRankId ? GOLD : c.border }]}
                  onPress={() => selectTaxiRank(item)}
                >
                  <Ionicons name="business-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.name}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.location}</Text>
                  </View>
                  {item.id === selectedTaxiRankId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>No taxi ranks</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== ROUTE PICKER MODAL ===== */}
      <Modal visible={routeModalVisible} animationType="slide" transparent onRequestClose={() => setRouteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Route" onClose={() => setRouteModalVisible(false)} c={c} />
            <FlatList
              data={routes}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: item.id === selectedRouteId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedRouteId ? GOLD : c.border }]}
                  onPress={() => selectRoute(item)}
                >
                  <Ionicons name="git-branch-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.routeName}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.departureStation} → {item.destinationStation} · R{item.standardFare}</Text>
                  </View>
                  {item.id === selectedRouteId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>No routes for this taxi rank</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== VEHICLE PICKER MODAL ===== */}
      <Modal visible={vehicleModalVisible} animationType="slide" transparent onRequestClose={() => setVehicleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Vehicle" onClose={() => setVehicleModalVisible(false)} c={c} />
            <FlatList
              data={displayVehicles}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: item.id === selectedVehicleId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedVehicleId ? GOLD : c.border }]}
                  onPress={() => selectVehicle(item)}
                >
                  <Ionicons name="bus-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.registration}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.make} {item.model}</Text>
                  </View>
                  {item.id === selectedVehicleId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>
                  {selectedRouteId ? 'No vehicles assigned to this route' : 'Select a route first'}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ===== DRIVER PICKER MODAL ===== */}
      <Modal visible={driverModalVisible} animationType="slide" transparent onRequestClose={() => setDriverModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Driver" onClose={() => setDriverModalVisible(false)} c={c} />
            <FlatList
              data={drivers}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isAssigned = item.assignedVehicleId === selectedVehicleId;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, { backgroundColor: item.id === selectedDriverId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedDriverId ? GOLD : c.border }]}
                    onPress={() => selectDriver(item)}
                  >
                    <Ionicons name="person-outline" size={18} color={GOLD} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemTitle, { color: c.text }]}>{item.name}</Text>
                    </View>
                    {isAssigned && (
                      <View style={{ backgroundColor: GREEN, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>ASSIGNED</Text>
                      </View>
                    )}
                    {item.id === selectedDriverId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>No drivers</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== MARSHAL PICKER MODAL ===== */}
      <Modal visible={marshalModalVisible} animationType="slide" transparent onRequestClose={() => setMarshalModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Marshal" onClose={() => setMarshalModalVisible(false)} c={c} />
            <FlatList
              data={marshals}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, { backgroundColor: item.id === selectedMarshalId ? GOLD_LIGHT : c.surface, borderColor: item.id === selectedMarshalId ? GOLD : c.border }]}
                  onPress={() => selectMarshal(item)}
                >
                  <Ionicons name="shield-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>{item.fullName}</Text>
                    <Text style={[styles.listItemSub, { color: c.textMuted }]}>{item.marshalCode}</Text>
                  </View>
                  {item.id === selectedMarshalId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>No marshals</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL - Aligned with Web ===== */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent onRequestClose={cancelDelete}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background, margin: 20, borderRadius: 14 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>
                Delete Trip
              </Text>
              <TouchableOpacity onPress={cancelDelete}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.deleteMessage, { color: c.text, marginBottom: 24 }]}>
                {tripToDelete
                  ? `Are you sure you want to delete this trip from ${tripToDelete.departureStation} to ${tripToDelete.destinationStation} on ${new Date(tripToDelete.departureTime).toLocaleDateString()}?\n\nThis action cannot be undone.`
                  : 'Are you sure you want to delete this trip?\n\nThis action cannot be undone.'
                }
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

      {/* ===== PASSENGER CAPTURE MODAL - Matches Web Functionality ===== */}
      <Modal visible={passengerModalVisible} animationType="slide" transparent onRequestClose={closePassengerModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background, margin: 20, borderRadius: 14, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>
                Capture Passenger
              </Text>
              <TouchableOpacity onPress={closePassengerModal}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ padding: 16 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>Passenger Name *</Text>
              <TextInput
                value={passengerName}
                onChangeText={setPassengerName}
                style={[styles.input, { color: c.text }]}
                placeholder="Enter passenger name"
                placeholderTextColor={c.textMuted}
              />

              <Text style={[styles.label, { color: c.textMuted, marginTop: 12 }]}>Phone Number *</Text>
              <TextInput
                value={passengerPhone}
                onChangeText={setPassengerPhone}
                style={[styles.input, { color: c.text }]}
                placeholder="Enter phone number"
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: c.textMuted, marginTop: 12 }]}>Departure Station</Text>
              <TextInput
                value={passengerDepartureStation}
                onChangeText={setPassengerDepartureStation}
                style={[styles.input, { color: c.text }]}
                placeholder="From"
                placeholderTextColor={c.textMuted}
              />

              <Text style={[styles.label, { color: c.textMuted, marginTop: 12 }]}>Alighting Stop *</Text>
              {tripStops.length > 0 ? (
                <TouchableOpacity 
                  style={[styles.pickerBtn, { backgroundColor: c.surface, borderColor: selectedStop ? GOLD : c.border }]} 
                  onPress={() => setStopModalVisible(true)}
                >
                  <Ionicons name="flag-outline" size={18} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerText, { color: selectedStop ? c.text : c.textMuted }]}>
                      {selectedStop ? selectedStop.name : 'Select alighting stop'}
                    </Text>
                    {selectedStop && (
                      <Text style={{ color: GOLD, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                        Fare: R{Number(selectedStop.fare).toFixed(2)}
                        {selectedStop.estimatedMinutes ? ` · ~${selectedStop.estimatedMinutes} min` : ''}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                </TouchableOpacity>
              ) : (
                <TextInput
                  value={passengerArrivalStation}
                  onChangeText={setPassengerArrivalStation}
                  style={[styles.input, { color: c.text }]}
                  placeholder="To"
                  placeholderTextColor={c.textMuted}
                />
              )}

              <Text style={[styles.label, { color: c.textMuted, marginTop: 12 }]}>Fare Amount (R) *</Text>
              <TextInput
                value={passengerAmount}
                onChangeText={setPassengerAmount}
                style={[styles.input, { color: c.text, backgroundColor: selectedStop ? GOLD_LIGHT : c.surface }]}
                placeholder="0.00"
                placeholderTextColor={c.textMuted}
                keyboardType="decimal-pad"
              />
              {selectedStop && (
                <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 4 }}>
                  Auto-filled from stop fare. You can adjust if needed.
                </Text>
              )}

              <Text style={[styles.label, { color: c.textMuted, marginTop: 12 }]}>Payment Method</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                {['Cash', 'Card'].map(method => (
                  <TouchableOpacity
                    key={method}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: passengerPaymentMethod === method ? GOLD : c.border,
                      backgroundColor: passengerPaymentMethod === method ? GOLD_LIGHT : c.surface,
                      alignItems: 'center'
                    }}
                    onPress={() => setPassengerPaymentMethod(method)}
                  >
                    <Ionicons 
                      name={method === 'Cash' ? 'cash-outline' : 'card-outline'} 
                      size={20} 
                      color={passengerPaymentMethod === method ? GOLD : c.textMuted} 
                    />
                    <Text style={{ 
                      color: passengerPaymentMethod === method ? c.text : c.textMuted,
                      fontWeight: passengerPaymentMethod === method ? '600' : '400',
                      marginTop: 4
                    }}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: c.textMuted, marginTop: 12 }]}>Seat Number (Optional)</Text>
              <TextInput
                value={passengerSeatNumber}
                onChangeText={setPassengerSeatNumber}
                style={[styles.input, { color: c.text }]}
                placeholder="e.g., 5"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 32 }}>
                <TouchableOpacity 
                  style={[styles.deleteCancelBtn, { backgroundColor: c.surface, borderColor: c.border, flex: 1 }]} 
                  onPress={closePassengerModal}
                >
                  <Text style={[styles.deleteCancelText, { color: c.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.deleteConfirmBtn, { backgroundColor: GOLD, flex: 1 }]} 
                  onPress={submitPassenger}
                >
                  <Text style={[styles.deleteConfirmText, { color: '#000' }]}>Add Passenger</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== STOP PICKER MODAL ===== */}
      <Modal visible={stopModalVisible} animationType="slide" transparent onRequestClose={() => setStopModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
            <ModalHeader title="Select Alighting Stop" onClose={() => setStopModalVisible(false)} c={c} />
            <FlatList
              data={tripStops}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    { 
                      backgroundColor: selectedStop?.id === item.id ? GOLD_LIGHT : c.surface, 
                      borderColor: selectedStop?.id === item.id ? GOLD : c.border 
                    }
                  ]}
                  onPress={() => selectStop(item)}
                >
                  <View style={{ 
                    width: 28, height: 28, borderRadius: 14, 
                    backgroundColor: item.id === '__destination__' ? GREEN : GOLD_LIGHT,
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Text style={{ 
                      fontSize: 12, fontWeight: '700', 
                      color: item.id === '__destination__' ? '#fff' : GOLD 
                    }}>
                      {item.id === '__destination__' ? '★' : item.order}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: c.text }]}>
                      {item.name}
                      {item.id === '__destination__' ? ' (Final)' : ''}
                    </Text>
                    <Text style={{ color: GOLD, fontSize: 13, fontWeight: '600' }}>
                      R{Number(item.fare).toFixed(2)}
                      {item.estimatedMinutes ? ` · ~${item.estimatedMinutes} min from departure` : ''}
                    </Text>
                  </View>
                  {selectedStop?.id === item.id && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted, textAlign: 'center' }]}>
                  No stops available for this route
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ===== DATE PICKER ===== */}
      {datePickerVisible && (
        <DateTimePicker
          value={scheduledDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {/* ===== TIME PICKER ===== */}
      {timePickerVisible && (
        <DateTimePicker
          value={timePickerDate}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* ===== ARRIVAL TIME PICKER ===== */}
      {arrivalTimePickerVisible && (
        <DateTimePicker
          value={timePickerDate}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleArrivalTimeChange}
        />
      )}

      {/* ===== END DATE PICKER ===== */}
      {endDatePickerVisible && (
        <DateTimePicker
          value={scheduleEndDate}
          mode="date"
          display="default"
          minimumDate={scheduledDate}
          onChange={handleEndDateChange}
        />
      )}
    </View>
  );
}

function ModalHeader({ title, onClose, c }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={[styles.modalTitle, { color: c.text }]}>{title}</Text>
      <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={c.textMuted} /></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: GOLD, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  body: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  label: { fontSize: 10, fontWeight: '700', marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 2 },
  row: { flexDirection: 'row', gap: 10 },

  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 6 },
  pickerText: { flex: 1, fontSize: 14 },

  primaryBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: '#000' },

  scheduleCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  scheduleTime: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  scheduleRoute: { fontSize: 14, marginBottom: 4 },
  scheduleDetails: { fontSize: 12, marginBottom: 2 },
  scheduleMeta: { fontSize: 11, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Schedule management styles
  scheduleSection: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16, marginTop: 24 },
  scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scheduleActions: { flexDirection: 'row', gap: 8 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  filterToggleText: { fontSize: 12, fontWeight: '600' },
  viewToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  viewToggleText: { fontSize: 12, fontWeight: '600' },
  filterControls: { marginTop: 12 },
  filterRow: { flexDirection: 'row', gap: 12 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 12 },
  filterBtnText: { flex: 1, fontSize: 14 },
  // New schedule card styles
  newScheduleCard: { 
    borderRadius: 16, 
    borderWidth: 1, 
    marginBottom: 16, 
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardScheduleHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    padding: 16, 
    paddingBottom: 8,
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  scheduleHeaderLeft: { flex: 1 },
  scheduleTimeContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginBottom: 6 
  },
  scheduleRouteName: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1a1a2e',
    marginBottom: 2
  },
  scheduleHeaderRight: { alignItems: 'flex-end' },
  routeDetails: { 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  routeHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stationBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    padding: 10,
  },
  stationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stationLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  stationName: {
    fontSize: 13,
    fontWeight: '700',
  },
  routeArrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  routeArrowLine: {
    width: 6,
    height: 2,
    borderRadius: 1,
  },
  routePath: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  routeText: { 
    fontSize: 15, 
    fontWeight: '600',
    color: '#333'
  },
  scheduleInfo: { 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8 
  },
  infoItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  infoText: { 
    fontSize: 13, 
    fontWeight: '500',
    color: '#555'
  },
  assignmentInfo: { 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  assignmentRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    marginBottom: 8
  },
  assignmentItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  assignmentText: { 
    fontSize: 13, 
    fontWeight: '500',
    color: '#666'
  },
  vehicleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  vehicleSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehicleChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  vehicleChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  noVehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  noVehicleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 8,
    marginTop: 8
  },
  notesText: { 
    fontSize: 12, 
    fontStyle: 'italic',
    flex: 1
  },
  scheduleActions: { 
    flexDirection: 'row', 
    gap: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  editBtnText: { 
    fontSize: 12, 
    fontWeight: '600',
    marginLeft: 4
  },
  deleteBtnText: { 
    fontSize: 12, 
    fontWeight: '600',
    marginLeft: 4
  },
  scheduledTripsHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tripDateTime: { 
    flex: 1 
  },
  tripDetails: { 
    flex: 2,
    alignItems: 'flex-start'
  },
  tripVehicle: { 
    fontSize: 12, 
    fontWeight: '500',
    marginBottom: 2
  },
  tripDriver: { 
    fontSize: 12, 
    fontWeight: '500'
  },

  // Original styles (keeping for compatibility)
  scheduleContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scheduleMain: { flex: 1 },
  scheduleActionsRow: { flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  scheduleHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editScheduleBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    borderRadius: 6 
  },
  linkText: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },

  dateHeader: { fontSize: 13, fontWeight: '900', marginBottom: 8, textTransform: 'uppercase' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', minHeight: '50%' },
  editScheduleModalSheet: { maxHeight: '80%', minHeight: '60%', marginHorizontal: 16, marginVertical: 40 },
  editScheduleScroll: { flex: 1 },
  editScheduleScrollContent: { padding: 16, paddingBottom: 32 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  formHalf: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontSize: 17, fontWeight: '900' },

  // Delete modal styles
  modalBody: { padding: 16, paddingBottom: 40 },
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

  // Scheduled trips styles
  scheduledTripsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  scheduledTripsTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  scheduledTripItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 10, 
    borderRadius: 8, 
    borderWidth: 1, 
    marginBottom: 6 
  },
  scheduledTripMain: { flex: 1 },
  scheduledTripDate: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  scheduledTripTime: { fontSize: 11, marginBottom: 2 },
  scheduledTripStatus: { fontSize: 10, fontWeight: '600' },
  deleteTripBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    borderRadius: 6 
  },
  scheduledTripActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editTripBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    borderRadius: 6 
  },
  
  // Edit trip modal styles
  editTripActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  editTripCancelBtn: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 10, 
    borderWidth: 1, 
    alignItems: 'center' 
  },
  editTripCancelText: { fontSize: 16, fontWeight: '600' },
  editTripSaveBtn: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  editTripSaveText: { fontSize: 16, fontWeight: '600', color: '#000' },

  // Switch styles
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 24 },
  switch: { 
    width: 48, 
    height: 28, 
    borderRadius: 14, 
    justifyContent: 'center', 
    paddingHorizontal: 2 
  },
  switchThumb: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    position: 'absolute', 
    left: 2 
  },

  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  listItemTitle: { fontSize: 14, fontWeight: '700' },
  listItemSub: { fontSize: 11, marginTop: 2 },
});
