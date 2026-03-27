import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, Modal, TextInput, RefreshControl, Clipboard, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import {
  fetchRanksWithQueues, fetchLiveQueue, createQueueBooking,
  confirmQueuePayment, fetchUserQueueBookings, cancelQueueBooking,
} from '../api/queueBooking';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const BLUE = '#0d6efd';
const RED = '#dc3545';

export default function RiderQueueScreen({ navigation, route: navRoute }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const preSelectedRankId = navRoute?.params?.rankId || '';

  // Data
  const [ranks, setRanks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Route/booking helpers
  const [routeStops, setRouteStops] = useState([]);
  const [matchedRouteInfo, setMatchedRouteInfo] = useState(null); // { destinationStation, standardFare, routeName }
  const [queueDate, setQueueDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Selection
  const [selectedRankId, setSelectedRankId] = useState(preSelectedRankId);
  const [rankPickerVisible, setRankPickerVisible] = useState(false);

  // Booking modal
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState(null);
  const [seatCount, setSeatCount] = useState('1');
  const [passengers, setPassengers] = useState([{
    name: '', contactNumber: '', nextOfKinName: '', nextOfKinContact: '',
    destination: '', fare: '',
  }]);
  const [bookingStep, setBookingStep] = useState('details'); // details | ozow | confirmation
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [ozowPolling, setOzowPolling] = useState(false);
  const paymentPollRef = useRef(null);

  // Destination picker modal (dispatch-style)
  const [destPickerOpen, setDestPickerOpen] = useState(false);
  const [destPickerIdx, setDestPickerIdx] = useState(-1);

  // Inline bookings viewer on queue card
  const [expandedBookingsId, setExpandedBookingsId] = useState(null);

  // Edit booking modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editPassengers, setEditPassengers] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editDestPickerMode, setEditDestPickerMode] = useState(false); // true = picker is for edit modal

  // My bookings tab
  const [activeTab, setActiveTab] = useState('queue'); // queue | bookings

  const userId = user?.userId || user?.id;

  // ===== DATA LOADING =====
  const formatDate = (date) => date.toISOString().split('T')[0];

  const loadLiveQueue = useCallback(async (rankId, date = null) => {
    if (!rankId) {
      setQueue([]);
      return;
    }

    const dateStr = date || formatDate(queueDate);

    try {
      const data = await fetchLiveQueue(rankId, dateStr);
      setQueue(data || []);
    } catch (err) {
      console.warn('Live queue fetch error:', err?.message);
      setQueue([]);
    }
  }, [queueDate]);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ranksData, bookingsData] = await Promise.all([
        fetchRanksWithQueues().catch((err) => {
          console.error('Failed to fetch ranks:', err);
          return [];
        }),
        userId ? fetchUserQueueBookings(userId).catch((err) => {
          console.error('Failed to fetch bookings:', err);
          return [];
        }) : Promise.resolve([]),
      ]);
      const ranksList = ranksData || [];
      console.log('Loaded ranks:', ranksList);
      setRanks(ranksList);
      setMyBookings(bookingsData || []);

      const newRankId = selectedRankId || (ranksList.length > 0 ? ranksList[0].id : '');
      if (newRankId !== selectedRankId) {
        setSelectedRankId(newRankId);
      }

      if (newRankId) {
        await loadLiveQueue(newRankId, formatDate(queueDate));
      }
    } catch (err) {
      console.warn('Load error:', err?.message);
      setQueue([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, selectedRankId, loadLiveQueue, queueDate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedRankId) return;
    loadLiveQueue(selectedRankId, formatDate(queueDate));
  }, [selectedRankId, queueDate, loadLiveQueue]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLiveQueue(selectedRankId, formatDate(queueDate));
    loadData(true);
  };

  const selectedRank = ranks.find(r => r.id === selectedRankId);

  // ===== Computed destinations (dispatch-style) =====
  const destinations = useMemo(() => {
    const items = (routeStops || []).map(s => ({
      id: s.id,
      name: s.stopName,
      fare: Number(s.fareFromOrigin || 0),
      isLast: false,
    }));
    const entry = selectedQueueEntry;
    if (entry) {
      const dest = entry.destinationStation || entry.DestinationStation
        || matchedRouteInfo?.destinationStation
        || entry.routeDestination || entry.routeName
        || matchedRouteInfo?.routeName || 'Final Destination';
      const fare = Number(entry.standardFare || matchedRouteInfo?.standardFare || 0);
      const seen = new Set(items.map(i => i.name));
      if (!seen.has(dest)) {
        items.push({ id: 'destination', name: dest, fare, isLast: true });
      } else {
        const lastItem = items.find(i => i.name === dest) || items[items.length - 1];
        if (lastItem) lastItem.isLast = true;
      }
    }
    return items;
  }, [routeStops, selectedQueueEntry, matchedRouteInfo]);

  const getFareForDestination = useCallback((destName) => {
    const d = destinations.find(d => d.name === destName);
    return d ? d.fare : Number(selectedQueueEntry?.standardFare || 0);
  }, [destinations, selectedQueueEntry]);

  const passengerSummary = useMemo(() => {
    const valid = passengers.filter(p => p.name.trim());
    const totalFare = valid.reduce((sum, p) => sum + (parseFloat(p.fare) || 0), 0);
    return { count: valid.length, totalFare };
  }, [passengers]);

  // Existing bookings for the selected queue entry
  const existingBookings = useMemo(() => {
    if (!selectedQueueEntry) return [];
    return myBookings.filter(
      b => b.queueEntryId === selectedQueueEntry.id && b.status !== 'Cancelled'
    );
  }, [myBookings, selectedQueueEntry]);

  // ===== BOOKING HANDLERS =====
  function openBookModal(entry) {
    setSelectedQueueEntry(entry);
    setSeatCount('1');
    setMatchedRouteInfo(null);
    setRouteStops([]);

    const initialDest = entry.destinationStation || '';
    const initialFare = String(Number(entry.standardFare || 0).toFixed(2));

    setPassengers([{
      name: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      contactNumber: user?.phoneNumber || '',
      nextOfKinName: '',
      nextOfKinContact: '',
      destination: initialDest,
      fare: initialFare,
    }]);

    // load route stops from queue's associated route
    async function loadStops() {
      let stops = [];

      // 1. Check if stops are inline on the queue entry (from backend routeStops field)
      const inlineStops = entry.routeStops ?? entry.RouteStops ?? entry.route?.stops ?? entry.Route?.Stops;
      if (Array.isArray(inlineStops) && inlineStops.length > 0) {
        stops = inlineStops;
      }

      // 2. Primary: fetch routes list for rank (public, [AllowAnonymous] endpoint)
      if (stops.length === 0 && selectedRank) {
        try {
          const resp = await client.get(`/Routes?taxiRankId=${selectedRank.id}`);
          const routes = resp.data || [];
          const rId = entry.routeId ?? entry.RouteId;
          const rName = (entry.routeName || entry.RouteName || '').toLowerCase();
          const rDep = (entry.departureStation || entry.DepartureStation || '').toLowerCase();
          const rDest = (entry.destinationStation || entry.DestinationStation || '').toLowerCase();
          const vehId = (entry.vehicleId ?? entry.VehicleId ?? '').toLowerCase();

          // Try match by routeId or route name
          let match = routes.find(r =>
            r.id === rId ||
            (rName && (r.routeName || '').toLowerCase() === rName &&
             (r.departureStation || '').toLowerCase() === rDep &&
             (r.destinationStation || '').toLowerCase() === rDest)
          );

          // Fallback: match by vehicle — check if this queue entry's vehicle belongs to a route
          if (!match && vehId) {
            match = routes.find(r =>
              (r.vehicles || []).some(v => (v.id || '').toLowerCase() === vehId)
            );
          }

          // Fallback: if only one route exists for this rank, use it
          if (!match && routes.length === 1) {
            match = routes[0];
          }

          if (match) {
            stops = match.stops ?? match.Stops ?? [];
            setMatchedRouteInfo({
              destinationStation: match.destinationStation || match.DestinationStation || '',
              standardFare: Number(match.standardFare || match.StandardFare || 0),
              routeName: match.routeName || match.RouteName || '',
            });
          }
        } catch (e) {
          console.warn('[RiderQueue] Routes list fetch failed:', e?.message);
        }
      }

      // 3. Fallback: fetch single route by ID
      if (stops.length === 0 && (entry.routeId || entry.RouteId)) {
        try {
          const rawStops = await getRouteStops(entry.routeId ?? entry.RouteId);
          if (Array.isArray(rawStops) && rawStops.length > 0) stops = rawStops;
        } catch (e) {
          console.warn('[RiderQueue] getRouteStops failed:', e?.message);
        }
      }

      // Normalize and sort
      if (!Array.isArray(stops)) stops = [];
      const normalized = stops.map((s, idx) => ({
        id: s.id ?? s.Id ?? s.stopName ?? s.StopName ?? s.name ?? s.Name ?? `stop-${idx}`,
        stopName: s.stopName ?? s.StopName ?? s.name ?? s.Name ?? '',
        stopOrder: s.stopOrder ?? s.StopOrder ?? s.order ?? s.Order ?? idx + 1,
        fareFromOrigin: s.fareFromOrigin ?? s.FareFromOrigin ?? s.fare ?? 0,
        estimatedMinutesFromDeparture: s.estimatedMinutesFromDeparture ?? s.EstimatedMinutesFromDeparture ?? s.mins ?? 0,
      })).sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));

      setRouteStops(normalized);

      // Update initial passenger destination/fare if still empty (async load completed after initial state)
      if (normalized.length > 0) {
        setPassengers(prev => {
          if (prev.length > 0 && !prev[0].destination) {
            const first = normalized[0];
            const copy = [...prev];
            copy[0] = { ...copy[0], destination: first.stopName, fare: String(Number(first.fareFromOrigin || 0).toFixed(2)) };
            return copy;
          }
          return prev;
        });
      }
    }

    loadStops();
    setDestPickerOpen(false);
    setDestPickerIdx(-1);
    setBookingStep('details');
    setBookingResult(null);
    setBookModalVisible(true);
  }

  function updatePassenger(index, field, value) {
    setPassengers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function selectDestinationForPassenger(paxIdx, destName) {
    const fare = getFareForDestination(destName);
    setPassengers(prev => {
      const copy = [...prev];
      copy[paxIdx] = {
        ...copy[paxIdx],
        destination: destName,
        fare: String(fare.toFixed(2)),
      };
      return copy;
    });
  }

  function addLoggedInAsPassenger() {
    if (!user) return;
    const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const existing = passengers.some(p => p.name === fullName);
    if (existing) return;

    const dest0 = destinations[0]?.name || selectedQueueEntry?.destinationStation || '';
    const fare0 = String((destinations[0]?.fare || Number(selectedQueueEntry?.standardFare || 0)).toFixed(2));

    setPassengers(prev => [...prev, {
      name: fullName,
      contactNumber: user.phoneNumber || '',
      nextOfKinName: '',
      nextOfKinContact: '',
      destination: dest0,
      fare: fare0,
    }]);
  }

  const totalFare = passengers.reduce((sum, p) => sum + (parseFloat(p.fare) || 0), 0);

  function addPassengerRow() {
    const max = selectedQueueEntry?.seatsAvailable || 4;
    if (passengers.length >= max) {
      Alert.alert('Maximum Reached', `Only ${max} seat(s) available`);
      return;
    }
    const dest0 = destinations[0]?.name || selectedQueueEntry?.destinationStation || '';
    const fare0 = String((destinations[0]?.fare || Number(selectedQueueEntry?.standardFare || 0)).toFixed(2));
    setPassengers(prev => [...prev, {
      name: '', contactNumber: '', nextOfKinName: '', nextOfKinContact: '',
      destination: dest0, fare: fare0,
    }]);
    setSeatCount(String(passengers.length + 1));
  }

  function removePassengerRow(index) {
    if (passengers.length <= 1) return;
    setPassengers(prev => prev.filter((_, i) => i !== index));
    setSeatCount(String(passengers.length - 1));
  }

  async function handleBookSeats() {
    const validPassengers = passengers.filter(p => p.name.trim());
    if (validPassengers.length === 0) {
      Alert.alert('Required', 'Please enter at least one passenger name');
      return;
    }

    // Ensure all passengers have a destination selected
    const missingDest = validPassengers.some(p => !p.destination?.trim());
    if (missingDest) {
      Alert.alert('Required', 'Please select a destination for each passenger');
      return;
    }

    setSubmitting(true);
    try {
      const total = validPassengers.reduce((sum, p) => sum + (parseFloat(p.fare) || 0), 0);
      const result = await createQueueBooking({
        userId,
        queueEntryId: selectedQueueEntry.id,
        seatsBooked: validPassengers.length,
        paymentMethod: 'Ozow',
        totalFare: total,
        passengers: validPassengers.map(p => ({
          name: p.name.trim(),
          contactNumber: p.contactNumber.trim(),
          email: null,
          destination: p.destination?.trim() || selectedQueueEntry?.destinationStation || null,
          fare: parseFloat(p.fare) || 0,
          nextOfKinName: p.nextOfKinName?.trim() || null,
          nextOfKinContact: p.nextOfKinContact?.trim() || null,
        })),
      });
      setBookingResult({ ...result, totalFare: total, seatsBooked: validPassengers.length });
      setBookingStep('ozow');
      setOzowPolling(true);

      // Simulate Ozow payment after a brief delay (mimics redirect + bank auth)
      setTimeout(async () => {
        try {
          const simResult = await simulateOzowPayment(result.id);
          setOzowPolling(false);
          setBookingResult(prev => ({ ...prev, ...simResult, totalFare: total }));
          setBookingStep('confirmation');
          loadData(true);
          if (selectedRankId) {
            fetchLiveQueue(selectedRankId)
              .then(data => setQueue(data || []))
              .catch(() => {});
          }
        } catch (simErr) {
          setOzowPolling(false);
          Alert.alert('Payment Error', simErr?.response?.data?.message || 'Payment simulation failed');
        }
      }, 3000);

    } catch (err) {
      Alert.alert('Booking Failed', err?.response?.data?.message || err?.message || 'Failed to book seats');
    } finally {
      setSubmitting(false);
    }
  }

  function startPaymentPolling(bookingId) {
    // Clear any existing poll
    if (paymentPollRef.current) clearInterval(paymentPollRef.current);
    setOzowPolling(true);

    paymentPollRef.current = setInterval(async () => {
      try {
        const status = await getPaymentStatus(bookingId);
        if (status.isPaid) {
          clearInterval(paymentPollRef.current);
          paymentPollRef.current = null;
          setOzowPolling(false);
          setBookingStep('confirmation');
          loadData(true);
          if (selectedRankId) {
            fetchLiveQueue(selectedRankId)
              .then(data => setQueue(data || []))
              .catch(() => {});
          }
        } else if (status.paymentStatus === 'Failed' || status.paymentStatus === 'Cancelled') {
          clearInterval(paymentPollRef.current);
          paymentPollRef.current = null;
          setOzowPolling(false);
          Alert.alert('Payment ' + status.paymentStatus, 'Your payment was not completed. You can try again.');
        }
      } catch {
        // Silently continue polling
      }
    }, 5000); // Poll every 5 seconds

    // Auto-stop polling after 10 minutes
    setTimeout(() => {
      if (paymentPollRef.current) {
        clearInterval(paymentPollRef.current);
        paymentPollRef.current = null;
        setOzowPolling(false);
      }
    }, 600000);
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (paymentPollRef.current) {
        clearInterval(paymentPollRef.current);
      }
    };
  }, []);

  async function handleConfirmEft() {
    if (!bookingResult?.id) return;
    setSubmitting(true);
    try {
      await confirmQueuePayment(bookingResult.id, `EFT-${Date.now()}`);
      setBookingStep('confirmation');
      loadData(true);
      if (selectedRankId) {
        fetchLiveQueue(selectedRankId)
          .then(data => setQueue(data || []))
          .catch(() => {});
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelBooking(booking) {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive', onPress: async () => {
          try {
            await cancelQueueBooking(booking.id, 'Cancelled by rider');
            loadData(true);
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Cancel failed');
          }
        },
      },
    ]);
  }

  function canEditBooking(booking) {
    const cutoff = booking.updateCutoffMinutes || booking.checkInWindowMinutes || 60;
    const etd = booking.estimatedDepartureTime;
    if (!etd) return true; // no ETD means no restriction
    const now = new Date();
    const departure = new Date(etd);
    const cutoffTime = new Date(departure.getTime() - cutoff * 60000);
    return now < cutoffTime;
  }

  function getEditCutoffMessage(booking) {
    const cutoff = booking.updateCutoffMinutes || booking.checkInWindowMinutes || 60;
    const etd = booking.estimatedDepartureTime;
    if (!etd) return '';
    const now = new Date();
    const departure = new Date(etd);
    const minsLeft = Math.max(0, Math.round((departure - now) / 60000));
    return `Updates locked ${cutoff} min before departure. Departure in ${minsLeft} min.`;
  }

  function openEditModal(booking) {
    if (!canEditBooking(booking)) {
      Alert.alert('Update Locked', getEditCutoffMessage(booking));
      return;
    }
    setEditingBooking(booking);
    setEditPassengers(
      (booking.passengers || []).map(p => ({
        name: p.name || '',
        contactNumber: p.contactNumber || '',
        email: p.email || '',
        destination: p.destination || '',
        fare: String(Number(p.fare || 0).toFixed(2)),
        nextOfKinName: p.nextOfKinName || '',
        nextOfKinContact: p.nextOfKinContact || '',
      }))
    );

    // Load route stops for the queue entry so the destination picker works
    const queueEntry = queue.find(q => q.id === booking.queueEntryId);
    console.log('[EditModal] booking.queueEntryId:', booking.queueEntryId, 'queueEntry found:', !!queueEntry, 'queue length:', queue.length);

    // Build a synthetic selectedQueueEntry from the booking if the live queue doesn't have it
    const entryForPicker = queueEntry || {
      id: booking.queueEntryId,
      routeId: booking.routeId,
      routeName: booking.routeName,
      departureStation: booking.departureStation,
      destinationStation: booking.destinationStation,
      standardFare: booking.totalFare && booking.seatsBooked ? (booking.totalFare / booking.seatsBooked) : 0,
    };
    setSelectedQueueEntry(entryForPicker);

    // Try inline stops from queue entry first (only available if found in live queue)
    const inlineStops = queueEntry?.routeStops ?? queueEntry?.RouteStops ?? queueEntry?.route?.stops ?? queueEntry?.Route?.Stops;
    console.log('[EditModal] inlineStops:', Array.isArray(inlineStops) ? inlineStops.length : 'none');

    if (Array.isArray(inlineStops) && inlineStops.length > 0) {
      // Synchronous path — set before modal renders
      const normalized = inlineStops.map((s, idx) => ({
        id: s.id ?? s.Id ?? s.stopName ?? s.StopName ?? s.name ?? s.Name ?? `stop-${idx}`,
        stopName: s.stopName ?? s.StopName ?? s.name ?? s.Name ?? '',
        stopOrder: s.stopOrder ?? s.StopOrder ?? s.order ?? s.Order ?? idx + 1,
        fareFromOrigin: s.fareFromOrigin ?? s.FareFromOrigin ?? s.fare ?? 0,
        estimatedMinutesFromDeparture: s.estimatedMinutesFromDeparture ?? s.EstimatedMinutesFromDeparture ?? s.mins ?? 0,
      })).sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));
      console.log('[EditModal] Setting routeStops from inline:', normalized.length, 'stops');
      setRouteStops(normalized);
    } else {
      // Async fallback: try routes list, then single route API
      const routeId = queueEntry?.routeId ?? queueEntry?.RouteId ?? booking.routeId;
      const rankId = selectedRank?.id || booking.taxiRankId;
      console.log('[EditModal] Async loading. routeId:', routeId, 'rankId:', rankId);

      (async () => {
        let stops = [];

        // Try routes list for rank
        if (rankId) {
          try {
            const resp = await client.get(`/Routes?taxiRankId=${rankId}`);
            const routes = resp.data || [];
            const rId = routeId;
            const rName = (entryForPicker.routeName || '').toLowerCase();
            const rDep = (entryForPicker.departureStation || '').toLowerCase();
            const rDest = (entryForPicker.destinationStation || '').toLowerCase();

            let match = routes.find(r =>
              r.id === rId ||
              (rName && (r.routeName || '').toLowerCase() === rName &&
               (r.departureStation || '').toLowerCase() === rDep &&
               (r.destinationStation || '').toLowerCase() === rDest)
            );
            if (!match && routes.length === 1) match = routes[0];

            if (match) {
              stops = match.stops ?? match.Stops ?? [];
              setMatchedRouteInfo({
                destinationStation: match.destinationStation || match.DestinationStation || '',
                standardFare: Number(match.standardFare || match.StandardFare || 0),
                routeName: match.routeName || match.RouteName || '',
              });
            }
            console.log('[EditModal] Routes API: found', routes.length, 'routes, matched:', !!match, 'stops:', stops.length);
          } catch (e) {
            console.warn('[EditModal] Routes list fetch failed:', e?.message);
          }
        }

        // Fallback: single route by ID
        if (stops.length === 0 && routeId) {
          try {
            const rawStops = await getRouteStops(routeId);
            console.log('[EditModal] getRouteStops returned:', Array.isArray(rawStops) ? rawStops.length : 'not array');
            if (Array.isArray(rawStops) && rawStops.length > 0) stops = rawStops;
          } catch (e) {
            console.warn('[EditModal] getRouteStops failed:', e?.message);
          }
        }

        if (!Array.isArray(stops)) stops = [];
        const normalized = stops.map((s, idx) => ({
          id: s.id ?? s.Id ?? s.stopName ?? s.StopName ?? s.name ?? s.Name ?? `stop-${idx}`,
          stopName: s.stopName ?? s.StopName ?? s.name ?? s.Name ?? '',
          stopOrder: s.stopOrder ?? s.StopOrder ?? s.order ?? s.Order ?? idx + 1,
          fareFromOrigin: s.fareFromOrigin ?? s.FareFromOrigin ?? s.fare ?? 0,
          estimatedMinutesFromDeparture: s.estimatedMinutesFromDeparture ?? s.EstimatedMinutesFromDeparture ?? s.mins ?? 0,
        })).sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));

        console.log('[EditModal] Async setting routeStops:', normalized.length, 'stops');
        setRouteStops(normalized);
      })();
    }

    setEditModalVisible(true);
  }

  function openEditDestPicker(paxIdx) {
    setEditDestPickerMode(true);
    setDestPickerIdx(paxIdx);
    setDestPickerOpen(true);
  }

  function selectEditDestination(paxIdx, destName) {
    const fare = getFareForDestination(destName);
    setEditPassengers(prev => {
      const copy = [...prev];
      copy[paxIdx] = {
        ...copy[paxIdx],
        destination: destName,
        fare: String(fare.toFixed(2)),
      };
      return copy;
    });
  }

  function updateEditPassenger(index, field, value) {
    setEditPassengers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addEditPassengerRow() {
    const max = selectedQueueEntry?.vehicleCapacity || selectedQueueEntry?.seatsAvailable || 15;
    if (editPassengers.length >= max) {
      Alert.alert('Maximum Reached', `Vehicle capacity is ${max} seat(s)`);
      return;
    }
    setEditPassengers(prev => [...prev, {
      name: '', contactNumber: '', email: '', destination: '', fare: '0.00',
      nextOfKinName: '', nextOfKinContact: '',
    }]);
  }

  function removeEditPassengerRow(index) {
    if (editPassengers.length <= 1) return;
    setEditPassengers(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSaveEdit() {
    const valid = editPassengers.filter(p => p.name.trim());
    if (valid.length === 0) {
      Alert.alert('Required', 'At least one passenger is required');
      return;
    }
    setEditSubmitting(true);
    try {
      await updateQueueBooking(editingBooking.id, {
        passengers: valid.map(p => ({
          name: p.name.trim(),
          contactNumber: p.contactNumber.trim(),
          email: p.email?.trim() || null,
          destination: p.destination?.trim() || null,
          fare: parseFloat(p.fare) || 0,
          nextOfKinName: p.nextOfKinName?.trim() || null,
          nextOfKinContact: p.nextOfKinContact?.trim() || null,
        })),
      });
      setEditModalVisible(false);
      setEditingBooking(null);
      loadData(true);
      if (selectedRankId) {
        loadLiveQueue(selectedRankId, formatDate(queueDate));
      }
      Alert.alert('Updated', 'Booking updated successfully');
    } catch (err) {
      Alert.alert('Update Failed', err?.response?.data?.message || err?.message || 'Failed to update booking');
    } finally {
      setEditSubmitting(false);
    }
  }

  function copyToClipboard(text) {
    if (Clipboard?.setString) {
      Clipboard.setString(text);
      Alert.alert('Copied', 'Copied to clipboard');
    }
  }

  // ===== RENDER =====
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading live queues...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ===== HEADER ===== */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Live Queue</Text>
          <Text style={styles.headerSub}>View queues & book seats</Text>
        </View>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'bookings' && styles.tabBtnActive]}
          onPress={() => setActiveTab(activeTab === 'queue' ? 'bookings' : 'queue')}
        >
          <Ionicons name={activeTab === 'queue' ? 'ticket-outline' : 'list-outline'} size={18} color={activeTab === 'bookings' ? GOLD : '#fff'} />
          <Text style={[styles.tabBtnText, activeTab === 'bookings' && { color: GOLD }]}>
            {activeTab === 'queue' ? 'My Bookings' : 'Queue'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ===== RANK & DATE SELECTOR ===== */}
      {activeTab === 'queue' && (
        <>
          <TouchableOpacity
            style={[styles.rankSelector, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setRankPickerVisible(true)}
          >
            <Ionicons name="business-outline" size={18} color={GOLD} />
            <Text style={[styles.rankSelectorText, { color: c.text }]} numberOfLines={1}>
              {selectedRank?.name || 'Select Taxi Rank'}
            </Text>
            <View style={styles.rankSelectorBadge}>
              <Text style={styles.rankSelectorBadgeText}>{queue.length}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </TouchableOpacity>

          <View style={[styles.dateRow, { backgroundColor: c.surface, borderColor: c.border }]}> 
            <TouchableOpacity onPress={() => { const d = new Date(queueDate); d.setDate(d.getDate() - 1); setQueueDate(d); }} style={styles.dateControl}>
              <Ionicons name="chevron-back" size={20} color={c.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateDisplay}>
              <Ionicons name="calendar-outline" size={16} color={c.text} style={{marginRight: 6}} />
              <Text style={{ color: c.text, fontWeight: '700' }}>{formatDate(queueDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { const d = new Date(queueDate); d.setDate(d.getDate() + 1); setQueueDate(d); }} style={styles.dateControl}>
              <Ionicons name="chevron-forward" size={20} color={c.text} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={queueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
                onChange={(event, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) setQueueDate(selected);
                }}
              />
            )}
          </View>
        </>
      )}

      {/* ===== BODY ===== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
      >
        {activeTab === 'queue' ? renderQueue() : renderMyBookings()}
      </ScrollView>

      {/* ===== RANK PICKER MODAL ===== */}
      <Modal visible={rankPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: c.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: c.text }]}>Select Taxi Rank</Text>
              <TouchableOpacity onPress={() => setRankPickerVisible(false)}>
                <Ionicons name="close-circle" size={26} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {ranks.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No ranks with active queues</Text>
              ) : ranks.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pickerItem, r.id === selectedRankId && { backgroundColor: GOLD_LIGHT, borderColor: GOLD }]}
                  onPress={() => { setSelectedRankId(r.id); setRankPickerVisible(false); }}
                >
                  <Ionicons name="business" size={18} color={r.id === selectedRankId ? GOLD : c.textMuted} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.pickerItemTitle, { color: c.text }]}>{r.name}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>{[r.city, r.province].filter(Boolean).join(', ')}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: GOLD_LIGHT }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: GOLD }}>{r.activeVehicles} taxis</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== BOOKING MODAL ===== */}
      <Modal visible={bookModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.bookCard, { backgroundColor: c.surface }]}>
            {bookingStep === 'details' && renderBookingDetails()}
            {bookingStep === 'ozow' && renderOzowPayment()}
            {bookingStep === 'confirmation' && renderConfirmation()}
          </View>
        </View>
      </Modal>

      {/* ===== EDIT BOOKING MODAL ===== */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.bookCard, { backgroundColor: c.surface }]}>
            {/* Header */}
            <View style={styles.dispatchHeader}>
              <View style={styles.dispatchHeaderLeft}>
                <View style={[styles.dispatchHeaderIcon, { backgroundColor: BLUE + '15' }]}>
                  <Ionicons name="create" size={16} color={BLUE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dispatchHeaderTitle}>Edit Booking</Text>
                  <Text style={[styles.dispatchHeaderSub, { color: c.textMuted }]}>
                    {editingBooking?.vehicleRegistration} · Ref: {editingBooking?.paymentReference || '—'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={28} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Edit totals bar */}
            <View style={[styles.totalBar, { backgroundColor: BLUE + '08' }]}>
              <View style={styles.totalBarItem}>
                <Ionicons name="people" size={16} color={BLUE} />
                <Text style={[styles.totalBarLabel, { color: c.textMuted }]}>Passengers</Text>
                <Text style={[styles.totalBarValue, { color: c.text }]}>{editPassengers.filter(p => p.name.trim()).length}</Text>
              </View>
              <View style={[styles.totalBarDivider, { backgroundColor: c.border }]} />
              <View style={styles.totalBarItem}>
                <Ionicons name="cash" size={16} color={GREEN} />
                <Text style={[styles.totalBarLabel, { color: c.textMuted }]}>Total Fare</Text>
                <Text style={[styles.totalBarValue, { color: GREEN }]}>
                  R {editPassengers.reduce((sum, p) => sum + (parseFloat(p.fare) || 0), 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Body */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {editPassengers.map((pax, idx) => (
                <View key={idx} style={[styles.dPaxCard, { backgroundColor: c.background, borderColor: c.border }]}>
                  <View style={styles.dPaxCardHeader}>
                    <View style={[styles.dPaxBadge, { backgroundColor: BLUE }]}>
                      <Text style={styles.dPaxBadgeText}>{idx + 1}</Text>
                    </View>
                    <Text style={[styles.dPaxCardTitle, { color: c.text }]}>
                      {pax.name.trim() || `Passenger ${idx + 1}`}
                    </Text>
                    {parseFloat(pax.fare) > 0 && (
                      <View style={[styles.dPaxFarePill, { backgroundColor: GREEN + '15' }]}>
                        <Text style={styles.dPaxFarePillText}>R {parseFloat(pax.fare).toFixed(2)}</Text>
                      </View>
                    )}
                    {editPassengers.length > 1 && (
                      <TouchableOpacity onPress={() => removeEditPassengerRow(idx)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={RED} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.dPaxFieldRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Full Name *</Text>
                      <TextInput
                        style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                        value={pax.name}
                        onChangeText={t => updateEditPassenger(idx, 'name', t)}
                        placeholder="John Doe"
                        placeholderTextColor={c.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Phone</Text>
                      <TextInput
                        style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                        value={pax.contactNumber}
                        onChangeText={t => updateEditPassenger(idx, 'contactNumber', t)}
                        placeholder="072 000 0000"
                        placeholderTextColor={c.textMuted}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  {/* Next of Kin */}
                  <View style={styles.dPaxFieldRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Next of Kin</Text>
                      <TextInput
                        style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                        value={pax.nextOfKinName}
                        onChangeText={t => updateEditPassenger(idx, 'nextOfKinName', t)}
                        placeholder="Name"
                        placeholderTextColor={c.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Kin Phone</Text>
                      <TextInput
                        style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                        value={pax.nextOfKinContact}
                        onChangeText={t => updateEditPassenger(idx, 'nextOfKinContact', t)}
                        placeholder="072 000 0000"
                        placeholderTextColor={c.textMuted}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.dPaxFieldRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Destination</Text>
                      <TouchableOpacity
                        style={[styles.destButton, {
                          borderColor: pax.destination ? BLUE + '50' : c.border,
                          backgroundColor: pax.destination ? BLUE + '06' : c.surface,
                        }]}
                        onPress={() => openEditDestPicker(idx)}
                        activeOpacity={0.7}
                      >
                        {pax.destination ? (
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.destButtonText, { color: c.text }]} numberOfLines={1}>{pax.destination}</Text>
                            <Text style={[styles.destButtonFare, { color: GREEN }]}>R {(getFareForDestination(pax.destination) || parseFloat(pax.fare) || 0).toFixed(2)}</Text>
                          </View>
                        ) : (
                          <Text style={[styles.destButtonPlaceholder, { color: c.textMuted }]}>Select stop…</Text>
                        )}
                        <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Fare (R)</Text>
                      <TextInput
                        style={[styles.dInput, styles.fareInput, {
                          color: parseFloat(pax.fare) > 0 ? GREEN : c.text,
                          borderColor: parseFloat(pax.fare) > 0 ? GREEN + '40' : c.border,
                          backgroundColor: parseFloat(pax.fare) > 0 ? GREEN + '08' : c.surface,
                        }]}
                        value={pax.fare}
                        onChangeText={t => updateEditPassenger(idx, 'fare', t)}
                        placeholder="0.00"
                        placeholderTextColor={c.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              ))}

              {editPassengers.length < (selectedQueueEntry?.vehicleCapacity || selectedQueueEntry?.seatsAvailable || 15) && (
                <TouchableOpacity
                  style={[styles.dAddPaxBtn, { borderColor: BLUE + '40' }]}
                  onPress={addEditPassengerRow}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dAddPaxIcon, { backgroundColor: BLUE + '12' }]}>
                    <Ionicons name="person-add" size={16} color={BLUE} />
                  </View>
                  <Text style={[styles.dAddPaxText, { color: BLUE }]}>Add Passenger</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={[styles.dispatchFooter, { borderTopColor: c.border, backgroundColor: c.surface }]}>
              <TouchableOpacity style={[styles.dBtnCancel, { borderColor: c.border }]} onPress={() => setEditModalVisible(false)}>
                <Text style={[styles.dBtnCancelTxt, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dBtnBook, { backgroundColor: BLUE }, editSubmitting && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={editSubmitting}
                activeOpacity={0.8}
              >
                {editSubmitting ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={[styles.dBtnBookTxt, { color: '#fff' }]}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== DESTINATION PICKER MODAL ===== */}
      <Modal visible={destPickerOpen} transparent animationType="slide" onRequestClose={() => { setDestPickerOpen(false); setEditDestPickerMode(false); }}>
        <View style={styles.destPickerOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setDestPickerOpen(false); setEditDestPickerMode(false); }} />
          <View style={[styles.destPickerSheet, { backgroundColor: c.surface }]}>
            <View style={styles.destPickerHandle}><View style={[styles.destPickerHandleBar, { backgroundColor: c.border }]} /></View>
            <View style={styles.destPickerHeader}>
              <View style={[styles.destPickerHeaderIcon, { backgroundColor: '#3b82f615' }]}>
                <Ionicons name="location" size={18} color="#3b82f6" />
              </View>
              <Text style={[styles.destPickerTitle, { color: c.text }]}>Select Destination</Text>
              <TouchableOpacity onPress={() => { setDestPickerOpen(false); setEditDestPickerMode(false); }} hitSlop={12}>
                <Ionicons name="close-circle" size={26} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {destinations.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Ionicons name="alert-circle-outline" size={32} color={c.textMuted} />
                  <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 8, textAlign: 'center' }}>No route stops available. Please close and try again.</Text>
                </View>
              )}
              {destinations.map((dest, i) => {
                const activePax = editDestPickerMode ? editPassengers : passengers;
                const isSel = destPickerIdx >= 0 && activePax[destPickerIdx]?.destination === dest.name;
                return (
                  <TouchableOpacity
                    key={dest.id || dest.name}
                    style={[styles.destPickerItem, { borderColor: isSel ? GOLD : c.border, backgroundColor: isSel ? GOLD_LIGHT : c.background }]}
                    onPress={() => {
                      if (editDestPickerMode) {
                        if (destPickerIdx >= 0 && destPickerIdx < editPassengers.length) {
                          selectEditDestination(destPickerIdx, dest.name);
                        }
                      } else {
                        if (destPickerIdx >= 0 && destPickerIdx < passengers.length) {
                          selectDestinationForPassenger(destPickerIdx, dest.name);
                        }
                      }
                      setDestPickerOpen(false);
                      setEditDestPickerMode(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.destPickerItemLeft}>
                      <View style={[styles.destPickerDot, { backgroundColor: dest.isLast ? RED : isSel ? GOLD : BLUE }]}>
                        {dest.isLast ? (
                          <Ionicons name="flag" size={10} color="#fff" />
                        ) : (
                          <Text style={styles.destPickerDotText}>{i + 1}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.destPickerItemName, { color: c.text }]} numberOfLines={1}>{dest.name}</Text>
                        {dest.isLast && <Text style={{ fontSize: 10, color: c.textMuted }}>Final destination</Text>}
                      </View>
                    </View>
                    <View style={[styles.destPickerFareBadge, { backgroundColor: GREEN + '15' }]}>
                      <Text style={styles.destPickerFareText}>R {(dest.fare || 0).toFixed(2)}</Text>
                    </View>
                    {isSel && <Ionicons name="checkmark-circle" size={20} color={GOLD} style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  // ===== QUEUE LIST =====
  function renderQueue() {
    if (!selectedRankId) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="business-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>Select a taxi rank</Text>
          <Text style={[styles.emptySub, { color: c.textMuted }]}>Choose a rank to see live queues</Text>
        </View>
      );
    }

    if (queue.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="car-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No vehicles in queue</Text>
          <Text style={[styles.emptySub, { color: c.textMuted }]}>Check back later or try another rank</Text>
        </View>
      );
    }

    return queue.map((entry, idx) => {
      const available = entry.seatsAvailable || 0;
      const isFull = available <= 0;
      const entryBookings = myBookings.filter(
        b => b.queueEntryId === entry.id && b.status !== 'Cancelled'
      );
      const hasBookings = entryBookings.length > 0;
      const isExpanded = expandedBookingsId === entry.id;
      return (
        <View key={entry.id} style={[styles.queueCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {/* Position badge */}
          <View style={styles.queueCardTop}>
            <View style={[styles.posBadge, { backgroundColor: idx === 0 ? GOLD : c.background }]}>
              <Text style={[styles.posBadgeText, { color: idx === 0 ? '#000' : c.text }]}>#{entry.queuePosition}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.queueReg, { color: c.text }]}>{entry.vehicleRegistration || 'Unknown'}</Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>
                {[entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ')} · {entry.driverName || 'No driver'}
              </Text>
            </View>
            <View style={[styles.seatsBadge, { backgroundColor: isFull ? RED + '15' : GREEN + '15' }]}>
              <Ionicons name="people" size={13} color={isFull ? RED : GREEN} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: isFull ? RED : GREEN, marginLeft: 4 }}>
                {available} seat{available !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Route info */}
          {entry.routeName && (
            <View style={styles.queueRoute}>
              <Ionicons name="navigate-outline" size={13} color={BLUE} />
              <Text style={{ fontSize: 12, color: BLUE, fontWeight: '600', marginLeft: 4 }}>{entry.routeName}</Text>
              {entry.standardFare > 0 && (
                <Text style={{ fontSize: 12, color: GREEN, fontWeight: '700', marginLeft: 'auto' }}>R{Number(entry.standardFare).toFixed(2)}</Text>
              )}
            </View>
          )}

          {/* Meta row */}
          <View style={styles.queueMeta}>
            {entry.estimatedDepartureTime && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={11} color="#f59e0b" />
                <Text style={{ fontSize: 11, color: '#f59e0b', marginLeft: 3 }}>
                  ETD {new Date(entry.estimatedDepartureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Ionicons name="car-outline" size={11} color={c.textMuted} />
              <Text style={{ fontSize: 11, color: c.textMuted, marginLeft: 3 }}>{entry.vehicleCapacity} capacity</Text>
            </View>
            {hasBookings && (
              <TouchableOpacity
                style={styles.metaChip}
                onPress={() => setExpandedBookingsId(isExpanded ? null : entry.id)}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <Ionicons name={isExpanded ? 'eye-off-outline' : 'eye-outline'} size={13} color={GOLD} />
                <Text style={{ fontSize: 11, color: GOLD, fontWeight: '600', marginLeft: 3 }}>
                  {entryBookings.length} booking{entryBookings.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Inline existing bookings */}
          {hasBookings && isExpanded && (
            <View style={{ marginTop: 10, padding: 10, backgroundColor: GREEN + '08', borderRadius: 8, borderWidth: 1, borderColor: GREEN + '25' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="receipt-outline" size={14} color={GREEN} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: GREEN, marginLeft: 6 }}>My Bookings</Text>
              </View>
              {entryBookings.map((eb) => {
                const sc = STATUS_COLORS[eb.status] || STATUS_COLORS.Pending;
                return (
                  <View key={eb.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: GREEN + '18' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: sc.text }}>{eb.status}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {(eb.status === 'Pending' || eb.status === 'Confirmed') && (
                          <TouchableOpacity
                            onPress={() => openEditModal(eb)}
                            hitSlop={8}
                            activeOpacity={0.7}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: canEditBooking(eb) ? BLUE + '12' : c.border + '40' }}
                          >
                            <Ionicons name="create-outline" size={12} color={canEditBooking(eb) ? BLUE : c.textMuted} />
                            <Text style={{ fontSize: 10, fontWeight: '600', color: canEditBooking(eb) ? BLUE : c.textMuted, marginLeft: 3 }}>Edit</Text>
                          </TouchableOpacity>
                        )}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: GREEN }}>R{Number(eb.totalFare).toFixed(2)}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                      <Ionicons name="people-outline" size={11} color={c.textMuted} />
                      <Text style={{ fontSize: 11, color: c.textMuted, marginLeft: 3 }}>{eb.seatsBooked} seat(s)</Text>
                      {eb.paymentReference ? (
                        <Text style={{ fontSize: 11, color: c.textMuted, marginLeft: 6 }}>Ref: {eb.paymentReference}</Text>
                      ) : null}
                    </View>
                    {eb.passengers?.length > 0 && (
                      <View style={{ marginTop: 3 }}>
                        {eb.passengers.map((p, pi) => (
                          <Text key={p.id || pi} style={{ fontSize: 11, color: c.textMuted }}>
                            {pi + 1}. {p.name}{p.destination ? ` \u2192 ${p.destination}` : ''}{p.fare ? ` (R${Number(p.fare).toFixed(2)})` : ''}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Book button */}
          {!isFull && (
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => openBookModal(entry)}
              activeOpacity={0.85}
            >
              <Ionicons name="ticket" size={16} color="#000" />
              <Text style={styles.bookBtnText}>Book Seat{available > 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          )}
          {isFull && (
            <View style={[styles.bookBtn, { backgroundColor: c.border, opacity: 0.6 }]}>
              <Text style={[styles.bookBtnText, { color: c.textMuted }]}>Full</Text>
            </View>
          )}
        </View>
      );
    });
  }

  // ===== BOOKING DETAILS STEP (dispatch-style) =====
  function renderBookingDetails() {
    const entry = selectedQueueEntry;
    if (!entry) return null;

    return (
      <>
        {/* ── Header ── */}
        <View style={styles.dispatchHeader}>
          <View style={styles.dispatchHeaderLeft}>
            <View style={styles.dispatchHeaderIcon}>
              <Ionicons name="ticket" size={16} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dispatchHeaderTitle}>Book Seats</Text>
              <Text style={[styles.dispatchHeaderSub, { color: c.textMuted }]}>
                {entry.vehicleRegistration} · {entry.driverName || 'Driver'}{entry.vehicleCapacity ? ` · ${entry.vehicleCapacity} seats` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setBookModalVisible(false)} hitSlop={12}>
            <Ionicons name="close-circle" size={28} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Live Totals Bar ── */}
        <View style={[styles.totalBar, { backgroundColor: GOLD_LIGHT }]}>
          <View style={styles.totalBarItem}>
            <Ionicons name="people" size={16} color={GOLD} />
            <Text style={[styles.totalBarLabel, { color: c.textMuted }]}>Passengers</Text>
            <Text style={[styles.totalBarValue, { color: c.text }]}>{passengerSummary.count}</Text>
          </View>
          <View style={[styles.totalBarDivider, { backgroundColor: c.border }]} />
          <View style={styles.totalBarItem}>
            <Ionicons name="cash" size={16} color={GREEN} />
            <Text style={[styles.totalBarLabel, { color: c.textMuted }]}>Total Fare</Text>
            <Text style={[styles.totalBarValue, { color: GREEN }]}>R {passengerSummary.totalFare.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">

          {/* Route summary */}
          <View style={[styles.routeSummary, { backgroundColor: BLUE + '08', borderColor: BLUE + '30' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="navigate" size={14} color={BLUE} />
              <Text style={{ fontSize: 13, color: BLUE, fontWeight: '600', marginLeft: 6 }}>
                {entry.departureStation || matchedRouteInfo?.destinationStation ? (entry.departureStation || 'Origin') : 'Origin'} → {entry.destinationStation || matchedRouteInfo?.destinationStation || 'Destination'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>
              {entry.routeName || matchedRouteInfo?.routeName || 'Route'} · Standard fare: R{Number(entry.standardFare || matchedRouteInfo?.standardFare || 0).toFixed(2)} · {entry.seatsAvailable} available
            </Text>
          </View>

          {/* Payment method indicator */}
          <View style={[styles.eftIndicator, { borderColor: BLUE + '40', backgroundColor: BLUE + '08' }]}>
            <Ionicons name="card-outline" size={16} color={BLUE} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: BLUE, marginLeft: 8 }}>Payment: Ozow (Instant EFT)</Text>
          </View>

          {/* Existing bookings for this queue item */}
          {existingBookings.length > 0 && (
            <View style={[styles.routeSummary, { backgroundColor: GREEN + '08', borderColor: GREEN + '30', marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: GREEN, marginLeft: 6 }}>
                  Your Bookings ({existingBookings.length})
                </Text>
              </View>
              {existingBookings.map((eb) => {
                const sc = STATUS_COLORS[eb.status] || STATUS_COLORS.Pending;
                return (
                  <View key={eb.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: GREEN + '20' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: sc.text }}>{eb.status}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: GREEN }}>R{Number(eb.totalFare).toFixed(2)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Ionicons name="people-outline" size={12} color={c.textMuted} />
                      <Text style={{ fontSize: 11, color: c.textMuted, marginLeft: 4 }}>{eb.seatsBooked} seat(s)</Text>
                      {eb.paymentReference && (
                        <Text style={{ fontSize: 11, color: c.textMuted, marginLeft: 8 }}>Ref: {eb.paymentReference}</Text>
                      )}
                      <Text style={{ fontSize: 11, color: c.textMuted, marginLeft: 'auto' }}>
                        {new Date(eb.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {eb.passengers?.length > 0 && (
                      <View style={{ marginTop: 4 }}>
                        {eb.passengers.map((p, pi) => (
                          <Text key={p.id || pi} style={{ fontSize: 11, color: c.textMuted }}>
                            {pi + 1}. {p.name}{p.destination ? ` → ${p.destination}` : ''}{p.fare ? ` (R${Number(p.fare).toFixed(2)})` : ''}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Passenger cards */}
          {passengers.map((pax, idx) => {
            const paxFare = parseFloat(pax.fare) || 0;
            return (
              <View key={idx} style={[styles.dPaxCard, { backgroundColor: c.background, borderColor: c.border }]}>
                {/* Card header */}
                <View style={styles.dPaxCardHeader}>
                  <View style={[styles.dPaxBadge, { backgroundColor: GOLD }]}>
                    <Text style={styles.dPaxBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.dPaxCardTitle, { color: c.text }]}>
                    {pax.name.trim() || `Passenger ${idx + 1}`}
                  </Text>
                  {paxFare > 0 && (
                    <View style={[styles.dPaxFarePill, { backgroundColor: GREEN + '15' }]}>
                      <Text style={styles.dPaxFarePillText}>R {paxFare.toFixed(2)}</Text>
                    </View>
                  )}
                  {passengers.length > 1 && (
                    <TouchableOpacity onPress={() => removePassengerRow(idx)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={RED} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Two-col: Name + Phone */}
                <View style={styles.dPaxFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Full Name *</Text>
                    <TextInput
                      style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                      value={pax.name}
                      onChangeText={t => updatePassenger(idx, 'name', t)}
                      placeholder="John Doe"
                      placeholderTextColor={c.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Phone *</Text>
                    <TextInput
                      style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                      value={pax.contactNumber}
                      onChangeText={t => updatePassenger(idx, 'contactNumber', t)}
                      placeholder="072 000 0000"
                      placeholderTextColor={c.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Two-col: Next of Kin */}
                <View style={styles.dPaxFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Next of Kin</Text>
                    <TextInput
                      style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                      value={pax.nextOfKinName}
                      onChangeText={t => updatePassenger(idx, 'nextOfKinName', t)}
                      placeholder="Name"
                      placeholderTextColor={c.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Kin Phone</Text>
                    <TextInput
                      style={[styles.dInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                      value={pax.nextOfKinContact}
                      onChangeText={t => updatePassenger(idx, 'nextOfKinContact', t)}
                      placeholder="072 000 0000"
                      placeholderTextColor={c.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Destination + Fare */}
                <View style={styles.dPaxFieldRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Destination</Text>
                    <TouchableOpacity
                      style={[styles.destButton, {
                        borderColor: pax.destination ? GOLD + '50' : c.border,
                        backgroundColor: pax.destination ? GOLD + '06' : c.surface,
                      }]}
                      onPress={() => { setEditDestPickerMode(false); setDestPickerIdx(idx); setDestPickerOpen(true); }}
                      activeOpacity={0.7}
                    >
                      {pax.destination ? (
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.destButtonText, { color: c.text }]} numberOfLines={1}>{pax.destination}</Text>
                          <Text style={[styles.destButtonFare, { color: GREEN }]}>R {(getFareForDestination(pax.destination) || 0).toFixed(2)}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.destButtonPlaceholder, { color: c.textMuted }]}>Select stop…</Text>
                      )}
                      <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dPaxFieldLabel, { color: c.textMuted }]}>Fare (R)</Text>
                    <TextInput
                      style={[styles.dInput, styles.fareInput, {
                        color: paxFare > 0 ? GREEN : c.text,
                        borderColor: paxFare > 0 ? GREEN + '40' : c.border,
                        backgroundColor: paxFare > 0 ? GREEN + '08' : c.surface,
                      }]}
                      value={pax.fare}
                      onChangeText={t => updatePassenger(idx, 'fare', t)}
                      placeholder="0.00"
                      placeholderTextColor={c.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            );
          })}

          {/* Add passenger button */}
          {passengers.length < (entry.seatsAvailable || 4) && (
            <TouchableOpacity
              style={[styles.dAddPaxBtn, { borderColor: GOLD + '40' }]}
              onPress={addPassengerRow}
              activeOpacity={0.7}
            >
              <View style={[styles.dAddPaxIcon, { backgroundColor: GOLD_LIGHT }]}>
                <Ionicons name="person-add" size={16} color={GOLD} />
              </View>
              <Text style={[styles.dAddPaxText, { color: GOLD }]}>Add Passenger</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── Footer ── */}
        <View style={[styles.dispatchFooter, { borderTopColor: c.border, backgroundColor: c.surface }]}>
          <TouchableOpacity style={[styles.dBtnCancel, { borderColor: c.border }]} onPress={() => setBookModalVisible(false)}>
            <Text style={[styles.dBtnCancelTxt, { color: c.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dBtnBook, submitting && { opacity: 0.6 }]}
            onPress={handleBookSeats}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? <ActivityIndicator color="#000" size="small" /> : (
              <>
                <Ionicons name="card-outline" size={14} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.dBtnBookTxt}>Pay via Ozow{passengerSummary.count > 0 ? ` (${passengerSummary.count})` : ''}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // ===== OZOW PAYMENT STEP =====
  function renderOzowPayment() {
    const totalFareAmount = Number(bookingResult?.totalFare || 0);
    const seatsBooked = bookingResult?.seatsBooked || 0;
    const paymentRef = bookingResult?.transactionReference || bookingResult?.paymentReference || '';

    // Build per-passenger breakdown
    const paxBreakdown = passengers.filter(p => p.name.trim()).map(p => ({
      name: p.name.trim(),
      destination: p.destination || '—',
      fare: parseFloat(p.fare) || 0,
    }));

    return (
      <>
        <View style={styles.bookHeader}>
          <View>
            <Text style={[styles.bookTitle, { color: c.text }]}>Ozow Payment</Text>
            <Text style={{ fontSize: 12, color: c.textMuted }}>Secure instant EFT via Ozow</Text>
          </View>
          <TouchableOpacity onPress={() => {
            if (paymentPollRef.current) { clearInterval(paymentPollRef.current); paymentPollRef.current = null; }
            setOzowPolling(false);
            setBookModalVisible(false);
          }}>
            <Ionicons name="close-circle" size={28} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 16 }}>
          {/* Total amount card */}
          <View style={[styles.eftAmountCard, { backgroundColor: GREEN + '10' }]}>
            <Text style={{ fontSize: 13, color: GREEN, fontWeight: '600' }}>Total Amount to Pay</Text>
            <Text style={{ fontSize: 32, fontWeight: '800', color: GREEN, marginTop: 4 }}>
              R{totalFareAmount.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              {seatsBooked} passenger{seatsBooked !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Per-passenger breakdown */}
          {paxBreakdown.length > 0 && (
            <View style={[styles.eftCard, { backgroundColor: c.background, borderColor: c.border, marginBottom: 12 }]}>
              <Text style={[styles.eftCardTitle, { color: c.text, marginBottom: 8 }]}>Fare Breakdown</Text>
              {paxBreakdown.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{p.name}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>→ {p.destination}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>R{p.fare.toFixed(2)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4, borderTopWidth: 2, borderTopColor: GOLD }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>Total</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: GREEN }}>R{totalFareAmount.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* Processing status */}
          <View style={[styles.eftCard, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              {ozowPolling ? (
                <>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: BLUE + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <ActivityIndicator size="large" color={BLUE} />
                  </View>
                  <Text style={[styles.eftCardTitle, { color: c.text, textAlign: 'center' }]}>Processing Payment...</Text>
                  <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 16 }}>
                    Connecting to your bank via Ozow. Please wait...
                  </Text>
                </>
              ) : (
                <>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: GREEN + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Ionicons name="checkmark-circle" size={40} color={GREEN} />
                  </View>
                  <Text style={[styles.eftCardTitle, { color: GREEN, textAlign: 'center' }]}>Payment Complete!</Text>
                </>
              )}
            </View>

            {/* Reference */}
            {paymentRef ? (
              <View style={[styles.eftRefRow, { backgroundColor: GOLD_LIGHT, borderColor: GOLD }]}>
                <View>
                  <Text style={{ fontSize: 11, color: GOLD, fontWeight: '600' }}>REFERENCE</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: GOLD, marginTop: 2 }}>{paymentRef}</Text>
                </View>
                <TouchableOpacity onPress={() => copyToClipboard(paymentRef)} style={styles.copyBtn}>
                  <Ionicons name="copy-outline" size={16} color={GOLD} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </>
    );
  }

  // ===== CONFIRMATION STEP =====
  function renderConfirmation() {
    const totalPaid = Number(bookingResult?.totalFare || 0);
    const paxList = passengers.filter(p => p.name.trim());

    return (
      <>
        <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 24 }}>
          <View style={[styles.confirmIcon, { backgroundColor: GREEN + '15' }]}>
            <Ionicons name="checkmark-circle" size={48} color={GREEN} />
          </View>
          <Text style={[styles.confirmTitle, { color: c.text }]}>Payment Successful!</Text>
          <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 8 }}>
            Your Ozow payment has been processed. Your seat(s) are reserved.
          </Text>

          {/* Total paid prominently */}
          <View style={[styles.eftAmountCard, { backgroundColor: GREEN + '10', marginTop: 16, width: '100%' }]}>
            <Text style={{ fontSize: 13, color: GREEN, fontWeight: '600' }}>Total Paid via Ozow</Text>
            <Text style={{ fontSize: 32, fontWeight: '800', color: GREEN, marginTop: 4 }}>
              R{totalPaid.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              {paxList.length} passenger{paxList.length !== 1 ? 's' : ''} · {bookingResult?.vehicleRegistration || ''}
            </Text>
          </View>

          {bookingResult && (
            <View style={[styles.confirmCard, { backgroundColor: c.background, borderColor: c.border, width: '100%' }]}>
              <ConfirmRow label="Reference" value={bookingResult.paymentReference} c={c} />
              <ConfirmRow label="Vehicle" value={bookingResult.vehicleRegistration} c={c} />
              <ConfirmRow label="Route" value={bookingResult.routeName || matchedRouteInfo?.routeName || `${bookingResult.departureStation || matchedRouteInfo?.destinationStation || '?'} → ${bookingResult.destinationStation || matchedRouteInfo?.destinationStation || '?'}`} c={c} />
              <ConfirmRow label="Payment" value="Ozow (Instant EFT)" c={c} />
              <ConfirmRow label="Status" value="Paid" c={c} bold />
            </View>
          )}

          {/* Per-passenger fare breakdown */}
          {paxList.length > 0 && (
            <View style={[styles.confirmCard, { backgroundColor: c.background, borderColor: c.border, width: '100%', marginTop: 0 }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 8 }}>Passenger Fares</Text>
              {paxList.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{p.name.trim()}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>→ {p.destination || '—'}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: GREEN }}>R{(parseFloat(p.fare) || 0).toFixed(2)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 2, borderTopColor: GOLD }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>Total Paid</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: GREEN }}>R{totalPaid.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.payBtn, { marginTop: 16, paddingHorizontal: 32 }]}
            onPress={() => { setBookModalVisible(false); setActiveTab('bookings'); loadData(true); }}
            activeOpacity={0.85}
          >
            <Text style={styles.payBtnText}>View My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 12, marginBottom: 24 }}
            onPress={() => setBookModalVisible(false)}
          >
            <Text style={{ fontSize: 13, color: c.textMuted }}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </>
    );
  }

  // ===== MY BOOKINGS TAB =====
  function renderMyBookings() {
    if (myBookings.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="ticket-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No bookings yet</Text>
          <Text style={[styles.emptySub, { color: c.textMuted }]}>Book a seat on the queue tab</Text>
        </View>
      );
    }

    return myBookings.map(b => {
      const sc = STATUS_COLORS[b.status] || STATUS_COLORS.Pending;
      return (
        <View key={b.id} style={[styles.bookingCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: sc.text }}>{b.status}</Text>
            </View>
            <Text style={{ fontSize: 11, color: c.textMuted }}>{new Date(b.createdAt).toLocaleDateString()}</Text>
          </View>

          <Text style={[styles.bookingRoute, { color: c.text }]}>
            {b.routeName || `${b.departureStation || '?'} → ${b.destinationStation || '?'}`}
          </Text>
          <Text style={{ fontSize: 12, color: c.textMuted }}>{b.vehicleRegistration} · {b.taxiRankName}</Text>

          <View style={styles.bookingMeta}>
            <View style={styles.bookingMetaItem}>
              <Ionicons name="people-outline" size={13} color={c.textMuted} />
              <Text style={{ fontSize: 12, color: c.textMuted, marginLeft: 4 }}>{b.seatsBooked} seat(s)</Text>
            </View>
            <View style={styles.bookingMetaItem}>
              <Ionicons name="cash-outline" size={13} color={GREEN} />
              <Text style={{ fontSize: 12, color: GREEN, fontWeight: '700', marginLeft: 4 }}>R{Number(b.totalFare).toFixed(2)}</Text>
            </View>
            <View style={styles.bookingMetaItem}>
              <Ionicons name="card-outline" size={13} color={BLUE} />
              <Text style={{ fontSize: 12, color: BLUE, marginLeft: 4 }}>{b.paymentMethod}</Text>
            </View>
          </View>

          {b.paymentReference && (
            <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>Ref: {b.paymentReference}</Text>
          )}

          {b.passengers?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {b.passengers.map((p, pi) => (
                <Text key={p.id || pi} style={{ fontSize: 11, color: c.textMuted }}>
                  {pi + 1}. {p.name} {p.contactNumber ? `(${p.contactNumber})` : ''}
                </Text>
              ))}
            </View>
          )}

          {(b.status === 'Pending' || b.status === 'Confirmed') && (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: RED }]}
              onPress={() => handleCancelBooking(b)}
            >
              <Ionicons name="close-circle-outline" size={14} color={RED} />
              <Text style={{ fontSize: 12, color: RED, fontWeight: '600', marginLeft: 4 }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    });
  }
}

// ===== HELPER COMPONENTS =====
function EftRow({ label, value, c, onCopy }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
      <Text style={{ fontSize: 12, color: c.textMuted }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{value}</Text>
        {onCopy && (
          <TouchableOpacity onPress={onCopy} style={{ marginLeft: 8 }}>
            <Ionicons name="copy-outline" size={14} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function ConfirmRow({ label, value, c, bold }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontSize: 12, color: c.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: bold ? '800' : '600', color: bold ? '#198754' : c.text }}>{value}</Text>
    </View>
  );
}

const STATUS_COLORS = {
  Pending: { bg: 'rgba(255,193,7,0.12)', text: '#cc9a00' },
  Confirmed: { bg: 'rgba(25,135,84,0.12)', text: '#198754' },
  Cancelled: { bg: 'rgba(220,53,69,0.12)', text: '#dc3545' },
  Completed: { bg: 'rgba(13,110,253,0.12)', text: '#0d6efd' },
  Expired: { bg: 'rgba(108,117,125,0.12)', text: '#6c757d' },
};

// ===== STYLES =====
function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14 },

    // Header
    header: {
      backgroundColor: '#1a1a2e',
      paddingHorizontal: 16, paddingBottom: 14,
      flexDirection: 'row', alignItems: 'center',
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    tabBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    tabBtnActive: { backgroundColor: 'rgba(212,175,55,0.15)' },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },

    // Rank selector
    rankSelector: {
      flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0,
      padding: 12, borderRadius: 12, borderWidth: 1, gap: 8,
    },
    rankSelectorText: { flex: 1, fontSize: 14, fontWeight: '600' },
    rankSelectorBadge: {
      backgroundColor: '#D4AF37', borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    rankSelectorBadgeText: { fontSize: 11, fontWeight: '700', color: '#000' },

    dateRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginHorizontal: 16, marginTop: 10, marginBottom: 14,
      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1,
    },
    dateControl: { padding: 8, borderRadius: 8 },
    dateDisplay: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 10 },

    // Queue cards
    queueCard: {
      borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12,
    },
    queueCardTop: { flexDirection: 'row', alignItems: 'center' },
    posBadge: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    posBadgeText: { fontSize: 14, fontWeight: '800' },
    queueReg: { fontSize: 15, fontWeight: '700' },
    seatsBadge: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    queueRoute: {
      flexDirection: 'row', alignItems: 'center',
      marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
    },
    queueMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    metaChip: { flexDirection: 'row', alignItems: 'center' },
    bookBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#D4AF37', borderRadius: 10, paddingVertical: 10, marginTop: 10, gap: 6,
    },
    bookBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

    // Empty states
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
    emptySub: { fontSize: 13, marginTop: 4 },
    emptyText: { textAlign: 'center', padding: 24, fontSize: 14 },

    // Picker modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    pickerCard: {
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 16, maxHeight: '70%',
    },
    pickerHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12,
    },
    pickerTitle: { fontSize: 18, fontWeight: '700' },
    pickerItem: {
      flexDirection: 'row', alignItems: 'center',
      padding: 12, borderRadius: 10, borderWidth: 1,
      borderColor: 'transparent', marginBottom: 6,
    },
    pickerItemTitle: { fontSize: 14, fontWeight: '600' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },

    // Booking modal
    bookCard: {
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    routeSummary: {
      padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12,
    },

    // Dispatch-style header
    dispatchHeader: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: '#1a1a2e',
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
    },
    dispatchHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    dispatchHeaderIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: '#D4AF37',
      alignItems: 'center', justifyContent: 'center',
    },
    dispatchHeaderTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    dispatchHeaderSub: { fontSize: 12, marginTop: 1 },

    // Totals bar
    totalBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 20,
      marginHorizontal: 16, borderRadius: 14, marginTop: 12, marginBottom: 4,
    },
    totalBarItem: { flex: 1, alignItems: 'center', gap: 2 },
    totalBarLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    totalBarValue: { fontSize: 18, fontWeight: '800' },
    totalBarDivider: { width: 1, height: 32, marginHorizontal: 8 },

    // EFT indicator
    eftIndicator: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12,
    },

    // Dispatch-style passenger card
    dPaxCard: {
      borderWidth: 1, borderRadius: 16,
      padding: 14, marginBottom: 12,
    },
    dPaxCardHeader: {
      flexDirection: 'row', alignItems: 'center',
      marginBottom: 12, gap: 10,
    },
    dPaxBadge: {
      width: 26, height: 26, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    dPaxBadgeText: { color: '#000', fontSize: 12, fontWeight: '800' },
    dPaxCardTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
    dPaxFarePill: {
      paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 10,
    },
    dPaxFarePillText: { color: '#22c55e', fontSize: 12, fontWeight: '800' },
    dPaxFieldRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    dPaxFieldLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
    dInput: {
      borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    },
    fareInput: { fontWeight: '700', textAlign: 'right' },

    // Destination button (dispatch-style)
    destButton: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      gap: 8,
    },
    destButtonText: { fontSize: 13, fontWeight: '700' },
    destButtonFare: { fontSize: 11, fontWeight: '700', marginTop: 1 },
    destButtonPlaceholder: { flex: 1, fontSize: 13 },

    // Add passenger button (dispatch-style)
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

    // Dispatch-style footer
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
    dBtnBook: {
      flex: 1.6, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#D4AF37', borderRadius: 14,
      paddingVertical: 14,
    },
    dBtnBookTxt: { fontSize: 15, fontWeight: '800', color: '#000' },

    // Destination picker sheet (dispatch-style)
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

    // Keep payBtn for EFT + Confirmation steps
    payBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#D4AF37', borderRadius: 10,
      paddingHorizontal: 20, paddingVertical: 12,
    },
    payBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
    bookFooter: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 12, borderTopWidth: 1,
    },
    bookHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    },
    bookTitle: { fontSize: 18, fontWeight: '700' },

    // EFT payment
    eftAmountCard: {
      padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12,
    },
    eftCard: {
      padding: 14, borderRadius: 12, borderWidth: 1,
    },
    eftCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
    eftRefRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12,
    },
    copyBtn: {
      padding: 6, borderRadius: 8, backgroundColor: 'rgba(212,175,55,0.1)',
    },

    // Confirmation
    confirmIcon: {
      width: 80, height: 80, borderRadius: 40,
      alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    confirmTitle: { fontSize: 22, fontWeight: '800' },
    confirmCard: {
      width: '100%', padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 16,
    },

    // My Bookings
    bookingCard: {
      borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12,
    },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    bookingRoute: { fontSize: 15, fontWeight: '700', marginTop: 8 },
    bookingMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
    bookingMetaItem: { flexDirection: 'row', alignItems: 'center' },
    cancelBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderRadius: 8, paddingVertical: 8, marginTop: 10,
    },
  });
}
