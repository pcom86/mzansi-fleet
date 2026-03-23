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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { getDriverDispatchedTrips } from '../api/queueManagement';
import client from '../api/client';

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

export default function DriverDispatchedTripsScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverId, setDriverId] = useState(null);
  const [dispatchedTrips, setDispatchedTrips] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const resolveDriverId = useCallback(async () => {
    try {
      const r = await client.get('/Identity/driverprofiles');
      const profiles = Array.isArray(r.data) ? r.data : [];
      const me = profiles.find(p => p.userId === user?.id || p.userId === user?.userId);
      if (me?.id) {
        setDriverId(me.id);
        return me.id;
      }
    } catch (error) {
      console.log('Failed to resolve driver ID:', error);
    }
    return null;
  }, [user?.id, user?.userId]);

  const loadDispatchedTrips = useCallback(async () => {
    if (!driverId) return;
    
    try {
      const trips = await getDriverDispatchedTrips(driverId, selectedDate);
      setDispatchedTrips(Array.isArray(trips) ? trips : []);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load dispatched trips';
      Alert.alert('Error', message);
      setDispatchedTrips([]);
    }
  }, [driverId, selectedDate]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const did = await resolveDriverId();
      if (did && active) {
        await loadDispatchedTrips();
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [resolveDriverId, loadDispatchedTrips]);

  useFocusEffect(useCallback(() => {
    loadDispatchedTrips();
  }, [loadDispatchedTrips]));

  function changeDate(delta) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  }

  function formatDateLabel(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    return d.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  function handleTripDetails(trip) {
    navigation.navigate('DriverTripDetails', { queueEntryId: trip.id });
  }

  function renderTripCard(trip, index) {
    return (
      <View key={trip.id || index} style={s.tripCard}>
        <View style={s.tripHeader}>
          <View style={s.tripInfo}>
            <Text style={s.tripRoute}>
              {trip.route?.routeName || 'Unknown Route'}
            </Text>
            <Text style={s.tripDestination}>
              {trip.route?.departureStation} → {trip.route?.destinationStation}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: getStatusColor('Dispatched') }]}>
            <Text style={s.statusText}>Dispatched</Text>
          </View>
        </View>

        <View style={s.vehicleInfo}>
          <Ionicons name="car" size={16} color={c.textSecondary} />
          <Text style={s.vehicleText}>
            {trip.vehicle?.make} {trip.vehicle?.model} ({trip.vehicle?.registration})
          </Text>
        </View>

        <View style={s.tripDetails}>
          <View style={s.detailRow}>
            <Ionicons name="time" size={14} color={c.textSecondary} />
            <Text style={s.detailText}>
              Departed: {formatDateTime(trip.departedAt)}
            </Text>
          </View>
          <View style={s.detailRow}>
            <Ionicons name="people" size={14} color={c.textSecondary} />
            <Text style={s.detailText}>
              {trip.passengerCount} passengers
            </Text>
          </View>
          {trip.estimatedDepartureTime && (
            <View style={s.detailRow}>
              <Ionicons name="clock" size={14} color={c.textSecondary} />
              <Text style={s.detailText}>
                Est. departure: {formatDateTime(trip.estimatedDepartureTime)}
              </Text>
            </View>
          )}
        </View>

        <View style={s.tripActions}>
          <TouchableOpacity
            style={s.detailsButton}
            onPress={() => handleTripDetails(trip)}
          >
            <Ionicons name="eye" size={16} color={c.primary} />
            <Text style={s.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {trip.canComplete && (
            <TouchableOpacity
              style={s.completeButton}
              onPress={() => handleTripDetails(trip)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={s.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>

        {trip.notes && (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Notes:</Text>
            <Text style={s.notesText}>{trip.notes}</Text>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={s.loadingText}>Loading dispatched trips...</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dispatched Trips</Text>
        <View style={s.headerRight} />
      </View>

      {/* Date Selector */}
      <View style={s.dateSelector}>
        <TouchableOpacity
          style={s.dateButton}
          onPress={() => changeDate(-1)}
        >
          <Ionicons name="chevron-back" size={20} color={c.primary} />
        </TouchableOpacity>
        
        <Text style={s.dateText}>{formatDateLabel(selectedDate)}</Text>
        
        <TouchableOpacity
          style={s.dateButton}
          onPress={() => changeDate(1)}
          disabled={selectedDate >= new Date().toISOString().split('T')[0]}
        >
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={selectedDate >= new Date().toISOString().split('T')[0] ? c.border : c.primary} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadDispatchedTrips} />
        }
      >
        {dispatchedTrips.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="car" size={48} color={c.textSecondary} />
            <Text style={s.emptyTitle}>No Dispatched Trips</Text>
            <Text style={s.emptySubtitle}>
              You don't have any dispatched trips for {formatDateLabel(selectedDate).toLowerCase()}
            </Text>
          </View>
        ) : (
          <View style={s.tripsList}>
            {dispatchedTrips.map(renderTripCard)}
          </View>
        )}
      </ScrollView>
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateButton: {
    padding: 8,
    borderRadius: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  tripsList: {
    paddingBottom: 16,
  },
  tripCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    border: 1,
    borderColor: colors.border,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  tripDestination: {
    fontSize: 14,
    color: colors.textSecondary,
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
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  tripDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  tripActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  detailsButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 8,
    padding: 10,
    flex: 1,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  notesSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    border: 1,
    borderColor: colors.border,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
});
