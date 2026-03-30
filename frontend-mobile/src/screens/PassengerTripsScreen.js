import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#198754';
const RED = '#dc3545';
const BLUE = '#0d6efd';

function InfoRow({ icon, label, value, c, valueColor }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: c.border + '40' }}>
      <Ionicons name={icon} size={16} color={c.textMuted} style={{ width: 24 }} />
      <Text style={{ fontSize: 13, color: c.textMuted, width: 100 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: valueColor || c.text, flex: 1 }}>{value}</Text>
    </View>
  );
}

export default function PassengerTripsScreen({ navigation }) {
  const { user } = useAuth();
  const c = useAppTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState('Other');
  const [incidentSeverity, setIncidentSeverity] = useState('Medium');
  const [incidentText, setIncidentText] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);

  useEffect(() => { loadTrips(); }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const res = await client.get('/Passengers/my-trips');
      setTrips(res.data || []);
    } catch (e) { console.error('Load my trips:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const viewDetails = async (trip) => {
    setSelectedTrip(trip);
    setModalVisible(true);
    setDetailLoading(true);
    setDetailData(null);
    setReviewRating(0);
    setReviewText('');
    setIncidentCategory('Other');
    setIncidentSeverity('Medium');
    setIncidentText('');
    try {
      const res = await client.get(`/Passengers/trip/${trip.id}`);
      setDetailData(res.data);
    } catch (e) { console.error('Load trip details:', e); setDetailData(null); }
    finally { setDetailLoading(false); }
  };

  const fmt = (d) => { if (!d) return 'N/A'; const x = new Date(d); return `${x.getDate()}/${x.getMonth()+1}/${x.getFullYear()} ${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`; };

  const submitReview = async () => {
    if (reviewRating < 1) { Alert.alert('Rating Required', 'Please select a star rating.'); return; }
    const tpId = detailData?.passenger?.Id;
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

  const submitIncident = async () => {
    if (!incidentText.trim()) { Alert.alert('Description Required', 'Please describe the incident.'); return; }
    const tpId = detailData?.passenger?.Id;
    if (!tpId) return;
    setSubmittingIncident(true);
    try {
      const res = await client.post(`/Passengers/trip/${tpId}/incident`, {
        category: incidentCategory,
        severity: incidentSeverity,
        description: incidentText
      });
      setIncidentText('');
      Alert.alert('Reported', 'Your incident has been reported to the taxi rank.');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to report incident';
      Alert.alert('Error', msg);
    } finally { setSubmittingIncident(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Trips</Text>
        <TouchableOpacity onPress={loadTrips} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTrips(); }} />}
      >
        {loading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GOLD} />
          </View>
        ) : trips.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Ionicons name="car-outline" size={48} color={c.textMuted} />
            <Text style={[styles.emptyTitle, { color: c.text, marginTop: 8 }]}>No trips found</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>Your Live Queue and Book Seat trips will appear here</Text>
          </View>
        ) : (
          trips.map((trip, idx) => (
            <TouchableOpacity
              key={trip.id}
              style={[styles.tripCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => viewDetails(trip)}
              activeOpacity={0.7}
            >
              <View style={styles.tripHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tripRoute, { color: c.text }]}>{trip.departureStation} → {trip.arrivalStation}</Text>
                  <Text style={[styles.tripMeta, { color: c.textMuted }]}>
                    {fmt(trip.createdAt)} · Seat {trip.seatNumber}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: trip.tripStatus === 'Completed' ? `${GREEN}20` : GOLD_LIGHT }]}>
                  <Text style={[styles.statusText, { color: trip.tripStatus === 'Completed' ? GREEN : GOLD }]}>
                    {trip.tripStatus || 'Pending'}
                  </Text>
                </View>
              </View>
              {trip.vehicle && (
                <View style={styles.tripVehicle}>
                  <Ionicons name="car-outline" size={14} color={c.textMuted} />
                  <Text style={[styles.vehicleText, { color: c.textMuted }]}>
                    {trip.vehicle.make} {trip.vehicle.model} · {trip.vehicle.plateNumber}
                  </Text>
                  {trip.vehicle.driverName && (
                    <Text style={[styles.driverText, { color: c.textMuted }]}>
                      Driver: {trip.vehicle.driverName}
                    </Text>
                  )}
                </View>
              )}
              <View style={styles.tripFooter}>
                <Text style={[styles.tripAmount, { color: GOLD }]}>R{trip.amount}</Text>
                <Text style={[styles.tripPayment, { color: c.textMuted }]}>{trip.paymentMethod}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Trip Detail Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={c.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: c.text }]}>Trip Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {detailLoading ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={GOLD} />
            </View>
          ) : detailData ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
              {/* Trip Info */}
              <Text style={[styles.sectionTitle, { color: c.text }]}>Trip Information</Text>
              <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <InfoRow icon="calendar-outline" label="Date" value={fmt(detailData.trip?.createdAt)} c={c} />
                <InfoRow icon="time-outline" label="Start Time" value={fmt(detailData.trip?.departureTime)} c={c} />
                <InfoRow icon="time-outline" label="End Time" value={fmt(detailData.trip?.arrivalTime)} c={c} />
                <InfoRow icon="location-outline" label="Route" value={`${detailData.passenger?.departureStation} → ${detailData.passenger?.arrivalStation}`} c={c} />
                <InfoRow icon="person-outline" label="Passenger" value={detailData.passenger?.passengerName} c={c} />
                <InfoRow icon="call-outline" label="Phone" value={detailData.passenger?.passengerPhone || 'N/A'} c={c} />
                <InfoRow icon="cash-outline" label="Amount" value={`R${detailData.passenger?.amount}`} c={c} valueColor={GOLD} />
                <InfoRow icon="card-outline" label="Payment" value={detailData.passenger?.paymentMethod} c={c} />
                <InfoRow icon="ticket-outline" label="Seat" value={detailData.passenger?.seatNumber} c={c} />
                <InfoRow icon="log-in-outline" label="Boarded" value={fmt(detailData.passenger?.boardedAt)} c={c} />
                <InfoRow icon="flag-outline" label="Status" value={detailData.trip?.status || 'Pending'} c={c} />
              </View>

              {/* Review Section */}
              <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Rate Your Trip</Text>
              {!detailData.review ? (
                <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                    {[1,2,3,4,5].map(s => (
                      <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                        <Ionicons name={s <= reviewRating ? 'star' : 'star-outline'} size={28} color={GOLD} />
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {[1,2,3,4,5].map(s => (
                      <Ionicons key={s} name={s <= detailData.review.rating ? 'star' : 'star-outline'} size={20} color={GOLD} />
                    ))}
                    <Text style={{ fontSize: 14, fontWeight: '700', color: GOLD }}>{detailData.review.rating}/5</Text>
                  </View>
                  {detailData.review.comments && (
                    <Text style={{ fontSize: 13, color: c.text, fontStyle: 'italic' }}>"{detailData.review.comments}"</Text>
                  )}
                  <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>Reviewed on {fmt(detailData.review.createdAt)}</Text>
                </View>
              )}

              {/* Incident Reporting Section */}
              <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16 }]}>Report an Incident</Text>
              <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={{ fontSize: 13, color: c.textMuted, marginBottom: 10 }}>Report an issue for the taxi rank to attend to.</Text>
                
                <Text style={{ fontSize: 12, fontWeight: '600', color: c.text, marginBottom: 6 }}>Category</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {['Safety', 'Vehicle', 'Driver', 'Overcharging', 'Harassment', 'Other'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={{
                        paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16,
                        backgroundColor: incidentCategory === cat ? GOLD + '20' : c.border + '40',
                        borderWidth: 1, borderColor: incidentCategory === cat ? GOLD : c.border
                      }}
                      onPress={() => setIncidentCategory(cat)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: incidentCategory === cat ? GOLD : c.text }}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={{ fontSize: 12, fontWeight: '600', color: c.text, marginBottom: 6 }}>Severity</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                  {['Low', 'Medium', 'High', 'Critical'].map(sev => (
                    <TouchableOpacity
                      key={sev}
                      style={{
                        paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16,
                        backgroundColor: incidentSeverity === sev ? (sev === 'Critical' ? '#dc262620' : sev === 'High' ? '#ef444420' : sev === 'Medium' ? '#f59e0b20' : '#3b82f620') : c.border + '40',
                        borderWidth: 1, borderColor: incidentSeverity === sev ? (sev === 'Critical' ? '#dc2626' : sev === 'High' ? '#ef4444' : sev === 'Medium' ? '#f59e0b' : '#3b82f6') : c.border
                      }}
                      onPress={() => setIncidentSeverity(sev)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: incidentSeverity === sev ? (sev === 'Critical' ? '#dc2626' : sev === 'High' ? '#ef4444' : sev === 'Medium' ? '#f59e0b' : '#3b82f6') : c.text }}>{sev}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[styles.reviewInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]} 
                  placeholder="Describe the incident..."
                  placeholderTextColor={c.textMuted}
                  value={incidentText}
                  onChangeText={setIncidentText}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[styles.reviewBtn, { opacity: submittingIncident ? 0.6 : 1, backgroundColor: '#dc2626' }]}
                  onPress={submitIncident}
                  disabled={submittingIncident}
                  activeOpacity={0.7}
                >
                  {submittingIncident ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.reviewBtnText}>Report Incident</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : <Text style={[styles.noTrips, { color: c.textMuted }]}>Could not load trip details</Text>}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#1a1a2e',
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 6, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', flex: 1 },
  refreshBtn: { padding: 6, justifyContent: 'center', alignItems: 'center' },

  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4 },

  tripCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  tripHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tripRoute: { fontSize: 16, fontWeight: '800', flex: 1 },
  tripMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  tripVehicle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  vehicleText: { fontSize: 12 },
  driverText: { fontSize: 12, marginLeft: 8 },
  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripAmount: { fontSize: 18, fontWeight: '900' },
  tripPayment: { fontSize: 12 },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  modalClose: { padding: 6 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  infoCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  reviewInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12, minHeight: 44 },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GOLD, paddingVertical: 14, borderRadius: 12 },
  reviewBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },
  noTrips: { textAlign: 'center', padding: 32, fontSize: 14 },
});
