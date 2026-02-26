import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { createVehicle, updateVehicle } from '../api/vehicles';
import { useAppTheme } from '../theme';

function toInt(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export default function OwnerVehicleFormScreen({ route, navigation }) {
  const { user } = useAuth();
  const editingVehicle = route?.params?.vehicle || null;

  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [saving, setSaving] = useState(false);
  const [make, setMake] = useState(editingVehicle?.make || '');
  const [model, setModel] = useState(editingVehicle?.model || '');
  const [registration, setRegistration] = useState(editingVehicle?.registration || '');
  const [year, setYear] = useState(String(editingVehicle?.year || new Date().getFullYear()));
  const [vin, setVin] = useState(editingVehicle?.vin || editingVehicle?.VIN || '');
  const [engineNumber, setEngineNumber] = useState(editingVehicle?.engineNumber || '');
  const [mileage, setMileage] = useState(String(editingVehicle?.mileage || 0));
  const [odometer, setOdometer] = useState(String(editingVehicle?.odometer || 0));
  const [serviceIntervalKm, setServiceIntervalKm] = useState(String(editingVehicle?.serviceIntervalKm || 10000));
  const [capacity, setCapacity] = useState(String(editingVehicle?.capacity || 4));
  const [type, setType] = useState(editingVehicle?.type || '');
  const [baseLocation, setBaseLocation] = useState(editingVehicle?.baseLocation || '');
  const [status, setStatus] = useState(editingVehicle?.status || 'Available');

  const [photoBase64, setPhotoBase64] = useState(editingVehicle?.photoBase64 || null);
  const [photos, setPhotos] = useState(Array.isArray(editingVehicle?.photos) ? editingVehicle.photos : []);

  const tenantId = useMemo(() => user?.tenantId || null, [user]);

  useEffect(() => {
    navigation.setOptions({ title: editingVehicle ? 'Edit Vehicle' : 'Add Vehicle' });
  }, [navigation, editingVehicle]);

  async function ensureMediaPermission() {
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaStatus !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to select images.');
      return false;
    }
    return true;
  }

  async function pickMainPhoto() {
    const ok = await ensureMediaPermission();
    if (!ok) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.base64) return Alert.alert('Error', 'Failed to read image');

    setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
  }

  async function addGalleryPhotos() {
    const ok = await ensureMediaPermission();
    if (!ok) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (res.canceled) return;
    const assets = res.assets || [];
    const newPhotos = assets
      .map(a => a?.base64 ? `data:image/jpeg;base64,${a.base64}` : null)
      .filter(Boolean);

    if (newPhotos.length === 0) {
      Alert.alert('Error', 'No images selected');
      return;
    }

    setPhotos(prev => [...prev, ...newPhotos]);
  }

  function removePhoto(index) {
    Alert.alert('Remove photo', 'Remove this photo from the gallery?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPhotos(prev => prev.filter((_, i) => i !== index)) },
    ]);
  }

  function validate() {
    if (!tenantId) {
      Alert.alert('Error', 'TenantId is missing for this user.');
      return false;
    }
    if (!make.trim() || !model.trim()) {
      Alert.alert('Validation', 'Make and Model are required.');
      return false;
    }
    const y = toInt(year, 0);
    if (!y || y < 1950 || y > new Date().getFullYear() + 1) {
      Alert.alert('Validation', 'Please enter a valid year.');
      return false;
    }
    return true;
  }

  async function onSave() {
    if (!validate()) return;

    const vehiclePayload = {
      id: editingVehicle?.id || editingVehicle?.Id || '00000000-0000-0000-0000-000000000000',
      tenantId,
      registration,
      make,
      model,
      year: toInt(year, new Date().getFullYear()),
      vin,
      engineNumber,
      odometer: toInt(odometer, 0),
      mileage: toInt(mileage, 0),
      serviceIntervalKm: toInt(serviceIntervalKm, 10000),
      capacity: toInt(capacity, 4),
      type,
      baseLocation,
      status,
      photoBase64: photoBase64 || '',
      photos: photos || [],
    };

    try {
      setSaving(true);
      if (editingVehicle?.id || editingVehicle?.Id) {
        const id = editingVehicle.id || editingVehicle.Id;
        await updateVehicle(id, { ...vehiclePayload, id });
      } else {
        await createVehicle(vehiclePayload);
      }
      navigation.goBack();
    } catch (e) {
      console.warn('Failed to save vehicle', e);
      Alert.alert('Error', 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.sectionTitle}>Vehicle Profile Photo</Text>
      <View style={styles.photoRow}>
        <View style={styles.mainPhotoWrap}>
          {photoBase64 ? (
            <Image source={{ uri: photoBase64 }} style={styles.mainPhoto} />
          ) : (
            <View style={styles.mainPhotoPlaceholder}>
              <Text style={styles.placeholderText}>No Photo</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <TouchableOpacity style={styles.btn} onPress={pickMainPhoto} disabled={saving}>
            <Text style={styles.btnText}>Set Profile Photo</Text>
          </TouchableOpacity>
          <View style={{ height: 8 }} />
          <TouchableOpacity style={styles.btn} onPress={addGalleryPhotos} disabled={saving}>
            <Text style={styles.btnText}>Add Gallery Photos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Gallery</Text>
      {photos.length === 0 ? (
        <Text style={styles.empty}>No gallery photos.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
          {photos.map((p, idx) => (
            <View key={idx} style={styles.thumbWrap}>
              <Image source={{ uri: p }} style={styles.thumb} />
              <TouchableOpacity style={styles.removeBadge} onPress={() => removePhoto(idx)} disabled={saving}>
                <Text style={styles.removeBadgeText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <Text style={styles.sectionTitle}>Details</Text>
      <TextInput value={make} onChangeText={setMake} style={styles.input} placeholder="Make (e.g. Toyota)" placeholderTextColor={c.textMuted} />
      <TextInput value={model} onChangeText={setModel} style={styles.input} placeholder="Model (e.g. Corolla)" placeholderTextColor={c.textMuted} />
      <TextInput value={registration} onChangeText={setRegistration} style={styles.input} placeholder="Registration" placeholderTextColor={c.textMuted} />
      <TextInput value={year} onChangeText={setYear} style={styles.input} placeholder="Year" placeholderTextColor={c.textMuted} keyboardType="numeric" />
      <TextInput value={vin} onChangeText={setVin} style={styles.input} placeholder="VIN" placeholderTextColor={c.textMuted} />
      <TextInput value={engineNumber} onChangeText={setEngineNumber} style={styles.input} placeholder="Engine Number" placeholderTextColor={c.textMuted} />
      <TextInput value={mileage} onChangeText={setMileage} style={styles.input} placeholder="Mileage" placeholderTextColor={c.textMuted} keyboardType="numeric" />
      <TextInput value={odometer} onChangeText={setOdometer} style={styles.input} placeholder="Odometer" placeholderTextColor={c.textMuted} keyboardType="numeric" />
      <TextInput value={serviceIntervalKm} onChangeText={setServiceIntervalKm} style={styles.input} placeholder="Service Interval (km)" placeholderTextColor={c.textMuted} keyboardType="numeric" />
      <TextInput value={capacity} onChangeText={setCapacity} style={styles.input} placeholder="Capacity" placeholderTextColor={c.textMuted} keyboardType="numeric" />
      <TextInput value={type} onChangeText={setType} style={styles.input} placeholder="Type (optional)" placeholderTextColor={c.textMuted} />
      <TextInput value={baseLocation} onChangeText={setBaseLocation} style={styles.input} placeholder="Base Location (optional)" placeholderTextColor={c.textMuted} />
      <TextInput value={status} onChangeText={setStatus} style={styles.input} placeholder="Status (Available/In Use/Maintenance)" placeholderTextColor={c.textMuted} />

      <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color={c.primaryText} /> : <Text style={styles.btnPrimaryText}>{editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    sectionTitle: { fontSize: 14, fontWeight: '900', marginTop: 12, marginBottom: 8, color: c.text },
    empty: { color: c.textMuted },
    input: { borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12, marginBottom: 10, backgroundColor: c.surface, color: c.text },
    btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    btnText: { color: c.text, fontWeight: '900' },
    btnPrimary: { marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary, alignItems: 'center' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900' },
    photoRow: { flexDirection: 'row', alignItems: 'center' },
    mainPhotoWrap: { width: 120, height: 120, borderRadius: 14, overflow: 'hidden', backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    mainPhoto: { width: '100%', height: '100%' },
    mainPhotoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { color: c.textMuted, fontWeight: '800' },
    thumbWrap: { width: 88, height: 88, borderRadius: 14, overflow: 'hidden', marginRight: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    thumb: { width: '100%', height: '100%' },
    removeBadge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    removeBadgeText: { color: '#fff', fontSize: 18, lineHeight: 20 },
  });
}
