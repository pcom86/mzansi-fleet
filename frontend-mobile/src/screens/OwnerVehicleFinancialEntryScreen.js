import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform, ScrollView, FlatList, Image, Switch, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { createVehicleEarning, createVehicleExpense, getVehicleEarnings, getVehicleExpenses } from '../api/vehicleFinancials';
import { useAppTheme } from '../theme';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { getServiceProvidersByServiceType } from '../api/serviceProviderProfiles';

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toAmount(val) {
  const n = Number(String(val).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

const EXPENSE_CATEGORIES = [
  { id: 'fuel', name: 'Fuel', icon: 'business', color: '#10B981', serviceType: null },
  { id: 'maintenance', name: 'Maintenance', icon: 'build', color: '#F59E0B', serviceType: 'Mechanical' },
  { id: 'insurance', name: 'Insurance', icon: 'shield-checkmark', color: '#3B82F6', serviceType: null },
  { id: 'repairs', name: 'Repairs', icon: 'hammer', color: '#EF4444', serviceType: 'Mechanical' },
  { id: 'towing', name: 'Towing', icon: 'card', color: '#8B5CF6', serviceType: 'Towing' },
  { id: 'tires', name: 'Tires', icon: 'card', color: '#06B6D4', serviceType: 'Tire Service' },
  { id: 'electrical', name: 'Electrical', icon: 'flash', color: '#F59E0B', serviceType: 'Electrical' },
  { id: 'bodywork', name: 'Bodywork', icon: 'car', color: '#EF4444', serviceType: 'Bodywork' },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280', serviceType: null },
];

// Map expense category to service type for filtering providers
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

export default function OwnerVehicleFinancialEntryScreen({ route, navigation }) {
  const vehicle = route?.params?.vehicle || null;
  const defaultType = route?.params?.type || 'expense';

  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const vehicleId = useMemo(() => vehicle?.id || vehicle?.Id || vehicle?.vehicleId || null, [vehicle]);
  const reg = useMemo(() => vehicle?.registration || vehicle?.Registration || '', [vehicle]);

  const [entryType, setEntryType] = useState(defaultType === 'earning' ? 'earning' : 'expense');
  const [dateObj, setDateObj] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const date = formatDate(dateObj);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Trip');
  const [period, setPeriod] = useState('Daily');
  const [category, setCategory] = useState('fuel');
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentEarnings, setRecentEarnings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // --- Enhanced expense state ---
  const [receiptImage, setReceiptImage] = useState(null);
  const [mechanicalCategory, setMechanicalCategory] = useState('');
  const [mechanicalCategories, setMechanicalCategories] = useState([]);
  const [selectedParts, setSelectedParts] = useState(new Set());
  const [mechanicalSelectedParts, setMechanicalSelectedParts] = useState(new Set());
  const [laborDescription, setLaborDescription] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [mechanicName, setMechanicName] = useState('');
  const [warrantyInfo, setWarrantyInfo] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState(new Date());
  const [showNextServicePicker, setShowNextServicePicker] = useState(false);
  const [showMechanicalCategoryPicker, setShowMechanicalCategoryPicker] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showReceiptOptions, setShowReceiptOptions] = useState(false);

  // --- Legacy state for mechanical/service provider fields ---
  const [otherPartDescription, setOtherPartDescription] = useState('');
  const [frequentReplacement, setFrequentReplacement] = useState(false);
  const [showPartFixedGrid, setShowPartFixedGrid] = useState(false);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [newProviderName, setNewProviderName] = useState('');
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: entryType === 'earning' ? 'Add Earning' : 'Add Expense' });
    loadMechanicalCategories();
    
    // Load service providers if needed
    if (serviceProviders.length === 0) {
      setLoadingProviders(true);
      import('../api/client').then(({ default: client }) => {
        client.get('/ServiceProviders')
          .then(res => {
            setServiceProviders(res.data || []);
          })
          .catch(error => {
            console.error('Failed to load service providers:', error);
            setServiceProviders([]);
          })
          .finally(() => setLoadingProviders(false));
      });
    }
  }, [navigation, entryType]);

  // Load service providers when category changes (filter by service type)
  useEffect(() => {
    const serviceType = CATEGORY_TO_SERVICE_TYPE[category];
    // Load providers for categories that have service types
    if (serviceType || category === 'maintenance' || category === 'repairs' || category === 'towing' || category === 'tires' || category === 'electrical' || category === 'bodywork') {
      setLoadingProviders(true);
      getServiceProvidersByServiceType(serviceType)
        .then(providers => {
          setServiceProviders(providers || []);
        })
        .catch(error => {
          console.error('Failed to load service providers:', error);
          setServiceProviders([]);
        })
        .finally(() => setLoadingProviders(false));
    } else {
      // For other categories, clear service providers
      setServiceProviders([]);
      setSelectedProvider(null);
    }
  }, [category]);

  // --- Enhanced expense functions ---
  const loadMechanicalCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await client.get('/VehicleExpenses/mechanical-categories');
      setMechanicalCategories(res.data || []);
    } catch (e) {
      console.warn('Failed to load mechanical categories', e);
    } finally {
      setLoadingCategories(false);
    }
  };

  const pickReceiptImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setReceiptImage(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takeReceiptPhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setReceiptImage(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const togglePart = (partName) => {
    const newSelectedParts = new Set(mechanicalSelectedParts);
    if (newSelectedParts.has(partName)) {
      newSelectedParts.delete(partName);
    } else {
      newSelectedParts.add(partName);
    }
    setMechanicalSelectedParts(newSelectedParts);
  };

  const getAvailableParts = () => {
    const category = mechanicalCategories.find(cat => cat.Category === mechanicalCategory);
    return category ? category.CommonParts : [];
  };

  const handleMechanicalCategoryChange = (category) => {
    setMechanicalCategory(category);
    setMechanicalSelectedParts(new Set());
  };

  async function handleAddProvider() {
    if (!newProviderName.trim()) return;
    setLoadingProviders(true);
    const { default: client } = await import('../api/client');
    try {
      const res = await client.post('/ServiceProviders', { businessName: newProviderName });
      setServiceProviders([...serviceProviders, res.data]);
      setSelectedProvider(res.data);
      setShowAddProvider(false);
      setNewProviderName('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add service provider');
    } finally {
      setLoadingProviders(false);
    }
  }

  useEffect(() => {
    if (!vehicleId) return;
    let mounted = true;
    async function loadHistory() {
      try {
        setLoadingHistory(true);
        const data = await getVehicleEarnings(vehicleId);
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : (data?.$values || data?.items || []);
        setRecentEarnings(arr.slice(0, 10));
      } catch (e) {
        console.warn('Failed to load recent earnings', e);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    }
    loadHistory();
    return () => { mounted = false; };
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;
    let mounted = true;
    async function loadExpenses() {
      try {
        setLoadingExpenses(true);
        const data = await getVehicleExpenses(vehicleId);
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : (data?.$values || data?.items || []);
        setRecentExpenses(arr.slice(0, 10));
      } catch (e) {
        console.warn('Failed to load recent expenses', e);
      } finally {
        if (mounted) setLoadingExpenses(false);
      }
    }
    loadExpenses();
    return () => { mounted = false; };
  }, [vehicleId]);

  function validate() {
    if (!vehicleId) {
      Alert.alert('Error', 'Vehicle is missing.');
      return false;
    }
    if (!date?.trim()) {
      Alert.alert('Validation', 'Date is required.');
      return false;
    }
    const a = toAmount(amount);
    if (!Number.isFinite(a) || a <= 0) {
      Alert.alert('Validation', 'Amount must be greater than 0.');
      return false;
    }
    if (entryType === 'earning') {
      if (!source?.trim()) {
        Alert.alert('Validation', 'Source is required.');
        return false;
      }
      if (!period?.trim()) {
        Alert.alert('Validation', 'Period is required.');
        return false;
      }
    } else {
      if (!category?.trim()) {
        Alert.alert('Validation', 'Category is required.');
        return false;
      }
    }
    return true;
  }

  async function onSave() {
    if (!validate()) return;

    try {
      setSaving(true);
      const a = toAmount(amount);

      if (entryType === 'earning') {
        await createVehicleEarning({
          id: '00000000-0000-0000-0000-000000000000',
          vehicleId,
          date,
          amount: a,
          source,
          description: description || '',
          period,
        });
      } else {
        // Use enhanced expense API if we have enhanced features
        if (receiptImage || mechanicalSelectedParts.size > 0) {
          const partsArray = Array.from(mechanicalSelectedParts).map(partName => ({
            partName,
            partCategory: mechanicalCategory,
            cost: 0,
            quantity: 1,
            warrantyPeriod: '',
            notes: ''
          }));

          const payload = {
            vehicleId,
            date,
            amount: a,
            category,
            description: description || '',
            vendor: vendor || '',
            invoiceNumber: invoiceNumber || '',
            isMechanical: true,
            mechanicalCategory,
            partsReplaced: mechanicalSelectedParts.size > 0 ? partsArray : null,
            laborDescription,
            laborCost: laborCost ? toAmount(laborCost) : null,
            partsCost: partsCost ? toAmount(partsCost) : null,
            mechanicName: selectedProvider ? selectedProvider.businessName : null,
            warrantyInfo,
            odometerReading: odometerReading ? parseInt(odometerReading) : null,
            nextServiceDate: formatDate(nextServiceDate),
            receiptImageData: receiptImage ? receiptImage.base64 : null,
            receiptFileName: receiptImage ? receiptImage.fileName : null,
            serviceProviderId: (category === 'maintenance' || category === 'repairs') && selectedProvider ? selectedProvider.id : null,
            serviceProviderName: (category === 'maintenance' || category === 'repairs') && selectedProvider ? selectedProvider.businessName : null,
          };

          await client.post('/VehicleExpenses/enhanced', payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          // Use regular expense API for simple expenses
          await createVehicleExpense({
            id: '00000000-0000-0000-0000-000000000000',
            vehicleId,
            date,
            amount: a,
            category,
            description: description || '',
            vendor: vendor || '',
            invoiceNumber: invoiceNumber || '',
            partFixed: (category === 'Maintenance' || category === 'Repairs') ? Array.from(selectedParts).join(',') : undefined,
            frequentReplacement: (category === 'Maintenance' || category === 'Repairs') ? frequentReplacement : undefined,
            serviceProviderId: (category === 'Maintenance' || category === 'Repairs') && selectedProvider ? selectedProvider.id : undefined,
            serviceProviderName: (category === 'Maintenance' || category === 'Repairs') && showAddProvider && newProviderName ? newProviderName : undefined,
          });
        }
      }

      Alert.alert('Saved', 'Entry recorded successfully');
      navigation.goBack();
    } catch (e) {
      console.warn('Failed to save financial entry', e);
      Alert.alert('Error', 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  function fmtDate(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString();
  }

  const renderCategoryGrid = () => {
    return (
      <Modal transparent animationType="slide" visible={showCategoryGrid} onRequestClose={() => setShowCategoryGrid(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.categoryModal, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCategoryGrid(false)}>
                <Text style={[styles.modalCancel, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Category</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView style={styles.categoryGrid}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: c.background, borderColor: c.border },
                    category === cat.id && { borderColor: cat.color, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    setShowCategoryGrid(false);
                  }}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon} size={24} color={cat.color} />
                  </View>
                  <Text style={[styles.categoryName, { color: c.text }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderPartFixedGrid = () => {
    return (
      <Modal transparent animationType="slide" visible={showPartFixedGrid} onRequestClose={() => setShowPartFixedGrid(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.categoryModal, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPartFixedGrid(false)}>
                <Text style={[styles.modalCancel, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Parts Fixed/Replaced</Text>
              <TouchableOpacity onPress={() => setShowPartFixedGrid(false)}>
                <Text style={[styles.modalCancel, { color: c.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryGrid}>
              {PART_FIXED_OPTIONS.map((part) => (
                <TouchableOpacity
                  key={part.id}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: c.background, borderColor: c.border },
                    selectedParts.has(part.id) && { borderColor: '#F59E0B', borderWidth: 2 }
                  ]}
                  onPress={() => {
                    const newSelectedParts = new Set(selectedParts);
                    if (newSelectedParts.has(part.id)) {
                      newSelectedParts.delete(part.id);
                      // Clear other part description if "other" is being deselected
                      if (part.id === 'other') {
                        setOtherPartDescription('');
                      }
                    } else {
                      newSelectedParts.add(part.id);
                      // Clear other part description when switching to a non-"other" part
                      if (part.id !== 'other') {
                        setOtherPartDescription('');
                      }
                    }
                    setSelectedParts(newSelectedParts);
                  }}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="build" size={24} color="#F59E0B" />
                  </View>
                  <Text style={[styles.categoryName, { color: c.text }]}>{part.name}</Text>
                  {selectedParts.has(part.id) && (
                    <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Vehicle {reg ? `(${reg})` : ''}</Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, entryType === 'expense' && styles.toggleBtnActive]}
          onPress={() => setEntryType('expense')}
          disabled={saving}
        >
          <Text style={[styles.toggleText, entryType === 'expense' && styles.toggleTextActive]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, entryType === 'earning' && styles.toggleBtnActive]}
          onPress={() => setEntryType('earning')}
          disabled={saving}
        >
          <Text style={[styles.toggleText, entryType === 'earning' && styles.toggleTextActive]}>Earning</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Date</Text>
      {Platform.OS === 'web' ? (
        <View style={{ position: 'relative' }}>
          <View style={[styles.dateBtn, { pointerEvents: 'none' }]}>
            <Text style={styles.dateBtnText}>{date}</Text>
            <Text style={styles.dateIcon}>📅</Text>
          </View>
          <input
            type="date"
            value={date}
            onChange={e => {
              const d = new Date(e.target.value + 'T00:00:00');
              if (!isNaN(d.getTime())) setDateObj(d);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
            }}
          />
        </View>
      ) : (
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateBtnText}>{date}</Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setShowPicker(false);
            if (selected) setDateObj(selected);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showPicker} onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.modalAction, { color: c.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.modalAction, { color: c.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="spinner"
                onChange={(_, selected) => { if (selected) setDateObj(selected); }}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </Modal>
      )}

      <Text style={styles.label}>Amount</Text>
      <TextInput value={amount} onChangeText={setAmount} style={styles.input} placeholder="0.00" placeholderTextColor={c.textMuted} keyboardType="decimal-pad" />

      {entryType === 'earning' ? (
        <View>
          <Text style={styles.label}>Source</Text>
          <TextInput value={source} onChangeText={setSource} style={styles.input} placeholder="Trip / Rental / Delivery" placeholderTextColor={c.textMuted} />

          <Text style={styles.label}>Period</Text>
          <TextInput value={period} onChangeText={setPeriod} style={styles.input} placeholder="Daily / Weekly / Monthly" placeholderTextColor={c.textMuted} />
        </View>
      ) : (
        <View>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={[styles.categorySelector, { backgroundColor: c.background, borderColor: c.border }]}
            onPress={() => setShowCategoryGrid(true)}
          >
            {category ? (
              <View style={styles.selectedCategory}>
                <View style={[styles.categoryIcon, { backgroundColor: EXPENSE_CATEGORIES.find(cat => cat.id === category)?.color + '20' }]}>
                  <Ionicons name={EXPENSE_CATEGORIES.find(cat => cat.id === category)?.icon} size={20} color={EXPENSE_CATEGORIES.find(cat => cat.id === category)?.color} />
                </View>
                <Text style={[styles.selectedCategoryText, { color: c.text }]}>
                  {EXPENSE_CATEGORIES.find(cat => cat.id === category)?.name || 'Select category'}
                </Text>
              </View>
            ) : (
              <Text style={[styles.placeholderText, { color: c.textMuted }]}>Select category</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
          </TouchableOpacity>

          {(category === 'maintenance' || category === 'repairs') && (
            <View>
              <Text style={styles.label}>Parts Fixed/Replaced</Text>
              <TouchableOpacity
                style={[styles.categorySelector, { backgroundColor: c.background, borderColor: c.border }]}
                onPress={() => setShowPartFixedGrid(true)}
              >
                {selectedParts.size > 0 ? (
                  <View style={styles.selectedCategory}>
                    <View style={[styles.categoryIcon, { backgroundColor: '#F59E0B20' }]}>
                      <Ionicons name="build" size={20} color="#F59E0B" />
                    </View>
                    <Text style={[styles.selectedCategoryText, { color: c.text }]}>
                      {selectedParts.size === 1 
                        ? PART_FIXED_OPTIONS.find(part => part.id === Array.from(selectedParts)[0])?.name || 'Select parts'
                        : `${selectedParts.size} parts selected`
                      }
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.placeholderText, { color: c.textMuted }]}>Select parts fixed/replaced</Text>
                )}
                <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
              </TouchableOpacity>

              {selectedParts.size > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {Array.from(selectedParts).map(partId => {
                    const part = PART_FIXED_OPTIONS.find(p => p.id === partId);
                    return part ? (
                      <View key={partId} style={[styles.partChip, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
                        <Text style={[styles.partChipText, { color: '#F59E0B' }]}>{part.name}</Text>
                        <TouchableOpacity onPress={() => {
                          const newSelectedParts = new Set(selectedParts);
                          newSelectedParts.delete(partId);
                          if (partId === 'other') {
                            setOtherPartDescription('');
                          }
                          setSelectedParts(newSelectedParts);
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
                  <Text style={styles.label}>Specify Part</Text>
                  <TextInput
                    value={otherPartDescription}
                    onChangeText={setOtherPartDescription}
                    style={styles.input}
                    placeholder="Please specify the part fixed/replaced..."
                    placeholderTextColor={c.textMuted}
                  />
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setFrequentReplacement(v => !v)} style={{ marginRight: 8 }}>
                  <Ionicons name={frequentReplacement ? 'checkbox' : 'square-outline'} size={22} color={frequentReplacement ? c.primary : c.textMuted} />
                </TouchableOpacity>
                <Text style={{ color: c.text }}>Frequent replacement?</Text>
              </View>
              <Text style={styles.label}>Service Provider</Text>
              {loadingProviders ? (
                <ActivityIndicator color={c.primary} />
              ) : serviceProviders.length === 0 ? (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: c.textMuted, fontSize: 14, fontStyle: 'italic', marginBottom: 8 }}>{"No service providers yet"}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      value={newProviderName}
                      onChangeText={setNewProviderName}
                      placeholder="New Provider Name"
                      placeholderTextColor={c.textMuted}
                    />
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
                          style={[styles.chip, selectedProvider && selectedProvider.id === sp.id && styles.chipOn]}
                          onPress={() => { setSelectedProvider(sp); setShowAddProvider(false); }}
                        >
                          <Text style={[styles.chipTxt, selectedProvider && selectedProvider.id === sp.id && styles.chipTxtOn]}>{sp.businessName}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity onPress={() => { setShowAddProvider(true); setSelectedProvider(null); }} style={{ marginLeft: 8 }}>
                      <Ionicons name="add-circle-outline" size={24} color={c.primary} />
                    </TouchableOpacity>
                  </View>
                  {showAddProvider && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        value={newProviderName}
                        onChangeText={setNewProviderName}
                        placeholder="New Provider Name"
                        placeholderTextColor={c.textMuted}
                      />
                      <TouchableOpacity onPress={handleAddProvider} style={{ marginLeft: 8 }}>
                        <Ionicons name="checkmark-circle" size={24} color={c.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <Text style={styles.label}>Vendor (optional)</Text>
          <TextInput value={vendor} onChangeText={setVendor} style={styles.input} placeholder="Vendor" placeholderTextColor={c.textMuted} />

          <Text style={styles.label}>Invoice Number (optional)</Text>
          <TextInput value={invoiceNumber} onChangeText={setInvoiceNumber} style={styles.input} placeholder="Invoice #" placeholderTextColor={c.textMuted} />
        </View>
      )}

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor={c.textMuted} multiline />

      {entryType === 'expense' && (
        <View>
          <View style={styles.section}>
            <Text style={styles.label}>Receipt (optional)</Text>
            {receiptImage ? (
              <View style={styles.receiptPreview}>
                <Image source={{ uri: receiptImage.uri }} style={styles.receiptImage} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeReceipt}
                  onPress={() => setReceiptImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.receiptOptions}>
                <TouchableOpacity
                  style={[styles.receiptButton, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={pickReceiptImage}
                >
                  <Ionicons name="image" size={20} color={c.primary} />
                  <Text style={[styles.receiptButtonText, { color: c.text }]}>Choose from Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.receiptButton, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={takeReceiptPhoto}
                >
                  <Ionicons name="camera" size={20} color={c.primary} />
                  <Text style={[styles.receiptButtonText, { color: c.text }]}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {(category === 'maintenance' || category === 'repairs') && (
            <View style={styles.section}>
              <View style={styles.mechanicalContent}>
                <Text style={styles.label}>Mechanical Category</Text>
                <TouchableOpacity 
                  style={[styles.dropdown, { backgroundColor: c.surface, borderColor: c.border }]} 
                  onPress={() => setShowMechanicalCategoryPicker(true)}
                >
                  <Text style={[styles.dropdownText, { color: mechanicalCategory ? c.text : c.textMuted }]}>
                    {mechanicalCategory ? mechanicalCategories.find(cat => cat.Category === mechanicalCategory)?.DisplayName || mechanicalCategory : 'Select mechanical category'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={c.textMuted} />
                </TouchableOpacity>

                {mechanicalCategory && getAvailableParts().length > 0 && (
                  <View style={styles.partsSection}>
                    <Text style={styles.label}>Parts Replaced</Text>
                    {getAvailableParts().map((partName) => (
                      <TouchableOpacity
                        key={partName}
                        style={[styles.partCheckbox, { backgroundColor: c.surface, borderColor: c.border }]}
                        onPress={() => togglePart(partName)}
                      >
                        <View style={[styles.checkbox, { 
                          backgroundColor: mechanicalSelectedParts.has(partName) ? '#10B981' : 'transparent',
                          borderColor: c.border 
                        }]}>
                          {mechanicalSelectedParts.has(partName) && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                        <Text style={[styles.partCheckboxText, { color: c.text }]}>{partName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.label}>Labor Description</Text>
                <TextInput 
                  style={[styles.input, styles.textArea, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]} 
                  value={laborDescription} 
                  onChangeText={setLaborDescription} 
                  placeholder="Description of work performed" 
                  placeholderTextColor={c.textMuted} 
                  multiline 
                />

                <View style={styles.costRow}>
                  <View style={styles.costItem}>
                    <Text style={styles.label}>Labor Cost</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]} 
                      value={laborCost} 
                      onChangeText={setLaborCost} 
                      placeholder="0.00" 
                      placeholderTextColor={c.textMuted} 
                      keyboardType="decimal-pad" 
                    />
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.label}>Parts Cost</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]} 
                      value={partsCost} 
                      onChangeText={setPartsCost} 
                      placeholder="0.00" 
                      placeholderTextColor={c.textMuted} 
                      keyboardType="decimal-pad" 
                    />
                  </View>
                </View>

                <Text style={styles.label}>Odometer Reading</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]} 
                  value={odometerReading} 
                  onChangeText={setOdometerReading} 
                  placeholder="Current odometer reading" 
                  placeholderTextColor={c.textMuted} 
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Warranty Information</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]} 
                  value={warrantyInfo} 
                  onChangeText={setWarrantyInfo} 
                  placeholder="Warranty details for parts/labor" 
                  placeholderTextColor={c.textMuted} 
                />
              </View>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color={c.primaryText} /> : <Text style={styles.btnPrimaryText}>Save</Text>}
      </TouchableOpacity>

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Recent Earnings (Last 10)</Text>
        {loadingHistory ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : recentEarnings.length === 0 ? (
          <Text style={styles.historyEmpty}>No recent earnings recorded.</Text>
        ) : (
          recentEarnings.map((item, idx) => (
            <View key={item.id || idx} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historySource}>{item.source || item.Source || 'Trip'}</Text>
                <Text style={styles.historyDesc} numberOfLines={1}>
                  {item.description || item.Description || item.period || item.Period || ''}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyAmount}>R{Number(item.amount || item.Amount || 0).toFixed(2)}</Text>
                <Text style={styles.historyDate}>{fmtDate(item.date || item.Date)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Recent Expenses (Last 10)</Text>
        {loadingExpenses ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : recentExpenses.length === 0 ? (
          <Text style={styles.historyEmpty}>No recent expenses recorded.</Text>
        ) : (
          recentExpenses.map((item, idx) => (
            <View key={item.id || idx} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historySource}>{item.category || item.Category || 'Expense'}</Text>
                <Text style={styles.historyDesc} numberOfLines={1}>
                  {item.description || item.Description || item.vendor || item.Vendor || ''}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={[styles.historyAmount, { color: c.danger }]}>R{Number(item.amount || item.Amount || 0).toFixed(2)}</Text>
                <Text style={styles.historyDate}>{fmtDate(item.date || item.Date)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {showMechanicalCategoryPicker && (
        <Modal transparent animationType="slide" visible={showMechanicalCategoryPicker} onRequestClose={() => setShowMechanicalCategoryPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowMechanicalCategoryPicker(false)}>
                  <Text style={[styles.modalAction, { color: c.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: c.text }]}>Mechanical Category</Text>
                <TouchableOpacity onPress={() => setShowMechanicalCategoryPicker(false)}>
                  <Text style={[styles.modalAction, { color: c.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerContent}>
                {mechanicalCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.Category}
                    style={[styles.pickerItem, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={() => {
                      handleMechanicalCategoryChange(cat.Category);
                      setShowMechanicalCategoryPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: c.text }]}>{cat.DisplayName}</Text>
                    {mechanicalCategory === cat.Category && (
                      <Ionicons name="checkmark" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {renderCategoryGrid()}
      {renderPartFixedGrid()}
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    title: { fontSize: 16, fontWeight: '900', marginBottom: 12, color: c.text },
    label: { fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 6, color: c.text },
    input: { borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12, backgroundColor: c.surface, color: c.text },
    dateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12, backgroundColor: c.surface },
    dateBtnText: { fontSize: 15, color: c.text, fontWeight: '600' },
    dateIcon: { fontSize: 18 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    modalAction: { fontSize: 15, fontWeight: '600' },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    btnPrimary: { marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary, alignItems: 'center' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900' },
    btnEnhanced: { marginTop: 14, paddingVertical: 16, borderRadius: 12, backgroundColor: '#D4AF37', borderWidth: 1, borderColor: '#D4AF37', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    btnEnhancedText: { color: '#000', fontWeight: '900', fontSize: 14 },
    toggleRow: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: c.border },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: c.text },
    toggleText: { fontWeight: '900', color: c.text },
    toggleTextActive: { color: c.background },
    historySection: { marginTop: 24, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 16 },
    historyTitle: { fontSize: 13, fontWeight: '900', color: c.text, marginBottom: 10 },
    historyEmpty: { fontSize: 13, color: c.textMuted, textAlign: 'center', paddingVertical: 12 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
    historyLeft: { flex: 1, paddingRight: 12 },
    historySource: { fontSize: 14, fontWeight: '700', color: c.text },
    historyDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    historyRight: { alignItems: 'flex-end' },
    historyAmount: { fontSize: 14, fontWeight: '900', color: c.success },
    historyDate: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    
    // Category Dropdown Styles
    categorySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    selectedCategory: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    selectedCategoryText: {
      fontSize: 16,
      fontWeight: '500',
    },
    placeholderText: {
      fontSize: 16,
      color: '#9CA3AF',
    },
    
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    categoryModal: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    modalCancel: {
      fontSize: 16,
      fontWeight: '600',
    },
    categoryGrid: {
      flex: 1,
    },
    categoryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 12,
    },
    
    // Part chip styles
    partChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    partChipText: {
      fontSize: 12,
      fontWeight: '600',
      marginRight: 6,
    },
    
    // Service provider chip styles
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
      marginRight: 8,
    },
    chipOn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipTxt: {
      fontSize: 14,
      fontWeight: '600',
      color: '#475569',
    },
    chipTxtOn: {
      color: '#fff',
    },
  });
}
