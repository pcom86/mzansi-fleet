import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { client } from '../api/client';

const GOLD = '#FFD700';
const GREEN = '#28a745';
const RED = '#dc3545';
const BLUE = '#007bff';

export default function TripCaptureScreen({ navigation, route }) {
  const { colors: c } = useTheme();
  const { marshal } = route.params || {};
  
  // Camera state
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [passengerCount, setPassengerCount] = useState('');
  const [fareCollected, setFareCollected] = useState('');
  const [notes, setNotes] = useState('');
  const [capturedAt, setCapturedAt] = useState(new Date());
  
  // Modal states
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  useEffect(() => {
    checkCameraPermission();
    loadSchedules();
    loadVehicles();
  }, []);

  const checkCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const loadSchedules = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await client.get(`/TripSchedules/by-rank/${marshal.taxiRankId}`, {
        params: { date: today }
      });
      setSchedules(response.data || []);
    } catch (error) {
      console.error('Load schedules error:', error);
      setSchedules([]);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await client.get(`/Vehicles/by-rank/${marshal.taxiRankId}`);
      setVehicles(response.data || []);
    } catch (error) {
      console.error('Load vehicles error:', error);
      setVehicles([]);
    }
  };

  const openCamera = async () => {
    if (hasPermission === false) {
      Alert.alert('Permission Required', 'Camera permission is required to capture trips');
      return;
    }
    setCameraVisible(true);
  };

  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({
          quality: 0.7,
          base64: false
        });
        setCapturedImage(photo.uri);
        setCameraVisible(false);
      } catch (error) {
        console.error('Take picture error:', error);
        Alert.alert('Error', 'Failed to capture photo');
      }
    }
  };

  const selectFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.cancelled) {
        setCapturedImage(result.uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const validateForm = () => {
    if (!capturedImage) {
      Alert.alert('Error', 'Please capture or select a photo');
      return false;
    }
    if (!selectedSchedule) {
      Alert.alert('Error', 'Please select a schedule');
      return false;
    }
    if (!selectedVehicle) {
      Alert.alert('Error', 'Please select a vehicle');
      return false;
    }
    if (!passengerCount || passengerCount < 1) {
      Alert.alert('Error', 'Please enter valid passenger count');
      return false;
    }
    if (!fareCollected || fareCollected < 0) {
      Alert.alert('Error', 'Please enter valid fare amount');
      return false;
    }
    return true;
  };

  const captureTrip = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const tripData = {
        marshalId: marshal.id,
        scheduleId: selectedSchedule.id,
        vehicleId: selectedVehicle.id,
        passengerCount: parseInt(passengerCount),
        fareCollected: parseFloat(fareCollected),
        capturedAt: capturedAt.toISOString(),
        notes,
        photoUri: capturedImage,
        status: 'Completed'
      };

      console.log('Capturing trip:', tripData);
      
      const response = await client.post('/TripCaptures', tripData);
      
      Alert.alert(
        'Success!',
        'Trip captured successfully!',
        [
          {
            text: 'Capture Another',
            onPress: resetForm
          },
          {
            text: 'View Dashboard',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Capture trip error:', error);
      Alert.alert('Error', 'Failed to capture trip');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCapturedImage(null);
    setSelectedSchedule(null);
    setSelectedVehicle(null);
    setPassengerCount('');
    setFareCollected('');
    setNotes('');
    setCapturedAt(new Date());
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Capture Trip</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={[styles.loadingText, { color: c.text }]}>Checking camera permission...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Capture Trip</Text>
        </View>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={RED} />
          <Text style={[styles.permissionTitle, { color: c.text }]}>Camera Permission Required</Text>
          <Text style={[styles.permissionText, { color: c.textMuted }]}>
            Camera access is required to capture trip photos. Please enable camera permission in your device settings.
          </Text>
        </View>
      </View>
    );
  }

  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <Camera style={styles.camera} type={Camera.Constants.Type.back} ref={ref => { cameraRef = ref; }}>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity onPress={() => setCameraVisible(false)} style={styles.cameraCloseButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.cameraFooter}>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </Camera>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Trip</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Capture Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Trip Photo</Text>
          
          {capturedImage ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
              <TouchableOpacity style={styles.retakeButton} onPress={() => setCapturedImage(null)}>
                <Ionicons name="camera-reverse-outline" size={16} color={GOLD} />
                <Text style={[styles.retakeText, { color: GOLD }]}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoOptions}>
              <TouchableOpacity style={[styles.photoButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={openCamera}>
                <Ionicons name="camera-outline" size={32} color={GOLD} />
                <Text style={[styles.photoButtonText, { color: c.text }]}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.photoButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={selectFromGallery}>
                <Ionicons name="image-outline" size={32} color={BLUE} />
                <Text style={[styles.photoButtonText, { color: c.text }]}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Schedule Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Schedule</Text>
          <TouchableOpacity
            style={[styles.selectorButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setScheduleModalVisible(true)}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="calendar-outline" size={20} color={c.textMuted} />
              <Text style={[styles.selectorText, { color: selectedSchedule ? c.text : c.textMuted }]}>
                {selectedSchedule ? `${selectedSchedule.routeName} - ${formatTime(selectedSchedule.departureTime)}` : 'Select Schedule'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={c.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Vehicle Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Vehicle</Text>
          <TouchableOpacity
            style={[styles.selectorButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setVehicleModalVisible(true)}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="bus-outline" size={20} color={c.textMuted} />
              <Text style={[styles.selectorText, { color: selectedVehicle ? c.text : c.textMuted }]}>
                {selectedVehicle ? selectedVehicle.registration : 'Select Vehicle'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={c.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Trip Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Trip Details</Text>
          
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={[styles.label, { color: c.textMuted }]}>Passenger Count *</Text>
              <TextInput
                value={passengerCount}
                onChangeText={setPassengerCount}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Number of passengers"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            
            <View style={styles.formHalf}>
              <Text style={[styles.label, { color: c.textMuted }]}>Fare Collected (R) *</Text>
              <TextInput
                value={fareCollected}
                onChangeText={setFareCollected}
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                placeholder="Amount collected"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }, { minHeight: 80 }]}
              placeholder="Additional notes (optional)"
              placeholderTextColor={c.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>Capture Time</Text>
            <Text style={[styles.timeText, { color: c.text }]}>
              {capturedAt.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: GOLD }]}
            onPress={captureTrip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={[styles.submitButtonText, { color: '#000' }]}>Capture Trip</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Schedule Modal */}
      <Modal visible={scheduleModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Schedule</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {schedules.map((schedule) => (
                <TouchableOpacity
                  key={schedule.id}
                  style={[
                    styles.optionItem,
                    { backgroundColor: c.surface, borderColor: c.border },
                    selectedSchedule?.id === schedule.id && { backgroundColor: 'rgba(255,215,0,0.1)', borderColor: GOLD }
                  ]}
                  onPress={() => {
                    setSelectedSchedule(schedule);
                    setScheduleModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionTitle, { color: c.text }]}>{schedule.routeName}</Text>
                  <Text style={[styles.optionSubtitle, { color: c.textMuted }]}>
                    {formatTime(schedule.departureTime)} • {schedule.departureStation} → {schedule.destinationStation}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Vehicle Modal */}
      <Modal visible={vehicleModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[
                    styles.optionItem,
                    { backgroundColor: c.surface, borderColor: c.border },
                    selectedVehicle?.id === vehicle.id && { backgroundColor: 'rgba(255,215,0,0.1)', borderColor: GOLD }
                  ]}
                  onPress={() => {
                    setSelectedVehicle(vehicle);
                    setVehicleModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionTitle, { color: c.text }]}>{vehicle.registration}</Text>
                  <Text style={[styles.optionSubtitle, { color: c.textMuted }]}>
                    {vehicle.make} {vehicle.model} • {vehicle.capacity} passengers
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  placeholder: { width: 32 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24
  },

  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between'
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 60
  },
  cameraCloseButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8
  },
  cameraFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 40
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff'
  },

  content: { flex: 1, paddingHorizontal: 20 },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16
  },

  photoOptions: {
    flexDirection: 'row',
    gap: 12
  },
  photoButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8
  },

  photoPreview: {
    alignItems: 'center'
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GOLD
  },
  retakeText: {
    fontSize: 14,
    fontWeight: '600'
  },

  selectorButton: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16
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

  formRow: {
    flexDirection: 'row',
    gap: 12
  },
  formHalf: {
    flex: 1
  },
  formGroup: {
    marginBottom: 20
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
  timeText: {
    fontSize: 16,
    fontWeight: '500'
  },

  submitSection: {
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  submitButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center'
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },

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
  }
});
