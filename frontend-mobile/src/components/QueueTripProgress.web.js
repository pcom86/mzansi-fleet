import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, Share, Alert, Animated, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { fetchUserQueueBookings } from '../api/taxiRanks';

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
  const [tripEnded, setTripEnded] = useState(false);
  const [sharing, setSharing] = useState(false);

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const watchRef = useRef(null);
  const totalDistRef = useRef(0);
  const lastLocRef = useRef(null);

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

  // Recalculate ETA when position or destination changes
  useEffect(() => {
    if (!riderPos || !destinationCoords) return;
    const dist = haversineKm(riderPos.latitude, riderPos.longitude, destinationCoords.lat, destinationCoords.lng);
    const estMin = Math.round((dist / 30) * 60);
    setRemainingDistance(dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`);
    setRemainingTime(estMin < 60 ? `${estMin} min` : `${Math.floor(estMin / 60)}h ${estMin % 60}m`);
  }, [riderPos, destinationCoords]);

  // Main effect: timer + browser GPS + poll
  useEffect(() => {
    if (!visible || !booking) return;
    setTripEnded(false);
    setDistanceKm(0);
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

    // Web GPS via navigator.geolocation
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

    // Poll booking every 30 s
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
      if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
    };
  }, [visible, booking?.id, userId]);

  function buildShareText() {
    const lines = [
      tripEnded ? 'MzansiFleet - Trip Completed!' : 'MzansiFleet - I\'m on my way!',
      '',
      `Route:  ${departure} -> ${destination}`,
    ];
    if (vehicleLine) lines.push(`Vehicle: ${vehicleLine}`);
    if (seatsBooked > 0) lines.push(`Seats:  ${seatsBooked}`);
    if (fare > 0) lines.push(`Fare:   R${fare.toFixed(2)}`);
    lines.push(`Time:   ${fmtElapsed(elapsed)}`);
    if (remainingDistance && !tripEnded) lines.push(`Distance left: ${remainingDistance}`);
    if (remainingTime && !tripEnded) lines.push(`ETA:   ${remainingTime}`);
    if (riderPos) {
      lines.push('');
      lines.push(`My current location:`);
      lines.push(`https://maps.google.com/?q=${riderPos.latitude},${riderPos.longitude}`);
    }
    lines.push('');
    lines.push('Shared via MzansiFleet');
    return lines.join('\n');
  }

  async function handleShare() {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My MzansiFleet Trip', text: buildShareText() });
      } else {
        await navigator.clipboard.writeText(buildShareText());
        alert('Trip details copied to clipboard!');
      }
    } catch (err) {
      if (!String(err).includes('AbortError')) console.warn('Share failed', err);
    } finally {
      setSharing(false);
    }
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  if (!visible || !booking) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tripEnded ? GREEN : GOLD, marginRight: 8 }} />
            <Text style={{ color: tripEnded ? GREEN : GOLD, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
              {tripEnded ? 'Trip Completed' : 'Taxi Departed · On Your Way'}
            </Text>
            <TouchableOpacity onPress={handleShare} disabled={sharing} style={{ marginRight: 12 }}>
              {sharing
                ? <ActivityIndicator size="small" color={GOLD} />
                : <Ionicons name="share-social-outline" size={22} color={GOLD} />
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={handleWhatsApp} style={{ marginRight: 12 }}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
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
              <Text style={{ fontSize: 22, fontWeight: '900', color: GOLD }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{fare > 0 ? `R${fare.toFixed(2)}` : '--'}</Text>
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

          {/* Map placeholder with open-in-maps */}
          <TouchableOpacity
            onPress={() => window.open(mapsUrl, '_blank')}
            style={{ backgroundColor: '#1e293b', borderRadius: 14, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center', gap: 8 }}
          >
            <Ionicons name="map-outline" size={36} color="#334155" />
            <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600' }}>Map not available on web</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 }}>
              <Ionicons name="navigate-outline" size={16} color={GOLD} />
              <Text style={{ color: GOLD, fontSize: 13, fontWeight: '700' }}>Open in Google Maps</Text>
            </View>
          </TouchableOpacity>

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

          {/* Share buttons */}
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
            <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 13 }}>Back to Dashboard</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
