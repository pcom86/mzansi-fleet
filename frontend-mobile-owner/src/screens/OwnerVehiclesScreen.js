import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getAllVehicles } from '../api/vehicles';
import { useAppTheme } from '../theme';

export default function OwnerVehiclesScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    navigation.setOptions({ title: 'Mzansi Fleet - My Fleet' });
  }, [navigation]);

  function getVehicleThumb(v) {
    return v?.photoBase64 || v?.PhotoBase64 || null;
  }

  const ownerKey = useMemo(() => {
    return user?.tenantId || user?.id || user?.userId || null;
  }, [user]);

  async function loadVehicles(mountedRef) {
    try {
      setLoading(true);
      const all = await getAllVehicles();
      const list = (all || []).filter(v => v.ownerId === ownerKey || v.tenantId === ownerKey || v.ownerId === String(ownerKey));
      if (mountedRef && !mountedRef.current) return;
      setVehicles(list);
    } catch (e) {
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      if (mountedRef && !mountedRef.current) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    const mountedRef = { current: true };
    if (ownerKey) loadVehicles(mountedRef);
    else setLoading(false);

    const unsubscribe = navigation.addListener('focus', () => {
      if (ownerKey) loadVehicles(mountedRef);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [navigation, ownerKey]);

  if (loading) return (
    <View style={styles.loading}><ActivityIndicator size="large" /></View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Fleet</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('OwnerVehicleForm')}>
          <Text style={styles.btnPrimaryText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>
      {vehicles.length === 0 ? (
        <Text style={styles.empty}>No vehicles found.</Text>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item, idx) => item.id || item.Id || String(idx)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('OwnerVehicleDetails', { vehicle: item })}>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.thumbWrap}>
                    {getVehicleThumb(item) ? (
                      <Image source={{ uri: getVehicleThumb(item) }} style={styles.thumb} />
                    ) : (
                      <View style={styles.thumbPlaceholder} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.make} {item.model} ({item.registration})</Text>
                    <Text style={styles.meta}>Status: {item.status || 'Unknown'}</Text>
                    <Text style={styles.meta}>Mileage: {item.mileage || 0}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '800', color: c.text },
    empty: { color: c.textMuted },
    card: { padding: 12, backgroundColor: c.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    cardTitle: { fontSize: 14, fontWeight: '800', color: c.text },
    meta: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    btnPrimary: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary },
    btnPrimaryText: { color: c.primaryText, fontWeight: '800' },
    thumbWrap: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', backgroundColor: c.surface2, marginRight: 12, borderWidth: 1, borderColor: c.border },
    thumb: { width: '100%', height: '100%' },
    thumbPlaceholder: { flex: 1, backgroundColor: c.surface2 },
  });
}
