import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, Share, Alert, Platform, Linking, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { fetchUserQueueBookings } from '../api/taxiRanks';

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const GOLD = '#D4AF37';
const BLUE = '#3b82f6';
const GREEN = '#22c55e';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

function fmtElapsed(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function QueueTripProgress({ visible, booking, userId, onClose, onCompleted }) {
  const insets = useSafeAreaInsets();

  const [elapsed, setElapsed] = useState(0);
  const [riderPos, setRiderPos] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [routeCoords, setRouteCoords] = useState([]);
  const [tripEnded, setTripEnded] = useState(false);
  const [panelDocked, setPanelDocked] = useState(false);
  const [sharing, setSharing] = useState(false);

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const watchRef = useRef(null);
  const mapRef = useRef(null);
  const totalDistRef = useRef(0);
  const lastLocRef = useRef(null);
  const dockAnim = useRef(new Animated.Value(0)).current;

  const departure = booking?.taxiRankName || booking?.departureStation || 'Rank';
  const destination = booking?.destinationStation || 'Destination';
  const fare = Number(booking?.totalFare ?? 0);
  const seatsBooked = booking?.seatsBooked ?? 1;
  const vehicleLine = booking?.vehicleRegistration
    ? [booking.vehicleRegistration, booking.vehicleMake, booking.vehicleModel].filter(Boolean).join(' · ')
    : null;

  const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey ?? '';
  const hasKey = apiKey && !apiKey.includes('YOUR_');
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;

  // Geocode destination
  useEffect(() => {
    if (!visible || !destination || !hasKey) return;
    (async () => {
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${apiKey}`);
        const data = await res.json();
        if (data.results?.[0]) setDestinationCoords(data.results[0].geometry.location);
      } catch {}
    })();
  }, [visible, destination, hasKey, apiKey]);

  // Fetch driving route + ETA
  const fetchRoute = useCallback(async (lat, lon) => {
    if (!lat || !lon || !destinationCoords) return;
    if (hasKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat},${lon}&destination=${destinationCoords.lat},${destinationCoords.lng}&mode=driving&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes?.length > 0) {
          setRouteCoords(decodePolyline(data.routes[0].overview_polyline.points));
          setRemainingDistance(data.routes[0].legs[0].distance.text);
          setRemainingTime(data.routes[0].legs[0].duration.text);
          return;
        }
      } catch {}
    }
    // Haversine fallback
    const dist = haversineKm(lat, lon, destinationCoords.lat, destinationCoords.lng);
    const estMin = Math.round((dist / 30) * 60);
    setRemainingDistance(dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`);
    setRemainingTime(estMin < 60 ? `${estMin} min` : `${Math.floor(estMin / 60)}h ${estMin % 60}m`);
  }, [destinationCoords, hasKey, apiKey]);

  useEffect(() => {
    if (destinationCoords && riderPos) fetchRoute(riderPos.latitude, riderPos.longitude);
  }, [destinationCoords, riderPos, fetchRoute]);

  // Main effect: timer + GPS + poll
  useEffect(() => {
    if (!visible || !booking) return;
    setTripEnded(false);
    setDistanceKm(0);
    setRouteCoords([]);
    totalDistRef.current = 0;
    lastLocRef.current = null;

    const startTime = booking.confirmedAt || booking.createdAt;
    timerRef.current = setInterval(() => {
      if (startTime) {
        setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)));
      } else {
        setElapsed(e => e + 1);
      }
    }, 1000);

    // GPS watch
    (async () => {
      try {
        if (Platform.OS === 'web') {
          if (navigator.geolocation) {
            watchRef.current = navigator.geolocation.watchPosition(
              ({ coords }) => {
                const pos = { latitude: coords.latitude, longitude: coords.longitude };
                setRiderPos(pos);
                if (lastLocRef.current) {
                  totalDistRef.current += haversineKm(lastLocRef.current.latitude, lastLocRef.current.longitude, pos.latitude, pos.longitude);
                  setDistanceKm(+totalDistRef.current.toFixed(2));
                }
                lastLocRef.current = pos;
              },
              null,
              { enableHighAccuracy: true, maximumAge: 15000 }
            );
          }
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            watchRef.current = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 50 },
              ({ coords }) => {
                const pos = { latitude: coords.latitude, longitude: coords.longitude };
                setRiderPos(pos);
                if (lastLocRef.current) {
                  totalDistRef.current += haversineKm(lastLocRef.current.latitude, lastLocRef.current.longitude, pos.latitude, pos.longitude);
                  setDistanceKm(+totalDistRef.current.toFixed(2));
                }
                lastLocRef.current = pos;
              }
            );
          }
        }
      } catch {}
    })();

    // Poll booking status every 30 s
    if (userId && booking.id) {
      pollRef.current = setInterval(async () => {
        try {
          const resp = await fetchUserQueueBookings(userId);
          const bks = Array.isArray(resp) ? resp : (resp?.data || []);
          const b = bks.find(x => x.id === booking.id);
          if (b && b.queueStatus !== 'Dispatched') {
            clearInterval(pollRef.current);
            setTripEnded(true);
            onCompleted?.();
          }
        } catch {}
      }, 30000);
    }

    return () => {
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
      if (Platform.OS === 'web') {
        if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
      } else {
        watchRef.current?.remove?.();
      }
    };
  }, [visible, booking?.id, userId]);

  const toggleDock = useCallback(() => {
    const next = !panelDocked;
    setPanelDocked(next);
    Animated.timing(dockAnim, { toValue: next ? 1 : 0, duration: 280, useNativeDriver: true }).start();
  }, [panelDocked, dockAnim]);

  function buildShareText() {
    const lines = [
      tripEnded ? '✅ MzansiFleet — Trip Completed!' : '🚕 MzansiFleet — I\'m on my way!',
      '',
      `🛣️  Route:  ${departure} → ${destination}`,
    ];
    if (vehicleLine) lines.push(`🚌  Vehicle: ${vehicleLine}`);
    if (seatsBooked > 0) lines.push(`💺  Seats:  ${seatsBooked}`);
    if (fare > 0) lines.push(`💰  Fare:   R${fare.toFixed(2)}`);
    lines.push(`⏱️  Time:   ${fmtElapsed(elapsed)}`);
    if (remainingDistance && !tripEnded) lines.push(`📍  Distance left: ${remainingDistance}`);
    if (remainingTime && !tripEnded) lines.push(`🕐  ETA:   ${remainingTime}`);
    if (riderPos) {
      lines.push('');
      lines.push(`📍 My current location:`);
      lines.push(`https://maps.google.com/?q=${riderPos.latitude},${riderPos.longitude}`);
    }
    if (destinationCoords) {
      lines.push('');
      lines.push(`🗺️  Destination on map:`);
      lines.push(`https://maps.google.com/?q=${destinationCoords.lat},${destinationCoords.lng}`);
    }
    lines.push('');
    lines.push('Shared via MzansiFleet 🇿🇦');
    return lines.join('\n');
  }

  async function handleShare() {
    setSharing(true);
    try {
      await Share.share({ message: buildShareText(), title: 'My MzansiFleet Trip' });
    } catch (err) {
      if (!String(err.message).includes('did not share')) Alert.alert('Share failed', err.message);
    } finally {
      setSharing(false);
    }
  }

  async function handleWhatsApp() {
    const text = encodeURIComponent(buildShareText());
    const url = `whatsapp://send?text=${text}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback: web WhatsApp
        const webUrl = `https://wa.me/?text=${text}`;
        if (Platform.OS === 'web') {
          window.open(webUrl, '_blank');
        } else {
          await Linking.openURL(webUrl);
        }
      }
    } catch {
      Alert.alert('WhatsApp not available', 'Please install WhatsApp to share via it.');
    }
  }

  if (!visible || !booking) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} edges={['bottom']}>
        <View style={{ flex: 1 }}>

          {/* ── MAP ── */}
          {Platform.OS !== 'web' && riderPos ? (
            <MapView
              ref={mapRef}
              style={{ width: '100%', height: '100%' }}
              provider={PROVIDER_GOOGLE}
              initialRegion={{ latitude: riderPos.latitude, longitude: riderPos.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass
              followsUserLocation
            >
              {destinationCoords && (
                <Marker coordinate={{ latitude: destinationCoords.lat, longitude: destinationCoords.lng }} title="Destination" description={destination}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
                    <Ionicons name="flag" size={16} color="#fff" />
                  </View>
                </Marker>
              )}
              {routeCoords.length > 0 && (
                <>
                  <Polyline coordinates={routeCoords} strokeColor="rgba(212,175,55,0.25)" strokeWidth={16} />
                  <Polyline coordinates={routeCoords} strokeColor="rgba(212,175,55,0.45)" strokeWidth={10} />
                  <Polyline coordinates={routeCoords} strokeColor={GOLD} strokeWidth={4} />
                </>
              )}
            </MapView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0f172a' }}>
              {riderPos == null && Platform.OS !== 'web' ? (
                <>
                  <ActivityIndicator size="large" color={GOLD} />
                  <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>Getting your location…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="map-outline" size={52} color="#1e293b" />
                  <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600' }}>Map not available on web</Text>
                  <TouchableOpacity onPress={() => window.open(mapsUrl, '_blank')} style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Ionicons name="navigate-outline" size={16} color={GOLD} />
                    <Text style={{ color: GOLD, fontSize: 13, fontWeight: '700' }}>Open in Google Maps</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ── DOCKED SHOW BUTTON ── */}
          {panelDocked && (
            <TouchableOpacity onPress={toggleDock} style={{ position: 'absolute', bottom: insets.bottom + 16, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.95)', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(100,116,139,0.3)' }}>
              <Ionicons name="chevron-up" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>Show Trip Details</Text>
            </TouchableOpacity>
          )}

          {/* ── BOTTOM PANEL ── */}
          <Animated.View
            pointerEvents={panelDocked ? 'none' : 'auto'}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingTop: 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 20, maxHeight: '72%',
              transform: [{ translateY: dockAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }) }],
              opacity: dockAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Dock handle */}
              <TouchableOpacity onPress={toggleDock} style={{ alignItems: 'center', paddingVertical: 6, marginBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#334155' }} />
              </TouchableOpacity>

              {/* Status badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tripEnded ? GREEN : GOLD }} />
                <Text style={{ color: tripEnded ? GREEN : GOLD, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {tripEnded ? 'Trip Completed' : 'Taxi Departed · On Your Way'}
                </Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={handleShare} disabled={sharing} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 8 }}>
                  {sharing
                    ? <ActivityIndicator size="small" color={GOLD} />
                    : <Ionicons name="share-social-outline" size={22} color={GOLD} />
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={handleWhatsApp} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 8 }}>
                  <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Stats row */}
              <View style={{ flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{fmtElapsed(elapsed)}</Text>
                  <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }}>ELAPSED</Text>
                </View>
                <View style={{ width: 1, backgroundColor: '#334155' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{distanceKm.toFixed(1)} km</Text>
                  <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }}>TRAVELLED</Text>
                </View>
                <View style={{ width: 1, backgroundColor: '#334155' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: GOLD }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{fare > 0 ? `R${fare.toFixed(2)}` : '—'}</Text>
                  <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }}>FARE PAID</Text>
                </View>
              </View>

              {/* ETA card */}
              {(remainingDistance || remainingTime) && (
                <View style={{ flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155', gap: 16 }}>
                  {remainingDistance && (
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Ionicons name="navigate-circle-outline" size={22} color={BLUE} />
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', marginTop: 4 }}>{remainingDistance}</Text>
                      <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 2, letterSpacing: 0.5 }}>KM LEFT</Text>
                    </View>
                  )}
                  {remainingTime && (
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={22} color={GREEN} />
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', marginTop: 4 }}>{remainingTime}</Text>
                      <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 2, letterSpacing: 0.5 }}>ETA</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Route card */}
              <View style={{ backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center', paddingTop: 3 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD }} />
                  <View style={{ width: 2, height: 22, backgroundColor: '#334155', marginVertical: 3 }} />
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ef4444' }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Departed From</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 12 }} numberOfLines={2}>{departure}</Text>
                  <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Destination</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }} numberOfLines={2}>{destination}</Text>
                </View>
              </View>

              {/* Vehicle + seats */}
              {(vehicleLine || seatsBooked > 0) && (
                <View style={{ backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155', gap: 8 }}>
                  <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Trip Info</Text>
                  {vehicleLine && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="car" size={14} color={GOLD} />
                      <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>{vehicleLine}</Text>
                    </View>
                  )}
                  {seatsBooked > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="people" size={14} color={GREEN} />
                      <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>{seatsBooked} seat{seatsBooked > 1 ? 's' : ''} booked</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={handleShare}
                  disabled={sharing}
                  style={{ flex: 1, backgroundColor: BLUE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                >
                  {sharing
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="share-social" size={18} color="#fff" /><Text style={{ fontSize: 13, fontWeight: '900', color: '#fff' }}>{tripEnded ? 'Share Receipt' : 'Share Trip'}</Text></>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleWhatsApp}
                  style={{ flex: 1, backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff' }}>WhatsApp</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose} style={{ borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1e293b' }}>
                <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 13 }}>← Back to Dashboard</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>

        </View>
      </SafeAreaView>
    </Modal>
  );
}
