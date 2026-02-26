import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Alert } from 'react-native';
import { getAllTenders } from '../api/tenders';

export default function OwnerTendersScreen() {
  const [loading, setLoading] = useState(true);
  const [tenders, setTenders] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const all = await getAllTenders();
        if (!mounted) return;
        setTenders(Array.isArray(all) ? all : []);
      } catch (e) {
        Alert.alert('Error', 'Failed to load tenders');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return (
    <View style={styles.loading}><ActivityIndicator size="large" /></View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tenders</Text>
      {tenders.length === 0 ? (
        <Text style={styles.empty}>No tenders available.</Text>
      ) : (
        <FlatList
          data={tenders}
          keyExtractor={(item, idx) => item.id || String(idx)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => Alert.alert(item.title || 'Tender', item.description || 'No description')}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.title || 'Tender'}</Text>
                <Text style={styles.meta}>{item.publisherName || item.publisher || ''}</Text>
                <Text style={styles.meta}>{item.budgetMax ? `R${item.budgetMax}` : 'Budget N/A'} · {item.status || ''}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#666' },
  card: { padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
});
