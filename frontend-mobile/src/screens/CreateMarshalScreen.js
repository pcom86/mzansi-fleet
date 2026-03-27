import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { fetchAllTaxiRanks } from '../api/taxiRanks';
import client from '../api/client';

const GOLD = '#FFD700';
const GREEN = '#28a745';
const RED = '#dc3545';
const BLUE = '#007bff';

export default function CreateMarshalScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const { admin, taxiRankId } = route.params || {};
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taxiRanks, setTaxiRanks] = useState([]);
  const [selectedTaxiRank, setSelectedTaxiRank] = useState(null);
  const [showTaxiRankModal, setShowTaxiRankModal] = useState(false);
  
  // Marshal information
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [marshalCode, setMarshalCode] = useState('');
  const [marshalCodeManuallySet, setMarshalCodeManuallySet] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [experience, setExperience] = useState('');
  
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
    loadTaxiRanks();
    
    // Pre-select taxi rank if provided
    if (taxiRankId) {
      setSelectedTaxiRank(taxiRankId);
    }
  }, [taxiRankId]);

  // Separate effect for marshal code generation - only runs once on mount
  useEffect(() => {
    // Generate initial marshal code if empty
    if (!marshalCode) {
      const code = 'MAR' + Math.floor(Math.random() * 10000);
      setMarshalCode(code);
    }
  }, []);

  const loadTaxiRanks = async () => {
    try {
      setLoading(true);
      const response = await fetchAllTaxiRanks();
      const ranks = response.data || [];
      setTaxiRanks(ranks);
    } catch (error) {
      console.error('Load taxi ranks error:', error);
      Alert.alert('Error', 'Failed to load taxi ranks');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!selectedTaxiRank) {
      Alert.alert('Error', 'Please select a taxi rank');
      return false;
    }
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter marshal full name');
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
    if (!marshalCode.trim()) {
      Alert.alert('Error', 'Marshal code is required');
      return false;
    }
    if (!emergencyContact.trim()) {
      Alert.alert('Error', 'Please enter emergency contact');
      return false;
    }
    return true;
  };

  const checkMarshalCodeAvailability = async () => {
    if (!marshalCode.trim()) return true;
    
    try {
      const response = await client.get(`/QueueMarshals/by-code/${marshalCode}`);
      const existingMarshals = response.data || [];
      return existingMarshals.length === 0;
    } catch (error) {
      console.log('Check marshal code error:', error);
      // If the endpoint fails, allow the code to be used
      // The backend will validate it anyway during creation
      return true;
    }
  };

  const createMarshal = async () => {
    console.log('Form values before validation:', {
      fullName,
      idNumber,
      phoneNumber,
      email,
      marshalCode,
      emergencyContact,
      experience,
      selectedTaxiRank,
      permissions
    });
    
    if (!validateForm()) return;

    // Skip marshal code availability check for now - backend will validate
    // const isCodeAvailable = await checkMarshalCodeAvailability();
    // if (!isCodeAvailable) {
    //   Alert.alert('Error', 'Marshal code already exists. Please choose a different code.');
    //   return;
    // }

    setSaving(true);
    try {
      // Generate username and password
      const username = generateUsername(fullName);
      const password = generatePassword();
      
      const marshalData = {
        fullName: fullName.trim() || 'Unknown Marshal',
        idNumber: idNumber.trim() || '0000000000000',
        phoneNumber: phoneNumber.trim() || '0000000000',
        email: email.trim() || 'no-reply@mzansifleet.co.za',
        marshalCode: marshalCode.trim().toUpperCase() || generateMarshalCode(),
        emergencyContact: emergencyContact.trim() || 'Not provided',
        experience: experience.trim() || 'No experience specified',
        taxiRankId: selectedTaxiRank,
        permissions: permissions,
        createdBy: admin?.id || '00000000-0000-0000-0000-000000000000' // Empty GUID as fallback
      };

      console.log('Creating marshal:', marshalData);
      console.log('Request payload:', marshalData);
      
      // Create marshal profile (user account creation will be added later)
      const response = await client.post('/QueueMarshals', marshalData);
      const createdMarshal = response.data;

      Alert.alert(
        'Marshal Created Successfully!',
        `Marshal profile created successfully!\n\n📱 Generated Credentials:\nUsername: ${username}\nPassword: ${password}\n\n📋 Marshal Details:\nCode: ${marshalData.marshalCode}\nPhone: ${marshalData.phoneNumber}\n\nNote: Save these credentials for future user account setup.`,
        [
          {
            text: 'Create Another',
            onPress: resetForm
          },
          {
            text: 'Back to Management',
            onPress: () => navigation.navigate('MarshalManagement', { refresh: true })
          }
        ]
      );
    } catch (error) {
      console.error('Create marshal error:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Error status:', error?.response?.status);
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create marshal profile';
      
      if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
        Alert.alert('Duplicate Entry', errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper function to generate username
  // Helper function to generate unique marshal code
  const generateMarshalCode = () => {
    const prefix = 'MZ';
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}${randomNum}`;
  };

  const generateUsername = (fullName) => {
    const names = fullName.trim().split(' ');
    const firstName = names[0]?.toLowerCase() || '';
    const lastName = names[names.length - 1]?.toLowerCase() || '';
    const randomNum = Math.floor(Math.random() * 1000);
    
    if (firstName && lastName) {
      return `${firstName}.${lastName}${randomNum}`;
    } else {
      return `${firstName}${randomNum}`;
    }
  };

  // Helper function to generate secure password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%'[Math.floor(Math.random() * 5)];
    
    // Add remaining characters
    for (let i = 4; i < 8; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const resetForm = () => {
    setFullName('');
    setIdNumber('');
    setPhoneNumber('');
    setEmail('');
    setMarshalCode('');
    setEmergencyContact('');
    setExperience('');
    setPermissions({
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
  };

  const togglePermission = (permission) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  const getSelectedTaxiRankName = () => {
    if (!selectedTaxiRank) return 'Select Taxi Rank';
    const rank = taxiRanks.find(r => r.id === selectedTaxiRank);
    return rank ? rank.name : 'Select Taxi Rank';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Marshal Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={[styles.loadingText, { color: c.text }]}>Loading taxi ranks...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Marshal Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Taxi Rank Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Assignment</Text>
          
          <TouchableOpacity
            style={[styles.selectorButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => {
              if (taxiRanks && taxiRanks.length > 0) {
                setShowTaxiRankModal(true);
              } else {
                alert('No taxi ranks available. Please create a taxi rank first.');
              }
            }}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="location-outline" size={20} color={c.textMuted} />
              <Text style={[styles.selectorText, { color: selectedTaxiRank ? c.text : c.textMuted }]}>
                {getSelectedTaxiRankName()}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Personal Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>Full Name *</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
              placeholder="Enter marshal's full name"
              placeholderTextColor={c.textMuted}
              autoCapitalize="words"
              autoCorrect={true}
              keyboardType="default"
              returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={[styles.label, { color: c.textMuted }]}>ID Number *</Text>
              <TextInput
                value={idNumber}
                onChangeText={setIdNumber}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="ID number"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                maxLength={13}
              />
            </View>
            
            <View style={styles.formHalf}>
              <Text style={[styles.label, { color: c.textMuted }]}>Phone Number *</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Phone number"
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
              placeholder="Email address (optional)"
              placeholderTextColor={c.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Marshal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Marshal Details</Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>Marshal Code *</Text>
            <View style={styles.codeInputContainer}>
              <TextInput
                value={marshalCode}
                onChangeText={setMarshalCode}
                style={[styles.input, styles.codeInput, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Enter marshal code"
                placeholderTextColor={c.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: GOLD }]}
                onPress={() => {
                  const code = generateMarshalCode();
                  setMarshalCode(code);
                }}
              >
                <Ionicons name="refresh-outline" size={16} color="#000" />
                <Text style={[styles.generateButtonText, { color: '#000' }]}>Generate</Text>
              </TouchableOpacity>
            </View>
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
              placeholder="Marshal's experience and background (optional)"
              placeholderTextColor={c.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Permissions</Text>
            <Text style={[styles.sectionSubtitle, { color: c.textMuted }]}>Configure marshal access</Text>
          </View>
          
          <View style={styles.permissionsContainer}>
            <Text style={[styles.permissionsGroupTitle, { color: c.text }]}>Core Functions</Text>
            
            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: c.text }]}>Capture Trips</Text>
                <Text style={[styles.permissionDesc, { color: c.textMuted }]}>Record trip data and photos</Text>
              </View>
              <Switch
                value={permissions.canCaptureTrips}
                onValueChange={() => togglePermission('canCaptureTrips')}
                trackColor={{ false: c.border, true: GOLD }}
                thumbColor={permissions.canCaptureTrips ? '#000' : c.textMuted}
              />
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: c.text }]}>View Schedules</Text>
                <Text style={[styles.permissionDesc, { color: c.textMuted }]}>See today's trip schedules</Text>
              </View>
              <Switch
                value={permissions.canViewSchedules}
                onValueChange={() => togglePermission('canViewSchedules')}
                trackColor={{ false: c.border, true: GOLD }}
                thumbColor={permissions.canViewSchedules ? '#000' : c.textMuted}
              />
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: c.text }]}>Receive Messages</Text>
                <Text style={[styles.permissionDesc, { color: c.textMuted }]}>Get messages from admin</Text>
              </View>
              <Switch
                value={permissions.canReceiveMessages}
                onValueChange={() => togglePermission('canReceiveMessages')}
                trackColor={{ false: c.border, true: GOLD }}
                thumbColor={permissions.canReceiveMessages ? '#000' : c.textMuted}
              />
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: c.text }]}>Send Messages</Text>
                <Text style={[styles.permissionDesc, { color: c.textMuted }]}>Communicate with admin</Text>
              </View>
              <Switch
                value={permissions.canSendMessages}
                onValueChange={() => togglePermission('canSendMessages')}
                trackColor={{ false: c.border, true: GOLD }}
                thumbColor={permissions.canSendMessages ? '#000' : c.textMuted}
              />
            </View>

            <Text style={[styles.permissionsGroupTitle, { color: c.text, marginTop: 24 }]}>Restricted Functions</Text>
            
            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: c.text }]}>Manage Vehicles</Text>
                <Text style={[styles.permissionDesc, { color: c.textMuted }]}>Add/edit vehicles</Text>
              </View>
              <Switch
                value={permissions.canManageVehicles}
                onValueChange={() => togglePermission('canManageVehicles')}
                trackColor={{ false: c.border, true: GOLD }}
                thumbColor={permissions.canManageVehicles ? '#000' : c.textMuted}
              />
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: c.text }]}>Manage Drivers</Text>
                <Text style={[styles.permissionDesc, { color: c.textMuted }]}>Add/edit drivers</Text>
              </View>
              <Switch
                value={permissions.canManageDrivers}
                onValueChange={() => togglePermission('canManageDrivers')}
                trackColor={{ false: c.border, true: GOLD }}
                thumbColor={permissions.canManageDrivers ? '#000' : c.textMuted}
              />
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: c.text }]}>Manage Schedules</Text>
                <Text style={[styles.permissionDesc, { color: c.textMuted }]}>Edit trip schedules</Text>
              </View>
              <Switch
                value={permissions.canManageSchedules}
                onValueChange={() => togglePermission('canManageSchedules')}
                trackColor={{ false: c.border, true: GOLD }}
                thumbColor={permissions.canManageSchedules ? '#000' : c.textMuted}
              />
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: c.text }]}>View Reports</Text>
                <Text style={[styles.permissionDesc, { color: c.textMuted }]}>Access detailed reports</Text>
              </View>
              <Switch
                value={permissions.canViewReports}
                onValueChange={() => togglePermission('canViewReports')}
                trackColor={{ false: c.border, true: GOLD }}
                thumbColor={permissions.canViewReports ? '#000' : c.textMuted}
              />
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: c.text }]}>Delete Data</Text>
                <Text style={[styles.permissionDesc, { color: c.textMuted }]}>Remove records</Text>
              </View>
              <Switch
                value={permissions.canDeleteData}
                onValueChange={() => togglePermission('canDeleteData')}
                trackColor={{ false: c.border, true: GOLD }}
                thumbColor={permissions.canDeleteData ? '#000' : c.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Create Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: GOLD }]}
            onPress={createMarshal}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={[styles.createButtonText, { color: '#000' }]}>Create Marshal Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Taxi Rank Selection Modal */}
      <Modal
        visible={showTaxiRankModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTaxiRankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Taxi Rank</Text>
              <TouchableOpacity onPress={() => setShowTaxiRankModal(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={true}>
                {taxiRanks.map((rank) => (
                  <TouchableOpacity
                    key={rank.id}
                    style={[styles.rankOption, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={() => {
                      setSelectedTaxiRank(rank.id);
                      setShowTaxiRankModal(false);
                    }}
                  >
                    <View style={styles.rankInfo}>
                      <Text style={[styles.rankName, { color: c.text }]}>{rank.name}</Text>
                      <Text style={[styles.rankCode, { color: c.textMuted }]}>{rank.code}</Text>
                      <Text style={[styles.rankAddress, { color: c.textMuted }]}>{rank.address}</Text>
                    </View>
                    <Ionicons name="checkmark" size={20} color={selectedTaxiRank === rank.id ? GREEN : 'transparent'} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center'
  },
  backButton: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16
  },

  content: { flex: 1, paddingHorizontal: 20 },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666'
  },

  selectorButton: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    minHeight: 50,
    justifyContent: 'center'
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  selectorText: {
    flex: 1,
    fontSize: 16
  },

  formGroup: {
    marginBottom: 20
  },
  formRow: {
    flexDirection: 'row',
    gap: 12
  },
  formHalf: {
    flex: 1
  },
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
  codeInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end'
  },
  codeInput: {
    flex: 1
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  generateButtonText: {
    fontSize: 12,
    fontWeight: '600'
  },

  permissionsContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    backgroundColor: 'rgba(255,215,0,0.02)'
  },
  permissionsGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 8
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  permissionInfo: {
    flex: 1,
    marginRight: 16
  },
  permissionName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2
  },
  permissionDesc: {
    fontSize: 13,
    lineHeight: 18
  },

  submitSection: {
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  createButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center'
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  modalContent: {
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    minHeight: 300
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
  modalBody: {
    flex: 1,
    minHeight: 200
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 0
  },
  rankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    minHeight: 60
  },
  rankInfo: {
    flex: 1
  },
  rankName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  rankCode: {
    fontSize: 14,
    marginBottom: 2
  },
  rankAddress: {
    fontSize: 12
  }
});
