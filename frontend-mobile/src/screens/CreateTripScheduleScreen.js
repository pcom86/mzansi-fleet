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
  const [marshals, setMarshals] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [scheduledTrips, setScheduledTrips] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Schedule management state
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date());
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [scheduledTripToDelete, setScheduledTripToDelete] = useState(null);
  const [scheduledTripToEdit, setScheduledTripToEdit] = useState(null);
  const [filterRouteId, setFilterRouteId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [taxiRankModalVisible, setTaxiRankModalVisible] = useState(false);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [marshalModalVisible, setMarshalModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerDate, setTimePickerDate] = useState(new Date());
  const [editTripModalVisible, setEditTripModalVisible] = useState(false);
  const [editScheduleModalVisible, setEditScheduleModalVisible] = useState(false);
  
  // Edit trip form state
  const [editTripDate, setEditTripDate] = useState(new Date());
  const [editTripTime, setEditTripTime] = useState('08:00');
  const [editTripVehicleId, setEditTripVehicleId] = useState('');
  const [editTripDriverId, setEditTripDriverId] = useState('');
  const [editTripMarshalId, setEditTripMarshalId] = useState('');
  const [editTripNotes, setEditTripNotes] = useState('');
  const [editDatePickerVisible, setEditDatePickerVisible] = useState(false);

  // Edit schedule form state
  const [scheduleToEdit, setScheduleToEdit] = useState(null);
  const [editRouteName, setEditRouteName] = useState('');
  const [editDepartureStation, setEditDepartureStation] = useState('');
  const [editDestinationStation, setEditDestinationStation] = useState('');
  const [editDepartureTime, setEditDepartureTime] = useState('08:00');
  const [editFrequencyMinutes, setEditFrequencyMinutes] = useState(60);
  const [editDaysOfWeek, setEditDaysOfWeek] = useState('1,2,3,4,5');
  const [editStandardFare, setEditStandardFare] = useState(0);
  const [editExpectedDurationMinutes, setEditExpectedDurationMinutes] = useState(30);
  const [editMaxPassengers, setEditMaxPassengers] = useState(16);
  const [editScheduleNotes, setEditScheduleNotes] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editTimePickerVisible, setEditTimePickerVisible] = useState(false);
  const [editTimePickerDate, setEditTimePickerDate] = useState(new Date());

  // ===== DATA LOADING =====
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?.userId || user?.id;
      if (!userId) return;

      // Load admin profile to get taxi rank
      const adminResp = await client.get(`/TaxiRankAdmin/user/${userId}`).catch(() => ({ data: null }));
      const admin = adminResp.data;
      setAdmin(admin);

      const promises = [
        client.get('/TaxiRanks').catch(() => ({ data: [] })),
        client.get(`/TaxiRankAdmin/user/${userId}/schedules`).catch(() => ({ data: [] })),
        client.get('/Vehicles').catch(() => ({ data: [] })),
        client.get('/Drivers').catch(() => ({ data: [] })),
        client.get('/TaxiRankUsers/marshals').catch(() => ({ data: [] })),
      ];

      const [rankResp, routeResp, vehicleResp, driverResp, marshalResp] = await Promise.all(promises);
      setTaxiRanks(rankResp.data || []);
      setRoutes(routeResp.data || []);
      setVehicles(vehicleResp.data || []);
      setMarshals(marshalResp.data || []);

      const mappedDrivers = (driverResp.data || []).map(d => ({
        id: d.id,
        name: d.name || `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim() || 'Unknown',
        assignedVehicleId: d.assignedVehicleId || null,
      }));
      setDrivers(mappedDrivers);

      // Auto-select admin's taxi rank
      if (admin?.taxiRankId) {
        setSelectedTaxiRankId(admin.taxiRankId);
        // Routes are already loaded from schedules above
      }
    } catch (err) {
      console.warn('Load data error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load schedules when taxi rank changes
  useEffect(() => {
    if (selectedTaxiRankId) {
      loadSchedules();
    }
  }, [selectedTaxiRankId]);

  // Load vehicles when route changes
  useEffect(() => {
    if (selectedRouteId) {
      // Find the selected route to get its linked vehicles
      const selectedRoute = routes.find(r => r.id === selectedRouteId);
      if (selectedRoute && selectedRoute.routeVehicles) {
        // Extract vehicles from the route's RouteVehicles collection
        const routeVehicles = selectedRoute.routeVehicles
          .filter(rv => rv.isActive && rv.vehicle)
          .map(rv => rv.vehicle);
        setDisplayVehicles(routeVehicles);
        
        // Clear selected vehicle if it's not in the new route's vehicles
        if (selectedVehicleId && !routeVehicles.find(v => v.id === selectedVehicleId)) {
          setSelectedVehicleId(null);
          setSelectedDriverId(null);
        }
      } else {
        // If no vehicles linked to route, show empty list
        setDisplayVehicles([]);
        setSelectedVehicleId(null);
        setSelectedDriverId(null);
      }
    } else {
      // If no route selected, show all vehicles
      setDisplayVehicles(vehicles);
    }
  }, [selectedRouteId, routes, vehicles, selectedVehicleId]);

  async function loadSchedules() {
    try {
      setLoadingSchedules(true);
      const userId = user?.id || user?.userId;
      if (!userId) return;
      // Use the userId endpoint
      const resp = await client.get(`/TaxiRankAdmin/user/${userId}/schedules`);
      setSchedules(resp.data || []);
    } catch (err) {
      console.warn('Load schedules error:', err?.message);
    } finally {
      setLoadingSchedules(false);
    }
  }

  async function loadScheduledTrips() {
    try {
      const userId = user?.id || user?.userId;
      if (!userId) return;
      
      console.log('Loading scheduled trips for user:', userId);
      
      // Get admin profile first
      const adminResp = await client.get(`/TaxiRankAdmin/user/${userId}`).catch(() => ({ data: null }));
      const admin = adminResp.data;
      
      console.log('Admin profile:', admin);
      
      if (admin?.id) {
        // Load scheduled trips for this admin's taxi rank
        const startDate = filterDate;
        const endDate = new Date(filterDate);
        endDate.setDate(endDate.getDate() + 30); // Load 30 days worth of trips
        
        console.log('Fetching scheduled trips for admin:', admin.id, 'from', startDate, 'to', endDate);
        
        const resp = await client.get(`/ScheduledTrips/by-admin/${admin.id}`, {
          params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
        });
        
        console.log('Scheduled trips response:', resp.data);
        setScheduledTrips(resp.data || []);
      }
    } catch (err) {
      console.warn('Load scheduled trips error:', err?.message);
      setScheduledTrips([]);
    }
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
  }

  const groupedSchedules = useMemo(() => {
    const groups = {};
    schedules.forEach(schedule => {
      // Use today's date since we're showing "Today's Schedules"
      const today = new Date().toLocaleDateString();
      if (!groups[today]) groups[today] = [];
      groups[today].push(schedule);
    });
    return groups;
  }, [schedules]);

  // ===== SCHEDULE MANAGEMENT FUNCTIONS =====
  const getFilteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      // Filter by date if specified
      if (filterDate && !showAllSchedules) {
        const filterDateOnly = new Date(filterDate);
        filterDateOnly.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // If not showing all schedules, only show today's schedules
        if (filterDateOnly.getTime() !== today.getTime()) {
          return false;
        }
      }
      
      // Filter by route if specified
      if (filterRouteId && schedule.id !== filterRouteId) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by departure time
      const timeA = formatDepartureTime(a.departureTime);
      const timeB = formatDepartureTime(b.departureTime);
      return timeA.localeCompare(timeB);
    });
  }, [schedules, filterDate, filterRouteId, showAllSchedules]);

  // Load scheduled trips when filter date changes
  useEffect(() => {
    if (admin) {
      loadScheduledTrips();
    }
  }, [filterDate, admin]);

  const confirmDeleteSchedule = (schedule) => {
    console.log('Delete button clicked for schedule:', schedule);
    console.log('Showing delete confirmation modal');
    setScheduleToDelete(schedule);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete || !admin?.id) return;
    
    console.log('User confirmed delete, calling deleteSchedule with ID:', scheduleToDelete.id);
    try {
      setLoadingSchedules(true);
      console.log('Making API call to delete schedule...');
      await client.delete(`/TaxiRankAdmin/${admin.id}/delete-schedule/${scheduleToDelete.id}`);
      console.log('API call successful');
      setDeleteModalVisible(false);
      setScheduleToDelete(null);
      Alert.alert('Success', 'Route deleted successfully');
      loadSchedules(); // Refresh the schedules list
    } catch (err) {
      console.error('Delete schedule error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete route';
      Alert.alert('Error', errorMessage);
      setDeleteModalVisible(false);
      setScheduleToDelete(null);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const cancelDelete = () => {
    console.log('Delete cancelled');
    setDeleteModalVisible(false);
    setScheduleToDelete(null);
    setScheduledTripToDelete(null);
  };

  // Functions for scheduled trip management
  const confirmDeleteScheduledTrip = (scheduledTrip) => {
    console.log('Delete scheduled trip button clicked:', scheduledTrip);
    setScheduledTripToDelete(scheduledTrip);
    setDeleteModalVisible(true);
  };

  const confirmDeleteScheduledTripAction = async () => {
    if (!scheduledTripToDelete) return;
    
    console.log('User confirmed delete scheduled trip, ID:', scheduledTripToDelete.id);
    try {
      setLoadingSchedules(true);
      await client.delete(`/ScheduledTrips/${scheduledTripToDelete.id}`);
      console.log('Scheduled trip delete API call successful');
      setDeleteModalVisible(false);
      setScheduledTripToDelete(null);
      Alert.alert('Success', 'Scheduled trip deleted successfully');
      loadScheduledTrips(); // Refresh the scheduled trips list
    } catch (err) {
      console.error('Delete scheduled trip error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete scheduled trip';
      Alert.alert('Error', errorMessage);
      setDeleteModalVisible(false);
      setScheduledTripToDelete(null);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Functions for scheduled trip editing
  const confirmEditScheduledTrip = (scheduledTrip) => {
    console.log('Edit scheduled trip button clicked:', scheduledTrip);
    console.log('Available scheduled trips:', scheduledTrips);
    setScheduledTripToEdit(scheduledTrip);
    
    // Pre-fill form with existing data
    setEditTripDate(new Date(scheduledTrip.scheduledDate));
    setEditTripTime(scheduledTrip.scheduledTime ? formatDepartureTime(scheduledTrip.scheduledTime) : '08:00');
    setEditTripVehicleId(scheduledTrip.vehicleId || '');
    setEditTripDriverId(scheduledTrip.driverId || '');
    setEditTripMarshalId(scheduledTrip.marshalId || '');
    setEditTripNotes(scheduledTrip.notes || '');
    
    console.log('Setting edit modal visible to true');
    setEditTripModalVisible(true);
  };

  // Temporary test function to create a scheduled trip
  const createTestScheduledTrip = async () => {
    if (!schedules.length || !admin?.id) {
      Alert.alert('Error', 'Please create a trip schedule first');
      return;
    }

    try {
      const firstSchedule = schedules[0];
      const testData = {
        tripScheduleId: firstSchedule.id,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00:00',
        vehicleId: null,
        driverId: null,
        marshalId: null,
        notes: 'Test scheduled trip'
      };

      console.log('Creating test scheduled trip:', testData);
      const response = await client.post('/ScheduledTrips', testData);
      console.log('Test trip created:', response.data);
      Alert.alert('Success', 'Test scheduled trip created');
      loadScheduledTrips(); // Refresh the list
    } catch (err) {
      console.error('Create test trip error:', err);
      Alert.alert('Error', 'Failed to create test trip');
    }
  };

  const confirmEditScheduledTripAction = async () => {
    if (!scheduledTripToEdit) return;
    
    console.log('User confirmed edit scheduled trip, ID:', scheduledTripToEdit.id);
    try {
      setLoadingSchedules(true);
      
      // Parse time string to TimeSpan
      const timeParts = editTripTime.split(':');
      const hours = parseInt(timeParts[0]) || 0;
      const minutes = parseInt(timeParts[1]) || 0;
      
      const updateData = {
        scheduledDate: editTripDate.toISOString().split('T')[0],
        scheduledTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`,
        vehicleId: editTripVehicleId || null,
        driverId: editTripDriverId || null,
        marshalId: editTripMarshalId || null,
        notes: editTripNotes
      };
      
      await client.put(`/ScheduledTrips/${scheduledTripToEdit.id}`, updateData);
      console.log('Scheduled trip edit API call successful');
      setEditTripModalVisible(false);
      setScheduledTripToEdit(null);
      Alert.alert('Success', 'Scheduled trip updated successfully');
      loadScheduledTrips(); // Refresh the scheduled trips list
    } catch (err) {
      console.error('Edit scheduled trip error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update scheduled trip';
      Alert.alert('Error', errorMessage);
      setEditTripModalVisible(false);
      setScheduledTripToEdit(null);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const cancelEditTrip = () => {
    console.log('Edit trip cancelled');
    setEditTripModalVisible(false);
    setScheduledTripToEdit(null);
    // Reset form
    setEditTripDate(new Date());
    setEditTripTime('08:00');
    setEditTripVehicleId('');
    setEditTripDriverId('');
    setEditTripMarshalId('');
    setEditTripNotes('');
  };

  // Handle edit date change
  const handleEditDateChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      setEditTripDate(selectedDate);
    }
    setEditDatePickerVisible(false);
  };

  // Functions for schedule editing
  const confirmEditSchedule = (schedule) => {
    console.log('Edit schedule button clicked:', schedule);
    setScheduleToEdit(schedule);
    
    // Pre-fill form with existing data
    setEditRouteName(schedule.routeName || '');
    setEditDepartureStation(schedule.departureStation || '');
    setEditDestinationStation(schedule.destinationStation || '');
    const timeString = formatDepartureTime(schedule.departureTime);
    setEditDepartureTime(timeString);
    
    // Set time picker date
    const [hours, minutes] = timeString.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours || 8, minutes || 0, 0, 0);
    setEditTimePickerDate(timeDate);
    
    setEditFrequencyMinutes(schedule.frequencyMinutes || 60);
    setEditDaysOfWeek(schedule.daysOfWeek || '1,2,3,4,5');
    setEditStandardFare(schedule.standardFare || 0);
    setEditExpectedDurationMinutes(schedule.expectedDurationMinutes || 30);
    setEditMaxPassengers(schedule.maxPassengers || 16);
    setEditScheduleNotes(schedule.notes || '');
    setEditIsActive(schedule.isActive !== false);
    
    console.log('Setting edit schedule modal visible to true');
    setEditScheduleModalVisible(true);
  };

  const confirmEditScheduleAction = async () => {
    if (!scheduleToEdit || !admin?.id) return;
    
    console.log('User confirmed edit schedule, ID:', scheduleToEdit.id);
    try {
      setLoadingSchedules(true);
      
      // Parse time string to TimeSpan
      const timeParts = editDepartureTime.split(':');
      const hours = parseInt(timeParts[0]) || 0;
      const minutes = parseInt(timeParts[1]) || 0;
      
      const updateData = {
        routeName: editRouteName,
        departureStation: editDepartureStation,
        destinationStation: editDestinationStation,
        departureTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`,
        frequencyMinutes: editFrequencyMinutes,
        daysOfWeek: editDaysOfWeek,
        standardFare: editStandardFare,
        expectedDurationMinutes: editExpectedDurationMinutes,
        maxPassengers: editMaxPassengers,
        notes: editScheduleNotes,
        isActive: editIsActive
      };
      
      await client.put(`/TaxiRankAdmin/${admin.id}/update-schedule/${scheduleToEdit.id}`, updateData);
      console.log('Schedule edit API call successful');
      setEditScheduleModalVisible(false);
      setScheduleToEdit(null);
      Alert.alert('Success', 'Trip schedule updated successfully');
      loadSchedules(); // Refresh the schedules list
    } catch (err) {
      console.error('Edit schedule error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update trip schedule';
      Alert.alert('Error', errorMessage);
      setEditScheduleModalVisible(false);
      setScheduleToEdit(null);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const cancelEditSchedule = () => {
    console.log('Edit schedule cancelled');
    setEditScheduleModalVisible(false);
    setScheduleToEdit(null);
    // Reset form
    setEditRouteName('');
    setEditDepartureStation('');
    setEditDestinationStation('');
    setEditDepartureTime('08:00');
    setEditFrequencyMinutes(60);
    setEditDaysOfWeek('1,2,3,4,5');
    setEditStandardFare(0);
    setEditExpectedDurationMinutes(30);
    setEditMaxPassengers(16);
    setEditScheduleNotes('');
    setEditIsActive(true);
  };

  // Handle edit time picker change
  const handleEditTimeChange = (event, selectedTime) => {
    if (event.type === 'set' && selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setEditDepartureTime(`${hours}:${minutes}`);
    }
    setEditTimePickerVisible(false);
  };

  // ===== FORM HANDLERS =====
  function selectTaxiRank(rank) {
    setSelectedTaxiRankId(rank.id);
    setSelectedRouteId('');
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setSelectedMarshalId('');
    setTaxiRankModalVisible(false);
  }

  function selectRoute(route) {
    setSelectedRouteId(route.id);
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setRouteModalVisible(false);
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
      // Create schedule data
      const [hours, minutes] = departureTime.split(':');
      const scheduleData = {
        taxiRankId: selectedTaxiRankId,
        tenantId: admin.tenantId,
        routeName: selectedRoute.routeName,
        departureStation: selectedRoute.departureStation || '',
        destinationStation: selectedRoute.destinationStation || '',
        departureTime: `${hours}:${minutes}:00`, // HH:MM:SS format for TimeSpan
        frequencyMinutes: 60, // Default hourly
        daysOfWeek: '1,2,3,4,5', // Weekdays
        standardFare: selectedRoute.standardFare || 100,
        expectedDurationMinutes: 30,
        maxPassengers: 16,
        isActive: true,
        notes: notes.trim() || `Schedule for ${selectedRoute.routeName}`,
      };

      console.log('Creating schedule with data:', scheduleData);
      console.log('Admin ID:', admin.id);
      
      const response = await client.post(`/TaxiRankAdmin/${admin.id}/create-schedule`, scheduleData);
      console.log('Schedule created successfully:', response.data);
      
      Alert.alert('Success', 'Trip schedule created successfully!');
      resetForm();
      loadSchedules();
    } catch (err) {
      console.error('Create schedule error:', err);
      console.error('Error response:', err?.response?.data);
      console.error('Error status:', err?.response?.status);
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to create schedule');
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
    setDepartureTime('08:00');
    setEstimatedArrivalTime('');
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
          { type: 'header', title: 'Create New Schedule' },
          { type: 'taxiRank' },
          { type: 'route' },
          { type: 'vehicle' },
          { type: 'driver' },
          { type: 'marshal' },
          { type: 'datetime' },
          { type: 'notes' },
          { type: 'submit' },
          { type: 'scheduleManagementHeader' },
          ...getFilteredSchedules.map(schedule => ({ type: 'schedule', data: schedule }))
        ]}
        keyExtractor={(item, index) => {
          if (item.type === 'schedule') return `schedule-${item.data.id}`;
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
                    {selectedRouteId ? (routes.find(r => r.id === selectedRouteId)?.routeName || 'Selected') : 'Select route'}
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
                    {selectedMarshalId ? (marshals.find(m => m.id === selectedMarshalId)?.name || 'Selected') : 'Select marshal'}
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
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Schedule Management</Text>
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
                      style={[styles.viewToggle, { backgroundColor: showAllSchedules ? GOLD : c.background }]}
                      onPress={() => setShowAllSchedules(!showAllSchedules)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={showAllSchedules ? '#000' : c.text} />
                      <Text style={[styles.viewToggleText, { color: showAllSchedules ? '#000' : c.text }]}>
                        {showAllSchedules ? 'All' : 'Today'}
                      </Text>
                    </TouchableOpacity>
                    {/* Temporary test button */}
                    <TouchableOpacity
                      style={[styles.filterToggle, { backgroundColor: RED }]}
                      onPress={createTestScheduledTrip}
                    >
                      <Ionicons name="add-outline" size={16} color="#fff" />
                      <Text style={[styles.filterToggleText, { color: '#fff' }]}>
                        Test Trip
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
                      
                      <TouchableOpacity
                        style={[styles.filterBtn, { backgroundColor: c.background, borderColor: c.border }]}
                        onPress={() => setFilterRouteId('')}
                      >
                        <Ionicons name="git-branch-outline" size={16} color={GOLD} />
                        <Text style={[styles.filterBtnText, { color: c.text }]}>
                          {filterRouteId ? schedules.find(s => s.id === filterRouteId)?.routeName || 'Selected Route' : 'All Routes'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }

          if (item.type === 'schedule') {
            const schedule = item.data;
            // Get scheduled trips for this schedule
            const scheduleTrips = scheduledTrips.filter(trip => trip.tripScheduleId === schedule.id);
            
            console.log('Rendering schedule:', schedule.routeName, 'with trips:', scheduleTrips.length);
            
            return (
              <View key={schedule.id} style={[styles.newScheduleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                {/* Schedule Header */}
                <View style={styles.scheduleHeader}>
                  <View style={styles.scheduleHeaderLeft}>
                    <View style={styles.scheduleTimeContainer}>
                      <Ionicons name="time-outline" size={16} color={GOLD} />
                      <Text style={[styles.scheduleTime, { color: c.text }]}>
                        {formatDepartureTime(schedule.departureTime)}
                      </Text>
                    </View>
                    <Text style={[styles.scheduleRouteName, { color: c.text }]}>
                      {schedule.routeName}
                    </Text>
                  </View>
                  <View style={styles.scheduleHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: schedule.isActive ? GREEN_LIGHT : '#ccc' }]}>
                      <Text style={[styles.statusText, { color: schedule.isActive ? GREEN : '#666' }]}>
                        {schedule.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Route Details */}
                <View style={styles.routeDetails}>
                  <View style={styles.routePath}>
                    <Ionicons name="location-outline" size={14} color={c.textMuted} />
                    <Text style={[styles.routeText, { color: c.text }]}>
                      {schedule.departureStation} → {schedule.destinationStation}
                    </Text>
                  </View>
                </View>

                {/* Schedule Info */}
                <View style={styles.scheduleInfo}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Ionicons name="cash-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.infoText, { color: c.text }]}>R{schedule.standardFare || 0}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="calendar-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.infoText, { color: c.text }]}>{schedule.daysOfWeek || 'Weekdays'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="people-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.infoText, { color: c.text }]}>Max {schedule.maxPassengers || 16}</Text>
                    </View>
                  </View>
                  {schedule.frequencyMinutes && (
                    <View style={styles.infoItem}>
                      <Ionicons name="repeat-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.infoText, { color: c.text }]}>Every {schedule.frequencyMinutes} min</Text>
                    </View>
                  )}
                </View>

                {/* Vehicle/Driver Assignment Info */}
                <View style={styles.assignmentInfo}>
                  <View style={styles.assignmentRow}>
                    <View style={styles.assignmentItem}>
                      <Ionicons name="bus-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.assignmentText, { color: c.text }]}>
                        {schedule.routeVehicles && schedule.routeVehicles.length > 0 
                          ? `${schedule.routeVehicles.length} vehicle(s) assigned`
                          : 'No vehicles assigned'
                        }
                      </Text>
                    </View>
                  </View>
                  {schedule.notes && (
                    <View style={styles.notesRow}>
                      <Ionicons name="document-text-outline" size={14} color={c.textMuted} />
                      <Text style={[styles.notesText, { color: c.textMuted }]}>{schedule.notes}</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.scheduleActions}>
                  <TouchableOpacity
                    style={[styles.editScheduleBtn, { backgroundColor: GOLD }]}
                    onPress={() => confirmEditSchedule(schedule)}
                  >
                    <Ionicons name="create-outline" size={14} color="#000" />
                    <Text style={[styles.editBtnText, { color: '#000' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: RED }]}
                    onPress={() => confirmDeleteSchedule(schedule)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#fff" />
                    <Text style={[styles.deleteBtnText, { color: '#fff' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Scheduled Trips Section */}
                {scheduleTrips.length > 0 && (
                  <View style={styles.scheduledTripsSection}>
                    <View style={styles.scheduledTripsHeader}>
                      <Ionicons name="calendar-check-outline" size={16} color={c.textMuted} />
                      <Text style={[styles.scheduledTripsTitle, { color: c.textMuted }]}>
                        Scheduled Trips ({scheduleTrips.length})
                      </Text>
                    </View>
                    {scheduleTrips.map(trip => (
                      <View key={trip.id} style={[styles.scheduledTripItem, { backgroundColor: c.background, borderColor: c.border }]}>
                        <View style={styles.scheduledTripMain}>
                          <View style={styles.tripDateTime}>
                            <Text style={[styles.scheduledTripDate, { color: c.text }]}>
                              {new Date(trip.scheduledDate).toLocaleDateString()}
                            </Text>
                            <Text style={[styles.scheduledTripTime, { color: c.textMuted }]}>
                              {trip.scheduledTime ? formatDepartureTime(trip.scheduledTime) : 'Not set'}
                            </Text>
                          </View>
                          <View style={styles.tripDetails}>
                            {trip.vehicle && (
                              <Text style={[styles.tripVehicle, { color: c.textMuted }]}>
                                🚌 {trip.vehicle.registration}
                              </Text>
                            )}
                            {trip.driver && (
                              <Text style={[styles.tripDriver, { color: c.textMuted }]}>
                                👤 {trip.driver.name}
                              </Text>
                            )}
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: trip.status === 'Scheduled' ? GREEN_LIGHT : trip.status === 'Cancelled' ? '#ffcccc' : GOLD_LIGHT }]}>
                            <Text style={[styles.statusText, { color: trip.status === 'Scheduled' ? GREEN : trip.status === 'Cancelled' ? RED : GOLD }]}>
                              {trip.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.scheduledTripActions}>
                          <TouchableOpacity
                            style={[styles.editTripBtn, { backgroundColor: GOLD }]}
                            onPress={() => confirmEditScheduledTrip(trip)}
                          >
                            <Ionicons name="create-outline" size={12} color="#000" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.deleteTripBtn, { backgroundColor: RED }]}
                            onPress={() => confirmDeleteScheduledTrip(trip)}
                          >
                            <Ionicons name="trash-outline" size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          }

          return null;
        }}
        ListHeaderComponent={() => {
          if (loadingSchedules) {
            return (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={GOLD} />
                <Text style={[styles.label, { color: c.textMuted, marginTop: 8 }]}>Loading schedules...</Text>
              </View>
            );
          }
          
          if (getFilteredSchedules.length === 0) {
            return (
              <View style={styles.emptyWrap}>
                <Ionicons name="calendar-outline" size={48} color={c.textMuted} />
                <Text style={[styles.emptyTitle, { color: c.text }]}>No Trip Schedules Found</Text>
                <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
                  Create trip schedules in the Fleet Management screen first.
                </Text>
                <TouchableOpacity
                  style={[styles.createEmptyButton, { backgroundColor: GOLD }]}
                  onPress={() => navigation.navigate('VehicleRouteAssignment')}
                >
                  <Ionicons name="add" size={16} color="#000" />
                  <Text style={styles.createButtonText}>Go to Fleet Management</Text>
                </TouchableOpacity>
              </View>
            );
          }
          
          return null;
        }}
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

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent onRequestClose={cancelDelete}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background, margin: 20, borderRadius: 14 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Delete Route</Text>
              <TouchableOpacity onPress={cancelDelete}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.deleteMessage, { color: c.text, marginBottom: 24 }]}>
                Are you sure you want to delete the route "{scheduleToDelete?.routeName}"? 
                {'\n\n'}This will permanently remove this route and all its scheduled trips. This action cannot be undone.
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

      {/* ===== EDIT SCHEDULED TRIP MODAL ===== */}
      <Modal visible={editTripModalVisible} animationType="fade" transparent onRequestClose={cancelEditTrip}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.background, margin: 20, borderRadius: 14 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Edit Scheduled Trip</Text>
              <TouchableOpacity onPress={cancelEditTrip}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: c.textMuted }]}>Scheduled Date</Text>
              <TouchableOpacity 
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} 
                onPress={() => setEditDatePickerVisible(true)}
              >
                <Text style={{ color: c.text }}>{editTripDate.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.label, { color: c.textMuted }]}>Scheduled Time</Text>
              <TextInput
                value={editTripTime}
                onChangeText={setEditTripTime}
                style={[styles.input, { color: c.text }]}
                placeholder="HH:MM (24-hour format)"
                placeholderTextColor={c.textMuted}
              />

              <Text style={[styles.label, { color: c.textMuted }]}>Vehicle</Text>
              <TouchableOpacity
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setVehicleModalVisible(true)}
              >
                <Text style={{ color: c.text }}>
                  {editTripVehicleId ? vehicles.find(v => v.id === editTripVehicleId)?.registration || 'Selected Vehicle' : 'Select Vehicle (Optional)'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={c.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.label, { color: c.textMuted }]}>Driver</Text>
              <TouchableOpacity
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setDriverModalVisible(true)}
              >
                <Text style={{ color: c.text }}>
                  {editTripDriverId ? drivers.find(d => d.id === editTripDriverId)?.name || 'Selected Driver' : 'Select Driver (Optional)'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={c.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.label, { color: c.textMuted }]}>Marshal</Text>
              <TouchableOpacity
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setMarshalModalVisible(true)}
              >
                <Text style={{ color: c.text }}>
                  {editTripMarshalId ? marshals.find(m => m.id === editTripMarshalId)?.fullName || 'Selected Marshal' : 'Select Marshal (Optional)'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={c.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.label, { color: c.textMuted }]}>Notes</Text>
              <TextInput
                value={editTripNotes}
                onChangeText={setEditTripNotes}
                style={[styles.input, { minHeight: 56 }]}
                placeholder="Optional notes"
                placeholderTextColor={c.textMuted}
                multiline
              />

              <View style={styles.editTripActions}>
                <TouchableOpacity 
                  style={[styles.editTripCancelBtn, { backgroundColor: c.surface, borderColor: c.border }]} 
                  onPress={cancelEditTrip}
                >
                  <Text style={[styles.editTripCancelText, { color: c.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.editTripSaveBtn, { backgroundColor: GOLD }]} 
                  onPress={confirmEditScheduledTripAction}
                >
                  <Text style={[styles.editTripSaveText]}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== EDIT SCHEDULE MODAL ===== */}
      <Modal visible={editScheduleModalVisible} animationType="fade" transparent onRequestClose={cancelEditSchedule}>
        <View style={styles.modalOverlay}>
          <View style={[styles.editScheduleModalSheet, { backgroundColor: c.background, margin: 20, borderRadius: 14 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Edit Trip Schedule</Text>
              <TouchableOpacity onPress={cancelEditSchedule}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.editScheduleScroll} contentContainerStyle={styles.editScheduleScrollContent}>
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Route Name *</Text>
                  <TextInput
                    value={editRouteName}
                    onChangeText={setEditRouteName}
                    style={[styles.input, { color: c.text }]}
                    placeholder="e.g., JHB to PTA"
                    placeholderTextColor={c.textMuted}
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Departure Time *</Text>
                  <TouchableOpacity
                    style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                    onPress={() => setEditTimePickerVisible(true)}
                  >
                    <Text style={{ color: c.text }}>{editDepartureTime}</Text>
                    <Ionicons name="time-outline" size={18} color={c.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Departure Station *</Text>
                  <TextInput
                    value={editDepartureStation}
                    onChangeText={setEditDepartureStation}
                    style={[styles.input, { color: c.text }]}
                    placeholder="e.g., Park Station"
                    placeholderTextColor={c.textMuted}
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Destination Station *</Text>
                  <TextInput
                    value={editDestinationStation}
                    onChangeText={setEditDestinationStation}
                    style={[styles.input, { color: c.text }]}
                    placeholder="e.g., Pretoria Station"
                    placeholderTextColor={c.textMuted}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Frequency (min)</Text>
                  <TextInput
                    value={editFrequencyMinutes.toString()}
                    onChangeText={(text) => setEditFrequencyMinutes(parseInt(text) || 60)}
                    style={[styles.input, { color: c.text }]}
                    placeholder="60"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Standard Fare (R)</Text>
                  <TextInput
                    value={editStandardFare.toString()}
                    onChangeText={(text) => setEditStandardFare(parseFloat(text) || 0)}
                    style={[styles.input, { color: c.text }]}
                    placeholder="150"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Duration (min)</Text>
                  <TextInput
                    value={editExpectedDurationMinutes.toString()}
                    onChangeText={(text) => setEditExpectedDurationMinutes(parseInt(text) || 30)}
                    style={[styles.input, { color: c.text }]}
                    placeholder="30"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: c.textMuted }]}>Max Passengers</Text>
                  <TextInput
                    value={editMaxPassengers.toString()}
                    onChangeText={(text) => setEditMaxPassengers(parseInt(text) || 16)}
                    style={[styles.input, { color: c.text }]}
                    placeholder="16"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: c.textMuted }]}>Days of Week</Text>
              <TextInput
                value={editDaysOfWeek}
                onChangeText={setEditDaysOfWeek}
                style={[styles.input, { color: c.text }]}
                placeholder="1,2,3,4,5 (Mon-Fri)"
                placeholderTextColor={c.textMuted}
              />

              <Text style={[styles.label, { color: c.textMuted }]}>Notes</Text>
              <TextInput
                value={editScheduleNotes}
                onChangeText={setEditScheduleNotes}
                style={[styles.input, { color: c.text, minHeight: 60 }]}
                placeholder="Optional notes"
                placeholderTextColor={c.textMuted}
                multiline
              />

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: c.text, marginBottom: 0 }]}>Active Schedule</Text>
                <TouchableOpacity
                  style={[styles.switch, { backgroundColor: editIsActive ? GOLD : c.border }]}
                  onPress={() => setEditIsActive(!editIsActive)}
                >
                  <View style={[styles.switchThumb, { backgroundColor: editIsActive ? '#000' : c.textMuted }]} />
                </TouchableOpacity>
              </View>

              <View style={styles.editTripActions}>
                <TouchableOpacity 
                  style={[styles.editTripCancelBtn, { backgroundColor: c.surface, borderColor: c.border }]} 
                  onPress={cancelEditSchedule}
                >
                  <Text style={[styles.editTripCancelText, { color: c.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.editTripSaveBtn, { backgroundColor: GOLD }]} 
                  onPress={confirmEditScheduleAction}
                >
                  <Text style={[styles.editTripSaveText]}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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

      {/* ===== EDIT TRIP DATE PICKER ===== */}
      {editDatePickerVisible && (
        <DateTimePicker
          value={editTripDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleEditDateChange}
        />
      )}

      {/* ===== EDIT SCHEDULE TIME PICKER ===== */}
      {editTimePickerVisible && (
        <DateTimePicker
          value={editTimePickerDate}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleEditTimeChange}
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
  scheduleHeader: { 
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
