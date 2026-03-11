import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { client } from '../api/client';

const GOLD = '#FFD700';
const GREEN = '#28a745';
const RED = '#dc3545';
const BLUE = '#007bff';

export default function MarshalOnboardingScreen({ navigation, route }) {
  const { colors: c } = useTheme();
  const { taxiRankId, adminId } = route.params || {};
  
  // Form state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingAssociations, setLoadingAssociations] = useState(false);
  const [loadingRanks, setLoadingRanks] = useState(false);
  const [associations, setAssociations] = useState([]);
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [selectedAssociation, setSelectedAssociation] = useState(null);
  const [selectedTaxiRank, setSelectedTaxiRank] = useState(null);
  const [associationModalVisible, setAssociationModalVisible] = useState(false);
  const [rankModalVisible, setRankModalVisible] = useState(false);
  
  // Personal Information
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  
  // Marshal Information
  const [marshalCode, setMarshalCode] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [experience, setExperience] = useState('');
  
  // Verification
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  
  // Permissions
  const [permissions, setPermissions] = useState({
    canCaptureTrips: true,
    canViewSchedules: true,
    canReceiveMessages: true,
    canSendMessages: true,
    canManageVehicles: false,
    canManageDrivers: false,
    canManageSchedules: false,
    canViewReports: false,
    canDeleteData: false
  });

  useEffect(() => {
    // Auto-generate marshal code
    if (!marshalCode && fullName) {
      const code = fullName.toUpperCase().replace(/\s/g, '').substring(0, 3) + Math.floor(Math.random() * 1000);
      setMarshalCode(code);
    }
    
    // Load all taxi ranks on mount
    loadAllTaxiRanks();
    
    // Pre-select taxi rank if provided
    if (taxiRankId) {
      setSelectedTaxiRank(taxiRankId);
      loadAssociationsForRank(taxiRankId);
    }
  }, [fullName, taxiRankId]);

  const loadAllTaxiRanks = async () => {
    setLoadingRanks(true);
    try {
      const response = await client.get('/TaxiRanks');
      if (response.data && Array.isArray(response.data)) {
        setTaxiRanks(response.data);
      } else {
        setTaxiRanks([]);
      }
    } catch (error) {
      console.error('Load taxi ranks error:', error);
      Alert.alert('Error', 'Failed to load taxi ranks. Please check your connection.');
      setTaxiRanks([]);
    } finally {
      setLoadingRanks(false);
    }
  };

  const loadAssociationsForRank = async (rankId) => {
    if (!rankId) {
      setAssociations([]);
      return;
    }
    setLoadingAssociations(true);
    try {
      const response = await client.get(`/TaxiRanks/${rankId}/associations`);
      const data = response.data || [];
      // Map associations to get the tenant info
      const mapped = Array.isArray(data) ? data.map(a => ({
        id: a.tenantId || a.tenant?.id,
        name: a.tenant?.name || 'Unknown Association',
        code: a.tenant?.code,
        isPrimary: a.isPrimary,
      })) : [];
      setAssociations(mapped);
    } catch (error) {
      console.error('Load associations error:', error);
      Alert.alert('Error', 'Failed to load associations for this taxi rank.');
      setAssociations([]);
    } finally {
      setLoadingAssociations(false);
    }
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!fullName.trim()) {
          Alert.alert('Error', 'Please enter your full name');
          return false;
        }
        if (!idNumber.trim() || idNumber.length < 8) {
          Alert.alert('Error', 'Please enter a valid ID number');
          return false;
        }
        if (!phoneNumber.trim() || phoneNumber.length < 10) {
          Alert.alert('Error', 'Please enter a valid phone number');
          return false;
        }
        if (!selectedTaxiRank) {
          Alert.alert('Error', 'Please select a taxi rank');
          return false;
        }
        if (!selectedAssociation) {
          Alert.alert('Error', 'Please select an association for this taxi rank');
          return false;
        }
        return true;
        
      case 2:
        if (!marshalCode.trim()) {
          Alert.alert('Error', 'Marshal code is required');
          return false;
        }
        if (!emergencyContact.trim()) {
          Alert.alert('Error', 'Please enter emergency contact');
          return false;
        }
        return true;
        
      case 3:
        if (!isVerified) {
          Alert.alert('Error', 'Please verify your phone number first');
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    try {
      // Simulate sending verification code
      await new Promise(resolve => setTimeout(resolve, 2000));
      Alert.alert('Success', `Verification code sent to ${phoneNumber}`);
      setStep(3);
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode === '123456') { // Demo code
      setIsVerified(true);
      Alert.alert('Success', 'Phone number verified successfully!');
      setStep(4);
    } else {
      Alert.alert('Error', 'Invalid verification code. Try 123456 for demo');
    }
  };

  const createMarshalAccount = async () => {
    setLoading(true);
    try {
      const marshalData = {
        fullName,
        idNumber,
        phoneNumber,
        email,
        marshalCode,
        emergencyContact,
        experience,
        tenantId: selectedAssociation, // Add association/tenant ID
        taxiRankId: selectedTaxiRank,
        permissions,
        status: 'Active',
        createdBy: adminId,
        createdAt: new Date().toISOString()
      };

      console.log('Creating marshal account:', marshalData);
      
      // Create marshal account
      const response = await client.post('/QueueMarshals', marshalData);
      const marshal = response.data;

      // Store marshal session
      await AsyncStorage.setItem('marshalSession', JSON.stringify({
        id: marshal.id,
        fullName: marshal.fullName,
        marshalCode: marshal.marshalCode,
        taxiRankId: marshal.taxiRankId,
        permissions: marshal.permissions
      }));

      Alert.alert(
        'Success!',
        `Marshal account created successfully!\n\nMarshal Code: ${marshalCode}\nAssociation: ${getSelectedAssociationName()}\nTaxi Rank: ${getSelectedTaxiRankName()}\nYou can now log in with these credentials.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('MarshalDashboard', { marshal })
          }
        ]
      );
    } catch (error) {
      console.error('Create marshal error:', error);
      Alert.alert('Error', 'Failed to create marshal account');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTaxiRankName = () => {
    if (!selectedTaxiRank) return 'Select Taxi Rank';
    const rank = taxiRanks.find(r => r.id === selectedTaxiRank);
    return rank ? rank.name : 'Select Taxi Rank';
  };

  const getSelectedAssociationName = () => {
    if (!selectedAssociation) return 'Select Association';
    const association = associations.find(a => a.id === selectedAssociation);
    return association ? association.name : 'Select Association';
  };

  // Handle taxi rank selection → load associations for that rank
  const handleTaxiRankSelect = (rankId) => {
    setSelectedTaxiRank(rankId);
    setSelectedAssociation(null); // Reset association when rank changes
    setRankModalVisible(false);
    loadAssociationsForRank(rankId);
  };

  // Handle association selection
  const handleAssociationSelect = (associationId) => {
    setSelectedAssociation(associationId);
    setAssociationModalVisible(false);
  };

  const nextStep = () => {
    if (validateStep()) {
      if (step === 2) {
        sendVerificationCode();
      } else {
        setStep(step + 1);
      }
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="person-outline" size={32} color={GOLD} />
              <Text style={[styles.stepTitle, { color: c.text }]}>Personal Information</Text>
              <Text style={[styles.stepSubtitle, { color: c.textMuted }]}>Tell us about yourself</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>Full Name *</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Enter your full name"
                placeholderTextColor={c.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>ID Number *</Text>
              <TextInput
                value={idNumber}
                onChangeText={setIdNumber}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Enter your ID number"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                maxLength={13}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>Phone Number *</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Enter your phone number"
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Enter your email (optional)"
                placeholderTextColor={c.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>Taxi Rank *</Text>
              <TouchableOpacity
                style={[styles.input, styles.dropdownInput, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => setRankModalVisible(true)}
                disabled={loadingRanks}
              >
                <View style={styles.dropdownContent}>
                  {loadingRanks ? (
                    <ActivityIndicator size="small" color={c.textMuted} />
                  ) : (
                    <Ionicons name="location-outline" size={20} color={c.textMuted} />
                  )}
                  <Text style={[styles.dropdownText, { color: selectedTaxiRank ? c.text : c.textMuted }]}>
                    {loadingRanks ? 'Loading taxi ranks...' : getSelectedTaxiRankName()}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={c.textMuted} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>Association *</Text>
              <TouchableOpacity
                style={[styles.input, styles.dropdownInput, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => selectedTaxiRank ? setAssociationModalVisible(true) : null}
                disabled={!selectedTaxiRank || loadingAssociations}
              >
                <View style={styles.dropdownContent}>
                  {loadingAssociations ? (
                    <ActivityIndicator size="small" color={c.textMuted} />
                  ) : (
                    <Ionicons name="business-outline" size={20} color={c.textMuted} />
                  )}
                  <Text style={[styles.dropdownText, { color: selectedAssociation ? c.text : c.textMuted }]}>
                    {!selectedTaxiRank ? 'Select a taxi rank first' : 
                     loadingAssociations ? 'Loading associations...' : 
                     getSelectedAssociationName()}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={c.textMuted} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="shield-outline" size={32} color={GOLD} />
              <Text style={[styles.stepTitle, { color: c.text }]}>Marshal Information</Text>
              <Text style={[styles.stepSubtitle, { color: c.textMuted }]}>Set up your marshal profile</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>Marshal Code *</Text>
              <TextInput
                value={marshalCode}
                onChangeText={setMarshalCode}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Auto-generated or enter custom"
                placeholderTextColor={c.textMuted}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>Emergency Contact *</Text>
              <TextInput
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Emergency contact name and number"
                placeholderTextColor={c.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>Experience</Text>
              <TextInput
                value={experience}
                onChangeText={setExperience}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }, { minHeight: 80 }]}
                placeholder="Tell us about your experience (optional)"
                placeholderTextColor={c.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.permissionsPreview}>
              <Text style={[styles.permissionsTitle, { color: c.text }]}>Your Permissions:</Text>
              <View style={styles.permissionsList}>
                <View style={styles.permissionItem}>
                  <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                  <Text style={[styles.permissionText, { color: c.text }]}>Capture Trips</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                  <Text style={[styles.permissionText, { color: c.text }]}>View Schedules</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                  <Text style={[styles.permissionText, { color: c.text }]}>Receive Messages</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                  <Text style={[styles.permissionText, { color: c.text }]}>Send Messages</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Ionicons name="close-circle" size={16} color={RED} />
                  <Text style={[styles.permissionText, { color: c.textMuted }]}>Manage Vehicles</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Ionicons name="close-circle" size={16} color={RED} />
                  <Text style={[styles.permissionText, { color: c.textMuted }]}>Manage Drivers</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="phone-portrait-outline" size={32} color={GOLD} />
              <Text style={[styles.stepTitle, { color: c.text }]}>Phone Verification</Text>
              <Text style={[styles.stepSubtitle, { color: c.textMuted }]}>Verify your phone number</Text>
            </View>

            <View style={styles.verificationInfo}>
              <Ionicons name="information-circle-outline" size={24} color={BLUE} />
              <Text style={[styles.verificationText, { color: c.text }]}>
                We've sent a 6-digit verification code to {phoneNumber}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textMuted }]}>Verification Code</Text>
              <TextInput
                value={verificationCode}
                onChangeText={setVerificationCode}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Enter 6-digit code"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                maxLength={6}
                textAlign="center"
                fontSize={20}
                letterSpacing={8}
              />
            </View>

            <TouchableOpacity
              style={[styles.resendButton, { borderColor: c.border }]}
              onPress={sendVerificationCode}
              disabled={loading}
            >
              <Text style={[styles.resendText, { color: c.text }]}>Resend Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.verifyButton, { backgroundColor: GOLD }]}
              onPress={verifyCode}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={[styles.verifyButtonText, { color: '#000' }]}>Verify Phone</Text>
              )}
            </TouchableOpacity>

            <View style={styles.demoNote}>
              <Text style={[styles.demoText, { color: c.textMuted }]}>
                Demo: Use code "123456" to verify
              </Text>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Ionicons name="checkmark-circle-outline" size={32} color={GREEN} />
              <Text style={[styles.stepTitle, { color: c.text }]}>Review & Complete</Text>
              <Text style={[styles.stepSubtitle, { color: c.textMuted }]}>Review your information</Text>
            </View>

            <View style={styles.reviewCard}>
              <Text style={[styles.reviewTitle, { color: c.text }]}>Personal Information</Text>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: c.textMuted }]}>Name:</Text>
                <Text style={[styles.reviewValue, { color: c.text }]}>{fullName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: c.textMuted }]}>ID:</Text>
                <Text style={[styles.reviewValue, { color: c.text }]}>{idNumber}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: c.textMuted }]}>Phone:</Text>
                <Text style={[styles.reviewValue, { color: c.text }]}>{phoneNumber}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: c.textMuted }]}>Taxi Rank:</Text>
                <Text style={[styles.reviewValue, { color: c.text }]}>{getSelectedTaxiRankName()}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: c.textMuted }]}>Association:</Text>
                <Text style={[styles.reviewValue, { color: c.text }]}>{getSelectedAssociationName()}</Text>
              </View>
            </View>

            <View style={styles.reviewCard}>
              <Text style={[styles.reviewTitle, { color: c.text }]}>Marshal Details</Text>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: c.textMuted }]}>Marshal Code:</Text>
                <Text style={[styles.reviewValue, { color: c.text, fontWeight: 'bold' }]}>{marshalCode}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: c.textMuted }]}>Emergency Contact:</Text>
                <Text style={[styles.reviewValue, { color: c.text }]}>{emergencyContact}</Text>
              </View>
            </View>

            <View style={styles.reviewCard}>
              <Text style={[styles.reviewTitle, { color: c.text }]}>Account Status</Text>
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={[styles.statusText, { color: GREEN }]}>Phone Verified</Text>
              </View>
              <View style={styles.statusRow}>
                <Ionicons name="shield-checkmark" size={16} color={GOLD} />
                <Text style={[styles.statusText, { color: c.text }]}>Queue Marshal Role</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: GOLD }]}
              onPress={createMarshalAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={[styles.completeButtonText, { color: '#000' }]}>Create Marshal Account</Text>
              )}
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marshal Onboarding</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((stepNumber) => (
          <View key={stepNumber} style={styles.progressStep}>
            <View style={[
              styles.progressDot,
              { backgroundColor: stepNumber <= step ? GOLD : c.border }
            ]}>
              <Text style={[
                styles.progressDotText,
                { color: stepNumber <= step ? '#000' : c.textMuted }
              ]}>
                {stepNumber}
              </Text>
            </View>
            {stepNumber < 4 && (
              <View style={[
                styles.progressLine,
                { backgroundColor: stepNumber < step ? GOLD : c.border }
              ]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      {/* Association Selection Modal */}
      <Modal visible={associationModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Association</Text>
              <TouchableOpacity onPress={() => setAssociationModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {loadingAssociations ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color={GOLD} />
                  <Text style={[styles.emptyStateText, { color: c.textMuted }]}>Loading associations...</Text>
                </View>
              ) : associations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="business-outline" size={48} color={c.textMuted} />
                  <Text style={[styles.emptyStateText, { color: c.textMuted }]}>
                    No associations linked to this taxi rank
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: c.textMuted }]}>
                    This taxi rank has no associations. Please contact your administrator.
                  </Text>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: GOLD }]}
                    onPress={() => loadAssociationsForRank(selectedTaxiRank)}
                  >
                    <Text style={[styles.retryButtonText, { color: '#000' }]}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                associations.map((association) => (
                  <TouchableOpacity
                    key={association.id}
                    style={[
                      styles.optionItem,
                      { backgroundColor: c.surface, borderColor: c.border },
                      selectedAssociation === association.id && { backgroundColor: 'rgba(255,215,0,0.1)', borderColor: GOLD }
                    ]}
                    onPress={() => handleAssociationSelect(association.id)}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={[styles.optionTitle, { color: c.text }]}>{association.name}</Text>
                      {association.code && (
                        <Text style={[styles.optionCode, { color: GOLD }]}>{association.code}</Text>
                      )}
                    </View>
                    {association.description && (
                      <Text style={[styles.optionSubtitle, { color: c.textMuted }]} numberOfLines={2}>
                        {association.description}
                      </Text>
                    )}
                    {association.type && (
                      <View style={styles.statusBadge}>
                        <Text style={[styles.statusText, { color: c.text }]}>
                          {association.type}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Taxi Rank Selection Modal */}
      <Modal visible={rankModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Taxi Rank</Text>
              <TouchableOpacity onPress={() => setRankModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {taxiRanks.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="location-outline" size={48} color={c.textMuted} />
                  <Text style={[styles.emptyStateText, { color: c.textMuted }]}>
                    No taxi ranks available
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: c.textMuted }]}>
                    Please contact your administrator to add taxi ranks
                  </Text>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: GOLD }]}
                    onPress={loadAllTaxiRanks}
                  >
                    <Text style={[styles.retryButtonText, { color: '#000' }]}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                taxiRanks.map((rank) => (
                  <TouchableOpacity
                    key={rank.id}
                    style={[
                      styles.optionItem,
                      { backgroundColor: c.surface, borderColor: c.border },
                      selectedTaxiRank === rank.id && { backgroundColor: 'rgba(255,215,0,0.1)', borderColor: GOLD }
                    ]}
                    onPress={() => handleTaxiRankSelect(rank.id)}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={[styles.optionTitle, { color: c.text }]}>{rank.name}</Text>
                      <Text style={[styles.optionCode, { color: GOLD }]}>{rank.code}</Text>
                    </View>
                    <Text style={[styles.optionSubtitle, { color: c.textMuted }]} numberOfLines={2}>
                      {rank.address || 'No address available'}
                    </Text>
                    {rank.status && (
                      <View style={styles.statusBadge}>
                        <Text style={[styles.statusText, { color: c.text }]}>
                          {rank.status}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={prevStep}
          >
            <Text style={[styles.navButtonText, { color: c.text }]}>Previous</Text>
          </TouchableOpacity>
        )}
        
        {step < 3 && (
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton, { backgroundColor: GOLD }]}
            onPress={nextStep}
          >
            <Text style={[styles.navButtonText, { color: '#000' }]}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  placeholder: { width: 32 },

  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 24,
    backgroundColor: 'rgba(255,215,0,0.05)'
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  progressDotText: {
    fontSize: 14,
    fontWeight: '700'
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8
  },

  content: { flex: 1, paddingHorizontal: 20 },
  stepContainer: { paddingBottom: 100 },

  stepHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 24
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center'
  },
  stepSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center'
  },

  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16
  },
  dropdownInput: {
    padding: 0,
    height: 52
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flex: 1
  },
  dropdownText: {
    flex: 1,
    fontSize: 16
  },

  permissionsPreview: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    backgroundColor: 'rgba(255,215,0,0.05)'
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12
  },
  permissionsList: {
    gap: 8
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  permissionText: {
    fontSize: 14
  },

  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,123,255,0.1)',
    marginBottom: 24
  },
  verificationText: {
    flex: 1,
    fontSize: 14
  },

  resendButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600'
  },

  verifyButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },

  demoNote: {
    alignItems: 'center',
    marginTop: 16
  },
  demoText: {
    fontSize: 12,
    fontStyle: 'italic'
  },

  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginBottom: 16
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '500'
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600'
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500'
  },

  completeButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },

  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  navButton: {
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center'
  },
  prevButton: {
    borderWidth: 1
  },
  nextButton: {
    flex: 1,
    marginLeft: 12
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  modalScroll: {
    flex: 1,
    padding: 20
  },
  optionItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  optionSubtitle: {
    fontSize: 14
  },

  // Enhanced option styles
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  optionCode: {
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,123,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,123,255,0.3)'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },

  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
  },
  retryButton: {
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
    alignItems: 'center'
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700'
  }
});
