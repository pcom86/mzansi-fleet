import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform, ScrollView, FlatList, Image, Switch,
  KeyboardAvoidingView, Pressable, Keyboard, Dimensions, SafeAreaView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import client from '../api/client';
import { getServiceProvidersByServiceType } from '../api/serviceProviderProfiles';

const { width: screenWidth } = Dimensions.get('window');

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

const PART_REPLACED_OPTIONS = [
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

export default function EnhancedExpenseCaptureScreen({ route, navigation }) {
  const { vehicle } = route?.params || {};
  const vehicleId = vehicle?.id || vehicle?.Id || vehicle?.vehicleId || null;
  const reg = vehicle?.registration || vehicle?.Registration || '';
  
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const c = theme.colors;

  // Basic expense fields
  const [dateObj, setDateObj] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const date = formatDate(dateObj);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Part replaced fields
  const [partReplaced, setPartReplaced] = useState('');
  const [otherPartDescription, setOtherPartDescription] = useState('');

  // Receipt fields
  const [receiptImage, setReceiptImage] = useState(null);
  const [saving, setSaving] = useState(false);

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  const [showPartReplacedGrid, setShowPartReplacedGrid] = useState(false);

  // Service providers state
  const [serviceProviders, setServiceProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Add Expense',
      headerStyle: { backgroundColor: '#1F2937' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '600' },
    });
  }, [navigation]);

  // Load service providers when category changes (filter by service type)
  useEffect(() => {
    const serviceType = CATEGORY_TO_SERVICE_TYPE[category];
    if (serviceType || ['maintenance', 'repairs', 'towing', 'tires', 'electrical', 'bodywork'].includes(category)) {
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
      setServiceProviders([]);
      setSelectedProvider(null);
    }
  }, [category]);

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

  const validate = () => {
    if (!vehicleId) {
      Alert.alert('Error', 'Vehicle is missing.');
      return false;
    }
    if (!date?.trim()) {
      Alert.alert('Validation', 'Date is required.');
      return false;
    }
    if (!amount?.trim()) {
      Alert.alert('Validation', 'Amount is required.');
      return false;
    }
    if (!category?.trim()) {
      Alert.alert('Validation', 'Category is required.');
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      const payload = {
        vehicleId,
        date,
        amount: toAmount(amount),
        category,
        description,
        vendor,
        invoiceNumber,
        isMechanical: false,
        receiptImageData: receiptImage ? receiptImage.base64 : null,
        receiptFileName: receiptImage ? receiptImage.fileName : null,
        partReplaced: partReplaced || null,
        otherPartDescription: partReplaced === 'other' ? otherPartDescription : null,
      };

      const res = await client.post('/VehicleExpenses/enhanced', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Success', 'Expense saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Save expense error:', e);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = ['Basic Info', 'Details', 'Review'];
    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={step} style={styles.stepItem}>
            <View style={[
              styles.stepDot, 
              { backgroundColor: currentStep > index + 1 ? '#10B981' : currentStep === index + 1 ? '#F59E0B' : '#E5E7EB' }
            ]}>
              <Text style={[
                styles.stepDotText,
                { color: currentStep > index + 1 || currentStep === index + 1 ? '#fff' : '#9CA3AF' }
              ]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[
              styles.stepText,
              { color: currentStep > index + 1 || currentStep === index + 1 ? '#1F2937' : '#9CA3AF' }
            ]}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    );
  };

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

  const renderPartReplacedGrid = () => {
    return (
      <Modal transparent animationType="slide" visible={showPartReplacedGrid} onRequestClose={() => setShowPartReplacedGrid(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.categoryModal, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPartReplacedGrid(false)}>
                <Text style={[styles.modalCancel, { color: c.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Part Replaced</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView style={styles.categoryGrid}>
              {PART_REPLACED_OPTIONS.map((part) => (
                <TouchableOpacity
                  key={part.id}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: c.background, borderColor: c.border },
                    partReplaced === part.id && { borderColor: '#F59E0B', borderWidth: 2 }
                  ]}
                  onPress={() => {
                    setPartReplaced(part.id);
                    setShowPartReplacedGrid(false);
                    // Clear other part description when switching away from "other"
                    if (part.id !== 'other') {
                      setOtherPartDescription('');
                    }
                  }}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="build" size={24} color="#F59E0B" />
                  </View>
                  <Text style={[styles.categoryName, { color: c.text }]}>{part.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderStep1 = () => {
    const selectedCategory = EXPENSE_CATEGORIES.find(cat => cat.id === category);
    
    return (
      <View style={styles.stepContent}>
        <View style={styles.vehicleHeader}>
          <View style={[styles.vehicleBadge, { backgroundColor: '#1F2937' }]}>
            <Ionicons name="car" size={20} color="#fff" />
            <Text style={styles.vehicleText}>{reg}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Amount</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>R</Text>
            <TextInput
              style={[styles.amountInput, { color: c.text }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={c.textMuted}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category</Text>
          <TouchableOpacity
            style={[styles.categorySelector, { backgroundColor: c.background, borderColor: c.border }]}
            onPress={() => setShowCategoryGrid(true)}
          >
            {selectedCategory ? (
              <View style={styles.selectedCategory}>
                <View style={[styles.categoryIcon, { backgroundColor: selectedCategory.color + '20' }]}>
                  <Ionicons name={selectedCategory.icon} size={20} color={selectedCategory.color} />
                </View>
                <Text style={[styles.selectedCategoryText, { color: c.text }]}>{selectedCategory.name}</Text>
              </View>
            ) : (
              <Text style={[styles.placeholderText, { color: c.textMuted }]}>Select category</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Date</Text>
          {Platform.OS === 'web' ? (
            <View style={[styles.dateSelector, { backgroundColor: c.background, borderColor: c.border }]}>
              <Ionicons name="calendar" size={20} color={c.primary} />
              <input
                type="date"
                value={date}
                onChange={e => {
                  const d = new Date(e.target.value + 'T00:00:00');
                  if (!isNaN(d.getTime())) setDateObj(d);
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  color: c.text,
                  background: 'transparent'
                }}
              />
              <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.dateSelector, { backgroundColor: c.background, borderColor: c.border }]}
              onPress={() => setShowPicker(true)}
            >
              <Ionicons name="calendar" size={20} color={c.primary} />
              <Text style={[styles.dateText, { color: c.text }]}>{date}</Text>
              <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Part Replaced</Text>
          <TouchableOpacity
            style={[styles.categorySelector, { backgroundColor: c.background, borderColor: c.border }]}
            onPress={() => setShowPartReplacedGrid(true)}
          >
            {partReplaced ? (
              <View style={styles.selectedCategory}>
                <View style={[styles.categoryIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="build" size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.selectedCategoryText, { color: c.text }]}>
                  {PART_REPLACED_OPTIONS.find(part => part.id === partReplaced)?.name || 'Select part'}
                </Text>
              </View>
            ) : (
              <Text style={[styles.placeholderText, { color: c.textMuted }]}>Select part replaced</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        {partReplaced === 'other' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Specify Part</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              value={otherPartDescription}
              onChangeText={setOtherPartDescription}
              placeholder="Please specify the part replaced..."
              placeholderTextColor={c.textMuted}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: '#F59E0B' }]}
          onPress={() => setCurrentStep(2)}
        >
          <Text style={styles.nextButtonText}>Next Step</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep2 = () => {
    return (
      <View style={styles.stepContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receipt</Text>
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
                style={[styles.receiptButton, { backgroundColor: c.background, borderColor: c.border }]}
                onPress={pickReceiptImage}
              >
                <Ionicons name="image" size={24} color={c.primary} />
                <Text style={[styles.receiptButtonText, { color: c.text }]}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.receiptButton, { backgroundColor: c.background, borderColor: c.border }]}
                onPress={takeReceiptPhoto}
              >
                <Ionicons name="camera" size={24} color={c.primary} />
                <Text style={[styles.receiptButtonText, { color: c.text }]}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vendor</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            value={vendor}
            onChangeText={setVendor}
            placeholder="Where did you pay?"
            placeholderTextColor={c.textMuted}
          />

          {/* Service Provider Selection - shown for relevant categories */}
          {(category === 'maintenance' || category === 'repairs' || category === 'towing' ||
            category === 'tires' || category === 'electrical' || category === 'bodywork') && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.label, { color: c.textMuted, marginBottom: 8 }]}>
                Service Provider ({CATEGORY_TO_SERVICE_TYPE[category] || 'General'})
              </Text>
              {loadingProviders ? (
                <ActivityIndicator color={c.primary} />
              ) : serviceProviders.length === 0 ? (
                <Text style={{ color: c.textMuted, fontStyle: 'italic' }}>
                  No service providers found for this category
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {serviceProviders.map(sp => (
                    <TouchableOpacity
                      key={String(sp.id)}
                      style={[
                        styles.providerChip,
                        { backgroundColor: selectedProvider?.id === sp.id ? c.primary : c.surface, borderColor: c.border },
                      ]}
                      onPress={() => {
                        setSelectedProvider(sp);
                        setVendor(sp.businessName);
                      }}
                    >
                      <Text
                        style={[
                          styles.providerChipText,
                          { color: selectedProvider?.id === sp.id ? '#fff' : c.text },
                        ]}
                      >
                        {sp.businessName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add notes about this expense..."
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invoice Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder="Optional"
            placeholderTextColor={c.textMuted}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setCurrentStep(1)}
          >
            <Ionicons name="arrow-back" size={20} color={c.text} />
            <Text style={[styles.backButtonText, { color: c.text }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.nextButtonText}>Review</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep3 = () => {
    const selectedCategory = EXPENSE_CATEGORIES.find(cat => cat.id === category);
    const totalAmount = toAmount(amount) || 0;
    
    return (
      <View style={styles.stepContent}>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Expense Summary</Text>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Vehicle</Text>
            <Text style={styles.reviewValue}>{reg}</Text>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Amount</Text>
            <Text style={styles.reviewAmount}>R{totalAmount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Category</Text>
            <View style={styles.reviewCategory}>
              <Ionicons name={selectedCategory?.icon} size={16} color={selectedCategory?.color} />
              <Text style={styles.reviewCategoryText}>{selectedCategory?.name}</Text>
            </View>
          </View>
          
          {partReplaced && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Part Replaced</Text>
              <View style={styles.reviewCategory}>
                <Ionicons name="build" size={16} color="#F59E0B" />
                <Text style={styles.reviewCategoryText}>
                  {PART_REPLACED_OPTIONS.find(part => part.id === partReplaced)?.name || 'Unknown'}
                </Text>
              </View>
            </View>
          )}
          
          {partReplaced === 'other' && otherPartDescription && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Part Description</Text>
              <Text style={styles.reviewValue}>{otherPartDescription}</Text>
            </View>
          )}
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Date</Text>
            <Text style={styles.reviewValue}>{date}</Text>
          </View>
          
          {vendor && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Vendor</Text>
              <Text style={styles.reviewValue}>{vendor}</Text>
            </View>
          )}
          
          {description && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Description</Text>
              <Text style={styles.reviewValue}>{description}</Text>
            </View>
          )}
          
          {receiptImage && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Receipt</Text>
              <View style={styles.reviewReceipt}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.reviewReceiptText}>Receipt attached</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: saving ? '#9CA3AF' : '#10B981' }]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Expense</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: 'transparent' }]}
          onPress={() => setCurrentStep(2)}
        >
          <Ionicons name="arrow-back" size={20} color={c.textMuted} />
          <Text style={[styles.backButtonText, { color: c.textMuted }]}>Edit Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor: '#F9FAFB' }]}>
          {renderStepIndicator()}
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </ScrollView>

          {/* Date Picker Modal */}
          {showPicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={dateObj}
              mode="date"
              display="default"
              onChange={(event, selected) => {
                setShowPicker(false);
                if (selected) setDateObj(selected);
              }}
            />
          )}

          {/* Category Grid Modal */}
          {renderCategoryGrid()}

          {/* Part Replaced Grid Modal */}
          {renderPartReplacedGrid()}
        </SafeAreaView>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Step Content
  stepContent: {
    padding: 20,
  },
  
  // Vehicle Header
  vehicleHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  vehicleText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  
  // Amount Input
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  
  // Category Selector
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
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
  
  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Buttons
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Service Provider Chips
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  providerChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  // Receipt
  receiptOptions: {
    gap: 12,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  receiptButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  receiptPreview: {
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeReceipt: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  
  // Inputs
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  
  // Review
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reviewLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  reviewAmount: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
  },
  reviewCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCategoryText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewReceipt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewReceiptText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Modals
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
});
