import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerServiceProvider } from '../api/identity';
import { useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';

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

function MultiSelectField({ label, icon, options, selected, onChange, colors }) {
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

export default function ServiceProviderRegistrationScreen({ navigation }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const { signIn } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [selectedServiceTypes, setSelectedServiceTypes] = useState([]);
  const [selectedVehicleCategories, setSelectedVehicleCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!businessName || !email || !password || !phone || !contactPerson) {
      return Alert.alert('Validation', 'Please complete all required fields');
    }
    try {
      setLoading(true);
      await registerServiceProvider({
        businessName,
        email,
        password,
        phone,
        contactPerson,
        serviceTypes: selectedServiceTypes.join(', '),
        vehicleCategories: selectedVehicleCategories.join(', '),
      });
      await signIn(email, password);
      Alert.alert('Success', 'Service provider registered');
      navigation.replace('ServiceProviderDashboard');
    } catch (err) {
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: c.primary }]}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="construct-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Service Provider Registration</Text>
          <Text style={styles.heroSub}>Get started quickly — you can complete your full profile later.</Text>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle-outline" size={18} color={c.primary} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Account</Text>
        </View>
        <TextInput placeholder="Business name *" placeholderTextColor={c.textMuted} value={businessName} onChangeText={setBusinessName} style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
        <TextInput placeholder="Contact person *" placeholderTextColor={c.textMuted} value={contactPerson} onChangeText={setContactPerson} style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
        <TextInput placeholder="Email *" placeholderTextColor={c.textMuted} value={email} onChangeText={setEmail} style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} autoCapitalize="none" keyboardType="email-address" />
        <TextInput placeholder="Phone *" placeholderTextColor={c.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
        <TextInput placeholder="Password *" placeholderTextColor={c.textMuted} value={password} onChangeText={setPassword} secureTextEntry style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]} />
      </View>

      <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={18} color={c.primary} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Services Offered</Text>
        </View>
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Service types</Text>
        <MultiSelectField label="Service Types" options={SERVICE_TYPE_OPTIONS} selected={selectedServiceTypes} onChange={setSelectedServiceTypes} colors={c} />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Vehicle categories</Text>
        <MultiSelectField label="Vehicle Categories" options={VEHICLE_CATEGORY_OPTIONS} selected={selectedVehicleCategories} onChange={setSelectedVehicleCategories} colors={c} />
      </View>

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.primary }, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitTxt}>Create Profile</Text>}
      </TouchableOpacity>

      <Text style={[styles.footerNote, { color: c.textMuted }]}>
        You can add business address, rates, banking details and certifications from your dashboard after registration.
      </Text>
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
  submitBtn: { borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  footerNote: { textAlign: 'center', fontSize: 12, marginTop: 14, paddingHorizontal: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '65%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  optionLabel: { fontSize: 15 },
  modalDoneBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  modalDoneTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
