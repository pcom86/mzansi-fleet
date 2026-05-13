import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Alert,
  ActivityIndicator, TextInput, ScrollView, StyleSheet, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import client from '../api/client';
import { completeTripRequest, cancelTripRequest } from '../api/tripRequests';
import { completeTrip } from '../api/taxiRanks';
import { completeQueueTrip } from '../api/queueManagement';

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#D4AF3718';

function fmtElapsed(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ActiveTripNavigator({ visible, req, driverId, vehicleId, onDone, onCancel, c }) {
  const [elapsed, setElapsed] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [panel, setPanel] = useState('nav');
  const [distInput, setDistInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [fareInput, setFareInput] = useState('');
  const [driverPos, setDriverPos] = useState(null);
  const [distanceKm, setDistanceKm] = useState(0);

  const timerRef = useRef(null);
  const watchRef = useRef(null);
  const lastPosRef = useRef(null);
  const totalDistRef = useRef(0);

  const destAddr = req ? (req.dropoffLocation ?? req.DropoffLocation ?? 'Destination') : '';
  const pickupAddr = req ? (req.pickupLocation ?? req.PickupLocation ?? 'Pickup') : '';
  const agreedFare = req ? Number(req.totalPrice ?? req.TotalPrice ?? 0) : 0;
  // For taxi rank trips, use fareAmount from dispatch data
  const taxiRankFare = req ? Number(req.fareAmount ?? req.totalAmount ?? 0) : 0;
  const isTaxiRankTrip = req?.tripType === 'TaxiRankTrip' || taxiRankFare > 0;
  const ratePerKm = req ? Number(req.ratePerKm ?? req.RatePerKm ?? 0) : 0;
  const destLat = req ? Number(req.dropoffLatitude ?? req.DropoffLatitude ?? 0) : 0;
  const destLon = req ? Number(req.dropoffLongitude ?? req.DropoffLongitude ?? 0) : 0;

  const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey ?? '';
  const hasKey = apiKey && !apiKey.includes('YOUR_');

  const mapsUrl = destLat && destLon
    ? `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destAddr)}&travelmode=driving`;

  const staticMapUrl = hasKey && driverPos && destLat && destLon
    ? `https://maps.googleapis.com/maps/api/staticmap?size=640x320&maptype=roadmap` +
      `&markers=color:0x22c55e|label:+|${driverPos.latitude},${driverPos.longitude}` +
      `&markers=color:0xef4444|label:D|${destLat},${destLon}` +
      `&path=color:0x3b82f6ff|weight:4|${driverPos.latitude},${driverPos.longitude}|${destLat},${destLon}` +
      `&key=${apiKey}`
    : hasKey && destLat && destLon
      ? `https://maps.googleapis.com/maps/api/staticmap?size=640x320&maptype=roadmap` +
        `&markers=color:0xef4444|label:D|${destLat},${destLon}` +
        `&zoom=14&center=${destLat},${destLon}&key=${apiKey}`
      : null;

  useEffect(() => {
    if (!visible || !req) return;
    setElapsed(0);
    setDistanceKm(0);
    totalDistRef.current = 0;
    lastPosRef.current = null;
    setPanel('nav');
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const pos = { latitude: coords.latitude, longitude: coords.longitude };
          setDriverPos(pos);
          if (lastPosRef.current) {
            totalDistRef.current += haversineKm(
              lastPosRef.current.latitude, lastPosRef.current.longitude,
              pos.latitude, pos.longitude
            );
            setDistanceKm(+totalDistRef.current.toFixed(2));
          }
          lastPosRef.current = pos;
        },
        null,
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      clearInterval(timerRef.current);
      if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
    };
  }, [visible, req]);

  function openCompletePanel() {
    const dist = distanceKm > 0.01 ? distanceKm.toFixed(2) : '';
    const rate = ratePerKm > 0 ? ratePerKm.toFixed(2) : '';
    const auto = dist && rate ? (parseFloat(dist) * parseFloat(rate)).toFixed(2) : '';
    setDistInput(dist);
    setRateInput(rate);
    // For taxi rank trips, use the fare amount from dispatch data
    const fareToUse = isTaxiRankTrip && taxiRankFare > 0 ? taxiRankFare.toFixed(2) : (agreedFare > 0 ? agreedFare.toFixed(2) : auto);
    setFareInput(fareToUse);
    setPanel('complete');
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
          description: addr ? `Trip to ${addr}` : 'Trip completed',
          date: new Date().toISOString(),
          period: 'Daily',
        });
      }
      clearInterval(timerRef.current);
      if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
      onDone?.(total);
    } catch (err) {
      Alert.alert('Error', err?.response?.data || err?.message || 'Failed to complete trip');
    } finally {
      setCompleting(false);
    }
  }

  function confirmCancel() {
    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel this trip?',
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Cancel Trip', style: 'destructive', onPress: doCancel },
      ]
    );
  }

  async function doCancel() {
    if (!req) return;
    const id = req.id ?? req.Id;
    setCancelling(true);
    try {
      await cancelTripRequest(id);
      clearInterval(timerRef.current);
      if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
      onCancel?.();
    } catch (err) {
      Alert.alert('Error', err?.response?.data || err?.message || 'Failed to cancel trip');
    } finally {
      setCancelling(false);
    }
  }

  if (!visible || !req) return null;

  const estFare = isTaxiRankTrip && taxiRankFare > 0
    ? taxiRankFare.toFixed(2)
    : distanceKm > 0 && ratePerKm > 0
    ? (distanceKm * ratePerKm).toFixed(2)
    : agreedFare > 0 ? agreedFare.toFixed(2) : null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#020617' }}>

        {/* ── Header ── */}
        <View style={{ backgroundColor: '#0f172a', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#22c55e20', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="car" size={20} color="#22c55e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {panel === 'complete' ? 'Complete Trip' : 'Trip In Progress'}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff' }} numberOfLines={1}>{destAddr}</Text>
            </View>
            {/* Live status dot */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#22c55e15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' }} />
              <Text style={{ fontSize: 11, color: '#22c55e', fontWeight: '700' }}>LIVE</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── MAP ── */}
          <View style={{ height: 220, backgroundColor: '#0f172a', position: 'relative' }}>
            {staticMapUrl ? (
              <Image
                source={{ uri: staticMapUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="map-outline" size={40} color="#1e293b" />
                <Text style={{ color: '#334155', fontSize: 12, fontWeight: '600' }}>Map unavailable — add a Google Maps API key</Text>
              </View>
            )}
            {/* Destination badge */}
            <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(2,6,23,0.85)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#ef4444' }} />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{destAddr}</Text>
            </View>
            {/* Open full maps button */}
            <TouchableOpacity
              style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(2,6,23,0.85)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}
              onPress={() => window.open(mapsUrl, '_blank')}
            >
              <Ionicons name="navigate" size={13} color="#3b82f6" />
              <Text style={{ color: '#3b82f6', fontSize: 11, fontWeight: '700' }}>Navigate</Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            {/* ── Route strip ── */}
            <View style={{ backgroundColor: '#0f172a', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ alignItems: 'center', paddingTop: 3 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' }} />
                <View style={{ width: 2, height: 22, backgroundColor: '#1e293b', marginVertical: 3 }} />
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ef4444' }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Pickup</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 14 }} numberOfLines={1}>{pickupAddr}</Text>
                <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Destination</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }} numberOfLines={1}>{destAddr}</Text>
              </View>
            </View>

          {/* ── Stats ── */}
          <View style={{ flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1e293b' }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{fmtElapsed(elapsed)}</Text>
              <Text style={{ fontSize: 9, color: '#475569', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }}>ELAPSED</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#1e293b' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{distanceKm.toFixed(1)} km</Text>
              <Text style={{ fontSize: 9, color: '#475569', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }}>DISTANCE</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#1e293b' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: GOLD }}>{estFare ? `R${estFare}` : '—'}</Text>
              <Text style={{ fontSize: 9, color: '#475569', fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }}>FARE EST.</Text>
            </View>
          </View>

          {panel === 'nav' && (
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={{ backgroundColor: GOLD, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}
                onPress={openCompletePanel}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={20} color="#000" />
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#000' }}>Arrived — Complete Trip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#ef444440', backgroundColor: '#ef444410' }}
                onPress={confirmCancel}
                disabled={cancelling}
                activeOpacity={0.85}
              >
                {cancelling
                  ? <ActivityIndicator size="small" color="#ef4444" />
                  : <><Ionicons name="close-circle" size={18} color="#ef4444" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ef4444' }}>Cancel Trip</Text></>
                }
              </TouchableOpacity>
            </View>
          )}

          {panel === 'complete' && (
            <View style={{ backgroundColor: '#0f172a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1e293b' }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 16 }}>Record Earnings</Text>

              <Text style={styles.inputLabel}>Distance (km)</Text>
              <TextInput
                value={distInput}
                onChangeText={v => {
                  setDistInput(v);
                  const d = parseFloat(v) || 0;
                  const r = parseFloat(rateInput) || 0;
                  if (d > 0 && r > 0) setFareInput((d * r).toFixed(2));
                }}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#475569"
              />

              <Text style={styles.inputLabel}>Rate per km (R)</Text>
              <TextInput
                value={rateInput}
                onChangeText={v => {
                  setRateInput(v);
                  const d = parseFloat(distInput) || 0;
                  const r = parseFloat(v) || 0;
                  if (d > 0 && r > 0) setFareInput((d * r).toFixed(2));
                }}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#475569"
              />

              <Text style={styles.inputLabel}>Total Fare (R)</Text>
              <TextInput
                value={fareInput}
                onChangeText={setFareInput}
                style={[styles.input, { borderColor: GOLD, color: GOLD, fontSize: 20, fontWeight: '900', backgroundColor: GOLD_LIGHT }]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={GOLD + '50'}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1e293b' }}
                  onPress={() => setPanel('nav')}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: GOLD, opacity: completing ? 0.7 : 1 }}
                  onPress={handleConfirmEarnings}
                  disabled={completing}
                  activeOpacity={0.85}
                >
                  {completing
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>Confirm & Record Earnings</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
          </View>{/* end padding wrapper */}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  inputLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: '#020617',
    color: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 15,
  },
});
