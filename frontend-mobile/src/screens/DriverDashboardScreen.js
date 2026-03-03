import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CommonActions } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';

// ── API helpers ──────────────────────────────────────────────────────────────
const API = {
  getDriverProfiles: () => client.get('/Identity/driverprofiles'),
  updateDriverProfile: (id, data) => client.put(`/Identity/driverprofiles/${id}`, data),
  getVehicles: () => client.get('/Vehicles'),
  getEarnings: (vid, start, end) => client.get(`/VehicleEarnings/vehicle/${vid}/period?startDate=${start}&endDate=${end}`),
  getExpenses: (vid, start, end) => client.get(`/VehicleExpenses/vehicle/${vid}/period?startDate=${start}&endDate=${end}`),
  addEarning: (data) => client.post('/VehicleEarnings', data),
  addExpense: (data) => client.post('/VehicleExpenses', data),
  getMaintenance: () => client.get('/MechanicalRequests'),
  addMaintenance: (data) => client.post('/MechanicalRequests', data),
  editMaintenance: (id, data) => client.put(`/MechanicalRequests/${id}`, data),
  deleteMaintenance: (id) => client.delete(`/MechanicalRequests/${id}`),
  getMessages: (uid) => client.get(`/Messages/inbox/${uid}`),
};

function fmt(amount) {
  return `R${(+(amount || 0)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function monthRange() {
  const n = new Date();
  return {
    start: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0],
    end: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split('T')[0],
    name: n.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

function statusColor(state) {
  switch ((state || '').toLowerCase()) {
    case 'open': case 'pending': return '#f59e0b';
    case 'approved': return '#3b82f6';
    case 'scheduled': return '#8b5cf6';
    case 'completed': case 'resolved': return '#22c55e';
    case 'rejected': case 'cancelled': return '#ef4444';
    default: return '#9ca3af';
  }
}

// ── Modals ───────────────────────────────────────────────────────────────────
function DatePickerField({ label, date, onChange, c, s }) {
  const [show, setShow] = useState(false);
  const fmt = d => d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  const isoDate = d => d.toISOString().split('T')[0];

  if (Platform.OS === 'web') {
    return (
      <>
        <Text style={s.label}>{label}</Text>
        <View style={{ position: 'relative', marginBottom: 4 }}>
          <View style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} pointerEvents="none">
            <Text style={{ color: c.text, fontSize: 14 }}>{fmt(date)}</Text>
            <Ionicons name="calendar-outline" size={16} color={c.textMuted} />
          </View>
          <input
            type="date"
            value={isoDate(date)}
            onChange={e => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d)) onChange(d); }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setShow(true)}>
        <Text style={{ color: c.text, fontSize: 14 }}>{fmt(date)}</Text>
        <Ionicons name="calendar-outline" size={16} color={c.textMuted} />
      </TouchableOpacity>
      {Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={show} onRequestClose={() => setShow(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setShow(false)}><Text style={{ color: c.textMuted, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setShow(false)}><Text style={{ color: c.primary, fontWeight: '700' }}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={date} mode="date" display="spinner" onChange={(_, d) => { if (d) onChange(d); }} style={{ width: '100%' }} />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && show && (
        <DateTimePicker value={date} mode="date" display="default" onChange={(_, d) => { setShow(false); if (d) onChange(d); }} />
      )}
    </>
  );
}

function AddEarningModal({ visible, vehicleId, onClose, onSuccess, c, s }) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Trip');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const SOURCES = ['Trip', 'Delivery', 'Bonus', 'Other'];

  function reset() { setAmount(''); setSource('Trip'); setDesc(''); setDate(new Date()); }

  async function submit() {
    if (!amount || isNaN(+amount) || +amount <= 0) return Alert.alert('Validation', 'Enter a valid amount');
    setLoading(true);
    try {
      await API.addEarning({ vehicleId, amount: +amount, source, description: desc, date: date.toISOString().split('T')[0] });
      reset(); onSuccess(); onClose();
    } catch (e) { Alert.alert('Error', e?.response?.data?.error || e.message || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Add Earning</Text>
            <Text style={s.label}>Amount (R)</Text>
            <TextInput style={s.input} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={c.textMuted} />
            <Text style={s.label}>Source</Text>
            <View style={s.chips}>{SOURCES.map(src => (
              <TouchableOpacity key={src} style={[s.chip, source === src && s.chipOn]} onPress={() => setSource(src)}>
                <Text style={[s.chipTxt, source === src && s.chipTxtOn]}>{src}</Text>
              </TouchableOpacity>
            ))}</View>
            <DatePickerField label="Date" date={date} onChange={setDate} c={c} s={s} />
            <Text style={s.label}>Description (optional)</Text>
            <TextInput style={[s.input, { height: 70 }]} multiline value={desc} onChangeText={setDesc} placeholder="Details..." placeholderTextColor={c.textMuted} />
            <View style={s.row2}>
              <TouchableOpacity style={s.btnGhost} onPress={() => { reset(); onClose(); }}><Text style={s.btnGhostTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.btnPrimary} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryTxt}>Add Earning</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function AddExpenseModal({ visible, vehicleId, onClose, onSuccess, c, s }) {
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState('Fuel');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const CATS = ['Fuel', 'Maintenance', 'Repairs', 'Toll', 'Insurance', 'Other'];

  function reset() { setAmount(''); setCat('Fuel'); setDesc(''); setDate(new Date()); }

  async function submit() {
    if (!amount || isNaN(+amount) || +amount <= 0) return Alert.alert('Validation', 'Enter a valid amount');
    setLoading(true);
    try {
      await API.addExpense({ vehicleId, amount: +amount, category: cat, description: desc, date: date.toISOString().split('T')[0] });
      reset(); onSuccess(); onClose();
    } catch (e) { Alert.alert('Error', e?.response?.data?.error || e.message || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Add Expense</Text>
            <Text style={s.label}>Amount (R)</Text>
            <TextInput style={s.input} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={c.textMuted} />
            <Text style={s.label}>Category</Text>
            <View style={s.chips}>{CATS.map(ct => (
              <TouchableOpacity key={ct} style={[s.chip, cat === ct && s.chipOn]} onPress={() => setCat(ct)}>
                <Text style={[s.chipTxt, cat === ct && s.chipTxtOn]}>{ct}</Text>
              </TouchableOpacity>
            ))}</View>
            <DatePickerField label="Date" date={date} onChange={setDate} c={c} s={s} />
            <Text style={s.label}>Description (optional)</Text>
            <TextInput style={[s.input, { height: 70 }]} multiline value={desc} onChangeText={setDesc} placeholder="Details..." placeholderTextColor={c.textMuted} />
            <View style={s.row2}>
              <TouchableOpacity style={s.btnGhost} onPress={() => { reset(); onClose(); }}><Text style={s.btnGhostTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, { backgroundColor: '#ef4444' }]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryTxt}>Add Expense</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function MaintenanceModal({ visible, vehicleId, ownerId, onClose, onSuccess, c, s }) {
  const [cat, setCat] = useState('Engine');
  const [loc, setLoc] = useState('');
  const [desc, setDesc] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const CATS = ['Engine', 'Brakes', 'Tires', 'Oil Change', 'Electrical', 'Body Work', 'Other'];

  function reset() { setCat('Engine'); setLoc(''); setDesc(''); setPreferredDate(new Date()); }

  async function submit() {
    if (!loc.trim() || !desc.trim()) return Alert.alert('Validation', 'Location and description are required');
    setLoading(true);
    try {
      await API.addMaintenance({
        ownerId: ownerId || '00000000-0000-0000-0000-000000000000',
        vehicleId, category: cat, location: loc, description: desc,
        mediaUrls: '', callOutRequired: false,
        preferredTime: preferredDate.toISOString(),
        state: 'Pending',
      });
      reset(); onSuccess(); onClose();
    } catch (e) { Alert.alert('Error', e?.response?.data?.error || e.message || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>New Maintenance Request</Text>
            <Text style={s.label}>Category</Text>
            <View style={s.chips}>{CATS.map(ct => (
              <TouchableOpacity key={ct} style={[s.chip, cat === ct && s.chipOn]} onPress={() => setCat(ct)}>
                <Text style={[s.chipTxt, cat === ct && s.chipTxtOn]}>{ct}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={s.label}>Location *</Text>
            <TextInput style={s.input} value={loc} onChangeText={setLoc} placeholder="Where is the vehicle?" placeholderTextColor={c.textMuted} />
            <DatePickerField label="Preferred Date" date={preferredDate} onChange={setPreferredDate} c={c} s={s} />
            <Text style={s.label}>Description *</Text>
            <TextInput style={[s.input, { height: 90 }]} multiline value={desc} onChangeText={setDesc} placeholder="Describe the issue..." placeholderTextColor={c.textMuted} />
            <View style={s.row2}>
              <TouchableOpacity style={s.btnGhost} onPress={() => { reset(); onClose(); }}><Text style={s.btnGhostTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, { backgroundColor: '#f59e0b' }]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryTxt}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function EditMaintenanceModal({ visible, request, onClose, onSuccess, c, s }) {
  const [cat, setCat] = useState('Engine');
  const [loc, setLoc] = useState('');
  const [desc, setDesc] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const CATS = ['Engine', 'Brakes', 'Tires', 'Oil Change', 'Electrical', 'Body Work', 'Other'];

  useEffect(() => {
    if (request) {
      setCat(request.category || 'Engine');
      setLoc(request.location || '');
      setDesc(request.description || '');
      setPreferredDate(request.preferredTime ? new Date(request.preferredTime) : new Date());
    }
  }, [request]);

  async function submit() {
    if (!loc.trim() || !desc.trim()) return Alert.alert('Validation', 'Location and description are required');
    setLoading(true);
    try {
      await API.editMaintenance(request.id, {
        category: cat, location: loc, description: desc,
        preferredTime: preferredDate.toISOString(),
        callOutRequired: request.callOutRequired || false,
        priority: request.priority || null,
      });
      onSuccess(); onClose();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.response?.data?.error || e.message || 'Failed to update');
    }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Edit Request</Text>
            <Text style={s.label}>Category</Text>
            <View style={s.chips}>{CATS.map(ct => (
              <TouchableOpacity key={ct} style={[s.chip, cat === ct && s.chipOn]} onPress={() => setCat(ct)}>
                <Text style={[s.chipTxt, cat === ct && s.chipTxtOn]}>{ct}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={s.label}>Location *</Text>
            <TextInput style={s.input} value={loc} onChangeText={setLoc} placeholder="Where is the vehicle?" placeholderTextColor={c.textMuted} />
            <DatePickerField label="Preferred Date" date={preferredDate} onChange={setPreferredDate} c={c} s={s} />
            <Text style={s.label}>Description *</Text>
            <TextInput style={[s.input, { height: 90 }]} multiline value={desc} onChangeText={setDesc} placeholder="Describe the issue..." placeholderTextColor={c.textMuted} />
            <View style={s.row2}>
              <TouchableOpacity style={s.btnGhost} onPress={onClose}><Text style={s.btnGhostTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, { backgroundColor: '#f59e0b' }]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Vehicle Details Card ─────────────────────────────────────────────────────
function VehicleDetailsCard({ vehicle, c, s }) {
  const [expanded, setExpanded] = useState(false);

  function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function daysUntil(d) {
    if (!d) return null;
    return Math.ceil((new Date(d) - new Date()) / 86400000);
  }

  function serviceUrgency(d) {
    const days = daysUntil(d);
    if (days === null) return null;
    if (days < 0) return { color: '#ef4444', label: 'Overdue' };
    if (days <= 7) return { color: '#ef4444', label: `${days}d` };
    if (days <= 30) return { color: '#f59e0b', label: `${days}d` };
    return { color: '#22c55e', label: `${days}d` };
  }

  const nextServiceUrgency = serviceUrgency(vehicle?.nextServiceDate);
  const nextMaintUrgency = serviceUrgency(vehicle?.nextMaintenanceDate);

  if (!vehicle) {
    return (
      <View style={s.card}>
        <View style={s.cardHead}>
          <Ionicons name="car-sport" size={18} color={c.primary} />
          <Text style={s.cardTitle}>Assigned Vehicle</Text>
        </View>
        <View style={s.vehEmpty}>
          <Ionicons name="car-outline" size={40} color={c.textMuted} />
          <Text style={s.vehEmptyTxt}>No vehicle assigned to your account</Text>
          <Text style={s.vehEmptySub}>Contact your fleet manager to get assigned</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {/* Header row */}
      <View style={s.cardHead}>
        <Ionicons name="car-sport" size={18} color={c.primary} />
        <Text style={s.cardTitle}>Assigned Vehicle</Text>
        {vehicle.status ? (
          <View style={[s.vehStatusBadge, { backgroundColor: vehicle.status.toLowerCase() === 'active' ? '#22c55e22' : '#f59e0b22', borderColor: vehicle.status.toLowerCase() === 'active' ? '#22c55e' : '#f59e0b' }]}>
            <Text style={[s.vehStatusTxt, { color: vehicle.status.toLowerCase() === 'active' ? '#22c55e' : '#f59e0b' }]}>{vehicle.status}</Text>
          </View>
        ) : null}
      </View>

      {/* Make / Model hero */}
      <Text style={s.vehMain}>{vehicle.make} {vehicle.model}</Text>
      <Text style={s.vehSub}>{vehicle.year ? `${vehicle.year}  ·  ` : ''}{vehicle.type || ''}</Text>

      {/* Registration plate */}
      {vehicle.registration ? (
        <View style={s.plateBadge}>
          <Text style={s.plateTxt}>{vehicle.registration}</Text>
        </View>
      ) : null}

      {/* Always-visible key facts */}
      <View style={s.vehGrid}>
        {vehicle.odometer > 0 || vehicle.mileage > 0 ? (
          <View style={s.vehGridItem}>
            <Ionicons name="speedometer-outline" size={16} color={c.primary} />
            <Text style={s.vehGridVal}>{(vehicle.odometer || vehicle.mileage || 0).toLocaleString()} km</Text>
            <Text style={s.vehGridLbl}>Odometer</Text>
          </View>
        ) : null}
        {vehicle.capacity > 0 ? (
          <View style={s.vehGridItem}>
            <Ionicons name="people-outline" size={16} color={c.primary} />
            <Text style={s.vehGridVal}>{vehicle.capacity}</Text>
            <Text style={s.vehGridLbl}>Capacity</Text>
          </View>
        ) : null}
        {vehicle.serviceIntervalKm > 0 ? (
          <View style={s.vehGridItem}>
            <Ionicons name="repeat-outline" size={16} color={c.primary} />
            <Text style={s.vehGridVal}>{vehicle.serviceIntervalKm.toLocaleString()} km</Text>
            <Text style={s.vehGridLbl}>Service Interval</Text>
          </View>
        ) : null}
      </View>

      {/* Service alerts */}
      {(nextServiceUrgency || nextMaintUrgency) && (
        <View style={s.serviceAlerts}>
          {vehicle.nextServiceDate && (
            <View style={[s.serviceAlert, { borderColor: nextServiceUrgency.color + '55', backgroundColor: nextServiceUrgency.color + '11' }]}>
              <Ionicons name="build-outline" size={14} color={nextServiceUrgency.color} />
              <Text style={[s.serviceAlertTxt, { color: nextServiceUrgency.color }]}>
                Next service: {fmtDate(vehicle.nextServiceDate)}
                {nextServiceUrgency.label === 'Overdue' ? '  ⚠ Overdue' : `  (${nextServiceUrgency.label})`}
              </Text>
            </View>
          )}
          {vehicle.nextMaintenanceDate && (
            <View style={[s.serviceAlert, { borderColor: nextMaintUrgency.color + '55', backgroundColor: nextMaintUrgency.color + '11' }]}>
              <Ionicons name="construct-outline" size={14} color={nextMaintUrgency.color} />
              <Text style={[s.serviceAlertTxt, { color: nextMaintUrgency.color }]}>
                Next maintenance: {fmtDate(vehicle.nextMaintenanceDate)}
                {nextMaintUrgency.label === 'Overdue' ? '  ⚠ Overdue' : `  (${nextMaintUrgency.label})`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Expandable details */}
      <TouchableOpacity style={s.expandBtn} onPress={() => setExpanded(e => !e)}>
        <Text style={s.expandTxt}>{expanded ? 'Show less' : 'Show full details'}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.primary} />
      </TouchableOpacity>

      {expanded && (
        <View style={s.detailRows}>
          {vehicle.vin ? <DetailRow icon="barcode-outline" label="VIN" value={vehicle.vin} c={c} s={s} /> : null}
          {vehicle.engineNumber ? <DetailRow icon="cog-outline" label="Engine Number" value={vehicle.engineNumber} c={c} s={s} /> : null}
          {vehicle.baseLocation ? <DetailRow icon="location-outline" label="Base Location" value={vehicle.baseLocation} c={c} s={s} /> : null}
          {vehicle.lastServiceDate ? <DetailRow icon="calendar-outline" label="Last Service" value={fmtDate(vehicle.lastServiceDate)} c={c} s={s} /> : null}
          {vehicle.nextServiceDate ? <DetailRow icon="calendar-outline" label="Next Service" value={fmtDate(vehicle.nextServiceDate)} highlight={nextServiceUrgency?.color} c={c} s={s} /> : null}
          {vehicle.lastMaintenanceDate ? <DetailRow icon="construct-outline" label="Last Maintenance" value={fmtDate(vehicle.lastMaintenanceDate)} c={c} s={s} /> : null}
          {vehicle.nextMaintenanceDate ? <DetailRow icon="construct-outline" label="Next Maintenance" value={fmtDate(vehicle.nextMaintenanceDate)} highlight={nextMaintUrgency?.color} c={c} s={s} /> : null}
        </View>
      )}
    </View>
  );
}

function DetailRow({ icon, label, value, highlight, c, s }) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon} size={15} color={highlight || c.textMuted} style={{ width: 22 }} />
      <Text style={s.detailLbl}>{label}</Text>
      <Text style={[s.detailVal, highlight && { color: highlight, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

// ── Tab screens ──────────────────────────────────────────────────────────────
function OverviewTab({ profile, vehicle, earnings, expenses, maintenance, onToggle, onAddEarning, onAddExpense, refreshing, onRefresh, c, s }) {
  const { name: month } = monthRange();
  const earn = earnings.reduce((a, e) => a + (e.amount || 0), 0);
  const exp = expenses.reduce((a, e) => a + (e.amount || 0), 0);
  const profit = earn - exp;
  const pending = maintenance.filter(r => ['open', 'pending'].includes((r.state || '').toLowerCase())).length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>

      {/* Online toggle */}
      <TouchableOpacity style={[s.banner, { backgroundColor: profile?.isAvailable ? '#22c55e' : '#64748b' }]} onPress={onToggle}>
        <Ionicons name={profile?.isAvailable ? 'radio-button-on' : 'radio-button-off'} size={20} color="#fff" />
        <Text style={s.bannerTxt}>
          {profile?.isAvailable ? 'You are Online — Tap to go Offline' : 'You are Offline — Tap to go Online'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#fff" />
      </TouchableOpacity>

      {/* Vehicle Details */}
      <VehicleDetailsCard vehicle={vehicle} c={c} s={s} />

      {/* Monthly stats */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Ionicons name="bar-chart" size={18} color={c.primary} />
          <Text style={s.cardTitle}>{month}</Text>
        </View>
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statLbl}>Earnings</Text>
            <Text style={[s.statVal, { color: '#22c55e' }]}>{fmt(earn)}</Text>
            <Text style={s.statSub}>{earnings.length} entries</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.stat}>
            <Text style={s.statLbl}>Expenses</Text>
            <Text style={[s.statVal, { color: '#ef4444' }]}>{fmt(exp)}</Text>
            <Text style={s.statSub}>{expenses.length} entries</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.stat}>
            <Text style={s.statLbl}>Profit</Text>
            <Text style={[s.statVal, { color: profit >= 0 ? '#22c55e' : '#ef4444' }]}>{fmt(profit)}</Text>
            <Text style={s.statSub}>this month</Text>
          </View>
        </View>
      </View>

      {/* Quick actions */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Ionicons name="flash" size={18} color={c.primary} />
          <Text style={s.cardTitle}>Quick Actions</Text>
        </View>
        <View style={s.qRow}>
          <TouchableOpacity style={s.qBtn} onPress={vehicle ? onAddEarning : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log earnings. Contact your fleet manager.')}>
            <Ionicons name="add-circle" size={30} color={vehicle ? '#22c55e' : c.textMuted} />
            <Text style={[s.qTxt, !vehicle && { color: c.textMuted }]}>Add Earning</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.qBtn} onPress={vehicle ? onAddExpense : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log expenses. Contact your fleet manager.')}>
            <Ionicons name="remove-circle" size={30} color={vehicle ? '#ef4444' : c.textMuted} />
            <Text style={[s.qTxt, !vehicle && { color: c.textMuted }]}>Add Expense</Text>
          </TouchableOpacity>
          <View style={s.qBtn}>
            <Ionicons name="construct" size={30} color={pending > 0 ? '#f59e0b' : c.textMuted} />
            <Text style={[s.qTxt, { color: pending > 0 ? '#f59e0b' : c.textMuted }]}>
              {pending} Pending
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function MaintenanceTab({ maintenance, vehicle, profile, onNew, onEdit, onDelete, refreshing, onRefresh, c, s }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
      <View style={s.secHead}>
        <Text style={s.secTitle}>Maintenance Requests</Text>
        <TouchableOpacity style={[s.btnSm, !vehicle && { opacity: 0.4 }]}
          onPress={vehicle ? onNew : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to submit a request')}>
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={s.btnSmTxt}>New Request</Text>
        </TouchableOpacity>
      </View>

      {maintenance.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="construct-outline" size={48} color={c.textMuted} />
          <Text style={s.emptyTitle}>No Requests</Text>
          <Text style={s.emptyTxt}>No maintenance requests found for your vehicle</Text>
        </View>
      ) : maintenance.map((r, i) => {
        const col = statusColor(r.state || r.status);
        const state = (r.state || r.status || '').toLowerCase();
        const canEdit = state === 'pending';
        return (
          <View key={r.id || i} style={s.reqCard}>
            <View style={s.reqHead}>
              <View style={[s.dot, { backgroundColor: col }]} />
              <Text style={s.reqCat}>{r.category || 'General'}</Text>
              <View style={[s.badge, { backgroundColor: col + '22', borderColor: col }]}>
                <Text style={[s.badgeTxt, { color: col }]}>{r.state || r.status || 'Open'}</Text>
              </View>
              {canEdit && (
                <TouchableOpacity style={s.editBtn} onPress={() => onEdit(r)}>
                  <Ionicons name="pencil-outline" size={13} color={c.primary} />
                  <Text style={s.editBtnTxt}>Edit</Text>
                </TouchableOpacity>
              )}
              {canEdit && (
                <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(r)}>
                  <Ionicons name="trash-outline" size={13} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
            {r.description ? <Text style={s.reqDesc} numberOfLines={2}>{r.description}</Text> : null}
            <View style={s.reqMeta}>
              <Ionicons name="location-outline" size={11} color={c.textMuted} />
              <Text style={s.metaTxt}>{r.location || 'No location'}</Text>
              <Text style={s.metaSep}>·</Text>
              <Ionicons name="time-outline" size={11} color={c.textMuted} />
              <Text style={s.metaTxt}>{r.preferredTime ? new Date(r.preferredTime).toLocaleDateString() : r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function EarningsTab({ earnings, expenses, vehicleId, onAddEarning, onAddExpense, refreshing, onRefresh, c, s }) {
  const [list, setList] = useState('earnings');
  const earn = earnings.reduce((a, e) => a + (e.amount || 0), 0);
  const exp = expenses.reduce((a, e) => a + (e.amount || 0), 0);
  const profit = earn - exp;
  const items = list === 'earnings' ? earnings : expenses;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
      {/* Summary */}
      <View style={s.card}>
        <View style={s.statsRow}>
          <View style={s.stat}><Text style={s.statLbl}>Earnings</Text><Text style={[s.statVal, { color: '#22c55e' }]}>{fmt(earn)}</Text></View>
          <View style={s.statDiv} />
          <View style={s.stat}><Text style={s.statLbl}>Expenses</Text><Text style={[s.statVal, { color: '#ef4444' }]}>{fmt(exp)}</Text></View>
          <View style={s.statDiv} />
          <View style={s.stat}><Text style={s.statLbl}>Profit</Text><Text style={[s.statVal, { color: profit >= 0 ? '#22c55e' : '#ef4444' }]}>{fmt(profit)}</Text></View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={s.row2}>
        <TouchableOpacity style={s.actBtn} onPress={vehicleId ? onAddEarning : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log earnings.')}>
          <Ionicons name="add-circle-outline" size={18} color={vehicleId ? '#22c55e' : c.textMuted} />
          <Text style={[s.actTxt, { color: vehicleId ? '#22c55e' : c.textMuted }]}>Add Earning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actBtn} onPress={vehicleId ? onAddExpense : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log expenses.')}>
          <Ionicons name="remove-circle-outline" size={18} color={vehicleId ? '#ef4444' : c.textMuted} />
          <Text style={[s.actTxt, { color: vehicleId ? '#ef4444' : c.textMuted }]}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={s.toggle}>
        <TouchableOpacity style={[s.tBtn, list === 'earnings' && s.tBtnOn]} onPress={() => setList('earnings')}>
          <Text style={[s.tTxt, list === 'earnings' && s.tTxtOn]}>Earnings ({earnings.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tBtn, list === 'expenses' && s.tBtnOn]} onPress={() => setList('expenses')}>
          <Text style={[s.tTxt, list === 'expenses' && s.tTxtOn]}>Expenses ({expenses.length})</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {items.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={48} color={c.textMuted} />
          <Text style={s.emptyTitle}>No {list}</Text>
          <Text style={s.emptyTxt}>Nothing logged for this month yet</Text>
        </View>
      ) : items.map((item, i) => (
        <View key={item.id || i} style={s.ledger}>
          <View style={[s.ledgerIcon, { backgroundColor: list === 'earnings' ? '#22c55e22' : '#ef444422' }]}>
            <Ionicons name={list === 'earnings' ? 'trending-up' : 'trending-down'} size={16} color={list === 'earnings' ? '#22c55e' : '#ef4444'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ledgerLbl}>{item.source || item.category || 'Entry'}</Text>
            {item.description ? <Text style={s.ledgerDesc} numberOfLines={1}>{item.description}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.ledgerAmt, { color: list === 'earnings' ? '#22c55e' : '#ef4444' }]}>
              {list === 'earnings' ? '+' : '-'}{fmt(item.amount)}
            </Text>
            <Text style={s.ledgerDate}>{item.date ? new Date(item.date).toLocaleDateString() : ''}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function MessagesTab({ userId, c, s }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await API.getMessages(userId);
      setMsgs(Array.isArray(r.data) ? r.data : []);
    } catch { setMsgs([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={c.primary} /></View>;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
      <Text style={s.secTitle}>Messages</Text>
      {msgs.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={c.textMuted} />
          <Text style={s.emptyTitle}>No Messages</Text>
          <Text style={s.emptyTxt}>You have no messages yet</Text>
        </View>
      ) : msgs.map((m, i) => (
        <View key={m.id || i} style={s.msgRow}>
          <View style={[s.avatar, { backgroundColor: c.primary }]}>
            <Text style={s.avatarTxt}>{((m.senderName || m.subject || '?')[0]).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.msgFrom}>{m.senderName || m.subject || 'Message'}</Text>
            <Text style={s.msgPrev} numberOfLines={1}>{m.body || m.content || m.lastMessage || ''}</Text>
          </View>
          {!m.isRead && <View style={s.unread} />}
        </View>
      ))}
    </ScrollView>
  );
}

function ProfileTab({ profile, user, vehicle, onToggle, onLogout, mode, setMode, c, s }) {
  const initial = (profile?.name || user?.fullName || 'D')[0].toUpperCase();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Avatar + name */}
      <View style={s.profHeader}>
        <View style={s.profAvatar}>
          <Text style={s.profAvatarTxt}>{initial}</Text>
        </View>
        <Text style={s.profName}>{profile?.name || user?.fullName || 'Driver'}</Text>
        <Text style={s.profEmail}>{profile?.email || user?.email || ''}</Text>
        <TouchableOpacity
          style={[s.onBadge, profile?.isAvailable ? s.onBadgeGreen : s.onBadgeGrey, { marginTop: 10, alignSelf: 'center' }]}
          onPress={onToggle}>
          <View style={[s.onDot, { backgroundColor: profile?.isAvailable ? '#22c55e' : '#9ca3af' }]} />
          <Text style={s.onTxt}>{profile?.isAvailable ? 'Online' : 'Offline'}</Text>
        </TouchableOpacity>
      </View>

      {/* Info rows */}
      <View style={s.profSection}>
        {profile?.phone ? (
          <View style={s.profRow}>
            <Ionicons name="call-outline" size={18} color={c.primary} />
            <Text style={s.profRowTxt}>{profile.phone}</Text>
          </View>
        ) : null}
        {profile?.category ? (
          <View style={s.profRow}>
            <Ionicons name="card-outline" size={18} color={c.primary} />
            <Text style={s.profRowTxt}>Licence: {profile.category}</Text>
          </View>
        ) : null}
        {profile?.hasPdp ? (
          <View style={s.profRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
            <Text style={s.profRowTxt}>PDP Holder</Text>
          </View>
        ) : null}
        {vehicle ? (
          <View style={s.profRow}>
            <Ionicons name="car-outline" size={18} color={c.primary} />
            <Text style={s.profRowTxt}>{vehicle.make || vehicle.Make} {vehicle.model || vehicle.Model} · {vehicle.registration || vehicle.Registration}</Text>
          </View>
        ) : (
          <View style={s.profRow}>
            <Ionicons name="car-outline" size={18} color={c.textMuted} />
            <Text style={[s.profRowTxt, { color: c.textMuted }]}>No vehicle assigned</Text>
          </View>
        )}
      </View>

      {/* Theme toggle */}
      <TouchableOpacity style={s.profActionRow} onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
        <View style={s.profActionIcon}>
          <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={c.primary} />
        </View>
        <Text style={s.profActionTxt}>{mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={s.logoutTxt}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function DriverDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { theme, mode, setMode } = useAppTheme();
  const c = theme.colors;
  const s = useMemo(() => createStyles(c), [c]);

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  const [earnModal, setEarnModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [maintModal, setMaintModal] = useState(false);
  const [editMaintModal, setEditMaintModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const profResp = await API.getDriverProfiles();
      const prof = Array.isArray(profResp.data) ? profResp.data.find(d => d.userId === user.id) : null;
      setProfile(prof);

      let veh = null;
      try {
        const ZERO = '00000000-0000-0000-0000-000000000000';
        const assignedId = prof?.assignedVehicleId;
        if (assignedId && assignedId !== ZERO) {
          const vehResp = await API.getVehicles();
          const all = Array.isArray(vehResp.data) ? vehResp.data : [];
          veh = all.find(v =>
            (v.id || v.Id || '').toLowerCase() === assignedId.toLowerCase()
          ) || null;
        }
        setVehicle(veh);
      } catch {}

      if (veh) {
        const { start, end } = monthRange();
        try {
          const [er, ex] = await Promise.all([
            API.getEarnings(veh.id, start, end),
            API.getExpenses(veh.id, start, end),
          ]);
          setEarnings(Array.isArray(er.data) ? er.data : []);
          setExpenses(Array.isArray(ex.data) ? ex.data : []);
        } catch { setEarnings([]); setExpenses([]); }

        try {
          const mr = await API.getMaintenance();
          const all = Array.isArray(mr.data) ? mr.data : [];
          setMaintenance(all.filter(r => r.vehicleId === veh.id));
        } catch { setMaintenance([]); }
      }
    } catch (e) {
      console.warn('Driver dashboard load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function toggleAvailability() {
    if (!profile) return;
    try {
      await API.updateDriverProfile(profile.id, { ...profile, isAvailable: !profile.isAvailable });
      setProfile(p => ({ ...p, isAvailable: !p.isAvailable }));
    } catch { Alert.alert('Error', 'Could not update availability'); }
  }

  async function logout() {
    try { await signOut(); } catch {}
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
  }

  const pendingCount = maintenance.filter(r => ['open', 'pending'].includes((r.state || '').toLowerCase())).length;

  const TABS = [
    { key: 'overview', label: 'Overview', icon: 'grid-outline', activeIcon: 'grid' },
    { key: 'maintenance', label: 'Maintenance', icon: 'construct-outline', activeIcon: 'construct', badge: pendingCount },
    { key: 'earnings', label: 'Earnings', icon: 'wallet-outline', activeIcon: 'wallet' },
    { key: 'messages', label: 'Messages', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
    { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[s.muted, { marginTop: 14 }]}>Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>Hello, {profile?.name?.split(' ')[0] || user?.fullName?.split(' ')[0] || 'Driver'} 👋</Text>
          <Text style={s.subhead}>Driver Portal</Text>
        </View>
        <TouchableOpacity style={[s.onBadge, profile?.isAvailable ? s.onBadgeGreen : s.onBadgeGrey]} onPress={toggleAvailability}>
          <View style={[s.onDot, { backgroundColor: profile?.isAvailable ? '#22c55e' : '#9ca3af' }]} />
          <Text style={s.onTxt}>{profile?.isAvailable ? 'Online' : 'Offline'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 6 }} onPress={() => setTab('profile')}>
          <Ionicons name="person-circle-outline" size={26} color={tab === 'profile' ? c.primary : c.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {tab === 'overview' && (
          <OverviewTab profile={profile} vehicle={vehicle} earnings={earnings} expenses={expenses} maintenance={maintenance}
            onToggle={toggleAvailability} onAddEarning={() => setEarnModal(true)} onAddExpense={() => setExpModal(true)}
            refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} c={c} s={s} />
        )}
        {tab === 'maintenance' && (
          <MaintenanceTab maintenance={maintenance} vehicle={vehicle} profile={profile} onNew={() => setMaintModal(true)}
            onEdit={r => { setEditingRequest(r); setEditMaintModal(true); }}
            onDelete={async r => {
              let confirmed = false;
              if (Platform.OS === 'web') {
                confirmed = window.confirm('Delete this maintenance request?');
              } else {
                confirmed = await new Promise(resolve =>
                  Alert.alert('Delete Request', 'Are you sure you want to delete this request?', [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
                  ])
                );
              }
              if (!confirmed) return;
              try {
                await API.deleteMaintenance(r.id);
                load();
              } catch (e) {
                Alert.alert('Error', e?.response?.data?.message || 'Could not delete request');
              }
            }}
            refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} c={c} s={s} />
        )}
        {tab === 'earnings' && (
          <EarningsTab earnings={earnings} expenses={expenses} vehicleId={vehicle?.id}
            onAddEarning={() => setEarnModal(true)} onAddExpense={() => setExpModal(true)}
            refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} c={c} s={s} />
        )}
        {tab === 'messages' && <MessagesTab userId={user?.id} c={c} s={s} />}
        {tab === 'profile' && (
          <ProfileTab profile={profile} user={user} vehicle={vehicle}
            onToggle={toggleAvailability} onLogout={logout}
            mode={mode} setMode={setMode} c={c} s={s} />
        )}
      </View>

      {/* Bottom tab bar */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
            <View>
              <Ionicons name={tab === t.key ? t.activeIcon : t.icon} size={22} color={tab === t.key ? c.primary : c.textMuted} />
              {t.badge > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeTxt}>{t.badge}</Text></View>
              )}
            </View>
            <Text style={[s.tabLbl, tab === t.key && { color: c.primary }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modals */}
      <AddEarningModal visible={earnModal} vehicleId={vehicle?.id} onClose={() => setEarnModal(false)} onSuccess={load} c={c} s={s} />
      <AddExpenseModal visible={expModal} vehicleId={vehicle?.id} onClose={() => setExpModal(false)} onSuccess={load} c={c} s={s} />
      <MaintenanceModal visible={maintModal} vehicleId={vehicle?.id} ownerId={vehicle?.ownerId} onClose={() => setMaintModal(false)} onSuccess={load} c={c} s={s} />
      <EditMaintenanceModal visible={editMaintModal} request={editingRequest} onClose={() => { setEditMaintModal(false); setEditingRequest(null); }} onSuccess={load} c={c} s={s} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 48, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    greeting: { fontSize: 16, fontWeight: '800', color: c.text },
    subhead: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    onBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, marginRight: 8, borderWidth: 1 },
    onBadgeGreen: { backgroundColor: '#22c55e18', borderColor: '#22c55e' },
    onBadgeGrey: { backgroundColor: c.surface2, borderColor: c.border },
    onDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
    onTxt: { fontSize: 12, fontWeight: '700', color: c.text },

    // Card
    card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '800', color: c.text, marginLeft: 8 },

    // Banner
    banner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 12 },
    bannerTxt: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 10 },

    // Vehicle card
    vehMain: { fontSize: 20, fontWeight: '900', color: c.text },
    vehSub: { fontSize: 13, color: c.textMuted, marginTop: 2, marginBottom: 10 },
    vehStatusBadge: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
    vehStatusTxt: { fontSize: 10, fontWeight: '800' },
    vehEmpty: { alignItems: 'center', paddingVertical: 24 },
    vehEmptyTxt: { fontSize: 14, fontWeight: '700', color: c.textMuted, marginTop: 10 },
    vehEmptySub: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    plateBadge: { alignSelf: 'flex-start', backgroundColor: c.background, borderWidth: 2, borderColor: c.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
    plateTxt: { fontSize: 17, fontWeight: '900', color: c.text, letterSpacing: 3 },
    vehGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    vehGridItem: { flex: 1, alignItems: 'center', backgroundColor: c.background, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: c.border },
    vehGridVal: { fontSize: 13, fontWeight: '800', color: c.text, marginTop: 4 },
    vehGridLbl: { fontSize: 10, color: c.textMuted, marginTop: 2 },
    serviceAlerts: { gap: 6, marginBottom: 10 },
    serviceAlert: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, gap: 8 },
    serviceAlertTxt: { fontSize: 12, fontWeight: '600', flex: 1 },
    expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 8, gap: 4, borderTopWidth: 1, borderTopColor: c.border, marginTop: 4 },
    expandTxt: { fontSize: 12, fontWeight: '700', color: c.primary },
    detailRows: { marginTop: 12, gap: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    detailLbl: { flex: 1, fontSize: 12, color: c.textMuted, marginLeft: 6 },
    detailVal: { fontSize: 12, fontWeight: '700', color: c.text, textAlign: 'right', flexShrink: 1, maxWidth: '55%' },

    // Stats
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    statLbl: { fontSize: 11, color: c.textMuted, fontWeight: '600', marginBottom: 4 },
    statVal: { fontSize: 17, fontWeight: '900' },
    statSub: { fontSize: 10, color: c.textMuted, marginTop: 2 },
    statDiv: { width: 1, height: 44, backgroundColor: c.border },

    // Quick actions
    qRow: { flexDirection: 'row', justifyContent: 'space-around' },
    qBtn: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
    qBtnDim: { opacity: 0.4 },
    qTxt: { fontSize: 11, fontWeight: '700', color: c.text, marginTop: 4 },

    // Section header
    secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    secTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 12 },

    // Buttons
    btnSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
    btnSmTxt: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 4 },
    row2: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12 },
    actTxt: { fontWeight: '700', fontSize: 13, marginLeft: 6 },
    btnPrimary: { flex: 1, backgroundColor: c.primary, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnPrimaryTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
    btnGhost: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: c.border, marginRight: 8 },
    btnGhostTxt: { color: c.text, fontWeight: '700', fontSize: 15 },

    // Toggle
    toggle: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 10, padding: 3, marginBottom: 16 },
    tBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tBtnOn: { backgroundColor: c.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
    tTxt: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    tTxtOn: { color: c.text, fontWeight: '800' },

    // Ledger
    ledger: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    ledgerIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    ledgerLbl: { fontSize: 13, fontWeight: '700', color: c.text },
    ledgerDesc: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    ledgerAmt: { fontSize: 14, fontWeight: '900' },
    ledgerDate: { fontSize: 10, color: c.textMuted, marginTop: 1 },

    // Maintenance request card
    reqCard: { backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    reqHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    reqCat: { flex: 1, fontSize: 14, fontWeight: '800', color: c.text },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    badgeTxt: { fontSize: 10, fontWeight: '700' },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: c.primary, marginLeft: 6 },
    editBtnTxt: { fontSize: 11, fontWeight: '700', color: c.primary },
    deleteBtn: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
    reqDesc: { fontSize: 12, color: c.textMuted, marginBottom: 8 },
    reqMeta: { flexDirection: 'row', alignItems: 'center' },
    metaTxt: { fontSize: 11, color: c.textMuted, marginLeft: 3 },
    metaSep: { fontSize: 11, color: c.textMuted, marginHorizontal: 5 },

    // Messages
    msgRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
    msgFrom: { fontSize: 13, fontWeight: '800', color: c.text },
    msgPrev: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    unread: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, marginLeft: 8 },

    // Empty state
    empty: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginTop: 12, marginBottom: 4 },
    emptyTxt: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
    muted: { fontSize: 13, color: c.textMuted },

    // Tab bar
    tabBar: { flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingBottom: 20, paddingTop: 8 },
    tabItem: { flex: 1, alignItems: 'center' },
    tabLbl: { fontSize: 10, fontWeight: '600', color: c.textMuted, marginTop: 3 },
    tabBadge: { position: 'absolute', top: -4, right: -10, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    tabBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    sheetTitle: { fontSize: 18, fontWeight: '900', color: c.text, marginBottom: 4 },
    label: { fontSize: 12, fontWeight: '700', color: c.textMuted, marginTop: 16, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, backgroundColor: c.background, color: c.text, fontSize: 14 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    chipOn: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { fontSize: 12, fontWeight: '600', color: c.textMuted },
    chipTxtOn: { color: '#fff' },

    // Profile tab
    profHeader: { alignItems: 'center', paddingVertical: 24 },
    profAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    profAvatarTxt: { fontSize: 34, fontWeight: '900', color: c.primaryText },
    profName: { fontSize: 20, fontWeight: '900', color: c.text },
    profEmail: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    profSection: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, marginBottom: 16 },
    profRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 },
    profRowTxt: { fontSize: 14, fontWeight: '600', color: c.text, flex: 1 },
    profActionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, gap: 12 },
    profActionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
    profActionTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 16, paddingVertical: 16, marginTop: 8, gap: 8 },
    logoutTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },
  });
}
