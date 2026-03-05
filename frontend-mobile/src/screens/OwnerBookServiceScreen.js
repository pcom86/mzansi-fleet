import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getAvailableServiceProviderProfiles } from '../api/serviceProviderProfiles';
import { getProviderSchedule, createMechanicalRequest, scheduleMechanicalRequest } from '../api/maintenance';
import { getAllVehicles } from '../api/vehicles';

const CATEGORIES = [
  'Full Service', 'Oil Change', 'Mechanical', 'Electrical',
  'Bodywork', 'Towing', 'Diagnostics', 'Panel Beating',
  'Tyres & Alignment', 'Air Conditioning', 'Brakes',
  'Suspension', 'Auto Electrician', 'Windscreen Replacement',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

function toDateKey(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function MiniCalendar({ year, month, bookedDates, selectedDate, onSelectDate, colors }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());
  const pastCutoff = toDateKey(new Date(Date.now() - 86400000));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={cal.weekRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <Text key={d} style={[cal.weekDay, { color: colors.textMuted }]}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={cal.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={cal.cell} />;
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isPast = key < todayKey;
            const isBooked = bookedDates.has(key);
            const isSelected = key === selectedDate;
            const isToday = key === todayKey;
            return (
              <TouchableOpacity
                key={di}
                style={[
                  cal.cell,
                  isSelected && { backgroundColor: colors.primary, borderRadius: 20 },
                  isBooked && !isSelected && { backgroundColor: '#ef444422', borderRadius: 20 },
                  isPast && { opacity: 0.35 },
                ]}
                onPress={() => { if (!isPast) onSelectDate(isSelected ? null : key); }}
                disabled={isPast}
              >
                <Text style={[cal.dayTxt, { color: isSelected ? '#fff' : isToday ? colors.primary : colors.text }, isToday && !isSelected && { fontWeight: '900' }]}>
                  {day}
                </Text>
                {isBooked && (
                  <View style={[cal.dot, { backgroundColor: isSelected ? '#fff' : '#ef4444' }]} />
                )}
              </TouchableOpacity>
            );
          })}
          {week.length < 7 && Array(7 - week.length).fill(null).map((_, i) => <View key={`pad-${i}`} style={cal.cell} />)}
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

export default function OwnerBookServiceScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const { user } = useAuth();

  const existingRequest = route.params?.request || null;
  const preselectedVehicle = route.params?.vehicle || null;
  const preselectedSP = route.params?.serviceProvider || null;

  const [providers, setProviders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(preselectedSP);
  const [selectedVehicle, setSelectedVehicle] = useState(preselectedVehicle);
  const [selectedCategory, setSelectedCategory] = useState(existingRequest?.category || null);
  const [selectedPriority, setSelectedPriority] = useState(existingRequest?.priority || 'Medium');
  const [description, setDescription] = useState(existingRequest?.description || '');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [providerSchedule, setProviderSchedule] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        navigation.goBack();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [successMessage, navigation]);

  useEffect(() => {
    async function loadData() {
      try {
        const [sps, veh] = await Promise.all([
          getAvailableServiceProviderProfiles(),
          getAllVehicles(),
        ]);
        setProviders(sps || []);
        const filtered = (veh || []).filter(v => !user?.tenantId || v.tenantId === user.tenantId || v.ownerId === user?.userId);
        setVehicles(filtered);
        if (existingRequest?.vehicleId) {
          const match = filtered.find(v => v.id === existingRequest.vehicleId);
          if (match) setSelectedVehicle(match);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load data');
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedProvider) { setProviderSchedule([]); return; }
    setLoadingSchedule(true);
    getProviderSchedule(selectedProvider.businessName)
      .then(data => setProviderSchedule(data || []))
      .catch(() => setProviderSchedule([]))
      .finally(() => setLoadingSchedule(false));
  }, [selectedProvider]);

  const bookedDates = useMemo(() => {
    const s = new Set();
    providerSchedule.forEach(b => {
      const k = toDateKey(b.scheduledDate);
      if (k) s.add(k);
    });
    return s;
  }, [providerSchedule]);

  const monthName = new Date(calYear, calMonth, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' });

  const TIME_SLOTS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

  async function handleSubmit() {
    if (!selectedProvider) return Alert.alert('Validation', 'Please select a service provider');
    if (!selectedVehicle) return Alert.alert('Validation', 'Please select a vehicle');
    if (!selectedCategory) return Alert.alert('Validation', 'Please select a category');
    if (!selectedDate) return Alert.alert('Validation', 'Please select a date');

    const scheduledDate = new Date(`${selectedDate || new Date().toISOString().split('T')[0]}T${selectedTime}:00`);

    try {
      setSubmitting(true);

      console.log('Creating booking with:', {
        selectedVehicle: selectedVehicle?.id,
        ownerId: selectedVehicle?.tenantId || selectedVehicle?.ownerId || user?.userId,
        userId: user?.userId || user?.id,
      });

      let requestId;
      if (existingRequest?.id) {
        requestId = existingRequest.id;
      } else {
        const payload = {
          ownerId: selectedVehicle.tenantId || selectedVehicle.ownerId || user?.userId,
          vehicleId: selectedVehicle.id,
          location: selectedVehicle.location || selectedVehicle.baseLocation || '',
          category: selectedCategory,
          description,
          priority: selectedPriority,
          state: 'Pending',
          requestedByType: 'Owner',
          requestedBy: user?.userId || user?.id,
          mediaUrls: '',
          preferredTime: scheduledDate.toISOString(),
          callOutRequired: false,
        };
        
        console.log('Payload:', payload);
        
        const req = await createMechanicalRequest(payload);
        console.log('Created request:', req);
        requestId = req.id;
        
        if (!requestId) {
          throw new Error('Failed to create request - no ID returned');
        }
      }

      console.log('Scheduling request with ID:', requestId);
      const schedulePayload = {
        serviceProvider: selectedProvider.businessName,
        scheduledDate: scheduledDate.toISOString(),
        scheduledBy: 'Owner',
      };
      console.log('Schedule payload:', schedulePayload);
      
      await scheduleMechanicalRequest(requestId, schedulePayload);
      console.log('Successfully scheduled request');

      const updatedRequest = {
        ...(existingRequest || {}),
        id: requestId,
        state: 'Scheduled',
        serviceProvider: selectedProvider.businessName,
        scheduledDate: scheduledDate.toISOString(),
        category: selectedCategory,
        description,
        priority: selectedPriority,
        vehicleId: selectedVehicle.id,
      };

      setSuccessMessage(true);
    } catch (err) {
      console.error('Error creating/scheduling booking:', err);
      console.error('Error response:', err?.response?.data);
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to create booking');
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
      <View style={[styles.heroCard, { backgroundColor: c.primary }]}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="calendar-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Book a Service</Text>
          <Text style={styles.heroSub}>Schedule maintenance with a service provider</Text>
        </View>
      </View>

      {/* Provider */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="construct-outline" size={17} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.text }]}>Service Provider</Text>
        </View>
        <DropdownField
          label="Service Provider"
          icon="construct-outline"
          options={providers}
          selected={selectedProvider}
          onChange={setSelectedProvider}
          keyExtractor={p => p.id}
          labelExtractor={p => `${p.businessName}${p.serviceTypes ? ` · ${p.serviceTypes.split(',')[0].trim()}` : ''}`}
          colors={c}
        />
        {selectedProvider && (
          <View style={[styles.spInfo, { borderColor: c.border, backgroundColor: c.background }]}>
            {selectedProvider.phone ? <Text style={[styles.spInfoTxt, { color: c.textMuted }]}><Ionicons name="call-outline" size={12} /> {selectedProvider.phone}</Text> : null}
            {selectedProvider.serviceTypes ? <Text style={[styles.spInfoTxt, { color: c.textMuted }]} numberOfLines={1}><Ionicons name="settings-outline" size={12} /> {selectedProvider.serviceTypes}</Text> : null}
            {selectedProvider.hourlyRate ? <Text style={[styles.spInfoTxt, { color: c.textMuted }]}><Ionicons name="cash-outline" size={12} /> R{selectedProvider.hourlyRate}/hr</Text> : null}
          </View>
        )}
      </View>

      {/* Calendar */}
      {selectedProvider && (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={17} color={c.primary} />
            <Text style={[styles.cardTitle, { color: c.text }]}>Pick a Date</Text>
            {loadingSchedule && <ActivityIndicator size="small" color={c.primary} style={{ marginLeft: 8 }} />}
          </View>
          <View style={styles.calLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.legendTxt, { color: c.textMuted }]}>Already booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.primary }]} />
              <Text style={[styles.legendTxt, { color: c.textMuted }]}>Your selection</Text>
            </View>
          </View>
          <View style={styles.calNav}>
            <TouchableOpacity onPress={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>
              <Ionicons name="chevron-back" size={22} color={c.text} />
            </TouchableOpacity>
            <Text style={[styles.monthTxt, { color: c.text }]}>{monthName}</Text>
            <TouchableOpacity onPress={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>
              <Ionicons name="chevron-forward" size={22} color={c.text} />
            </TouchableOpacity>
          </View>
          <MiniCalendar year={calYear} month={calMonth} bookedDates={bookedDates} selectedDate={selectedDate} onSelectDate={setSelectedDate} colors={c} />

          {selectedDate && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Time slot</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {TIME_SLOTS.map(t => (
                  <TouchableOpacity key={t} style={[styles.timeSlot, { borderColor: c.border }, selectedTime === t && { backgroundColor: c.primary, borderColor: c.primary }]} onPress={() => setSelectedTime(t)}>
                    <Text style={[styles.timeTxt, { color: selectedTime === t ? '#fff' : c.text }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Job details */}
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
          placeholder="Describe what needs to be done…"
          placeholderTextColor={c.textMuted}
        />
      </View>

      {/* Summary */}
      {selectedProvider && selectedDate && selectedVehicle && selectedCategory && (
        <View style={[styles.summary, { backgroundColor: c.primary + '15', borderColor: c.primary }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={c.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.summaryTitle, { color: c.text }]}>{selectedCategory} · {selectedVehicle.registration}</Text>
            <Text style={[styles.summaryDetail, { color: c.textMuted }]}>{selectedProvider.businessName} · {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })} at {selectedTime}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.primary }, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={styles.submitTxt}>Confirm Booking</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Success Message Overlay */}
      {successMessage && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSub}>
              Scheduled with {selectedProvider?.businessName} on {selectedDate ? new Date(selectedDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Selected date'} at {selectedTime}
            </Text>
          </View>
        </View>
      )}
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

  spInfo: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 3, marginTop: -4, marginBottom: 4 },
  spInfoTxt: { fontSize: 12 },

  calLegend: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 11 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTxt: { fontSize: 15, fontWeight: '800' },

  timeSlot: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  timeTxt: { fontSize: 13, fontWeight: '700' },

  summary: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '800' },
  summaryDetail: { fontSize: 12, marginTop: 2 },

  submitBtn: { borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  successOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  successCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, minWidth: 280 },
  successTitle: { fontSize: 20, fontWeight: '900', color: '#22c55e' },
  successSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },

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
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
});
