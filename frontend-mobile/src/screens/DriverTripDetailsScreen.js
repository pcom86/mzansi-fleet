import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { getQueueTripDetails, completeQueueTrip } from '../api/queueManagement';

const GOLD = '#D4AF37';
const BG = '#080c14';
const SURFACE = '#0d1624';
const SURFACE2 = '#162035';
const BORDER = '#1e2d45';
const MUTED = '#475569';
const TEXT = '#f1f5f9';
const TEXT2 = '#64748b';

function fmtCurrency(amount) {
  return `R ${Number(amount || 0).toFixed(2)}`;
}

function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getStatusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'dispatched': case 'departed': return '#22c55e';
    case 'loading': return '#f59e0b';
    case 'intransit': return '#3b82f6';
    case 'completed': return '#16a34a';
    case 'cancelled': return '#ef4444';
    default: return '#94a3b8';
  }
}

function getStatusLabel(status) {
  const s = (status || '').toLowerCase();
  if (s === 'dispatched' || s === 'departed') return 'EN ROUTE';
  if (s === 'intransit') return 'IN TRANSIT';
  if (s === 'completed') return 'COMPLETED';
  if (s === 'cancelled') return 'CANCELLED';
  return (status || 'UNKNOWN').toUpperCase();
}

export default function DriverTripDetailsScreen({ navigation, route }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { queueEntryId, tripId, driverProfileId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tripData, setTripData] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [completionFare, setCompletionFare] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const loadTripDetails = useCallback(async () => {
    if (!queueEntryId && !tripId) return;
    try {
      if (tripId) {
        const resp = await client.get(`/TaxiRankTrips/${tripId}/details`);
        const d = resp.data;
        setTripData({
          queueEntry: {
            vehicle: d.trip?.vehicle,
            driver: d.trip?.driver,
            queuePosition: null,
            joinedAt: null,
            departedAt: d.trip?.departureTime,
          },
          trip: d.trip,
          passengers: d.passengers || [],
          costs: d.costs || [],
          summary: d.summary || {},
        });
      } else {
        const data = await getQueueTripDetails(queueEntryId);
        setTripData(data);
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to load trip details');
    }
  }, [queueEntryId, tripId]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      await loadTripDetails();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [loadTripDetails]);

  useFocusEffect(useCallback(() => { loadTripDetails(); }, [loadTripDetails]));

  async function handleCompleteTrip() {
    if (!tripData?.trip?.id) return;
    try {
      setCompleting(true);
      const completionData = {
        Notes: completionNotes,
        CompletedByDriverId: driverProfileId || user?.driverProfile?.id || user?.id,
        CompletedAt: new Date().toISOString(),
        TotalAmount: completionFare ? parseFloat(completionFare) : undefined,
      };
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          if (pos?.coords) {
            completionData.Latitude = pos.coords.latitude;
            completionData.Longitude = pos.coords.longitude;
          }
        } catch {}
      }
      if (tripId) {
        await client.put(`/TaxiRankTrips/${tripData.trip.id}/complete`, completionData);
      } else {
        await completeQueueTrip(queueEntryId, completionData);
      }
      Alert.alert('Trip Completed', 'Trip has been completed successfully.', [{
        text: 'OK', onPress: () => { setSheetVisible(false); setCompletionNotes(''); setCompletionFare(''); navigation.goBack(); },
      }]);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to complete trip');
    } finally {
      setCompleting(false);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <View style={[st.root, st.center, { paddingTop: insets.top }]}>
        <View style={st.loadingRing}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
        <Text style={st.loadingTitle}>Trip Details</Text>
        <Text style={st.loadingTxt}>Loading trip information…</Text>
      </View>
    );
  }

  if (!tripData) {
    return (
      <View style={[st.root, st.center, { paddingTop: insets.top }]}>
        <View style={st.emptyCircle}>
          <Ionicons name="document-text-outline" size={28} color={MUTED} />
        </View>
        <Text style={st.emptyTitle}>Trip not found</Text>
        <Text style={st.emptySub}>The trip details could not be loaded.</Text>
        <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={GOLD} />
          <Text style={st.backBtnTxt}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { queueEntry, trip, passengers, costs, summary } = tripData;
  const vehicle = trip?.vehicle || queueEntry?.vehicle;
  const sc = getStatusColor(trip?.status);
  const isActive = trip?.status !== 'Completed' && trip?.status !== 'Cancelled';
  const canComplete = isActive && user?.role !== 'Owner';

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={st.hdr}>
        <TouchableOpacity style={st.hdrBack} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.hdrTitle}>Trip Details</Text>
          {trip?.taxiRank?.name && (
            <Text style={st.hdrSub} numberOfLines={1}>{trip.taxiRank.name}</Text>
          )}
        </View>
        <TouchableOpacity
          style={st.hdrRefresh}
          onPress={async () => { setRefreshing(true); await loadTripDetails(); setRefreshing(false); }}
          hitSlop={10}
        >
          {refreshing
            ? <ActivityIndicator size="small" color={GOLD} />
            : <Ionicons name="refresh-outline" size={19} color={TEXT2} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadTripDetails} tintColor={GOLD} />}
      >
        {/* ══ ROUTE HERO ══ */}
        <View style={[st.routeHero, { borderBottomColor: sc + '40' }]}>
          <View style={[st.routeHeroStripe, { backgroundColor: sc }]} />
          <View style={st.routeHeroInner}>
            {/* Status + time row */}
            <View style={st.heroTopRow}>
              <View style={[st.heroBadge, { backgroundColor: sc + '22', borderColor: sc + '55' }]}>
                <Text style={[st.heroBadgeTxt, { color: sc }]}>{getStatusLabel(trip?.status)}</Text>
              </View>
              {trip?.departureTime && (
                <View style={st.heroTimePill}>
                  <Ionicons name="time-outline" size={12} color={TEXT2} />
                  <Text style={st.heroTimeTxt}>{fmtDateTime(trip.departureTime)}</Text>
                </View>
              )}
            </View>

            {/* Route visualiser */}
            <View style={st.heroRouteBlock}>
              <View style={st.heroRouteLeft}>
                <View style={[st.heroRouteDot, { backgroundColor: '#22c55e' }]} />
                <View style={st.heroRouteLine} />
                <View style={[st.heroRouteSquare, { backgroundColor: '#ef4444' }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.heroStation}>{trip?.departureStation || '—'}</Text>
                <Text style={[st.heroStation, { marginTop: 12, color: TEXT2 }]}>{trip?.destinationStation || '—'}</Text>
              </View>
            </View>

            {/* Timing pills */}
            <View style={st.heroPillRow}>
              {trip?.departureTime && (
                <View style={st.heroPill}>
                  <Ionicons name="log-out-outline" size={12} color="#22c55e" />
                  <Text style={[st.heroPillTxt, { color: '#22c55e' }]}>
                    Dep {fmtDateTime(trip.departureTime)}
                  </Text>
                </View>
              )}
              {trip?.arrivalTime && (
                <View style={st.heroPill}>
                  <Ionicons name="log-in-outline" size={12} color={GOLD} />
                  <Text style={[st.heroPillTxt, { color: GOLD }]}>
                    Arr {fmtDateTime(trip.arrivalTime)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ══ FINANCIAL SUMMARY ══ */}
        {(summary?.totalEarnings > 0 || summary?.netEarnings !== undefined) && (
          <View style={st.finCard}>
            <View style={st.finCardTop}>
              <Text style={st.finLabel}>NET EARNINGS</Text>
              <Text style={st.finNet}>R {Number(summary?.netEarnings || 0).toFixed(2)}</Text>
            </View>
            <View style={st.finDivider} />
            <View style={st.finBreakdown}>
              <View style={st.finItem}>
                <Text style={st.finItemLabel}>Total</Text>
                <Text style={[st.finItemVal, { color: '#22c55e' }]}>
                  R {Number(summary?.totalEarnings || 0).toFixed(2)}
                </Text>
              </View>
              <View style={st.finItemDivider} />
              <View style={st.finItem}>
                <Ionicons name="cash-outline" size={11} color={MUTED} />
                <Text style={st.finItemLabel}>Cash</Text>
                <Text style={st.finItemVal}>R {Number(summary?.cashEarnings || 0).toFixed(2)}</Text>
              </View>
              <View style={st.finItemDivider} />
              <View style={st.finItem}>
                <Ionicons name="card-outline" size={11} color={MUTED} />
                <Text style={st.finItemLabel}>Card</Text>
                <Text style={st.finItemVal}>R {Number(summary?.cardEarnings || 0).toFixed(2)}</Text>
              </View>
              {(summary?.totalCosts ?? 0) > 0 && (
                <>
                  <View style={st.finItemDivider} />
                  <View style={st.finItem}>
                    <Ionicons name="remove-circle-outline" size={11} color="#ef4444" />
                    <Text style={st.finItemLabel}>Costs</Text>
                    <Text style={[st.finItemVal, { color: '#ef4444' }]}>
                      - R {Number(summary.totalCosts).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* ══ VEHICLE ══ */}
        {vehicle && (
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <View style={st.sectionIconWrap}>
                <Ionicons name="car-outline" size={16} color={GOLD} />
              </View>
              <Text style={st.sectionTitle}>Vehicle</Text>
            </View>
            <View style={st.vehicleRow}>
              <Text style={st.vehicleReg}>{vehicle.registration || '—'}</Text>
              {(vehicle.make || vehicle.model) && (
                <Text style={st.vehicleDesc}>
                  {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                </Text>
              )}
            </View>
            <View style={st.vehiclePills}>
              {vehicle.type && (
                <View style={st.infoPill}>
                  <Text style={st.infoPillTxt}>{vehicle.type}</Text>
                </View>
              )}
              {vehicle.capacity && (
                <View style={st.infoPill}>
                  <Ionicons name="people-outline" size={11} color={TEXT2} />
                  <Text style={st.infoPillTxt}>{vehicle.capacity} seats</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ══ DRIVER & MARSHAL ══ */}
        {(trip?.driver || trip?.marshal) && (
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <View style={st.sectionIconWrap}>
                <Ionicons name="person-outline" size={16} color={GOLD} />
              </View>
              <Text style={st.sectionTitle}>People</Text>
            </View>
            {trip.driver && (
              <View style={st.personRow}>
                <View style={st.personAvatar}>
                  <Ionicons name="person" size={14} color={TEXT2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.personName}>{trip.driver.name || '—'}</Text>
                  <Text style={st.personRole}>Driver{trip.driver.phone ? `  ·  ${trip.driver.phone}` : ''}</Text>
                </View>
              </View>
            )}
            {trip.marshal && (
              <View style={[st.personRow, trip.driver && { marginTop: 10 }]}>
                <View style={[st.personAvatar, { backgroundColor: GOLD + '22' }]}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.personName}>{trip.marshal.fullName || trip.marshal.name || '—'}</Text>
                  <Text style={st.personRole}>
                    Marshal{trip.marshal.phoneNumber ? `  ·  ${trip.marshal.phoneNumber}` : ''}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ══ QUEUE INFO ══ */}
        {queueEntry?.queuePosition && (
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <View style={st.sectionIconWrap}>
                <Ionicons name="list-outline" size={16} color={GOLD} />
              </View>
              <Text style={st.sectionTitle}>Queue Info</Text>
            </View>
            <View style={st.infoGrid}>
              <View style={st.infoGridItem}>
                <Text style={st.infoGridNum}>#{queueEntry.queuePosition}</Text>
                <Text style={st.infoGridLbl}>Position</Text>
              </View>
              {queueEntry.joinedAt && (
                <View style={st.infoGridItem}>
                  <Text style={st.infoGridNum}>{fmtDateTime(queueEntry.joinedAt)}</Text>
                  <Text style={st.infoGridLbl}>Joined</Text>
                </View>
              )}
              {queueEntry.departedAt && (
                <View style={st.infoGridItem}>
                  <Text style={st.infoGridNum}>{fmtDateTime(queueEntry.departedAt)}</Text>
                  <Text style={st.infoGridLbl}>Departed</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ══ PASSENGERS ══ */}
        <View style={st.sectionCard}>
          <View style={st.sectionHeader}>
            <View style={st.sectionIconWrap}>
              <Ionicons name="people-outline" size={16} color={GOLD} />
            </View>
            <Text style={st.sectionTitle}>Passengers</Text>
            <View style={st.sectionBubble}>
              <Text style={st.sectionBubbleTxt}>{passengers.length}</Text>
            </View>
          </View>
          {passengers.length === 0 ? (
            <Text style={st.emptyInline}>No passengers recorded for this trip</Text>
          ) : (
            passengers.map((pax, idx) => (
              <View key={pax.id || idx} style={[st.paxRow, idx > 0 && { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 10, paddingTop: 10 }]}>
                <View style={{ flex: 1 }}>
                  <View style={st.paxNameRow}>
                    <Text style={st.paxName}>{pax.passengerName || 'Unknown'}</Text>
                    {pax.amount > 0 && (
                      <Text style={st.paxFare}>R {Number(pax.amount).toFixed(2)}</Text>
                    )}
                  </View>
                  <View style={st.paxMeta}>
                    {pax.passengerPhone && (
                      <View style={st.paxPill}>
                        <Ionicons name="call-outline" size={11} color={MUTED} />
                        <Text style={st.paxPillTxt}>{pax.passengerPhone}</Text>
                      </View>
                    )}
                    {(pax.departureStation || pax.arrivalStation) && (
                      <View style={st.paxPill}>
                        <Ionicons name="navigate-outline" size={11} color={MUTED} />
                        <Text style={st.paxPillTxt} numberOfLines={1}>
                          {[pax.departureStation, pax.arrivalStation].filter(Boolean).join(' → ')}
                        </Text>
                      </View>
                    )}
                    {pax.paymentMethod && (
                      <View style={st.paxPill}>
                        <Ionicons name={pax.paymentMethod === 'Card' ? 'card-outline' : 'cash-outline'} size={11} color={MUTED} />
                        <Text style={st.paxPillTxt}>{pax.paymentMethod}</Text>
                      </View>
                    )}
                    {pax.seatNumber && (
                      <View style={st.paxPill}>
                        <Text style={st.paxPillTxt}>Seat {pax.seatNumber}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ══ COSTS ══ */}
        {costs.length > 0 && (
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <View style={[st.sectionIconWrap, { backgroundColor: '#ef444422' }]}>
                <Ionicons name="remove-circle-outline" size={16} color="#ef4444" />
              </View>
              <Text style={st.sectionTitle}>Trip Costs</Text>
              <View style={[st.sectionBubble, { backgroundColor: '#ef444422', borderColor: '#ef444444' }]}>
                <Text style={[st.sectionBubbleTxt, { color: '#ef4444' }]}>{costs.length}</Text>
              </View>
            </View>
            {costs.map((cost, idx) => (
              <View key={cost.id || idx} style={[st.costRow, idx > 0 && { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 10, paddingTop: 10 }]}>
                <View style={{ flex: 1 }}>
                  <View style={st.costNameRow}>
                    <Text style={st.costCat}>{cost.category || '—'}</Text>
                    <Text style={st.costAmt}>- R {Number(cost.amount || 0).toFixed(2)}</Text>
                  </View>
                  {cost.description && (
                    <Text style={st.costDesc}>{cost.description}</Text>
                  )}
                  {cost.receiptNumber && (
                    <Text style={st.costReceipt}>Receipt: {cost.receiptNumber}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ══ COMPLETE TRIP BUTTON ══ */}
        {canComplete && (
          <TouchableOpacity
            style={st.completeBtn}
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={st.completeBtnTxt}>Complete Trip</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ══ COMPLETE TRIP BOTTOM SHEET ══ */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!completing) setSheetVisible(false); }}
      >
        <View style={st.ctOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { if (!completing) setSheetVisible(false); }} />
          <View style={st.ctSheet}>
            <View style={st.ctHandle} />

            <View style={st.ctHeaderRow}>
              <View style={st.ctHeaderIcon}>
                <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.ctTitle}>Complete Trip</Text>
                <Text style={st.ctSub} numberOfLines={1}>
                  {vehicle?.registration || '—'}
                  {trip?.departureStation ? `  ·  ${trip.departureStation}` : ''}
                </Text>
              </View>
            </View>

            <Text style={st.ctLabel}>Total Fare Collected</Text>
            <View style={st.ctFareRow}>
              <View style={st.ctCurrencyBox}>
                <Text style={st.ctCurrency}>R</Text>
              </View>
              <TextInput
                style={st.ctFareInput}
                placeholder="0.00"
                placeholderTextColor={MUTED}
                value={completionFare}
                onChangeText={setCompletionFare}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={[st.ctLabel, { marginTop: 14 }]}>
              Notes{'  '}<Text style={{ fontWeight: '400', color: MUTED }}>(optional)</Text>
            </Text>
            <TextInput
              style={st.ctNotesInput}
              placeholder="Add completion notes…"
              placeholderTextColor={MUTED}
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
              numberOfLines={2}
            />

            <View style={st.ctBtnRow}>
              <TouchableOpacity
                style={st.ctCancelBtn}
                onPress={() => setSheetVisible(false)}
                disabled={completing}
              >
                <Text style={st.ctCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.ctConfirmBtn, completing && { opacity: 0.65 }]}
                onPress={handleCompleteTrip}
                disabled={completing}
              >
                {completing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={st.ctConfirmTxt}>Complete Trip</Text>
                    </>
                  )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: 'center', justifyContent: 'center' },

  loadingRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  loadingTitle: { fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 4 },
  loadingTxt: { color: TEXT2, fontSize: 13, fontWeight: '500' },

  emptyCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 6 },
  emptySub: { fontSize: 13, color: TEXT2, textAlign: 'center', lineHeight: 20, paddingHorizontal: 36, marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: GOLD + '60', backgroundColor: SURFACE },
  backBtnTxt: { fontSize: 13, fontWeight: '700', color: GOLD },

  hdr: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  hdrBack: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  hdrTitle: { fontSize: 17, fontWeight: '900', color: TEXT },
  hdrSub: { fontSize: 10, fontWeight: '700', color: GOLD, marginTop: 1, letterSpacing: 0.4 },
  hdrRefresh: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },

  scroll: { flex: 1 },
  scrollInner: { padding: 14 },

  // ── Route hero ──
  routeHero: {
    backgroundColor: SURFACE, borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  routeHeroStripe: { height: 3 },
  routeHeroInner: { padding: 16 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  heroBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  heroTimePill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroTimeTxt: { fontSize: 12, fontWeight: '600', color: TEXT2 },
  heroRouteBlock: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  heroRouteLeft: { alignItems: 'center', paddingTop: 4 },
  heroRouteDot: { width: 9, height: 9, borderRadius: 5 },
  heroRouteLine: { width: 2, flex: 1, backgroundColor: BORDER, marginVertical: 4 },
  heroRouteSquare: { width: 8, height: 8, borderRadius: 2 },
  heroStation: { fontSize: 16, fontWeight: '800', color: TEXT, lineHeight: 20 },
  heroPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: SURFACE2, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  heroPillTxt: { fontSize: 11, fontWeight: '700', color: TEXT2 },

  // ── Financial card ──
  finCard: {
    backgroundColor: '#071a0f', borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#22c55e30', overflow: 'hidden',
  },
  finCardTop: { padding: 16, paddingBottom: 12 },
  finLabel: { fontSize: 10, fontWeight: '900', color: '#22c55e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  finNet: { fontSize: 34, fontWeight: '900', color: '#22c55e' },
  finDivider: { height: 1, backgroundColor: '#22c55e20', marginHorizontal: 16 },
  finBreakdown: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 0 },
  finItem: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 3 },
  finItemLabel: { fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  finItemVal: { fontSize: 14, fontWeight: '900', color: TEXT },
  finItemDivider: { width: 1, backgroundColor: BORDER, alignSelf: 'stretch', marginVertical: 6 },

  // ── Section card ──
  sectionCard: {
    backgroundColor: SURFACE, borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: BORDER, padding: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: GOLD + '1a', alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: TEXT },
  sectionBubble: {
    backgroundColor: GOLD + '22', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: GOLD + '44',
  },
  sectionBubbleTxt: { fontSize: 11, fontWeight: '900', color: GOLD },

  // ── Vehicle ──
  vehicleRow: { marginBottom: 10 },
  vehicleReg: { fontSize: 22, fontWeight: '900', color: TEXT, letterSpacing: 0.4 },
  vehicleDesc: { fontSize: 13, color: TEXT2, marginTop: 2 },
  vehiclePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  infoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SURFACE2, borderRadius: 18, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  infoPillTxt: { fontSize: 11, fontWeight: '700', color: TEXT2 },

  // ── People ──
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  personName: { fontSize: 14, fontWeight: '800', color: TEXT },
  personRole: { fontSize: 12, color: TEXT2, marginTop: 1 },

  // ── Queue info grid ──
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoGridItem: {
    flex: 1, minWidth: 80, backgroundColor: SURFACE2, borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center',
  },
  infoGridNum: { fontSize: 13, fontWeight: '900', color: TEXT, textAlign: 'center' },
  infoGridLbl: { fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  // ── Passengers ──
  paxRow: {},
  paxNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  paxName: { fontSize: 14, fontWeight: '800', color: TEXT },
  paxFare: { fontSize: 14, fontWeight: '900', color: '#22c55e' },
  paxMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  paxPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SURFACE2, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: BORDER,
  },
  paxPillTxt: { fontSize: 11, fontWeight: '700', color: TEXT2 },
  emptyInline: { fontSize: 13, color: TEXT2, textAlign: 'center', paddingVertical: 8 },

  // ── Costs ──
  costRow: {},
  costNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  costCat: { fontSize: 14, fontWeight: '800', color: TEXT },
  costAmt: { fontSize: 14, fontWeight: '900', color: '#ef4444' },
  costDesc: { fontSize: 12, color: TEXT2 },
  costReceipt: { fontSize: 11, color: MUTED, marginTop: 2 },

  // ── Complete button ──
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#16a34a', borderRadius: 16, paddingVertical: 16, marginTop: 4,
  },
  completeBtnTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },

  // ── Bottom sheet ──
  ctOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  ctSheet: {
    backgroundColor: '#0d1624', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderColor: '#1e2d45',
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 24,
  },
  ctHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#1e2d45', alignSelf: 'center', marginBottom: 22 },
  ctHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  ctHeaderIcon: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#22c55e33',
  },
  ctTitle: { fontSize: 18, fontWeight: '900', color: TEXT },
  ctSub: { fontSize: 12, color: MUTED, marginTop: 3, fontWeight: '600' },
  ctLabel: { fontSize: 10, fontWeight: '900', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  ctFareRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE2, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 4, overflow: 'hidden',
  },
  ctCurrencyBox: {
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#162035', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: BORDER,
  },
  ctCurrency: { fontSize: 20, fontWeight: '900', color: '#22c55e' },
  ctFareInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, fontWeight: '900', color: TEXT },
  ctNotesInput: {
    backgroundColor: SURFACE2, borderRadius: 14, padding: 14,
    fontSize: 14, color: TEXT, borderWidth: 1, borderColor: BORDER,
    marginBottom: 20, minHeight: 60, textAlignVertical: 'top',
  },
  ctBtnRow: { flexDirection: 'row', gap: 10 },
  ctCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER,
  },
  ctCancelTxt: { color: TEXT2, fontWeight: '700', fontSize: 15 },
  ctConfirmBtn: {
    flex: 1.8, flexDirection: 'row', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a',
  },
  ctConfirmTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
