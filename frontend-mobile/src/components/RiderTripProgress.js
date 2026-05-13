import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  Image, ActivityIndicator, Share, Alert, Platform, Linking,
  Animated, PanResponder, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getTripRequest } from '../api/tripRequests';

// Native-only import - will be replaced by web-specific file
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const GOLD = '#D4AF37';
const BLUE = '#3b82f6';
const GREEN = '#22c55e';

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

export default function RiderTripProgress({ visible, req, onClose, onCompleted }) {
  const insets = useSafeAreaInsets();
  const [panelsDocked, setPanelsDocked] = useState(false);

  const [elapsed, setElapsed]     = useState(0);
  const [riderPos, setRiderPos]   = useState(null);
  const [vehiclePos, setVehiclePos] = useState(null);
  const [sharing, setSharing]     = useState(false);
  const [tripState, setTripState] = useState('InProgress');
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [distanceKm, setDistanceKm] = useState(0);

  const timerRef = useRef(null);
  const pollRef  = useRef(null);
  const watchRef = useRef(null);
  const mapRef = useRef(null);
  const lastLocRef = useRef(null);
  const totalDistRef = useRef(0);
  const bottomPanelAnim = useRef(new Animated.Value(0)).current;

  const destAddr   = req ? (req.dropoffLocation ?? req.DropoffLocation ?? 'Destination') : '';
  const pickupAddr = req ? (req.pickupLocation  ?? req.PickupLocation  ?? 'Pickup')      : '';
  const fare       = req ? Number(req.totalPrice ?? req.TotalPrice ?? 0) : 0;

  const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey ?? '';
  const hasKey = apiKey && !apiKey.includes('YOUR_');

  const fetchRoute = useCallback(async (oLat, oLon) => {
    if (!oLat || !oLon || !destinationCoords) return;
    setRouteLoading(true);
    try {
      if (hasKey) {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${oLat},${oLon}&destination=${destinationCoords.lat},${destinationCoords.lng}&mode=driving&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes?.length > 0) {
          setRouteCoords(decodePolyline(data.routes[0].overview_polyline.points));
          setRemainingDistance(data.routes[0].legs[0].distance.text);
          setRemainingTime(data.routes[0].legs[0].duration.text);
        }
      } else {
        // Fallback: calculate distance using Haversine formula
        const distKm = haversineKm(oLat, oLon, destinationCoords.lat, destinationCoords.lng);
        const distText = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;
        setRemainingDistance(distText);
        // Estimate ETA: assume 30 km/h average speed in city
        const estMinutes = Math.round((distKm / 30) * 60);
        setRemainingTime(estMinutes < 60 ? `${estMinutes} min` : `${Math.floor(estMinutes / 60)}h ${estMinutes % 60}m`);
      }
    } catch { /* polyline unavailable — map still shows */ }
    finally { setRouteLoading(false); }
  }, [destinationCoords, apiKey, hasKey]);

  // Fetch destination coordinates
  useEffect(() => {
    if (!visible || !req) return;

    // First, check if trip request already has destination coordinates
    const reqDestLat = req.dropoffLatitude ?? req.DropoffLatitude ?? req.destinationLatitude ?? req.DestinationLatitude;
    const reqDestLng = req.dropoffLongitude ?? req.DropoffLongitude ?? req.destinationLongitude ?? req.DestinationLongitude;

    if (reqDestLat && reqDestLng) {
      console.log('[RiderTripProgress] Using destination coordinates from trip request');
      setDestinationCoords({ lat: reqDestLat, lng: reqDestLng });
      return;
    }

    // Otherwise, try to geocode the address if we have an API key
    if (!destAddr) return;

    const fetchDestination = async () => {
      try {
        if (hasKey) {
          const geoResp = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destAddr)}&key=${apiKey}`
          );
          const geoData = await geoResp.json();
          if (geoData.results && geoData.results[0]) {
            const dest = geoData.results[0].geometry.location;
            setDestinationCoords(dest);
          }
        } else {
          console.warn('[RiderTripProgress] No Google API key and no destination coordinates in trip request - cannot calculate distance/ETA');
        }
      } catch (err) {
        console.warn('Failed to fetch destination:', err);
      }
    };

    fetchDestination();
  }, [visible, req, destAddr, hasKey, apiKey]);

  // Fetch route when we have both vehicle/destination positions
  useEffect(() => {
    if (destinationCoords && (vehiclePos || riderPos)) {
      const startPos = vehiclePos || riderPos;
      fetchRoute(startPos.latitude, startPos.longitude);
    }
  }, [destinationCoords, vehiclePos, riderPos, fetchRoute]);

  // Dock/Undock functions
  const togglePanels = useCallback(() => {
    const newDockedState = !panelsDocked;
    setPanelsDocked(newDockedState);

    Animated.timing(bottomPanelAnim, {
      toValue: newDockedState ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [panelsDocked, bottomPanelAnim]);

  // Pan responder for gesture detection
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy < -50) {
          if (!panelsDocked) togglePanels();
        } else if (gestureState.dy > 50) {
          if (panelsDocked) togglePanels();
        }
      },
    })
  ).current;


  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destAddr)}&travelmode=driving`;

  useEffect(() => {
    if (!visible || !req) return;
    console.log('[RiderTripProgress] Initializing with req:', req);
    setTripState(req.state ?? 'InProgress');
    setDistanceKm(0);
    totalDistRef.current = 0;
    lastLocRef.current = null;
    setRouteCoords([]);

    // Calculate elapsed time from trip start time
    const tripStartTime = req.createdAt ?? req.CreatedAt ?? req.startTime ?? req.StartTime ?? req.tripStartTime ?? req.TripStartTime;
    if (tripStartTime) {
      const start = new Date(tripStartTime);
      const now = new Date();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      setElapsed(Math.max(0, elapsedSeconds));
    } else {
      setElapsed(0);
    }

    // Set vehicle position from trip request if available
    if (req.vehicleLatitude && req.vehicleLongitude) {
      console.log('[RiderTripProgress] Setting vehicle position from vehicleLatitude/Longitude');
      setVehiclePos({ latitude: req.vehicleLatitude, longitude: req.vehicleLongitude });
      lastLocRef.current = { latitude: req.vehicleLatitude, longitude: req.vehicleLongitude };
    } else if (req.driverLatitude && req.driverLongitude) {
      console.log('[RiderTripProgress] Setting vehicle position from driverLatitude/Longitude');
      setVehiclePos({ latitude: req.driverLatitude, longitude: req.driverLongitude });
      lastLocRef.current = { latitude: req.driverLatitude, longitude: req.driverLongitude };
    }

    timerRef.current = setInterval(() => {
      const tripStartTime = req.createdAt ?? req.CreatedAt ?? req.startTime ?? req.StartTime ?? req.tripStartTime ?? req.TripStartTime;
      if (tripStartTime) {
        const start = new Date(tripStartTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now - start) / 1000);
        setElapsed(Math.max(0, elapsedSeconds));
      } else {
        setElapsed(e => e + 1);
      }
    }, 1000);

    // Start location watching for rider position (fallback)
    (async () => {
      try {
        if (Platform.OS === 'web') {
          if (navigator.geolocation) {
            watchRef.current = navigator.geolocation.watchPosition(
              ({ coords }) => {
                const newPos = { latitude: coords.latitude, longitude: coords.longitude };
                setRiderPos(newPos);
                if (lastLocRef.current) {
                  totalDistRef.current += haversineKm(
                    lastLocRef.current.latitude, lastLocRef.current.longitude,
                    newPos.latitude, newPos.longitude
                  );
                  setDistanceKm(+totalDistRef.current.toFixed(2));
                }
                lastLocRef.current = newPos;
              },
              null,
              { enableHighAccuracy: true, maximumAge: 15000 }
            );
          }
        } else {
          console.log('[RiderTripProgress] Requesting location permissions');
          const { status } = await Location.requestForegroundPermissionsAsync();
          console.log('[RiderTripProgress] Location permission status:', status);
          if (status === 'granted') {
            watchRef.current = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 50 },
              ({ coords }) => {
                const newPos = { latitude: coords.latitude, longitude: coords.longitude };
                setRiderPos(newPos);
                if (lastLocRef.current) {
                  totalDistRef.current += haversineKm(
                    lastLocRef.current.latitude, lastLocRef.current.longitude,
                    newPos.latitude, newPos.longitude
                  );
                  setDistanceKm(+totalDistRef.current.toFixed(2));
                }
                lastLocRef.current = newPos;
              }
            );
          } else {
            console.warn('[RiderTripProgress] Location permission denied');
          }
        }
      } catch (err) {
        console.error('[RiderTripProgress] Location error:', err);
      }
    })();

    // Poll trip status every 10 s for completion
    const id = req.id ?? req.Id;
    if (id) {
      console.log('[RiderTripProgress] Starting poll for trip ID:', id);
      pollRef.current = setInterval(async () => {
        try {
          const updated = await getTripRequest(id);
          if (updated?.state === 'Completed' || updated?.state === 'Cancelled') {
            console.log('[RiderTripProgress] Trip state changed to:', updated.state);
            clearInterval(pollRef.current);
            setTripState(updated.state);
            if (updated.state === 'Completed') onCompleted?.();
          }
        } catch (err) {
          console.error('[RiderTripProgress] Poll error:', err);
        }
      }, 10000);
    }

    return () => {
      console.log('[RiderTripProgress] Cleanup');
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
      if (Platform.OS === 'web') {
        if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
      } else {
        watchRef.current?.remove?.();
      }
    };
  }, [visible, req]);

  async function handleShare() {
    setSharing(true);
    try {
      const locationLine = riderPos
        ? `\n📍 My live location:\nhttps://maps.google.com/?q=${riderPos.latitude},${riderPos.longitude}`
        : '';
      const routeLine = `\n🗺️ Navigate to destination:\n${mapsUrl}`;
      const msg = [
        `🚗 MzansiFleet — Trip In Progress`,
        ``,
        `From: ${pickupAddr}`,
        `To:     ${destAddr}`,
        fare > 0 ? `Fare:  R${fare.toFixed(2)}` : null,
        `Time:  ${fmtElapsed(elapsed)}`,
        locationLine,
        routeLine,
        ``,
        `Shared via MzansiFleet`,
      ].filter(l => l !== null).join('\n');

      await Share.share({ message: msg, title: 'My Trip Progress' });
    } catch (err) {
      if (!String(err.message).includes('did not share')) {
        Alert.alert('Share failed', err.message);
      }
    } finally {
      setSharing(false);
    }
  }

  function openMaps() {
    if (Platform.OS === 'web') {
      window.open(mapsUrl, '_blank');
    } else {
      Linking.openURL(mapsUrl).catch(() => {});
    }
  }

  if (!visible || !req) {
    console.log('[RiderTripProgress] Not rendering - visible:', visible, 'req:', req);
    return null;
  }

  const isCompleted = tripState === 'Completed';
  const isCancelled = tripState === 'Cancelled';
  const statusColor = isCompleted ? GREEN : isCancelled ? '#ef4444' : BLUE;
  const statusLabel = isCompleted ? 'Trip Completed' : isCancelled ? 'Trip Cancelled' : 'Trip In Progress';

  console.log('[RiderTripProgress] Rendering - vehiclePos:', vehiclePos, 'riderPos:', riderPos);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} edges={['bottom']}>

        {/* ── FULL SCREEN MAP (always visible) ── */}
        <View style={{ flex: 1, position: 'relative' }}>
          {Platform.OS !== 'web' && (vehiclePos || riderPos) ? (
            <MapView
              ref={mapRef}
              style={{ width: '100%', height: '100%' }}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: (vehiclePos || riderPos).latitude,
                longitude: (vehiclePos || riderPos).longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass
              followsUserLocation
            >
              {vehiclePos && (
                <Marker
                  coordinate={vehiclePos}
                  title="Driver"
                  description="Your driver's location"
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
                    <Ionicons name="car" size={16} color="#000" />
                  </View>
                </Marker>
              )}
              {destinationCoords && (
                <Marker
                  coordinate={{ latitude: destinationCoords.lat, longitude: destinationCoords.lng }}
                  title="Destination"
                  description={destAddr}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
                    <Ionicons name="flag" size={16} color="#fff" />
                  </View>
                </Marker>
              )}
              {routeCoords.length > 0 && (
                <>
                  <Polyline coordinates={routeCoords} strokeColor="rgba(59,130,246,0.25)" strokeWidth={16} />
                  <Polyline coordinates={routeCoords} strokeColor="rgba(59,130,246,0.45)" strokeWidth={10} />
                  <Polyline coordinates={routeCoords} strokeColor="#3b82f6" strokeWidth={5} />
                </>
              )}
            </MapView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ActivityIndicator size="large" color={BLUE} />
              <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>
                {Platform.OS === 'web' ? 'Map not available on web' : 'Getting your location…'}
              </Text>
            </View>
          )}

          {/* ── DOCKED STATE SHOW BUTTON ── */}
          {panelsDocked && (
            <TouchableOpacity
              onPress={togglePanels}
              style={{
                position: 'absolute',
                bottom: Platform.OS === 'android' ? (insets.bottom + 16) : (insets.bottom + 12),
                left: 20,
                right: 20,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(15,23,42,0.95)',
                borderRadius: 25,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: 'rgba(100,116,139,0.3)',
              }}
            >
              <Ionicons name="chevron-up" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>Show Details</Text>
            </TouchableOpacity>
          )}

          {/* ── UNDOCKED PANEL (slide-up content) ── */}
          <Animated.View
            pointerEvents={panelsDocked ? 'none' : 'auto'}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#0f172a',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 16,
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 20,
              maxHeight: '70%',
              transform: [{
                translateY: bottomPanelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 600],
                }),
              }],
              opacity: bottomPanelAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={{ padding: 16, gap: 12 }}>
                {/* Dock button */}
                <TouchableOpacity
                  onPress={togglePanels}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 8,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="chevron-down" size={20} color="#64748b" />
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginLeft: 6 }}>Hide to see full map</Text>
                </TouchableOpacity>

            {/* ── Completion banner ── */}
            {isCompleted && (
              <View style={{ backgroundColor: '#22c55e15', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#22c55e30', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="checkmark-circle" size={28} color={GREEN} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: GREEN }}>You've arrived!</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Thank you for riding with MzansiFleet</Text>
                </View>
              </View>
            )}
            {isCancelled && (
              <View style={{ backgroundColor: '#ef444415', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ef444430', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="close-circle" size={28} color="#ef4444" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#ef4444' }}>Trip Cancelled</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>This trip was cancelled</Text>
                </View>
              </View>
            )}

            {/* ── Route strip ── */}
            <View style={{ backgroundColor: '#0f172a', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', paddingTop: 3 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN }} />
                <View style={{ width: 2, height: 22, backgroundColor: '#1e293b', marginVertical: 3 }} />
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ef4444' }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Pickup</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 12 }} numberOfLines={2}>{pickupAddr}</Text>
                <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Destination</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }} numberOfLines={2}>{destAddr}</Text>
              </View>
            </View>

            {/* ── Stats ── */}
            <View style={{ flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1e293b' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>{fmtElapsed(elapsed)}</Text>
                <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }}>ELAPSED</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#1e293b' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>{distanceKm.toFixed(1)} km</Text>
                <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }}>DISTANCE</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#1e293b' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: GOLD }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{fare > 0 ? `R${fare.toFixed(2)}` : '—'}</Text>
                <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }}>FARE</Text>
              </View>
            </View>

            {/* ── Trip Details ── */}
            <View style={{ backgroundColor: '#0f172a', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1e293b' }}>
              <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Trip Details</Text>
              
              {req?.driverName && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="person" size={14} color={BLUE} />
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>{req.driverName}</Text>
                  {req?.driverPhone && (
                    <Text style={{ fontSize: 11, color: '#64748b' }}>• {req.driverPhone}</Text>
                  )}
                </View>
              )}
              
              {req?.vehicleRegistration && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="car" size={14} color={GOLD} />
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>{req.vehicleRegistration}</Text>
                </View>
              )}
              
              {req?.passengerCount && req.passengerCount > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="people" size={14} color={GREEN} />
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>{req.passengerCount} passenger{req.passengerCount > 1 ? 's' : ''}</Text>
                </View>
              )}
              
              {req?.id && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="pricetag" size={14} color='#64748b' />
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>ID: {req.id}</Text>
                </View>
              )}
            </View>

            {/* ── Share button ── */}
            {!isCompleted && !isCancelled && (
              <TouchableOpacity
                style={{ backgroundColor: BLUE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}
                onPress={handleShare}
                disabled={sharing}
                activeOpacity={0.85}
              >
                {sharing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="share-social" size={20} color="#fff" />
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff' }}>Share Trip & Live Location</Text>
                    </>
                }
              </TouchableOpacity>
            )}

            {/* ── Done button when completed ── */}
            {(isCompleted || isCancelled) && (
              <TouchableOpacity
                style={{ backgroundColor: isCompleted ? GREEN : '#1e293b', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={20} color={isCompleted ? '#fff' : '#94a3b8'} />
                <Text style={{ fontSize: 15, fontWeight: '900', color: isCompleted ? '#fff' : '#94a3b8' }}>Done</Text>
              </TouchableOpacity>
            )}

            {/* ── Back link ── */}
            {!isCompleted && !isCancelled && (
              <TouchableOpacity
                style={{ borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1e293b' }}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 13 }}>← Back to Trip Requests</Text>
              </TouchableOpacity>
            )}

              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
