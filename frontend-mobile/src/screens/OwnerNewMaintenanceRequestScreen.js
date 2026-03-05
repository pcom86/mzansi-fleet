import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getAllVehicles } from '../api/vehicles';
import { createMechanicalRequest } from '../api/maintenance';

const CATEGORIES = [
  'Full Service', 'Oil Change', 'Mechanical', 'Electrical',
  'Bodywork', 'Towing', 'Diagnostics', 'Panel Beating',
  'Tyres & Alignment', 'Air Conditioning', 'Brakes',
  'Suspension', 'Auto Electrician', 'Windscreen Replacement',
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

function DropdownModal({ visible, title, options, keyEx, labelEx, onSelect, onClose, colors }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={m.overlay}>
        <View style={[m.card, { backgroundColor: colors.surface }]}>
          <View style={m.header}>
            <Text style={[m.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={26} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={keyEx}
            renderItem={({ item }) => (
              <TouchableOpacity style={[m.row, { borderColor: colors.border }]} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={[m.rowTxt, { color: colors.text }]}>{labelEx(item)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function OwnerNewMaintenanceRequestScreen({ navigation }) {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const c = theme.colors;

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [vehicleModal, setVehicleModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [priorityModal, setPriorityModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const veh = await getAllVehicles();
        const mine = (veh || []).filter(v =>
          !user?.tenantId || v.tenantId === user.tenantId ||
          v.ownerId === user?.userId || v.ownerId === user?.id
        );
        setVehicles(mine);
      } catch {
        Alert.alert('Error', 'Failed to load vehicles');
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, []);

  function apiError(err) {
    return err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Something went wrong';
  }

  async function submit(scheduleAfter = false) {
    if (!selectedVehicle) return Alert.alert('Validation', 'Please select a vehicle');
    if (!selectedCategory) return Alert.alert('Validation', 'Please select a category');
    if (!description.trim()) return Alert.alert('Validation', 'Please add a description');

    try {
      setSubmitting(true);
      const req = await createMechanicalRequest({
        ownerId: user?.userId || user?.id,
        vehicleId: selectedVehicle.id,
        category: selectedCategory,
        description: description.trim(),
        priority: selectedPriority,
        location: location.trim() || selectedVehicle.location || '',
        state: 'Pending',
        requestedByType: 'Owner',
        requestedBy: user?.userId || user?.id,
      });

      if (scheduleAfter) {
        navigation.replace('OwnerBookService', {
          request: {
            ...req,
            vehicleId: selectedVehicle.id,
            category: selectedCategory,
            priority: selectedPriority,
            description: description.trim(),
          },
        });
      } else {
        Alert.alert(
          'Request Created',
          `Your ${selectedCategory} request has been submitted as Pending.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err) {
      Alert.alert('Error', apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const vehicleLabel = selectedVehicle
    ? `${selectedVehicle.make || ''} ${selectedVehicle.model || ''} ${selectedVehicle.registration ? `(${selectedVehicle.registration})` : ''}`.trim()
    : 'Select vehicle';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: c.primary }]}>
        <View style={styles.heroIcon}>
          <Ionicons name="construct-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>New Maintenance Request</Text>
          <Text style={styles.heroSub}>Report an issue or schedule preventative service</Text>
        </View>
      </View>

      {/* Vehicle */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardHead}>
          <Ionicons name="car-outline" size={17} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.text }]}>Vehicle</Text>
        </View>
        <TouchableOpacity
          style={[styles.select, { borderColor: c.border, backgroundColor: c.background }]}
          onPress={() => setVehicleModal(true)}
        >
          <Ionicons name="car-outline" size={16} color={c.textMuted} style={{ marginRight: 8 }} />
          <Text style={[styles.selectTxt, { color: selectedVehicle ? c.text : c.textMuted }]} numberOfLines={1}>
            {vehicleLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Job Details */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardHead}>
          <Ionicons name="clipboard-outline" size={17} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.text }]}>Job Details</Text>
        </View>

        <Text style={[styles.label, { color: c.textMuted }]}>Category</Text>
        <TouchableOpacity
          style={[styles.select, { borderColor: c.border, backgroundColor: c.background }]}
          onPress={() => setCategoryModal(true)}
        >
          <Ionicons name="settings-outline" size={16} color={c.textMuted} style={{ marginRight: 8 }} />
          <Text style={[styles.selectTxt, { color: selectedCategory ? c.text : c.textMuted }]}>
            {selectedCategory || 'Select category'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { color: c.textMuted }]}>Priority</Text>
        <TouchableOpacity
          style={[styles.select, { borderColor: c.border, backgroundColor: c.background }]}
          onPress={() => setPriorityModal(true)}
        >
          <Ionicons name="flag-outline" size={16} color={c.textMuted} style={{ marginRight: 8 }} />
          <Text style={[styles.selectTxt, { color: c.text }]}>{selectedPriority}</Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { color: c.textMuted }]}>Description *</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.textarea, { borderColor: c.border, backgroundColor: c.background, color: c.text }]}
          placeholder="Describe the issue or work required…"
          placeholderTextColor={c.textMuted}
        />

        <Text style={[styles.label, { color: c.textMuted }]}>Location (optional)</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]}
          placeholder="e.g. Cape Town Depot"
          placeholderTextColor={c.textMuted}
        />
      </View>

      {/* Priority indicator */}
      {selectedPriority && (
        <View style={[styles.priorityBanner, { backgroundColor: priorityColor(selectedPriority) + '18', borderColor: priorityColor(selectedPriority) }]}>
          <Ionicons name="alert-circle-outline" size={16} color={priorityColor(selectedPriority)} />
          <Text style={[styles.priorityTxt, { color: priorityColor(selectedPriority) }]}>
            {selectedPriority} priority · {priorityHint(selectedPriority)}
          </Text>
        </View>
      )}

      {/* Actions */}
      <TouchableOpacity
        style={[styles.btnPrimary, { backgroundColor: c.primary }, submitting && { opacity: 0.6 }]}
        onPress={() => submit(true)}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : (
            <>
              <Ionicons name="calendar-outline" size={18} color="#fff" />
              <Text style={styles.btnPrimaryTxt}>Create & Schedule Now</Text>
            </>
          )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btnSecondary, { borderColor: c.border, backgroundColor: c.surface }, submitting && { opacity: 0.6 }]}
        onPress={() => submit(false)}
        disabled={submitting}
      >
        <Ionicons name="save-outline" size={18} color={c.text} />
        <Text style={[styles.btnSecondaryTxt, { color: c.text }]}>Save as Pending</Text>
      </TouchableOpacity>

      {/* Modals */}
      <DropdownModal
        visible={vehicleModal} title="Select Vehicle"
        options={vehicles} keyEx={v => v.id}
        labelEx={v => `${v.make || ''} ${v.model || ''} ${v.registration ? `(${v.registration})` : ''}`.trim()}
        onSelect={setSelectedVehicle} onClose={() => setVehicleModal(false)} colors={c}
      />
      <DropdownModal
        visible={categoryModal} title="Select Category"
        options={CATEGORIES} keyEx={s => s} labelEx={s => s}
        onSelect={setSelectedCategory} onClose={() => setCategoryModal(false)} colors={c}
      />
      <DropdownModal
        visible={priorityModal} title="Select Priority"
        options={PRIORITIES} keyEx={s => s} labelEx={s => s}
        onSelect={setSelectedPriority} onClose={() => setPriorityModal(false)} colors={c}
      />
    </ScrollView>
  );
}

function priorityColor(p) {
  switch ((p || '').toLowerCase()) {
    case 'low':    return '#10b981';
    case 'medium': return '#f59e0b';
    case 'high':   return '#f97316';
    case 'urgent': return '#ef4444';
    default:       return '#9ca3af';
  }
}

function priorityHint(p) {
  switch ((p || '').toLowerCase()) {
    case 'low':    return 'Can be addressed within the month';
    case 'medium': return 'Address within the week';
    case 'high':   return 'Address within 48 hours';
    case 'urgent': return 'Requires immediate attention';
    default:       return '';
  }
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 14 },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  heroSub: { color: '#ffffffcc', fontSize: 12, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  select: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 4 },
  selectTxt: { flex: 1, fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  textarea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 90, textAlignVertical: 'top', marginBottom: 4 },
  priorityBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  priorityTxt: { fontSize: 12, fontWeight: '700', flex: 1 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, minHeight: 52, marginBottom: 10 },
  btnPrimaryTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 14, minHeight: 52 },
  btnSecondaryTxt: { fontSize: 15, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  card: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '65%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTxt: { fontSize: 15 },
});
