import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { AppState } from 'react-native';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, RefreshControl, ActivityIndicator, Platform, Image, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getActiveServiceProviderProfiles } from '../api/serviceProviderProfiles';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';
import { submitMechanicalRequestReview } from '../api/reviews';
import { fetchDriverEvents } from '../api/driverBehavior';
import RatingReviewModal from './RatingReviewModal';
import ThemeToggle from '../components/ThemeToggle';
import { completeTrip } from '../api/taxiRanks';
import { getDriverQueueView, completeQueueTrip } from '../api/queueManagement';
import { completeTrip } from '../api/taxiRanks';
import { startMonitoring, stopMonitoring, isMonitoring, getCurrentSpeed } from '../services/DrivingMonitorService';
import * as Location from 'expo-location';

// ── Expense categories with icons and colors ───────────────────────────────────
const EXPENSE_CATEGORIES = [
  { id: 'fuel', name: 'Fuel', icon: 'business', color: '#10B981' },
  { id: 'maintenance', name: 'Maintenance', icon: 'build', color: '#F59E0B' },
  { id: 'insurance', name: 'Insurance', icon: 'shield-checkmark', color: '#3B82F6' },
  { id: 'repairs', name: 'Repairs', icon: 'hammer', color: '#EF4444' },
  { id: 'towing', name: 'Towing', icon: 'card', color: '#8B5CF6' },
  { id: 'tires', name: 'Tires', icon: 'car-sport', color: '#06B6D4' },
  { id: 'electrical', name: 'Electrical', icon: 'flash', color: '#F59E0B' },
  { id: 'bodywork', name: 'Bodywork', icon: 'car', color: '#EF4444' },
  { id: 'toll', name: 'Toll', icon: 'cash', color: '#6B7280' },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

const CATEGORY_TO_SERVICE_TYPE = {
  'maintenance': 'Mechanical',
  'repairs': 'Mechanical',
  'towing': 'Towing',
  'tires': 'Tire Service',
  'electrical': 'Electrical',
  'bodywork': 'Bodywork',
};

const PART_FIXED_OPTIONS = [
  { id: 'oil_filter', name: 'Oil Filter' },
  { id: 'air_filter', name: 'Air Filter' },
  { id: 'fuel_filter', name: 'Fuel Filter' },
  { id: 'spark_plugs', name: 'Spark Plugs' },
  { id: 'brake_pads', name: 'Brake Pads' },
  { id: 'brake_discs', name: 'Brake Discs' },
  { id: 'battery', name: 'Battery' },
  { id: 'alternator', name: 'Alternator' },
  { id: 'starter_motor', name: 'Starter Motor' },
  { id: 'clutch', name: 'Clutch' },
  { id: 'timing_belt', name: 'Timing Belt' },
  { id: 'tires', name: 'Tires' },
  { id: 'shock_absorbers', name: 'Shock Absorbers' },
  { id: 'exhaust', name: 'Exhaust System' },
  { id: 'radiator', name: 'Radiator' },
  { id: 'water_pump', name: 'Water Pump' },
  { id: 'other', name: 'Other' },
];

// ── API helpers ──────────────────────────────────────────────────────────────
const API = {
  getDriverProfiles: () => client.get('/Identity/driverprofiles'),
  updateDriverProfile: (id, data) => client.put(`/Identity/driverprofiles/${id}`, data),
  getVehicles: () => client.get('/Vehicles'),
  getEarnings: (vid, start, end) => client.get(`/VehicleEarnings/vehicle/${vid}/period?startDate=${start}&endDate=${end}`),
  getExpenses: (vid, start, end) => client.get(`/VehicleExpenses/vehicle/${vid}/period?startDate=${start}&endDate=${end}`),
  addEarning: (data) => client.post('/VehicleEarnings', data),
  addExpense: (data) => client.post('/VehicleExpenses', data),
  getMaintenance: () => client.get('/MechanicalRequests'),
  addMaintenance: (data) => client.post('/MechanicalRequests', data),
  editMaintenance: (id, data) => client.put(`/MechanicalRequests/${id}`, data),
  deleteMaintenance: (id) => client.delete(`/MechanicalRequests/${id}`),
  getMessages: (uid) => client.get(`/Messages/inbox/${uid}`),
};

function fmt(amount) {
  return `R${(+(amount || 0)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function monthRange() {
  const n = new Date();
  return {
    start: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0],
    end: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split('T')[0],
    name: n.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

function statusColor(state) {
  switch ((state || '').toLowerCase()) {
    case 'open': case 'pending': return '#f59e0b';
    case 'approved': return '#3b82f6';
    case 'scheduled': return '#8b5cf6';
    case 'completed': case 'resolved': return '#22c55e';
    case 'rejected': case 'cancelled': return '#ef4444';
    default: return '#9ca3af';
  }
}

function getTripId(trip) {
  return trip?.id || trip?.Id || null;
}

// ── Modals ───────────────────────────────────────────────────────────────────
function DatePickerField({ label, date, onChange, c, s }) {
  const [show, setShow] = useState(false);
  const fmt = d => d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  const isoDate = d => d.toISOString().split('T')[0];

  if (Platform.OS === 'web') {
    return (
      <>
        <Text style={s.label}>{label}</Text>
        <View style={{ position: 'relative', marginBottom: 4 }}>
          <View style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }]}>
            <Text style={{ color: c.text, fontSize: 14 }}>{fmt(date)}</Text>
            <Ionicons name="calendar-outline" size={16} color={c.textMuted} />
          </View>
          <input
            type="date"
            value={isoDate(date)}
            onChange={e => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d)) onChange(d); }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setShow(true)}>
        <Text style={{ color: c.text, fontSize: 14 }}>{fmt(date)}</Text>
        <Ionicons name="calendar-outline" size={16} color={c.textMuted} />
      </TouchableOpacity>
      {Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={show} onRequestClose={() => setShow(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setShow(false)}><Text style={{ color: c.textMuted, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setShow(false)}><Text style={{ color: c.primary, fontWeight: '700' }}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={date} mode="date" display="spinner" onChange={(_, d) => { if (d) onChange(d); }} style={{ width: '100%' }} />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && show && (
        <DateTimePicker value={date} mode="date" display="default" onChange={(_, d) => { setShow(false); if (d) onChange(d); }} />
      )}
    </>
  );
}

function AddEarningModal({ visible, vehicleId, onClose, onSuccess, c, s }) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Trip');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const SOURCES = ['Trip', 'Delivery', 'Bonus', 'Other'];

  function reset() { setAmount(''); setSource('Trip'); setDesc(''); setDate(new Date()); }

  async function submit() {
    if (!amount || isNaN(+amount) || +amount <= 0) return Alert.alert('Validation', 'Enter a valid amount');
    setLoading(true);
    try {
      await API.addEarning({ vehicleId, amount: +amount, source, description: desc, date: date.toISOString().split('T')[0] });
      reset(); onSuccess(); onClose();
    } catch (e) { Alert.alert('Error', e?.response?.data?.error || e.message || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Add Earning</Text>
            <Text style={s.label}>Amount (R)</Text>
            <TextInput style={s.input} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={c.textMuted} />
            <Text style={s.label}>Source</Text>
            <View style={s.chips}>{SOURCES.map(src => (
              <TouchableOpacity key={src} style={[s.chip, source === src && s.chipOn]} onPress={() => setSource(src)}>
                <Text style={[s.chipTxt, source === src && s.chipTxtOn]}>{src}</Text>
              </TouchableOpacity>
            ))}</View>
            <DatePickerField label="Date" date={date} onChange={setDate} c={c} s={s} />
            <Text style={s.label}>Description (optional)</Text>
            <TextInput style={[s.input, { height: 70 }]} multiline value={desc} onChangeText={setDesc} placeholder="Details..." placeholderTextColor={c.textMuted} />
            <View style={s.row2}>
              <TouchableOpacity style={s.btnGhost} onPress={() => { reset(); onClose(); }}><Text style={s.btnGhostTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.btnPrimary} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color={c.primaryText} size="small" /> : <Text style={s.btnPrimaryTxt}>Add Earning</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function AddExpenseModal({ visible, vehicleId, onClose, onSuccess, c, s }) {
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState('fuel');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedParts, setSelectedParts] = useState(new Set());
  const [showPartFixedGrid, setShowPartFixedGrid] = useState(false);
  const [otherPartDescription, setOtherPartDescription] = useState('');
  const [frequentReplacement, setFrequentReplacement] = useState(false);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [newProviderName, setNewProviderName] = useState('');
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [mechanicalCategory, setMechanicalCategory] = useState('');
  const [mechanicalCategories, setMechanicalCategories] = useState([]);
  const [mechanicalSelectedParts, setMechanicalSelectedParts] = useState(new Set());
  const [laborDescription, setLaborDescription] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [warrantyInfo, setWarrantyInfo] = useState('');
  const [showMechanicalCategoryPicker, setShowMechanicalCategoryPicker] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [allProviderProfiles, setAllProviderProfiles] = useState([]);

  useEffect(() => {
    if (visible) {
      loadMechanicalCategories();
      setLoadingProviders(true);
      getActiveServiceProviderProfiles()
        .then(profiles => {
          const arr = Array.isArray(profiles) ? profiles : (profiles?.$values || profiles?.items || []);
          setAllProviderProfiles(arr);
          setServiceProviders(arr);
        })
        .catch(error => {
          console.error('Failed to load service provider profiles:', error);
          setAllProviderProfiles([]);
          setServiceProviders([]);
        })
        .finally(() => setLoadingProviders(false));
    }
  }, [visible]);

  useEffect(() => {
    if (allProviderProfiles.length === 0) return;
    const serviceType = CATEGORY_TO_SERVICE_TYPE[cat];
    if (serviceType) {
      const filtered = allProviderProfiles.filter(p =>
        p.serviceTypes && p.serviceTypes.toLowerCase().includes(serviceType.toLowerCase())
      );
      setServiceProviders(filtered.length > 0 ? filtered : allProviderProfiles);
    } else {
      setServiceProviders(allProviderProfiles);
    }
  }, [cat, allProviderProfiles]);

  function loadMechanicalCategories() {
    const STATIC_MECH_CATEGORIES = [
      { Category: 'Engine', DisplayName: 'Engine & Powertrain', CommonParts: ['Oil Filter', 'Air Filter', 'Spark Plugs', 'Timing Belt', 'Water Pump', 'Alternator'] },
      { Category: 'Brakes', DisplayName: 'Braking System', CommonParts: ['Brake Pads', 'Brake Discs', 'Brake Calipers', 'Brake Lines', 'Brake Fluid'] },
      { Category: 'Suspension', DisplayName: 'Suspension & Steering', CommonParts: ['Shock Absorbers', 'Struts', 'Coil Springs', 'Ball Joints', 'Tie Rods', 'Control Arms'] },
      { Category: 'Electrical', DisplayName: 'Electrical System', CommonParts: ['Battery', 'Spark Plug Wires', 'Fuses', 'Light Bulbs', 'Starter Motor'] },
      { Category: 'Tires', DisplayName: 'Tires & Wheels', CommonParts: ['Tires', 'Wheel Bearings', 'Valve Stems', 'Wheel Nuts', 'Rim'] },
      { Category: 'Body', DisplayName: 'Body & Interior', CommonParts: ['Door Handles', 'Window Regulators', 'Mirrors', 'Headlights', 'Tail Lights'] },
      { Category: 'Service', DisplayName: 'Regular Service', CommonParts: ['Engine Oil', 'Oil Filter', 'Air Filter', 'Fuel Filter', 'Transmission Fluid'] },
    ];
    setMechanicalCategories(STATIC_MECH_CATEGORIES);
  }

  const pickReceiptImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) setReceiptImage(result.assets[0]);
    } catch (e) { Alert.alert('Error', 'Failed to select image'); }
  };

  const takeReceiptPhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) setReceiptImage(result.assets[0]);
    } catch (e) { Alert.alert('Error', 'Failed to take photo'); }
  };

  const toggleMechanicalPart = (partName) => {
    const next = new Set(mechanicalSelectedParts);
    if (next.has(partName)) next.delete(partName); else next.add(partName);
    setMechanicalSelectedParts(next);
  };

  const getAvailableParts = () => {
    const found = mechanicalCategories.find(ct => ct.Category === mechanicalCategory);
    return found ? found.CommonParts : [];
  };

  async function handleAddProvider() {
    if (!newProviderName.trim()) return;
    setLoadingProviders(true);
    try {
      const res = await client.post('/ServiceProviders', { businessName: newProviderName });
      const newEntry = { ...res.data, serviceTypes: '' };
      setAllProviderProfiles(prev => [...prev, newEntry]);
      setServiceProviders(prev => [...prev, newEntry]);
      setSelectedProvider(newEntry);
      setShowAddProvider(false);
      setNewProviderName('');
    } catch (e) { Alert.alert('Error', 'Failed to add service provider'); }
    finally { setLoadingProviders(false); }
  }

  function reset() {
    setAmount(''); setCat('fuel'); setDesc(''); setDate(new Date());
    setInvoiceNumber('');
    setSelectedParts(new Set()); setOtherPartDescription(''); setFrequentReplacement(false);
    setSelectedProvider(null); setNewProviderName(''); setShowAddProvider(false);
    setReceiptImage(null);
    setMechanicalCategory(''); setMechanicalSelectedParts(new Set());
    setLaborDescription(''); setLaborCost(''); setPartsCost('');
    setOdometerReading(''); setWarrantyInfo('');
  }

  async function submit() {
    if (!amount || isNaN(+amount) || +amount <= 0) return Alert.alert('Validation', 'Enter a valid amount');
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const partDesc = isMechCat && selectedParts.size > 0
        ? Array.from(selectedParts).map(id => PART_FIXED_OPTIONS.find(p => p.id === id)?.name || id).join(', ')
        : null;
      const providerNote = selectedProvider ? `Service Provider: ${selectedProvider.businessName}` : null;
      const descParts = [desc, partDesc, providerNote].filter(Boolean);
      await API.addExpense({
        vehicleId,
        amount: +amount,
        category: cat,
        description: descParts.join(' | ') || '',
        date: dateStr,
        invoiceNumber: invoiceNumber || undefined,
      });
      reset(); onSuccess(); onClose();
    } catch (e) { Alert.alert('Error', e?.response?.data?.error || e.message || 'Failed'); }
    finally { setLoading(false); }
  }

  const selectedCategory = EXPENSE_CATEGORIES.find(ct => ct.id === cat);
  const isMechCat = cat === 'maintenance' || cat === 'repairs';

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={s.overlay}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>Add Expense</Text>
              <Text style={s.label}>Amount (R)</Text>
              <TextInput style={s.input} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={c.textMuted} />

              <Text style={s.label}>Category</Text>
              <TouchableOpacity
                style={[s.categorySelector, { backgroundColor: c.background, borderColor: c.border }]}
                onPress={() => setShowCategoryGrid(true)}
              >
                {selectedCategory ? (
                  <View style={s.selectedCategory}>
                    <View style={[s.categoryIcon, { backgroundColor: selectedCategory.color + '20' }]}>
                      <Ionicons name={selectedCategory.icon} size={20} color={selectedCategory.color} />
                    </View>
                    <Text style={[s.selectedCategoryText, { color: c.text }]}>
                      {selectedCategory.name}
                    </Text>
                  </View>
                ) : (
                  <Text style={[s.placeholderText, { color: c.textMuted }]}>Select category</Text>
                )}
                <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
              </TouchableOpacity>

              {isMechCat && (
                <View>
                  <Text style={s.label}>Parts Fixed/Replaced</Text>
                  <TouchableOpacity
                    style={[s.categorySelector, { backgroundColor: c.background, borderColor: c.border }]}
                    onPress={() => setShowPartFixedGrid(true)}
                  >
                    {selectedParts.size > 0 ? (
                      <View style={s.selectedCategory}>
                        <View style={[s.categoryIcon, { backgroundColor: '#F59E0B20' }]}>
                          <Ionicons name="build" size={20} color="#F59E0B" />
                        </View>
                        <Text style={[s.selectedCategoryText, { color: c.text }]}>
                          {selectedParts.size === 1
                            ? PART_FIXED_OPTIONS.find(p => p.id === Array.from(selectedParts)[0])?.name || 'Select parts'
                            : `${selectedParts.size} parts selected`}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[s.placeholderText, { color: c.textMuted }]}>Select parts fixed/replaced</Text>
                    )}
                    <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
                  </TouchableOpacity>

                  {selectedParts.size > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {Array.from(selectedParts).map(partId => {
                        const part = PART_FIXED_OPTIONS.find(p => p.id === partId);
                        return part ? (
                          <View key={partId} style={[s.partChip, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
                            <Text style={[s.partChipText, { color: '#F59E0B' }]}>{part.name}</Text>
                            <TouchableOpacity onPress={() => {
                              const next = new Set(selectedParts);
                              next.delete(partId);
                              if (partId === 'other') setOtherPartDescription('');
                              setSelectedParts(next);
                            }}>
                              <Ionicons name="close-circle" size={16} color="#F59E0B" />
                            </TouchableOpacity>
                          </View>
                        ) : null;
                      })}
                    </View>
                  )}

                  {selectedParts.has('other') && (
                    <View>
                      <Text style={s.label}>Specify Part</Text>
                      <TextInput value={otherPartDescription} onChangeText={setOtherPartDescription} style={s.input} placeholder="Please specify the part fixed/replaced..." placeholderTextColor={c.textMuted} />
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                    <TouchableOpacity onPress={() => setFrequentReplacement(v => !v)} style={{ marginRight: 8 }}>
                      <Ionicons name={frequentReplacement ? 'checkbox' : 'square-outline'} size={22} color={frequentReplacement ? c.primary : c.textMuted} />
                    </TouchableOpacity>
                    <Text style={{ color: c.text, fontSize: 13 }}>Frequent replacement?</Text>
                  </View>

                </View>
              )}

              {!!CATEGORY_TO_SERVICE_TYPE[cat] && (
                <View>
                  <Text style={s.label}>Service Provider</Text>
                  {loadingProviders ? (
                    <ActivityIndicator color={c.primary} />
                  ) : serviceProviders.length === 0 ? (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ color: c.textMuted, fontSize: 13, fontStyle: 'italic', marginBottom: 8 }}>No service providers yet</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={newProviderName} onChangeText={setNewProviderName} placeholder="New Provider Name" placeholderTextColor={c.textMuted} />
                        <TouchableOpacity onPress={handleAddProvider} style={{ marginLeft: 8 }}>
                          <Ionicons name="checkmark-circle" size={24} color={c.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                          {serviceProviders.map(sp => (
                            <TouchableOpacity
                              key={String(sp.id)}
                              style={[s.chip, selectedProvider && selectedProvider.id === sp.id && s.chipOn]}
                              onPress={() => { setSelectedProvider(sp); setShowAddProvider(false); }}
                            >
                              <Text style={[s.chipTxt, selectedProvider && selectedProvider.id === sp.id && s.chipTxtOn]}>{sp.businessName}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => { setShowAddProvider(true); setSelectedProvider(null); }} style={{ marginLeft: 8 }}>
                          <Ionicons name="add-circle-outline" size={24} color={c.primary} />
                        </TouchableOpacity>
                      </View>
                      {showAddProvider && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={newProviderName} onChangeText={setNewProviderName} placeholder="New Provider Name" placeholderTextColor={c.textMuted} />
                          <TouchableOpacity onPress={handleAddProvider} style={{ marginLeft: 8 }}>
                            <Ionicons name="checkmark-circle" size={24} color={c.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              <Text style={s.label}>Invoice Number (optional)</Text>
              <TextInput style={s.input} value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="Invoice #" placeholderTextColor={c.textMuted} />

              <DatePickerField label="Date" date={date} onChange={setDate} c={c} s={s} />

              <Text style={s.label}>Description (optional)</Text>
              <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline value={desc} onChangeText={setDesc} placeholder="Details..." placeholderTextColor={c.textMuted} />

              <Text style={s.label}>Receipt (optional)</Text>
              {receiptImage ? (
                <View style={s.receiptPreview}>
                  <Image source={{ uri: receiptImage.uri }} style={s.receiptImage} resizeMode="cover" />
                  <TouchableOpacity style={s.removeReceipt} onPress={() => setReceiptImage(null)}>
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.receiptOptions}>
                  <TouchableOpacity style={[s.receiptButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={pickReceiptImage}>
                    <Ionicons name="image" size={20} color={c.primary} />
                    <Text style={[s.receiptButtonText, { color: c.text }]}>Choose from Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.receiptButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={takeReceiptPhoto}>
                    <Ionicons name="camera" size={20} color={c.primary} />
                    <Text style={[s.receiptButtonText, { color: c.text }]}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[s.row2, { marginTop: 20 }]}>
                <TouchableOpacity style={s.btnGhost} onPress={() => { reset(); onClose(); }}><Text style={s.btnGhostTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[s.btnPrimary, { backgroundColor: '#ef4444' }]} onPress={submit} disabled={loading}>
                  {loading ? <ActivityIndicator color={c.primaryText} size="small" /> : <Text style={s.btnPrimaryTxt}>Add Expense</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Category Grid Modal */}
      <Modal transparent animationType="slide" visible={showCategoryGrid} onRequestClose={() => setShowCategoryGrid(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.categoryModal, { backgroundColor: c.surface }]}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowCategoryGrid(false)}>
                <Text style={[s.modalCancel, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: c.text }]}>Select Category</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView contentContainerStyle={s.categoryGrid}>
              {EXPENSE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    s.categoryCard,
                    { backgroundColor: c.background, borderColor: c.border },
                    cat === category.id && { borderColor: category.color, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    setCat(category.id);
                    setShowCategoryGrid(false);
                  }}
                >
                  <View style={[s.categoryIcon, { backgroundColor: category.color + '20' }]}>
                    <Ionicons name={category.icon} size={24} color={category.color} />
                  </View>
                  <Text style={[s.categoryName, { color: c.text }]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Part Fixed Grid Modal */}
      <Modal transparent animationType="slide" visible={showPartFixedGrid} onRequestClose={() => setShowPartFixedGrid(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.categoryModal, { backgroundColor: c.surface }]}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowPartFixedGrid(false)}>
                <Text style={[s.modalCancel, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: c.text }]}>Select Parts Fixed/Replaced</Text>
              <TouchableOpacity onPress={() => setShowPartFixedGrid(false)}>
                <Text style={[s.modalCancel, { color: c.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.categoryGrid}>
              {PART_FIXED_OPTIONS.map((part) => (
                <TouchableOpacity
                  key={part.id}
                  style={[
                    s.categoryCard,
                    { backgroundColor: c.background, borderColor: c.border },
                    selectedParts.has(part.id) && { borderColor: '#F59E0B', borderWidth: 2 }
                  ]}
                  onPress={() => {
                    const next = new Set(selectedParts);
                    if (next.has(part.id)) {
                      next.delete(part.id);
                      if (part.id === 'other') setOtherPartDescription('');
                    } else {
                      next.add(part.id);
                    }
                    setSelectedParts(next);
                  }}
                >
                  <View style={[s.categoryIcon, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="build" size={24} color="#F59E0B" />
                  </View>
                  <Text style={[s.categoryName, { color: c.text }]}>{part.name}</Text>
                  {selectedParts.has(part.id) && (
                    <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mechanical Category Picker Modal */}
      {showMechanicalCategoryPicker && (
        <Modal transparent animationType="slide" visible={showMechanicalCategoryPicker} onRequestClose={() => setShowMechanicalCategoryPicker(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.categoryModal, { backgroundColor: c.surface }]}>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setShowMechanicalCategoryPicker(false)}>
                  <Text style={[s.modalCancel, { color: c.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[s.modalTitle, { color: c.text }]}>Mechanical Category</Text>
                <TouchableOpacity onPress={() => setShowMechanicalCategoryPicker(false)}>
                  <Text style={[s.modalCancel, { color: c.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {mechanicalCategories.map(mcat => (
                  <TouchableOpacity
                    key={mcat.Category}
                    style={[s.pickerItem, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={() => {
                      setMechanicalCategory(mcat.Category);
                      setMechanicalSelectedParts(new Set());
                      setShowMechanicalCategoryPicker(false);
                    }}
                  >
                    <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{mcat.DisplayName}</Text>
                    {mechanicalCategory === mcat.Category && (
                      <Ionicons name="checkmark" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

function MaintenanceModal({ visible, vehicleId, ownerId, onClose, onSuccess, c, s }) {
  const [cat, setCat] = useState('Engine');
  const [loc, setLoc] = useState('');
  const [desc, setDesc] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const CATS = ['Engine', 'Brakes', 'Tires', 'Oil Change', 'Electrical', 'Body Work', 'Other'];

  function reset() { setCat('Engine'); setLoc(''); setDesc(''); setPreferredDate(new Date()); }

  async function submit() {
    if (!loc.trim() || !desc.trim()) return Alert.alert('Validation', 'Location and description are required');
    setLoading(true);
    try {
      await API.addMaintenance({
        ownerId: ownerId || '00000000-0000-0000-0000-000000000000',
        vehicleId, category: cat, location: loc, description: desc,
        mediaUrls: '', callOutRequired: false,
        preferredTime: preferredDate.toISOString(),
        state: 'Pending',
      });
      reset(); onSuccess(); onClose();
    } catch (e) { Alert.alert('Error', e?.response?.data?.error || e.message || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>New Maintenance Request</Text>
            <Text style={s.label}>Category</Text>
            <View style={s.chips}>{CATS.map(ct => (
              <TouchableOpacity key={ct} style={[s.chip, cat === ct && s.chipOn]} onPress={() => setCat(ct)}>
                <Text style={[s.chipTxt, cat === ct && s.chipTxtOn]}>{ct}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={s.label}>Location *</Text>
            <TextInput style={s.input} value={loc} onChangeText={setLoc} placeholder="Where is the vehicle?" placeholderTextColor={c.textMuted} />
            <DatePickerField label="Preferred Date" date={preferredDate} onChange={setPreferredDate} c={c} s={s} />
            <Text style={s.label}>Description *</Text>
            <TextInput style={[s.input, { height: 90 }]} multiline value={desc} onChangeText={setDesc} placeholder="Describe the issue..." placeholderTextColor={c.textMuted} />
            <View style={s.row2}>
              <TouchableOpacity style={s.btnGhost} onPress={() => { reset(); onClose(); }}><Text style={s.btnGhostTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, { backgroundColor: '#f59e0b' }]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryTxt}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function EditMaintenanceModal({ visible, request, onClose, onSuccess, c, s }) {
  const [cat, setCat] = useState('Engine');
  const [loc, setLoc] = useState('');
  const [desc, setDesc] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const CATS = ['Engine', 'Brakes', 'Tires', 'Oil Change', 'Electrical', 'Body Work', 'Other'];

  useEffect(() => {
    if (request) {
      setCat(request.category || 'Engine');
      setLoc(request.location || '');
      setDesc(request.description || '');
      setPreferredDate(request.preferredTime ? new Date(request.preferredTime) : new Date());
    }
  }, [request]);

  async function submit() {
    if (!loc.trim() || !desc.trim()) return Alert.alert('Validation', 'Location and description are required');
    setLoading(true);
    try {
      await API.editMaintenance(request.id, {
        category: cat, location: loc, description: desc,
        preferredTime: preferredDate.toISOString(),
        callOutRequired: request.callOutRequired || false,
        priority: request.priority || null,
      });
      onSuccess(); onClose();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.response?.data?.error || e.message || 'Failed to update');
    }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Edit Request</Text>
            <Text style={s.label}>Category</Text>
            <View style={s.chips}>{CATS.map(ct => (
              <TouchableOpacity key={ct} style={[s.chip, cat === ct && s.chipOn]} onPress={() => setCat(ct)}>
                <Text style={[s.chipTxt, cat === ct && s.chipTxtOn]}>{ct}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={s.label}>Location *</Text>
            <TextInput style={s.input} value={loc} onChangeText={setLoc} placeholder="Where is the vehicle?" placeholderTextColor={c.textMuted} />
            <DatePickerField label="Preferred Date" date={preferredDate} onChange={setPreferredDate} c={c} s={s} />
            <Text style={s.label}>Description *</Text>
            <TextInput style={[s.input, { height: 90 }]} multiline value={desc} onChangeText={setDesc} placeholder="Describe the issue..." placeholderTextColor={c.textMuted} />
            <View style={s.row2}>
              <TouchableOpacity style={s.btnGhost} onPress={onClose}><Text style={s.btnGhostTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, { backgroundColor: '#f59e0b' }]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Vehicle Details Card ─────────────────────────────────────────────────────
function VehicleDetailsCard({ vehicle, c, s }) {
  const [expanded, setExpanded] = useState(false);

  function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function daysUntil(d) {
    if (!d) return null;
    return Math.ceil((new Date(d) - new Date()) / 86400000);
  }

  function serviceUrgency(d) {
    const days = daysUntil(d);
    if (days === null) return null;
    if (days < 0) return { color: '#ef4444', label: 'Overdue' };
    if (days <= 7) return { color: '#ef4444', label: `${days}d` };
    if (days <= 30) return { color: '#f59e0b', label: `${days}d` };
    return { color: '#22c55e', label: `${days}d` };
  }

  const nextServiceUrgency = serviceUrgency(vehicle?.nextServiceDate);
  const nextMaintUrgency = serviceUrgency(vehicle?.nextMaintenanceDate);

  if (!vehicle) {
    return (
      <View style={s.card}>
        <View style={s.cardHead}>
          <Ionicons name="car-sport" size={18} color={c.primary} />
          <Text style={s.cardTitle}>Assigned Vehicle</Text>
        </View>
        <View style={s.vehEmpty}>
          <Ionicons name="car-outline" size={40} color={c.textMuted} />
          <Text style={s.vehEmptyTxt}>No vehicle assigned to your account</Text>
          <Text style={s.vehEmptySub}>Contact your fleet manager to get assigned</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {/* Header row */}
      <View style={s.cardHead}>
        <Ionicons name="car-sport" size={18} color={c.primary} />
        <Text style={s.cardTitle}>Assigned Vehicle</Text>
        {vehicle.status ? (
          <View style={[s.vehStatusBadge, { backgroundColor: vehicle.status.toLowerCase() === 'active' ? '#22c55e22' : '#f59e0b22', borderColor: vehicle.status.toLowerCase() === 'active' ? '#22c55e' : '#f59e0b' }]}>
            <Text style={[s.vehStatusTxt, { color: vehicle.status.toLowerCase() === 'active' ? '#22c55e' : '#f59e0b' }]}>{vehicle.status}</Text>
          </View>
        ) : null}
      </View>

      {/* Make / Model hero */}
      <Text style={s.vehMain}>{vehicle.make} {vehicle.model}</Text>
      <Text style={s.vehSub}>{vehicle.year ? `${vehicle.year}  ·  ` : ''}{vehicle.type || ''}</Text>

      {/* Registration plate */}
      {vehicle.registration ? (
        <View style={s.plateBadge}>
          <Text style={s.plateTxt}>{vehicle.registration}</Text>
        </View>
      ) : null}

      {/* Always-visible key facts */}
      <View style={s.vehGrid}>
        {vehicle.odometer > 0 || vehicle.mileage > 0 ? (
          <View style={s.vehGridItem}>
            <Ionicons name="speedometer-outline" size={16} color={c.primary} />
            <Text style={s.vehGridVal}>{(vehicle.odometer || vehicle.mileage || 0).toLocaleString()} km</Text>
            <Text style={s.vehGridLbl}>Odometer</Text>
          </View>
        ) : null}
        {vehicle.capacity > 0 ? (
          <View style={s.vehGridItem}>
            <Ionicons name="people-outline" size={16} color={c.primary} />
            <Text style={s.vehGridVal}>{vehicle.capacity}</Text>
            <Text style={s.vehGridLbl}>Capacity</Text>
          </View>
        ) : null}
        {vehicle.serviceIntervalKm > 0 ? (
          <View style={s.vehGridItem}>
            <Ionicons name="repeat-outline" size={16} color={c.primary} />
            <Text style={s.vehGridVal}>{vehicle.serviceIntervalKm.toLocaleString()} km</Text>
            <Text style={s.vehGridLbl}>Service Interval</Text>
          </View>
        ) : null}
      </View>

      {/* Service alerts */}
      {(nextServiceUrgency || nextMaintUrgency) && (
        <View style={s.serviceAlerts}>
          {vehicle.nextServiceDate && (
            <View style={[s.serviceAlert, { borderColor: nextServiceUrgency.color + '55', backgroundColor: nextServiceUrgency.color + '11' }]}>
              <Ionicons name="build-outline" size={14} color={nextServiceUrgency.color} />
              <Text style={[s.serviceAlertTxt, { color: nextServiceUrgency.color }]}>
                Next service: {fmtDate(vehicle.nextServiceDate)}
                {nextServiceUrgency.label === 'Overdue' ? '  ⚠ Overdue' : `  (${nextServiceUrgency.label})`}
              </Text>
            </View>
          )}
          {vehicle.nextMaintenanceDate && (
            <View style={[s.serviceAlert, { borderColor: nextMaintUrgency.color + '55', backgroundColor: nextMaintUrgency.color + '11' }]}>
              <Ionicons name="construct-outline" size={14} color={nextMaintUrgency.color} />
              <Text style={[s.serviceAlertTxt, { color: nextMaintUrgency.color }]}>
                Next maintenance: {fmtDate(vehicle.nextMaintenanceDate)}
                {nextMaintUrgency.label === 'Overdue' ? '  ⚠ Overdue' : `  (${nextMaintUrgency.label})`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Expandable details */}
      <TouchableOpacity style={s.expandBtn} onPress={() => setExpanded(e => !e)}>
        <Text style={s.expandTxt}>{expanded ? 'Show less' : 'Show full details'}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.primary} />
      </TouchableOpacity>

      {expanded && (
        <View style={s.detailRows}>
          {vehicle.vin ? <DetailRow icon="barcode-outline" label="VIN" value={vehicle.vin} c={c} s={s} /> : null}
          {vehicle.engineNumber ? <DetailRow icon="cog-outline" label="Engine Number" value={vehicle.engineNumber} c={c} s={s} /> : null}
          {vehicle.baseLocation ? <DetailRow icon="location-outline" label="Base Location" value={vehicle.baseLocation} c={c} s={s} /> : null}
          {vehicle.lastServiceDate ? <DetailRow icon="calendar-outline" label="Last Service" value={fmtDate(vehicle.lastServiceDate)} c={c} s={s} /> : null}
          {vehicle.nextServiceDate ? <DetailRow icon="calendar-outline" label="Next Service" value={fmtDate(vehicle.nextServiceDate)} highlight={nextServiceUrgency?.color} c={c} s={s} /> : null}
          {vehicle.lastMaintenanceDate ? <DetailRow icon="construct-outline" label="Last Maintenance" value={fmtDate(vehicle.lastMaintenanceDate)} c={c} s={s} /> : null}
          {vehicle.nextMaintenanceDate ? <DetailRow icon="construct-outline" label="Next Maintenance" value={fmtDate(vehicle.nextMaintenanceDate)} highlight={nextMaintUrgency?.color} c={c} s={s} /> : null}
        </View>
      )}
    </View>
  );
}

function DetailRow({ icon, label, value, highlight, c, s }) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon} size={15} color={highlight || c.textMuted} style={{ width: 22 }} />
      <Text style={s.detailLbl}>{label}</Text>
      <Text style={[s.detailVal, highlight && { color: highlight, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

// ── Tab screens ──────────────────────────────────────────────────────────────
function OverviewTab({ profile, vehicle, earnings, expenses, maintenance, onToggle, onAddEarning, onAddExpense, onOpenTrips, onOpenBehavior, refreshing, onRefresh, monitorActive, monitorSpeed, recentBehaviorEvents, activeTrip, onViewTripDetails, onCompleteTrip, c, s }) {
  const { name: month } = monthRange();
  const earn = earnings.reduce((a, e) => a + (e.amount || 0), 0);
  const exp = expenses.reduce((a, e) => a + (e.amount || 0), 0);
  const profit = earn - exp;
  const pending = maintenance.filter(r => ['open', 'pending'].includes((r.state || '').toLowerCase())).length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>

      {/* Online/Offline hero toggle */}
      <TouchableOpacity
        style={[s.heroBanner, { backgroundColor: profile?.isAvailable ? c.success : c.mode === 'dark' ? '#374151' : '#64748b' }]}
        onPress={onToggle}
        activeOpacity={0.85}>
        <View style={s.heroBannerIconWrap}>
          <Ionicons name={profile?.isAvailable ? 'radio-button-on' : 'radio-button-off'} size={24} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.heroBannerTitle}>{profile?.isAvailable ? 'You are Online' : 'You are Offline'}</Text>
          <Text style={s.heroBannerSub}>Tap to go {profile?.isAvailable ? 'Offline' : 'Online'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>

      {/* Driving Monitor Status */}
      {monitorActive && (
        <View style={s.monitorBanner}>
          <View style={s.monitorDot} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.monitorTitle}>Behavior Monitoring Active</Text>
            <Text style={s.monitorSub}>Sensors tracking driving patterns</Text>
          </View>
          <View style={s.monitorSpeedBadge}>
            <Text style={s.monitorSpeedTxt}>{monitorSpeed}</Text>
            <Text style={s.monitorSpeedUnit}>km/h</Text>
          </View>
        </View>
      )}

      {/* Recent Behavior Alerts */}
      {recentBehaviorEvents && recentBehaviorEvents.length > 0 && (
        <View style={s.behaviorAlertCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="alert-circle" size={16} color="#f59e0b" />
            <Text style={s.behaviorAlertTitle}>Recent Alerts</Text>
          </View>
          {recentBehaviorEvents.slice(0, 3).map((evt, i) => {
            const isPos = evt.eventType === 'Positive';
            return (
              <View key={i} style={[s.behaviorAlertRow, { borderLeftColor: isPos ? '#22c55e' : '#ef4444' }]}>
                <Text style={[s.behaviorAlertCat, { color: isPos ? '#22c55e' : '#ef4444' }]}>{evt.category}</Text>
                <Text style={s.behaviorAlertDesc} numberOfLines={1}>{evt.description}</Text>
                <Text style={[s.behaviorAlertPts, { color: isPos ? '#22c55e' : '#ef4444' }]}>
                  {evt.pointsImpact > 0 ? '+' : ''}{evt.pointsImpact}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Active Trip Card */}
      {activeTrip && (
        <View style={s.activeTripCard}>
          <View style={s.activeTripHeader}>
            <View style={s.activeTripDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.activeTripTitle}>Active Trip</Text>
              <Text style={s.activeTripSub}>
                {activeTrip.departureStation && activeTrip.destinationStation
                  ? `${activeTrip.departureStation} → ${activeTrip.destinationStation}`
                  : activeTrip.departureStation || 'In progress'}
              </Text>
            </View>
            <View style={[s.activeTripBadge, activeTrip.status === 'InProgress' && { backgroundColor: c.info }]}>
              <Text style={s.activeTripBadgeTxt}>{(activeTrip.status || 'ACTIVE').toUpperCase()}</Text>
            </View>
          </View>

          <View style={s.activeTripMeta}>
            <View style={s.activeTripMetaItem}>
              <Ionicons name="car-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={s.activeTripMetaTxt}>
                {activeTrip.vehicle?.registration || '—'}
              </Text>
            </View>
            {activeTrip.passengerCount > 0 && (
              <View style={s.activeTripMetaItem}>
                <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={s.activeTripMetaTxt}>{activeTrip.passengerCount} pax</Text>
              </View>
            )}
            {activeTrip.departureTime && (
              <View style={s.activeTripMetaItem}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={s.activeTripMetaTxt}>
                  {new Date(activeTrip.departureTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            {activeTrip.totalAmount > 0 && (
              <View style={s.activeTripMetaItem}>
                <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={s.activeTripMetaTxt}>R{activeTrip.totalAmount}</Text>
              </View>
            )}
          </View>

          <View style={s.activeTripActions}>
            <TouchableOpacity style={s.activeTripBtn} onPress={() => onViewTripDetails(activeTrip)}>
              <Ionicons name="eye-outline" size={16} color="#fff" />
              <Text style={s.activeTripBtnTxt}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.activeTripBtn, s.activeTripBtnGreen]} onPress={() => onCompleteTrip(activeTrip)}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={s.activeTripBtnTxt}>Complete Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Vehicle Details */}
      <VehicleDetailsCard vehicle={vehicle} c={c} s={s} />

      {/* Hero profit card */}
      <View style={s.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>This Month's Profit</Text>
          <Text style={s.heroValue}>{fmt(profit)}</Text>
          <Text style={s.heroSub}>{month}</Text>
        </View>
        <View style={s.heroIconWrap}>
          <Ionicons name={profit >= 0 ? 'trending-up' : 'trending-down'} size={30} color="#fff" />
        </View>
      </View>

      {/* Metric grid */}
      <View style={s.metricsGrid}>
        {[
          { icon: 'arrow-up-circle-outline', color: c.success, label: 'Earnings',      value: fmt(earn),              sub: `${earnings.length} entries` },
          { icon: 'arrow-down-circle-outline', color: c.danger, label: 'Expenses',    value: fmt(exp),               sub: `${expenses.length} entries` },
          { icon: 'construct-outline',        color: '#f59e0b', label: 'Pending Maint', value: String(pending),        sub: 'requests' },
          { icon: 'car-sport-outline',        color: c.info, label: 'Vehicle',       value: vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Assigned' : 'None', sub: vehicle?.registration || 'Not assigned' },
        ].map(m => (
          <View key={m.label} style={s.metricCard}>
            <View style={[s.metricIcon, { backgroundColor: m.color + '20' }]}>
              <Ionicons name={m.icon} size={18} color={m.color} />
            </View>
            <Text style={s.metricValue} numberOfLines={1}>{m.value}</Text>
            <Text style={s.metricLabel}>{m.label}</Text>
            <Text style={s.metricSub}>{m.sub}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.quickActions}>
        <TouchableOpacity
          style={[s.quickActionBtn, !vehicle && { opacity: 0.45 }]}
          onPress={vehicle ? onAddEarning : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log earnings.')}>
          <View style={[s.quickActionIcon, { backgroundColor: '#10b98120' }]}>
            <Ionicons name="add-circle-outline" size={24} color={c.success} />
          </View>
          <Text style={s.quickActionTxt}>Add Earning</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.quickActionBtn, !vehicle && { opacity: 0.45 }]}
          onPress={vehicle ? onAddExpense : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log expenses.')}>
          <View style={[s.quickActionIcon, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="remove-circle-outline" size={24} color={c.danger} />
          </View>
          <Text style={s.quickActionTxt}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.quickActions, { marginTop: 10 }]}> 
        <TouchableOpacity
          style={s.quickActionBtn}
          onPress={onOpenBehavior}
        >
          <View style={[s.quickActionIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)' }]}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#f59e0b" />
          </View>
          <Text style={s.quickActionTxt}>My Behavior</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.quickActionBtn, !vehicle && { opacity: 0.45 }]}
          onPress={vehicle ? onOpenTrips : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to view rank queue.')}
        >
          <View style={[s.quickActionIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)' }]}>
            <Ionicons name="list-outline" size={24} color={c.info} />
          </View>
          <Text style={s.quickActionTxt}>Trip Management</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MaintenanceTab({ maintenance, expenses, vehicle, profile, onNew, onEdit, onDelete, refreshing, onRefresh, c, s }) {
  const pending = maintenance.filter(r => ['open', 'pending'].includes((r.state || '').toLowerCase())).length;

  const mechExpenses = useMemo(() => (expenses || []).filter(e =>
    e.category === 'maintenance' || e.category === 'repairs'
  ), [expenses]);

  const frequentParts = useMemo(() => {
    const partMap = {};
    mechExpenses.forEach(exp => {
      const parts = exp.partFixed ? exp.partFixed.split(',').map(p => p.trim()).filter(Boolean) : [];
      const expDate = exp.date ? new Date(exp.date) : null;
      parts.forEach(partId => {
        if (!partMap[partId]) partMap[partId] = { id: partId, count: 0, dates: [] };
        partMap[partId].count += 1;
        if (expDate && !isNaN(expDate)) partMap[partId].dates.push(expDate);
      });
    });
    return Object.values(partMap)
      .filter(p => p.count >= 1)
      .sort((a, b) => b.count - a.count)
      .map(p => {
        const sorted = p.dates.sort((a, b) => b - a);
        const lastDate = sorted[0] || null;
        let nextDate = null;
        if (sorted.length >= 2) {
          const avgInterval = (sorted[0] - sorted[sorted.length - 1]) / (sorted.length - 1);
          nextDate = new Date(sorted[0].getTime() + avgInterval);
        } else if (lastDate) {
          nextDate = new Date(lastDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        }
        const partDef = PART_FIXED_OPTIONS.find(o => o.id === p.id);
        return { id: p.id, name: partDef ? partDef.name : p.id, count: p.count, lastDate, nextDate };
      });
  }, [mechExpenses]);

  const serviceHistory = useMemo(() => {
    const catMap = {};
    (expenses || []).forEach(exp => {
      const serviceType = CATEGORY_TO_SERVICE_TYPE[exp.category];
      if (!serviceType) return;
      const key = exp.category;
      const expDate = exp.date ? new Date(exp.date) : null;
      if (!catMap[key]) catMap[key] = { category: key, serviceType, dates: [], totalSpent: 0, providerNames: new Set() };
      if (expDate && !isNaN(expDate)) catMap[key].dates.push(expDate);
      catMap[key].totalSpent += (exp.amount || 0);
      if (exp.serviceProviderName) catMap[key].providerNames.add(exp.serviceProviderName);
    });
    return Object.values(catMap)
      .sort((a, b) => {
        const aLast = a.dates.sort((x, y) => y - x)[0];
        const bLast = b.dates.sort((x, y) => y - x)[0];
        return (bLast || 0) - (aLast || 0);
      })
      .map(item => {
        const sorted = item.dates.sort((a, b) => b - a);
        const lastDate = sorted[0] || null;
        let nextDate = null;
        if (sorted.length >= 2) {
          const avgInterval = (sorted[0] - sorted[sorted.length - 1]) / (sorted.length - 1);
          nextDate = new Date(sorted[0].getTime() + avgInterval);
        } else if (lastDate) {
          nextDate = new Date(lastDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        }
        const catDef = EXPENSE_CATEGORIES.find(ct => ct.id === item.category);
        return {
          ...item,
          name: catDef ? catDef.name : item.category,
          icon: catDef ? catDef.icon : 'construct',
          color: catDef ? catDef.color : '#6B7280',
          lastDate,
          nextDate,
          providers: Array.from(item.providerNames),
        };
      });
  }, [expenses]);

  const fmtDate = (d) => d ? d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const isOverdue = (d) => d && d < new Date();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>

      {/* Frequently Fixed Parts */}
      {frequentParts.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={s.secHead}>
            <View>
              <Text style={s.secTitle}>Frequently Fixed Parts</Text>
              <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>Based on your expense history</Text>
            </View>
            <View style={[s.metricIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="build" size={18} color="#F59E0B" />
            </View>
          </View>
          {frequentParts.map(part => (
            <View key={part.id} style={[s.reqCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={[s.reqIconWrap, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="build" size={15} color="#F59E0B" />
                </View>
                <Text style={[s.reqCat, { marginLeft: 10, flex: 1 }]}>{part.name}</Text>
                <View style={[s.badge, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
                  <Text style={[s.badgeTxt, { color: '#F59E0B' }]}>{part.count}x fixed</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600' }}>Last Fixed</Text>
                  <Text style={{ fontSize: 13, color: c.text, fontWeight: '700', marginTop: 2 }}>{fmtDate(part.lastDate)}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600' }}>Next Anticipated</Text>
                  <Text style={{ fontSize: 13, color: isOverdue(part.nextDate) ? '#EF4444' : '#10B981', fontWeight: '700', marginTop: 2 }}>
                    {fmtDate(part.nextDate)}
                  </Text>
                  {isOverdue(part.nextDate) && (
                    <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600', marginTop: 1 }}>Overdue</Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Service History */}
      {serviceHistory.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={s.secHead}>
            <View>
              <Text style={s.secTitle}>Service History</Text>
              <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>Past services & next anticipated dates</Text>
            </View>
            <View style={[s.metricIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)' }]}>
              <Ionicons name="time" size={18} color="#3B82F6" />
            </View>
          </View>
          {serviceHistory.map(svc => (
            <View key={svc.category} style={[s.reqCard, { borderLeftColor: svc.color, borderLeftWidth: 4 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={[s.reqIconWrap, { backgroundColor: svc.color + '20' }]}>
                  <Ionicons name={svc.icon} size={15} color={svc.color} />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={s.reqCat}>{svc.name}</Text>
                  <Text style={{ fontSize: 11, color: c.textMuted }}>{svc.serviceType}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>R{svc.totalSpent.toFixed(0)}</Text>
              </View>
              {svc.providers.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {svc.providers.map(p => (
                    <View key={p} style={{ backgroundColor: svc.color + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: svc.color }}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600' }}>Last Service</Text>
                  <Text style={{ fontSize: 13, color: c.text, fontWeight: '700', marginTop: 2 }}>{fmtDate(svc.lastDate)}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600' }}>Next Anticipated</Text>
                  <Text style={{ fontSize: 13, color: isOverdue(svc.nextDate) ? '#EF4444' : '#10B981', fontWeight: '700', marginTop: 2 }}>
                    {fmtDate(svc.nextDate)}
                  </Text>
                  {isOverdue(svc.nextDate) && (
                    <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600', marginTop: 1 }}>Overdue</Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Maintenance Requests */}
      <View style={s.secHead}>
        <View>
          <Text style={s.secTitle}>Maintenance Requests</Text>
          {pending > 0 && (
            <View style={[s.badge, { backgroundColor: c.mode === 'dark' ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)', borderColor: '#f59e0b', alignSelf: 'flex-start', marginTop: 4 }]}>
              <Text style={[s.badgeTxt, { color: '#f59e0b' }]}>{pending} pending</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={[s.btnSm, !vehicle && { opacity: 0.4 }]}
          onPress={vehicle ? onNew : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to submit a request')}>
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={s.btnSmTxt}>New Request</Text>
        </TouchableOpacity>
      </View>

      {maintenance.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="construct-outline" size={48} color={c.textMuted} />
          <Text style={s.emptyTitle}>No Requests</Text>
          <Text style={s.emptyTxt}>No maintenance requests found for your vehicle</Text>
        </View>
      ) : maintenance.map((r, i) => {
        const col = statusColor(r.state || r.status);
        const state = (r.state || r.status || '').toLowerCase();
        const canEdit = state === 'pending';
        return (
          <View key={r.id || i} style={[s.reqCard, { borderLeftColor: col, borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={[s.reqIconWrap, { backgroundColor: col + '20' }]}>
                <Ionicons name="construct-outline" size={15} color={col} />
              </View>
              <Text style={[s.reqCat, { marginLeft: 10 }]}>{r.category || 'General'}</Text>
              <View style={[s.badge, { backgroundColor: col + '20', borderColor: col, marginLeft: 'auto' }]}>
                <Text style={[s.badgeTxt, { color: col }]}>{r.state || r.status || 'Open'}</Text>
              </View>
            </View>
            {r.description ? <Text style={s.reqDesc} numberOfLines={2}>{r.description}</Text> : null}
            <View style={s.reqMeta}>
              <Ionicons name="location-outline" size={11} color={c.textMuted} />
              <Text style={s.metaTxt}>{r.location || 'No location'}</Text>
              <Text style={s.metaSep}>·</Text>
              <Ionicons name="time-outline" size={11} color={c.textMuted} />
              <Text style={s.metaTxt}>{r.preferredTime ? new Date(r.preferredTime).toLocaleDateString() : r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</Text>
            </View>
            {canEdit && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity style={s.reqEditBtn} onPress={() => onEdit(r)}>
                  <Ionicons name="pencil-outline" size={13} color={c.primary} />
                  <Text style={s.reqEditBtnTxt}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.reqDeleteBtn} onPress={() => onDelete(r)}>
                  <Ionicons name="trash-outline" size={13} color="#ef4444" />
                  <Text style={s.reqDeleteBtnTxt}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            {state === 'completed' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[s.reqEditBtn, { borderColor: '#fbbf24' }]}
                  onPress={() => { setRatingRequest(r); setRatingModalVisible(true); }}
                >
                  <Ionicons name="star-outline" size={13} color="#fbbf24" />
                  <Text style={[s.reqEditBtnTxt, { color: '#fbbf24' }]}>Rate</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function EarningsTab({ earnings, expenses, vehicleId, onAddEarning, onAddExpense, refreshing, onRefresh, c, s }) {
  const [list, setList] = useState('earnings');
  const earn = earnings.reduce((a, e) => a + (e.amount || 0), 0);
  const exp = expenses.reduce((a, e) => a + (e.amount || 0), 0);
  const profit = earn - exp;
  const items = list === 'earnings' ? earnings : expenses;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>

      {/* Hero summary */}
      <View style={s.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>Monthly Profit</Text>
          <Text style={s.heroValue}>{fmt(profit)}</Text>
          <Text style={s.heroSub}>{earnings.length} earns · {expenses.length} expenses</Text>
        </View>
        <View style={s.heroIconWrap}>
          <Ionicons name={profit >= 0 ? 'wallet' : 'wallet-outline'} size={30} color="#fff" />
        </View>
      </View>

      {/* E / X metric row */}
      <View style={s.earnSummaryRow}>
        <View style={s.earnSummaryItem}>
          <View style={[s.metricIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)' }]}>
            <Ionicons name="arrow-up-circle-outline" size={18} color={c.success} />
          </View>
          <Text style={[s.earnSummaryVal, { color: c.success }]}>{fmt(earn)}</Text>
          <Text style={s.earnSummaryLbl}>Earnings</Text>
        </View>
        <View style={[s.earnSummaryItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.border }]}>
          <View style={[s.metricIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)' }]}>
            <Ionicons name="arrow-down-circle-outline" size={18} color={c.danger} />
          </View>
          <Text style={[s.earnSummaryVal, { color: c.danger }]}>{fmt(exp)}</Text>
          <Text style={s.earnSummaryLbl}>Expenses</Text>
        </View>
        <View style={s.earnSummaryItem}>
          <View style={[s.metricIcon, { backgroundColor: profit >= 0 ? (c.mode === 'dark' ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)') : (c.mode === 'dark' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)') }]}>
            <Ionicons name={profit >= 0 ? 'trending-up' : 'trending-down'} size={18} color={profit >= 0 ? c.success : c.danger} />
          </View>
          <Text style={[s.earnSummaryVal, { color: profit >= 0 ? c.success : c.danger }]}>{fmt(profit)}</Text>
          <Text style={s.earnSummaryLbl}>Profit</Text>
        </View>
      </View>

      {/* Add buttons */}
      <View style={s.quickActions}>
        <TouchableOpacity
          style={[s.quickActionBtn, !vehicleId && { opacity: 0.45 }]}
          onPress={vehicleId ? onAddEarning : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log earnings.')}>
          <View style={[s.quickActionIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)' }]}>
            <Ionicons name="add-circle-outline" size={22} color={c.success} />
          </View>
          <Text style={s.quickActionTxt}>Add Earning</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.quickActionBtn, !vehicleId && { opacity: 0.45 }]}
          onPress={vehicleId ? onAddExpense : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log expenses.')}>
          <View style={[s.quickActionIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)' }]}>
            <Ionicons name="remove-circle-outline" size={22} color={c.danger} />
          </View>
          <Text style={s.quickActionTxt}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={s.toggle}>
        <TouchableOpacity style={[s.tBtn, list === 'earnings' && s.tBtnOn]} onPress={() => setList('earnings')}>
          <Text style={[s.tTxt, list === 'earnings' && s.tTxtOn]}>Earnings ({earnings.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tBtn, list === 'expenses' && s.tBtnOn]} onPress={() => setList('expenses')}>
          <Text style={[s.tTxt, list === 'expenses' && s.tTxtOn]}>Expenses ({expenses.length})</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {items.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={48} color={c.textMuted} />
          <Text style={s.emptyTitle}>No {list}</Text>
          <Text style={s.emptyTxt}>Nothing logged for this month yet</Text>
        </View>
      ) : items.map((item, i) => (
        <View key={item.id || i} style={s.ledger}>
          <View style={[s.ledgerIcon, { backgroundColor: list === 'earnings' ? (c.mode === 'dark' ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)') : (c.mode === 'dark' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)') }]}>
            <Ionicons name={list === 'earnings' ? 'trending-up' : 'trending-down'} size={16} color={list === 'earnings' ? c.success : c.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ledgerLbl}>{item.source || item.category || 'Entry'}</Text>
            {item.description ? <Text style={s.ledgerDesc} numberOfLines={1}>{item.description}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.ledgerAmt, { color: list === 'earnings' ? c.success : c.danger }]}>
              {list === 'earnings' ? '+' : '-'}{fmt(item.amount)}
            </Text>
            <Text style={s.ledgerDate}>{item.date ? new Date(item.date).toLocaleDateString() : ''}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function MessagesTab({ userId, c, s }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await API.getMessages(userId);
      setMsgs(Array.isArray(r.data) ? r.data : []);
    } catch { setMsgs([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={c.primary} /></View>;

  const unread = msgs.filter(m => !m.isRead).length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>

      {unread > 0 && (
        <View style={s.unreadBanner}>
          <Ionicons name="mail-unread-outline" size={18} color="#92400e" />
          <Text style={s.unreadBannerTxt}>{unread} unread message{unread > 1 ? 's' : ''}</Text>
        </View>
      )}

      <Text style={s.secTitle}>Messages</Text>
      {msgs.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={c.textMuted} />
          <Text style={s.emptyTitle}>No Messages</Text>
          <Text style={s.emptyTxt}>You have no messages yet</Text>
        </View>
      ) : msgs.map((m, i) => (
        <View key={m.id || i} style={[s.msgRow, !m.isRead && { borderLeftColor: c.primary, borderLeftWidth: 3 }]}>
          <View style={[s.avatar, { backgroundColor: !m.isRead ? c.primary : c.surface2 }]}>
            <Text style={[s.avatarTxt, { color: !m.isRead ? '#fff' : c.text }]}>{((m.senderName || m.subject || '?')[0]).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[s.msgFrom, !m.isRead && { color: c.primary }]}>{m.senderName || m.subject || 'Message'}</Text>
              {m.createdAt && <Text style={s.msgDate}>{new Date(m.createdAt).toLocaleDateString()}</Text>}
            </View>
            <Text style={s.msgPrev} numberOfLines={1}>{m.body || m.content || m.lastMessage || ''}</Text>
          </View>
          {!m.isRead && <View style={s.unreadDot} />}
        </View>
      ))}
    </ScrollView>
  );
}

const QUEUE_GOLD = '#D4AF37';
const SC_QUEUE = { Waiting: '#f59e0b', Loading: '#3b82f6', Dispatched: '#22c55e', Completed: '#16a34a', Arrived: '#16a34a' };
function queueStatusColor(st) { return SC_QUEUE[st] || '#94a3b8'; }
function normQueueStatus(st) {
  const s = (st || '').toLowerCase();
  if (s === 'dispatched') return 'dispatched';
  if (s === 'completed' || s === 'arrived') return 'completed';
  return 'waiting';
}
function isoDate(d) { return d.toISOString().split('T')[0]; }
function fmtDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  if (dateStr === isoDate(today)) return 'Today';
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (dateStr === isoDate(y)) return 'Yesterday';
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' });
}

function TripsTab({ driverId, navigation, c, s }) {
  const [innerTab, setInnerTab] = useState('queue'); // 'queue' | 'trips'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(() => isoDate(new Date()));
  const [data, setData] = useState(null);
  const [dispatchedTrips, setDispatchedTrips] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('all');
  const [filter, setFilter] = useState('all');
  const [completionFare, setCompletionFare] = useState('');
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [completing, setCompleting] = useState(false);

  const queue = data?.queue || [];

  // Derive unique routes from the queue
  const routes = useMemo(() => {
    const seen = new Map();
    queue.forEach(i => {
      const key = i.routeId || i.routeName || 'unassigned';
      if (!seen.has(key)) seen.set(key, { id: key, name: i.routeName || 'Unassigned' });
    });
    return [{ id: 'all', name: 'All Routes' }, ...Array.from(seen.values())];
  }, [queue]);

  // Auto-select driver's route when data loads
  useEffect(() => {
    const myEntry = queue.find(i => i.isMine);
    if (myEntry) {
      const key = myEntry.routeId || myEntry.routeName || 'unassigned';
      setSelectedRoute(key);
    }
  }, [data]);

  // Queue filtered by selected route then status
  const routeQueue = useMemo(() => {
    if (selectedRoute === 'all') return queue;
    return queue.filter(i => (i.routeId || i.routeName || 'unassigned') === selectedRoute);
  }, [queue, selectedRoute]);

  const filtered = useMemo(() => {
    if (filter === 'all') return routeQueue;
    return routeQueue.filter(i => normQueueStatus(i.status) === filter);
  }, [routeQueue, filter]);

  const myEntry = useMemo(() => queue.find(i => i.isMine), [queue]);
  const myDispatchedTrip = useMemo(
    () => queue.find(i => i.isMine && normQueueStatus(i.status) === 'dispatched' && i.tripId),
    [queue]
  );
  const myDispatchedQueueEntryId = myDispatchedTrip?.id
    || (((data?.myStatus || '').toLowerCase() === 'dispatched') ? data?.myQueueEntryId : null);

  const waitingCnt = routeQueue.filter(i => normQueueStatus(i.status) === 'waiting').length;
  const dispatchedCnt = routeQueue.filter(i => normQueueStatus(i.status) === 'dispatched').length;
  const completedCnt = routeQueue.filter(i => normQueueStatus(i.status) === 'completed').length;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!driverId) { setData({ message: 'Driver profile not found', queue: [] }); return; }
      const resp = await getDriverQueueView(driverId, date);
      setData(resp || { queue: [] });
      try {
        const tResp = await client.get(`/TaxiRankTrips/driver/${driverId}/active`);
        setDispatchedTrips(Array.isArray(tResp.data) ? tResp.data : []);
      } catch { setDispatchedTrips([]); }
    } catch (e) {
      setData({ queue: [], message: e?.response?.data?.message || 'Could not load queue' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverId, date]);

  useEffect(() => { load(); }, [load]);

  // Re-fetch data when screen regains focus
  useFocusEffect(useCallback(() => {
    if (driverId) {
      load(true); // Silent refresh
    }
  }, [driverId, load]));

  // Re-fetch active trip when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && driverId) {
        load(true); // Silent refresh
      }
    });

    return () => subscription?.remove();
  }, [driverId, load]);

  function changeDate(delta) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + delta);
    setDate(isoDate(d));
    setSelectedRoute('all');
    setFilter('all');
  }

  async function handleCompleteTrip() {
    if (!activeTrip?.id) return;
    
    // Calculate default fare from trip data or use 0
    const defaultFare = activeTrip?.totalAmount || activeTrip?.fareAmount || 0;
    setCompletionFare(defaultFare.toString());
    setCompletionModalVisible(true);
  }

  async function confirmCompleteTrip() {
    if (!activeTrip?.id) return;
    setCompleting(true);
    try {
      const fareAmount = completionFare ? parseFloat(completionFare) : 0;
      await completeTrip(activeTrip.id, 'Completed by driver', driverId, null, fareAmount);
      setCompletionModalVisible(false);
      setCompletionFare('');
      // Refresh active trip data
      load(true);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={QUEUE_GOLD} />
        <Text style={{ marginTop: 10, color: c.textMuted, fontSize: 13 }}>Loading queue…</Text>
      </View>
    );
  }

  function fmtTime(v) {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Inner tab selector */}
      <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, paddingHorizontal: 12, paddingVertical: 6, gap: 8 }}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 10, gap: 6, backgroundColor: innerTab === 'queue' ? c.primary : c.card }}
          onPress={() => setInnerTab('queue')}>
          <Ionicons name={innerTab === 'queue' ? 'list' : 'list-outline'} size={15} color={innerTab === 'queue' ? '#fff' : c.textMuted} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: innerTab === 'queue' ? '#fff' : c.textMuted }}>Queue ({queue.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 10, gap: 6, backgroundColor: innerTab === 'trips' ? c.primary : c.card }}
          onPress={() => setInnerTab('trips')}>
          <Ionicons name={innerTab === 'trips' ? 'car' : 'car-outline'} size={15} color={innerTab === 'trips' ? '#fff' : c.textMuted} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: innerTab === 'trips' ? '#fff' : c.textMuted }}>Trips ({dispatchedTrips.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Header: rank name + date nav */}
      <View style={{ backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: c.text, marginBottom: 4 }}>
          {data?.rankName || 'Rank Queue'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={18} color={c.textMuted} />
          </TouchableOpacity>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, marginHorizontal: 12 }}>{fmtDateLabel(date)}</Text>
          <TouchableOpacity onPress={() => changeDate(1)} style={{ padding: 6 }}>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active trip banner */}
      {!!myDispatchedQueueEntryId && (
        <View style={{ marginHorizontal: 12, marginTop: 10, backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#22c55e' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Active Trip</Text>
              <Text style={{ color: '#ffffffaa', fontSize: 12, marginTop: 1 }}>
                {myDispatchedTrip?.vehicleRegistration || data?.vehicleRegistration} · {myDispatchedTrip?.routeName || data?.routeName || 'En route'}
              </Text>
            </View>
            <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Dispatched</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {myDispatchedTrip?.id && (
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingVertical: 9, gap: 6 }}
                onPress={() => navigation.navigate('DriverTripDetails', { queueEntryId: myDispatchedTrip.id })}
              >
                <Ionicons name="eye-outline" size={15} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Details</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 9, gap: 6 }}
              onPress={handleCompleteTrip}
            >
              <Ionicons name="checkmark-circle" size={15} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DISPATCHED TRIPS ── */}
      {innerTab === 'trips' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={QUEUE_GOLD} />}
        >
          {dispatchedTrips.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="document-text-outline" size={30} color={c.textMuted} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>No trips yet</Text>
              <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>Dispatched trips will appear here</Text>
            </View>
          ) : (
            dispatchedTrips.map((trip, idx) => {
              const sc = queueStatusColor(trip.status || 'Dispatched');
              const isActive = trip.status !== 'Completed' && trip.status !== 'Cancelled';
              return (
                <TouchableOpacity key={trip.id || idx}
                  style={{ backgroundColor: c.surface, borderRadius: 14, marginBottom: 10, flexDirection: 'row', overflow: 'hidden',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('DriverTripDetails', { tripId: trip.id, driverProfileId: driverId })}>
                  <View style={{ width: 4, backgroundColor: sc }} />
                  <View style={{ flex: 1, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, flex: 1 }} numberOfLines={1}>
                        {trip.departureStation || '—'} → {trip.destinationStation || '—'}
                      </Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: sc }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{trip.status || 'Active'}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="car-outline" size={12} color={c.textMuted} />
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{trip.vehicle?.registration || trip.vehicleRegistration || '—'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="people-outline" size={12} color={c.textMuted} />
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{trip.passengerCount ?? 0} pax</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="time-outline" size={12} color={c.textMuted} />
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{fmtTime(trip.departureTime)}</Text>
                      </View>
                    </View>
                    {isActive && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Ionicons name="checkmark-circle-outline" size={12} color="#22c55e" />
                        <Text style={{ fontSize: 11, color: '#22c55e' }}>Tap to view &amp; complete</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── QUEUE ── */}
      {innerTab === 'queue' && <>

      {/* Route selector tabs */}
      {routes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: c.background, borderBottomWidth: 1, borderBottomColor: c.border }}
          contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 6, gap: 6, flexDirection: 'row' }}>
          {routes.map(r => {
            const isActive = selectedRoute === r.id;
            const routeItems = queue.filter(i => (i.routeId || i.routeName || 'unassigned') === r.id);
            return (
              <TouchableOpacity key={r.id}
                style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
                  backgroundColor: isActive ? QUEUE_GOLD : c.card, borderWidth: 1, borderColor: isActive ? QUEUE_GOLD : c.border }}
                onPress={() => setSelectedRoute(r.id)}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? '#000' : c.textMuted }}>
                  {r.name}
                </Text>
                <Text style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.7)' : c.textMuted }}>
                  ({routeItems.length})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: c.background, borderBottomWidth: 1, borderBottomColor: c.border }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 5, gap: 6, flexDirection: 'row' }}>
        {[
          { key: 'all', label: 'All', cnt: routeQueue.length },
          { key: 'waiting', label: 'Waiting', cnt: waitingCnt },
          { key: 'dispatched', label: 'Dispatched', cnt: dispatchedCnt },
          { key: 'completed', label: 'Completed', cnt: completedCnt },
        ].map(f => (
          <TouchableOpacity key={f.key}
            style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
              backgroundColor: filter === f.key ? QUEUE_GOLD : c.card }}
            onPress={() => setFilter(f.key)}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: filter === f.key ? '#000' : c.textMuted }}>
              {f.label} {f.cnt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Queue list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={QUEUE_GOLD} />}
      >
        {/* My vehicle summary — only when viewing its route or all */}
        {myEntry && (selectedRoute === 'all' || (myEntry.routeId || myEntry.routeName || 'unassigned') === selectedRoute) && (
          <View style={{ backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: QUEUE_GOLD }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: QUEUE_GOLD, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#000', fontSize: 13, fontWeight: '800' }}>#{data?.myPosition || myEntry.queuePosition}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>{data?.vehicleRegistration || myEntry.vehicleRegistration}</Text>
                <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>
                  {data?.myStatus || myEntry.status} · {myEntry.routeName || data?.routeName || '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: c.textMuted }}>Your position</Text>
              </View>
            </View>
          </View>
        )}

        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="car-outline" size={30} color={c.textMuted} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>No vehicles in queue</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
              {data?.message || 'No vehicles for this route today'}
            </Text>
          </View>
        ) : (
          filtered.map((item, idx) => {
            const sc = queueStatusColor(item.status);
            const isMine = item.isMine;
            return (
              <View key={item.id || idx}
                style={{ backgroundColor: c.surface, borderRadius: 14, marginBottom: 10, flexDirection: 'row', overflow: 'hidden',
                  borderWidth: isMine ? 1.5 : 0, borderColor: QUEUE_GOLD,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
                <View style={{ width: 4, backgroundColor: sc }} />
                <View style={{ flex: 1, padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: isMine ? QUEUE_GOLD : sc + '18' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: isMine ? '#000' : sc }}>#{item.queuePosition}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, flex: 1 }} numberOfLines={1}>
                        {item.vehicleRegistration || '—'}{isMine ? '  (You)' : ''}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: sc }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{item.status}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="person-outline" size={12} color={c.textMuted} />
                      <Text style={{ fontSize: 11, color: c.textMuted }}>{item.driverName || 'No Driver'}</Text>
                    </View>
                    {selectedRoute === 'all' && item.routeName ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="navigate-outline" size={12} color={c.textMuted} />
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{item.routeName}</Text>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="time-outline" size={12} color={c.textMuted} />
                      <Text style={{ fontSize: 11, color: c.textMuted }}>{item.joinedAt || '—'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      </> }
    </View>
  );
}

function ProfileTab({ profile, user, vehicle, behaviorEvents, ratings, onToggle, onLogout, mode, setMode, c, s }) {
  const initials = (profile?.name || user?.fullName || 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  
  // Calculate behavior score from events
  const behaviorScore = useMemo(() => {
    if (!behaviorEvents || behaviorEvents.length === 0) return 100;
    const totalPoints = behaviorEvents.reduce((sum, e) => sum + (e.pointsImpact || 0), 0);
    return Math.max(0, Math.min(100, 100 + totalPoints));
  }, [behaviorEvents]);
  
  // Get recent negative behaviors for display
  const recentIssues = useMemo(() => {
    if (!behaviorEvents) return [];
    return behaviorEvents
      .filter(e => e.pointsImpact < 0)
      .slice(0, 3);
  }, [behaviorEvents]);
  
  // Calculate average rating
  const avgRating = useMemo(() => {
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + (r.rating || r.score || 0), 0);
    return (sum / ratings.length).toFixed(1);
  }, [ratings]);
  
  // Format expiry date
  const fmtDate = (d) => {
    if (!d) return 'Not set';
    const date = new Date(d);
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Check if date is expired or expiring soon
  const getExpiryStatus = (d) => {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const daysDiff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) return { color: '#ef4444', text: 'Expired', bg: '#ef444420' };
    if (daysDiff < 30) return { color: '#f59e0b', text: `Expires in ${daysDiff} days`, bg: '#f59e0b20' };
    return { color: '#22c55e', text: 'Valid', bg: '#22c55e20' };
  };
  
  const licenseStatus = getExpiryStatus(profile?.licenseExpiryDate);
  const pdpStatus = getExpiryStatus(profile?.pdpExpiryDate);
  
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Avatar card */}
      <View style={s.profHeader}>
        <View style={s.profAvatar}>
          <Text style={s.profAvatarTxt}>{initials}</Text>
        </View>
        <Text style={s.profName}>{profile?.name || user?.fullName || 'Driver'}</Text>
        <Text style={s.profEmail}>{profile?.email || user?.email || ''}</Text>
        <TouchableOpacity
          style={[s.onBadge, profile?.isAvailable ? s.onBadgeGreen : s.onBadgeGrey, { marginTop: 12 }]}
          onPress={onToggle}>
          <View style={[s.onDot, { backgroundColor: profile?.isAvailable ? '#22c55e' : '#9ca3af' }]} />
          <Text style={s.onTxt}>{profile?.isAvailable ? 'Online' : 'Offline'} · Tap to toggle</Text>
        </TouchableOpacity>
      </View>

      {/* Driver Performance Summary */}
      <View style={[s.performanceCard, { backgroundColor: c.surface }]}>
        <View style={s.performanceRow}>
          <View style={s.performanceItem}>
            <View style={[s.performanceIcon, { backgroundColor: behaviorScore >= 80 ? (c.mode === 'dark' ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.12)') : behaviorScore >= 60 ? (c.mode === 'dark' ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)') : (c.mode === 'dark' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)') }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={behaviorScore >= 80 ? c.success : behaviorScore >= 60 ? '#f59e0b' : c.danger} />
            </View>
            <Text style={[s.performanceValue, { color: behaviorScore >= 80 ? c.success : behaviorScore >= 60 ? '#f59e0b' : c.danger }]}>{behaviorScore}</Text>
            <Text style={s.performanceLabel}>Behavior Score</Text>
          </View>
          <View style={s.performanceDivider} />
          <View style={s.performanceItem}>
            <View style={[s.performanceIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="star-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={[s.performanceValue, { color: '#f59e0b' }]}>{avgRating}</Text>
            <Text style={s.performanceLabel}>Avg Rating</Text>
          </View>
          <View style={s.performanceDivider} />
          <View style={s.performanceItem}>
            <View style={[s.performanceIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)' }]}>
              <Ionicons name="ribbon-outline" size={20} color={c.info} />
            </View>
            <Text style={[s.performanceValue, { color: c.info }]}>{ratings?.length || 0}</Text>
            <Text style={s.performanceLabel}>Reviews</Text>
          </View>
        </View>
      </View>

      {/* License Information */}
      <Text style={s.profGroupLabel}>LICENSE INFORMATION</Text>
      <View style={s.profSection}>
        {profile?.licenseNumber ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="id-card-outline" size={16} color={c.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profRowTxt}>License No: {profile.licenseNumber}</Text>
            </View>
          </View>
        ) : null}
        {profile?.category ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.12)' }]}>
              <Ionicons name="car-outline" size={16} color="#8b5cf6" />
            </View>
            <Text style={s.profRowTxt}>Category: {profile.category}</Text>
          </View>
        ) : null}
        {profile?.licenseExpiryDate ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: licenseStatus?.bg || '#9ca3af20' }]}>
              <Ionicons name="calendar-outline" size={16} color={licenseStatus?.color || '#9ca3af'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profRowTxt}>Expires: {fmtDate(profile.licenseExpiryDate)}</Text>
              {licenseStatus && (
                <View style={[s.statusBadge, { backgroundColor: licenseStatus.bg }]}>
                  <Text style={[s.statusBadgeTxt, { color: licenseStatus.color }]}>{licenseStatus.text}</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}
        {!profile?.licenseNumber && !profile?.category && (
          <Text style={[s.profRowTxt, { color: c.textMuted, fontStyle: 'italic' }]}>No license information on file</Text>
        )}
      </View>

      {/* PDP Information */}
      <Text style={s.profGroupLabel}>PROFESSIONAL DRIVING PERMIT (PDP)</Text>
      <View style={s.profSection}>
        <View style={s.profRow}>
          <View style={[s.profRowIcon, { backgroundColor: profile?.hasPdp ? (c.mode === 'dark' ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)') : (c.mode === 'dark' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)') }]}>
            <Ionicons name={profile?.hasPdp ? "checkmark-circle-outline" : "close-circle-outline"} size={16} color={profile?.hasPdp ? c.success : c.danger} />
          </View>
          <Text style={s.profRowTxt}>{profile?.hasPdp ? 'PDP Certified' : 'No PDP on file'}</Text>
        </View>
        {profile?.hasPdp && profile?.pdpExpiryDate && (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: pdpStatus?.bg || '#9ca3af20' }]}>
              <Ionicons name="calendar-outline" size={16} color={pdpStatus?.color || '#9ca3af'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profRowTxt}>PDP Expires: {fmtDate(profile.pdpExpiryDate)}</Text>
              {pdpStatus && (
                <View style={[s.statusBadge, { backgroundColor: pdpStatus.bg }]}>
                  <Text style={[s.statusBadgeTxt, { color: pdpStatus.color }]}>{pdpStatus.text}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Personal Info */}
      <Text style={s.profGroupLabel}>PERSONAL INFORMATION</Text>
      <View style={s.profSection}>
        {profile?.idNumber ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="person-outline" size={16} color="#6366f1" />
            </View>
            <Text style={s.profRowTxt}>ID: {profile.idNumber}</Text>
          </View>
        ) : null}
        {profile?.phone ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)' }]}>
              <Ionicons name="call-outline" size={16} color={c.info} />
            </View>
            <Text style={s.profRowTxt}>{profile.phone}</Text>
          </View>
        ) : null}
        {profile?.experience ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="briefcase-outline" size={16} color="#f59e0b" />
            </View>
            <Text style={s.profRowTxt}>{profile.experience}</Text>
          </View>
        ) : null}
      </View>

      {/* Recent Behavior Issues */}
      {recentIssues.length > 0 && (
        <>
          <Text style={[s.profGroupLabel, { color: c.danger }]}>RECENT BEHAVIOR ALERTS</Text>
          <View style={[s.profSection, { borderColor: c.mode === 'dark' ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)' }]}>
            {recentIssues.map((issue, idx) => (
              <View key={idx} style={s.behaviorRow}>
                <View style={[s.behaviorIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)' }]}>
                  <Ionicons name="warning-outline" size={14} color={c.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.behaviorTitle}>{issue.category}</Text>
                  <Text style={s.behaviorDesc} numberOfLines={1}>{issue.description}</Text>
                </View>
                <Text style={s.behaviorPoints}>{issue.pointsImpact}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Vehicle */}
      <Text style={s.profGroupLabel}>VEHICLE ASSIGNMENT</Text>
      <View style={s.profSection}>
        <View style={s.profRow}>
          <View style={[s.profRowIcon, { backgroundColor: vehicle ? c.primary + '20' : '#9ca3af20' }]}>
            <Ionicons name="car-sport-outline" size={16} color={vehicle ? c.primary : '#9ca3af'} />
          </View>
          {vehicle ? (
            <View style={{ flex: 1 }}>
              <Text style={s.profRowTxt}>{vehicle.make || vehicle.Make} {vehicle.model || vehicle.Model}</Text>
              <Text style={[s.profRowTxt, { fontSize: 12, color: c.primary, fontWeight: '700', marginTop: 1 }]}>{vehicle.registration || vehicle.Registration}</Text>
            </View>
          ) : (
            <Text style={[s.profRowTxt, { color: c.textMuted }]}>No vehicle assigned</Text>
          )}
        </View>
      </View>

      {/* Preferences */}
      <Text style={[s.profGroupLabel, { marginTop: 4 }]}>PREFERENCES</Text>
      <TouchableOpacity style={s.profActionRow} onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
        <View style={[s.profActionIcon, { backgroundColor: c.mode === 'dark' ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)' }]}>
          <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color="#f59e0b" />
        </View>
        <Text style={s.profActionTxt}>{mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={s.logoutTxt}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function DriverDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { theme, mode, setMode } = useAppTheme();
  const c = theme.colors;
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [behaviorEvents, setBehaviorEvents] = useState([]);
  const [ratings, setRatings] = useState([]);

  const [earnModal, setEarnModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [maintModal, setMaintModal] = useState(false);
  const [editMaintModal, setEditMaintModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingRequest, setRatingRequest] = useState(null);
  const [monitorActive, setMonitorActive] = useState(false);
  const [monitorSpeed, setMonitorSpeed] = useState(0);
  const [recentBehaviorEvents, setRecentBehaviorEvents] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionFare, setCompletionFare] = useState('');
  const [completing, setCompleting] = useState(false);

  async function handleDashboardCompleteTrip() {
    const tripId = getTripId(activeTrip);
    if (!tripId) { Alert.alert('Error', 'Invalid trip ID'); return; }
    try {
      setCompleting(true);
      let lat, lng;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch {}
      const fareAmount = completionFare ? parseFloat(completionFare) : null;
      await completeTrip(tripId, completionNotes || 'Completed from driver dashboard', profile?.id, {
        completedAt: new Date().toISOString(),
        latitude: lat,
        longitude: lng,
      }, fareAmount);
      setCompleteModalVisible(false);
      setCompletionNotes('');
      setCompletionFare('');
      Alert.alert('Success', 'Trip completed successfully');
      await load();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to complete trip');
    } finally {
      setCompleting(false);
    }
  }

  async function submitReview({ rating, review }) {
    await submitMechanicalRequestReview({
      requestId: ratingRequest.id,
      rating,
      review,
      role: 'driver',
      userId: user?.id,
    });
    Alert.alert('Thank you', 'Your review has been submitted');
  }

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const profResp = await API.getDriverProfiles();
      const prof = Array.isArray(profResp.data) ? profResp.data.find(d => d.userId === user.id) : null;
      setProfile(prof);

      // Fetch behavior events and ratings if profile exists
      if (prof?.id) {
        try {
          const events = await fetchDriverEvents(prof.id, 20);
          setBehaviorEvents(Array.isArray(events) ? events : []);
        } catch { setBehaviorEvents([]); }
        
        // Fetch ratings from reviews API (mechanical request reviews for now)
        try {
          const mr = await API.getMaintenance();
          const all = Array.isArray(mr.data) ? mr.data : [];
          // Filter completed requests with ratings
          const rated = all.filter(r => r.status === 'completed' && r.driverRating != null);
          setRatings(rated.map(r => ({ rating: r.driverRating, review: r.driverReview, date: r.completedAt })));
        } catch { setRatings([]); }
      }

      let veh = null;
      try {
        const ZERO = '00000000-0000-0000-0000-000000000000';
        const assignedId = prof?.assignedVehicleId;
        if (assignedId && assignedId !== ZERO) {
          const vehResp = await API.getVehicles();
          const all = Array.isArray(vehResp.data) ? vehResp.data : [];
          veh = all.find(v =>
            (v.id || v.Id || '').toLowerCase() === assignedId.toLowerCase()
          ) || null;
        }
        setVehicle(veh);
      } catch {}

      // Fetch active trip for this driver
      if (prof?.id) {
        try {
          console.log('[Dashboard] Fetching active trips for driver:', prof.id);
          const resp = await client.get(`/TaxiRankTrips/driver/${prof.id}/active`);
          const trips = Array.isArray(resp.data) ? resp.data : [];
          console.log('[Dashboard] Active trips found:', trips.length);
          setActiveTrip(trips.length > 0 ? trips[0] : null);
        } catch (err) {
          console.warn('[Dashboard] Active trips fetch error:', err?.message, err?.response?.status);
          setActiveTrip(null);
        }
      }

      if (veh) {
        const { start, end } = monthRange();
        try {
          const [er, ex] = await Promise.all([
            API.getEarnings(veh.id, start, end),
            API.getExpenses(veh.id, start, end),
          ]);
          setEarnings(Array.isArray(er.data) ? er.data : []);
          setExpenses(Array.isArray(ex.data) ? ex.data : []);
        } catch { setEarnings([]); setExpenses([]); }

        try {
          const mr = await API.getMaintenance();
          const all = Array.isArray(mr.data) ? mr.data : [];
          setMaintenance(all.filter(r => r.vehicleId === veh.id));
        } catch { setMaintenance([]); }
      }
    } catch (e) {
      console.warn('Driver dashboard load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Re-fetch active trip when screen regains focus (e.g. after completing from details)
  useFocusEffect(useCallback(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const resp = await client.get(`/TaxiRankTrips/driver/${profile.id}/active`);
        const trips = Array.isArray(resp.data) ? resp.data : [];
        setActiveTrip(trips.length > 0 ? trips[0] : null);
      } catch {
        setActiveTrip(null);
      }
    })();
  }, [profile?.id]));

  // Re-fetch active trip when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && profile?.id) {
        (async () => {
          try {
            const resp = await client.get(`/TaxiRankTrips/driver/${profile.id}/active`);
            const trips = Array.isArray(resp.data) ? resp.data : [];
            setActiveTrip(trips.length > 0 ? trips[0] : null);
          } catch {
            setActiveTrip(null);
          }
        })();
      }
    });

    return () => subscription?.remove();
  }, [profile?.id]);

  async function toggleAvailability() {
    if (!profile) return;
    const goingOnline = !profile.isAvailable;
    if (!goingOnline && activeTrip) {
      Alert.alert('Active Trip', 'You cannot go offline while you have an active trip. Please complete the trip first.');
      return;
    }
    try {
      await API.updateDriverProfile(profile.id, { ...profile, isAvailable: goingOnline });
      setProfile(p => ({ ...p, isAvailable: goingOnline }));

      // Start/stop driving behavior monitor
      if (goingOnline) {
        const result = await startMonitoring({
          driverId: profile.id,
          vehicleId: vehicle?.id,
          tenantId: user?.tenantId,
          reporterId: user?.userId || user?.id,
          onEvent: (evt) => {
            setRecentBehaviorEvents(prev => [evt, ...prev].slice(0, 10));
          },
          onStatusChange: (status) => {
            setMonitorActive(status.monitoring);
            setMonitorSpeed(status.speed || 0);
          },
        });
        if (result.success) {
          setMonitorActive(true);
        } else if (result.error) {
          Alert.alert('Monitor', `Could not start behavior monitoring: ${result.error}`);
        }
      } else {
        stopMonitoring();
        setMonitorActive(false);
        setMonitorSpeed(0);
      }
    } catch { Alert.alert('Error', 'Could not update availability'); }
  }

  // Auto-start behavior monitoring when there is an active trip
  useEffect(() => {
    if (activeTrip && !monitorActive && profile) {
      (async () => {
        const alreadyRunning = await isMonitoring();
        if (alreadyRunning) { setMonitorActive(true); return; }
        const result = await startMonitoring({
          driverId: profile.id,
          vehicleId: vehicle?.id,
          tenantId: user?.tenantId,
          reporterId: user?.userId || user?.id,
          onEvent: (evt) => {
            setRecentBehaviorEvents(prev => [evt, ...prev].slice(0, 10));
          },
          onStatusChange: (status) => {
            setMonitorActive(status.monitoring);
            setMonitorSpeed(status.speed || 0);
          },
        });
        if (result.success) setMonitorActive(true);
      })();
    }
  }, [activeTrip, monitorActive, profile]);

  // Cleanup monitor on unmount
  useEffect(() => {
    return () => { stopMonitoring(); };
  }, []);

  async function logout() {
    try { await signOut(); } catch {}
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
  }

  const pendingCount = maintenance.filter(r => ['open', 'pending'].includes((r.state || '').toLowerCase())).length;

  const TABS = [
    { key: 'overview', label: 'Overview', icon: 'grid-outline', activeIcon: 'grid' },
    { key: 'maintenance', label: 'Maintenance', icon: 'construct-outline', activeIcon: 'construct', badge: pendingCount },
    { key: 'trips', label: 'Trips', icon: 'car-outline', activeIcon: 'car' },
    { key: 'earnings', label: 'Earnings', icon: 'wallet-outline', activeIcon: 'wallet' },
    { key: 'messages', label: 'Messages', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
    { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  const driverInitials = ((profile?.name || user?.fullName || 'D')).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[s.muted, { marginTop: 14 }]}>Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerAvatar} onPress={() => setTab('profile')}>
          <Text style={s.headerAvatarTxt}>{driverInitials}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.greeting}>{profile?.name?.split(' ')[0] || user?.fullName?.split(' ')[0] || 'Driver'} </Text>
          <Text style={s.subhead}>Driver Portal</Text>
        </View>
        <ThemeToggle style={{ marginRight: 8 }} size={20} />
        <TouchableOpacity style={[s.onBadge, profile?.isAvailable ? s.onBadgeGreen : s.onBadgeGrey]} onPress={toggleAvailability}>
          <View style={[s.onDot, { backgroundColor: profile?.isAvailable ? '#22c55e' : '#9ca3af' }]} />
          <Text style={s.onTxt}>{profile?.isAvailable ? 'Online' : 'Offline'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {tab === 'overview' && (
          <OverviewTab profile={profile} vehicle={vehicle} earnings={earnings} expenses={expenses} maintenance={maintenance}
            onToggle={toggleAvailability} onAddEarning={() => setEarnModal(true)} onAddExpense={() => setExpModal(true)}
            onOpenBehavior={() => navigation.navigate('DriverBehavior')}
            onOpenTrips={() => setTab('trips')}
            refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
            monitorActive={monitorActive} monitorSpeed={monitorSpeed} recentBehaviorEvents={recentBehaviorEvents}
            activeTrip={activeTrip}
            onViewTripDetails={(trip) => {
              const tripId = getTripId(trip);
              if (!tripId) { Alert.alert('Error', 'Invalid trip ID'); return; }
              navigation.navigate('DriverTripDetails', { tripId, driverProfileId: profile?.id });
            }}
            onCompleteTrip={() => {
              setCompletionNotes('');
              setCompleteModalVisible(true);
            }}
            c={c} s={s} />
        )}
        {tab === 'maintenance' && (
          <MaintenanceTab maintenance={maintenance} expenses={expenses} vehicle={vehicle} profile={profile} onNew={() => setMaintModal(true)}
            onEdit={r => { setEditingRequest(r); setEditMaintModal(true); }}
            onDelete={async r => {
              let confirmed = false;
              if (Platform.OS === 'web') {
                confirmed = window.confirm('Delete this maintenance request?');
              } else {
                confirmed = await new Promise(resolve =>
                  Alert.alert('Delete Request', 'Are you sure you want to delete this request?', [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
                  ])
                );
              }
              if (!confirmed) return;
              try {
                await API.deleteMaintenance(r.id);
                load();
              } catch (e) {
                Alert.alert('Error', e?.response?.data?.message || 'Could not delete request');
              }
            }}
            refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} c={c} s={s} />
        )}
        {tab === 'earnings' && (
          <EarningsTab earnings={earnings} expenses={expenses} vehicleId={vehicle?.id}
            onAddEarning={() => setEarnModal(true)} onAddExpense={() => setExpModal(true)}
            refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} c={c} s={s} />
        )}
        {tab === 'trips' && <TripsTab driverId={profile?.id} navigation={navigation} c={c} s={s} />}
        {tab === 'messages' && <MessagesTab userId={user?.id} c={c} s={s} />}
        {tab === 'profile' && (
          <ProfileTab profile={profile} user={user} vehicle={vehicle}
            behaviorEvents={behaviorEvents} ratings={ratings}
            onToggle={toggleAvailability} onLogout={logout}
            mode={mode} setMode={setMode} c={c} s={s} />
        )}
      </View>

      {/* Bottom tab bar */}
      <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
            <View>
              <Ionicons name={tab === t.key ? t.activeIcon : t.icon} size={22} color={tab === t.key ? c.primary : c.textMuted} />
              {t.badge > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeTxt}>{t.badge > 9 ? '9+' : t.badge}</Text></View>
              )}
            </View>
            <Text style={[s.tabLbl, tab === t.key && { color: c.primary, fontWeight: '800' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modals */}
      <AddEarningModal visible={earnModal} vehicleId={vehicle?.id} onClose={() => setEarnModal(false)} onSuccess={load} c={c} s={s} />
      <AddExpenseModal visible={expModal} vehicleId={vehicle?.id} onClose={() => setExpModal(false)} onSuccess={load} c={c} s={s} />
      <MaintenanceModal visible={maintModal} vehicleId={vehicle?.id} ownerId={vehicle?.ownerId} onClose={() => setMaintModal(false)} onSuccess={load} c={c} s={s} />
      <EditMaintenanceModal visible={editMaintModal} request={editingRequest} onClose={() => { setEditMaintModal(false); setEditingRequest(null); }} onSuccess={load} c={c} s={s} />
      <RatingReviewModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSubmit={submitReview}
        request={ratingRequest}
        role="driver"
      />

      {/* Complete Trip Modal */}
      <Modal visible={completeModalVisible} transparent animationType="fade" onRequestClose={() => setCompleteModalVisible(false)}>
        <View style={s.ctOverlay}>
          <View style={s.ctContent}>
            <Text style={s.ctTitle}>Complete Trip</Text>
            <Text style={s.ctSubtitle}>Are you sure you want to complete this trip? This action cannot be undone.</Text>
            <View style={s.ctFareRow}>
              <Text style={s.ctFareLabel}>Total Fare (R)</Text>
              <TextInput
                style={s.ctFareInput}
                placeholder="0.00"
                placeholderTextColor={c.textMuted}
                value={completionFare}
                onChangeText={setCompletionFare}
                keyboardType="decimal-pad"
              />
            </View>
            <TextInput
              style={s.ctNotesInput}
              placeholder="Add completion notes (optional)"
              placeholderTextColor={c.textMuted}
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
              numberOfLines={3}
            />
            <View style={s.ctButtons}>
              <TouchableOpacity style={s.ctCancelBtn} onPress={() => setCompleteModalVisible(false)} disabled={completing}>
                <Text style={s.ctCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ctConfirmBtn} onPress={handleDashboardCompleteTrip} disabled={completing}>
                {completing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.ctConfirmTxt}>Complete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    // ── Header ──
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    headerAvatarTxt: { color: c.primaryText, fontSize: 15, fontWeight: '900' },
    greeting: { fontSize: 16, fontWeight: '800', color: c.text },
    subhead: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    onBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    onBadgeGreen: { backgroundColor: c.mode === 'dark' ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)', borderColor: '#22c55e' },
    onBadgeGrey: { backgroundColor: c.surface2, borderColor: c.border },
    onDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
    onTxt: { fontSize: 12, fontWeight: '700', color: c.text },

    // ── Hero online/offline banner ──
    heroBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 14 },
    heroBannerIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    heroBannerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    heroBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    // ── Driving Monitor ──
    monitorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d6efd15', borderWidth: 1, borderColor: '#0d6efd44', borderRadius: 14, padding: 12, marginBottom: 12 },
    monitorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0d6efd' },
    monitorTitle: { fontSize: 13, fontWeight: '800', color: '#0d6efd' },
    monitorSub: { fontSize: 10, color: c.textMuted, marginTop: 1 },
    monitorSpeedBadge: { alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: c.border },
    monitorSpeedTxt: { fontSize: 18, fontWeight: '900', color: c.text },
    monitorSpeedUnit: { fontSize: 9, fontWeight: '700', color: c.textMuted },

    behaviorAlertCard: { backgroundColor: '#f59e0b10', borderWidth: 1, borderColor: '#f59e0b44', borderRadius: 14, padding: 12, marginBottom: 12 },
    behaviorAlertTitle: { fontSize: 13, fontWeight: '800', color: '#f59e0b' },
    behaviorAlertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 8, borderLeftWidth: 3, marginBottom: 4 },
    behaviorAlertCat: { fontSize: 12, fontWeight: '800', minWidth: 80 },
    behaviorAlertDesc: { flex: 1, fontSize: 11, color: c.textMuted },
    behaviorAlertPts: { fontSize: 12, fontWeight: '900' },

    // ── Active Trip Card ──
    activeTripCard: {
      backgroundColor: c.mode === 'dark' ? '#0f172a' : '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 14,
      borderWidth: 1.5, borderColor: '#22c55e',
      shadowColor: '#22c55e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    },
    activeTripHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    activeTripDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', marginRight: 10 },
    activeTripTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    activeTripSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    activeTripBadge: { backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    activeTripBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
    activeTripMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
    activeTripMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    activeTripMetaTxt: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    activeTripActions: { flexDirection: 'row', gap: 10 },
    activeTripBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: c.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 11,
      borderWidth: 1, borderColor: c.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)',
    },
    activeTripBtnGreen: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    activeTripBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },

    // ── Hero profit card ──
    heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary, borderRadius: 20, padding: 20, marginBottom: 14 },
    heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 4 },
    heroValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    heroIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

    // ── Metrics grid ──
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    metricCard: { width: '47%', padding: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border },
    metricIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    metricValue: { fontSize: 15, fontWeight: '800', color: c.text },
    metricLabel: { fontSize: 11, color: c.textMuted, marginTop: 2, fontWeight: '600' },
    metricSub: { fontSize: 10, color: c.textMuted, marginTop: 1 },

    // ── Quick actions ──
    sectionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 10 },
    quickActions: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    quickActionBtn: { flex: 1, alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: c.border },
    quickActionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    quickActionTxt: { fontSize: 12, fontWeight: '700', color: c.text },

    // ── Vehicle card ──
    card: { backgroundColor: c.surface, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: c.border },
    vehMain: { fontSize: 20, fontWeight: '900', color: c.text },
    vehSub: { fontSize: 13, color: c.textMuted, marginTop: 2, marginBottom: 10 },
    vehStatusBadge: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    vehStatusTxt: { fontSize: 10, fontWeight: '800' },
    vehEmpty: { alignItems: 'center', paddingVertical: 28 },
    vehEmptyTxt: { fontSize: 14, fontWeight: '700', color: c.textMuted, marginTop: 10 },
    vehEmptySub: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    plateBadge: { alignSelf: 'flex-start', backgroundColor: c.background, borderWidth: 2, borderColor: c.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
    plateTxt: { fontSize: 17, fontWeight: '900', color: c.text, letterSpacing: 3 },
    vehGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    vehGridItem: { flex: 1, alignItems: 'center', backgroundColor: c.background, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border },
    vehGridVal: { fontSize: 13, fontWeight: '800', color: c.text, marginTop: 4 },
    vehGridLbl: { fontSize: 10, color: c.textMuted, marginTop: 2 },
    serviceAlerts: { gap: 6, marginBottom: 10 },
    serviceAlert: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
    serviceAlertTxt: { fontSize: 12, fontWeight: '600', flex: 1 },
    expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, gap: 4, borderTopWidth: 1, borderTopColor: c.border, marginTop: 6 },
    expandTxt: { fontSize: 12, fontWeight: '700', color: c.primary },
    detailRows: { marginTop: 12, gap: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    detailLbl: { flex: 1, fontSize: 12, color: c.textMuted, marginLeft: 6 },
    detailVal: { fontSize: 12, fontWeight: '700', color: c.text, textAlign: 'right', flexShrink: 1, maxWidth: '55%' },

    // ── Earnings tab summary row ──
    earnSummaryRow: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, marginBottom: 14, overflow: 'hidden' },
    earnSummaryItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    earnSummaryVal: { fontSize: 14, fontWeight: '900', marginTop: 6 },
    earnSummaryLbl: { fontSize: 10, color: c.textMuted, marginTop: 2, fontWeight: '600' },

    // ── Toggle ──
    toggle: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 12, padding: 3, marginBottom: 14 },
    tBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
    tBtnOn: { backgroundColor: c.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
    tTxt: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    tTxtOn: { color: c.text, fontWeight: '800' },

    // ── Ledger rows ──
    ledger: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    ledgerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    ledgerLbl: { fontSize: 13, fontWeight: '700', color: c.text },
    ledgerDesc: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    ledgerAmt: { fontSize: 14, fontWeight: '900' },
    ledgerDate: { fontSize: 10, color: c.textMuted, marginTop: 2 },

    // ── Section header ──
    secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    secTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 8 },
    btnSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4 },
    btnSmTxt: { color: c.primaryText, fontWeight: '700', fontSize: 13 },

    // ── Maintenance cards ──
    reqCard: { backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    reqIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    reqCat: { fontSize: 14, fontWeight: '800', color: c.text },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    badgeTxt: { fontSize: 10, fontWeight: '800' },
    reqEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: c.primary },
    reqEditBtnTxt: { fontSize: 12, fontWeight: '700', color: c.primary },
    reqDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#ef4444' },
    reqDeleteBtnTxt: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
    reqDesc: { fontSize: 12, color: c.textMuted, marginBottom: 8 },
    reqMeta: { flexDirection: 'row', alignItems: 'center' },
    metaTxt: { fontSize: 11, color: c.textMuted, marginLeft: 3 },
    metaSep: { fontSize: 11, color: c.textMuted, marginHorizontal: 5 },

    // ── Messages ──
    unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.mode === 'dark' ? '#78350f' : '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#f59e0b' },
    unreadBannerTxt: { fontSize: 13, fontWeight: '700', color: c.mode === 'dark' ? '#fef3c7' : '#92400e' },
    msgRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarTxt: { fontWeight: '800', fontSize: 16 },
    msgFrom: { fontSize: 13, fontWeight: '800', color: c.text },
    msgDate: { fontSize: 10, color: c.textMuted },
    msgPrev: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary, marginLeft: 8 },

    // ── Empty state ──
    empty: { alignItems: 'center', paddingVertical: 52 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginTop: 12, marginBottom: 4 },
    emptyTxt: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
    muted: { fontSize: 13, color: c.textMuted },

    // ── Tab bar ──
    tabBar: { flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    tabItem: { flex: 1, alignItems: 'center', gap: 3, minHeight: 44, justifyContent: 'center' },
    tabLbl: { fontSize: 10, fontWeight: '600', color: c.textMuted },
    tabBadge: { position: 'absolute', top: -4, right: -10, backgroundColor: c.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    tabBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },

    // ── Modal ──
    overlay: { flex: 1, backgroundColor: c.mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', width: '100%' },
    sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, width: '100%' },
    sheetTitle: { fontSize: 18, fontWeight: '900', color: c.text, marginBottom: 4 },
    label: { fontSize: 12, fontWeight: '700', color: c.textMuted, marginTop: 16, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, backgroundColor: c.background, color: c.text, fontSize: 14, width: '100%' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    chipOn: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { fontSize: 12, fontWeight: '600', color: c.textMuted },
    chipTxtOn: { color: c.primaryText },
    row2: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    btnPrimary: { flex: 1, backgroundColor: c.primary, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnPrimaryTxt: { color: c.primaryText, fontWeight: '900', fontSize: 15 },
    btnGhost: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: c.border, marginRight: 8 },
    btnGhostTxt: { color: c.text, fontWeight: '700', fontSize: 15 },

    // ── Profile tab ──
    profHeader: { alignItems: 'center', paddingVertical: 28, backgroundColor: c.surface, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: c.border },
    profAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    profAvatarTxt: { fontSize: 30, fontWeight: '900', color: c.primaryText },
    profName: { fontSize: 20, fontWeight: '900', color: c.text },
    profEmail: { fontSize: 13, color: c.textMuted, marginTop: 3 },
    profGroupLabel: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
    profSection: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 16 },
    profRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 },
    profRowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    profRowTxt: { fontSize: 14, fontWeight: '600', color: c.text, flex: 1 },
    profActionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, gap: 12 },
    profActionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    profActionTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.danger, borderRadius: 16, paddingVertical: 16, marginTop: 16, gap: 8 },
    logoutTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },

    // ── Profile Performance Card ──
    performanceCard: { borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 20 },
    performanceRow: { flexDirection: 'row', alignItems: 'center' },
    performanceItem: { flex: 1, alignItems: 'center' },
    performanceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    performanceValue: { fontSize: 22, fontWeight: '900' },
    performanceLabel: { fontSize: 11, color: c.textMuted, marginTop: 2, fontWeight: '600' },
    performanceDivider: { width: 1, height: 50, backgroundColor: c.border },

    // ── Profile Status Badges ──
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
    statusBadgeTxt: { fontSize: 10, fontWeight: '700' },

    // ── Profile Behavior Alerts ──
    behaviorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border, gap: 10 },
    behaviorIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    behaviorTitle: { fontSize: 13, fontWeight: '700', color: c.text },
    behaviorDesc: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    behaviorPoints: { fontSize: 14, fontWeight: '900', color: '#ef4444' },

    // ── Complete Trip Modal ──
    ctOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    ctContent: { backgroundColor: c.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
    ctTitle: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 8, textAlign: 'center' },
    ctSubtitle: { fontSize: 14, color: c.textMuted, marginBottom: 20, textAlign: 'center', lineHeight: 20 },
    ctFareRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    ctFareLabel: { fontSize: 14, fontWeight: '600', color: c.text, marginRight: 12 },
    ctFareInput: { flex: 1, backgroundColor: c.background, borderRadius: 10, padding: 12, fontSize: 16, color: c.text, borderWidth: 1, borderColor: c.border, textAlign: 'right', fontWeight: '600' },
    ctNotesInput: { backgroundColor: c.background, borderRadius: 12, padding: 12, fontSize: 14, color: c.text, borderWidth: 1, borderColor: c.border, marginBottom: 20, minHeight: 80, textAlignVertical: 'top' },
    ctButtons: { flexDirection: 'row', gap: 12 },
    ctCancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
    ctCancelTxt: { color: c.text, fontWeight: '700', fontSize: 15 },
    ctConfirmBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#16a34a' },
    ctConfirmTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

    // ── Category Selector ──
    categorySelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, width: '100%', marginHorizontal: 0 },
    selectedCategory: { flexDirection: 'row', alignItems: 'center' },
    selectedCategoryText: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
    placeholderText: { fontSize: 14, color: c.textMuted },

    // ── Category Grid Modal ──
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    categoryModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32, maxHeight: '80%', width: '100%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalCancel: { fontSize: 14, fontWeight: '600' },
    modalTitle: { fontSize: 16, fontWeight: '800' },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 0, gap: 12 },
    categoryCard: { width: '30.5%', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1 },
    categoryIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    categoryName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

    // ── Part Chips ──
    partChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
    partChipText: { fontSize: 12, fontWeight: '600', marginRight: 6 },

    // ── Receipt ──
    receiptPreview: { position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
    receiptImage: { width: '100%', height: 180, borderRadius: 12 },
    removeReceipt: { position: 'absolute', top: 8, right: 8 },
    receiptOptions: { flexDirection: 'row', gap: 10 },
    receiptButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
    receiptButtonText: { fontSize: 13, fontWeight: '600' },

    // ── Dropdown / Picker ──
    dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1 },
    dropdownText: { fontSize: 14, fontWeight: '500' },
    pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },

    // ── Mechanical Parts Checkbox ──
    partCheckbox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 10 },

    // ── Cost Row ──
    costRow: { flexDirection: 'row', gap: 12 },
    costItem: { flex: 1 },
  });
}
