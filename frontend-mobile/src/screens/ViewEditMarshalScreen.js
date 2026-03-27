import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';
const GREEN = '#28a745';
const RED = '#dc3545';

export default function ViewEditMarshalScreen({ navigation, route }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const { marshal: initialMarshal, admin } = route.params || {};

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Form state
  const [fullName, setFullName] = useState(initialMarshal?.fullName || '');
  const [idNumber, setIdNumber] = useState(initialMarshal?.idNumber || '');
  const [phoneNumber, setPhoneNumber] = useState(initialMarshal?.phoneNumber || '');
  const [email, setEmail] = useState(initialMarshal?.email || '');
  const [marshalCode, setMarshalCode] = useState(initialMarshal?.marshalCode || '');
  const [emergencyContact, setEmergencyContact] = useState(initialMarshal?.emergencyContact || '');
  const [experience, setExperience] = useState(initialMarshal?.experience || '');
  const [status, setStatus] = useState(initialMarshal?.status || 'Active');
  const [permissions, setPermissions] = useState(initialMarshal?.permissions || {
    canCaptureTrips: true,
    canViewSchedules: true,
    canReceiveMessages: true,
    canSendMessages: true,
    canManageVehicles: false,
    canManageDrivers: false,
    canManageSchedules: false,
    canViewReports: false,
    canDeleteData: false,
  });

  const source = initialMarshal?.source || 'queueMarshals';

  const togglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const permissionLabels = {
    canCaptureTrips: 'Capture Trips',
    canViewSchedules: 'View Schedules',
    canReceiveMessages: 'Receive Messages',
    canSendMessages: 'Send Messages',
    canManageVehicles: 'Manage Vehicles',
    canManageDrivers: 'Manage Drivers',
    canManageSchedules: 'Manage Schedules',
    canViewReports: 'View Reports',
    canDeleteData: 'Delete Data',
  };

  const saveChanges = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        fullName: fullName.trim(),
        idNumber: idNumber.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        marshalCode: marshalCode.trim().toUpperCase(),
        emergencyContact: emergencyContact.trim(),
        experience: experience.trim(),
        permissions,
        status,
      };

      if (source === 'queueMarshals') {
        await client.put(`/QueueMarshals/${initialMarshal.id}`, updateData);
      } else {
        const nameParts = fullName.trim().split(' ');
        await client.put(`/TaxiRankUsers/marshals/${initialMarshal.id}`, {
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          status,
        });
      }

      Alert.alert('Success', 'Marshal profile updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Update marshal error:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to update marshal';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = () => {
    Alert.alert(
      'Reset Password',
      `Generate a new password for ${fullName}?\n\nThe new password will be displayed for you to share with the marshal.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: performPasswordReset,
        },
      ]
    );
  };

  const performPasswordReset = async () => {
    setResettingPassword(true);
    try {
      // Generate a new password
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
      let newPassword = '';
      for (let i = 0; i < 10; i++) {
        newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // If the marshal has a userId, reset via the Identity endpoint
      if (initialMarshal?.userId) {
        await client.post(`/Identity/users/${initialMarshal.userId}/reset-password`, {
          newPassword,
        });
        Alert.alert(
          'Password Reset',
          `New password for ${fullName}:\n\n${newPassword}\n\nPlease share this securely with the marshal.`,
          [{ text: 'OK' }]
        );
      } else {
        // No linked user account - show generated password for manual setup
        Alert.alert(
          'Password Generated',
          `This marshal does not have a linked user account yet.\n\nGenerated password:\n${newPassword}\n\nSave this for when the user account is created.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Reset password error:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to reset password';
      Alert.alert('Error', msg);
    } finally {
      setResettingPassword(false);
    }
  };

  const toggleStatus = async () => {
    const newStatus = status === 'Active' ? 'Inactive' : 'Active';
    Alert.alert(
      `${newStatus === 'Active' ? 'Activate' : 'Deactivate'} Marshal`,
      `Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} ${fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              if (source === 'queueMarshals') {
                await client.put(`/QueueMarshals/${initialMarshal.id}`, {
                  fullName, idNumber, phoneNumber, email, marshalCode,
                  emergencyContact, experience, permissions,
                  status: newStatus,
                });
              } else {
                await client.put(`/TaxiRankUsers/marshals/${initialMarshal.id}/status`, {
                  status: newStatus,
                });
              }
              setStatus(newStatus);
              Alert.alert('Success', `Marshal ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
            } catch (error) {
              console.error('Toggle status error:', error);
              Alert.alert('Error', 'Failed to update marshal status');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (s) => s === 'Active' ? GREEN : s === 'Suspended' ? '#ff9500' : RED;

  const renderField = (label, value, onChangeText, options = {}) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{label}</Text>
      {editing ? (
        <TextInput
          style={[styles.fieldInput, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor={c.textMuted}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize={options.autoCapitalize || 'sentences'}
          editable={options.editable !== false}
        />
      ) : (
        <Text style={[styles.fieldValue, { color: c.text }]}>{value || 'Not provided'}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Edit Marshal' : 'Marshal Details'}</Text>
        <TouchableOpacity onPress={() => editing ? saveChanges() : setEditing(true)}>
          {saving ? (
            <ActivityIndicator size="small" color={GOLD} />
          ) : (
            <Ionicons name={editing ? 'checkmark' : 'create-outline'} size={24} color={GOLD} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(status) + '20' }]}>
            <Ionicons
              name={status === 'Active' ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={getStatusColor(status)}
            />
            <Text style={[styles.statusTextLarge, { color: getStatusColor(status) }]}>{status}</Text>
          </View>
          <TouchableOpacity onPress={toggleStatus} style={[styles.toggleStatusBtn, { borderColor: c.border }]}>
            <Ionicons name="swap-horizontal" size={16} color={c.textMuted} />
            <Text style={[styles.toggleStatusText, { color: c.textMuted }]}>
              {status === 'Active' ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Marshal Code */}
        <View style={[styles.codeCard, { backgroundColor: c.surface, borderColor: GOLD }]}>
          <Ionicons name="shield-checkmark" size={24} color={GOLD} />
          <View style={styles.codeInfo}>
            <Text style={[styles.codeLabel, { color: c.textMuted }]}>Marshal Code</Text>
            {editing ? (
              <TextInput
                style={[styles.codeInput, { color: GOLD, backgroundColor: 'transparent' }]}
                value={marshalCode}
                onChangeText={setMarshalCode}
                autoCapitalize="characters"
              />
            ) : (
              <Text style={[styles.codeValue, { color: GOLD }]}>{marshalCode}</Text>
            )}
          </View>
        </View>

        {/* Personal Information */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Personal Information</Text>
          {renderField('Full Name', fullName, setFullName)}
          {renderField('ID Number', idNumber, setIdNumber, { keyboardType: 'numeric' })}
          {renderField('Phone Number', phoneNumber, setPhoneNumber, { keyboardType: 'phone-pad' })}
          {renderField('Email', email, setEmail, { keyboardType: 'email-address', autoCapitalize: 'none' })}
          {renderField('Emergency Contact', emergencyContact, setEmergencyContact, { keyboardType: 'phone-pad' })}
          {renderField('Experience', experience, setExperience)}
        </View>

        {/* Taxi Rank */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Assignment</Text>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Taxi Rank</Text>
            <Text style={[styles.fieldValue, { color: c.text }]}>
              {initialMarshal?.taxiRank?.name || initialMarshal?.taxiRankName || 'Not assigned'}
            </Text>
          </View>
        </View>

        {/* Permissions */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Permissions</Text>
          {Object.entries(permissionLabels).map(([key, label]) => (
            <View key={key} style={styles.permissionRow}>
              <Text style={[styles.permissionLabel, { color: c.text }]}>{label}</Text>
              {editing ? (
                <Switch
                  value={permissions[key] || false}
                  onValueChange={() => togglePermission(key)}
                  trackColor={{ false: c.border, true: GOLD + '80' }}
                  thumbColor={permissions[key] ? GOLD : '#f4f3f4'}
                />
              ) : (
                <Ionicons
                  name={permissions[key] ? 'checkmark-circle' : 'close-circle-outline'}
                  size={22}
                  color={permissions[key] ? GREEN : c.textMuted}
                />
              )}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#0d6efd' }]}
            onPress={resetPassword}
            disabled={resettingPassword}
          >
            {resettingPassword ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="key-outline" size={20} color="#fff" />
            )}
            <Text style={styles.actionButtonText}>Reset Password</Text>
          </TouchableOpacity>

          {editing && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}
              onPress={() => {
                setEditing(false);
                setFullName(initialMarshal?.fullName || '');
                setIdNumber(initialMarshal?.idNumber || '');
                setPhoneNumber(initialMarshal?.phoneNumber || '');
                setEmail(initialMarshal?.email || '');
                setMarshalCode(initialMarshal?.marshalCode || '');
                setEmergencyContact(initialMarshal?.emergencyContact || '');
                setExperience(initialMarshal?.experience || '');
                setStatus(initialMarshal?.status || 'Active');
                setPermissions(initialMarshal?.permissions || {});
              }}
            >
              <Ionicons name="close-outline" size={20} color={c.text} />
              <Text style={[styles.actionButtonText, { color: c.text }]}>Cancel Edit</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: RED }]}
            onPress={toggleStatus}
          >
            <Ionicons name={status === 'Active' ? 'ban-outline' : 'checkmark-circle-outline'} size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {status === 'Active' ? 'Deactivate Marshal' : 'Activate Marshal'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      backgroundColor: '#1a1a2e',
      paddingTop: 48,
      paddingBottom: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: { padding: 4 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    content: { flex: 1, padding: 20 },
    statusSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    statusBadgeLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    statusTextLarge: { fontSize: 14, fontWeight: '700', marginLeft: 6 },
    toggleStatusBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    toggleStatusText: { fontSize: 12, marginLeft: 4 },
    codeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      marginBottom: 16,
    },
    codeInfo: { marginLeft: 12, flex: 1 },
    codeLabel: { fontSize: 12 },
    codeValue: { fontSize: 20, fontWeight: '800' },
    codeInput: { fontSize: 20, fontWeight: '800', padding: 0, borderBottomWidth: 0 },
    section: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    fieldGroup: { marginBottom: 14 },
    fieldLabel: { fontSize: 12, marginBottom: 4 },
    fieldValue: { fontSize: 15 },
    fieldInput: {
      fontSize: 15,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    permissionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    permissionLabel: { fontSize: 14 },
    actionsSection: { gap: 12, marginTop: 8 },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 12,
      gap: 8,
    },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });
}
