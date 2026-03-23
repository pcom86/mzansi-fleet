import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';
import { getQueueTripDetails, completeQueueTrip } from '../api/queueManagement';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount || 0);
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'dispatched':
    case 'departed':
      return '#22c55e';
    case 'loading':
      return '#f59e0b';
    case 'intransit':
      return '#3b82f6';
    case 'completed':
      return '#16a34a';
    case 'cancelled':
      return '#ef4444';
    default:
      return '#94a3b8';
  }
}

export default function DriverTripDetailsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const { queueEntryId, tripId, driverProfileId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tripData, setTripData] = useState(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const loadTripDetails = useCallback(async () => {
    if (!queueEntryId && !tripId) return;
    
    try {
      if (tripId) {
        // Load directly from TaxiRankTrips details endpoint
        const resp = await client.get(`/TaxiRankTrips/${tripId}/details`);
        const d = resp.data;
        // Map vehicle from trip object into queueEntry for screen compatibility
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
      const message = error?.response?.data?.message || error?.message || 'Failed to load trip details';
      Alert.alert('Error', message);
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

  useFocusEffect(useCallback(() => {
    loadTripDetails();
  }, [loadTripDetails]));

  async function handleCompleteTrip() {
    if (!tripData?.trip?.id) return;

    try {
      setCompleting(true);
      
      // Get current location
      let completionData = {
        notes: completionNotes,
        completedByDriverId: driverProfileId || user?.driverProfile?.id || user?.id,
        completedAt: new Date().toISOString(),
      };

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        try {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (position?.coords) {
            completionData.latitude = position.coords.latitude;
            completionData.longitude = position.coords.longitude;
          }
        } catch (locationError) {
          console.log('Location capture failed:', locationError);
        }
      }

      if (tripId) {
        await client.put(`/TaxiRankTrips/${tripData.trip.id}/complete`, completionData);
      } else {
        await completeQueueTrip(queueEntryId, completionData);
      }
      
      Alert.alert(
        'Trip Completed',
        'Trip has been completed successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setCompleteModalVisible(false);
              setCompletionNotes('');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to complete trip';
      Alert.alert('Error', message);
    } finally {
      setCompleting(false);
    }
  }

  function renderPassenger(passenger, index) {
    return (
      <View key={passenger.id || index} style={s.passengerCard}>
        <View style={s.passengerHeader}>
          <Text style={s.passengerName}>{passenger.passengerName || 'Unknown'}</Text>
          <Text style={s.passengerAmount}>{formatCurrency(passenger.amount)}</Text>
        </View>
        <View style={s.passengerDetails}>
          <Text style={s.passengerPhone}>{passenger.passengerPhone || 'No phone'}</Text>
          <Text style={s.passengerRoute}>
            {passenger.departureStation} → {passenger.arrivalStation}
          </Text>
        </View>
        <View style={s.passengerFooter}>
          <View style={s.paymentMethod}>
            <Ionicons 
              name={passenger.paymentMethod === 'Card' ? 'card' : 'cash'} 
              size={14} 
              color={c.textSecondary} 
            />
            <Text style={s.paymentText}>{passenger.paymentMethod || 'Cash'}</Text>
          </View>
          {passenger.seatNumber && (
            <Text style={s.seatNumber}>Seat {passenger.seatNumber}</Text>
          )}
        </View>
      </View>
    );
  }

  function renderCost(cost, index) {
    return (
      <View key={cost.id || index} style={s.costCard}>
        <View style={s.costHeader}>
          <Text style={s.costCategory}>{cost.category}</Text>
          <Text style={s.costAmount}>{formatCurrency(cost.amount)}</Text>
        </View>
        <Text style={s.costDescription}>{cost.description}</Text>
        {cost.receiptNumber && (
          <Text style={s.receiptNumber}>Receipt: {cost.receiptNumber}</Text>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={s.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  if (!tripData) {
    return (
      <View style={[s.container, s.centered]}>
        <Ionicons name="document-text" size={48} color={c.textSecondary} />
        <Text style={s.errorText}>Trip details not available</Text>
      </View>
    );
  }

  const { queueEntry, trip, passengers, costs, summary } = tripData;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Trip Details</Text>
        <View style={s.headerRight} />
      </View>

      <ScrollView
        style={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadTripDetails} />
        }
      >
        {/* Trip Status Card */}
        <View style={s.card}>
          <View style={s.statusRow}>
            <Text style={s.sectionTitle}>Trip Status</Text>
            <View style={[s.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
              <Text style={s.statusText}>{trip.status}</Text>
            </View>
          </View>
          <Text style={s.routeInfo}>
            {trip.departureStation} → {trip.destinationStation}
          </Text>
          <Text style={s.timeInfo}>Departed: {formatDateTime(trip.departureTime)}</Text>
          {trip.arrivalTime && (
            <Text style={s.timeInfo}>Arrival: {formatDateTime(trip.arrivalTime)}</Text>
          )}
        </View>

        {/* Vehicle & Driver Information */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Vehicle</Text>
          <Text style={s.vehicleInfo}>
            {(trip.vehicle || queueEntry?.vehicle)?.make} {(trip.vehicle || queueEntry?.vehicle)?.model}
          </Text>
          <Text style={s.vehicleReg}>
            {(trip.vehicle || queueEntry?.vehicle)?.registration}
          </Text>
          <Text style={s.vehicleType}>
            {(trip.vehicle || queueEntry?.vehicle)?.type}{(trip.vehicle || queueEntry?.vehicle)?.capacity ? ` • ${(trip.vehicle || queueEntry?.vehicle).capacity} seats` : ''}
          </Text>
        </View>

        {/* Driver & Marshal */}
        {(trip.driver || trip.marshal) && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Driver & Marshal</Text>
            {trip.driver && (
              <Text style={s.queueInfo}>Driver: {trip.driver.name}{trip.driver.phone ? ` (${trip.driver.phone})` : ''}</Text>
            )}
            {trip.marshal && (
              <Text style={s.queueInfo}>Marshal: {trip.marshal.fullName || trip.marshal.name}{trip.marshal.phoneNumber ? ` (${trip.marshal.phoneNumber})` : ''}</Text>
            )}
            {trip.taxiRank && (
              <Text style={s.queueInfo}>Rank: {trip.taxiRank.name}</Text>
            )}
          </View>
        )}

        {/* Queue Information - only show if we have queue data */}
        {queueEntry?.queuePosition && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Queue Information</Text>
            <Text style={s.queueInfo}>Position: #{queueEntry.queuePosition}</Text>
            <Text style={s.queueInfo}>Joined: {formatDateTime(queueEntry.joinedAt)}</Text>
            <Text style={s.queueInfo}>Departed: {formatDateTime(queueEntry.departedAt)}</Text>
          </View>
        )}

        {/* Passenger List */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Passengers ({passengers.length})</Text>
          {passengers.length === 0 ? (
            <Text style={s.emptyText}>No passengers on this trip</Text>
          ) : (
            passengers.map(renderPassenger)
          )}
        </View>

        {/* Trip Costs */}
        {costs.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Trip Costs ({costs.length})</Text>
            {costs.map(renderCost)}
          </View>
        )}

        {/* Financial Summary */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Financial Summary</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Total Earnings:</Text>
            <Text style={s.summaryValue}>{formatCurrency(summary.totalEarnings)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Cash:</Text>
            <Text style={s.summaryValue}>{formatCurrency(summary.cashEarnings)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Card:</Text>
            <Text style={s.summaryValue}>{formatCurrency(summary.cardEarnings)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Total Costs:</Text>
            <Text style={s.summaryValue}>{formatCurrency(summary.totalCosts)}</Text>
          </View>
          <View style={[s.summaryRow, s.summaryTotal]}>
            <Text style={s.summaryLabel}>Net Earnings:</Text>
            <Text style={s.summaryValue}>{formatCurrency(summary.netEarnings)}</Text>
          </View>
        </View>

        {/* Complete Trip Button – only for drivers, not owners */}
        {trip.status !== 'Completed' && trip.status !== 'Cancelled' && user?.role !== 'Owner' && (
          <TouchableOpacity
            style={s.completeButton}
            onPress={() => setCompleteModalVisible(true)}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={s.completeButtonText}>Complete Trip</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Completion Modal */}
      <Modal
        visible={completeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Complete Trip</Text>
            <Text style={s.modalSubtitle}>
              Are you sure you want to complete this trip? This action cannot be undone.
            </Text>
            
            <TextInput
              style={s.notesInput}
              placeholder="Add completion notes (optional)"
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
              numberOfLines={3}
            />

            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.modalButton, s.cancelButton]}
                onPress={() => setCompleteModalVisible(false)}
                disabled={completing}
              >
                <Text style={s.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[s.modalButton, s.confirmButton]}
                onPress={handleCompleteTrip}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.confirmButtonText}>Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    border: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  routeInfo: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  timeInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  vehicleInfo: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  vehicleReg: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  vehicleType: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  queueInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  passengerCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    border: 1,
    borderColor: colors.border,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  passengerAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  passengerDetails: {
    marginBottom: 8,
  },
  passengerPhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  passengerRoute: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  passengerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  seatNumber: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  costCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    border: 1,
    borderColor: colors.border,
  },
  costHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  costCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  costAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  costDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  receiptNumber: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: 16,
    color: colors.error,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: colors.success,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
