
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Picker, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchReviewsByRank } from '../api/reviewsByRank';
import { fetchVehiclesByRankId } from '../api/taxiRanks';
import { fetchDriversByTenant } from '../api/drivers';

export default function ReviewsScreen({ route }) {
  const rank = route?.params?.rank;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch drivers and vehicles for filter dropdowns
  useEffect(() => {
    if (!rank?.id || !rank.tenantId) return;
    fetchDriversByTenant(rank.tenantId).then(res => setDrivers(res || [])).catch(() => setDrivers([]));
    fetchVehiclesByRankId(rank.id).then(res => setVehicles(res.data || res || [])).catch(() => setVehicles([]));
  }, [rank?.id, rank?.tenantId]);

  // Fetch reviews with filters
  const loadReviews = () => {
    if (!rank?.id) return;
    setLoading(true);
    setError(null);
    fetchReviewsByRank(rank.id, {
      driverId: driverId || undefined,
      vehicleId: vehicleId || undefined,
      date: date ? date.toISOString().split('T')[0] : undefined,
    })
      .then(setReviews)
      .catch((e) => setError(e?.message || 'Failed to load reviews'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReviews(); }, [rank?.id, driverId, vehicleId, date]);

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  if (!rank?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Reviews</Text>
        <Text style={styles.subtitle}>No taxi rank selected.</Text>
      </View>
    );
  }

  // Helper to get vehicle registration and driver name from IDs if missing in review
  const getVehicleRegistration = (item) => {
    if (item.vehicleRegistration) return item.vehicleRegistration;
    if (item.vehicleId) {
      const v = vehicles.find(v => v.id === item.vehicleId);
      return v?.registration || v?.plateNumber || '';
    }
    return '';
  };
  const getDriverName = (item) => {
    if (item.driverName) return item.driverName;
    if (item.driverId) {
      const d = drivers.find(d => d.id === item.driverId);
      return d?.fullName || d?.name || d?.driverCode || '';
    }
    return '';
  };

  return (
    <View style={[styles.container, { alignItems: 'stretch', justifyContent: 'flex-start' }]}> 
      <Text style={styles.title}>Reviews</Text>
      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>Driver:</Text>
          <Picker
            selectedValue={driverId}
            style={styles.picker}
            onValueChange={setDriverId}
          >
            <Picker.Item label="All" value="" />
            {drivers.map(d => (
              <Picker.Item key={d.id} label={d.fullName || d.name || d.driverCode || 'Driver'} value={d.id} />
            ))}
          </Picker>
        </View>
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>Vehicle:</Text>
          <Picker
            selectedValue={vehicleId}
            style={styles.picker}
            onValueChange={setVehicleId}
          >
            <Picker.Item label="All" value="" />
            {vehicles.map(v => (
              <Picker.Item key={v.id} label={v.registration || v.plateNumber || 'Vehicle'} value={v.id} />
            ))}
          </Picker>
        </View>
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>Date:</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>{date ? date.toLocaleDateString() : 'All'}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}
        </View>
      </View>
      {/* Loading/Error/Empty States */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#D4AF37" /><Text>Loading reviews…</Text></View>
      ) : error ? (
        <View style={styles.centered}><Text style={{ color: 'red' }}>{error}</Text></View>
      ) : !reviews.length ? (
        <View style={styles.centered}><Text>No reviews found for the selected filters.</Text></View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => {
            const vehicleReg = getVehicleRegistration(item) || 'No Vehicle';
            const driverName = getDriverName(item) || 'Unknown Driver';
            return (
              <View style={styles.reviewCard}>
                {/* Title: Vehicle Registration */}
                <Text style={styles.reviewTitle}>{vehicleReg}</Text>
                {/* Subject: Driver Name */}
                <Text style={styles.reviewMeta}>{`Subject: ${driverName}`}</Text>
                {/* Rating and Route */}
                <Text style={styles.reviewMeta}>{item.rating ? `★`.repeat(item.rating) : ''} {item.route || ''}</Text>
                {/* Review Text */}
                <Text style={styles.reviewDesc}>{item.comments || item.review || 'No comments'}</Text>
                {/* Passenger Name (Reviewer) */}
                <Text style={styles.reviewMetaSmall}>By: {item.passengerName || 'Anonymous'}</Text>
                {/* Date */}
                <Text style={styles.reviewDate}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  filterCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterLabel: {
    fontSize: 13,
    color: '#444',
    marginBottom: 2,
  },
  picker: {
    height: 36,
    width: '100%',
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  dateBtnText: {
    fontSize: 14,
    color: '#444',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  reviewCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  reviewTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  reviewMeta: {
    fontSize: 13,
    color: '#b45309',
    marginBottom: 4,
  },
  reviewMetaSmall: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  reviewDesc: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'right',
  },
});
