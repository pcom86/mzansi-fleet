import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CommonActions } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';
import { submitMechanicalRequestReview } from '../api/reviews';
import { fetchDriverEvents } from '../api/driverBehavior';
import RatingReviewModal from './RatingReviewModal';
import ThemeToggle from '../components/ThemeToggle';
import { startMonitoring, stopMonitoring, isMonitoring, getCurrentSpeed } from '../services/DrivingMonitorService';

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
          <View style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }]}>
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
function OverviewTab({ profile, vehicle, earnings, expenses, maintenance, onToggle, onAddEarning, onAddExpense, refreshing, onRefresh, monitorActive, monitorSpeed, recentBehaviorEvents, c, s }) {
  const { name: month } = monthRange();
  const earn = earnings.reduce((a, e) => a + (e.amount || 0), 0);
  const exp = expenses.reduce((a, e) => a + (e.amount || 0), 0);
  const profit = earn - exp;
  const pending = maintenance.filter(r => ['open', 'pending'].includes((r.state || '').toLowerCase())).length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>

      {/* Online/Offline hero toggle */}
      <TouchableOpacity
        style={[s.heroBanner, { backgroundColor: profile?.isAvailable ? '#22c55e' : '#64748b' }]}
        onPress={onToggle}
        activeOpacity={0.85}>
        <View style={s.heroBannerIconWrap}>
          <Ionicons name={profile?.isAvailable ? 'radio-button-on' : 'radio-button-off'} size={24} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.heroBannerTitle}>{profile?.isAvailable ? 'You are Online' : 'You are Offline'}</Text>
          <Text style={s.heroBannerSub}>Tap to go {profile?.isAvailable ? 'Offline' : 'Online'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#ffffffcc" />
      </TouchableOpacity>

      {/* Driving Monitor Status */}
      {monitorActive && (
        <View style={s.monitorBanner}>
          <View style={s.monitorDot} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.monitorTitle}>Behavior Monitoring Active</Text>
            <Text style={s.monitorSub}>Sensors tracking driving patterns</Text>
          </View>
          <View style={s.monitorSpeedBadge}>
            <Text style={s.monitorSpeedTxt}>{monitorSpeed}</Text>
            <Text style={s.monitorSpeedUnit}>km/h</Text>
          </View>
        </View>
      )}

      {/* Recent Behavior Alerts */}
      {recentBehaviorEvents && recentBehaviorEvents.length > 0 && (
        <View style={s.behaviorAlertCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="alert-circle" size={16} color="#f59e0b" />
            <Text style={s.behaviorAlertTitle}>Recent Alerts</Text>
          </View>
          {recentBehaviorEvents.slice(0, 3).map((evt, i) => {
            const isPos = evt.eventType === 'Positive';
            return (
              <View key={i} style={[s.behaviorAlertRow, { borderLeftColor: isPos ? '#22c55e' : '#ef4444' }]}>
                <Text style={[s.behaviorAlertCat, { color: isPos ? '#22c55e' : '#ef4444' }]}>{evt.category}</Text>
                <Text style={s.behaviorAlertDesc} numberOfLines={1}>{evt.description}</Text>
                <Text style={[s.behaviorAlertPts, { color: isPos ? '#22c55e' : '#ef4444' }]}>
                  {evt.pointsImpact > 0 ? '+' : ''}{evt.pointsImpact}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Vehicle Details */}
      <VehicleDetailsCard vehicle={vehicle} c={c} s={s} />

      {/* Hero profit card */}
      <View style={s.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>This Month's Profit</Text>
          <Text style={s.heroValue}>{fmt(profit)}</Text>
          <Text style={s.heroSub}>{month}</Text>
        </View>
        <View style={s.heroIconWrap}>
          <Ionicons name={profit >= 0 ? 'trending-up' : 'trending-down'} size={30} color="#fff" />
        </View>
      </View>

      {/* Metric grid */}
      <View style={s.metricsGrid}>
        {[
          { icon: 'arrow-up-circle-outline', color: '#10b981', label: 'Earnings',      value: fmt(earn),              sub: `${earnings.length} entries` },
          { icon: 'arrow-down-circle-outline', color: '#ef4444', label: 'Expenses',    value: fmt(exp),               sub: `${expenses.length} entries` },
          { icon: 'construct-outline',        color: '#f59e0b', label: 'Pending Maint', value: String(pending),        sub: 'requests' },
          { icon: 'car-sport-outline',        color: '#3b82f6', label: 'Vehicle',       value: vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Assigned' : 'None', sub: vehicle?.registration || 'Not assigned' },
        ].map(m => (
          <View key={m.label} style={s.metricCard}>
            <View style={[s.metricIcon, { backgroundColor: m.color + '20' }]}>
              <Ionicons name={m.icon} size={18} color={m.color} />
            </View>
            <Text style={s.metricValue} numberOfLines={1}>{m.value}</Text>
            <Text style={s.metricLabel}>{m.label}</Text>
            <Text style={s.metricSub}>{m.sub}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.quickActions}>
        <TouchableOpacity
          style={[s.quickActionBtn, !vehicle && { opacity: 0.45 }]}
          onPress={vehicle ? onAddEarning : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log earnings.')}>
          <View style={[s.quickActionIcon, { backgroundColor: '#10b98120' }]}>
            <Ionicons name="add-circle-outline" size={24} color="#10b981" />
          </View>
          <Text style={s.quickActionTxt}>Add Earning</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.quickActionBtn, !vehicle && { opacity: 0.45 }]}
          onPress={vehicle ? onAddExpense : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log expenses.')}>
          <View style={[s.quickActionIcon, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="remove-circle-outline" size={24} color="#ef4444" />
          </View>
          <Text style={s.quickActionTxt}>Add Expense</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MaintenanceTab({ maintenance, vehicle, profile, onNew, onEdit, onDelete, refreshing, onRefresh, c, s }) {
  const pending = maintenance.filter(r => ['open', 'pending'].includes((r.state || '').toLowerCase())).length;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
      <View style={s.secHead}>
        <View>
          <Text style={s.secTitle}>Maintenance Requests</Text>
          {pending > 0 && (
            <View style={[s.badge, { backgroundColor: '#f59e0b20', borderColor: '#f59e0b', alignSelf: 'flex-start', marginTop: 4 }]}>
              <Text style={[s.badgeTxt, { color: '#f59e0b' }]}>{pending} pending</Text>
            </View>
          )}
        </View>
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
          <View key={r.id || i} style={[s.reqCard, { borderLeftColor: col, borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={[s.reqIconWrap, { backgroundColor: col + '20' }]}>
                <Ionicons name="construct-outline" size={15} color={col} />
              </View>
              <Text style={[s.reqCat, { marginLeft: 10 }]}>{r.category || 'General'}</Text>
              <View style={[s.badge, { backgroundColor: col + '20', borderColor: col, marginLeft: 'auto' }]}>
                <Text style={[s.badgeTxt, { color: col }]}>{r.state || r.status || 'Open'}</Text>
              </View>
            </View>
            {r.description ? <Text style={s.reqDesc} numberOfLines={2}>{r.description}</Text> : null}
            <View style={s.reqMeta}>
              <Ionicons name="location-outline" size={11} color={c.textMuted} />
              <Text style={s.metaTxt}>{r.location || 'No location'}</Text>
              <Text style={s.metaSep}>·</Text>
              <Ionicons name="time-outline" size={11} color={c.textMuted} />
              <Text style={s.metaTxt}>{r.preferredTime ? new Date(r.preferredTime).toLocaleDateString() : r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</Text>
            </View>
            {canEdit && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity style={s.reqEditBtn} onPress={() => onEdit(r)}>
                  <Ionicons name="pencil-outline" size={13} color={c.primary} />
                  <Text style={s.reqEditBtnTxt}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.reqDeleteBtn} onPress={() => onDelete(r)}>
                  <Ionicons name="trash-outline" size={13} color="#ef4444" />
                  <Text style={s.reqDeleteBtnTxt}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            {state === 'completed' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[s.reqEditBtn, { borderColor: '#fbbf24' }]}
                  onPress={() => { setRatingRequest(r); setRatingModalVisible(true); }}
                >
                  <Ionicons name="star-outline" size={13} color="#fbbf24" />
                  <Text style={[s.reqEditBtnTxt, { color: '#fbbf24' }]}>Rate</Text>
                </TouchableOpacity>
              </View>
            )}
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

      {/* Hero summary */}
      <View style={s.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>Monthly Profit</Text>
          <Text style={s.heroValue}>{fmt(profit)}</Text>
          <Text style={s.heroSub}>{earnings.length} earns · {expenses.length} expenses</Text>
        </View>
        <View style={s.heroIconWrap}>
          <Ionicons name={profit >= 0 ? 'wallet' : 'wallet-outline'} size={30} color="#fff" />
        </View>
      </View>

      {/* E / X metric row */}
      <View style={s.earnSummaryRow}>
        <View style={s.earnSummaryItem}>
          <View style={[s.metricIcon, { backgroundColor: '#10b98120' }]}>
            <Ionicons name="arrow-up-circle-outline" size={18} color="#10b981" />
          </View>
          <Text style={[s.earnSummaryVal, { color: '#10b981' }]}>{fmt(earn)}</Text>
          <Text style={s.earnSummaryLbl}>Earnings</Text>
        </View>
        <View style={[s.earnSummaryItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.border }]}>
          <View style={[s.metricIcon, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="arrow-down-circle-outline" size={18} color="#ef4444" />
          </View>
          <Text style={[s.earnSummaryVal, { color: '#ef4444' }]}>{fmt(exp)}</Text>
          <Text style={s.earnSummaryLbl}>Expenses</Text>
        </View>
        <View style={s.earnSummaryItem}>
          <View style={[s.metricIcon, { backgroundColor: profit >= 0 ? '#10b98120' : '#ef444420' }]}>
            <Ionicons name={profit >= 0 ? 'trending-up' : 'trending-down'} size={18} color={profit >= 0 ? '#10b981' : '#ef4444'} />
          </View>
          <Text style={[s.earnSummaryVal, { color: profit >= 0 ? '#10b981' : '#ef4444' }]}>{fmt(profit)}</Text>
          <Text style={s.earnSummaryLbl}>Profit</Text>
        </View>
      </View>

      {/* Add buttons */}
      <View style={s.quickActions}>
        <TouchableOpacity
          style={[s.quickActionBtn, !vehicleId && { opacity: 0.45 }]}
          onPress={vehicleId ? onAddEarning : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log earnings.')}>
          <View style={[s.quickActionIcon, { backgroundColor: '#10b98120' }]}>
            <Ionicons name="add-circle-outline" size={22} color="#10b981" />
          </View>
          <Text style={s.quickActionTxt}>Add Earning</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.quickActionBtn, !vehicleId && { opacity: 0.45 }]}
          onPress={vehicleId ? onAddExpense : () => Alert.alert('No Vehicle', 'You need an assigned vehicle to log expenses.')}>
          <View style={[s.quickActionIcon, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="remove-circle-outline" size={22} color="#ef4444" />
          </View>
          <Text style={s.quickActionTxt}>Add Expense</Text>
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
          <View style={[s.ledgerIcon, { backgroundColor: list === 'earnings' ? '#10b98120' : '#ef444420' }]}>
            <Ionicons name={list === 'earnings' ? 'trending-up' : 'trending-down'} size={16} color={list === 'earnings' ? '#10b981' : '#ef4444'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ledgerLbl}>{item.source || item.category || 'Entry'}</Text>
            {item.description ? <Text style={s.ledgerDesc} numberOfLines={1}>{item.description}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.ledgerAmt, { color: list === 'earnings' ? '#10b981' : '#ef4444' }]}>
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

  const unread = msgs.filter(m => !m.isRead).length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>

      {unread > 0 && (
        <View style={s.unreadBanner}>
          <Ionicons name="mail-unread-outline" size={18} color="#92400e" />
          <Text style={s.unreadBannerTxt}>{unread} unread message{unread > 1 ? 's' : ''}</Text>
        </View>
      )}

      <Text style={s.secTitle}>Messages</Text>
      {msgs.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={c.textMuted} />
          <Text style={s.emptyTitle}>No Messages</Text>
          <Text style={s.emptyTxt}>You have no messages yet</Text>
        </View>
      ) : msgs.map((m, i) => (
        <View key={m.id || i} style={[s.msgRow, !m.isRead && { borderLeftColor: c.primary, borderLeftWidth: 3 }]}>
          <View style={[s.avatar, { backgroundColor: !m.isRead ? c.primary : c.surface2 }]}>
            <Text style={[s.avatarTxt, { color: !m.isRead ? '#fff' : c.text }]}>{((m.senderName || m.subject || '?')[0]).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[s.msgFrom, !m.isRead && { color: c.primary }]}>{m.senderName || m.subject || 'Message'}</Text>
              {m.createdAt && <Text style={s.msgDate}>{new Date(m.createdAt).toLocaleDateString()}</Text>}
            </View>
            <Text style={s.msgPrev} numberOfLines={1}>{m.body || m.content || m.lastMessage || ''}</Text>
          </View>
          {!m.isRead && <View style={s.unreadDot} />}
        </View>
      ))}
    </ScrollView>
  );
}

function ProfileTab({ profile, user, vehicle, behaviorEvents, ratings, onToggle, onLogout, mode, setMode, c, s }) {
  const initials = (profile?.name || user?.fullName || 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  
  // Calculate behavior score from events
  const behaviorScore = useMemo(() => {
    if (!behaviorEvents || behaviorEvents.length === 0) return 100;
    const totalPoints = behaviorEvents.reduce((sum, e) => sum + (e.pointsImpact || 0), 0);
    return Math.max(0, Math.min(100, 100 + totalPoints));
  }, [behaviorEvents]);
  
  // Get recent negative behaviors for display
  const recentIssues = useMemo(() => {
    if (!behaviorEvents) return [];
    return behaviorEvents
      .filter(e => e.pointsImpact < 0)
      .slice(0, 3);
  }, [behaviorEvents]);
  
  // Calculate average rating
  const avgRating = useMemo(() => {
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + (r.rating || r.score || 0), 0);
    return (sum / ratings.length).toFixed(1);
  }, [ratings]);
  
  // Format expiry date
  const fmtDate = (d) => {
    if (!d) return 'Not set';
    const date = new Date(d);
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Check if date is expired or expiring soon
  const getExpiryStatus = (d) => {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const daysDiff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) return { color: '#ef4444', text: 'Expired', bg: '#ef444420' };
    if (daysDiff < 30) return { color: '#f59e0b', text: `Expires in ${daysDiff} days`, bg: '#f59e0b20' };
    return { color: '#22c55e', text: 'Valid', bg: '#22c55e20' };
  };
  
  const licenseStatus = getExpiryStatus(profile?.licenseExpiryDate);
  const pdpStatus = getExpiryStatus(profile?.pdpExpiryDate);
  
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Avatar card */}
      <View style={s.profHeader}>
        <View style={s.profAvatar}>
          <Text style={s.profAvatarTxt}>{initials}</Text>
        </View>
        <Text style={s.profName}>{profile?.name || user?.fullName || 'Driver'}</Text>
        <Text style={s.profEmail}>{profile?.email || user?.email || ''}</Text>
        <TouchableOpacity
          style={[s.onBadge, profile?.isAvailable ? s.onBadgeGreen : s.onBadgeGrey, { marginTop: 12 }]}
          onPress={onToggle}>
          <View style={[s.onDot, { backgroundColor: profile?.isAvailable ? '#22c55e' : '#9ca3af' }]} />
          <Text style={s.onTxt}>{profile?.isAvailable ? 'Online' : 'Offline'} · Tap to toggle</Text>
        </TouchableOpacity>
      </View>

      {/* Driver Performance Summary */}
      <View style={[s.performanceCard, { backgroundColor: c.surface }]}>
        <View style={s.performanceRow}>
          <View style={s.performanceItem}>
            <View style={[s.performanceIcon, { backgroundColor: behaviorScore >= 80 ? '#22c55e20' : behaviorScore >= 60 ? '#f59e0b20' : '#ef444420' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={behaviorScore >= 80 ? '#22c55e' : behaviorScore >= 60 ? '#f59e0b' : '#ef4444'} />
            </View>
            <Text style={[s.performanceValue, { color: behaviorScore >= 80 ? '#22c55e' : behaviorScore >= 60 ? '#f59e0b' : '#ef4444' }]}>{behaviorScore}</Text>
            <Text style={s.performanceLabel}>Behavior Score</Text>
          </View>
          <View style={s.performanceDivider} />
          <View style={s.performanceItem}>
            <View style={[s.performanceIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="star-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={[s.performanceValue, { color: '#f59e0b' }]}>{avgRating}</Text>
            <Text style={s.performanceLabel}>Avg Rating</Text>
          </View>
          <View style={s.performanceDivider} />
          <View style={s.performanceItem}>
            <View style={[s.performanceIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="ribbon-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={[s.performanceValue, { color: '#3b82f6' }]}>{ratings?.length || 0}</Text>
            <Text style={s.performanceLabel}>Reviews</Text>
          </View>
        </View>
      </View>

      {/* License Information */}
      <Text style={s.profGroupLabel}>LICENSE INFORMATION</Text>
      <View style={s.profSection}>
        {profile?.licenseNumber ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="id-card-outline" size={16} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profRowTxt}>License No: {profile.licenseNumber}</Text>
            </View>
          </View>
        ) : null}
        {profile?.category ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="car-outline" size={16} color="#8b5cf6" />
            </View>
            <Text style={s.profRowTxt}>Category: {profile.category}</Text>
          </View>
        ) : null}
        {profile?.licenseExpiryDate ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: licenseStatus?.bg || '#9ca3af20' }]}>
              <Ionicons name="calendar-outline" size={16} color={licenseStatus?.color || '#9ca3af'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profRowTxt}>Expires: {fmtDate(profile.licenseExpiryDate)}</Text>
              {licenseStatus && (
                <View style={[s.statusBadge, { backgroundColor: licenseStatus.bg }]}>
                  <Text style={[s.statusBadgeTxt, { color: licenseStatus.color }]}>{licenseStatus.text}</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}
        {!profile?.licenseNumber && !profile?.category && (
          <Text style={[s.profRowTxt, { color: c.textMuted, fontStyle: 'italic' }]}>No license information on file</Text>
        )}
      </View>

      {/* PDP Information */}
      <Text style={s.profGroupLabel}>PROFESSIONAL DRIVING PERMIT (PDP)</Text>
      <View style={s.profSection}>
        <View style={s.profRow}>
          <View style={[s.profRowIcon, { backgroundColor: profile?.hasPdp ? '#10b98120' : '#ef444420' }]}>
            <Ionicons name={profile?.hasPdp ? "checkmark-circle-outline" : "close-circle-outline"} size={16} color={profile?.hasPdp ? '#10b981' : '#ef4444'} />
          </View>
          <Text style={s.profRowTxt}>{profile?.hasPdp ? 'PDP Certified' : 'No PDP on file'}</Text>
        </View>
        {profile?.hasPdp && profile?.pdpExpiryDate && (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: pdpStatus?.bg || '#9ca3af20' }]}>
              <Ionicons name="calendar-outline" size={16} color={pdpStatus?.color || '#9ca3af'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profRowTxt}>PDP Expires: {fmtDate(profile.pdpExpiryDate)}</Text>
              {pdpStatus && (
                <View style={[s.statusBadge, { backgroundColor: pdpStatus.bg }]}>
                  <Text style={[s.statusBadgeTxt, { color: pdpStatus.color }]}>{pdpStatus.text}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Personal Info */}
      <Text style={s.profGroupLabel}>PERSONAL INFORMATION</Text>
      <View style={s.profSection}>
        {profile?.idNumber ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: '#6366f120' }]}>
              <Ionicons name="person-outline" size={16} color="#6366f1" />
            </View>
            <Text style={s.profRowTxt}>ID: {profile.idNumber}</Text>
          </View>
        ) : null}
        {profile?.phone ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="call-outline" size={16} color="#3b82f6" />
            </View>
            <Text style={s.profRowTxt}>{profile.phone}</Text>
          </View>
        ) : null}
        {profile?.experience ? (
          <View style={s.profRow}>
            <View style={[s.profRowIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="briefcase-outline" size={16} color="#f59e0b" />
            </View>
            <Text style={s.profRowTxt}>{profile.experience}</Text>
          </View>
        ) : null}
      </View>

      {/* Recent Behavior Issues */}
      {recentIssues.length > 0 && (
        <>
          <Text style={[s.profGroupLabel, { color: '#ef4444' }]}>RECENT BEHAVIOR ALERTS</Text>
          <View style={[s.profSection, { borderColor: '#ef444440' }]}>
            {recentIssues.map((issue, idx) => (
              <View key={idx} style={s.behaviorRow}>
                <View style={[s.behaviorIcon, { backgroundColor: '#ef444420' }]}>
                  <Ionicons name="warning-outline" size={14} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.behaviorTitle}>{issue.category}</Text>
                  <Text style={s.behaviorDesc} numberOfLines={1}>{issue.description}</Text>
                </View>
                <Text style={s.behaviorPoints}>{issue.pointsImpact}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Vehicle */}
      <Text style={s.profGroupLabel}>VEHICLE ASSIGNMENT</Text>
      <View style={s.profSection}>
        <View style={s.profRow}>
          <View style={[s.profRowIcon, { backgroundColor: vehicle ? c.primary + '20' : '#9ca3af20' }]}>
            <Ionicons name="car-sport-outline" size={16} color={vehicle ? c.primary : '#9ca3af'} />
          </View>
          {vehicle ? (
            <View style={{ flex: 1 }}>
              <Text style={s.profRowTxt}>{vehicle.make || vehicle.Make} {vehicle.model || vehicle.Model}</Text>
              <Text style={[s.profRowTxt, { fontSize: 12, color: c.primary, fontWeight: '700', marginTop: 1 }]}>{vehicle.registration || vehicle.Registration}</Text>
            </View>
          ) : (
            <Text style={[s.profRowTxt, { color: c.textMuted }]}>No vehicle assigned</Text>
          )}
        </View>
      </View>

      {/* Preferences */}
      <Text style={[s.profGroupLabel, { marginTop: 4 }]}>PREFERENCES</Text>
      <TouchableOpacity style={s.profActionRow} onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
        <View style={[s.profActionIcon, { backgroundColor: '#f59e0b20' }]}>
          <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color="#f59e0b" />
        </View>
        <Text style={s.profActionTxt}>{mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </TouchableOpacity>

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
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [behaviorEvents, setBehaviorEvents] = useState([]);
  const [ratings, setRatings] = useState([]);

  const [earnModal, setEarnModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [maintModal, setMaintModal] = useState(false);
  const [editMaintModal, setEditMaintModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingRequest, setRatingRequest] = useState(null);
  const [monitorActive, setMonitorActive] = useState(false);
  const [monitorSpeed, setMonitorSpeed] = useState(0);
  const [recentBehaviorEvents, setRecentBehaviorEvents] = useState([]);

  async function submitReview({ rating, review }) {
    await submitMechanicalRequestReview({
      requestId: ratingRequest.id,
      rating,
      review,
      role: 'driver',
      userId: user?.id,
    });
    Alert.alert('Thank you', 'Your review has been submitted');
  }

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const profResp = await API.getDriverProfiles();
      const prof = Array.isArray(profResp.data) ? profResp.data.find(d => d.userId === user.id) : null;
      setProfile(prof);

      // Fetch behavior events and ratings if profile exists
      if (prof?.id) {
        try {
          const events = await fetchDriverEvents(prof.id, 20);
          setBehaviorEvents(Array.isArray(events) ? events : []);
        } catch { setBehaviorEvents([]); }
        
        // Fetch ratings from reviews API (mechanical request reviews for now)
        try {
          const mr = await API.getMaintenance();
          const all = Array.isArray(mr.data) ? mr.data : [];
          // Filter completed requests with ratings
          const rated = all.filter(r => r.status === 'completed' && r.driverRating != null);
          setRatings(rated.map(r => ({ rating: r.driverRating, review: r.driverReview, date: r.completedAt })));
        } catch { setRatings([]); }
      }

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
    const goingOnline = !profile.isAvailable;
    try {
      await API.updateDriverProfile(profile.id, { ...profile, isAvailable: goingOnline });
      setProfile(p => ({ ...p, isAvailable: goingOnline }));

      // Start/stop driving behavior monitor
      if (goingOnline) {
        const result = await startMonitoring({
          driverId: profile.id,
          vehicleId: vehicle?.id,
          tenantId: user?.tenantId,
          reporterId: user?.userId || user?.id,
          onEvent: (evt) => {
            setRecentBehaviorEvents(prev => [evt, ...prev].slice(0, 10));
          },
          onStatusChange: (status) => {
            setMonitorActive(status.monitoring);
            setMonitorSpeed(status.speed || 0);
          },
        });
        if (result.success) {
          setMonitorActive(true);
        } else if (result.error) {
          Alert.alert('Monitor', `Could not start behavior monitoring: ${result.error}`);
        }
      } else {
        stopMonitoring();
        setMonitorActive(false);
        setMonitorSpeed(0);
      }
    } catch { Alert.alert('Error', 'Could not update availability'); }
  }

  // Cleanup monitor on unmount
  useEffect(() => {
    return () => { stopMonitoring(); };
  }, []);

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

  const driverInitials = ((profile?.name || user?.fullName || 'D')).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

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
        <TouchableOpacity style={s.headerAvatar} onPress={() => setTab('profile')}>
          <Text style={s.headerAvatarTxt}>{driverInitials}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.greeting}>Hello, {profile?.name?.split(' ')[0] || user?.fullName?.split(' ')[0] || 'Driver'} 👋</Text>
          <Text style={s.subhead}>Driver Portal</Text>
        </View>
        <ThemeToggle style={{ marginRight: 8 }} size={20} />
        <TouchableOpacity style={[s.onBadge, profile?.isAvailable ? s.onBadgeGreen : s.onBadgeGrey]} onPress={toggleAvailability}>
          <View style={[s.onDot, { backgroundColor: profile?.isAvailable ? '#22c55e' : '#9ca3af' }]} />
          <Text style={s.onTxt}>{profile?.isAvailable ? 'Online' : 'Offline'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {tab === 'overview' && (
          <OverviewTab profile={profile} vehicle={vehicle} earnings={earnings} expenses={expenses} maintenance={maintenance}
            onToggle={toggleAvailability} onAddEarning={() => setEarnModal(true)} onAddExpense={() => setExpModal(true)}
            refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
            monitorActive={monitorActive} monitorSpeed={monitorSpeed} recentBehaviorEvents={recentBehaviorEvents}
            c={c} s={s} />
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
            behaviorEvents={behaviorEvents} ratings={ratings}
            onToggle={toggleAvailability} onLogout={logout}
            mode={mode} setMode={setMode} c={c} s={s} />
        )}
      </View>

      {/* Bottom tab bar */}
      <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
            <View>
              <Ionicons name={tab === t.key ? t.activeIcon : t.icon} size={22} color={tab === t.key ? c.primary : c.textMuted} />
              {t.badge > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeTxt}>{t.badge > 9 ? '9+' : t.badge}</Text></View>
              )}
            </View>
            <Text style={[s.tabLbl, tab === t.key && { color: c.primary, fontWeight: '800' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modals */}
      <AddEarningModal visible={earnModal} vehicleId={vehicle?.id} onClose={() => setEarnModal(false)} onSuccess={load} c={c} s={s} />
      <AddExpenseModal visible={expModal} vehicleId={vehicle?.id} onClose={() => setExpModal(false)} onSuccess={load} c={c} s={s} />
      <MaintenanceModal visible={maintModal} vehicleId={vehicle?.id} ownerId={vehicle?.ownerId} onClose={() => setMaintModal(false)} onSuccess={load} c={c} s={s} />
      <EditMaintenanceModal visible={editMaintModal} request={editingRequest} onClose={() => { setEditMaintModal(false); setEditingRequest(null); }} onSuccess={load} c={c} s={s} />
      <RatingReviewModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSubmit={submitReview}
        request={ratingRequest}
        role="driver"
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    // ── Header ──
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    headerAvatarTxt: { color: '#fff', fontSize: 15, fontWeight: '900' },
    greeting: { fontSize: 16, fontWeight: '800', color: c.text },
    subhead: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    onBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    onBadgeGreen: { backgroundColor: '#22c55e18', borderColor: '#22c55e' },
    onBadgeGrey: { backgroundColor: c.surface2, borderColor: c.border },
    onDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
    onTxt: { fontSize: 12, fontWeight: '700', color: c.text },

    // ── Hero online/offline banner ──
    heroBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 14 },
    heroBannerIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
    heroBannerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    heroBannerSub: { fontSize: 12, color: '#ffffffcc', marginTop: 2 },

    // ── Driving Monitor ──
    monitorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d6efd15', borderWidth: 1, borderColor: '#0d6efd44', borderRadius: 14, padding: 12, marginBottom: 12 },
    monitorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0d6efd' },
    monitorTitle: { fontSize: 13, fontWeight: '800', color: '#0d6efd' },
    monitorSub: { fontSize: 10, color: c.textMuted, marginTop: 1 },
    monitorSpeedBadge: { alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: c.border },
    monitorSpeedTxt: { fontSize: 18, fontWeight: '900', color: c.text },
    monitorSpeedUnit: { fontSize: 9, fontWeight: '700', color: c.textMuted },

    behaviorAlertCard: { backgroundColor: '#f59e0b10', borderWidth: 1, borderColor: '#f59e0b44', borderRadius: 14, padding: 12, marginBottom: 12 },
    behaviorAlertTitle: { fontSize: 13, fontWeight: '800', color: '#f59e0b' },
    behaviorAlertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 8, borderLeftWidth: 3, marginBottom: 4 },
    behaviorAlertCat: { fontSize: 12, fontWeight: '800', minWidth: 80 },
    behaviorAlertDesc: { flex: 1, fontSize: 11, color: c.textMuted },
    behaviorAlertPts: { fontSize: 12, fontWeight: '900' },

    // ── Hero profit card ──
    heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary, borderRadius: 20, padding: 20, marginBottom: 14 },
    heroLabel: { fontSize: 12, color: '#ffffff99', fontWeight: '600', marginBottom: 4 },
    heroValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
    heroSub: { fontSize: 12, color: '#ffffffaa', marginTop: 4 },
    heroIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },

    // ── Metrics grid ──
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    metricCard: { width: '47%', padding: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border },
    metricIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    metricValue: { fontSize: 15, fontWeight: '800', color: c.text },
    metricLabel: { fontSize: 11, color: c.textMuted, marginTop: 2, fontWeight: '600' },
    metricSub: { fontSize: 10, color: c.textMuted, marginTop: 1 },

    // ── Quick actions ──
    sectionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 10 },
    quickActions: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    quickActionBtn: { flex: 1, alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: c.border },
    quickActionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    quickActionTxt: { fontSize: 12, fontWeight: '700', color: c.text },

    // ── Vehicle card ──
    card: { backgroundColor: c.surface, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: c.border },
    vehMain: { fontSize: 20, fontWeight: '900', color: c.text },
    vehSub: { fontSize: 13, color: c.textMuted, marginTop: 2, marginBottom: 10 },
    vehStatusBadge: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    vehStatusTxt: { fontSize: 10, fontWeight: '800' },
    vehEmpty: { alignItems: 'center', paddingVertical: 28 },
    vehEmptyTxt: { fontSize: 14, fontWeight: '700', color: c.textMuted, marginTop: 10 },
    vehEmptySub: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    plateBadge: { alignSelf: 'flex-start', backgroundColor: c.background, borderWidth: 2, borderColor: c.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
    plateTxt: { fontSize: 17, fontWeight: '900', color: c.text, letterSpacing: 3 },
    vehGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    vehGridItem: { flex: 1, alignItems: 'center', backgroundColor: c.background, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border },
    vehGridVal: { fontSize: 13, fontWeight: '800', color: c.text, marginTop: 4 },
    vehGridLbl: { fontSize: 10, color: c.textMuted, marginTop: 2 },
    serviceAlerts: { gap: 6, marginBottom: 10 },
    serviceAlert: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
    serviceAlertTxt: { fontSize: 12, fontWeight: '600', flex: 1 },
    expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, gap: 4, borderTopWidth: 1, borderTopColor: c.border, marginTop: 6 },
    expandTxt: { fontSize: 12, fontWeight: '700', color: c.primary },
    detailRows: { marginTop: 12, gap: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    detailLbl: { flex: 1, fontSize: 12, color: c.textMuted, marginLeft: 6 },
    detailVal: { fontSize: 12, fontWeight: '700', color: c.text, textAlign: 'right', flexShrink: 1, maxWidth: '55%' },

    // ── Earnings tab summary row ──
    earnSummaryRow: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, marginBottom: 14, overflow: 'hidden' },
    earnSummaryItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    earnSummaryVal: { fontSize: 14, fontWeight: '900', marginTop: 6 },
    earnSummaryLbl: { fontSize: 10, color: c.textMuted, marginTop: 2, fontWeight: '600' },

    // ── Toggle ──
    toggle: { flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 12, padding: 3, marginBottom: 14 },
    tBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
    tBtnOn: { backgroundColor: c.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
    tTxt: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    tTxtOn: { color: c.text, fontWeight: '800' },

    // ── Ledger rows ──
    ledger: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    ledgerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    ledgerLbl: { fontSize: 13, fontWeight: '700', color: c.text },
    ledgerDesc: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    ledgerAmt: { fontSize: 14, fontWeight: '900' },
    ledgerDate: { fontSize: 10, color: c.textMuted, marginTop: 2 },

    // ── Section header ──
    secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    secTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 8 },
    btnSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4 },
    btnSmTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // ── Maintenance cards ──
    reqCard: { backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    reqIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    reqCat: { fontSize: 14, fontWeight: '800', color: c.text },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    badgeTxt: { fontSize: 10, fontWeight: '800' },
    reqEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: c.primary },
    reqEditBtnTxt: { fontSize: 12, fontWeight: '700', color: c.primary },
    reqDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#ef4444' },
    reqDeleteBtnTxt: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
    reqDesc: { fontSize: 12, color: c.textMuted, marginBottom: 8 },
    reqMeta: { flexDirection: 'row', alignItems: 'center' },
    metaTxt: { fontSize: 11, color: c.textMuted, marginLeft: 3 },
    metaSep: { fontSize: 11, color: c.textMuted, marginHorizontal: 5 },

    // ── Messages ──
    unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#f59e0b' },
    unreadBannerTxt: { fontSize: 13, fontWeight: '700', color: '#92400e' },
    msgRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarTxt: { fontWeight: '800', fontSize: 16 },
    msgFrom: { fontSize: 13, fontWeight: '800', color: c.text },
    msgDate: { fontSize: 10, color: c.textMuted },
    msgPrev: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary, marginLeft: 8 },

    // ── Empty state ──
    empty: { alignItems: 'center', paddingVertical: 52 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginTop: 12, marginBottom: 4 },
    emptyTxt: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
    muted: { fontSize: 13, color: c.textMuted },

    // ── Tab bar ──
    tabBar: { flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    tabItem: { flex: 1, alignItems: 'center', gap: 3, minHeight: 44, justifyContent: 'center' },
    tabLbl: { fontSize: 10, fontWeight: '600', color: c.textMuted },
    tabBadge: { position: 'absolute', top: -4, right: -10, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    tabBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },

    // ── Modal ──
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
    row2: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    btnPrimary: { flex: 1, backgroundColor: c.primary, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnPrimaryTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
    btnGhost: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: c.border, marginRight: 8 },
    btnGhostTxt: { color: c.text, fontWeight: '700', fontSize: 15 },

    // ── Profile tab ──
    profHeader: { alignItems: 'center', paddingVertical: 28, backgroundColor: c.surface, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: c.border },
    profAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    profAvatarTxt: { fontSize: 30, fontWeight: '900', color: '#fff' },
    profName: { fontSize: 20, fontWeight: '900', color: c.text },
    profEmail: { fontSize: 13, color: c.textMuted, marginTop: 3 },
    profGroupLabel: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
    profSection: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 16 },
    profRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 },
    profRowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    profRowTxt: { fontSize: 14, fontWeight: '600', color: c.text, flex: 1 },
    profActionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, gap: 12 },
    profActionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    profActionTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 16, paddingVertical: 16, marginTop: 16, gap: 8 },
    logoutTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },

    // ── Profile Performance Card ──
    performanceCard: { borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 20 },
    performanceRow: { flexDirection: 'row', alignItems: 'center' },
    performanceItem: { flex: 1, alignItems: 'center' },
    performanceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    performanceValue: { fontSize: 22, fontWeight: '900' },
    performanceLabel: { fontSize: 11, color: c.textMuted, marginTop: 2, fontWeight: '600' },
    performanceDivider: { width: 1, height: 50, backgroundColor: c.border },

    // ── Profile Status Badges ──
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
    statusBadgeTxt: { fontSize: 10, fontWeight: '700' },

    // ── Profile Behavior Alerts ──
    behaviorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border, gap: 10 },
    behaviorIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    behaviorTitle: { fontSize: 13, fontWeight: '700', color: c.text },
    behaviorDesc: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    behaviorPoints: { fontSize: 14, fontWeight: '900', color: '#ef4444' },
  });
}
