import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, StyleSheet, RefreshControl, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const GREEN = '#28a745';
const BLUE = '#0d6efd';

export default function PassengerSearchScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const taxiRankId = route.params?.taxiRankId;

  const [searchQuery, setSearchQuery] = useState('');
  const [passengers, setPassengers] = useState([]);
  const [recentPassengers, setRecentPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => { loadRecent(); }, []);

  const loadRecent = async () => {
    try {
      setLoading(true);
      const params = { limit: 30 };
      if (taxiRankId) params.taxiRankId = taxiRankId;
      const res = await client.get('/Passengers/recent', { params });
      setRecentPassengers(res.data || []);
    } catch (e) { console.error('Load recent passengers:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setPassengers([]); return; }
    try {
      setSearching(true);
      const params = { q };
      if (taxiRankId) params.taxiRankId = taxiRankId;
      const res = await client.get('/Passengers/search', { params });
      setPassengers(res.data || []);
    } catch (e) { console.error('Search passengers:', e); }
    finally { setSearching(false); }
  }, [taxiRankId]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery, doSearch]);

  const viewDetails = async (p) => {
    setSelectedPassenger(p);
    setModalVisible(true);
    setDetailLoading(true);
    setDetailData(null);
    setReviewRating(0);
    setReviewText('');
    try {
      const tripPassengerId = p.id;
      const res = await client.get(`/Passengers/trip/${tripPassengerId}`);
      setDetailData(res.data);
    } catch (e) { console.error('Load trip details:', e); setDetailData(null); }
    finally { setDetailLoading(false); }
  };

  const fmt = (d) => { if (!d) return 'N/A'; const x = new Date(d); return `${x.getDate()}/${x.getMonth()+1}/${x.getFullYear()} ${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`; };

  const submitReview = async () => {
    if (reviewRating < 1) { Alert.alert('Rating Required', 'Please select a star rating.'); return; }
    const tpId = detailData?.passenger?.id;
    if (!tpId) return;
    setSubmittingReview(true);
    try {
      const res = await client.post(`/Passengers/trip/${tpId}/review`, { rating: reviewRating, comments: reviewText });
      setDetailData(prev => ({ ...prev, review: res.data }));
      Alert.alert('Thank you!', 'Your review has been submitted.');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to submit review';
      Alert.alert('Error', msg);
    } finally { setSubmittingReview(false); }
  };
  const list = searchQuery.length >= 2 ? passengers : recentPassengers;
  const isSearch = searchQuery.length >= 2;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Passengers</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={20} color={c.textMuted} />
          <TextInput style={[styles.searchInput, { color: c.text }]} placeholder="Search by name or phone..." placeholderTextColor={c.textMuted} value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={c.textMuted} /></TouchableOpacity>}
          {searching && <ActivityIndicator size="small" color={GOLD} style={{ marginLeft: 8 }} />}
        </View>
      </View>

      <View style={styles.sectionHdr}>
        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
          {isSearch ? `${passengers.length} result${passengers.length !== 1 ? 's' : ''}` : `Recent Passengers (${recentPassengers.length})`}
        </Text>
      </View>

      {loading && !isSearch ? (
        <View style={styles.center}><ActivityIndicator size="large" color={GOLD} /><Text style={[styles.loadText, { color: c.textMuted }]}>Loading...</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRecent(); }} colors={[GOLD]} />} showsVerticalScrollIndicator={false}>
          {list.length === 0 ? (
            <View style={styles.center}><Ionicons name="people-outline" size={64} color={c.textMuted} /><Text style={[styles.emptyText, { color: c.textMuted }]}>{isSearch ? 'No passengers found' : 'No recent passengers'}</Text></View>
          ) : list.map((p, i) => (
            <TouchableOpacity key={`${p.id}-${i}`} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => viewDetails(p)} activeOpacity={0.7}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: GOLD + '20' }]}><Ionicons name="person" size={22} color={GOLD} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: c.text }]}>{p.name || p.passengerName || 'Unknown'}</Text>
                  <View style={styles.detailRow}><Ionicons name="call-outline" size={13} color={c.textMuted} /><Text style={[styles.detail, { color: c.textMuted }]}>{p.phone || p.passengerPhone || 'No phone'}</Text></View>
                  {p.departureStation ? <View style={styles.detailRow}><Ionicons name="navigate-outline" size={13} color={c.textMuted} /><Text style={[styles.detail, { color: c.textMuted }]}>{p.departureStation} → {p.arrivalStation}</Text></View> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {p.tripCount > 0 && <View style={[styles.badge, { backgroundColor: GOLD + '20' }]}><Text style={{ fontSize: 11, color: GOLD, fontWeight: '600' }}>{p.tripCount} trips</Text></View>}
                  {p.amount > 0 && <Text style={{ fontSize: 13, color: GREEN, fontWeight: '700' }}>R{Number(p.amount).toFixed(0)}</Text>}
                  {p.source === 'registered' && <View style={[styles.badge, { backgroundColor: GREEN + '20' }]}><Text style={{ fontSize: 10, color: GREEN, fontWeight: '600' }}>Registered</Text></View>}
                  {p.boardedAt && <Text style={{ fontSize: 11, color: c.textMuted }}>{fmt(p.boardedAt)}</Text>}
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: c.background }]}>
            <View style={styles.modalHdr}><Text style={[styles.modalTitle, { color: c.text }]}>Trip Details</Text><TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={c.textMuted} /></TouchableOpacity></View>
            {selectedPassenger && (
              <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                {detailLoading ? <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 30 }} /> : detailData ? (
                  <>
                    {/* Passenger Info */}
                    <View style={[styles.profileCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <View style={[styles.avatarLg, { backgroundColor: GOLD + '20' }]}><Ionicons name="person" size={36} color={GOLD} /></View>
                      <Text style={[styles.profileName, { color: c.text }]}>{detailData.passenger?.passengerName || 'Unknown'}</Text>
                      <Text style={[styles.profilePhone, { color: c.textMuted }]}>{detailData.passenger?.passengerPhone || 'No phone'}</Text>
                      {detailData.passenger?.nextOfKinName ? <Text style={[styles.profilePhone, { color: c.textMuted }]}>Next of Kin: {detailData.passenger.nextOfKinName} ({detailData.passenger.nextOfKinContact})</Text> : null}
                    </View>

                    {/* Booking Details */}
                    <Text style={[styles.tripsTitle, { color: c.text }]}>Booking Details</Text>
                    <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <InfoRow icon="navigate-outline" label="Route" value={`${detailData.passenger?.departureStation || '?'} \u2192 ${detailData.passenger?.arrivalStation || '?'}`} c={c} />
                      <InfoRow icon="time-outline" label="Boarded" value={fmt(detailData.passenger?.boardedAt)} c={c} />
                      <InfoRow icon="cash-outline" label="Amount Paid" value={`R${Number(detailData.passenger?.amount || 0).toFixed(2)}`} c={c} valueColor={GREEN} />
                      <InfoRow icon="card-outline" label="Payment" value={detailData.passenger?.paymentMethod || 'Cash'} c={c} />
                      {detailData.passenger?.paymentReference ? <InfoRow icon="receipt-outline" label="Reference" value={detailData.passenger.paymentReference} c={c} /> : null}
                      {detailData.passenger?.seatNumber ? <InfoRow icon="grid-outline" label="Seat" value={`#${detailData.passenger.seatNumber}`} c={c} /> : null}
                      {detailData.passenger?.notes ? <InfoRow icon="document-text-outline" label="Notes" value={detailData.passenger.notes} c={c} /> : null}
                    </View>

                    {/* Trip Info */}
                    {detailData.trip && (
                      <>
                        <Text style={[styles.tripsTitle, { color: c.text, marginTop: 16 }]}>Trip Information</Text>
                        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                          <InfoRow icon="flag-outline" label="Status" value={detailData.trip.status || 'Unknown'} c={c} valueColor={detailData.trip.status === 'Completed' ? GREEN : GOLD} />
                          <InfoRow icon="navigate-outline" label="From" value={detailData.trip.departureStation} c={c} />
                          <InfoRow icon="location-outline" label="To" value={detailData.trip.destinationStation} c={c} />
                          <InfoRow icon="time-outline" label="Start Time" value={fmt(detailData.trip.departureTime)} c={c} />
                          <InfoRow icon="checkmark-circle-outline" label="End Time" value={detailData.trip.arrivalTime ? fmt(detailData.trip.arrivalTime) : 'In progress'} c={c} valueColor={detailData.trip.arrivalTime ? c.text : GOLD} />
                          {(detailData.trip.latitude || detailData.trip.longitude) ? <InfoRow icon="pin-outline" label="GPS" value={`${Number(detailData.trip.latitude || 0).toFixed(5)}, ${Number(detailData.trip.longitude || 0).toFixed(5)}`} c={c} /> : null}
                          <InfoRow icon="people-outline" label="Passengers" value={`${detailData.trip.totalPassengers}`} c={c} />
                          <InfoRow icon="cash-outline" label="Trip Total" value={`R${Number(detailData.trip.totalAmount || 0).toFixed(2)}`} c={c} valueColor={GREEN} />
                        </View>
                      </>
                    )}

                    {/* Vehicle Info */}
                    {detailData.trip?.vehicleRegistration && (
                      <>
                        <Text style={[styles.tripsTitle, { color: c.text, marginTop: 16 }]}>Vehicle</Text>
                        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                          <InfoRow icon="car-outline" label="Registration" value={detailData.trip.vehicleRegistration} c={c} />
                          {detailData.trip.vehicleMake ? <InfoRow icon="construct-outline" label="Make/Model" value={detailData.trip.vehicleMake} c={c} /> : null}
                          {detailData.trip.vehicleColor ? <InfoRow icon="color-palette-outline" label="Color" value={detailData.trip.vehicleColor} c={c} /> : null}
                        </View>
                      </>
                    )}

                    {/* Driver & Marshal */}
                    {(detailData.trip?.driverName || detailData.trip?.marshalName) && (
                      <>
                        <Text style={[styles.tripsTitle, { color: c.text, marginTop: 16 }]}>Staff</Text>
                        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                          {detailData.trip.driverName ? <InfoRow icon="person-outline" label="Driver" value={detailData.trip.driverName} c={c} /> : null}
                          {detailData.trip.driverPhone ? <InfoRow icon="call-outline" label="Driver Phone" value={detailData.trip.driverPhone} c={c} /> : null}
                          {detailData.trip.marshalName ? <InfoRow icon="shield-outline" label="Marshal" value={detailData.trip.marshalName} c={c} /> : null}
                        </View>
                      </>
                    )}

                    {/* Taxi Rank */}
                    {detailData.trip?.taxiRankName && (
                      <>
                        <Text style={[styles.tripsTitle, { color: c.text, marginTop: 16 }]}>Taxi Rank</Text>
                        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                          <InfoRow icon="location-outline" label="Name" value={detailData.trip.taxiRankName} c={c} />
                          {detailData.trip.taxiRankAddress ? <InfoRow icon="map-outline" label="Address" value={detailData.trip.taxiRankAddress} c={c} /> : null}
                          {detailData.trip.taxiRankCity ? <InfoRow icon="business-outline" label="City" value={detailData.trip.taxiRankCity} c={c} /> : null}
                          {(detailData.trip.taxiRankLatitude || detailData.trip.taxiRankLongitude) ? <InfoRow icon="pin-outline" label="GPS" value={`${Number(detailData.trip.taxiRankLatitude || 0).toFixed(5)}, ${Number(detailData.trip.taxiRankLongitude || 0).toFixed(5)}`} c={c} /> : null}
                        </View>
                      </>
                    )}

                    {/* Other Passengers */}
                    {detailData.otherPassengers?.length > 0 && (
                      <>
                        <Text style={[styles.tripsTitle, { color: c.text, marginTop: 16 }]}>Other Passengers ({detailData.otherPassengers.length})</Text>
                        {detailData.otherPassengers.map((op, i) => (
                          <View key={`${op.id}-${i}`} style={[styles.tripCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                            <View style={styles.cardRow}>
                              <View style={[styles.avatar, { backgroundColor: c.border + '60', width: 36, height: 36, borderRadius: 18, marginRight: 10 }]}><Ionicons name="person" size={16} color={c.textMuted} /></View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.name, { color: c.text }]}>{op.name}</Text>
                                {op.phone ? <Text style={{ fontSize: 12, color: c.textMuted }}>{op.phone}</Text> : null}
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                {op.seatNumber ? <Text style={{ fontSize: 11, color: c.textMuted }}>Seat #{op.seatNumber}</Text> : null}
                                <Text style={{ fontSize: 13, fontWeight: '700', color: GREEN }}>R{Number(op.amount).toFixed(0)}</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </>
                    )}

                    {/* Review Section */}
                    <Text style={[styles.tripsTitle, { color: c.text, marginTop: 16 }]}>Ride Review</Text>
                    {detailData.review ? (
                      <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          {[1,2,3,4,5].map(s => (
                            <Ionicons key={s} name={s <= detailData.review.rating ? 'star' : 'star-outline'} size={22} color={GOLD} style={{ marginRight: 4 }} />
                          ))}
                          <Text style={{ fontSize: 14, fontWeight: '700', color: GOLD, marginLeft: 6 }}>{detailData.review.rating}/5</Text>
                        </View>
                        {detailData.review.comments ? <Text style={{ fontSize: 13, color: c.text, lineHeight: 20 }}>{detailData.review.comments}</Text> : null}
                        <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 8 }}>Reviewed on {fmt(detailData.review.createdAt)}</Text>
                      </View>
                    ) : detailData.passenger?.isRegistered ? (
                      <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={{ fontSize: 13, color: c.textMuted, marginBottom: 10 }}>This passenger can leave a review for their ride.</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          {[1,2,3,4,5].map(s => (
                            <TouchableOpacity key={s} onPress={() => setReviewRating(s)} activeOpacity={0.7}>
                              <Ionicons name={s <= reviewRating ? 'star' : 'star-outline'} size={32} color={GOLD} style={{ marginRight: 6 }} />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={[styles.reviewInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                          placeholder="Write a review (optional)..."
                          placeholderTextColor={c.textMuted}
                          value={reviewText}
                          onChangeText={setReviewText}
                          multiline
                          numberOfLines={3}
                        />
                        <TouchableOpacity
                          style={[styles.reviewBtn, { opacity: submittingReview ? 0.6 : 1 }]}
                          onPress={submitReview}
                          disabled={submittingReview}
                          activeOpacity={0.7}
                        >
                          {submittingReview ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.reviewBtnText}>Submit Review</Text>}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} />
                          <Text style={{ fontSize: 13, color: c.textMuted, flex: 1 }}>Reviews are available for registered passengers who use the app.</Text>
                        </View>
                      </View>
                    )}
                  </>
                ) : <Text style={[styles.noTrips, { color: c.textMuted }]}>Could not load trip details</Text>}
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value, c, valueColor }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: c.border + '40' }}>
      <Ionicons name={icon} size={16} color={c.textMuted} style={{ width: 24 }} />
      <Text style={{ fontSize: 13, color: c.textMuted, width: 100 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: valueColor || c.text, flex: 1 }}>{value}</Text>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { backgroundColor: '#1a1a2e', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    searchWrap: { padding: 16 },
    searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
    sectionHdr: { paddingHorizontal: 20, marginBottom: 8 },
    sectionLabel: { fontSize: 13, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    loadText: { marginTop: 12, fontSize: 15 },
    emptyText: { fontSize: 16, marginTop: 16 },
    card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: 1 },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    name: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    detail: { fontSize: 12, marginLeft: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
    modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    profileCard: { alignItems: 'center', padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
    avatarLg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    profileName: { fontSize: 18, fontWeight: '700' },
    profilePhone: { fontSize: 14, marginTop: 4 },
    tripsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    noTrips: { textAlign: 'center', marginTop: 20, fontSize: 14 },
    tripCard: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tripRoute: { fontSize: 14, fontWeight: '600' },
    tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    statBox: { width: '47%', borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 11 },
    dateRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
    dateLabel: { fontSize: 11 },
    dateVal: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    routeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
    infoCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 4 },
    reviewInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 70, textAlignVertical: 'top', marginBottom: 12 },
    reviewBtn: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    reviewBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
