import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { updateMyServiceProviderProfile } from '../api/serviceProviderProfiles';

const SERVICE_TYPE_OPTIONS = [
  'Mechanical', 'Electrical', 'Bodywork', 'Towing',
  'Diagnostics', 'Panel Beating', 'Tyres & Alignment',
  'Air Conditioning', 'Brakes', 'Suspension',
  'Auto Electrician', 'Windscreen Replacement',
];

const VEHICLE_CATEGORY_OPTIONS = [
  'Sedan', 'SUV', 'Hatchback', 'Bakkie',
  'Minibus / Taxi', 'Bus', 'Truck', 'Motorcycle',
];

const OPERATING_HOURS_OPTIONS = [
  'Mon-Fri 08:00-17:00',
  'Mon-Fri 07:00-18:00',
  'Mon-Sat 08:00-17:00',
  'Mon-Sat 07:00-18:00',
  '24/7',
  'By Appointment',
];

function parseCsv(value) {
  if (!value) return [];
  return value.split(',').map(v => v.trim()).filter(Boolean);
}

function MultiSelectField({ label, options, selected, onChange, colors }) {
  const [visible, setVisible] = useState(false);

  function toggle(item) {
    onChange(
      selected.includes(item)
        ? selected.filter(s => s !== item)
        : [...selected, item],
    );
  }

  const display = selected.length > 0 ? selected.join(', ') : `Select ${label.toLowerCase()}`;

  return (
    <>
      <TouchableOpacity
        style={[styles.input, styles.selectBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.selectTxt, { color: selected.length ? colors.text : colors.textMuted }]} numberOfLines={1}>
          {display}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => {
                const active = selected.includes(item);
                return (
                  <TouchableOpacity style={[styles.optionRow, { borderColor: colors.border }]} onPress={() => toggle(item)}>
                    <Ionicons
                      name={active ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={active ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={[styles.modalDoneBtn, { backgroundColor: colors.primary }]} onPress={() => setVisible(false)}>
              <Text style={styles.modalDoneTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SingleSelectField({ label, options, selected, onChange, colors }) {
  const [visible, setVisible] = useState(false);
  const display = selected || `Select ${label.toLowerCase()}`;

  return (
    <>
      <TouchableOpacity
        style={[styles.input, styles.selectBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.selectTxt, { color: selected ? colors.text : colors.textMuted }]} numberOfLines={1}>
          {display}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => {
                const active = selected === item;
                return (
                  <TouchableOpacity style={[styles.optionRow, { borderColor: colors.border }]} onPress={() => { onChange(item); setVisible(false); }}>
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={active ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function ServiceProviderEditScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const profile = route.params?.profile || {};

  const [businessName, setBusinessName] = useState(profile.businessName || '');
  const [contactPerson, setContactPerson] = useState(profile.contactPerson || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [email, setEmail] = useState(profile.email || '');
  const [address, setAddress] = useState(profile.address || '');
  const [registrationNumber, setRegistrationNumber] = useState(profile.registrationNumber || '');
  const [selectedServiceTypes, setSelectedServiceTypes] = useState(parseCsv(profile.serviceTypes));
  const [selectedVehicleCategories, setSelectedVehicleCategories] = useState(parseCsv(profile.vehicleCategories));
  const [operatingHours, setOperatingHours] = useState(profile.operatingHours || '');
  const [hourlyRate, setHourlyRate] = useState(profile.hourlyRate != null ? String(profile.hourlyRate) : '');
  const [callOutFee, setCallOutFee] = useState(profile.callOutFee != null ? String(profile.callOutFee) : '');
  const [serviceRadiusKm, setServiceRadiusKm] = useState(profile.serviceRadiusKm != null ? String(profile.serviceRadiusKm) : '');
  const [bankAccount, setBankAccount] = useState(profile.bankAccount || '');
  const [taxNumber, setTaxNumber] = useState(profile.taxNumber || '');
  const [certificationsLicenses, setCertificationsLicenses] = useState(profile.certificationsLicenses || '');
  const [notes, setNotes] = useState(profile.notes || '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!businessName) return Alert.alert('Validation', 'Business name is required');
    try {
      setLoading(true);
      await updateMyServiceProviderProfile({
        ...profile,
        businessName,
        contactPerson,
        phone,
        email,
        address,
        registrationNumber,
        serviceTypes: selectedServiceTypes.join(', '),
        vehicleCategories: selectedVehicleCategories.join(', '),
        operatingHours,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        callOutFee: callOutFee ? Number(callOutFee) : null,
        serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : null,
        bankAccount,
        taxNumber,
        certificationsLicenses,
        notes,
      });
      Alert.alert('Saved', 'Profile updated successfully');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: c.primary }]}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="create-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Edit Profile</Text>
          <Text style={styles.heroSub}>Update your service provider details</Text>
        </View>
      </View>

      {/* Business Info */}
      <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business-outline" size={18} color={c.primary} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Business Info</Text>
        </View>
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Business name *</Text>
        <TextInput value={businessName} onChangeText={setBusinessName} style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Contact person</Text>
        <TextInput value={contactPerson} onChangeText={setContactPerson} style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Phone</Text>
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Address</Text>
        <TextInput value={address} onChangeText={setAddress} multiline style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text, minHeight: 60, textAlignVertical: 'top' }]} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Registration number</Text>
        <TextInput value={registrationNumber} onChangeText={setRegistrationNumber} style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
      </View>

      {/* Services */}
      <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={18} color={c.primary} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Services</Text>
        </View>
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Service types</Text>
        <MultiSelectField label="Service Types" options={SERVICE_TYPE_OPTIONS} selected={selectedServiceTypes} onChange={setSelectedServiceTypes} colors={c} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Vehicle categories</Text>
        <MultiSelectField label="Vehicle Categories" options={VEHICLE_CATEGORY_OPTIONS} selected={selectedVehicleCategories} onChange={setSelectedVehicleCategories} colors={c} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Operating hours</Text>
        <SingleSelectField label="Operating Hours" options={OPERATING_HOURS_OPTIONS} selected={operatingHours} onChange={setOperatingHours} colors={c} />
      </View>

      {/* Rates */}
      <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cash-outline" size={18} color={c.primary} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Rates</Text>
        </View>
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Hourly rate (R)</Text>
        <TextInput value={hourlyRate} onChangeText={setHourlyRate} keyboardType="decimal-pad" style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} placeholder="e.g. 350" placeholderTextColor={c.textMuted} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Call-out fee (R)</Text>
        <TextInput value={callOutFee} onChangeText={setCallOutFee} keyboardType="decimal-pad" style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} placeholder="e.g. 500" placeholderTextColor={c.textMuted} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Service radius (km)</Text>
        <TextInput value={serviceRadiusKm} onChangeText={setServiceRadiusKm} keyboardType="decimal-pad" style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} placeholder="e.g. 25" placeholderTextColor={c.textMuted} />
      </View>

      {/* Compliance */}
      <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={18} color={c.primary} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Compliance & Banking</Text>
        </View>
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Bank account details</Text>
        <TextInput value={bankAccount} onChangeText={setBankAccount} style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} placeholder="Bank, account no, branch" placeholderTextColor={c.textMuted} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Tax number</Text>
        <TextInput value={taxNumber} onChangeText={setTaxNumber} style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Certifications & licenses</Text>
        <TextInput value={certificationsLicenses} onChangeText={setCertificationsLicenses} multiline style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text, minHeight: 60, textAlignVertical: 'top' }]} />
      </View>

      {/* Notes */}
      <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={18} color={c.primary} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Notes</Text>
        </View>
        <TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text, minHeight: 80, textAlignVertical: 'top' }]} placeholder="Any additional information" placeholderTextColor={c.textMuted} />
      </View>

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.primary }, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnTxt}>Save Changes</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  heroCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 14 },
  heroIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  heroSub: { color: '#ffffffcc', fontSize: 12, marginTop: 2 },
  sectionCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 2 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, borderRadius: 10, fontSize: 14 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectTxt: { flex: 1, fontSize: 14, marginRight: 8 },
  saveBtn: { borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '65%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  optionLabel: { fontSize: 15 },
  modalDoneBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  modalDoneTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
