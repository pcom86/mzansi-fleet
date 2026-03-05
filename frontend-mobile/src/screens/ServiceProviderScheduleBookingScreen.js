import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getMyServiceProviderProfile } from '../api/serviceProviderProfiles';
import { getAllVehicles } from '../api/vehicles';
import { createMechanicalRequest, scheduleMechanicalRequest } from '../api/maintenance';

const CATEGORIES = [
  'Full Service', 'Oil Change', 'Mechanical', 'Electrical',
  'Bodywork', 'Towing', 'Diagnostics', 'Panel Beating',
  'Tyres & Alignment', 'Air Conditioning', 'Brakes',
  'Suspension', 'Auto Electrician', 'Windscreen Replacement',
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const TIME_SLOTS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];

function toDateKey(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function MiniCalendar({ year, month, selectedDate, onSelectDate, colors }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={cal.weekRow}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <Text key={d} style={[cal.weekDay, { color: colors.textMuted }]}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={cal.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={cal.cell} />;
            const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isPast = key < todayKey;
            const isSelected = key === selectedDate;
            const isToday = key === todayKey;
            return (
              <TouchableOpacity
                key={di}
                style={[cal.cell, isSelected && { backgroundColor: colors.primary, borderRadius: 20 }, isPast && { opacity: 0.3 }]}
                onPress={() => { if (!isPast) onSelectDate(isSelected ? null : key); }}
                disabled={isPast}
              >
                <Text style={[cal.dayTxt, { color: isSelected ? '#fff' : isToday ? colors.primary : colors.text }, isToday && !isSelected && { fontWeight: '900' }]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
          {week.length < 7 && Array(7-week.length).fill(null).map((_,i) => <View key={`p${i}`} style={cal.cell} />)}
        </View>
      ))}
    </View>
  );
}

function DropdownField({ label, icon, options, selected, onChange, keyExtractor, labelExtractor, colors }) {
  const [visible, setVisible] = useState(false);
  const display = selected ? labelExtractor(selected) : `Select ${label.toLowerCase()}`;
  return (
    <>
      <TouchableOpacity
        style={[styles.input, styles.selectBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
        onPress={() => setVisible(true)}
      >
        {icon && <Ionicons name={icon} size={16} color={colors.textMuted} style={{ marginRight: 8 }} />}
        <Text style={[styles.selectTxt, { color: selected ? colors.text : colors.textMuted }]} numberOfLines={1}>{display}</Text>
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
              keyExtractor={keyExtractor}
              renderItem={({ item }) => {
                const active = selected && keyExtractor(selected) === keyExtractor(item);
                return (
                  <TouchableOpacity style={[styles.optionRow, { borderColor: colors.border }]} onPress={() => { onChange(item); setVisible(false); }}>
                    <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? colors.primary : colors.textMuted} />
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{labelExtractor(item)}</Text>
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

export default function ServiceProviderScheduleBookingScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const { user } = useAuth();

  const prefilledDate = route.params?.prefilledDate || null;
  const prefilledTime = route.params?.prefilledTime || '08:00';

  const initDate = prefilledDate ? new Date(prefilledDate + 'T00:00:00') : new Date();

  const [spProfile, setSpProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [calYear, setCalYear] = useState(initDate.getFullYear());
  const [calMonth, setCalMonth] = useState(initDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(prefilledDate);
  const [selectedTime, setSelectedTime] = useState(prefilledTime);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [profile, veh] = await Promise.all([
          getMyServiceProviderProfile(),
          getAllVehicles(),
        ]);
        setSpProfile(profile);
        setVehicles(veh || []);
      } catch (err) {
        Alert.alert('Error', 'Failed to load data');
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const monthName = useMemo(
    () => new Date(calYear, calMonth, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' }),
    [calYear, calMonth],
  );

  function apiError(err) {
    return err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Something went wrong';
  }

  async function handleSubmit() {
    if (!selectedVehicle) return Alert.alert('Validation', 'Please select a vehicle');
    if (!selectedCategory) return Alert.alert('Validation', 'Please select a category');
    if (!selectedDate) return Alert.alert('Validation', 'Please select a date');
    if (!spProfile?.businessName) return Alert.alert('Error', 'Could not load your service provider profile');

    const scheduledDate = new Date(`${selectedDate}T${selectedTime}:00`);

    try {
      setSubmitting(true);
      
      console.log('Selected vehicle:', selectedVehicle);
      
      const payload = {
        ownerId: selectedVehicle.tenantId,
        vehicleId: selectedVehicle.id,
        location: selectedVehicle.baseLocation || '',
        category: selectedCategory,
        description,
        priority: selectedPriority,
        state: 'Pending',
        requestedBy: user?.id || user?.userId,
        requestedByType: 'ServiceProvider',
        mediaUrls: '',
        preferredTime: scheduledDate.toISOString(),
        callOutRequired: false,
      };
      
      console.log('Creating mechanical request with payload:', payload);
      
      const req = await createMechanicalRequest(payload);

      await scheduleMechanicalRequest(req.id, {
        serviceProvider: spProfile.businessName,
        scheduledDate: scheduledDate.toISOString(),
        scheduledBy: 'ServiceProvider',
      });

      Alert.alert(
        'Booking Scheduled!',
        `${selectedCategory} for ${selectedVehicle.registration || selectedVehicle.make} on ${scheduledDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} at ${selectedTime}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* Header banner */}
      <View style={[styles.heroCard, { backgroundColor: c.primary }]}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="calendar-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Schedule a Booking</Text>
          <Text style={styles.heroSub}>{spProfile?.businessName || 'Service Provider'}</Text>
        </View>
      </View>

      {/* Vehicle & Job Details */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="clipboard-outline" size={17} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.text }]}>Job Details</Text>
        </View>

        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Vehicle</Text>
        <DropdownField
          label="Vehicle"
          icon="car-outline"
          options={vehicles}
          selected={selectedVehicle}
          onChange={setSelectedVehicle}
          keyExtractor={v => v.id}
          labelExtractor={v => `${v.make || ''} ${v.model || ''} ${v.registration ? `(${v.registration})` : ''}`.trim()}
          colors={c}
        />

        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Category</Text>
        <DropdownField
          label="Category"
          icon="settings-outline"
          options={CATEGORIES}
          selected={selectedCategory}
          onChange={setSelectedCategory}
          keyExtractor={s => s}
          labelExtractor={s => s}
          colors={c}
        />

        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Priority</Text>
        <DropdownField
          label="Priority"
          icon="flag-outline"
          options={PRIORITIES}
          selected={selectedPriority}
          onChange={setSelectedPriority}
          keyExtractor={s => s}
          labelExtractor={s => s}
          colors={c}
        />

        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.textArea, { borderColor: c.border, backgroundColor: c.background, color: c.text }]}
          placeholder="Describe the work to be done…"
          placeholderTextColor={c.textMuted}
        />
      </View>

      {/* Date & Time */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar-outline" size={17} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.text }]}>Date & Time</Text>
        </View>
        <View style={styles.calNav}>
          <TouchableOpacity onPress={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}>
            <Ionicons name="chevron-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.monthTxt, { color: c.text }]}>{monthName}</Text>
          <TouchableOpacity onPress={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}>
            <Ionicons name="chevron-forward" size={22} color={c.text} />
          </TouchableOpacity>
        </View>
        <MiniCalendar year={calYear} month={calMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} colors={c} />

        {selectedDate && (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Time slot</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {TIME_SLOTS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeSlot, { borderColor: c.border }, selectedTime === t && { backgroundColor: c.primary, borderColor: c.primary }]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.timeTxt, { color: selectedTime === t ? '#fff' : c.text }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Summary */}
      {selectedVehicle && selectedCategory && selectedDate && (
        <View style={[styles.summary, { backgroundColor: c.primary + '15', borderColor: c.primary }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={c.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.summaryTitle, { color: c.text }]}>{selectedCategory} · {selectedVehicle.registration || selectedVehicle.make}</Text>
            <Text style={[styles.summaryDetail, { color: c.textMuted }]}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long' })} at {selectedTime}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: c.primary }, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={18} color="#fff" />
              <Text style={styles.submitTxt}>Confirm Booking</Text>
            </View>
          )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 14 },
  heroIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  heroSub: { color: '#ffffffcc', fontSize: 12, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 2 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, borderRadius: 10, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectTxt: { flex: 1, fontSize: 14 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTxt: { fontSize: 15, fontWeight: '800' },
  timeSlot: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  timeTxt: { fontSize: 13, fontWeight: '700' },
  summary: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '800' },
  summaryDetail: { fontSize: 12, marginTop: 2 },
  submitBtn: { borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '65%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  optionLabel: { fontSize: 15 },
});

const cal = StyleSheet.create({
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 2 },
  weekDay: { width: 36, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 4 },
  cell: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  dayTxt: { fontSize: 13 },
});
