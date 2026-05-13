// Native-only — web uses ActiveTripNavigator.web.js automatically
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator,
  TextInput, ScrollView, StyleSheet, Animated, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';
import { completeTripRequest, cancelTripRequest } from '../api/tripRequests';
import { completeTrip } from '../api/taxiRanks';
import { completeQueueTrip } from '../api/queueManagement';

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#D4AF3718';

function decodePolyline(encoded) {
  const poly = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1; lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1; lng += dlng;
    poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return poly;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtElapsed(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtEta(minutes) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function getTrafficColor(level) {
  switch (level) {
    case 'heavy': return '#ef4444';
    case 'moderate': return '#f59e0b';
    case 'light': return '#22c55e';
    default: return '#64748b';
  }
}

function getWeatherIcon(condition) {
  switch (condition) {
    case 'sunny': return 'sunny';
    case 'cloudy': return 'cloudy';
    case 'rainy': return 'rainy';
    default: return 'partly-sunny';
  }
}

export default function ActiveTripNavigator({ visible, req, driverId, vehicleId, onDone, onCancel, c }) {
  const insets = useSafeAreaInsets();
  const [currentLoc, setCurrentLoc] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [panel, setPanel] = useState('nav'); // 'nav' | 'complete'

  // New state for enhanced data
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(null);
  const [trafficLevel, setTrafficLevel] = useState('light');
  const [weather, setWeather] = useState({ temp: 22, condition: 'sunny' });
  const [batteryLevel, setBatteryLevel] = useState(85);

  // Dock state for panels
  const [panelsDocked, setPanelsDocked] = useState(false);

  const [distInput, setDistInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [fareInput, setFareInput] = useState('');
  const [passengerCount, setPassengerCount] = useState(0);

  const mapRef = useRef(null);
  const watchRef = useRef(null);
  const timerRef = useRef(null);
  const lastLocRef = useRef(null);
  const totalDistRef = useRef(0);

  // Animation refs
  const topPanelAnim = useRef(new Animated.Value(0)).current; // 0 = visible, 1 = docked
  const bottomPanelAnim = useRef(new Animated.Value(0)).current; // 0 = visible, 1 = docked

  const destLat = req ? Number(req.dropoffLatitude ?? req.DropoffLatitude ?? 0) : 0;
  const destLon = req ? Number(req.dropoffLongitude ?? req.DropoffLongitude ?? 0) : 0;
  const destAddr = req ? (req.dropoffLocation ?? req.DropoffLocation ?? 'Destination') : '';
  const pickupAddr = req ? (req.pickupLocation ?? req.PickupLocation ?? 'Pickup') : '';
  const agreedFare = req ? Number(req.totalPrice ?? req.TotalPrice ?? 0) : 0;
  // For taxi rank trips, use fareAmount from dispatch data
  const taxiRankFare = req ? Number(req.fareAmount ?? req.totalAmount ?? 0) : 0;
  const isTaxiRankTrip = req?.tripType === 'TaxiRankTrip' || taxiRankFare > 0;
  const ratePerKm = req ? Number(req.ratePerKm ?? req.RatePerKm ?? 0) : 0;
  const tripPassengerCount = req ? Number(req.passengerCount ?? req.PassengerCount ?? req.numberOfPassengers ?? 0) : 0;
  const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey ?? '';
  const hasValidKey = apiKey && !apiKey.includes('YOUR_');

  const fetchRoute = useCallback(async (oLat, oLon) => {
    if (!oLat || !oLon || !destLat || !destLon || !hasValidKey) return;
    setRouteLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${oLat},${oLon}&destination=${destLat},${destLon}&mode=driving&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        setRouteCoords(decodePolyline(data.routes[0].overview_polyline.points));
        // Calculate ETA from route duration
        const durationInSeconds = data.routes[0].legs[0]?.duration_in_traffic?.value || data.routes[0].legs[0]?.duration?.value;
        if (durationInSeconds) {
          const etaMinutes = durationInSeconds / 60;
          setEta(etaMinutes);
        }
        // Set traffic level based on duration difference
        const normalDuration = data.routes[0].legs[0]?.duration?.value;
        const trafficDuration = data.routes[0].legs[0]?.duration_in_traffic?.value;
        if (normalDuration && trafficDuration) {
          const ratio = trafficDuration / normalDuration;
          if (ratio > 1.5) setTrafficLevel('heavy');
          else if (ratio > 1.2) setTrafficLevel('moderate');
          else setTrafficLevel('light');
        }
      }
    } catch { /* polyline unavailable — map still shows */ }
    finally { setRouteLoading(false); }
  }, [destLat, destLon, apiKey, hasValidKey]);

  useEffect(() => {
    if (!visible || !req) return;

    setElapsed(0);
    setDistanceKm(0);
    totalDistRef.current = 0;
    lastLocRef.current = null;
    setRouteCoords([]);
    setPanel('nav');

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      setCurrentLoc({ latitude, longitude });
      lastLocRef.current = { latitude, longitude };
      fetchRoute(latitude, longitude);

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15 },
        ({ coords }) => {
          const { latitude: nlat, longitude: nlon, speed: currentSpeed } = coords;
          setCurrentLoc({ latitude: nlat, longitude: nlon });
          setSpeed(currentSpeed ? Math.round(currentSpeed * 3.6) : 0); // Convert m/s to km/h
          if (lastLocRef.current) {
            totalDistRef.current += haversineKm(
              lastLocRef.current.latitude, lastLocRef.current.longitude, nlat, nlon
            );
            setDistanceKm(+totalDistRef.current.toFixed(2));
          }
          lastLocRef.current = { latitude: nlat, longitude: nlon };
        }
      );
    })();

    return () => {
      clearInterval(timerRef.current);
      watchRef.current?.remove?.();
    };
  }, [visible, req]);

  function openCompletePanel() {
    const dist = totalDistRef.current > 0.01 ? totalDistRef.current.toFixed(2) : '';
    const rate = ratePerKm > 0 ? ratePerKm.toFixed(2) : '';
    const auto = dist && rate ? (parseFloat(dist) * parseFloat(rate)).toFixed(2) : '';
    setDistInput(dist);
    setRateInput(rate);
    // For taxi rank trips, use the fare amount from dispatch data
    const fareToUse = isTaxiRankTrip && taxiRankFare > 0 ? taxiRankFare.toFixed(2) : (agreedFare > 0 ? agreedFare.toFixed(2) : auto);
    setFareInput(fareToUse);
    setPassengerCount(tripPassengerCount);
    setPanel('complete');
  }

  async function doCancel() {
    if (!req) return;
    const id = req.id ?? req.Id;
    setCancelling(true);
    try {
      await cancelTripRequest(id);
      clearInterval(timerRef.current);
      watchRef.current?.remove?.();
      onCancel?.();
    } catch (err) {
      Alert.alert('Error', err?.response?.data || err?.message || 'Failed to cancel trip');
    } finally {
      setCancelling(false);
    }
  }

  async function handleConfirmEarnings() {
    if (!req || !driverId) return;
    const id = req.id ?? req.Id;
    const dist = parseFloat(distInput) || 0;
    const rate = parseFloat(rateInput) || 0;
    // Use the set fare directly without calculations
    const total = parseFloat(fareInput) || 0;
    if (total <= 0) return Alert.alert('Missing', 'Please enter the fare amount');

    setCompleting(true);
    try {
      // Determine trip type and call appropriate completion API
      // Priority: Check explicit tripType first, then check for specific ID fields
      const isTaxiRankTripType = req?.tripType === 'TaxiRankTrip' || req?.taxiRankTripId;
      const isQueueTrip = req?.tripType === 'DailyTaxiQueue' || req?.queueEntryId || req?.dailyTaxiQueueId;

      // If no explicit type, try to infer from data structure
      // TaxiRankTrips have routeId, DailyTaxiQueue has routeId too but different structure
      // Default to queue trip if it has fareAmount (from dispatch)
      const inferredType = !isTaxiRankTripType && !isQueueTrip && taxiRankFare > 0 ? 'DailyTaxiQueue' : null;

      let result;
      if (isTaxiRankTripType) {
        // Complete TaxiRankTrip
        result = await completeTrip(id, 'Trip completed by driver', driverId, null, total);
      } else if (isQueueTrip || inferredType === 'DailyTaxiQueue') {
        // Complete DailyTaxiQueue trip
        result = await completeQueueTrip(id, {
          notes: 'Trip completed by driver',
          completedByDriverId: driverId,
          totalAmount: total,
        });
      } else {
        // Complete TripRequest (default)
        result = await completeTripRequest(id, dist, rate, total);
      }

      if (vehicleId) {
        const addr = req?.dropoffLocation ?? req?.DropoffLocation ?? '';
        await client.post('/VehicleEarnings', {
          vehicleId,
          amount: total,
          source: isTaxiRankTripType ? 'TaxiRankTrip' : ((isQueueTrip || inferredType === 'DailyTaxiQueue') ? 'DailyTaxiQueue' : 'TripRequest'),
          description: addr ? `Trip to ${addr} (${passengerCount} pax)` : `Trip completed (${passengerCount} pax)`,
          date: new Date().toISOString(),
          period: 'Daily',
        });
      }
      clearInterval(timerRef.current);
      watchRef.current?.remove?.();
      onDone?.(total);
    } catch (err) {
      Alert.alert('Error', err?.response?.data || err?.message || 'Failed to complete trip');
    } finally {
      setCompleting(false);
    }
  }

  // Dock/Undock functions
  const togglePanels = useCallback(() => {
    const newDockedState = !panelsDocked;
    setPanelsDocked(newDockedState);

    Animated.parallel([
      Animated.timing(topPanelAnim, {
        toValue: newDockedState ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(bottomPanelAnim, {
        toValue: newDockedState ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [panelsDocked, topPanelAnim, bottomPanelAnim]);

  // Pan responder for gesture detection
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10; // Respond to vertical gestures
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy < -50) { // Swipe up to dock
          if (!panelsDocked) togglePanels();
        } else if (gestureState.dy > 50) { // Swipe down to undock
          if (panelsDocked) togglePanels();
        }
      },
    })
  ).current;

  if (!visible || !req) return null;

  const hasDestCoords = destLat !== 0 && destLon !== 0;
  const mapRegion = currentLoc
    ? { latitude: currentLoc.latitude, longitude: currentLoc.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : hasDestCoords
      ? { latitude: destLat, longitude: destLon, latitudeDelta: 0.04, longitudeDelta: 0.04 }
      : null;

  const estFare = isTaxiRankTrip && taxiRankFare > 0
    ? taxiRankFare.toFixed(2)
    : distanceKm > 0 && ratePerKm > 0
    ? (distanceKm * ratePerKm).toFixed(2)
    : agreedFare > 0 ? agreedFare.toFixed(2) : null;

  const bg = c?.surface ?? '#0f172a';
  const textCol = c?.text ?? '#ffffff';
  const mutedCol = c?.textMuted ?? '#64748b';
  const borderCol = c?.border ?? '#1e293b';
  const bgLow = c?.background ?? '#020617';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── MAP ── */}
        {mapRegion ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={Platform.OS !== 'web' ? PROVIDER_GOOGLE : undefined}
            initialRegion={mapRegion}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            followsUserLocation
          >
            {hasDestCoords && (
              <Marker coordinate={{ latitude: destLat, longitude: destLon }} title="Destination" description={destAddr}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
                  <Ionicons name="flag" size={16} color="#fff" />
                </View>
              </Marker>
            )}
            {routeCoords.length > 0 && (
              <>
                {/* Outer glow layer */}
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="rgba(59,130,246,0.25)"
                  strokeWidth={16}
                />
                {/* Mid glow layer */}
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="rgba(59,130,246,0.45)"
                  strokeWidth={10}
                />
                {/* Main route line */}
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="#3b82f6"
                  strokeWidth={5}
                />
              </>
            )}
          </MapView>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 14 }}>Getting your location…</Text>
          </View>
        )}

        {/* ── FULL SCREEN GESTURE DETECTOR removed - blocks map interaction ── */}

        {/* ── TOP OVERLAY ── */}
        <Animated.View
          pointerEvents={panelsDocked ? 'none' : 'auto'}
          style={[
            styles.topOverlay,
            { paddingBottom: insets.top + 10 },
            {
              transform: [{
                translateY: topPanelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -120], // Slide up when docked
                }),
              }],
              opacity: topPanelAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0], // Fully hidden when docked
              }),
            },
          ]}
          {...(!panelsDocked ? panResponder.panHandlers : {})}
        >
          {/* Top action row: Back button + Dock Toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.9)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(100,116,139,0.3)', gap: 6 }}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={16} color="#94a3b8" />
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dockButton}
              onPress={togglePanels}
              activeOpacity={0.8}
            >
              <Ionicons
                name={panelsDocked ? "chevron-down" : "chevron-up"}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          {/* Swipe Hint - only show when docked */}
          {panelsDocked && (
            <View style={styles.swipeHint}>
              <Ionicons name="hand-left" size={16} color="#64748b" />
              <Text style={styles.swipeHintText}>Swipe down to show controls</Text>
            </View>
          )}

          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={styles.tripIcon}>
                <Ionicons name="car" size={20} color="#22c55e" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.tripStatus}>
                  {panel === 'complete' ? 'Complete Trip' : 'Trip In Progress'}
                </Text>
                <Text style={styles.destinationText} numberOfLines={1}>{destAddr}</Text>
              </View>
              {routeLoading && <ActivityIndicator size="small" color="#3b82f6" />}
            </View>

            {/* Route visualization */}
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <Ionicons name="location" size={12} color="#22c55e" />
                <Text style={styles.routeText} numberOfLines={1}>{pickupAddr}</Text>
              </View>
              <View style={styles.routeArrow}>
                <Ionicons name="arrow-forward" size={14} color="#64748b" />
              </View>
              <View style={styles.routePoint}>
                <Ionicons name="flag" size={12} color="#ef4444" />
                <Text style={styles.routeText} numberOfLines={1}>{destAddr}</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats Bar */}
          <View style={styles.quickStatsBar}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color="#3b82f6" />
              <Text style={styles.statValue}>{fmtElapsed(elapsed)}</Text>
              <Text style={styles.statLabel}>Elapsed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={16} color="#22c55e" />
              <Text style={styles.statValue}>{speed} km/h</Text>
              <Text style={styles.statLabel}>Speed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="navigate-outline" size={16} color="#f59e0b" />
              <Text style={styles.statValue}>{eta ? fmtEta(eta) : '--'}</Text>
              <Text style={styles.statLabel}>ETA</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── NAVIGATION BOTTOM PANEL ── */}
        {panel === 'nav' && (
          <Animated.View
            pointerEvents={panelsDocked ? 'none' : 'auto'}
            style={[
              styles.bottomPanel,
              { paddingBottom: insets.bottom + 20 },
              {
                transform: [{
                  translateY: bottomPanelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 300],
                  }),
                }],
                opacity: bottomPanelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              },
            ]}
          >
            {/* Enhanced Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={styles.statCardHeader}>
                  <Ionicons name="location-outline" size={18} color="#3b82f6" />
                  <Text style={styles.statCardTitle}>Distance</Text>
                </View>
                <Text style={styles.statCardValue}>{distanceKm.toFixed(1)} <Text style={styles.statCardUnit}>km</Text></Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardHeader}>
                  <Ionicons name="cash-outline" size={18} color={GOLD} />
                  <Text style={styles.statCardTitle}>Fare Est.</Text>
                </View>
                <Text style={[styles.statCardValue, { color: GOLD }]}>
                  {estFare ? `R${estFare}` : '—'}
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardHeader}>
                  <Ionicons name={`car-outline`} size={18} color={getTrafficColor(trafficLevel)} />
                  <Text style={styles.statCardTitle}>Traffic</Text>
                </View>
                <Text style={[styles.statCardValue, { color: getTrafficColor(trafficLevel) }]}>
                  {trafficLevel.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Weather & Battery Info */}
            <View style={styles.infoBar}>
              <View style={styles.infoItem}>
                <Ionicons name={getWeatherIcon(weather.condition)} size={16} color="#f59e0b" />
                <Text style={styles.infoText}>{weather.temp}°C</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Ionicons name="battery-half-outline" size={16} color="#22c55e" />
                <Text style={styles.infoText}>{batteryLevel}%</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={openCompletePanel} activeOpacity={0.85}>
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark-circle" size={24} color="#000" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.primaryButtonText}>Arrived — Complete Trip</Text>
                    <Text style={styles.primaryButtonSubtext}>Tap when you reach destination</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => Alert.alert('Cancel Trip', 'Are you sure you want to cancel this trip?', [
                  { text: 'Keep Going', style: 'cancel' },
                  { text: 'Cancel Trip', style: 'destructive', onPress: doCancel },
                ])}
                disabled={cancelling}
                activeOpacity={0.85}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                    <Text style={styles.secondaryButtonText}>Cancel Trip</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Show Controls button - shows at TOP when panels are docked */}
        {panelsDocked && (
          <TouchableOpacity
            style={[
              styles.dockIndicatorButton,
              {
                position: 'absolute',
                top: Platform.OS === 'android' ? (insets.top + 12) : (insets.top + 8),
                left: 16,
                right: 16,
              },
            ]}
            onPress={togglePanels}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-down" size={24} color="#ffffff" />
            <Text style={styles.dockIndicatorText}>Show Controls</Text>
          </TouchableOpacity>
        )}

        {/* ── EARNINGS / COMPLETION PANEL ── */}
        {panel === 'complete' && (
          <View style={[styles.bottomPanel, { maxHeight: '80%', paddingBottom: insets.bottom + 20 }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Trip Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="receipt-outline" size={20} color={GOLD} />
                  <Text style={styles.cardTitle}>Trip Summary</Text>
                </View>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="time-outline" size={16} color="#64748b" />
                    <Text style={styles.summaryLabel}>Time Elapsed</Text>
                    <Text style={styles.summaryValue}>{fmtElapsed(elapsed)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="location-outline" size={16} color="#64748b" />
                    <Text style={styles.summaryLabel}>Distance</Text>
                    <Text style={styles.summaryValue}>{distanceKm.toFixed(2)} km</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="speedometer-outline" size={16} color="#64748b" />
                    <Text style={styles.summaryLabel}>Avg Speed</Text>
                    <Text style={styles.summaryValue}>{elapsed > 0 ? Math.round((distanceKm / (elapsed / 3600))) : 0} km/h</Text>
                  </View>
                </View>

                {agreedFare > 0 && (
                  <View style={styles.agreedFareRow}>
                    <Ionicons name="cash-outline" size={16} color={GOLD} />
                    <Text style={styles.agreedFareLabel}>Agreed Fare</Text>
                    <Text style={styles.agreedFareValue}>R{agreedFare.toFixed(2)}</Text>
                  </View>
                )}
              </View>


              {/* Action Buttons */}
              <View style={styles.completionActions}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setPanel('nav')}
                >
                  <Ionicons name="arrow-back" size={18} color="#64748b" />
                  <Text style={styles.backButtonText}>Back to Trip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmButton, completing && styles.confirmButtonDisabled]}
                  onPress={handleConfirmEarnings}
                  disabled={completing}
                  activeOpacity={0.85}
                >
                  {completing ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#000" />
                      <Text style={styles.confirmButtonText}>Confirm & Record Earnings</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'android' ? 44 : 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: 'rgba(2,6,23,0.9)',
  },
  dockButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 8 : 16,
    right: 16,
    zIndex: 10,
  },
  dockButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerCard: {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tripIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  tripStatus: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.5)',
    borderRadius: 12,
    padding: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeArrow: {
    marginHorizontal: 8,
  },
  routeText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginLeft: 6,
    flex: 1,
  },
  quickStatsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.3)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(100,116,139,0.3)',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(2,6,23,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.5)',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  statCardUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  infoBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '600',
    marginLeft: 6,
  },
  infoDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(100,116,139,0.3)',
    marginHorizontal: 12,
  },
  actionContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
  primaryButtonSubtext: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.7)',
    fontWeight: '600',
    marginTop: 2,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ef4444',
  },
  summaryCard: {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.5)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  agreedFareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  agreedFareLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  agreedFareValue: {
    fontSize: 16,
    fontWeight: '800',
    color: GOLD,
  },
  calculatorCard: {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.5)',
  },
  inputGroup: {
    gap: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modernInput: {
    backgroundColor: 'rgba(30,41,59,0.5)',
    color: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  totalInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  totalInput: {
    borderColor: GOLD,
    color: GOLD,
    fontSize: 18,
    fontWeight: '900',
    backgroundColor: 'rgba(212,175,55,0.1)',
  },
  completionActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.3)',
    backgroundColor: 'rgba(30,41,59,0.5)',
  },
  backButtonText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  dockIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  dockIndicatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dockIndicatorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  swipeHint: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 8 : 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.3)',
  },
  swipeHintText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
});
