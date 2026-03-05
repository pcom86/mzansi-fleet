import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../theme';
import { getMyProviderBookings } from '../api/maintenance';

// ── helpers ─────────────────────────────────────────────────────────────
function toDateKey(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toHourMin(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  return { h: d.getHours(), m: d.getMinutes() };
}

function pad(n) { return String(n).padStart(2, '0'); }

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7..19
const BLOCK_COLORS = ['#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899'];
const BLOCK_TYPES = ['Unavailable', 'Lunch Break', 'Staff Meeting', 'Workshop Maintenance', 'Training', 'Personal'];
const STORAGE_KEY = 'sp_schedule_blocks';

function stateColor(state) {
  switch ((state || '').toLowerCase()) {
    case 'scheduled':   return '#3b82f6';
    case 'accepted':    return '#8b5cf6';
    case 'in progress': return '#f59e0b';
    case 'completed':   return '#22c55e';
    default:            return '#9ca3af';
  }
}

// ── sub-components ──────────────────────────────────────────────────────
function WeekStrip({ weekStart, selectedDate, bookings, onSelectDay, onPrevWeek, onNextWeek, colors }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = toDateKey(new Date());
  const countByDay = useMemo(() => {
    const m = {};
    bookings.forEach(b => {
      const k = toDateKey(b.scheduledDate);
      if (k) m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [bookings]);

  return (
    <View style={[ws.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={ws.navRow}>
        <TouchableOpacity onPress={onPrevWeek} style={ws.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[ws.weekLabel, { color: colors.text }]}>
          {weekStart.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} –{' '}
          {addDays(weekStart, 6).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={onNextWeek} style={ws.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={ws.daysRow}>
        {days.map(day => {
          const key = toDateKey(day);
          const isSelected = key === selectedDate;
          const isToday = key === todayKey;
          const count = countByDay[key] || 0;
          return (
            <TouchableOpacity key={key} style={[ws.dayCell, isSelected && { backgroundColor: colors.primary, borderRadius: 12 }]} onPress={() => onSelectDay(key)}>
              <Text style={[ws.dayName, { color: isSelected ? '#fff' : colors.textMuted }]}>
                {day.toLocaleDateString('en-ZA', { weekday: 'short' }).slice(0, 2)}
              </Text>
              <Text style={[ws.dayNum, { color: isSelected ? '#fff' : isToday ? colors.primary : colors.text }, isToday && !isSelected && { fontWeight: '900' }]}>
                {day.getDate()}
              </Text>
              {count > 0 ? (
                <View style={[ws.dot, { backgroundColor: isSelected ? '#fff' : colors.primary }]}>
                  <Text style={[ws.dotTxt, { color: isSelected ? colors.primary : '#fff' }]}>{count}</Text>
                </View>
              ) : <View style={ws.dotPlaceholder} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TimelineSlot({ hour, bookings, blocks, onAddBooking, onAddBlock, navigation, colors }) {
  const label = `${pad(hour)}:00`;
  const nextHour = hour + 1;
  const slotBookings = bookings.filter(b => {
    const t = toHourMin(b.scheduledDate);
    return t && t.h === hour;
  });
  const slotBlocks = blocks.filter(b => b.startHour === hour);
  const hasItems = slotBookings.length > 0 || slotBlocks.length > 0;

  return (
    <View style={[tl.row, { borderColor: colors.border }]}>
      <Text style={[tl.hourLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={tl.content}>
        {slotBookings.map(b => (
          <TouchableOpacity
            key={b.id}
            style={[tl.booking, { backgroundColor: stateColor(b.state) + '18', borderLeftColor: stateColor(b.state) }]}
            onPress={() => navigation.navigate('OwnerMaintenanceRequestDetails', { request: b })}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="construct-outline" size={13} color={stateColor(b.state)} />
              <Text style={[tl.bookingTitle, { color: colors.text }]} numberOfLines={1}>
                {b.category || 'Job'}{b.description ? ` — ${b.description}` : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={[tl.statePill, { backgroundColor: stateColor(b.state) }]}>
                <Text style={tl.stateTxt}>{b.state}</Text>
              </View>
              {b.scheduledDate && (
                <Text style={[tl.bookingMeta, { color: colors.textMuted }]}>
                  {new Date(b.scheduledDate).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
        {slotBlocks.map(bl => (
          <View key={bl.id} style={[tl.block, { backgroundColor: bl.color + '18', borderLeftColor: bl.color }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="lock-closed-outline" size={13} color={bl.color} />
              <Text style={[tl.bookingTitle, { color: colors.text }]}>{bl.title}</Text>
            </View>
            <Text style={[tl.bookingMeta, { color: colors.textMuted }]}>{pad(bl.startHour)}:00 – {pad(bl.endHour)}:00</Text>
          </View>
        ))}
        {!hasItems && (
          <View style={tl.emptySlot}>
            <TouchableOpacity style={[tl.addBtn, { borderColor: colors.border }]} onPress={() => onAddBooking(hour)}>
              <Ionicons name="add" size={13} color={colors.textMuted} />
              <Text style={[tl.addTxt, { color: colors.textMuted }]}>Add booking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[tl.addBtn, { borderColor: colors.border }]} onPress={() => onAddBlock(hour)}>
              <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
              <Text style={[tl.addTxt, { color: colors.textMuted }]}>Block time</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ── main screen ─────────────────────────────────────────────────────────
export default function ServiceProviderScheduleManagerScreen({ navigation }) {
  const { theme } = useAppTheme();
  const c = theme.colors;

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [bookings, setBookings] = useState([]);
  const [customBlocks, setCustomBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [blockModal, setBlockModal] = useState(false);
  const [blockHour, setBlockHour] = useState(9);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockEndHour, setBlockEndHour] = useState(10);
  const [blockColor, setBlockColor] = useState(BLOCK_COLORS[0]);
  const [blockTypeModal, setBlockTypeModal] = useState(false);

  const storageKey = `${STORAGE_KEY}_${selectedDate}`;

  const load = useCallback(async () => {
    try {
      const data = await getMyProviderBookings();
      setBookings(data || []);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    async function loadBlocks() {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        setCustomBlocks(raw ? JSON.parse(raw) : []);
      } catch {
        setCustomBlocks([]);
      }
    }
    loadBlocks();
  }, [selectedDate]);

  async function saveBlock() {
    if (!blockTitle.trim()) return Alert.alert('Validation', 'Please enter a title');
    if (blockEndHour <= blockHour) return Alert.alert('Validation', 'End time must be after start time');
    const newBlock = {
      id: `${Date.now()}`,
      title: blockTitle.trim(),
      startHour: blockHour,
      endHour: blockEndHour,
      color: blockColor,
    };
    const updated = [...customBlocks, newBlock];
    setCustomBlocks(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    setBlockModal(false);
    setBlockTitle('');
  }

  async function deleteBlock(id) {
    Alert.alert('Remove Block', 'Remove this time block?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = customBlocks.filter(b => b.id !== id);
          setCustomBlocks(updated);
          await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
        },
      },
    ]);
  }

  function openAddBooking(hour) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setHours(hour, 0, 0, 0);
    navigation.navigate('SPScheduleBooking', { prefilledDate: toDateKey(d), prefilledTime: `${pad(hour)}:00` });
  }

  function openAddBlock(hour) {
    setBlockHour(hour);
    setBlockEndHour(Math.min(hour + 1, 19));
    setBlockTitle('');
    setBlockColor(BLOCK_COLORS[0]);
    setBlockModal(true);
  }

  const dayBookings = useMemo(() =>
    bookings.filter(b => toDateKey(b.scheduledDate) === selectedDate)
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)),
    [bookings, selectedDate],
  );

  const weekStats = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(weekStart, i)));
    return days.map(key => ({
      key,
      count: bookings.filter(b => toDateKey(b.scheduledDate) === key).length,
    }));
  }, [bookings, weekStart]);

  const totalWeekJobs = weekStats.reduce((s, d) => s + d.count, 0);
  const selectedLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  const isToday = selectedDate === toDateKey(new Date());

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>

        {/* Week strip */}
        <WeekStrip
          weekStart={weekStart}
          selectedDate={selectedDate}
          bookings={bookings}
          onSelectDay={setSelectedDate}
          onPrevWeek={() => setWeekStart(w => addDays(w, -7))}
          onNextWeek={() => setWeekStart(w => addDays(w, 7))}
          colors={c}
        />

        {/* Week summary pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 10 }}>
          <View style={[styles.pill, { backgroundColor: c.primary + '15', borderColor: c.primary }]}>
            <Ionicons name="calendar-outline" size={13} color={c.primary} />
            <Text style={[styles.pillTxt, { color: c.primary }]}>{totalWeekJobs} jobs this week</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b' }]}>
            <Ionicons name="construct-outline" size={13} color="#f59e0b" />
            <Text style={[styles.pillTxt, { color: '#f59e0b' }]}>
              {bookings.filter(b => b.state === 'In Progress').length} in progress
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: '#22c55e15', borderColor: '#22c55e' }]}>
            <Ionicons name="checkmark-circle-outline" size={13} color="#22c55e" />
            <Text style={[styles.pillTxt, { color: '#22c55e' }]}>
              {bookings.filter(b => b.state === 'Completed').length} completed
            </Text>
          </View>
        </ScrollView>

        {/* Day header */}
        <View style={[styles.dayHeader, { borderColor: c.border }]}>
          <View>
            <Text style={[styles.dayTitle, { color: c.text }]}>
              {isToday ? 'Today' : selectedLabel}
            </Text>
            {!isToday && <Text style={[styles.daySub, { color: c.textMuted }]}>{selectedLabel}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: c.primary }]} onPress={() => openAddBooking(9)}>
              <Ionicons name="add-circle-outline" size={15} color="#fff" />
              <Text style={styles.headerBtnTxt}>Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => openAddBlock(9)}>
              <Ionicons name="lock-closed-outline" size={15} color="#fff" />
              <Text style={styles.headerBtnTxt}>Block</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day summary if jobs exist */}
        {dayBookings.length > 0 && (
          <View style={[styles.daySummaryRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            {['Scheduled', 'Accepted', 'In Progress', 'Completed'].map(state => {
              const cnt = dayBookings.filter(b => b.state === state).length;
              if (!cnt) return null;
              return (
                <View key={state} style={styles.daySummaryItem}>
                  <View style={[styles.daySummaryDot, { backgroundColor: stateColor(state) }]} />
                  <Text style={[styles.daySummaryTxt, { color: c.text }]}>{cnt} {state}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Timeline */}
        <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
          {HOURS.map(hour => (
            <TimelineSlot
              key={hour}
              hour={hour}
              bookings={dayBookings}
              blocks={customBlocks}
              onAddBooking={openAddBooking}
              onAddBlock={openAddBlock}
              navigation={navigation}
              colors={c}
            />
          ))}
        </View>

        {/* Custom blocks for this day */}
        {customBlocks.length > 0 && (
          <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
            <Text style={[styles.blocksSectionTitle, { color: c.textMuted }]}>SCHEDULE BLOCKS</Text>
            {customBlocks.map(bl => (
              <View key={bl.id} style={[styles.blockRow, { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: bl.color }]}>
                <View style={[styles.blockColorDot, { backgroundColor: bl.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.blockTitle, { color: c.text }]}>{bl.title}</Text>
                  <Text style={[styles.blockTime, { color: c.textMuted }]}>{pad(bl.startHour)}:00 – {pad(bl.endHour)}:00</Text>
                </View>
                <TouchableOpacity onPress={() => deleteBlock(bl.id)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={() => navigation.navigate('SPScheduleBooking', { prefilledDate: selectedDate })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Block time modal */}
      <Modal visible={blockModal} transparent animationType="slide" onRequestClose={() => setBlockModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Block Time Slot</Text>
              <TouchableOpacity onPress={() => setBlockModal(false)}>
                <Ionicons name="close-circle" size={26} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: c.textMuted }]}>Type</Text>
            <TouchableOpacity style={[styles.input, { borderColor: c.border, backgroundColor: c.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setBlockTypeModal(true)}>
              <Text style={{ color: c.text, fontSize: 14 }}>{blockTitle || 'Select type…'}</Text>
              <Ionicons name="chevron-down" size={16} color={c.textMuted} />
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: c.textMuted }]}>Custom title (optional)</Text>
            <TextInput
              value={blockTitle}
              onChangeText={setBlockTitle}
              style={[styles.input, { borderColor: c.border, backgroundColor: c.background, color: c.text }]}
              placeholder="e.g. Lunch Break"
              placeholderTextColor={c.textMuted}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: c.textMuted }]}>Start Hour</Text>
                <View style={styles.hourRow}>
                  <TouchableOpacity onPress={() => setBlockHour(h => Math.max(7, h - 1))} style={styles.hourBtn}>
                    <Ionicons name="remove" size={18} color={c.text} />
                  </TouchableOpacity>
                  <Text style={[styles.hourTxt, { color: c.text }]}>{pad(blockHour)}:00</Text>
                  <TouchableOpacity onPress={() => setBlockHour(h => Math.min(18, h + 1))} style={styles.hourBtn}>
                    <Ionicons name="add" size={18} color={c.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: c.textMuted }]}>End Hour</Text>
                <View style={styles.hourRow}>
                  <TouchableOpacity onPress={() => setBlockEndHour(h => Math.max(blockHour + 1, h - 1))} style={styles.hourBtn}>
                    <Ionicons name="remove" size={18} color={c.text} />
                  </TouchableOpacity>
                  <Text style={[styles.hourTxt, { color: c.text }]}>{pad(blockEndHour)}:00</Text>
                  <TouchableOpacity onPress={() => setBlockEndHour(h => Math.min(19, h + 1))} style={styles.hourBtn}>
                    <Ionicons name="add" size={18} color={c.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: c.textMuted }]}>Colour</Text>
            <View style={styles.colorRow}>
              {BLOCK_COLORS.map(col => (
                <TouchableOpacity key={col} style={[styles.colorDot, { backgroundColor: col }, blockColor === col && styles.colorDotSelected]} onPress={() => setBlockColor(col)} />
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: blockColor }]} onPress={saveBlock}>
              <Ionicons name="lock-closed-outline" size={16} color="#fff" />
              <Text style={styles.saveBtnTxt}>Save Block</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Block type picker */}
      <Modal visible={blockTypeModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Block Type</Text>
              <TouchableOpacity onPress={() => setBlockTypeModal(false)}>
                <Ionicons name="close-circle" size={26} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={BLOCK_TYPES}
              keyExtractor={t => t}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.typeRow, { borderColor: c.border }]} onPress={() => { setBlockTitle(item); setBlockTypeModal(false); }}>
                  <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} />
                  <Text style={[styles.typeRowTxt, { color: c.text }]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  pillTxt: { fontSize: 12, fontWeight: '700' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dayTitle: { fontSize: 16, fontWeight: '900' },
  daySub: { fontSize: 12, marginTop: 1 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  headerBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  daySummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 14, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 4 },
  daySummaryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  daySummaryDot: { width: 8, height: 8, borderRadius: 4 },
  daySummaryTxt: { fontSize: 12, fontWeight: '600' },
  blocksSectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6, marginTop: 10 },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderLeftWidth: 4, borderRadius: 12, padding: 12, marginBottom: 8 },
  blockColorDot: { width: 10, height: 10, borderRadius: 5 },
  blockTitle: { fontSize: 14, fontWeight: '700' },
  blockTime: { fontSize: 12, marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  hourRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  hourBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  hourTxt: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '800' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, marginTop: 4 },
  saveBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  typeRowTxt: { fontSize: 15 },
});

const ws = StyleSheet.create({
  wrap: { borderBottomWidth: 1, paddingBottom: 12 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  navBtn: { padding: 4 },
  weekLabel: { fontSize: 13, fontWeight: '700' },
  daysRow: { flexDirection: 'row', paddingHorizontal: 8 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 6, gap: 2 },
  dayName: { fontSize: 10, fontWeight: '700' },
  dayNum: { fontSize: 16, fontWeight: '700' },
  dot: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dotTxt: { fontSize: 10, fontWeight: '800' },
  dotPlaceholder: { height: 18 },
});

const tl = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  hourLabel: { width: 46, fontSize: 11, fontWeight: '700', paddingTop: 4, textAlign: 'right', paddingRight: 10 },
  content: { flex: 1, gap: 4 },
  booking: { borderLeftWidth: 3, borderRadius: 8, padding: 8 },
  block: { borderLeftWidth: 3, borderRadius: 8, padding: 8 },
  bookingTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  bookingMeta: { fontSize: 11 },
  statePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stateTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  emptySlot: { flexDirection: 'row', gap: 6 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  addTxt: { fontSize: 11 },
});
