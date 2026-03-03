import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { fetchMarshals, fetchTrips } from '../api/taxiRanks';

export default function TaxiRankDetailsScreen({ route }) {
  const { rank } = route.params || {};
  const [marshals, setMarshals] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rank && rank.id) {
      loadDetails(rank.id);
    }
  }, [rank]);

  async function loadDetails(taxiRankId) {
    setLoading(true);
    try {
      const [mResp, tResp] = await Promise.all([fetchMarshals(taxiRankId), fetchTrips(taxiRankId)]);
      setMarshals(mResp.data || []);
      setTrips(tResp.data || []);
    } catch (err) {
      console.error('Failed to load rank details', err);
      Alert.alert('Error', 'Unable to load rank details');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{rank.name || 'Taxi Rank'}</Text>
      <Text style={styles.sectionHeader}>Marshals</Text>
      {marshals.length === 0 ? (
        <Text style={styles.empty}>No marshals assigned</Text>
      ) : (
        <FlatList
          data={marshals}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <Text style={styles.item}>{item.fullName || item.name}</Text>}
        />
      )}
      <Text style={styles.sectionHeader}>Trips</Text>
      {trips.length === 0 ? (
        <Text style={styles.empty}>No trips recorded</Text>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <Text style={styles.item}>{item.id}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  sectionHeader: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  empty: { color: '#666', marginTop: 8 },
  item: { paddingVertical: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
