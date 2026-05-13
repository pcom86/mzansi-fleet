
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { fetchIncidentsByRank } from '../api/incidents';

export default function IncidentsScreen({ route }) {
  const rank = route?.params?.rank;
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rank?.id) return;
    setLoading(true);
    fetchIncidentsByRank(rank.id)
      .then(setIncidents)
      .catch((e) => setError(e?.message || 'Failed to load incidents'))
      .finally(() => setLoading(false));
  }, [rank?.id]);

  if (!rank?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Incidents</Text>
        <Text style={styles.subtitle}>No taxi rank selected.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.subtitle}>Loading incidents…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Incidents</Text>
        <Text style={[styles.subtitle, { color: 'red' }]}>{error}</Text>
      </View>
    );
  }

  if (!incidents.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Incidents</Text>
        <Text style={styles.subtitle}>No incidents reported for this taxi rank.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { alignItems: 'stretch', justifyContent: 'flex-start' }]}> 
      <Text style={styles.title}>Incidents</Text>
      <FlatList
        data={incidents}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={styles.incidentCard}>
            <Text style={styles.incidentTitle}>{item.title || 'Incident'}</Text>
            <Text style={styles.incidentMeta}>{item.severity || 'Medium'} • {item.status || 'Open'}</Text>
            <Text style={styles.incidentDesc}>{item.description || 'No description'}</Text>
            <Text style={styles.incidentReporter}>Reported by: {item.reporterName || 'Anonymous'}</Text>
            <Text style={styles.incidentDate}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
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
  incidentCard: {
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
  incidentTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  incidentMeta: {
    fontSize: 13,
    color: '#b45309',
    marginBottom: 4,
  },
  incidentDesc: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  incidentReporter: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  incidentDate: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'right',
  },
});
