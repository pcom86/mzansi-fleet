import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { useAppTheme } from '../theme';
import { createStyles } from '../styles';

export default function DispatchedItemsScreen({ navigation }) {
  const { c } = useAppTheme();
  const [dispatchedItems, setDispatchedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadDispatchedItems();
  }, []);

  const loadDispatchedItems = async () => {
    try {
      setLoading(true);
      const response = await client.get('/DailyTaxiQueue/dispatched');
      setDispatchedItems(response.data || []);
    } catch (error) {
      console.error('Error loading dispatched items:', error);
      Alert.alert('Error', 'Failed to load dispatched items');
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    // Navigate to details or show modal
    Alert.alert(
      'Dispatch Details',
      `Vehicle: ${item.vehicleRegistration}\nRoute: ${item.routeName || 'N/A'}\nPassengers: ${item.passengerCount || 0}\nDeparted: ${new Date(item.departedAt).toLocaleString()}`,
      [{ text: 'OK', onPress: () => setSelectedItem(null) }]
    );
  };

  const styles = createStyles(c);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading dispatched items...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispatched Vehicles</Text>
      </View>

      <ScrollView style={styles.content}>
        {dispatchedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={48} color={c.textMuted} />
            <Text style={styles.emptyText}>No dispatched vehicles yet</Text>
          </View>
        ) : (
          dispatchedItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => handleItemClick(item)}
            >
              <View style={styles.itemHeader}>
                <View style={styles.vehicleInfo}>
                  <Text style={[styles.vehicleReg, { color: c.text }]}>{item.vehicleRegistration}</Text>
                  <Text style={[styles.routeName, { color: c.textMuted }]}>{item.routeName || 'No Route'}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={styles.statusText}>Dispatched</Text>
                </View>
              </View>

              <View style={styles.itemDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textMuted }]}>Passengers:</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{item.passengerCount || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textMuted }]}>Departed:</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>
                    {new Date(item.departedAt).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: c.textMuted }]}>Driver:</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{item.driverName || 'Not assigned'}</Text>
                </View>
              </View>

              {/* Passenger List Preview */}
              {item.passengers && item.passengers.length > 0 && (
                <View style={styles.passengerSection}>
                  <Text style={[styles.passengerTitle, { color: c.text }]}>Passenger List</Text>
                  {item.passengers.slice(0, 3).map((passenger, idx) => (
                    <View key={idx} style={[styles.passengerItem, { backgroundColor: c.background, borderColor: c.border }]}>
                      <Text style={[styles.passengerName, { color: c.text }]}>{passenger.name}</Text>
                      <Text style={[styles.passengerDetail, { color: c.textMuted }]}>
                        {passenger.destination ? `To: ${passenger.destination}` : ''}
                      </Text>
                    </View>
                  ))}
                  {item.passengers.length > 3 && (
                    <Text style={[styles.morePassengers, { color: c.textMuted }]}>
                      +{item.passengers.length - 3} more passengers
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = (c) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: c.textMuted,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleReg: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
  },
  routeName: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
    marginLeft: 4,
  },
  itemDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: c.textMuted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: c.text,
  },
  passengerSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  passengerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
    marginBottom: 8,
  },
  passengerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  passengerDetail: {
    fontSize: 12,
    color: c.textMuted,
  },
  morePassengers: {
    fontSize: 12,
    color: c.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 16,
    color: c.text,
    textAlign: 'center',
    marginTop: 20,
  },
});
