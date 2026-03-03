import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, TouchableOpacity, Platform, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { approveMechanicalRequest, completeMechanicalRequest, declineMechanicalRequest, getMechanicalRequestById, scheduleMechanicalRequest } from '../api/maintenance';
import { getServiceProvidersByServiceType } from '../api/serviceProviders';
import { getAvailableServiceProviderProfiles } from '../api/serviceProviderProfiles';
import { useAppTheme } from '../theme';

const DateTimePicker = Platform.OS === 'web'
  ? null
  : require('@react-native-community/datetimepicker').default;

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString();
}

export default function OwnerMaintenanceRequestDetailsScreen({ route, navigation }) {
  const requestParam = route?.params?.request || null;
  const requestId = useMemo(() => requestParam?.id || requestParam?.Id || route?.params?.requestId || null, [requestParam, route]);

  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState(requestParam);
  const [saving, setSaving] = useState(false);
  const [serviceProviderInput, setServiceProviderInput] = useState('');
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [availableOnly, setAvailableOnly] = useState(true);

  const [scheduledAt, setScheduledAt] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [scheduledDateText, setScheduledDateText] = useState('');
  const [scheduledTimeText, setScheduledTimeText] = useState('');

  const [declineReasonInput, setDeclineReasonInput] = useState('');

  const [completionNotesInput, setCompletionNotesInput] = useState('');
  const [serviceCostInput, setServiceCostInput] = useState('');
  const [mileageAtServiceInput, setMileageAtServiceInput] = useState('');
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [serviceProviderRatingInput, setServiceProviderRatingInput] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: 'Maintenance Request' });
  }, [navigation]);

  async function refresh() {
    if (!requestId) return;
    const fresh = await getMechanicalRequestById(requestId);
    setReq(fresh || requestParam);
    return fresh;
  }

  async function onComplete() {
    if (!requestId) return;

    const cost = serviceCostInput.trim() ? Number(serviceCostInput) : null;
    if (serviceCostInput.trim() && Number.isNaN(cost)) {
      return Alert.alert('Validation', 'Service cost must be a number');
    }

    const mileage = mileageAtServiceInput.trim() ? Number(mileageAtServiceInput) : null;
    if (mileageAtServiceInput.trim() && (!Number.isFinite(mileage) || mileage < 0)) {
      return Alert.alert('Validation', 'Mileage must be a valid number');
    }

    const rating = serviceProviderRatingInput.trim() ? Number(serviceProviderRatingInput) : null;
    if (serviceProviderRatingInput.trim() && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
      return Alert.alert('Validation', 'Rating must be between 1 and 5');
    }

    try {
      setSaving(true);
      await completeMechanicalRequest(requestId, {
        completedDate: new Date().toISOString(),
        completionNotes: completionNotesInput || '',
        mileageAtService: mileage == null ? null : Math.round(mileage),
        serviceCost: cost,
        invoiceNumber: invoiceNumberInput || '',
        serviceProviderRating: rating == null ? null : Math.round(rating),
      });
      await refresh();
      Alert.alert('Completed', 'Maintenance request marked as completed');
    } catch (e) {
      console.warn('Failed to complete request', e);
      Alert.alert('Error', 'Failed to complete request');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!requestId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fresh = await getMechanicalRequestById(requestId);
        if (!mounted) return;
        setReq(fresh || requestParam);
      } catch (e) {
        console.warn('Failed to load mechanical request', e);
        Alert.alert('Error', 'Failed to load request details');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [requestId]);

  useEffect(() => {
    let mounted = true;
    async function loadProviders() {
      const category = (req?.category || req?.Category || '').trim();
      if (!category) return;
      try {
        setProvidersLoading(true);

        let list;
        if (availableOnly) {
          list = await getAvailableServiceProviderProfiles();
        } else {
          list = await getServiceProvidersByServiceType(category);
        }

        if (!mounted) return;
        setProviders(Array.isArray(list) ? list : []);
        setSelectedProviderId('');
        setServiceProviderInput('');
      } catch (e) {
        console.warn('Failed to load service providers', e);
      } finally {
        if (mounted) setProvidersLoading(false);
      }
    }
    loadProviders();
    return () => { mounted = false; };
  }, [req?.category, req?.Category, availableOnly]);

  const selectedProvider = selectedProviderId
    ? (providers.find(p => String(p.id) === String(selectedProviderId)) || null)
    : null;

  const selectedProviderDetails = selectedProvider
    ? {
        rating: selectedProvider.rating ?? selectedProvider.Rating,
        totalReviews: selectedProvider.totalReviews ?? selectedProvider.TotalReviews,
        phone: selectedProvider.phone || selectedProvider.Phone,
        address: selectedProvider.address || selectedProvider.Address,
        serviceTypes: selectedProvider.serviceTypes || selectedProvider.ServiceTypes,
        hours: selectedProvider.operatingHours || selectedProvider.OperatingHours,
      }
    : null;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!req) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Maintenance Request</Text>
        <Text style={styles.empty}>No request selected.</Text>
      </View>
    );
  }

  const state = req.state || req.State || req.status || 'Unknown';
  const priority = req.priority || req.Priority || 'Normal';
  const category = req.category || req.Category || 'Maintenance';
  const location = req.location || req.Location || '';
  const description = req.issueDescription || req.description || req.Description || '';

  const createdAt = formatDate(req.createdAt || req.CreatedAt);
  const preferredTime = formatDate(req.preferredTime || req.PreferredTime);
  const scheduledDate = formatDate(req.scheduledDate || req.ScheduledDate);
  const completedDate = formatDate(req.completedDate || req.CompletedDate);

  const vehicleRegistration = req.vehicleRegistration || '';
  const vehicleMake = req.vehicleMake || '';
  const vehicleModel = req.vehicleModel || '';

  const declineReason = req.declineReason || req.DeclineReason || '';
  const serviceProvider = req.serviceProvider || req.ServiceProvider || '';
  const completionNotes = req.completionNotes || req.CompletionNotes || '';

  const isScheduled = String(state).toLowerCase() === 'scheduled';
  const isApproved = String(state).toLowerCase() === 'approved';
  const isPending = String(state).toLowerCase() === 'pending';
  const canSchedule = isApproved && !completedDate;
  const canComplete = !completedDate && (String(state).toLowerCase() === 'scheduled' || String(state).toLowerCase() === 'in progress');
  const canDecide = isPending && !completedDate;

  async function onApprove() {
    if (!requestId) return;
    try {
      setSaving(true);
      await approveMechanicalRequest(requestId);
      await refresh();
      Alert.alert('Approved', 'Maintenance request approved');
    } catch (e) {
      console.warn('Failed to approve request', e);
      Alert.alert('Error', 'Failed to approve request');
    } finally {
      setSaving(false);
    }
  }

  async function onDecline() {
    if (!requestId) return;
    try {
      setSaving(true);
      await declineMechanicalRequest(requestId, declineReasonInput || 'Declined via mobile app');
      await refresh();
      Alert.alert('Declined', 'Maintenance request declined');
    } catch (e) {
      console.warn('Failed to decline request', e);
      Alert.alert('Error', 'Failed to decline request');
    } finally {
      setSaving(false);
    }
  }

  async function onSchedule() {
    if (!requestId) return;
    if (!serviceProviderInput.trim()) return Alert.alert('Validation', 'Service provider is required');
    if (!scheduledAt) return Alert.alert('Validation', 'Scheduled date/time is required');

    try {
      setSaving(true);
      await scheduleMechanicalRequest(requestId, {
        serviceProvider: serviceProviderInput,
        scheduledDate: scheduledAt.toISOString(),
        scheduledBy: 'Owner',
      });
      await refresh();
      Alert.alert('Scheduled', 'Repair has been scheduled');
    } catch (e) {
      console.warn('Failed to schedule request', e);
      Alert.alert('Error', 'Failed to schedule repair');
    } finally {
      setSaving(false);
    }
  }

  function onPickProvider(providerId) {
    setSelectedProviderId(providerId);
    const p = providers.find(x => String(x.id) === String(providerId));
    const name = p?.businessName || p?.BusinessName || '';
    if (name) setServiceProviderInput(name);
  }

  function onDateChange(_event, dateVal) {
    setShowDatePicker(false);
    if (!dateVal) return;
    const current = scheduledAt ? new Date(scheduledAt) : new Date();
    const next = new Date(current);
    next.setFullYear(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
    setScheduledAt(next);
  }

  function onTimeChange(_event, timeVal) {
    setShowTimePicker(false);
    if (!timeVal) return;
    const current = scheduledAt ? new Date(scheduledAt) : new Date();
    const next = new Date(current);
    next.setHours(timeVal.getHours(), timeVal.getMinutes(), 0, 0);
    setScheduledAt(next);
  }

  function applyWebDateTimeFromText() {
    if (!scheduledDateText.trim() || !scheduledTimeText.trim()) return;
    const composed = `${scheduledDateText.trim()} ${scheduledTimeText.trim()}`;
    const d = new Date(composed);
    if (Number.isNaN(d.getTime())) {
      Alert.alert('Validation', 'Invalid date/time. Use YYYY-MM-DD and HH:mm');
      return;
    }
    setScheduledAt(d);
  }

  function onWebDateChange(e) {
    const next = e?.target?.value || '';
    setScheduledDateText(next);
    setTimeout(applyWebDateTimeFromText, 0);
  }

  function onWebTimeChange(e) {
    const next = e?.target?.value || '';
    setScheduledTimeText(next);
    setTimeout(applyWebDateTimeFromText, 0);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.card}>
        <Text style={styles.title}>{vehicleRegistration || 'Vehicle'}{vehicleMake || vehicleModel ? ` · ${vehicleMake} ${vehicleModel}` : ''}</Text>
        <Text style={styles.badges}>{category} · {priority} · {state}</Text>

        {!!location && <Text style={styles.meta}>Location: {location}</Text>}
        {!!createdAt && <Text style={styles.meta}>Requested: {createdAt}</Text>}
        {!!preferredTime && <Text style={styles.meta}>Preferred time: {preferredTime}</Text>}
        {!!scheduledDate && <Text style={styles.meta}>Scheduled: {scheduledDate}</Text>}
        {!!completedDate && <Text style={styles.meta}>Completed: {completedDate}</Text>}

        <View style={{ height: 12 }} />
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.body}>{description || 'No description provided.'}</Text>

        {canDecide && (
          <>
            <View style={{ height: 12 }} />
            <Text style={styles.sectionTitle}>Approval</Text>
            <Text style={styles.help}>Approve or decline this maintenance request.</Text>

            <Text style={styles.inputLabel}>Decline Reason (optional)</Text>
            <TextInput
              value={declineReasonInput}
              onChangeText={setDeclineReasonInput}
              style={styles.input}
              placeholder="Reason if declining"
              editable={!saving}
            />

            <View style={[styles.row, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[styles.btnOutline, saving && { opacity: 0.6 }]}
                onPress={onDecline}
                disabled={saving}
              >
                <Text style={styles.btnOutlineText}>Decline</Text>
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1, marginTop: 0 }, saving && { opacity: 0.6 }]}
                onPress={onApprove}
                disabled={saving}
              >
                <Text style={styles.btnPrimaryText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {canComplete && (
          <>
            <View style={{ height: 12 }} />
            <Text style={styles.sectionTitle}>Complete Repair</Text>
            <Text style={styles.help}>Add key details before marking this request as completed.</Text>

            <Text style={styles.inputLabel}>Amount Paid</Text>
            <TextInput
              value={serviceCostInput}
              onChangeText={setServiceCostInput}
              style={styles.input}
              placeholder="e.g. 1500"
              keyboardType="numeric"
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Mileage at Service</Text>
            <TextInput
              value={mileageAtServiceInput}
              onChangeText={setMileageAtServiceInput}
              style={styles.input}
              placeholder="e.g. 120000"
              keyboardType="numeric"
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Invoice Number</Text>
            <TextInput
              value={invoiceNumberInput}
              onChangeText={setInvoiceNumberInput}
              style={styles.input}
              placeholder="e.g. INV-001"
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Completion Notes</Text>
            <TextInput
              value={completionNotesInput}
              onChangeText={setCompletionNotesInput}
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Comment (optional)"
              multiline
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Service Provider Rating (1-5)</Text>
            <TextInput
              value={serviceProviderRatingInput}
              onChangeText={setServiceProviderRatingInput}
              style={styles.input}
              placeholder="e.g. 5"
              keyboardType="numeric"
              editable={!saving}
            />

            <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]} onPress={onComplete} disabled={saving}>
              <Text style={styles.btnPrimaryText}>{saving ? 'Saving...' : 'Complete'}</Text>
            </TouchableOpacity>
          </>
        )}

        {canSchedule && (
          <>
            <View style={{ height: 12 }} />
            <Text style={styles.sectionTitle}>{isScheduled ? 'Reschedule Repair' : 'Schedule Repair'}</Text>
            <Text style={styles.help}>Pick a provider and choose a date/time.</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Available only</Text>
              <Switch value={availableOnly} onValueChange={setAvailableOnly} />
            </View>

            <Text style={styles.inputLabel}>Service Provider</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={selectedProviderId}
                onValueChange={onPickProvider}
                enabled={!saving}
              >
                <Picker.Item label={providersLoading ? 'Loading providers...' : 'Select a service provider'} value="" />
                {providers.map(p => (
                  <Picker.Item
                    key={String(p.id)}
                    label={p.businessName || p.BusinessName || 'Provider'}
                    value={String(p.id)}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.help}>Selected: {serviceProviderInput || 'None'}</Text>

            {selectedProviderDetails && (
              <View style={styles.providerCard}>
                {!!selectedProviderDetails.serviceTypes && (
                  <Text style={styles.providerMeta}>Services: {selectedProviderDetails.serviceTypes}</Text>
                )}
                {!!selectedProviderDetails.hours && (
                  <Text style={styles.providerMeta}>Hours: {selectedProviderDetails.hours}</Text>
                )}
                {!!selectedProviderDetails.phone && (
                  <Text style={styles.providerMeta}>Phone: {selectedProviderDetails.phone}</Text>
                )}
                {!!selectedProviderDetails.address && (
                  <Text style={styles.providerMeta}>Address: {selectedProviderDetails.address}</Text>
                )}
                {(selectedProviderDetails.rating != null || selectedProviderDetails.totalReviews != null) && (
                  <Text style={styles.providerMeta}>
                    Rating: {selectedProviderDetails.rating ?? 0}{selectedProviderDetails.totalReviews != null ? ` (${selectedProviderDetails.totalReviews} reviews)` : ''}
                  </Text>
                )}
              </View>
            )}

            <Text style={styles.inputLabel}>Scheduled Date/Time</Text>
            {Platform.OS === 'web' ? (
              <>
                <View style={styles.row}>
                  {React.createElement('input', {
                    type: 'date',
                    value: scheduledDateText,
                    onChange: onWebDateChange,
                    disabled: saving,
                    style: { flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${c.border}`, background: c.surface, color: c.text },
                  })}
                  <View style={{ width: 10 }} />
                  {React.createElement('input', {
                    type: 'time',
                    value: scheduledTimeText,
                    onChange: onWebTimeChange,
                    disabled: saving,
                    style: { flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${c.border}`, background: c.surface, color: c.text },
                  })}
                </View>
                <Text style={styles.help}>Selected: {scheduledAt ? new Date(scheduledAt).toLocaleString() : 'None'}</Text>
              </>
            ) : (
              <>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.btnOutline, saving && { opacity: 0.6 }]}
                    onPress={() => setShowDatePicker(true)}
                    disabled={saving}
                  >
                    <Text style={styles.btnOutlineText}>{scheduledAt ? new Date(scheduledAt).toLocaleDateString() : 'Pick date'}</Text>
                  </TouchableOpacity>
                  <View style={{ width: 10 }} />
                  <TouchableOpacity
                    style={[styles.btnOutline, saving && { opacity: 0.6 }]}
                    onPress={() => setShowTimePicker(true)}
                    disabled={saving}
                  >
                    <Text style={styles.btnOutlineText}>{scheduledAt ? new Date(scheduledAt).toLocaleTimeString() : 'Pick time'}</Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && DateTimePicker && (
                  <DateTimePicker
                    value={scheduledAt ? new Date(scheduledAt) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                  />
                )}

                {showTimePicker && DateTimePicker && (
                  <DateTimePicker
                    value={scheduledAt ? new Date(scheduledAt) : new Date()}
                    mode="time"
                    is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onTimeChange}
                  />
                )}
              </>
            )}

            <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]} onPress={onSchedule} disabled={saving}>
              <Text style={styles.btnPrimaryText}>{saving ? 'Scheduling...' : 'Schedule'}</Text>
            </TouchableOpacity>
          </>
        )}

        {!!declineReason && (
          <>
            <View style={{ height: 12 }} />
            <Text style={styles.sectionTitle}>Decline Reason</Text>
            <Text style={styles.body}>{declineReason}</Text>
          </>
        )}

        {!!serviceProvider && (
          <>
            <View style={{ height: 12 }} />
            <Text style={styles.sectionTitle}>Service Provider</Text>
            <Text style={styles.body}>{serviceProvider}</Text>
          </>
        )}

        {!!completionNotes && (
          <>
            <View style={{ height: 12 }} />
            <Text style={styles.sectionTitle}>Completion Notes</Text>
            <Text style={styles.body}>{completionNotes}</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
    title: { fontSize: 16, fontWeight: '900', color: c.text },
    empty: { color: c.textMuted, marginTop: 8 },
    card: { padding: 12, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border },
    badges: { marginTop: 6, fontSize: 12, color: c.textMuted, fontWeight: '700' },
    meta: { marginTop: 6, fontSize: 12, color: c.textMuted },
    sectionTitle: { fontSize: 13, fontWeight: '900', color: c.text },
    body: { marginTop: 6, fontSize: 13, color: c.text, lineHeight: 18 },
    help: { marginTop: 6, fontSize: 12, color: c.textMuted },
    inputLabel: { fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 6, color: c.text },
    input: { borderWidth: 1, borderColor: c.border, padding: 10, borderRadius: 12, backgroundColor: c.surface, color: c.text },
    pickerWrap: { borderWidth: 1, borderColor: c.border, borderRadius: 12, overflow: 'hidden', backgroundColor: c.surface },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    switchLabel: { fontSize: 12, fontWeight: '800', color: c.text },
    providerCard: { marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    providerMeta: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    btnOutline: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center' },
    btnOutlineText: { color: c.text, fontWeight: '900' },
    btnPrimary: { marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', borderWidth: 1, borderColor: c.primary },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900' },
  });
}
