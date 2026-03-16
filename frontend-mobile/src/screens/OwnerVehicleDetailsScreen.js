import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Image, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { deleteVehicle, getVehicleById, updateVehicle } from '../api/vehicles';
import client from '../api/client';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getVehicleProfitability } from '../api/vehicleFinancials';
import { useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchAllTaxiRanks } from '../api/taxiRanks';
import { createLinkRequest, getRequestsByUser } from '../api/vehicleTaxiRankRequests';

const IMAGE_MEDIA_TYPES =
  ImagePicker?.MediaType?.Image
    ? [ImagePicker.MediaType.Image]
    : (ImagePicker?.MediaTypeOptions?.Images ?? ImagePicker?.MediaTypeOptions?.All);

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
  const { user } = useAuth();

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
  const [activeTab, setActiveTab] = useState('details');
  const [statsStart, setStatsStart] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [statsEnd, setStatsEnd] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Taxi Rank Linking
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [selectedTaxiRank, setSelectedTaxiRank] = useState(null);
  const [linkNotes, setLinkNotes] = useState('');
  const [linkRequests, setLinkRequests] = useState([]);

  const [assignedDriver, setAssignedDriver] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [allDrivers, setAllDrivers] = useState([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);

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

  async function loadAssignedDriver(vid) {
    try {
      const r = await client.get(`/Drivers/vehicle/${vid}`);
      setAssignedDriver(r.data || null);
    } catch {
      setAssignedDriver(null);
    }
  }

  async function refresh() {
    if (!vehicleId) return;
    try {
      setBusy(true);
      const fresh = await getVehicleById(vehicleId);
      setVehicleData(normalizeVehicle(fresh));
      await loadAssignedDriver(vehicleId);
    } catch (e) {
      console.warn('Failed to refresh vehicle', e);
    } finally {
      setBusy(false);
    }
  }

  async function openLinkModal() {
    setDriverSearch('');
    setLinkModalOpen(true);
    try {
      const r = await client.get('/Drivers');
      setAllDrivers(Array.isArray(r.data) ? r.data : []);
    } catch {
      setAllDrivers([]);
    }
  }

  async function linkDriver(driver) {
    setLinkBusy(true);
    try {
      await client.put(`/Drivers/${driver.id}`, { ...driver, assignedVehicleId: vehicleId });
      setAssignedDriver({ ...driver, assignedVehicleId: vehicleId });
      setLinkModalOpen(false);
      Alert.alert('Linked', `${driver.name} has been linked to this vehicle.`);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e.message || 'Failed to link driver');
    } finally {
      setLinkBusy(false);
    }
  }

  async function unlinkDriver() {
    if (!assignedDriver) return;
    Alert.alert('Unlink Driver', `Remove ${assignedDriver.name} from this vehicle?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlink', style: 'destructive', onPress: async () => {
          setLinkBusy(true);
          try {
            const zero = '00000000-0000-0000-0000-000000000000';
            await client.put(`/Drivers/${assignedDriver.id}`, { ...assignedDriver, assignedVehicleId: zero });
            setAssignedDriver(null);
          } catch (e) {
            Alert.alert('Error', e?.response?.data?.message || e.message || 'Failed to unlink driver');
          } finally {
            setLinkBusy(false);
          }
        }
      }
    ]);
  }

  async function changeProfilePhoto() {
    const ok = await ensureMediaPermission();
    if (!ok) return;
    if (!vehicleId) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      ...(IMAGE_MEDIA_TYPES ? { mediaTypes: IMAGE_MEDIA_TYPES } : {}),
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
      ...(IMAGE_MEDIA_TYPES ? { mediaTypes: IMAGE_MEDIA_TYPES } : {}),
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

  function formatDateStr(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async function loadTaxiRanks() {
    try {
      const resp = await fetchAllTaxiRanks();
      const ranks = resp.data || resp || [];
      setTaxiRanks(ranks);
    } catch (err) {
      console.error('Error loading taxi ranks:', err);
      Alert.alert('Error', 'Failed to load taxi ranks');
    }
  }

  async function loadLinkRequests() {
    if (!user?.userId && !user?.id) return;
    try {
      const requests = await getRequestsByUser(user.userId || user.id);
      setLinkRequests(requests || []);
    } catch (err) {
      console.error('Error loading link requests:', err);
      // Set empty array if loading fails - table might not exist yet or no requests
      setLinkRequests([]);
    }
  }

  async function handleOpenLinkModal() {
    setLinkModalVisible(true);
    loadTaxiRanks();
    loadLinkRequests();
  }

  async function handleSubmitLinkRequest() {
    if (!selectedTaxiRank) {
      Alert.alert('Error', 'Please select a taxi rank');
      return;
    }

    if (!vehicleData) {
      Alert.alert('Error', 'Vehicle data not available');
      return;
    }

    try {
      const request = {
        VehicleId: vehicleData.id,
        TaxiRankId: selectedTaxiRank.id,
        RequestedByUserId: user.userId || user.id,
        RequestedByName: user.fullName || user.email || 'Unknown',
        VehicleRegistration: vehicleData.registrationNumber || vehicleData.registration || '',
        TaxiRankName: selectedTaxiRank.name,
        Notes: linkNotes.trim() || ''
      };

      console.log('Submitting link request:', JSON.stringify(request));
      await createLinkRequest(request);
      Alert.alert('Success', 'Link request submitted successfully. The taxi rank manager will review your request.');
      setLinkModalVisible(false);
      setSelectedTaxiRank(null);
      setLinkNotes('');
      loadLinkRequests();
    } catch (err) {
      console.error('Link request error:', err?.response?.status, JSON.stringify(err?.response?.data));
      Alert.alert('Error', err?.response?.data?.error || err?.response?.data?.details || err?.message || 'Failed to submit request');
    }
  }

  async function loadStats() {
    if (!vehicleId) return;
    try {
      setLoadingStats(true);
      const data = await getVehicleProfitability(vehicleId, formatDateStr(statsStart), formatDateStr(statsEnd));
      setStatsData(data);
    } catch (e) {
      console.warn('Failed to load statistics', e);
      Alert.alert('Error', 'Failed to load vehicle statistics');
    } finally {
      setLoadingStats(false);
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
  const mainPhotoUri = v?.photoBase64 || v?.photos?.[0] || '';

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

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'details' && styles.tabBtnActive]} onPress={() => setActiveTab('details')}>
          <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'statistics' && styles.tabBtnActive]} onPress={() => setActiveTab('statistics')}>
          <Text style={[styles.tabText, activeTab === 'statistics' && styles.tabTextActive]}>Statistics</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'details' && (
      <>
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

      <TouchableOpacity
        style={[styles.btnSecondary, { marginTop: 10 }]}
        onPress={handleOpenLinkModal}
        disabled={busy}
      >
        <Ionicons name="link" size={18} color={c.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.btnSecondaryText, { color: c.primary }]}>
          {v.taxiRankId ? 'Linked to Taxi Rank' : 'Link to Taxi Rank'}
        </Text>
      </TouchableOpacity>

      {linkRequests.length > 0 && (
        <View style={[styles.requestsInfo, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.requestsTitle, { color: c.text }]}>Link Requests</Text>
          {linkRequests.slice(0, 3).map(req => (
            <View key={req.id} style={styles.requestRow}>
              <Text style={[styles.requestText, { color: c.textMuted }]}>
                {req.taxiRankName} - {req.status}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.galleryActionsRow}>
        <TouchableOpacity style={[styles.btn, styles.btnSpaced]} onPress={addGalleryPhotos} disabled={busy}>
          <Text style={styles.btnText}>Add Photos</Text>
        </TouchableOpacity>
   
        <TouchableOpacity style={[styles.btn, styles.btnSpaced]} onPress={refresh} disabled={busy}>
          <Text style={styles.btnText}>Refresh</Text>
        </TouchableOpacity>
        {busy && <ActivityIndicator style={{ marginLeft: 10 }} />}
      </View>

      <Text style={styles.sectionTitle}>Profile Photo</Text>
      <View style={styles.mainPhotoWrap}>
        {mainPhotoUri && !mainPhotoFailed ? (
          <TouchableOpacity style={styles.mainPhoto} onPress={() => openViewer(mainPhotoUri)} disabled={busy}>
            <ImageComponent
              source={{ uri: cachedMainPhotoUri || mainPhotoUri }}
              style={styles.mainPhoto}
              {...coverProps}
              onError={(e) => {
                setMainPhotoFailed(true);
                console.warn('Failed to load profile photo', {
                  vehicleId,
                  usedCachedFile: Boolean(cachedMainPhotoUri),
                  cachedPrefix: cachedMainPhotoUri ? String(cachedMainPhotoUri).slice(0, 40) : '',
                  uriPrefix: String(mainPhotoUri).slice(0, 40),
                  uriLength: String(mainPhotoUri).length,
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
                {p === mainPhotoUri && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
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

      {/* ── Assigned Driver ─────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Assigned Driver</Text>
      {assignedDriver ? (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarTxt}>{(assignedDriver.name || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{assignedDriver.name}</Text>
            <Text style={styles.driverMeta}>{assignedDriver.phone}{assignedDriver.category ? `  ·  ${assignedDriver.category}` : ''}</Text>
            {assignedDriver.hasPdp && <Text style={styles.pdpBadge}>PDP</Text>}
          </View>
          <View style={styles.driverActions}>
            <TouchableOpacity style={styles.driverChangeBtn} onPress={openLinkModal} disabled={linkBusy}>
              <Text style={styles.driverChangeTxt}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.driverUnlinkBtn} onPress={unlinkDriver} disabled={linkBusy}>
              {linkBusy ? <ActivityIndicator size="small" color="#ef4444" /> : <Text style={styles.driverUnlinkTxt}>Unlink</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.linkDriverBtn} onPress={openLinkModal} disabled={linkBusy}>
          {linkBusy
            ? <ActivityIndicator color={c.primaryText} />
            : <Text style={styles.linkDriverTxt}>+ Link a Driver</Text>}
        </TouchableOpacity>
      )}

      {/* Link Driver Modal */}
      <Modal visible={linkModalOpen} transparent animationType="slide" onRequestClose={() => setLinkModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Driver</Text>
              <TouchableOpacity onPress={() => setLinkModalOpen(false)}>
                <Text style={[styles.modalAction, { color: c.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.driverSearch}
              placeholder="Search by name or phone…"
              placeholderTextColor={c.textMuted}
              value={driverSearch}
              onChangeText={setDriverSearch}
            />
            <ScrollView style={{ maxHeight: 380 }}>
              {allDrivers
                .filter(d => {
                  const q = driverSearch.toLowerCase();
                  return !q || (d.name || '').toLowerCase().includes(q) || (d.phone || '').includes(q);
                })
                .map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.driverPickerRow, assignedDriver?.id === d.id && styles.driverPickerRowActive]}
                    onPress={() => linkDriver(d)}
                    disabled={linkBusy}
                  >
                    <View style={[styles.driverAvatar, { width: 36, height: 36, borderRadius: 18 }]}>
                      <Text style={styles.driverAvatarTxt}>{(d.name || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.driverName}>{d.name}</Text>
                      <Text style={styles.driverMeta}>
                        {d.phone}{d.category ? `  ·  ${d.category}` : ''}
                        {d.isAvailable ? '  ·  🟢 Available' : '  ·  🔴 Offline'}
                      </Text>
                    </View>
                    {assignedDriver?.id === d.id && (
                      <Text style={{ color: c.primary, fontWeight: '900', fontSize: 18 }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              {allDrivers.length === 0 && (
                <Text style={[styles.empty, { textAlign: 'center', paddingVertical: 24 }]}>No drivers found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Button color={c.primary} title="View Weekly Performance" onPress={() => navigation.navigate('VehiclePerformance', { vehicle: v })} />
      </>
      )}

      {activeTab === 'statistics' && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>From</Text>
              {Platform.OS === 'web' ? (
                <View style={{ position: 'relative' }}>
                  <View style={[styles.statsDateBtn, { pointerEvents: 'none' }]}>
                    <Text style={styles.statsDateBtnText}>{formatDateStr(statsStart)}</Text>
                    <Text style={styles.statsDateIcon}>📅</Text>
                  </View>
                  <input type="date" value={formatDateStr(statsStart)} onChange={e => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setStatsStart(d); }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none' }} />
                </View>
              ) : (
                <TouchableOpacity style={styles.statsDateBtn} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.statsDateBtnText}>{formatDateStr(statsStart)}</Text>
                  <Text style={styles.statsDateIcon}>📅</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>To</Text>
              {Platform.OS === 'web' ? (
                <View style={{ position: 'relative' }}>
                  <View style={[styles.statsDateBtn, { pointerEvents: 'none' }]}>
                    <Text style={styles.statsDateBtnText}>{formatDateStr(statsEnd)}</Text>
                    <Text style={styles.statsDateIcon}>📅</Text>
                  </View>
                  <input type="date" value={formatDateStr(statsEnd)} onChange={e => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setStatsEnd(d); }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none' }} />
                </View>
              ) : (
                <TouchableOpacity style={styles.statsDateBtn} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.statsDateBtnText}>{formatDateStr(statsEnd)}</Text>
                  <Text style={styles.statsDateIcon}>📅</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {Platform.OS === 'android' && showStartPicker && (
            <DateTimePicker value={statsStart} mode="date" display="default" onChange={(_, d) => { setShowStartPicker(false); if (d) setStatsStart(d); }} />
          )}
          {Platform.OS === 'android' && showEndPicker && (
            <DateTimePicker value={statsEnd} mode="date" display="default" onChange={(_, d) => { setShowEndPicker(false); if (d) setStatsEnd(d); }} />
          )}
          {Platform.OS === 'ios' && (
            <Modal transparent animationType="slide" visible={showStartPicker} onRequestClose={() => setShowStartPicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowStartPicker(false)}><Text style={[styles.modalAction, { color: c.textMuted }]}>Cancel</Text></TouchableOpacity>
                    <Text style={styles.modalTitle}>Start Date</Text>
                    <TouchableOpacity onPress={() => setShowStartPicker(false)}><Text style={[styles.modalAction, { color: c.primary }]}>Done</Text></TouchableOpacity>
                  </View>
                  <DateTimePicker value={statsStart} mode="date" display="spinner" onChange={(_, d) => { if (d) setStatsStart(d); }} style={{ width: '100%' }} />
                </View>
              </View>
            </Modal>
          )}
          {Platform.OS === 'ios' && (
            <Modal transparent animationType="slide" visible={showEndPicker} onRequestClose={() => setShowEndPicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowEndPicker(false)}><Text style={[styles.modalAction, { color: c.textMuted }]}>Cancel</Text></TouchableOpacity>
                    <Text style={styles.modalTitle}>End Date</Text>
                    <TouchableOpacity onPress={() => setShowEndPicker(false)}><Text style={[styles.modalAction, { color: c.primary }]}>Done</Text></TouchableOpacity>
                  </View>
                  <DateTimePicker value={statsEnd} mode="date" display="spinner" onChange={(_, d) => { if (d) setStatsEnd(d); }} style={{ width: '100%' }} />
                </View>
              </View>
            </Modal>
          )}

          <TouchableOpacity style={[styles.btnLoad, loadingStats && { opacity: 0.6 }]} onPress={loadStats} disabled={loadingStats}>
            {loadingStats ? <ActivityIndicator color={c.primaryText} /> : <Text style={styles.btnLoadText}>Load Statistics</Text>}
          </TouchableOpacity>

          {statsData && (
            <>
              <View style={styles.statsCards}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>R{Number(statsData.totalEarnings || 0).toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Earnings</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: c.danger }]}>R{Number(statsData.totalExpenses || 0).toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Expenses</Text>
                </View>
              </View>
              <View style={styles.statsCards}>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: statsData.isProfitable ? c.success : c.danger }]}>R{Number(statsData.netProfit || 0).toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Net Profit</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: statsData.isProfitable ? c.success : c.danger }]}>{Number(statsData.profitMargin || 0).toFixed(1)}%</Text>
                  <Text style={styles.statLabel}>Margin</Text>
                </View>
              </View>

              {(statsData.earningsBreakdown || []).length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Earnings by Source</Text>
                  {(statsData.earningsBreakdown || []).map((item, idx) => (
                    <View key={idx} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel} numberOfLines={1}>{item.source}</Text>
                      <View style={styles.breakdownBarWrap}>
                        <View style={[styles.breakdownBar, { width: `${Math.min(100, item.percentage || 0)}%`, backgroundColor: c.success }]} />
                      </View>
                      <Text style={styles.breakdownAmt}>R{Number(item.amount || 0).toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              )}

              {(statsData.expensesBreakdown || []).length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Expenses by Category</Text>
                  {(statsData.expensesBreakdown || []).map((item, idx) => (
                    <View key={idx} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel} numberOfLines={1}>{item.category}</Text>
                      <View style={styles.breakdownBarWrap}>
                        <View style={[styles.breakdownBar, { width: `${Math.min(100, item.percentage || 0)}%`, backgroundColor: c.danger }]} />
                      </View>
                      <Text style={styles.breakdownAmt}>R{Number(item.amount || 0).toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* Taxi Rank Link Request Modal */}
      <Modal visible={linkModalVisible} transparent animationType="slide" onRequestClose={() => setLinkModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Link to Taxi Rank</Text>
              <TouchableOpacity onPress={() => setLinkModalVisible(false)}>
                <Ionicons name="close" size={28} color={c.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={[styles.modalLabel, { color: c.text }]}>Select Taxi Rank</Text>
              {taxiRanks.length === 0 ? (
                <Text style={[styles.modalEmpty, { color: c.textMuted }]}>No taxi ranks available</Text>
              ) : (
                taxiRanks.map(rank => (
                  <TouchableOpacity
                    key={rank.id}
                    style={[
                      styles.rankOption,
                      { backgroundColor: selectedTaxiRank?.id === rank.id ? c.primary + '20' : c.background, borderColor: selectedTaxiRank?.id === rank.id ? c.primary : c.border }
                    ]}
                    onPress={() => setSelectedTaxiRank(rank)}
                  >
                    <View style={[styles.rankIcon, { backgroundColor: c.primary + '20' }]}>
                      <Ionicons name="business" size={20} color={c.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rankName, { color: c.text }]}>{rank.name}</Text>
                      <Text style={[styles.rankLocation, { color: c.textMuted }]}>{rank.location || 'No location'}</Text>
                    </View>
                    {selectedTaxiRank?.id === rank.id && (
                      <Ionicons name="checkmark-circle" size={24} color={c.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}

              <Text style={[styles.modalLabel, { color: c.text, marginTop: 16 }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                placeholder="Add any notes for the taxi rank manager..."
                placeholderTextColor={c.textMuted}
                value={linkNotes}
                onChangeText={setLinkNotes}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: c.primary, opacity: selectedTaxiRank ? 1 : 0.5 }]}
                onPress={handleSubmitLinkRequest}
                disabled={!selectedTaxiRank}
              >
                <Text style={[styles.modalSubmitText, { color: c.primaryText }]}>Submit Request</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    btnSecondaryText: { fontWeight: '800', fontSize: 14 },
    
    requestsInfo: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
    requestsTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
    requestRow: { paddingVertical: 4 },
    requestText: { fontSize: 12 },
    
    modalLabel: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
    modalEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
    modalContent: { padding: 20 },
    rankOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, marginBottom: 10, gap: 12 },
    rankIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    rankName: { fontSize: 15, fontWeight: '800' },
    rankLocation: { fontSize: 12, marginTop: 2 },
    modalInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
    modalSubmitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    modalSubmitText: { fontSize: 16, fontWeight: '800' },
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
    tabRow: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: c.border },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    tabBtnActive: { backgroundColor: c.primary },
    tabText: { fontWeight: '900', color: c.text },
    tabTextActive: { color: c.primaryText },
    statsContainer: { paddingTop: 4 },
    dateRow: { flexDirection: 'row', marginBottom: 12 },
    dateLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, marginBottom: 4 },
    statsDateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: c.border, padding: 10, borderRadius: 12, backgroundColor: c.surface },
    statsDateBtnText: { fontSize: 13, color: c.text, fontWeight: '600' },
    statsDateIcon: { fontSize: 16 },
    driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
    driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    driverAvatarTxt: { color: c.primaryText, fontWeight: '900', fontSize: 18 },
    driverName: { fontSize: 14, fontWeight: '800', color: c.text },
    driverMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    pdpBadge: { marginTop: 4, alignSelf: 'flex-start', fontSize: 10, fontWeight: '800', color: c.primary, borderWidth: 1, borderColor: c.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
    driverActions: { gap: 6 },
    driverChangeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    driverChangeTxt: { fontSize: 12, fontWeight: '700', color: c.text },
    driverUnlinkBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444' },
    driverUnlinkTxt: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
    linkDriverBtn: { padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.primary, alignItems: 'center', marginBottom: 12 },
    linkDriverTxt: { color: c.primary, fontWeight: '800', fontSize: 14 },
    driverSearch: { borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 10, color: c.text, backgroundColor: c.background, marginBottom: 10, fontSize: 13 },
    driverPickerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 6, backgroundColor: c.surface2 },
    driverPickerRowActive: { borderWidth: 1.5, borderColor: c.primary, backgroundColor: c.primary + '11' },
    btnLoad: { paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', marginBottom: 16 },
    btnLoadText: { color: c.primaryText, fontWeight: '900' },
    statsCards: { flexDirection: 'row', marginBottom: 8 },
    statCard: { flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 12, marginHorizontal: 4, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    statValue: { fontSize: 17, fontWeight: '900', color: c.text },
    statLabel: { fontSize: 11, color: c.textMuted, marginTop: 4 },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    breakdownLabel: { width: 80, fontSize: 12, color: c.text, fontWeight: '600' },
    breakdownBarWrap: { flex: 1, height: 8, backgroundColor: c.surface2, borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
    breakdownBar: { height: '100%', borderRadius: 4 },
    breakdownAmt: { width: 72, fontSize: 12, color: c.text, fontWeight: '700', textAlign: 'right' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    modalAction: { fontSize: 15, fontWeight: '600' },
  });
}
