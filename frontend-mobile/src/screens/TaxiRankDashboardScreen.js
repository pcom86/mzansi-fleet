import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchTaxiRanks, fetchMarshals } from '../api/taxiRanks';

export default function TaxiRankDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.tenantId) {
        loadTaxiRanks();
      } else {
        // nothing to load, user has no tenant
      }
    }
  }, [user]);

  async function loadTaxiRanks() {
    setLoading(true);
    try {
      const resp = await fetchTaxiRanks(user.tenantId);
      // assume API returns array in resp.data
      setTaxiRanks(resp.data || []);
    } catch (err) {
      console.error('Failed to load taxi ranks', err);
      Alert.alert('Error', 'Unable to load taxi ranks');
    } finally {
      setLoading(false);
    }
  }

  function handleRankPress(rank) {
    navigation.navigate('TaxiRankDetails', { rank });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user || !user.tenantId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Taxi Ranks</Text>
        <Text style={styles.empty}>Your account is not associated with a tenant. Taxi rank features require a tenant.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Taxi Ranks</Text>
      {taxiRanks.length === 0 ? (
        <Text style={styles.empty}>No taxi ranks available.</Text>
      ) : (
        <FlatList
          data={taxiRanks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => handleRankPress(item)}>
              <Text style={styles.itemText}>{item.name || item.taxiRankName || 'Unnamed rank'}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  empty: { textAlign: 'center', marginTop: 20, color: '#666' },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  itemText: { fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
