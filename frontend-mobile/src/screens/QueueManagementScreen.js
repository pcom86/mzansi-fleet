import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, TextInput, Platform,
  Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  getQueueByRank, getQueueStats, addToQueue,
  dispatchVehicle, reorderVehicle, removeFromQueue, updateQueueRoute, updateQueueEntry,
} from '../api/queueManagement';
import { fetchVehiclesByRankId, fetchTaxiRanks } from '../api/taxiRanks';
import { fetchRankBookings, fetchQueueEntryBookings, allocateSeats } from '../api/queueBooking';
import client from '../api/client';
import VoiceRecorderButton from '../components/VoiceRecorderButton';
import AIService from '../services/AIService';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

function normalizeQueueStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'dispatched') return 'dispatched';
  if (value === 'completed' || value === 'arrived') return 'completed';
  if (value === 'removed') return 'removed';
  return 'waiting';
}

export default function QueueManagementScreen({ navigation, route: navRoute }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const passedRank = navRoute?.params?.rank;
  const passedDispatchEntry = navRoute?.params?.dispatchEntry;
  const openDispatchModal = navRoute?.params?.openDispatchModal;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rank, setRank] = useState(passedRank || null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [activeView, setActiveView] = useState('queue');
  const [showFilters, setShowFilters] = useState(true);

  // Add modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addRouteId, setAddRouteId] = useState(null);
  const [addVehicleId, setAddVehicleId] = useState(null);
  const [addDriverId, setAddDriverId] = useState(null);
  const [addNotes, setAddNotes] = useState('');
  const [addEstimatedDeparture, setAddEstimatedDeparture] = useState('');
  const [showETDPicker, setShowETDPicker] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  // Route assign modal
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [routeModalEntry, setRouteModalEntry] = useState(null);
  const [routeModalBusy, setRouteModalBusy] = useState(false);

  // Edit queue entry modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [editDriverId, setEditDriverId] = useState(null);
  const [editVehicleId, setEditVehicleId] = useState(null);
  const [editRouteId, setEditRouteId] = useState(null);
  const [editEstimatedDeparture, setEditEstimatedDeparture] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('Waiting');

  // Voice command state
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const aiService = AIService;
  const [editBusy, setEditBusy] = useState(false);
  const [showEditETDPicker, setShowEditETDPicker] = useState(false);

  // Dispatch modal
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchEntry, setDispatchEntry] = useState(null);
  const [dispatchPax, setDispatchPax] = useState('');
  const [dispatchDefaultFare, setDispatchDefaultFare] = useState('');
  const [dispatchFare, setDispatchFare] = useState('');
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [includePassengerList, setIncludePassengerList] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [passengerList, setPassengerList] = useState([{
    name: '', contact: '', nextOfKinName: '', nextOfKinContact: '',
    destination: '', amount: '', paymentMethod: 'Cash', seatNumber: '', fromBooking: false,
  }]);
  const [destPickerOpen, setDestPickerOpen] = useState(false);
  const [destPickerIdx, setDestPickerIdx] = useState(-1);
  const [bookedSeats, setBookedSeats] = useState([]); // seats already allocated from bookings
  const [dispatchBookingsLoading, setDispatchBookingsLoading] = useState(false);

  // Bookings management state
  const [rankBookings, setRankBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingDetailVisible, setBookingDetailVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [seatAllocations, setSeatAllocations] = useState({});
  const [allocatingSeats, setAllocatingSeats] = useState(false);

  // Queue entry bookings modal (per-vehicle bookings view)
  const [queueEntryBookingsVisible, setQueueEntryBookingsVisible] = useState(false);
  const [queueEntryBookings, setQueueEntryBookings] = useState([]);
  const [queueEntryBookingsLoading, setQueueEntryBookingsLoading] = useState(false);
  const [queueEntryForBookings, setQueueEntryForBookings] = useState(null);
  const [queueEntryTotalBooked, setQueueEntryTotalBooked] = useState(0);

  // Dispatched filters & detail modal
  const [queueDate, setQueueDate] = useState(() => {
    const d = new Date(); return d.toISOString().split('T')[0];
  });
  const [dispatchFilterReg, setDispatchFilterReg] = useState('');
  const [dispatchFilterBy, setDispatchFilterBy] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tripDetailVisible, setTripDetailVisible] = useState(false);
  const [tripDetailEntry, setTripDetailEntry] = useState(null);
  const [tripDetailData, setTripDetailData] = useState(null);
  const [tripDetailLoading, setTripDetailLoading] = useState(false);

  const normalizeRouteDeparture = (route) => route?.departureStation ?? route?.DepartureStation ?? route?.origin ?? route?.Origin ?? route?.routeOrigin ?? route?.RouteOrigin ?? '';
  const normalizeRouteDestination = (route) => route?.destinationStation ?? route?.DestinationStation ?? route?.destination ?? route?.Destination ?? route?.routeDestination ?? route?.RouteDestination ?? '';
  const normalizeRouteStops = (route) => {
    const rawStops = route?.stops ?? route?.Stops ?? route?.routeStops ?? route?.RouteStops;
    if (!Array.isArray(rawStops)) return [];
    return rawStops;
  };

  const dispatchRoute = useMemo(() => routes.find(r => r.id === dispatchEntry?.routeId), [routes, dispatchEntry?.routeId]);

  const dispatchRouteStops = useMemo(() => {
    const sourceRoutes = dispatchRoute ? [dispatchRoute] : routes;
    const allStops = [];
    const seen = new Set();
    for (const route of sourceRoutes) {
      const rawStops = normalizeRouteStops(route);
      if (!Array.isArray(rawStops)) continue;
      for (const stop of rawStops) {
        const name = stop.stopName ?? stop.StopName ?? stop.name ?? stop.Name ?? '';
        if (!name || seen.has(name)) continue;
        seen.add(name);
        allStops.push({
          stopName: name,
          stopOrder: stop.stopOrder ?? stop.StopOrder ?? stop.order ?? stop.Order ?? 0,
          fareFromOrigin: stop.fareFromOrigin ?? stop.FareFromOrigin ?? stop.fare ?? stop.fareFromOrigin ?? 0,
          routeFare: route.standardFare ?? route.StandardFare ?? route?.fare ?? route?.standardFare ?? 0,
        });
      }
    }
    return allStops.sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));
  }, [dispatchRoute, routes]);

  const dispatchDestinations = useMemo(() => {
    const sourceRoutes = dispatchRoute ? [dispatchRoute] : routes;
    const items = dispatchRouteStops.map(s => ({
      name: s.stopName,
      fare: s.fareFromOrigin ?? s.routeFare ?? 0,
    }));
    const seen = new Set(items.map(i => i.name));
    for (const route of sourceRoutes) {
      const dest = normalizeRouteDestination(route);
      const fare = route.standardFare ?? route.StandardFare ?? route?.fare ?? 0;
      if (dest && !seen.has(dest)) {
        seen.add(dest);
        items.push({ name: dest, fare });
      }
    }
    return items;
  }, [dispatchRoute, routes, dispatchRouteStops]);

  const getFareForDestination = useCallback((destination) => {
    const stop = dispatchRouteStops.find(s => s.stopName === destination);
    if (stop?.fareFromOrigin != null) return stop.fareFromOrigin;
    if (stop?.routeFare != null) return stop.routeFare;
    if (dispatchRoute) return dispatchRoute.standardFare ?? dispatchRoute.StandardFare ?? 0;
    return 0;
  }, [dispatchRoute, dispatchRouteStops]);

  const passengerSummary = useMemo(() => {
    const valid = includePassengerList
      ? passengerList.filter(p => p.name.trim() || p.contact.trim() || p.fromBooking)
      : [];
    const totalFare = includePassengerList
      ? valid.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
      : (parseFloat(dispatchFare) || 0);
    const count = includePassengerList
      ? valid.length
      : (dispatchPax ? parseInt(dispatchPax, 10) || 0 : 0);
    return { count, totalFare };
  }, [includePassengerList, passengerList, dispatchPax, dispatchFare]);

  // Handle voice command result
  async function handleVoiceCommand(audioBlob) {
    setVoiceProcessing(true);
    try {
      const result = await aiService.processVoiceCommand(audioBlob);
      if (!result || !result.action) {
        Alert.alert('Voice Command', 'Sorry, I could not understand your command.');
        return;
      }

      switch (result.action) {
        case 'add_to_queue':
          // Example: "Add vehicle ABC 123 to queue"
          if (result.parameters?.vehicle) {
            const vehicle = vehicles.find(v => 
              v.registration?.toLowerCase().includes(result.parameters.vehicle.toLowerCase()) ||
              v.make?.toLowerCase().includes(result.parameters.vehicle.toLowerCase()) ||
              v.model?.toLowerCase().includes(result.parameters.vehicle.toLowerCase())
            );
            
            if (vehicle) {
              setAddVehicleId(vehicle.id);
              setAddModalVisible(true);
              Alert.alert('Voice Command', `Selected vehicle ${vehicle.registration}. Please complete the details.`);
            } else {
              Alert.alert('Vehicle Not Found', `Could not find vehicle "${result.parameters.vehicle}"`);
            }
          } else {
            Alert.alert('Voice Command', 'Please specify which vehicle to add to the queue.');
          }
          break;

        case 'dispatch_vehicle':
          // Example: "Dispatch vehicle ABC 123" or "Dispatch first vehicle"
          if (result.parameters?.vehicle) {
            const entry = queue.find(q => 
              q.vehicleRegistration?.toLowerCase().includes(result.parameters.vehicle.toLowerCase())
            );
            
            if (entry) {
              if (entry.status === 'Dispatched') {
                Alert.alert('Already Dispatched', `Vehicle ${entry.vehicleRegistration} has already been dispatched.`);
              } else {
                setDispatchEntry(entry);
                setDispatchModalVisible(true);
                Alert.alert('Voice Command', `Preparing to dispatch ${entry.vehicleRegistration}.`);
              }
            } else {
              Alert.alert('Vehicle Not Found', `Could not find vehicle "${result.parameters.vehicle}" in queue.`);
            }
          } else if (queue.length > 0) {
            const firstVehicle = queue[0];
            if (firstVehicle.status === 'Dispatched') {
              Alert.alert('Already Dispatched', 'The first vehicle in queue has already been dispatched.');
            } else {
              setDispatchEntry(queue[0]);
              setDispatchModalVisible(true);
              Alert.alert('Voice Command', `Preparing to dispatch first vehicle in queue.`);
            }
          }
          break;

        case 'remove_from_queue':
          // Example: "Remove vehicle ABC 123 from queue"
          if (result.parameters?.vehicle) {
            const entry = queue.find(q => 
              q.vehicleRegistration?.toLowerCase().includes(result.parameters.vehicle.toLowerCase())
            );
            
            if (entry) {
              Alert.alert(
                'Confirm Removal',
                `Remove ${entry.vehicleRegistration} from the queue?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Remove', 
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await removeFromQueue(entry.id);
                        Alert.alert('Success', 'Vehicle removed from queue');
                        loadData(true);
                      } catch (err) {
                        Alert.alert('Error', 'Failed to remove vehicle from queue');
                      }
                    }
                  }
                ]
              );
            } else {
              Alert.alert('Vehicle Not Found', `Could not find vehicle "${result.parameters.vehicle}" in queue.`);
            }
          }
          break;

        case 'assign_route':
          // Example: "Assign route to vehicle ABC 123"
          if (result.parameters?.vehicle) {
            const entry = queue.find(q => 
              q.vehicleRegistration?.toLowerCase().includes(result.parameters.vehicle.toLowerCase())
            );
            
            if (entry) {
              setRouteModalEntry(entry);
              setRouteModalVisible(true);
              Alert.alert('Voice Command', `Please select a route for ${entry.vehicleRegistration}.`);
            } else {
              Alert.alert('Vehicle Not Found', `Could not find vehicle "${result.parameters.vehicle}" in queue.`);
            }
          }
          break;

        default:
          Alert.alert('Voice Command', `Command "${result.action}" is not supported.`);
      }
    } catch (err) {
      Alert.alert('Voice Command Error', err.message || 'Failed to process voice command.');
    } finally {
      setVoiceProcessing(false);
    }
  }

  // Handle opening dispatch modal from navigation parameters
  useEffect(() => {
    if (openDispatchModal && passedDispatchEntry && queue.length > 0) {
      const entry = queue.find(q => q.id === passedDispatchEntry.id);
      if (entry) {
        if (entry.status === 'Dispatched') {
          Alert.alert('Already Dispatched', 'This vehicle has already been dispatched.');
        } else {
          setDispatchEntry(entry);
          setDispatchModalVisible(true);
        }
      }
    }
  }, [openDispatchModal, passedDispatchEntry, queue]);

  // Helper: get next available seat number excluding already-used seats
  const getNextAvailableSeat = useCallback((usedSeats, capacity) => {
    const cap = capacity || 50;
    for (let i = 1; i <= cap; i++) {
      const s = String(i).padStart(2, '0');
      if (!usedSeats.includes(s) && !usedSeats.includes(String(i))) return s;
    }
    return '';
  }, []);

  useEffect(() => {
    if (!dispatchModalVisible || !dispatchEntry) return;

    const defaultDestination = dispatchDestinations[0]?.name || '';
    const defaultFare = getFareForDestination(defaultDestination);
    setDispatchPax('');
    setDispatchDefaultFare('');
    setDispatchFare('');
    setBookedSeats([]);

    // Fetch bookings for this queue entry, fallback to rank-level bookings
    setDispatchBookingsLoading(true);
    fetchQueueEntryBookings(dispatchEntry.id)
      .then(async (data) => {
        let bookings = data?.bookings || [];

        // If no bookings on this specific queue entry, check rank-level confirmed bookings
        if (bookings.length === 0 && rank?.id) {
          try {
            const rankData = await fetchRankBookings(rank.id);
            const rankBookings = Array.isArray(rankData) ? rankData : (rankData?.bookings || []);
            // Include Confirmed/Pending/CheckedIn bookings not on a dispatched entry
            bookings = rankBookings.filter(b =>
              (b.status === 'Confirmed' || b.status === 'Pending' || b.status === 'CheckedIn')
            );
          } catch (_) { /* ignore fallback errors */ }
        }

        const prePopulated = [];
        const usedSeats = [];

        // Collect all booked passengers with their allocated seats
        for (const bk of bookings) {
          for (const p of (bk.passengers || [])) {
            const seatStr = p.seatNumber ? String(p.seatNumber).padStart(2, '0') : '';
            if (seatStr) usedSeats.push(seatStr);
            prePopulated.push({
              name: p.name || bk.riderName || '',
              contact: p.contactNumber || bk.riderPhone || '',
              nextOfKinName: '',
              nextOfKinContact: '',
              destination: p.destination || defaultDestination,
              amount: p.fare ? String(p.fare) : (defaultFare ? String(defaultFare) : ''),
              paymentMethod: bk.paymentMethod || 'Ozow',
              seatNumber: seatStr,
              fromBooking: true,
            });
          }
        }

        setBookedSeats([...usedSeats]);

        // Auto-allocate seats for booked passengers that don't have one yet
        const capacity = dispatchEntry.vehicleCapacity || 50;
        const allUsed = [...usedSeats];
        for (const pax of prePopulated) {
          if (!pax.seatNumber) {
            const next = getNextAvailableSeat(allUsed, capacity);
            pax.seatNumber = next;
            if (next) allUsed.push(next);
          }
        }

        if (prePopulated.length > 0) {
          setPassengerList(prePopulated);
          setIncludePassengerList(true);
        } else {
          setPassengerList([{
            name: '', contact: '', nextOfKinName: '', nextOfKinContact: '',
            destination: defaultDestination,
            amount: defaultFare ? String(defaultFare) : '',
            paymentMethod: 'Cash', seatNumber: '', fromBooking: false,
          }]);
          setIncludePassengerList(false);
        }
      })
      .catch(() => {
        // If fetching bookings fails, just start with empty list
        setPassengerList([{
          name: '', contact: '', nextOfKinName: '', nextOfKinContact: '',
          destination: defaultDestination,
          amount: defaultFare ? String(defaultFare) : '',
          paymentMethod: 'Cash', seatNumber: '', fromBooking: false,
        }]);
        setIncludePassengerList(false);
      })
      .finally(() => setDispatchBookingsLoading(false));
  }, [dispatchModalVisible, dispatchEntry, dispatchDestinations, getFareForDestination, getNextAvailableSeat, rank]);

  // ── Derived date helpers ────────────────────────────────────────────

  const isToday = queueDate === new Date().toISOString().split('T')[0];
  const queueDateLabel = (() => {
    const d = new Date(queueDate + 'T00:00:00');
    if (isToday) return 'Today';
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (queueDate === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  function shiftDate(days) {
    const d = new Date(queueDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const today = new Date().toISOString().split('T')[0];
    const next = d.toISOString().split('T')[0];
    if (next > today) return;
    setQueueDate(next);
  }

  // ── Data Loading ──────────────────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let activeRank = rank;
      if (!activeRank && user?.tenantId && user.tenantId !== EMPTY_GUID) {
        const ranksResp = await fetchTaxiRanks(user.tenantId);
        const ranks = ranksResp.data || ranksResp || [];
        activeRank = ranks[0] || null;
        setRank(activeRank);
      }
      if (!activeRank?.id) { setLoading(false); return; }

      const dateParam = isToday ? undefined : queueDate;
      const [queueData, statsData, routesResp, vehiclesResp, driversResp] = await Promise.all([
        getQueueByRank(activeRank.id, dateParam).catch(() => []),
        getQueueStats(activeRank.id).catch(() => null),
        client.get(`/Routes?taxiRankId=${activeRank.id}`).catch(() => ({ data: [] })),
        fetchVehiclesByRankId(activeRank.id).catch(() => ({ data: [] })),
        client.get(user?.tenantId ? `/Drivers?tenantId=${user.tenantId}` : '/Drivers').catch(() => ({ data: [] })),
      ]);

      setQueue(queueData || []);
      setStats(statsData);

      const allRoutes = routesResp?.data || routesResp || [];
      const rankName = (activeRank?.name || '').trim().toLowerCase();
      const rankAddress = (activeRank?.address || '').trim().toLowerCase();
      const matchRank = (departure, rankStr) => {
        if (!departure || !rankStr) return false;
        return departure.includes(rankStr) || rankStr.includes(departure);
      };

      const filteredRoutes = Array.isArray(allRoutes)
        ? allRoutes.filter(r => {
            if (r?.taxiRankId || r?.rankId) {
              return r.taxiRankId === activeRank.id || r.rankId === activeRank.id;
            }
            return true;
          }).filter(r => {
            const departure = String(r?.departureStation || '').trim().toLowerCase();
            if (!departure) return true;
            return matchRank(departure, rankName) || matchRank(departure, rankAddress);
          })
        : allRoutes;

      setRoutes(filteredRoutes);
      setVehicles(vehiclesResp.data || vehiclesResp || []);
      setDrivers(driversResp?.data || driversResp || []);
    } catch (err) {
      console.warn('Queue load error', err?.message);
      if (!silent) Alert.alert('Error', 'Failed to load queue data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rank, user, queueDate, isToday]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  // Load bookings when switching to bookings tab
  const loadBookings = useCallback(async () => {
    if (!rank?.id) return;
    setBookingsLoading(true);
    try {
      const dateParam = isToday ? undefined : queueDate;
      const data = await fetchRankBookings(rank.id, dateParam);
      setRankBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Load bookings error', err?.message);
    } finally {
      setBookingsLoading(false);
    }
  }, [rank, queueDate, isToday]);

  useEffect(() => {
    if (activeView === 'bookings') loadBookings();
  }, [activeView, loadBookings]);

  // ── Derived data ──────────────────────────────────────────────────────

  const filteredQueue = useMemo(() => {
    if (!selectedRouteId) return queue.filter(q => normalizeQueueStatus(q.status) !== 'removed');
    return queue.filter(q => (q.routeId === selectedRouteId || !q.routeId) && normalizeQueueStatus(q.status) !== 'removed');
  }, [queue, selectedRouteId]);

  const activeQueue = filteredQueue.filter(q => normalizeQueueStatus(q.status) === 'waiting');
  const dispatchedQueue = filteredQueue.filter(q => normalizeQueueStatus(q.status) === 'dispatched');
  const completedQueue = filteredQueue.filter(q => normalizeQueueStatus(q.status) === 'completed');

  const filteredDispatched = useMemo(() => {
    let list = dispatchedQueue;
    if (dispatchFilterReg.trim()) {
      const term = dispatchFilterReg.trim().toLowerCase();
      list = list.filter(q => (q.vehicleRegistration || '').toLowerCase().includes(term));
    }
    if (dispatchFilterBy.trim()) {
      const term = dispatchFilterBy.trim().toLowerCase();
      list = list.filter(q => (q.dispatchedByName || '').toLowerCase().includes(term));
    }
    return list.sort((a, b) => new Date(b.departedAt || 0) - new Date(a.departedAt || 0));
  }, [dispatchedQueue, dispatchFilterReg, dispatchFilterBy]);

  const filteredCompleted = useMemo(() => {
    let list = completedQueue;
    if (dispatchFilterReg.trim()) {
      const term = dispatchFilterReg.trim().toLowerCase();
      list = list.filter(q => (q.vehicleRegistration || '').toLowerCase().includes(term));
    }
    if (dispatchFilterBy.trim()) {
      const term = dispatchFilterBy.trim().toLowerCase();
      list = list.filter(q => (q.dispatchedByName || '').toLowerCase().includes(term));
    }
    return list.sort((a, b) => new Date(b.completedAt || b.updatedAt || b.departedAt || 0) - new Date(a.completedAt || a.updatedAt || a.departedAt || 0));
  }, [completedQueue, dispatchFilterReg, dispatchFilterBy]);

  const queuedVehicleIds = new Set(
    queue.filter(q => normalizeQueueStatus(q.status) === 'waiting').map(q => q.vehicleId)
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  async function handleAddToQueue() {
    if (!addVehicleId) return Alert.alert('Required', 'Please select a vehicle');
    if (!addRouteId) return Alert.alert('Required', 'Please select a route');
    setAddBusy(true);
    try {
      await addToQueue({
        taxiRankId: rank.id,
        routeId: addRouteId,
        vehicleId: addVehicleId,
        driverId: addDriverId,
        tenantId: user?.tenantId,
        estimatedDepartureTime: addEstimatedDeparture ? new Date(`${new Date().toISOString().split('T')[0]}T${addEstimatedDeparture}`).toISOString() : undefined,
        notes: addNotes || undefined,
      });
      setAddModalVisible(false);
      setAddVehicleId(null);
      setAddRouteId(null);
      setAddDriverId(null);
      setAddNotes('');
      setAddEstimatedDeparture('');
      setShowETDPicker(false);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to add vehicle');
    } finally {
      setAddBusy(false);
    }
  }

  async function handleDispatch() {
    console.log('[Dispatch] handleDispatch called', { dispatchEntry: dispatchEntry?.id, includePassengerList, dispatchPax });
    
    if (!dispatchEntry) {
      console.log('[Dispatch] No dispatchEntry - returning');
      return;
    }

    // Validate passenger count against vehicle capacity
    const capacity = dispatchEntry.vehicleCapacity;
    const paxCount = includePassengerList
      ? passengerList.filter(p => p.name.trim() || p.contact.trim()).length
      : (dispatchPax ? parseInt(dispatchPax, 10) : 0);

    console.log('[Dispatch] Capacity check', { capacity, paxCount });

    if (capacity && paxCount > capacity) {
      Alert.alert(
        'Over Capacity',
        `This vehicle can carry ${capacity} passengers but you entered ${paxCount}.\n\nDo you want to proceed anyway?`,
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Proceed', style: 'destructive', onPress: () => executeDispatch() },
        ],
      );
      return;
    }

    console.log('[Dispatch] Calling executeDispatch');
    executeDispatch();
  }

  async function executeDispatch() {
    console.log('[Dispatch] executeDispatch called', { dispatchEntry: dispatchEntry?.id });
    if (!dispatchEntry) {
      console.log('[Dispatch] No dispatchEntry in executeDispatch - returning');
      return;
    }
    setDispatchBusy(true);
    try {
      const validPassengers = includePassengerList
        ? passengerList.filter(p => p.name.trim() || p.contact.trim())
        : [];
      const finalPassengerCount = includePassengerList
        ? validPassengers.length
        : (dispatchPax ? parseInt(dispatchPax, 10) : undefined);

      const passengersPayload = validPassengers.map(p => ({
        name: p.name?.trim(),
        contact: p.contact?.trim(),
        nextOfKinName: p.nextOfKinName?.trim(),
        nextOfKinContact: p.nextOfKinContact?.trim(),
        destination: p.destination,
        amount: parseFloat(p.amount) || 0,
        paymentMethod: p.paymentMethod || 'Cash',
        seatNumber: p.seatNumber ? parseInt(p.seatNumber, 10) : null,
        fromBooking: p.fromBooking || false,
      }));

      const payload = {
        dispatchedByUserId: user?.userId || user?.id,
        passengerCount: finalPassengerCount,
        passengers: passengersPayload.length > 0 ? passengersPayload : undefined,
        fareAmount: !includePassengerList && dispatchFare ? parseFloat(dispatchFare) : undefined,
      };
      
      console.log('[Dispatch] Calling API with payload:', payload);
      const resp = await dispatchVehicle(dispatchEntry.id, payload);
      console.log('[Dispatch] API response:', resp);
      const reg = dispatchEntry.vehicleRegistration || 'Vehicle';
      setDispatchModalVisible(false);
      setDispatchEntry(null);
      setDispatchPax('');
      setDispatchDefaultFare('');
      setDispatchFare('');
      setIncludePassengerList(false);
      setPassengerList([{ name: '', contact: '', nextOfKinName: '', nextOfKinContact: '', destination: '', amount: '', paymentMethod: 'Cash' }]);
      
      // Force refresh the data
      console.log('[Dispatch] Refreshing data after dispatch');
      await loadData(true);
      
      // Force component re-render
      setRefreshKey(prev => prev + 1);
      
      // Additional refresh to ensure UI updates
      setTimeout(() => {
        console.log('[Dispatch] Secondary refresh after dispatch');
        loadData(true);
        setRefreshKey(prev => prev + 1);
      }, 1000);

      // Show earnings confirmation
      const data = resp?.data || resp;
      if (data?.alreadyDispatched) {
        Alert.alert(
          'Already Dispatched',
          `${reg} was already dispatched at ${new Date(data.departedAt).toLocaleTimeString()}.\n\nPassengers: ${data.passengerCount || 0}`,
        );
        // Refresh data to ensure UI shows correct status
        setTimeout(() => {
          console.log('[Dispatch] Refreshing after already-dispatched alert');
          loadData(true);
          setRefreshKey(prev => prev + 1);
        }, 500);
      } else if (data?.earningsRecorded && data?.totalFare > 0) {
        Alert.alert(
          'Dispatched',
          `${reg} dispatched successfully.\n\nEarnings recorded: R${Number(data.totalFare).toFixed(2)}\nPassengers: ${data.passengerCount || 0}`,
        );
      }
    } catch (err) {
      console.error('[Dispatch] Error occurred:', err);
      console.error('[Dispatch] Error response:', err?.response);
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to dispatch');
    } finally {
      setDispatchBusy(false);
    }
  }

  function handleRemove(entry) {
    const doRemove = async () => {
      try {
        await removeFromQueue(entry.id);
        loadData(true);
      } catch (err) {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to remove');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${entry.vehicleRegistration || 'this vehicle'} from queue?`)) doRemove();
    } else {
      Alert.alert('Remove', `Remove ${entry.vehicleRegistration || 'this vehicle'} from queue?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  }

  async function handleAssignRoute(entry, routeId) {
    setRouteModalBusy(true);
    try {
      await updateQueueRoute(entry.id, routeId || null);
      setRouteModalVisible(false);
      setRouteModalEntry(null);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to assign route');
    } finally {
      setRouteModalBusy(false);
    }
  }

  function openEditModal(entry) {
    setEditEntry(entry);
    setEditDriverId(entry.driverId || null);
    setEditVehicleId(entry.vehicleId || null);
    setEditRouteId(entry.routeId || null);
    setEditEstimatedDeparture(
      entry.estimatedDepartureTime
        ? new Date(entry.estimatedDepartureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : ''
    );
    setEditNotes(entry.notes || '');
    setEditStatus(entry.status || 'Waiting');
    setEditModalVisible(true);
  }

  async function handleUpdateQueueEntry() {
    if (!editEntry) return;
    setEditBusy(true);
    try {
      const payload = {};
      if (editDriverId !== (editEntry.driverId || null)) payload.driverId = editDriverId || '00000000-0000-0000-0000-000000000000';
      if (editVehicleId && editVehicleId !== editEntry.vehicleId) payload.vehicleId = editVehicleId;
      if (editRouteId !== (editEntry.routeId || null)) payload.routeId = editRouteId || '00000000-0000-0000-0000-000000000000';
      if (editEstimatedDeparture) {
        payload.estimatedDepartureTime = new Date(`${queueDate}T${editEstimatedDeparture}`).toISOString();
      }
      if (editStatus !== editEntry.status) payload.status = editStatus;
      if (editNotes !== (editEntry.notes || '')) payload.notes = editNotes;

      await updateQueueEntry(editEntry.id, payload);
      setEditModalVisible(false);
      setEditEntry(null);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to update queue entry');
    } finally {
      setEditBusy(false);
    }
  }

  async function handleMoveUp(entry) {
    if (entry.queuePosition <= 1) return;
    try {
      await reorderVehicle(entry.id, entry.queuePosition - 1);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reorder');
    }
  }

  async function handleMoveDown(entry) {
    try {
      await reorderVehicle(entry.id, entry.queuePosition + 1);
      loadData(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reorder');
    }
  }

  async function handleViewTripDetail(entry) {
    setTripDetailEntry(entry);
    setTripDetailVisible(true);
    setTripDetailData(null);
    if (!entry.tripId) {
      setTripDetailData({ noTrip: true });
      return;
    }
    setTripDetailLoading(true);
    try {
      const [tripResp, paxResp] = await Promise.all([
        client.get(`/TaxiRankTrips/${entry.tripId}`),
        client.get(`/TaxiRankTrips/${entry.tripId}/passengers`),
      ]);
      setTripDetailData({
        trip: tripResp.data,
        passengers: paxResp.data || [],
      });
    } catch {
      setTripDetailData({ error: true });
    } finally {
      setTripDetailLoading(false);
    }
  }

  // ── Queue Entry Bookings Handler ────────────────────────────────────

  async function handleViewQueueEntryBookings(entry) {
    setQueueEntryForBookings(entry);
    setQueueEntryBookingsVisible(true);
    setQueueEntryBookingsLoading(true);
    setQueueEntryBookings([]);
    try {
      const data = await fetchQueueEntryBookings(entry.id);
      setQueueEntryBookings(data.bookings || []);
      setQueueEntryTotalBooked(data.totalBookedSeats || 0);
    } catch (err) {
      console.warn('Load queue entry bookings error', err?.message);
      Alert.alert('Error', 'Failed to load bookings for this vehicle');
    } finally {
      setQueueEntryBookingsLoading(false);
    }
  }

  async function handleAllocateSeatsFromEntry(booking) {
    const allocations = (booking.passengers || [])
      .filter(p => seatAllocations[p.id])
      .map(p => ({ passengerId: p.id, seatNumber: parseInt(seatAllocations[p.id], 10) }));

    if (allocations.length === 0) {
      return Alert.alert('Required', 'Please assign at least one seat number');
    }
    if (allocations.some(a => isNaN(a.seatNumber) || a.seatNumber < 1)) {
      return Alert.alert('Invalid', 'Seat numbers must be positive numbers');
    }

    setAllocatingSeats(true);
    try {
      await allocateSeats(booking.id, allocations);
      Alert.alert('Success', 'Seats allocated successfully');
      setSeatAllocations({});
      // Refresh the queue entry bookings
      if (queueEntryForBookings) {
        const data = await fetchQueueEntryBookings(queueEntryForBookings.id);
        setQueueEntryBookings(data.bookings || []);
        setQueueEntryTotalBooked(data.totalBookedSeats || 0);
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to allocate seats');
    } finally {
      setAllocatingSeats(false);
    }
  }

  // ── Sub-Views ─────────────────────────────────────────────────────────

  async function handleAllocateSeats(booking) {
    const allocations = (booking.passengers || [])
      .filter(p => seatAllocations[p.id])
      .map(p => ({ passengerId: p.id, seatNumber: parseInt(seatAllocations[p.id], 10) }));

    if (allocations.length === 0) {
      return Alert.alert('Required', 'Please assign at least one seat number');
    }
    if (allocations.some(a => isNaN(a.seatNumber) || a.seatNumber < 1)) {
      return Alert.alert('Invalid', 'Seat numbers must be positive numbers');
    }

    setAllocatingSeats(true);
    try {
      await allocateSeats(booking.id, allocations);
      Alert.alert('Success', 'Seats allocated successfully');
      setBookingDetailVisible(false);
      setSelectedBooking(null);
      setSeatAllocations({});
      loadBookings();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to allocate seats');
    } finally {
      setAllocatingSeats(false);
    }
  }

  function openBookingDetail(booking) {
    setSelectedBooking(booking);
    const initial = {};
    (booking.passengers || []).forEach(p => {
      if (p.seatNumber) initial[p.id] = String(p.seatNumber);
    });
    setSeatAllocations(initial);
    setBookingDetailVisible(true);
  }

  function BookingsView() {
    const BOOKING_STATUS_COLORS = {
      Confirmed: { bg: 'rgba(25,135,84,0.12)', text: '#198754' },
      Pending: { bg: 'rgba(255,193,7,0.12)', text: '#cc9a00' },
      Cancelled: { bg: 'rgba(220,53,69,0.12)', text: '#dc3545' },
      Completed: { bg: 'rgba(13,110,253,0.12)', text: '#0d6efd' },
    };

    if (bookingsLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={{ color: c.textMuted, marginTop: 12 }}>Loading bookings...</Text>
        </View>
      );
    }

    if (rankBookings.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Ionicons name="receipt-outline" size={48} color={c.textMuted} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginTop: 12 }}>No Bookings</Text>
          <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>No rider bookings for today</Text>
        </View>
      );
    }

    // Group bookings by queue entry (vehicle)
    const grouped = {};
    rankBookings.forEach(b => {
      const key = b.queueEntryId || 'unassigned';
      if (!grouped[key]) grouped[key] = { vehicleReg: b.vehicleRegistration, route: b.routeName, bookings: [] };
      grouped[key].bookings.push(b);
    });

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={bookingsLoading} onRefresh={loadBookings} tintColor={c.primary} />}
      >
        {/* Summary */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1, minWidth: 100, backgroundColor: c.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: c.primary }}>{rankBookings.length}</Text>
            <Text style={{ fontSize: 11, color: c.textMuted }}>Total Bookings</Text>
          </View>
          <View style={{ flex: 1, minWidth: 100, backgroundColor: c.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#198754' }}>{rankBookings.filter(b => b.status === 'Confirmed').length}</Text>
            <Text style={{ fontSize: 11, color: c.textMuted }}>Confirmed</Text>
          </View>
          <View style={{ flex: 1, minWidth: 100, backgroundColor: c.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#cc9a00' }}>{rankBookings.filter(b => b.status === 'Pending').length}</Text>
            <Text style={{ fontSize: 11, color: c.textMuted }}>Pending</Text>
          </View>
          <View style={{ flex: 1, minWidth: 100, backgroundColor: c.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#198754' }}>
              R{rankBookings.reduce((sum, b) => sum + (b.totalFare || 0), 0).toFixed(0)}
            </Text>
            <Text style={{ fontSize: 11, color: c.textMuted }}>Total Revenue</Text>
          </View>
        </View>

        {/* Bookings grouped by vehicle */}
        {Object.entries(grouped).map(([queueEntryId, group]) => (
          <View key={queueEntryId} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary, marginRight: 8 }} />
              <Ionicons name="car-outline" size={16} color={c.primary} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{group.vehicleReg || 'No Vehicle'}</Text>
              {group.route ? (
                <Text style={{ fontSize: 12, color: c.textMuted, marginLeft: 8 }}>{group.route}</Text>
              ) : null}
              <View style={{ marginLeft: 'auto', backgroundColor: c.primary + '15', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>
                  {group.bookings.reduce((s, b) => s + b.seatsBooked, 0)} seats
                </Text>
              </View>
            </View>

            {group.bookings.map(booking => {
              const bsc = BOOKING_STATUS_COLORS[booking.status] || BOOKING_STATUS_COLORS.Pending;
              const hasUnallocated = (booking.passengers || []).some(p => !p.seatNumber);
              return (
                <TouchableOpacity
                  key={booking.id}
                  style={{
                    backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8,
                    borderWidth: 1, borderColor: hasUnallocated ? '#f59e0b' : c.border,
                  }}
                  activeOpacity={0.7}
                  onPress={() => openBookingDetail(booking)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ backgroundColor: bsc.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: bsc.text }}>{booking.status}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: c.primary }}>
                        {booking.paymentStatus === 'Paid' ? '✓ Paid' : booking.paymentStatus}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>
                      {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>
                        {booking.riderName || 'Unknown Rider'}
                      </Text>
                      {booking.riderPhone ? (
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{booking.riderPhone}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#198754' }}>R{(booking.totalFare || 0).toFixed(2)}</Text>
                      <Text style={{ fontSize: 11, color: c.textMuted }}>{booking.seatsBooked} seat(s) · {booking.paymentMethod}</Text>
                    </View>
                  </View>

                  {/* Passengers */}
                  {booking.passengers?.length > 0 && (
                    <View style={{ marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 8 }}>
                      {booking.passengers.map((p, pi) => (
                        <View key={p.id || pi} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 }}>
                          <Text style={{ fontSize: 12, color: c.text }}>
                            {pi + 1}. {p.name} {p.destination ? `→ ${p.destination}` : ''}
                          </Text>
                          {p.seatNumber ? (
                            <View style={{ backgroundColor: '#22c55e15', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#22c55e' }}>Seat {p.seatNumber}</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: '#f59e0b15', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b' }}>No seat</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {hasUnallocated && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#f59e0b15', borderRadius: 8, padding: 8 }}>
                      <Ionicons name="alert-circle" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#f59e0b' }}>Tap to allocate seats</Text>
                    </View>
                  )}

                  {booking.paymentReference ? (
                    <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 6 }}>Ref: {booking.paymentReference}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  }

  function QueueView() {
    const renderHistorySection = (title, items, allItems, accentColor, emptyMessage, statusKey) => (
      <>
        <View style={styles.listHeader}>
          <View style={[styles.listHeaderDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.listHeaderTxt, { color: c.text }]}>
            {title} ({items.length})
          </Text>
          {items.length !== allItems.length ? (
            <Text style={[styles.dfCountSub, { marginLeft: 6 }]}>of {allItems.length}</Text>
          ) : null}
        </View>

        {allItems.length === 0 ? (
          <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', paddingVertical: 12 }}>
            {emptyMessage}
          </Text>
        ) : items.length === 0 ? (
          <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', paddingVertical: 12 }}>
            No {statusKey} vehicles match filters
          </Text>
        ) : (
          items.map(entry => (
            <DispatchedCard
              key={entry.id}
              entry={entry}
              c={c}
              styles={styles}
              onPress={() => handleViewTripDetail(entry)}
              variant={statusKey}
            />
          ))
        )}
      </>
    );

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {activeQueue.length === 0 && isToday ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: c.primary + '15' }]}>
              <Ionicons name="car-outline" size={40} color={c.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>Queue is Empty</Text>
            <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
              No vehicles waiting. Tap below to add one.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: c.primary }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyBtnTxt}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : activeQueue.length > 0 ? (
          <>
            <View style={styles.listHeader}>
              <View style={[styles.listHeaderDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={[styles.listHeaderTxt, { color: c.text }]}>
                Waiting ({activeQueue.length})
              </Text>
            </View>
            {activeQueue.map((entry, idx) => (
              <QueueCard
                key={entry.id}
                entry={entry}
                isFirst={idx === 0}
                isLast={idx === activeQueue.length - 1}
                c={c}
                styles={styles}
                onDispatch={() => { 
                  if (entry.status === 'Dispatched') {
                    Alert.alert('Already Dispatched', 'This vehicle has already been dispatched.');
                    return;
                  }
                  setDispatchEntry(entry); setDispatchModalVisible(true); 
                }}
                onRemove={() => handleRemove(entry)}
                onMoveUp={() => handleMoveUp(entry)}
                onMoveDown={() => handleMoveDown(entry)}
                onAssignRoute={() => { setRouteModalEntry(entry); setRouteModalVisible(true); }}
                onViewBookings={() => handleViewQueueEntryBookings(entry)}
                onEdit={() => openEditModal(entry)}
              />
            ))}
          </>
        ) : null}

        {/* ── Trip history filter card ── */}
        <View style={[styles.dfCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {/* Header strip */}
          <View style={styles.dfHeader}>
            <View style={styles.dfHeaderLeft}>
              <View style={styles.dfHeaderIcon}>
                <Ionicons name="checkmark-done" size={14} color="#fff" />
              </View>
              <Text style={styles.dfHeaderTitle}>Trip History</Text>
              <View style={styles.dfCountBadge}>
                <Text style={styles.dfCountTxt}>{filteredDispatched.length + filteredCompleted.length}</Text>
              </View>
              {(filteredDispatched.length + filteredCompleted.length) !== (dispatchedQueue.length + completedQueue.length) ? (
                <Text style={styles.dfCountSub}>of {dispatchedQueue.length + completedQueue.length}</Text>
              ) : null}
            </View>
            {(dispatchFilterReg || dispatchFilterBy) ? (
              <TouchableOpacity
                onPress={() => { setDispatchFilterReg(''); setDispatchFilterBy(''); }}
                style={styles.dfResetBtn}
              >
                <Ionicons name="refresh" size={12} color="#fff" />
                <Text style={styles.dfResetTxt}>Reset</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Date navigation row */}
          <View style={[styles.dfDateRow, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => shiftDate(-1)} style={[styles.dfDateArrow, { backgroundColor: c.background }]}>
              <Ionicons name="chevron-back" size={15} color={c.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'web') {
                  const input = window.prompt('Enter date (YYYY-MM-DD):', queueDate);
                  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
                    const today = new Date().toISOString().split('T')[0];
                    if (input <= today) setQueueDate(input);
                  }
                } else {
                  setShowDatePicker(true);
                }
              }}
              style={[styles.dfDatePill, { backgroundColor: isToday ? '#22c55e15' : c.primary + '10' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar" size={13} color={isToday ? '#22c55e' : c.primary} />
              <Text style={[styles.dfDateTxt, { color: isToday ? '#22c55e' : c.primary }]}>{queueDateLabel}</Text>
              {!isToday ? (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setQueueDate(new Date().toISOString().split('T')[0]); }}
                  style={[styles.dfTodayBtn, { backgroundColor: c.primary }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.dfTodayBtnTxt}>Today</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => shiftDate(1)}
              style={[styles.dfDateArrow, { backgroundColor: c.background }]}
              disabled={isToday}
            >
              <Ionicons name="chevron-forward" size={15} color={isToday ? c.border : c.primary} />
            </TouchableOpacity>
          </View>

          {/* Native date picker (mobile only) */}
          {showDatePicker ? (
            <DateTimePicker
              value={new Date(queueDate + 'T00:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setQueueDate(selectedDate.toISOString().split('T')[0]);
                }
              }}
            />
          ) : null}

          {/* Search inputs */}
          <View style={styles.dfSearchArea}>
            <View style={[styles.dfSearchField, { backgroundColor: c.background, borderColor: c.border }]}>
              <Ionicons name="car-sport-outline" size={14} color={dispatchFilterReg ? c.primary : c.textMuted} />
              <TextInput
                style={[styles.dfSearchInput, { color: c.text }]}
                placeholder="Search registration..."
                placeholderTextColor={c.textMuted}
                value={dispatchFilterReg}
                onChangeText={setDispatchFilterReg}
                autoCapitalize="characters"
              />
              {dispatchFilterReg ? (
                <TouchableOpacity onPress={() => setDispatchFilterReg('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={c.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={[styles.dfSearchField, { backgroundColor: c.background, borderColor: c.border }]}>
              <Ionicons name="shield-outline" size={14} color={dispatchFilterBy ? '#8b5cf6' : c.textMuted} />
              <TextInput
                style={[styles.dfSearchInput, { color: c.text }]}
                placeholder="Search marshal / admin..."
                placeholderTextColor={c.textMuted}
                value={dispatchFilterBy}
                onChangeText={setDispatchFilterBy}
              />
              {dispatchFilterBy ? (
                <TouchableOpacity onPress={() => setDispatchFilterBy('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={c.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {renderHistorySection('Dispatched Queue', filteredDispatched, dispatchedQueue, '#22c55e', 'No dispatched vehicles for this date', 'dispatched')}
        {renderHistorySection('Completed Queue', filteredCompleted, completedQueue, '#16a34a', 'No completed vehicles for this date', 'completed')}
      </ScrollView>
    );
  }

  function OverviewView() {
    const nextVehicle = activeQueue[0];
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {/* Next to Dispatch */}
        {nextVehicle && (
          <View style={[styles.nextCard, { backgroundColor: c.surface }]}>
            <View style={styles.nextCardTop}>
              <View style={[styles.nextIcon, { backgroundColor: '#22c55e20' }]}>
                <Ionicons name="flash" size={20} color="#22c55e" />
              </View>
              <Text style={[styles.nextLabel, { color: c.textMuted }]}>Next to Dispatch</Text>
            </View>
            <View style={styles.nextCardBody}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nextReg, { color: c.text }]}>{nextVehicle.vehicleRegistration}</Text>
                <Text style={[styles.nextMeta, { color: c.textMuted }]}>
                  {nextVehicle.driverName || 'No driver'} {nextVehicle.routeName ? `· ${nextVehicle.routeName}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dispatchBtn}
                onPress={() => { 
                  if (nextVehicle.status === 'Dispatched') {
                    Alert.alert('Already Dispatched', 'This vehicle has already been dispatched.');
                    return;
                  }
                  setDispatchEntry(nextVehicle); setDispatchModalVisible(true); 
                }}
              >
                <Ionicons name="send" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.dispatchBtnTxt}>Dispatch</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.surface }]} onPress={() => setAddModalVisible(true)}>
            <View style={[styles.quickBtnIcon, { backgroundColor: c.primary + '15' }]}>
              <Ionicons name="add-circle" size={22} color={c.primary} />
            </View>
            <Text style={[styles.quickBtnLabel, { color: c.text }]}>Add Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.surface }]} onPress={() => setActiveView('queue')}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="list" size={22} color="#3b82f6" />
            </View>
            <Text style={[styles.quickBtnLabel, { color: c.text }]}>View Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.surface }]} onPress={() => setActiveView('analytics')}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#8b5cf615' }]}>
              <Ionicons name="stats-chart" size={22} color="#8b5cf6" />
            </View>
            <Text style={[styles.quickBtnLabel, { color: c.text }]}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Routes Summary */}
        {routes.filter(r => r.isActive !== false).length > 0 && (
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Routes</Text>
            {routes.filter(r => r.isActive !== false).slice(0, 5).map(route => {
              const count = queue.filter(q => q.routeId === route.id && normalizeQueueStatus(q.status) === 'waiting').length;
              return (
                <TouchableOpacity
                  key={route.id}
                  style={[styles.routeRow, { borderBottomColor: c.border }]}
                  onPress={() => { setSelectedRouteId(route.id); setActiveView('queue'); }}
                >
                  <View style={[styles.routeDot, { backgroundColor: count > 0 ? '#f59e0b' : '#22c55e' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.routeRowName, { color: c.text }]} numberOfLines={1}>
                      {route.routeName || route.destinationStation}
                    </Text>
                  </View>
                  <View style={[styles.routeCount, { backgroundColor: count > 0 ? '#f59e0b15' : '#22c55e15' }]}>
                    <Text style={[styles.routeCountTxt, { color: count > 0 ? '#f59e0b' : '#22c55e' }]}>{count}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  }

  function AnalyticsView() {
    const totalWaiting = activeQueue.length;
    const totalDispatched = dispatchedQueue.length;
    const totalPax = stats?.totalPassengers ?? 0;
    const avgWait = stats?.averageWaitMinutes ?? 0;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Today's Summary</Text>
          <View style={styles.analyticsGrid}>
            <View style={[styles.analyticsTile, { backgroundColor: '#f59e0b10' }]}>
              <Ionicons name="time-outline" size={22} color="#f59e0b" />
              <Text style={[styles.analyticsTileValue, { color: '#f59e0b' }]}>{totalWaiting}</Text>
              <Text style={[styles.analyticsTileLabel, { color: c.textMuted }]}>Waiting</Text>
            </View>
            <View style={[styles.analyticsTile, { backgroundColor: '#22c55e10' }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#22c55e" />
              <Text style={[styles.analyticsTileValue, { color: '#22c55e' }]}>{totalDispatched}</Text>
              <Text style={[styles.analyticsTileLabel, { color: c.textMuted }]}>Dispatched</Text>
            </View>
            <View style={[styles.analyticsTile, { backgroundColor: '#3b82f610' }]}>
              <Ionicons name="people-outline" size={22} color="#3b82f6" />
              <Text style={[styles.analyticsTileValue, { color: '#3b82f6' }]}>{totalPax}</Text>
              <Text style={[styles.analyticsTileLabel, { color: c.textMuted }]}>Passengers</Text>
            </View>
            <View style={[styles.analyticsTile, { backgroundColor: '#8b5cf610' }]}>
              <Ionicons name="hourglass-outline" size={22} color="#8b5cf6" />
              <Text style={[styles.analyticsTileValue, { color: '#8b5cf6' }]}>{avgWait}m</Text>
              <Text style={[styles.analyticsTileLabel, { color: c.textMuted }]}>Avg Wait</Text>
            </View>
          </View>
        </View>

        {/* Route breakdown */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Route Breakdown</Text>
          {routes.filter(r => r.isActive !== false).length === 0 ? (
            <Text style={[styles.cardEmpty, { color: c.textMuted }]}>No routes configured</Text>
          ) : (
            routes.filter(r => r.isActive !== false).map(route => {
              const waiting = queue.filter(q => q.routeId === route.id && normalizeQueueStatus(q.status) === 'waiting').length;
              const dispatched = queue.filter(q => q.routeId === route.id && normalizeQueueStatus(q.status) === 'dispatched').length;
              const total = waiting + dispatched;
              const pct = total > 0 ? Math.round((dispatched / total) * 100) : 0;
              return (
                <View key={route.id} style={[styles.breakdownRow, { borderBottomColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.breakdownName, { color: c.text }]} numberOfLines={1}>
                      {route.routeName || route.destinationStation}
                    </Text>
                    <Text style={[styles.breakdownMeta, { color: c.textMuted }]}>
                      {waiting} waiting · {dispatched} dispatched
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: '#22c55e' }]} />
                  </View>
                  <Text style={[styles.breakdownPct, { color: c.textMuted }]}>{pct}%</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  }

  // ── Loading / Empty states ────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingTxt, { color: c.textMuted }]}>Loading queue…</Text>
      </View>
    );
  }

  if (!rank) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.textMuted} />
        <Text style={[styles.emptyTitle, { color: c.text, marginTop: 12 }]}>No Taxi Rank</Text>
        <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>No taxi rank found for your association</Text>
      </View>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────

  return (
    <View key={refreshKey} style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4, backgroundColor: c.surface }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
            <Ionicons name="chevron-back" size={22} color={c.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: c.text }]}>Queue</Text>
            <Text style={[styles.headerSubtitle, { color: c.textMuted }]}>{rank.name}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={[styles.headerAction, showFilters && { backgroundColor: c.primary + '15' }]}>
            <Ionicons name="options-outline" size={18} color={showFilters ? c.primary : c.textMuted} />
          </TouchableOpacity>
          <VoiceRecorderButton
            onRecordingComplete={handleVoiceCommand}
            processing={voiceProcessing}
            buttonStyle={[styles.headerAction, { backgroundColor: '#22c55e15' }]}
            iconColor="#22c55e"
            size={18}
          />
        </View>

        {/* ── Stats Strip ── */}
        {stats && (
          <View style={styles.statsStrip}>
            <StatPill icon="time-outline" label="Waiting" value={stats.loading ?? 0} color="#f59e0b" c={c} styles={styles} />
            <StatPill icon="checkmark-circle" label="Gone" value={stats.dispatched ?? 0} color="#22c55e" c={c} styles={styles} />
            <StatPill icon="people" label="Pax" value={stats.totalPassengers ?? 0} color="#3b82f6" c={c} styles={styles} />
            <StatPill icon="hourglass" label="Wait" value={`${stats.averageWaitMinutes ?? 0}m`} color="#8b5cf6" c={c} styles={styles} />
          </View>
        )}
      </View>

      {/* ── Tabs ── */}
      <View style={[styles.tabs, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {[
          { key: 'overview', icon: 'grid-outline', label: 'Overview' },
          { key: 'queue', icon: 'list-outline', label: 'Queue' },
          { key: 'bookings', icon: 'receipt-outline', label: 'Bookings' },
          { key: 'analytics', icon: 'stats-chart-outline', label: 'Analytics' },
        ].map(tab => {
          const active = activeView === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveView(tab.key)}
            >
              <Ionicons name={tab.icon} size={18} color={active ? c.primary : c.textMuted} />
              <Text style={[styles.tabLabel, active && { color: c.primary, fontWeight: '700' }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Route Filter ── */}
      {showFilters && (
        <View style={[styles.filterBar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedRouteId && styles.filterChipActive]}
              onPress={() => setSelectedRouteId(null)}
            >
              <Text style={[styles.filterChipTxt, !selectedRouteId && styles.filterChipTxtActive]}>All</Text>
              <View style={[styles.filterBadge, !selectedRouteId && { backgroundColor: c.primary }]}>
                <Text style={[styles.filterBadgeTxt, !selectedRouteId && { color: '#fff' }]}>
                  {queue.filter(q => q.status !== 'Removed' && q.status !== 'Dispatched').length}
                </Text>
              </View>
            </TouchableOpacity>
            {routes.filter(r => r.isActive !== false).map(r => {
              const count = queue.filter(q => q.routeId === r.id && q.status !== 'Removed' && q.status !== 'Dispatched').length;
              const on = selectedRouteId === r.id;
              return (
                <TouchableOpacity key={r.id} style={[styles.filterChip, on && styles.filterChipActive]} onPress={() => setSelectedRouteId(r.id)}>
                  <Text style={[styles.filterChipTxt, on && styles.filterChipTxtActive]} numberOfLines={1}>
                    {r.routeName || r.destinationStation}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.filterBadge, on && { backgroundColor: '#fff' }]}>
                      <Text style={[styles.filterBadgeTxt, on && { color: c.primary }]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Voice Command Tip ── */}
      <View style={[styles.voiceTip, { backgroundColor: '#22c55e10', borderBottomColor: '#22c55e20' }]}>
        <Ionicons name="mic-outline" size={16} color="#22c55e" />
        <Text style={[styles.voiceTipText, { color: '#22c55e' }]}>
          Try: "Add vehicle ABC 123 to queue" · "Dispatch first vehicle" · "Remove vehicle XYZ 789"
        </Text>
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        {activeView === 'overview' && <OverviewView />}
        {activeView === 'queue' && <QueueView />}
        {activeView === 'bookings' && <BookingsView />}
        {activeView === 'analytics' && <AnalyticsView />}
      </View>

      {/* ── FAB ── */}
      <View style={[styles.fabWrap, { bottom: Math.max(insets.bottom, 12) + 12 }]}>
        <TouchableOpacity style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => setAddModalVisible(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ══════════ Add to Queue Modal ══════════ */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: c.primary + '15' }]}>
                  <Ionicons name="add-circle" size={20} color={c.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Add to Queue</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={[styles.modalClose, { backgroundColor: c.background }]}>
                <Ionicons name="close" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyPad} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Route (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity style={[styles.chip, !addRouteId && styles.chipActive]} onPress={() => setAddRouteId(null)}>
                  <Text style={[styles.chipTxt, !addRouteId && styles.chipTxtActive]}>None</Text>
                </TouchableOpacity>
                {routes.filter(r => r.isActive !== false).map(r => (
                  <TouchableOpacity key={r.id} style={[styles.chip, addRouteId === r.id && styles.chipActive]} onPress={() => setAddRouteId(r.id)}>
                    <Text style={[styles.chipTxt, addRouteId === r.id && styles.chipTxtActive]} numberOfLines={1}>
                      {r.destinationStation || r.routeName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Vehicle *</Text>
              <View style={styles.vehicleList}>
                {vehicles.filter(v => !queuedVehicleIds.has(v.id)).length === 0 ? (
                  <Text style={[styles.noVehicles, { color: c.textMuted }]}>All vehicles are already queued</Text>
                ) : (
                  vehicles.filter(v => !queuedVehicleIds.has(v.id)).map(v => {
                    const sel = addVehicleId === v.id;
                    return (
                      <TouchableOpacity key={v.id}
                        style={[styles.vehicleItem, { borderColor: sel ? c.primary : c.border, backgroundColor: sel ? c.primary + '08' : 'transparent' }]}
                        onPress={() => {
                          setAddVehicleId(v.id);
                          // Auto-select driver assigned to this vehicle
                          const assignedDriver = drivers.find(d => d.assignedVehicleId === v.id || d.AssignedVehicleId === v.id);
                          setAddDriverId(assignedDriver?.id || null);
                          // If route isn't explicitly chosen, auto-select the assigned route for this vehicle (if any)
                          if (!addRouteId) {
                            const assignedRoute = routes.find(r => (r.routeVehicles || []).some(rv => {
                              const vehicleId = rv.vehicleId || rv.vehicle?.id;
                              return vehicleId === v.id && rv.isActive !== false;
                            }));
                            if (assignedRoute) {
                              setAddRouteId(assignedRoute.id);
                            }
                          }
                        }}
                      >
                        <View style={[styles.vehicleItemIcon, { backgroundColor: sel ? c.primary + '20' : c.background }]}>
                          <Ionicons name="car-sport" size={16} color={sel ? c.primary : c.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.vehicleItemReg, { color: c.text }]}>{v.registration || 'Unknown'}</Text>
                          <Text style={[styles.vehicleItemMeta, { color: c.textMuted }]}>
                            {[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}{v.capacity ? ` · ${v.capacity} seats` : ''}
                          </Text>
                        </View>
                        {sel && <Ionicons name="checkmark-circle" size={20} color={c.primary} />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 16 }]}>Driver (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity style={[styles.chip, !addDriverId && styles.chipActive]} onPress={() => setAddDriverId(null)}>
                  <Text style={[styles.chipTxt, !addDriverId && styles.chipTxtActive]}>None</Text>
                </TouchableOpacity>
                {drivers.filter(d => d.isActive !== false).map(d => (
                  <TouchableOpacity key={d.id} style={[styles.chip, addDriverId === d.id && styles.chipActive]} onPress={() => setAddDriverId(d.id)}>
                    <Text style={[styles.chipTxt, addDriverId === d.id && styles.chipTxtActive]} numberOfLines={1}>
                      {d.name || d.Name || 'Driver'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 16 }]}>Est. Departure Time (optional)</Text>
              <TouchableOpacity
                style={[styles.input, { borderColor: c.border, backgroundColor: c.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    const t = window.prompt('Enter estimated departure time (HH:MM)', addEstimatedDeparture || '');
                    if (t && /^\d{1,2}:\d{2}$/.test(t.trim())) setAddEstimatedDeparture(t.trim());
                  } else {
                    setShowETDPicker(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: addEstimatedDeparture ? c.text : c.textMuted, fontSize: 14 }}>
                  {addEstimatedDeparture || 'Select time'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {addEstimatedDeparture ? (
                    <TouchableOpacity onPress={() => setAddEstimatedDeparture('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color={c.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                  <Ionicons name="time-outline" size={16} color={c.primary} />
                </View>
              </TouchableOpacity>
              {showETDPicker && (
                <DateTimePicker
                  value={addEstimatedDeparture ? new Date(`2000-01-01T${addEstimatedDeparture}:00`) : new Date()}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowETDPicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const hh = String(selectedDate.getHours()).padStart(2, '0');
                      const mm = String(selectedDate.getMinutes()).padStart(2, '0');
                      setAddEstimatedDeparture(`${hh}:${mm}`);
                    }
                  }}
                />
              )}

              <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 16 }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={addNotes} onChangeText={setAddNotes}
                placeholder="Optional notes…" placeholderTextColor={c.textMuted}
              />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity style={[styles.btnOutline, { borderColor: c.border }]} onPress={() => { setAddModalVisible(false); setAddVehicleId(null); setAddRouteId(null); setAddDriverId(null); setAddNotes(''); setAddEstimatedDeparture(''); setShowETDPicker(false); }}>
                <Text style={[styles.btnOutlineTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: c.primary }]} onPress={handleAddToQueue} disabled={addBusy}>
                {addBusy ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.btnPrimaryTxt}>Add to Queue</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ Dispatch Modal ══════════ */}
      <Modal visible={dispatchModalVisible} transparent animationType="slide" onRequestClose={() => setDispatchModalVisible(false)}>
        <View style={styles.dispatchOverlay}>
          <View style={[styles.dispatchModalCard, { backgroundColor: c.surface }]}>
            {/* ── Header ── */}
            <View style={styles.dispatchHeader}>
              <View style={styles.dispatchHeaderLeft}>
                <View style={styles.dispatchHeaderIcon}>
                  <Ionicons name="send" size={16} color="#fff" />
                </View>
                <View>
                  <Text style={styles.dispatchHeaderTitle}>Dispatch Vehicle</Text>
                  {dispatchEntry && (
                    <Text style={[styles.dispatchHeaderSub, { color: c.textMuted }]}>
                      {dispatchEntry.vehicleRegistration} · #{dispatchEntry.queuePosition} · {dispatchEntry.driverName || 'No driver'}{dispatchEntry.vehicleCapacity ? ` · ${dispatchEntry.vehicleCapacity} seats` : ''}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => { setDispatchModalVisible(false); setDispatchEntry(null); }} hitSlop={12}>
                <Ionicons name="close-circle" size={28} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* ── Live Totals Bar ── */}
            <View style={[styles.totalBar, { backgroundColor: c.primary + '10' }]}>
              <View style={styles.totalBarItem}>
                <Ionicons name="people" size={16} color={c.primary} />
                <Text style={[styles.totalBarLabel, { color: c.textMuted }]}>Passengers</Text>
                <Text style={[styles.totalBarValue, { color: c.text }]}>{passengerSummary.count}</Text>
              </View>
              <View style={[styles.totalBarDivider, { backgroundColor: c.border }]} />
              <View style={styles.totalBarItem}>
                <Ionicons name="cash" size={16} color="#22c55e" />
                <Text style={[styles.totalBarLabel, { color: c.textMuted }]}>Total Fare</Text>
                <Text style={[styles.totalBarValue, { color: '#22c55e' }]}>R {passengerSummary.totalFare.toFixed(2)}</Text>
              </View>
            </View>

            {/* ── Body ── */}
            <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">

              {dispatchBookingsLoading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginBottom: 12, backgroundColor: '#f59e0b10', borderRadius: 10 }}>
                  <ActivityIndicator size="small" color="#f59e0b" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 12, color: '#f59e0b', fontWeight: '600' }}>Loading booked passengers…</Text>
                </View>
              )}

              {!includePassengerList && (
                <>
                  <Text style={[styles.dFieldLabel, { color: c.textMuted }]}>Quick Passenger Count</Text>
                  <TextInput
                    style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                    value={dispatchPax}
                    onChangeText={t => {
                      setDispatchPax(t);
                      const count = parseInt(t, 10) || 0;
                      const fare = parseFloat(dispatchDefaultFare) || 0;
                      if (fare > 0 && count > 0) setDispatchFare((count * fare).toFixed(2));
                      else if (count === 0) setDispatchFare('');
                    }}
                    keyboardType="numeric"
                    placeholder="e.g. 15"
                    placeholderTextColor={c.textMuted}
                  />

                  <Text style={[styles.dFieldLabel, { color: c.textMuted, marginTop: 12 }]}>Default Fare per Passenger (R)</Text>
                  <TextInput
                    style={[styles.dInput, { color: dispatchDefaultFare ? c.primary : c.text, borderColor: dispatchDefaultFare ? c.primary + '40' : c.border, backgroundColor: dispatchDefaultFare ? c.primary + '08' : c.background }]}
                    value={dispatchDefaultFare}
                    onChangeText={t => {
                      setDispatchDefaultFare(t);
                      const fare = parseFloat(t) || 0;
                      const count = parseInt(dispatchPax, 10) || 0;
                      if (fare > 0 && count > 0) setDispatchFare((count * fare).toFixed(2));
                      else if (fare === 0) setDispatchFare('');
                    }}
                    keyboardType="numeric"
                    placeholder="e.g. 50.00"
                    placeholderTextColor={c.textMuted}
                  />

                  <Text style={[styles.dFieldLabel, { color: c.textMuted, marginTop: 12 }]}>Total Fare (R)</Text>
                  <TextInput
                    style={[styles.dInput, { color: dispatchFare ? '#22c55e' : c.text, borderColor: dispatchFare ? '#22c55e40' : c.border, backgroundColor: dispatchFare ? '#22c55e08' : c.background }]}
                    value={dispatchFare}
                    onChangeText={setDispatchFare}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={c.textMuted}
                  />
                </>
              )}

              {/* Passenger list toggle */}
              <TouchableOpacity
                style={[styles.dToggle, { borderColor: includePassengerList ? c.primary : c.border, backgroundColor: includePassengerList ? c.primary + '08' : 'transparent' }]}
                onPress={() => setIncludePassengerList(!includePassengerList)}
                activeOpacity={0.7}
              >
                <View style={[styles.dToggleCheck, { borderColor: includePassengerList ? c.primary : c.border, backgroundColor: includePassengerList ? c.primary : 'transparent' }]}>
                  {includePassengerList && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dToggleTitle, { color: c.text }]}>Capture passenger details</Text>
                  <Text style={{ fontSize: 11, color: c.textMuted }}>Add name, contact, next of kin & destination per passenger</Text>
                </View>
                <Ionicons name={includePassengerList ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
              </TouchableOpacity>

              {includePassengerList && (
                <View style={{ marginTop: 16 }}>
                  {passengerList.map((pax, idx) => {
                    const paxFare = parseFloat(pax.amount) || 0;
                    return (
                      <View key={idx} style={[styles.paxCard, { backgroundColor: pax.fromBooking ? '#fffbeb' : c.background, borderColor: pax.fromBooking ? '#fde68a' : c.border }]}>
                        {/* Card header */}
                        <View style={styles.paxCardHeader}>
                          <View style={[styles.paxBadge, { backgroundColor: pax.fromBooking ? '#f59e0b' : c.primary }]}>
                            <Text style={styles.paxBadgeText}>{pax.seatNumber || (idx + 1)}</Text>
                          </View>
                          <Text style={[styles.paxCardTitle, { color: c.text }]} numberOfLines={1}>
                            {pax.name.trim() || `Passenger ${idx + 1}`}
                          </Text>
                          {pax.fromBooking && (
                            <View style={{ backgroundColor: '#f59e0b20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: '#f59e0b' }}>BOOKED</Text>
                            </View>
                          )}
                          {paxFare > 0 && (
                            <View style={[styles.paxFarePill, { backgroundColor: '#22c55e15' }]}>
                              <Text style={styles.paxFarePillText}>R {paxFare.toFixed(2)}</Text>
                            </View>
                          )}
                          {passengerList.length > 1 && !pax.fromBooking && (
                            <TouchableOpacity onPress={() => setPassengerList(passengerList.filter((_, i) => i !== idx))} hitSlop={8}>
                              <Ionicons name="trash-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Two-col: Name + Phone */}
                        <View style={styles.paxFieldRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.paxFieldLabel, { color: c.textMuted }]}>Full Name *</Text>
                            <TextInput
                              style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                              value={pax.name}
                              onChangeText={t => { const u = [...passengerList]; u[idx].name = t; setPassengerList(u); }}
                              placeholder="John Doe" placeholderTextColor={c.textMuted}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.paxFieldLabel, { color: c.textMuted }]}>Phone</Text>
                            <TextInput
                              style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                              value={pax.contact}
                              onChangeText={t => { const u = [...passengerList]; u[idx].contact = t; setPassengerList(u); }}
                              placeholder="072 000 0000" placeholderTextColor={c.textMuted}
                              keyboardType="phone-pad"
                            />
                          </View>
                        </View>

                        {/* Two-col: NextOfKin */}
                        <View style={styles.paxFieldRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.paxFieldLabel, { color: c.textMuted }]}>Next of Kin</Text>
                            <TextInput
                              style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                              value={pax.nextOfKinName}
                              onChangeText={t => { const u = [...passengerList]; u[idx].nextOfKinName = t; setPassengerList(u); }}
                              placeholder="Name" placeholderTextColor={c.textMuted}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.paxFieldLabel, { color: c.textMuted }]}>Kin Phone</Text>
                            <TextInput
                              style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                              value={pax.nextOfKinContact}
                              onChangeText={t => { const u = [...passengerList]; u[idx].nextOfKinContact = t; setPassengerList(u); }}
                              placeholder="072 000 0000" placeholderTextColor={c.textMuted}
                              keyboardType="phone-pad"
                            />
                          </View>
                        </View>

                        {/* Destination + Fare */}
                        <View style={styles.paxFieldRow}>
                          <View style={{ flex: 2 }}>
                            <Text style={[styles.paxFieldLabel, { color: c.textMuted }]}>Destination</Text>
                            {dispatchDestinations.length > 0 ? (
                              <TouchableOpacity
                                style={[styles.destButton, { borderColor: pax.destination ? c.primary + '50' : c.border, backgroundColor: pax.destination ? c.primary + '06' : c.surface }]}
                                onPress={() => { setDestPickerIdx(idx); setDestPickerOpen(true); }}
                                activeOpacity={0.7}
                              >
                                {pax.destination ? (
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.destButtonText, { color: c.text }]} numberOfLines={1}>{pax.destination}</Text>
                                    <Text style={[styles.destButtonFare, { color: '#22c55e' }]}>R {(getFareForDestination(pax.destination) || 0).toFixed(2)}</Text>
                                  </View>
                                ) : (
                                  <Text style={[styles.destButtonPlaceholder, { color: c.textMuted }]}>Select stop…</Text>
                                )}
                                <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                              </TouchableOpacity>
                            ) : (
                              <TextInput
                                style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                                value={pax.destination}
                                onChangeText={t => { const u = [...passengerList]; u[idx].destination = t; setPassengerList(u); }}
                                placeholder="Destination" placeholderTextColor={c.textMuted}
                              />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.paxFieldLabel, { color: c.textMuted }]}>Fare (R)</Text>
                            <TextInput
                              style={[styles.dInput, styles.fareInput, { color: paxFare > 0 ? '#22c55e' : c.text, borderColor: paxFare > 0 ? '#22c55e40' : c.border, backgroundColor: paxFare > 0 ? '#22c55e08' : c.surface }]}
                              value={pax.amount}
                              onChangeText={t => { const u = [...passengerList]; u[idx].amount = t; setPassengerList(u); }}
                              placeholder="0.00" placeholderTextColor={c.textMuted}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>

                        {/* Payment Method */}
                        <View style={{ marginTop: 8 }}>
                          <Text style={[styles.paxFieldLabel, { color: c.textMuted }]}>Payment Method</Text>
                          <View style={{ flexDirection: 'row', marginTop: 4 }}>
                            {['Cash', 'Card'].map((method, mi) => {
                              const selected = (pax.paymentMethod || 'Cash') === method;
                              const methodColor = method === 'Cash' ? '#22c55e' : '#3b82f6';
                              const icon = method === 'Cash' ? 'cash-outline' : 'card-outline';
                              return (
                                <TouchableOpacity
                                  key={method}
                                  style={{
                                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                    paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
                                    borderColor: selected ? methodColor : c.border,
                                    backgroundColor: selected ? methodColor + '10' : c.surface,
                                    marginLeft: mi > 0 ? 8 : 0,
                                  }}
                                  onPress={() => { const u = [...passengerList]; u[idx].paymentMethod = method; setPassengerList(u); }}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name={icon} size={16} color={selected ? methodColor : c.textMuted} />
                                  <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? methodColor : c.textMuted, marginLeft: 6 }}>
                                    {method}
                                  </Text>
                                  {selected ? (
                                    <Ionicons name="checkmark-circle" size={14} color={methodColor} style={{ marginLeft: 4 }} />
                                  ) : null}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        {/* Seat Number */}
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.paxFieldLabel, { color: c.textMuted }]}>Seat #</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{
                                width: 52, height: 38, borderRadius: 10, borderWidth: 1.5,
                                borderColor: pax.seatNumber ? c.primary : c.border,
                                backgroundColor: pax.seatNumber ? c.primary + '10' : c.surface,
                                alignItems: 'center', justifyContent: 'center',
                              }}>
                                {pax.fromBooking && pax.seatNumber ? (
                                  <Text style={{ fontSize: 15, fontWeight: '900', color: c.primary }}>{pax.seatNumber}</Text>
                                ) : (
                                  <TextInput
                                    style={{ fontSize: 15, fontWeight: '900', color: c.primary, textAlign: 'center', width: '100%', height: '100%' }}
                                    value={pax.seatNumber}
                                    onChangeText={t => { const u = [...passengerList]; u[idx].seatNumber = t.replace(/[^0-9]/g, '').slice(0, 2); setPassengerList(u); }}
                                    keyboardType="number-pad"
                                    placeholder="—"
                                    placeholderTextColor={c.textMuted}
                                  />
                                )}
                              </View>
                              {pax.fromBooking && (
                                <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '600' }}>Pre-booked seat</Text>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {(() => {
                      const usedSeats = [...bookedSeats, ...passengerList.map(p => p.seatNumber).filter(Boolean)];
                      const nextSeat = getNextAvailableSeat(usedSeats, dispatchEntry?.vehicleCapacity);
                      const hasAvailableSeats = nextSeat !== '';
                      
                      return hasAvailableSeats ? (
                        <TouchableOpacity
                          style={[styles.dAddPaxBtn, { borderColor: c.primary + '40' }]}
                          onPress={() => {
                            const dest0 = dispatchDestinations[0]?.name || '';
                            setPassengerList([...passengerList, { name: '', contact: '', nextOfKinName: '', nextOfKinContact: '', destination: dest0, amount: String(getFareForDestination(dest0)), paymentMethod: 'Cash', seatNumber: nextSeat, fromBooking: false }]);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.dAddPaxIcon, { backgroundColor: c.primary + '15' }]}>
                            <Ionicons name="person-add" size={16} color={c.primary} />
                          </View>
                          <Text style={[styles.dAddPaxText, { color: c.primary }]}>Add Passenger</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.dAddPaxBtn, { borderColor: c.border, opacity: 0.6 }]}>
                          <View style={[styles.dAddPaxIcon, { backgroundColor: c.border + '20' }]}>
                            <Ionicons name="person-remove" size={16} color={c.textMuted} />
                          </View>
                          <Text style={[styles.dAddPaxText, { color: c.textMuted }]}>Vehicle Full</Text>
                        </View>
                      );
                    })()}
                </View>
              )}
            </ScrollView>

            {/* ── Footer ── */}
            <View style={[styles.dispatchFooter, { borderTopColor: c.border, backgroundColor: c.surface }]}>
              <TouchableOpacity style={[styles.dBtnCancel, { borderColor: c.border }]} onPress={() => { setDispatchModalVisible(false); setDispatchEntry(null); }}>
                <Text style={[styles.dBtnCancelTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dBtnDispatch} onPress={handleDispatch} disabled={dispatchBusy} activeOpacity={0.8}>
                {dispatchBusy ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="send" size={14} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.dBtnDispatchTxt}>Dispatch{passengerSummary.count > 0 ? ` (${passengerSummary.count})` : ''}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ Destination Picker Modal ══════════ */}
      <Modal visible={destPickerOpen} transparent animationType="slide" onRequestClose={() => setDestPickerOpen(false)}>
        <View style={styles.destPickerOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDestPickerOpen(false)} />
          <View style={[styles.destPickerSheet, { backgroundColor: c.surface }]}>
            <View style={styles.destPickerHandle}><View style={[styles.destPickerHandleBar, { backgroundColor: c.border }]} /></View>
            <View style={styles.destPickerHeader}>
              <View style={[styles.destPickerHeaderIcon, { backgroundColor: '#3b82f615' }]}>
                <Ionicons name="location" size={18} color="#3b82f6" />
              </View>
              <Text style={[styles.destPickerTitle, { color: c.text }]}>Select Destination</Text>
              <TouchableOpacity onPress={() => setDestPickerOpen(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={26} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {dispatchDestinations.map((dest, i) => {
                const sourceRoutes = dispatchRoute ? [dispatchRoute] : routes;
                const isLast = sourceRoutes.some(r => dest.name === (r.destinationStation ?? r.DestinationStation));
                const isSel = destPickerIdx >= 0 && passengerList[destPickerIdx]?.destination === dest.name;
                return (
                  <TouchableOpacity
                    key={dest.name}
                    style={[styles.destPickerItem, { borderColor: isSel ? c.primary : c.border, backgroundColor: isSel ? c.primary + '08' : c.background }]}
                    onPress={() => {
                      if (destPickerIdx >= 0 && destPickerIdx < passengerList.length) {
                        const u = [...passengerList];
                        u[destPickerIdx].destination = dest.name;
                        u[destPickerIdx].amount = String(dest.fare || '');
                        setPassengerList(u);
                      }
                      setDestPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.destPickerItemLeft}>
                      <View style={[styles.destPickerDot, { backgroundColor: isLast ? '#ef4444' : isSel ? c.primary : '#3b82f6' }]}>
                        {isLast ? (
                          <Ionicons name="flag" size={10} color="#fff" />
                        ) : (
                          <Text style={styles.destPickerDotText}>{i + 1}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.destPickerItemName, { color: c.text }]} numberOfLines={1}>{dest.name}</Text>
                        {isLast && <Text style={{ fontSize: 10, color: c.textMuted }}>Final destination</Text>}
                      </View>
                    </View>
                    <View style={[styles.destPickerFareBadge, { backgroundColor: '#22c55e15' }]}>
                      <Text style={styles.destPickerFareText}>R {(dest.fare || 0).toFixed(2)}</Text>
                    </View>
                    {isSel && <Ionicons name="checkmark-circle" size={20} color={c.primary} style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════ Assign Route Modal ══════════ */}
      <Modal visible={routeModalVisible} transparent animationType="fade" onRequestClose={() => setRouteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: '#3b82f615' }]}>
                  <Ionicons name="navigate" size={18} color="#3b82f6" />
                </View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Assign Route</Text>
              </View>
              <TouchableOpacity onPress={() => { setRouteModalVisible(false); setRouteModalEntry(null); }} style={[styles.modalClose, { backgroundColor: c.background }]}>
                <Ionicons name="close" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyPad}>
              {routeModalEntry && (
                <View style={[styles.dispatchPreview, { borderColor: c.border, backgroundColor: c.background }]}>
                  <View style={[styles.dispatchPreviewIcon, { backgroundColor: c.primary + '15' }]}>
                    <Ionicons name="car-sport" size={20} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dispatchPreviewReg, { color: c.text }]}>{routeModalEntry.vehicleRegistration}</Text>
                    <Text style={[styles.dispatchPreviewMeta, { color: c.textMuted }]}>
                      Current: {routeModalEntry.routeName || routeModalEntry.routeDestination || 'No route'}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Select Route</Text>
              <TouchableOpacity
                style={[styles.chip, { marginBottom: 8 }, !routeModalEntry?.routeId && styles.chipActive]}
                onPress={() => handleAssignRoute(routeModalEntry, null)}
                disabled={routeModalBusy}
              >
                <Text style={[styles.chipTxt, !routeModalEntry?.routeId && styles.chipTxtActive]}>None (unassigned)</Text>
              </TouchableOpacity>
              {routes.filter(r => r.isActive !== false).map(r => {
                const isCurrent = routeModalEntry?.routeId === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, { marginBottom: 8 }, isCurrent && styles.chipActive]}
                    onPress={() => handleAssignRoute(routeModalEntry, r.id)}
                    disabled={routeModalBusy}
                  >
                    <Text style={[styles.chipTxt, isCurrent && styles.chipTxtActive]}>
                      {r.routeName || r.destinationStation}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {routeModalBusy && <ActivityIndicator style={{ marginTop: 12 }} color={c.primary} />}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Edit Queue Entry Modal ── */}
      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: '#8b5cf615' }]}>
                  <Ionicons name="create" size={18} color="#8b5cf6" />
                </View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Edit Queue Entry</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditModalVisible(false); setEditEntry(null); }} style={[styles.modalClose, { backgroundColor: c.background }]}>
                <Ionicons name="close" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyPad}>
              {editEntry && (
                <View style={[styles.dispatchPreview, { borderColor: c.border, backgroundColor: c.background }]}>
                  <View style={[styles.dispatchPreviewIcon, { backgroundColor: '#8b5cf615' }]}>
                    <Ionicons name="car-sport" size={20} color="#8b5cf6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dispatchPreviewReg, { color: c.text }]}>{editEntry.vehicleRegistration}</Text>
                    <Text style={[styles.dispatchPreviewMeta, { color: c.textMuted }]}>
                      Position #{editEntry.queuePosition} · {editEntry.status}
                    </Text>
                  </View>
                </View>
              )}

              {/* Status */}
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Status</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {['Waiting', 'Loading'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, editStatus === s && styles.chipActive]}
                    onPress={() => setEditStatus(s)}
                  >
                    <Text style={[styles.chipTxt, editStatus === s && styles.chipTxtActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Driver */}
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Driver</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <TouchableOpacity
                  style={[styles.chip, { marginRight: 8 }, !editDriverId && styles.chipActive]}
                  onPress={() => setEditDriverId(null)}
                >
                  <Text style={[styles.chipTxt, !editDriverId && styles.chipTxtActive]}>None</Text>
                </TouchableOpacity>
                {drivers.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.chip, { marginRight: 8 }, editDriverId === d.id && styles.chipActive]}
                    onPress={() => setEditDriverId(d.id)}
                  >
                    <Text style={[styles.chipTxt, editDriverId === d.id && styles.chipTxtActive]}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Vehicle */}
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Vehicle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {vehicles.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.chip, { marginRight: 8 }, editVehicleId === v.id && styles.chipActive]}
                    onPress={() => setEditVehicleId(v.id)}
                  >
                    <Text style={[styles.chipTxt, editVehicleId === v.id && styles.chipTxtActive]}>{v.registration}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Route */}
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Route</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <TouchableOpacity
                  style={[styles.chip, { marginRight: 8 }, !editRouteId && styles.chipActive]}
                  onPress={() => setEditRouteId(null)}
                >
                  <Text style={[styles.chipTxt, !editRouteId && styles.chipTxtActive]}>None</Text>
                </TouchableOpacity>
                {routes.filter(r => r.isActive !== false).map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, { marginRight: 8 }, editRouteId === r.id && styles.chipActive]}
                    onPress={() => setEditRouteId(r.id)}
                  >
                    <Text style={[styles.chipTxt, editRouteId === r.id && styles.chipTxtActive]}>{r.routeName || r.destinationStation}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Estimated Departure */}
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Estimated Departure Time</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={[styles.input, { color: c.text, borderColor: c.border }]}
                  placeholder="HH:MM (e.g. 14:30)"
                  placeholderTextColor={c.textMuted}
                  value={editEstimatedDeparture}
                  onChangeText={setEditEstimatedDeparture}
                />
              ) : (
                <TouchableOpacity
                  style={[styles.input, { borderColor: c.border, justifyContent: 'center' }]}
                  onPress={() => setShowEditETDPicker(true)}
                >
                  <Text style={{ color: editEstimatedDeparture ? c.text : c.textMuted }}>
                    {editEstimatedDeparture || 'Tap to set time'}
                  </Text>
                </TouchableOpacity>
              )}
              {showEditETDPicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  mode="time"
                  value={(() => {
                    if (editEstimatedDeparture) {
                      const [h, m] = editEstimatedDeparture.split(':').map(Number);
                      const d = new Date(); d.setHours(h, m, 0, 0); return d;
                    }
                    return new Date();
                  })()}
                  is24Hour
                  onChange={(e, d) => {
                    setShowEditETDPicker(false);
                    if (d) {
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mm = String(d.getMinutes()).padStart(2, '0');
                      setEditEstimatedDeparture(`${hh}:${mm}`);
                    }
                  }}
                />
              )}

              {/* Notes */}
              <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 14 }]}>Notes</Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, height: 80, textAlignVertical: 'top' }]}
                placeholder="Optional notes..."
                placeholderTextColor={c.textMuted}
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: c.border }]} onPress={() => { setEditModalVisible(false); setEditEntry(null); }}>
                <Text style={[styles.modalCancelTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleUpdateQueueEntry} disabled={editBusy}>
                {editBusy ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.modalConfirmTxt}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Trip Detail Modal ── */}
      <Modal visible={tripDetailVisible} transparent animationType="slide" onRequestClose={() => setTripDetailVisible(false)}>
        <View style={styles.dispatchOverlay}>
          <View style={[styles.dispatchModalCard, { backgroundColor: c.surface }]}>
            {/* Header */}
            <View style={[styles.dispatchHeader, { backgroundColor: '#3b82f6' }]}>
              <View style={styles.dispatchHeaderLeft}>
                <View style={[styles.dispatchHeaderIcon, { backgroundColor: '#ffffff25' }]}>
                  <Ionicons name="receipt-outline" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={styles.dispatchHeaderTitle}>Trip Details</Text>
                  <Text style={[styles.dispatchHeaderSub, { color: '#ffffffaa' }]}>
                    {tripDetailEntry?.vehicleRegistration || ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setTripDetailVisible(false)} style={[styles.modalClose, { backgroundColor: '#ffffff20' }]}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
              {tripDetailLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color={c.primary} />
                  <Text style={{ color: c.textMuted, marginTop: 12, fontSize: 13 }}>Loading trip details…</Text>
                </View>
              ) : tripDetailData?.noTrip ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="information-circle-outline" size={40} color={c.textMuted} />
                  <Text style={{ color: c.textMuted, marginTop: 8, fontSize: 14 }}>No trip record found for this dispatch</Text>
                </View>
              ) : tripDetailData?.error ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
                  <Text style={{ color: '#ef4444', marginTop: 8, fontSize: 14 }}>Failed to load trip details</Text>
                </View>
              ) : tripDetailData?.trip ? (
                <>
                  {/* Vehicle / Driver / Route info */}
                  <View style={[styles.tripInfoCard, { backgroundColor: c.background, borderColor: c.border }]}>
                    <View style={styles.tripInfoRow}>
                      <Ionicons name="car-sport-outline" size={16} color={c.primary} />
                      <Text style={[styles.tripInfoLabel, { color: c.textMuted }]}>Vehicle</Text>
                      <Text style={[styles.tripInfoValue, { color: c.text }]}>{tripDetailEntry?.vehicleRegistration || '—'}</Text>
                    </View>
                    <View style={styles.tripInfoRow}>
                      <Ionicons name="person-outline" size={16} color={c.primary} />
                      <Text style={[styles.tripInfoLabel, { color: c.textMuted }]}>Driver</Text>
                      <Text style={[styles.tripInfoValue, { color: c.text }]}>{tripDetailEntry?.driverName || '—'}</Text>
                    </View>
                    <View style={styles.tripInfoRow}>
                      <Ionicons name="navigate-outline" size={16} color={c.primary} />
                      <Text style={[styles.tripInfoLabel, { color: c.textMuted }]}>Route</Text>
                      <Text style={[styles.tripInfoValue, { color: c.text }]}>
                        {tripDetailData.trip.departureStation || '?'} → {tripDetailData.trip.destinationStation || '?'}
                      </Text>
                    </View>
                    <View style={styles.tripInfoRow}>
                      <Ionicons name="time-outline" size={16} color={c.primary} />
                      <Text style={[styles.tripInfoLabel, { color: c.textMuted }]}>Departed</Text>
                      <Text style={[styles.tripInfoValue, { color: c.text }]}>
                        {new Date(tripDetailData.trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {(() => {
                      const tripStatus = String(tripDetailData.trip.status || '').toLowerCase();
                      const isCompletedTrip = normalizeQueueStatus(tripDetailEntry?.status) === 'completed'
                        || tripStatus === 'completed'
                        || tripStatus === 'arrived';
                      const completedAt = tripDetailEntry?.completedAt
                        || tripDetailData.trip.arrivalTime
                        || tripDetailData.trip.updatedAt
                        || tripDetailEntry?.updatedAt;

                      if (!isCompletedTrip || !completedAt) return null;

                      return (
                        <View style={styles.tripInfoRow}>
                          <Ionicons name="checkmark-done-outline" size={16} color="#16a34a" />
                          <Text style={[styles.tripInfoLabel, { color: c.textMuted }]}>Completed</Text>
                          <Text style={[styles.tripInfoValue, { color: c.text }]}>
                            {new Date(completedAt).toLocaleString([], {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      );
                    })()}
                    {tripDetailEntry?.dispatchedByName ? (
                      <View style={styles.tripInfoRow}>
                        <Ionicons name="shield-outline" size={16} color="#8b5cf6" />
                        <Text style={[styles.tripInfoLabel, { color: c.textMuted }]}>Dispatched by</Text>
                        <Text style={[styles.tripInfoValue, { color: c.text }]}>{tripDetailEntry.dispatchedByName}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Trip Summary */}
                  {(() => {
                    const paxList = tripDetailData.passengers || [];
                    const totalPax = paxList.length || tripDetailData.trip.passengerCount || 0;
                    const totalAmount = paxList.reduce((s, p) => s + (p.amount || 0), 0) || tripDetailData.trip.totalAmount || 0;
                    const cashPax = paxList.filter(p => (p.paymentMethod || 'Cash').toLowerCase() === 'cash');
                    const cardPax = paxList.filter(p => (p.paymentMethod || 'Cash').toLowerCase() === 'card');
                    const cashTotal = cashPax.reduce((s, p) => s + (p.amount || 0), 0);
                    const cardTotal = cardPax.reduce((s, p) => s + (p.amount || 0), 0);
                    return (
                      <View style={{ marginBottom: 16 }}>
                        {/* Total bar */}
                        <View style={[styles.totalBar, { backgroundColor: '#22c55e12', marginHorizontal: 0, marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
                          <View style={styles.totalBarItem}>
                            <Text style={[styles.totalBarLabel, { color: '#22c55e' }]}>Passengers</Text>
                            <Text style={[styles.totalBarValue, { color: '#22c55e' }]}>{totalPax}</Text>
                          </View>
                          <View style={[styles.totalBarDivider, { backgroundColor: '#22c55e30' }]} />
                          <View style={styles.totalBarItem}>
                            <Text style={[styles.totalBarLabel, { color: '#22c55e' }]}>Total Collected</Text>
                            <Text style={[styles.totalBarValue, { color: '#22c55e' }]}>R{totalAmount.toFixed(2)}</Text>
                          </View>
                          <View style={[styles.totalBarDivider, { backgroundColor: '#22c55e30' }]} />
                          <View style={styles.totalBarItem}>
                            <Text style={[styles.totalBarLabel, { color: '#22c55e' }]}>Status</Text>
                            <Text style={[styles.totalBarValue, { color: '#22c55e', fontSize: 13 }]}>{tripDetailData.trip.status}</Text>
                          </View>
                        </View>
                        {/* Cash / Card breakdown */}
                        <View style={{ flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: '#22c55e20', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' }}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8, backgroundColor: '#f0fdf408' }}>
                            <Ionicons name="cash-outline" size={16} color="#22c55e" />
                            <View>
                              <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: '600' }}>Cash</Text>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#22c55e' }}>R{cashTotal.toFixed(2)}</Text>
                            </View>
                            <View style={{ backgroundColor: '#22c55e18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#22c55e' }}>{cashPax.length}</Text>
                            </View>
                          </View>
                          <View style={{ width: 1, backgroundColor: '#22c55e20' }} />
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8, backgroundColor: '#3b82f608' }}>
                            <Ionicons name="card-outline" size={16} color="#3b82f6" />
                            <View>
                              <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: '600' }}>Card</Text>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#3b82f6' }}>R{cardTotal.toFixed(2)}</Text>
                            </View>
                            <View style={{ backgroundColor: '#3b82f618', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#3b82f6' }}>{cardPax.length}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Passenger list */}
                  {tripDetailData.passengers.length > 0 ? (
                    <>
                      <Text style={[styles.dFieldLabel, { color: c.textMuted, marginBottom: 10 }]}>
                        Passengers ({tripDetailData.passengers.length})
                      </Text>
                      {tripDetailData.passengers.map((pax, idx) => (
                        <View key={pax.id || idx} style={[styles.tripPaxCard, { borderColor: c.border, backgroundColor: c.background }]}>
                          <View style={styles.tripPaxHeader}>
                            <View style={[styles.paxBadge, { backgroundColor: c.primary + '15' }]}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: c.primary }}>{idx + 1}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.tripPaxName, { color: c.text }]}>{pax.passengerName || 'Unnamed'}</Text>
                              {pax.passengerPhone ? (
                                <Text style={[styles.tripPaxMeta, { color: c.textMuted }]}>{pax.passengerPhone}</Text>
                              ) : null}
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.tripPaxFare}>R{(pax.amount || 0).toFixed(2)}</Text>
                              <Text style={[styles.tripPaxMeta, { color: c.textMuted }]}>{pax.paymentMethod || 'Cash'}</Text>
                            </View>
                          </View>

                          <View style={[styles.tripPaxDetails, { borderTopColor: c.border }]}>
                            <View style={styles.tripPaxDetailItem}>
                              <Ionicons name="location-outline" size={12} color={c.textMuted} />
                              <Text style={[styles.tripPaxDetailTxt, { color: c.textMuted }]}>
                                {pax.arrivalStation || '—'}
                              </Text>
                            </View>
                            {(pax.nextOfKinName || pax.nextOfKinContact) ? (
                              <View style={styles.tripPaxDetailItem}>
                                <Ionicons name="people-outline" size={12} color="#f59e0b" />
                                <Text style={[styles.tripPaxDetailTxt, { color: c.textMuted }]}>
                                  NOK: {pax.nextOfKinName || '—'}{pax.nextOfKinContact ? ` (${pax.nextOfKinContact})` : ''}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <Ionicons name="people-outline" size={28} color={c.textMuted} />
                      <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 6 }}>No passenger records</Text>
                    </View>
                  )}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Booking Detail & Seat Allocation Modal ── */}
      <Modal visible={bookingDetailVisible} transparent animationType="slide" onRequestClose={() => setBookingDetailVisible(false)}>
        <View style={styles.dispatchOverlay}>
          <View style={[styles.dispatchModalCard, { backgroundColor: c.surface }]}>
            {/* Header */}
            <View style={[styles.dispatchHeader, { backgroundColor: '#D4AF37' }]}>
              <View style={styles.dispatchHeaderLeft}>
                <Ionicons name="receipt" size={20} color="#fff" />
                <Text style={styles.dispatchHeaderTitle}>Booking Details</Text>
              </View>
              <TouchableOpacity onPress={() => { setBookingDetailVisible(false); setSelectedBooking(null); }} style={styles.dispatchClose}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Booking Info */}
                <View style={{ backgroundColor: c.background, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>
                      {selectedBooking.riderName || 'Unknown Rider'}
                    </Text>
                    <View style={{
                      backgroundColor: selectedBooking.status === 'Confirmed' ? 'rgba(25,135,84,0.12)' : 'rgba(255,193,7,0.12)',
                      borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
                    }}>
                      <Text style={{
                        fontSize: 11, fontWeight: '700',
                        color: selectedBooking.status === 'Confirmed' ? '#198754' : '#cc9a00',
                      }}>{selectedBooking.status}</Text>
                    </View>
                  </View>
                  {selectedBooking.riderPhone ? (
                    <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 4 }}>{selectedBooking.riderPhone}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                    <View>
                      <Text style={{ fontSize: 10, color: c.textMuted }}>Vehicle</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{selectedBooking.vehicleRegistration}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 10, color: c.textMuted }}>Route</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{selectedBooking.routeName || '—'}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 10, color: c.textMuted }}>Payment</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: selectedBooking.paymentStatus === 'Paid' ? '#198754' : '#cc9a00' }}>
                        {selectedBooking.paymentMethod} · {selectedBooking.paymentStatus}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 10, color: c.textMuted }}>Total Fare</Text>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#198754' }}>R{(selectedBooking.totalFare || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                  {selectedBooking.paymentReference ? (
                    <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 8 }}>Ref: {selectedBooking.paymentReference}</Text>
                  ) : null}
                </View>

                {/* Seat Allocation */}
                <View style={{ backgroundColor: c.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons name="people" size={18} color={c.primary} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>
                      Passengers & Seat Allocation
                    </Text>
                  </View>

                  {(selectedBooking.passengers || []).map((p, pi) => (
                    <View key={p.id || pi} style={{
                      backgroundColor: c.surface, borderRadius: 10, padding: 12, marginBottom: 8,
                      borderWidth: 1, borderColor: c.border,
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{pi + 1}. {p.name}</Text>
                          {p.contactNumber ? (
                            <Text style={{ fontSize: 11, color: c.textMuted }}>{p.contactNumber}</Text>
                          ) : null}
                          {p.destination ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <Ionicons name="navigate-outline" size={11} color={c.primary} style={{ marginRight: 4 }} />
                              <Text style={{ fontSize: 11, color: c.primary }}>{p.destination}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'center', minWidth: 80 }}>
                          <Text style={{ fontSize: 10, color: c.textMuted, marginBottom: 4 }}>Seat #</Text>
                          <TextInput
                            style={{
                              width: 60, height: 36, borderRadius: 8, borderWidth: 1.5,
                              borderColor: seatAllocations[p.id] ? c.primary : c.border,
                              backgroundColor: c.background, textAlign: 'center',
                              fontSize: 15, fontWeight: '800', color: c.text,
                            }}
                            keyboardType="number-pad"
                            value={seatAllocations[p.id] || ''}
                            onChangeText={val => setSeatAllocations(prev => ({ ...prev, [p.id]: val }))}
                            placeholder="—"
                            placeholderTextColor={c.textMuted}
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Allocate Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14,
                      alignItems: 'center', marginTop: 8, opacity: allocatingSeats ? 0.6 : 1,
                    }}
                    onPress={() => handleAllocateSeats(selectedBooking)}
                    disabled={allocatingSeats}
                  >
                    {allocatingSeats ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Allocate Seats</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Queue Entry Bookings Modal ── */}
      <Modal visible={queueEntryBookingsVisible} transparent animationType="slide" onRequestClose={() => setQueueEntryBookingsVisible(false)}>
        <View style={styles.dispatchOverlay}>
          <View style={[styles.dispatchModalCard, { backgroundColor: c.surface, maxHeight: '90%' }]}>
            {/* Header */}
            <View style={[styles.dispatchHeader, { backgroundColor: '#D4AF37' }]}>
              <View style={styles.dispatchHeaderLeft}>
                <Ionicons name="receipt" size={20} color="#fff" />
                <Text style={styles.dispatchHeaderTitle}>
                  {queueEntryForBookings?.vehicleRegistration || 'Vehicle'} — Bookings
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setQueueEntryBookingsVisible(false); setQueueEntryForBookings(null); setQueueEntryBookings([]); setSeatAllocations({}); }} style={styles.dispatchClose}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Summary bar */}
            {queueEntryForBookings && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#D4AF37' }}>{queueEntryTotalBooked}</Text>
                  <Text style={{ fontSize: 10, color: c.textMuted }}>Seats Booked</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: c.text }}>{queueEntryBookings.length}</Text>
                  <Text style={{ fontSize: 10, color: c.textMuted }}>Bookings</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#198754' }}>
                    {queueEntryForBookings.vehicleCapacity ? (queueEntryForBookings.vehicleCapacity - queueEntryTotalBooked) : '—'}
                  </Text>
                  <Text style={{ fontSize: 10, color: c.textMuted }}>Available</Text>
                </View>
              </View>
            )}

            {queueEntryBookingsLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={{ marginTop: 10, color: c.textMuted }}>Loading bookings...</Text>
              </View>
            ) : queueEntryBookings.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="receipt-outline" size={48} color={c.border} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.textMuted, marginTop: 10 }}>No bookings yet</Text>
                <Text style={{ fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 4 }}>
                  Riders haven't booked seats on this vehicle yet.
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {queueEntryBookings.map((bk, bkIdx) => {
                  const allAllocated = (bk.passengers || []).every(p => p.seatNumber);
                  return (
                    <View key={bk.id || bkIdx} style={{
                      backgroundColor: c.background, borderRadius: 12, marginBottom: 12,
                      borderWidth: 1, borderColor: allAllocated ? '#19875440' : '#D4AF3740',
                      overflow: 'hidden',
                    }}>
                      {/* Booking header */}
                      <View style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        padding: 12, backgroundColor: allAllocated ? '#19875408' : '#D4AF3708',
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>
                            {bk.riderName || 'Unknown Rider'}
                          </Text>
                          {bk.riderPhone ? (
                            <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{bk.riderPhone}</Text>
                          ) : null}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{
                            backgroundColor: bk.status === 'Confirmed' ? 'rgba(25,135,84,0.12)' : 'rgba(255,193,7,0.12)',
                            borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
                          }}>
                            <Text style={{
                              fontSize: 10, fontWeight: '700',
                              color: bk.status === 'Confirmed' ? '#198754' : '#cc9a00',
                            }}>{bk.status}</Text>
                          </View>
                          <View style={{
                            backgroundColor: bk.paymentStatus === 'Paid' ? 'rgba(25,135,84,0.12)' : 'rgba(255,193,7,0.12)',
                            borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
                          }}>
                            <Text style={{
                              fontSize: 10, fontWeight: '700',
                              color: bk.paymentStatus === 'Paid' ? '#198754' : '#cc9a00',
                            }}>{bk.paymentStatus || 'Unpaid'}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Route & fare line */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="navigate" size={12} color={c.textMuted} style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 11, color: c.textMuted }}>{bk.routeName || '—'}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#198754' }}>R{(bk.totalFare || 0).toFixed(2)}</Text>
                      </View>

                      {/* Passengers with seat allocation */}
                      <View style={{ padding: 12, paddingTop: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted, marginBottom: 6 }}>
                          PASSENGERS ({(bk.passengers || []).length})
                        </Text>
                        {(bk.passengers || []).map((p, pi) => (
                          <View key={p.id || pi} style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            backgroundColor: c.surface, borderRadius: 8, padding: 10, marginBottom: 6,
                            borderWidth: 1, borderColor: p.seatNumber ? '#19875430' : '#D4AF3730',
                          }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{pi + 1}. {p.name}</Text>
                              <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                                {p.contactNumber ? (
                                  <Text style={{ fontSize: 10, color: c.textMuted }}>{p.contactNumber}</Text>
                                ) : null}
                                {p.destination ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="location" size={10} color={c.primary} style={{ marginRight: 2 }} />
                                    <Text style={{ fontSize: 10, color: c.primary }}>{p.destination}</Text>
                                  </View>
                                ) : null}
                                {p.fare ? (
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#198754' }}>R{p.fare.toFixed(2)}</Text>
                                ) : null}
                              </View>
                            </View>
                            <View style={{ alignItems: 'center', minWidth: 70 }}>
                              {p.seatNumber ? (
                                <View style={{ backgroundColor: '#19875415', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#198754' }}>Seat {p.seatNumber}</Text>
                                </View>
                              ) : (
                                <View style={{ alignItems: 'center' }}>
                                  <Text style={{ fontSize: 9, color: c.textMuted, marginBottom: 2 }}>Seat #</Text>
                                  <TextInput
                                    style={{
                                      width: 56, height: 34, borderRadius: 8, borderWidth: 1.5,
                                      borderColor: seatAllocations[p.id] ? c.primary : '#D4AF37',
                                      backgroundColor: c.background, textAlign: 'center',
                                      fontSize: 15, fontWeight: '800', color: c.text,
                                    }}
                                    keyboardType="number-pad"
                                    value={seatAllocations[p.id] || ''}
                                    onChangeText={val => setSeatAllocations(prev => ({ ...prev, [p.id]: val }))}
                                    placeholder="—"
                                    placeholderTextColor={c.textMuted}
                                  />
                                </View>
                              )}
                            </View>
                          </View>
                        ))}

                        {/* Allocate button per booking (only if there are unallocated passengers) */}
                        {(bk.passengers || []).some(p => !p.seatNumber) && (
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#D4AF37', borderRadius: 10, paddingVertical: 10,
                              alignItems: 'center', marginTop: 4, opacity: allocatingSeats ? 0.6 : 1,
                            }}
                            onPress={() => handleAllocateSeatsFromEntry(bk)}
                            disabled={allocatingSeats}
                          >
                            {allocatingSeats ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Allocate Seats</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
// ══════════════════════════════════════════════════════════════════════════════

function StatPill({ icon, label, value, color, c, styles }) {
  return (
    <View style={[styles.statPill, { backgroundColor: color + '10' }]}>
      <Ionicons name={icon} size={14} color={color} style={{ marginRight: 6 }} />
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
      <Text style={[styles.statPillLabel, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

function QueueCard({ entry, isFirst, isLast, c, styles, onDispatch, onRemove, onMoveUp, onMoveDown, onAssignRoute, onViewBookings, onEdit }) {
  const posColor = entry.queuePosition === 1 ? '#22c55e' : entry.queuePosition <= 3 ? '#3b82f6' : c.textMuted;
  const bookedSeats = entry.seatsBooked || 0;
  const capacity = entry.vehicleCapacity || 0;
  const available = entry.seatsAvailable ?? (capacity - bookedSeats);

  return (
    <View style={[styles.queueCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      {/* Top row: position + vehicle info + dispatch */}
      <View style={styles.queueCardTop}>
        <View style={[styles.posBadge, { backgroundColor: posColor + '15' }]}>
          <Text style={[styles.posText, { color: posColor }]}>#{entry.queuePosition}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.queueReg, { color: c.text }]}>{entry.vehicleRegistration || 'Unknown'}</Text>
          <View style={styles.queueMetaRow}>
            {entry.driverName ? (
              <View style={styles.metaChip}>
                <Ionicons name="person" size={10} color={c.textMuted} style={{ marginRight: 3 }} />
                <Text style={[styles.metaChipTxt, { color: c.textMuted }]}>{entry.driverName}</Text>
              </View>
            ) : null}
            {(entry.routeDestination || entry.routeName) ? (
              <View style={styles.metaChip}>
                <Ionicons name="navigate" size={10} color={c.textMuted} style={{ marginRight: 3 }} />
                <Text style={[styles.metaChipTxt, { color: c.textMuted }]}>{entry.routeDestination || entry.routeName}</Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <Ionicons name="time" size={10} color={c.textMuted} style={{ marginRight: 3 }} />
              <Text style={[styles.metaChipTxt, { color: c.textMuted }]}>{entry.joinedAt}</Text>
            </View>
            {entry.estimatedDepartureTime ? (
              <View style={styles.metaChip}>
                <Ionicons name="log-out" size={10} color="#f59e0b" style={{ marginRight: 3 }} />
                <Text style={[styles.metaChipTxt, { color: '#f59e0b' }]}>ETD {new Date(entry.estimatedDepartureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {entry.queuePosition === 1 && (
          <TouchableOpacity style={styles.dispatchBtn} onPress={onDispatch}>
            <Ionicons name="send" size={13} color="#fff" style={{ marginRight: 5 }} />
            <Text style={styles.dispatchBtnTxt}>Go</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Seat & booking summary bar */}
      <TouchableOpacity
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 12, paddingVertical: 8,
          backgroundColor: bookedSeats > 0 ? '#D4AF3712' : c.background,
          borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
        }}
        onPress={onViewBookings}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="people" size={14} color={bookedSeats > 0 ? '#D4AF37' : c.textMuted} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: bookedSeats > 0 ? '#D4AF37' : c.textMuted }}>
              {bookedSeats} booked
            </Text>
          </View>
          {capacity > 0 && (
            <Text style={{ fontSize: 11, color: c.textMuted }}>
              {available} of {capacity} available
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#3b82f6', marginRight: 4 }}>View Bookings</Text>
          <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
        </View>
      </TouchableOpacity>

      {/* Bottom actions */}
      <View style={[styles.queueCardActions, { borderTopColor: c.border }]}>
        <TouchableOpacity style={styles.queueAction} onPress={onMoveUp} disabled={isFirst}>
          <Ionicons name="chevron-up" size={16} color={isFirst ? c.border : c.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onAssignRoute}>
          <Ionicons name="navigate-outline" size={14} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onViewBookings}>
          <Ionicons name="receipt-outline" size={14} color="#D4AF37" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onEdit}>
          <Ionicons name="create-outline" size={14} color="#8b5cf6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onDispatch}>
          <Ionicons name="send-outline" size={14} color={c.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onRemove}>
          <Ionicons name="trash-outline" size={14} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.queueAction} onPress={onMoveDown} disabled={isLast}>
          <Ionicons name="chevron-down" size={16} color={isLast ? c.border : c.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DispatchedCard({ entry, c, styles, onPress, variant = 'dispatched' }) {
  const isCompleted = variant === 'completed';
  const accent = isCompleted ? '#16a34a' : '#22c55e';
  const badgeLabel = isCompleted ? 'DONE' : 'GONE';
  const iconName = isCompleted ? 'flag-outline' : 'checkmark-circle';
  const label = isCompleted ? 'Completed' : 'Departed';
  const timeValue = isCompleted ? (entry.completedAt || entry.updatedAt || entry.departedAt) : entry.departedAt;
  const time = timeValue ? new Date(timeValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  return (
    <TouchableOpacity
      style={[styles.dispatchedCard, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.doneBadge, { backgroundColor: `${accent}15` }]}>
        <Ionicons name={iconName} size={16} color={accent} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={[styles.queueReg, { color: c.text }]}>{entry.vehicleRegistration || 'Unknown'}</Text>
        <Text style={[styles.metaChipTxt, { color: c.textMuted }]}>
          {label} {time}{entry.passengerCount ? ` · ${entry.passengerCount} pax` : ''}
        </Text>
        {(entry.routeName || entry.dispatchedByName) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {entry.routeName ? (
              <View style={[styles.dCardChip, { backgroundColor: c.primary + '15' }]}>
                <Ionicons name="navigate-outline" size={10} color={c.primary} />
                <Text style={[styles.dCardChipTxt, { color: c.primary }]}>{entry.routeName}</Text>
              </View>
            ) : null}
            {entry.dispatchedByName ? (
              <View style={[styles.dCardChip, { backgroundColor: '#8b5cf615' }]}>
                <Ionicons name="person-outline" size={10} color="#8b5cf6" />
                <Text style={[styles.dCardChipTxt, { color: '#8b5cf6' }]}>{entry.dispatchedByName}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[styles.goneTag, { backgroundColor: `${accent}15` }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: accent }}>{badgeLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════════════════════

function createStyles(c) {
  return StyleSheet.create({
    // ── Layout
    root: { flex: 1, flexDirection: 'column' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, flexDirection: 'column' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 80 },
    loadingTxt: { fontSize: 14, marginTop: 12 },

    // ── Header
    header: {
      paddingBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    headerBack: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, marginLeft: 8 },
    headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    headerSubtitle: { fontSize: 12, marginTop: 1 },
    headerAction: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },

    // ── Stats Strip
    statsStrip: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      gap: 6,
    },
    statPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 10,
    },
    statPillValue: { fontSize: 13, fontWeight: '800', marginRight: 3 },
    statPillLabel: { fontSize: 10, fontWeight: '600' },

    // ── Tabs
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      height: 48,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: c.primary,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textMuted,
    },

    // ── Filter Bar
    filterBar: {
      borderBottomWidth: 1,
      paddingVertical: 10,
    },
    filterContent: {
      paddingHorizontal: 12,
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    filterChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterChipTxt: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
      maxWidth: 120,
    },
    filterChipTxtActive: { color: '#fff' },
    filterBadge: {
      backgroundColor: c.border,
      borderRadius: 10,
      minWidth: 20, height: 20,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 5,
      marginLeft: 6,
    },
    filterBadgeTxt: {
      fontSize: 10,
      fontWeight: '800',
      color: c.text,
    },

    // ── FAB
    fabWrap: { position: 'absolute', right: 16 },
    fab: {
      width: 52, height: 52, borderRadius: 26,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
    },

    // ── Queue Cards
    queueCard: {
      borderWidth: 1,
      borderRadius: 14,
      marginBottom: 10,
      overflow: 'hidden',
    },
    queueCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    posBadge: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    posText: { fontSize: 13, fontWeight: '800' },
    queueReg: { fontSize: 15, fontWeight: '700' },
    queueMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    metaChip: { flexDirection: 'row', alignItems: 'center' },
    metaChipTxt: { fontSize: 11 },
    queueCardActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
    },
    queueAction: {
      flex: 1,
      alignItems: 'center', justifyContent: 'center',
      paddingVertical: 8,
    },
    dispatchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#22c55e',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
    },
    dispatchBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // ── Dispatched Card
    dispatchedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    doneBadge: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    goneTag: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    dCardChip: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    },
    dCardChipTxt: { fontSize: 10, fontWeight: '600' },

    // ── Dispatched Filter Card
    dfCard: {
      borderWidth: 1, borderRadius: 18,
      marginTop: 20, marginBottom: 14,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
        android: { elevation: 3 },
      }),
    },
    dfHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#22c55e',
      paddingHorizontal: 14, paddingVertical: 10,
    },
    dfHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dfHeaderIcon: {
      width: 26, height: 26, borderRadius: 8,
      backgroundColor: '#ffffff25',
      alignItems: 'center', justifyContent: 'center',
    },
    dfHeaderTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
    dfCountBadge: {
      backgroundColor: '#fff',
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
    },
    dfCountTxt: { fontSize: 12, fontWeight: '800', color: '#22c55e' },
    dfCountSub: { fontSize: 11, fontWeight: '600', color: '#ffffffcc' },
    dfResetBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: '#ffffff25',
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    dfResetTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
    dfDateRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 10,
      borderBottomWidth: 1,
    },
    dfDateArrow: {
      width: 30, height: 30, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    dfDatePill: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, marginHorizontal: 8,
      paddingVertical: 7, borderRadius: 10,
    },
    dfDateTxt: { fontSize: 13, fontWeight: '700' },
    dfTodayBtn: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
      marginLeft: 6,
    },
    dfTodayBtnTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },
    dfSearchArea: {
      padding: 12, gap: 8,
    },
    dfSearchField: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderRadius: 12,
      paddingHorizontal: 12,
    },
    dfSearchInput: {
      flex: 1, fontSize: 13,
      paddingVertical: 9,
    },

    // ── Trip Detail
    tripInfoCard: {
      borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16,
    },
    tripInfoRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 8,
    },
    tripInfoLabel: { fontSize: 12, fontWeight: '600', width: 90 },
    tripInfoValue: { fontSize: 14, fontWeight: '700', flex: 1 },
    tripPaxCard: {
      borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    },
    tripPaxHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      padding: 12,
    },
    tripPaxName: { fontSize: 14, fontWeight: '700' },
    tripPaxMeta: { fontSize: 11, marginTop: 1 },
    tripPaxFare: { fontSize: 15, fontWeight: '800', color: '#22c55e' },
    tripPaxDetails: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 12,
      paddingHorizontal: 12, paddingVertical: 8,
      borderTopWidth: 1,
    },
    tripPaxDetailItem: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    tripPaxDetailTxt: { fontSize: 11 },

    // ── List headers
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    listHeaderDot: {
      width: 8, height: 8, borderRadius: 4, marginRight: 8,
    },
    listHeaderTxt: { fontSize: 15, fontWeight: '700' },

    // ── Empty state
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyIcon: {
      width: 72, height: 72, borderRadius: 36,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700' },
    emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20 },
    emptyBtn: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    },
    emptyBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

    // ── Overview
    nextCard: {
      borderRadius: 14, padding: 16, marginBottom: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    },
    nextCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    nextIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    nextLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    nextCardBody: { flexDirection: 'row', alignItems: 'center' },
    nextReg: { fontSize: 17, fontWeight: '800' },
    nextMeta: { fontSize: 13, marginTop: 2 },
    quickActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quickBtn: {
      flex: 1, alignItems: 'center', borderRadius: 12, padding: 14,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
    },
    quickBtnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    quickBtnLabel: { fontSize: 12, fontWeight: '600' },

    // ── Card (shared)
    card: {
      borderRadius: 14, padding: 16, marginBottom: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    cardEmpty: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },
    routeRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 11, borderBottomWidth: 1,
    },
    routeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    routeRowName: { fontSize: 14, fontWeight: '600' },
    routeCount: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    routeCountTxt: { fontSize: 12, fontWeight: '700' },

    // ── Analytics
    analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    analyticsTile: {
      width: '47%', borderRadius: 12, padding: 16, alignItems: 'center',
    },
    analyticsTileValue: { fontSize: 24, fontWeight: '800', marginTop: 6 },
    analyticsTileLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    breakdownRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1,
    },
    breakdownName: { fontSize: 14, fontWeight: '600' },
    breakdownMeta: { fontSize: 11, marginTop: 2 },
    breakdownPct: { fontSize: 12, fontWeight: '700', marginLeft: 8, width: 36, textAlign: 'right' },
    progressBarBg: {
      width: 60, height: 6, borderRadius: 3,
      backgroundColor: c.border, overflow: 'hidden',
    },
    progressBarFill: { height: 6, borderRadius: 3 },

    // ── Modal (shared)
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '90%',
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    modalIcon: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 10,
    },
    modalTitle: { fontSize: 17, fontWeight: '800' },
    modalClose: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    modalBody: { flexShrink: 1 },
    modalBodyPad: { padding: 16, paddingBottom: 8 },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
    },
    fieldLabel: {
      fontSize: 12, fontWeight: '700',
      letterSpacing: 0.3,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    input: {
      borderWidth: 1, borderRadius: 10,
      padding: 12, fontSize: 14,
      marginBottom: 4,
    },
    chip: {
      borderRadius: 18,
      paddingHorizontal: 14, paddingVertical: 7,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { fontSize: 12, fontWeight: '700', color: c.text },
    chipTxtActive: { color: '#fff' },
    vehicleList: { maxHeight: 220 },
    noVehicles: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
    vehicleItem: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 12,
      padding: 10, marginBottom: 6,
    },
    vehicleItemIcon: {
      width: 34, height: 34, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 10,
    },
    vehicleItemReg: { fontSize: 14, fontWeight: '700' },
    vehicleItemMeta: { fontSize: 11, marginTop: 1 },
    btnOutline: {
      flex: 1,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderRadius: 12,
      paddingVertical: 12,
    },
    btnOutlineTxt: { fontSize: 14, fontWeight: '600' },
    btnPrimary: {
      flex: 1,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 12,
    },
    btnPrimaryTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

    // ── Modernized Dispatch modal ──
    dispatchOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    dispatchModalCard: {
      width: '100%', maxHeight: '95%',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      overflow: 'hidden',
      ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 }, android: { elevation: 12 } }),
    },
    dispatchHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 16,
    },
    dispatchHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    dispatchHeaderIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: '#22c55e',
      alignItems: 'center', justifyContent: 'center',
    },
    dispatchHeaderTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    dispatchHeaderSub: { fontSize: 12, marginTop: 1 },
    totalBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 20,
      marginHorizontal: 16, borderRadius: 14, marginBottom: 4,
    },
    totalBarItem: { flex: 1, alignItems: 'center', gap: 2 },
    totalBarLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    totalBarValue: { fontSize: 18, fontWeight: '800' },
    totalBarDivider: { width: 1, height: 32, marginHorizontal: 8 },
    dFieldLabel: {
      fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
      letterSpacing: 0.5, marginBottom: 6,
    },
    dInput: {
      borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    },
    fareInput: { fontWeight: '700', textAlign: 'right' },
    dToggle: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 14, padding: 14,
      marginTop: 14, gap: 12,
    },
    dToggleCheck: {
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    dToggleTitle: { fontSize: 14, fontWeight: '700' },
    paxCard: {
      borderWidth: 1, borderRadius: 16,
      padding: 14, marginBottom: 12,
    },
    paxCardHeader: {
      flexDirection: 'row', alignItems: 'center',
      marginBottom: 12, gap: 10,
    },
    paxBadge: {
      width: 26, height: 26, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    paxBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    paxCardTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
    paxFarePill: {
      paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 10,
    },
    paxFarePillText: { color: '#22c55e', fontSize: 12, fontWeight: '800' },
    paxFieldRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    paxFieldLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
    dAddPaxBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderStyle: 'dashed',
      borderRadius: 14, paddingVertical: 14, marginTop: 6, gap: 10,
    },
    dAddPaxIcon: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    dAddPaxText: { fontSize: 14, fontWeight: '700' },
    dispatchFooter: {
      flexDirection: 'row', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      borderTopWidth: 1,
    },
    dBtnCancel: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderRadius: 14, paddingVertical: 14,
    },
    dBtnCancelTxt: { fontSize: 14, fontWeight: '600' },
    dBtnDispatch: {
      flex: 1.6, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#22c55e', borderRadius: 14,
      paddingVertical: 14,
    },
    dBtnDispatchTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

    // ── Destination button (replaces Picker)
    destButton: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      gap: 8,
    },
    destButtonText: { fontSize: 13, fontWeight: '700' },
    destButtonFare: { fontSize: 11, fontWeight: '700', marginTop: 1 },
    destButtonPlaceholder: { flex: 1, fontSize: 13 },

    // ── Destination Picker Sheet ──
    destPickerOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    destPickerSheet: {
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingBottom: 20,
      ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 10 }, android: { elevation: 10 } }),
    },
    destPickerHandle: { alignItems: 'center', paddingVertical: 10 },
    destPickerHandleBar: { width: 40, height: 4, borderRadius: 2 },
    destPickerHeader: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingBottom: 12, gap: 10,
    },
    destPickerHeaderIcon: {
      width: 34, height: 34, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    destPickerTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
    destPickerItem: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 12,
      padding: 12, marginBottom: 8,
    },
    destPickerItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    destPickerDot: {
      width: 24, height: 24, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    destPickerDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    destPickerItemName: { fontSize: 14, fontWeight: '600' },
    destPickerFareBadge: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 10, marginLeft: 8,
    },
    destPickerFareText: { color: '#22c55e', fontSize: 13, fontWeight: '800' },

    // ── Route assign modal (reused)
    dispatchPreview: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 12,
      padding: 12, marginBottom: 16,
    },
    dispatchPreviewIcon: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 12,
    },
    dispatchPreviewReg: { fontSize: 16, fontWeight: '800' },
    dispatchPreviewMeta: { fontSize: 12, marginTop: 2 },
    
    // Voice command tip
    voiceTip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      gap: 8,
    },
    voiceTipText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}
