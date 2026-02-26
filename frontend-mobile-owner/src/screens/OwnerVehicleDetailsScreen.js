import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Image, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { deleteVehicle, getVehicleById, updateVehicle } from '../api/vehicles';
import { useAppTheme } from '../theme';

let ExpoImage = null;
try {
  ExpoImage = require('expo-image')?.Image || null;
} catch (e) {
  ExpoImage = null;
}

let FileSystem = null;
try {
  FileSystem = require('expo-file-system');
} catch (e) {
  FileSystem = null;
}

export default function OwnerVehicleDetailsScreen({ route, navigation }) {
  const { vehicle } = route.params || {};

  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const ImageComponent = ExpoImage || Image;
  const coverProps = ExpoImage ? { contentFit: 'cover' } : { resizeMode: 'cover' };
  const containProps = ExpoImage ? { contentFit: 'contain' } : { resizeMode: 'contain' };

  const vehicleId = useMemo(() => vehicle?.id || vehicle?.Id || null, [vehicle]);
  const [vehicleData, setVehicleData] = useState(vehicle || null);
  const [busy, setBusy] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState(null);
  const [mainPhotoFailed, setMainPhotoFailed] = useState(false);
  const [cachedMainPhotoUri, setCachedMainPhotoUri] = useState('');
  const [mainPhotoHint, setMainPhotoHint] = useState('No Photo');

  function normalizePhotoUri(uri) {
    if (!uri) return '';
    if (typeof uri === 'object') {
      const candidate =
        uri?.uri ||
        uri?.url ||
        uri?.Url ||
        uri?.value ||
        uri?.Value ||
        uri?.data ||
        uri?.Data ||
        uri?.base64 ||
        uri?.Base64 ||
        uri?.photoBase64 ||
        uri?.PhotoBase64 ||
        null;
      if (candidate) return normalizePhotoUri(candidate);
      return '';
    }

    const s = String(uri).trim();
    if (!s) return '';
    if (s.startsWith('data:')) return s;
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('file://')) return s;
    if (s.startsWith('data:image/') && s.includes('base64') && !s.includes('base64,')) {
      // common malformed prefix: 'data:image/jpeg;base64AAAA' (missing comma)
      const idx = s.indexOf('base64');
      const prefix = s.slice(0, idx + 'base64'.length);
      const rest = s.slice(idx + 'base64'.length);
      return `${prefix},${rest}`;
    }
    // backend sometimes returns raw base64 without the data: prefix
    if (/^[A-Za-z0-9+/=_-]+$/.test(s)) {
      const head = s.slice(0, 12);
      let mime = 'image/jpeg';
      if (head.startsWith('/9j/')) mime = 'image/jpeg';
      else if (head.startsWith('iVBOR')) mime = 'image/png';
      else if (head.startsWith('R0lGOD')) mime = 'image/gif';
      else if (head.startsWith('UklGR')) mime = 'image/webp';
      return `data:${mime};base64,${s}`;
    }
    return s;
  }

  function normalizeVehicle(v) {
    if (!v) return v;
    const photoBase64Raw = v.photoBase64 ?? v.PhotoBase64 ?? '';
    const photosRaw = Array.isArray(v.photos) ? v.photos : (Array.isArray(v.Photos) ? v.Photos : []);
    const photoBase64 = normalizePhotoUri(photoBase64Raw);
    const photos = (photosRaw || []).map(normalizePhotoUri).filter(Boolean);
    return { ...v, photoBase64, photos };
  }

  const gallery = useMemo(() => {
    const v = normalizeVehicle(vehicleData);
    const out = [];
    if (v?.photoBase64) out.push(v.photoBase64);
    if (Array.isArray(v?.photos)) out.push(...v.photos);
    return out;
  }, [vehicleData]);

  useEffect(() => {
    setMainPhotoFailed(false);
    setCachedMainPhotoUri('');
  }, [vehicleData?.photoBase64, vehicleData?.PhotoBase64]);

  useEffect(() => {
    const current = normalizeVehicle(vehicleData);
    const uri = current?.photoBase64 || '';
    if (!uri) {
      setMainPhotoHint('No Photo');
      return;
    }

    const isWebp = String(uri).startsWith('data:image/webp') || String(uri).includes('image/webp');
    if (Platform.OS !== 'web' && isWebp && !ExpoImage) {
      console.warn('Profile photo is WEBP but expo-image is not installed; RN Image may not render it. Install expo-image.');
      setMainPhotoHint('Photo requires expo-image');
      return;
    }

    if (Platform.OS !== 'web' && String(uri).startsWith('data:image/') && String(uri).includes(';base64,') && !FileSystem) {
      console.warn('Profile photo is base64 data URI but expo-file-system is not installed; caching fallback is disabled.');
      setMainPhotoHint('Photo requires expo-file-system');
      return;
    }

    setMainPhotoHint('No Photo');
  }, [vehicleData]);

  useEffect(() => {
    let cancelled = false;

    async function cacheDataUriToFile() {
      // Web can render data URIs directly; expo-file-system caching is not required and may not be supported.
      if (Platform.OS === 'web') return;
      if (!FileSystem?.writeAsStringAsync) return;
      if (!FileSystem?.cacheDirectory) return;
      if (!FileSystem?.EncodingType?.Base64) return;
      const current = normalizeVehicle(vehicleData);
      const uri = current?.photoBase64 || '';
      if (!uri || !uri.startsWith('data:image/') || !uri.includes(';base64,')) return;

      try {
        const match = uri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
        if (!match) return;
        const mime = match[1];
        const base64 = match[2];
        if (!base64) return;

        const ext = mime.includes('png') ? 'png' : (mime.includes('webp') ? 'webp' : (mime.includes('gif') ? 'gif' : 'jpg'));
        const fileUri = `${FileSystem.cacheDirectory}vehicle_${vehicleId || 'unknown'}_main.${ext}`;

        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (!cancelled) setCachedMainPhotoUri(fileUri);
      } catch (e) {
        console.warn('Failed to cache main photo', e);
      }
    }

    cacheDataUriToFile();

    return () => {
      cancelled = true;
    };
  }, [vehicleId, vehicleData]);

  async function refresh() {
    if (!vehicleId) return;
    try {
      setBusy(true);
      const fresh = await getVehicleById(vehicleId);
      setVehicleData(normalizeVehicle(fresh));
    } catch (e) {
      console.warn('Failed to refresh vehicle', e);
    } finally {
      setBusy(false);
    }
  }

  async function changeProfilePhoto() {
    const ok = await ensureMediaPermission();
    if (!ok) return;
    if (!vehicleId) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.base64) return Alert.alert('Error', 'Failed to read image');

    const newMain = `data:image/jpeg;base64,${asset.base64}`;
    const current = normalizeVehicle(vehicleData);
    const updated = {
      ...current,
      id: current?.id || current?.Id || vehicleId,
      photoBase64: newMain,
      photos: current?.photoBase64 ? [current.photoBase64, ...(current?.photos || [])] : (current?.photos || []),
    };

    try {
      setBusy(true);
      await updateVehicle(vehicleId, updated);
      setVehicleData(updated);
    } catch (e) {
      console.warn('Failed to update profile photo', e);
      Alert.alert('Error', 'Failed to update profile photo');
    } finally {
      setBusy(false);
    }
  }

  function openViewer(uri) {
    if (!uri) return;
    setViewerUri(normalizePhotoUri(uri));
    setViewerOpen(true);
  }

  useEffect(() => {
    const title = vehicleData?.registration || vehicleData?.Registration;
    if (title) {
      navigation.setOptions({ title });
    }
  }, [navigation, vehicleData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refresh();
    });
    return unsubscribe;
  }, [navigation, vehicleId]);

  async function ensureMediaPermission() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to select images.');
      return false;
    }
    return true;
  }

  async function addGalleryPhotos() {
    const ok = await ensureMediaPermission();
    if (!ok) return;
    if (!vehicleId) return;

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

    if (newPhotos.length === 0) return;

    const current = normalizeVehicle(vehicleData);
    const updated = {
      ...current,
      id: current?.id || current?.Id || vehicleId,
      photoBase64: current?.photoBase64 || '',
      photos: [...(current?.photos || []), ...newPhotos],
    };

    try {
      setBusy(true);
      await updateVehicle(vehicleId, updated);
      setVehicleData(updated);
    } catch (e) {
      console.warn('Failed to add gallery photos', e);
      Alert.alert('Error', 'Failed to add photos');
    } finally {
      setBusy(false);
    }
  }

  async function setAsMain(photoUri) {
    if (!vehicleId) return;
    const current = normalizeVehicle(vehicleData);
    const normalized = normalizePhotoUri(photoUri);
    if (!normalized) return;

    const newPhotos = (current?.photos || []).filter(p => p !== normalized);
    if (current?.photoBase64) newPhotos.unshift(current.photoBase64);

    const updated = {
      ...current,
      id: current?.id || current?.Id || vehicleId,
      photoBase64: normalized,
      photos: newPhotos,
    };

    try {
      setBusy(true);
      await updateVehicle(vehicleId, updated);
      setVehicleData(updated);
      setMainPhotoFailed(false);
      setViewerOpen(false);
    } catch (e) {
      console.warn('Failed to set main photo', e);
      Alert.alert('Error', 'Failed to set main photo');
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(photoUri) {
    if (!vehicleId) return;
    const current = normalizeVehicle(vehicleData);
    let updated;

    if (current?.photoBase64 === photoUri) {
      const remaining = (current?.photos || []).filter(p => p !== photoUri);
      const nextMain = remaining[0] || '';
      updated = {
        ...current,
        id: current?.id || current?.Id || vehicleId,
        photoBase64: nextMain,
        photos: nextMain ? remaining.slice(1) : [],
      };
    } else {
      updated = {
        ...current,
        id: current?.id || current?.Id || vehicleId,
        photos: (current?.photos || []).filter(p => p !== photoUri),
      };
    }

    try {
      setBusy(true);
      await updateVehicle(vehicleId, updated);
      setVehicleData(updated);
    } catch (e) {
      console.warn('Failed to delete photo', e);
      Alert.alert('Error', 'Failed to delete photo');
    } finally {
      setBusy(false);
    }
  }

  if (!vehicleData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Vehicle</Text>
        <Text style={styles.empty}>No vehicle selected.</Text>
      </View>
    );
  }

  const v = normalizeVehicle(vehicleData);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>{v.make || v.Make} {v.model || v.Model}</Text>
      <Text style={styles.sub}>{v.registration || v.Registration}</Text>

      <Modal visible={viewerOpen} transparent={true} animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerOpen(false)}>
            <Text style={styles.viewerCloseText}>Close</Text>
          </TouchableOpacity>
          <View style={styles.viewerImageWrap}>
            {viewerUri ? (
              <ImageComponent source={{ uri: viewerUri }} style={styles.viewerImage} {...containProps} />
            ) : null}
          </View>
          <View style={styles.viewerActionsRow}>
            <TouchableOpacity
              style={styles.btn}
              disabled={busy || !viewerUri}
              onPress={() => {
                if (!viewerUri) return;
                setAsMain(viewerUri);
              }}
            >
              <Text style={styles.btnText}>Set as Profile Picture</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('OwnerVehicleForm', { vehicle: v })}>
          <Text style={styles.btnPrimaryText}>Edit</Text>
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <TouchableOpacity
          style={styles.btnDanger}
          onPress={() => {
            if (!vehicleId) return;
            Alert.alert('Delete vehicle', 'Are you sure you want to delete this vehicle?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteVehicle(vehicleId);
                    navigation.goBack();
                  } catch (e) {
                    Alert.alert('Error', 'Failed to delete vehicle');
                  }
                }
              }
            ]);
          }}
        >
          <Text style={styles.btnDangerText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.finRow}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('OwnerVehicleFinancialEntry', { vehicle: v, type: 'expense' })}
          disabled={busy}
        >
          <Text style={styles.btnText}>Add Expense</Text>
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('OwnerVehicleFinancialEntry', { vehicle: v, type: 'earning' })}
          disabled={busy}
        >
          <Text style={styles.btnText}>Add Earning</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.galleryActionsRow}>
        <TouchableOpacity style={[styles.btn, styles.btnSpaced]} onPress={addGalleryPhotos} disabled={busy}>
          <Text style={styles.btnText}>Add Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSpaced]} onPress={changeProfilePhoto} disabled={busy}>
          <Text style={styles.btnText}>Change Profile Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSpaced]} onPress={refresh} disabled={busy}>
          <Text style={styles.btnText}>Refresh</Text>
        </TouchableOpacity>
        {busy && <ActivityIndicator style={{ marginLeft: 10 }} />}
      </View>

      <Text style={styles.sectionTitle}>Profile Photo</Text>
      <View style={styles.mainPhotoWrap}>
        {v.photoBase64 && !mainPhotoFailed ? (
          <TouchableOpacity onPress={() => openViewer(v.photoBase64)} disabled={busy}>
            <ImageComponent
              source={{ uri: cachedMainPhotoUri || v.photoBase64 }}
              style={styles.mainPhoto}
              {...coverProps}
              onError={(e) => {
                setMainPhotoFailed(true);
                console.warn('Failed to load profile photo', {
                  vehicleId,
                  usedCachedFile: Boolean(cachedMainPhotoUri),
                  cachedPrefix: cachedMainPhotoUri ? String(cachedMainPhotoUri).slice(0, 40) : '',
                  uriPrefix: String(v.photoBase64).slice(0, 40),
                  uriLength: String(v.photoBase64).length,
                  nativeEvent: e?.nativeEvent,
                });
              }}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.mainPhotoPlaceholder}>
            <Text style={styles.placeholderText}>{mainPhotoHint}</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Gallery</Text>
      {gallery.length === 0 ? (
        <Text style={styles.empty}>No photos.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
          {gallery.map((p, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => openViewer(p)}
              disabled={busy}
            >
              <View style={styles.thumbWrap}>
                <ImageComponent
                  source={{ uri: p }}
                  style={styles.thumb}
                  {...coverProps}
                  onError={(e) => {
                    console.warn('Failed to load gallery photo', {
                      vehicleId,
                      index: idx,
                      uriPrefix: String(p).slice(0, 40),
                      uriLength: String(p).length,
                      nativeEvent: e?.nativeEvent,
                    });
                  }}
                />
                {idx === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.card}>
        <Text style={styles.row}><Text style={styles.label}>Status:</Text> {v.status || v.Status || 'Unknown'}</Text>
        <Text style={styles.row}><Text style={styles.label}>Mileage:</Text> {v.mileage || v.Mileage || 0}</Text>
        <Text style={styles.row}><Text style={styles.label}>Year:</Text> {v.year || v.Year || 'N/A'}</Text>
        <Text style={styles.row}><Text style={styles.label}>VIN:</Text> {v.vin || v.VIN || 'N/A'}</Text>
      </View>

      <Button color={c.primary} title="View Weekly Performance" onPress={() => navigation.navigate('VehiclePerformance', { vehicle: v })} />
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    title: { fontSize: 18, fontWeight: '800', color: c.text },
    sub: { fontSize: 13, color: c.textMuted, marginBottom: 12 },
    empty: { color: c.textMuted },
    sectionTitle: { fontSize: 14, fontWeight: '800', marginTop: 12, marginBottom: 8, color: c.text },
    card: { padding: 12, backgroundColor: c.surface, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    row: { fontSize: 13, marginBottom: 6, color: c.textMuted },
    label: { fontWeight: '800', color: c.text },
    actionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    finRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    galleryActionsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
    btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    btnSpaced: { marginRight: 10, marginBottom: 10 },
    btnText: { color: c.text, fontWeight: '800' },
    btnPrimary: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900' },
    btnDanger: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.danger, borderWidth: 1, borderColor: c.danger },
    btnDangerText: { color: c.primaryText, fontWeight: '900' },
    mainPhotoWrap: { width: '100%', height: 180, borderRadius: 14, overflow: 'hidden', backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    mainPhoto: { width: '100%', height: '100%' },
    mainPhotoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { color: c.textMuted, fontWeight: '700' },
    thumbWrap: { width: 96, height: 96, borderRadius: 14, overflow: 'hidden', marginRight: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    thumb: { width: '100%', height: '100%' },
    mainBadge: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)' },
    mainBadgeText: { color: c.accent, fontSize: 10, fontWeight: '900' },
    viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingTop: 40, paddingHorizontal: 12, paddingBottom: 18 },
    viewerClose: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 12 },
    viewerCloseText: { color: '#fff', fontWeight: '900' },
    viewerImageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    viewerImage: { width: '100%', height: '100%' },
    viewerActionsRow: { flexDirection: 'row', justifyContent: 'center', paddingTop: 10 },
  });
}
