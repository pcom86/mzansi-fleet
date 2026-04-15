import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Image, Linking, Share, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import client from '../api/client';

const GOLD = '#D4AF37';

export default function ExpenseDetailsScreen({ route, navigation }) {
  const { expenseId } = route.params || {};
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    if (expenseId) {
      loadExpenseDetails();
    }
  }, [expenseId]);

  const loadExpenseDetails = async () => {
    try {
      setLoading(true);
      // We'll need to create an endpoint to get single expense details
      // For now, we'll simulate by getting all expenses and finding the one
      const res = await client.get(`/VehicleExpenses/vehicle/${expense.vehicleId}`);
      const expenses = res.data || [];
      const found = expenses.find(e => e.id === expenseId);
      setExpense(found);
    } catch (e) {
      console.error('Load expense error:', e);
      Alert.alert('Error', 'Failed to load expense details');
    } finally {
      setLoading(false);
    }
  };

  const shareExpense = async () => {
    if (!expense) return;
    
    const shareText = `
Expense Details
================
Vehicle: ${expense.vehicle?.registration || 'N/A'}
Date: ${new Date(expense.date).toLocaleDateString()}
Category: ${expense.category}
Amount: R${expense.amount.toFixed(2)}
Vendor: ${expense.vendor || 'N/A'}
Invoice: ${expense.invoiceNumber || 'N/A'}
Description: ${expense.description || 'N/A'}

${expense.isMechanical ? `
Mechanical Details:
- Category: ${expense.mechanicalCategory || 'N/A'}
- Mechanic: ${expense.mechanicName || 'N/A'}
- Labor Cost: R${(expense.laborCost || 0).toFixed(2)}
- Parts Cost: R${(expense.partsCost || 0).toFixed(2)}
- Odometer: ${expense.odometerReading || 'N/A'} km
- Warranty: ${expense.warrantyInfo || 'N/A'}
- Next Service: ${expense.nextServiceDate ? new Date(expense.nextServiceDate).toLocaleDateString() : 'N/A'}
` : ''}
    `.trim();

    try {
      await Share.share({
        message: shareText,
        title: 'Expense Details'
      });
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  const openReceipt = () => {
    if (expense.receiptImageUrl) {
      setShowReceiptModal(true);
    }
  };

  const downloadReceipt = async () => {
    if (expense.receiptFileUrl) {
      try {
        await Linking.openURL(expense.receiptFileUrl);
      } catch (e) {
        Alert.alert('Error', 'Unable to open receipt file');
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading expense details...</Text>
        </View>
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={c.textMuted} />
          <Text style={[styles.errorTitle, { color: c.text }]}>Expense Not Found</Text>
          <Text style={[styles.errorSub, { color: c.textMuted }]}>The expense details could not be loaded.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Expense Details</Text>
          <Text style={styles.headerSub}>{expense.category}</Text>
        </View>
        <TouchableOpacity onPress={shareExpense} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Amount Card */}
        <View style={[styles.amountCard, { backgroundColor: '#1e293b' }]}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>R{expense.amount.toFixed(2)}</Text>
          <Text style={styles.amountDate}>{new Date(expense.date).toLocaleDateString()}</Text>
        </View>

        {/* Basic Information */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Basic Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: c.textMuted }]}>Category</Text>
            <Text style={[styles.infoValue, { color: c.text }]}>{expense.category}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: c.textMuted }]}>Vendor</Text>
            <Text style={[styles.infoValue, { color: c.text }]}>{expense.vendor || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: c.textMuted }]}>Invoice Number</Text>
            <Text style={[styles.infoValue, { color: c.text }]}>{expense.invoiceNumber || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: c.textMuted }]}>Description</Text>
            <Text style={[styles.infoValue, { color: c.text }]}>{expense.description || 'No description'}</Text>
          </View>
        </View>

        {/* Receipt */}
        {(expense.hasReceipt || expense.receiptImageUrl || expense.receiptFileUrl) && (
          <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Receipt/Invoice</Text>
            
            {expense.receiptImageUrl && (
              <TouchableOpacity style={styles.receiptPreview} onPress={openReceipt}>
                <Image source={{ uri: expense.receiptImageUrl }} style={styles.receiptThumbnail} />
                <View style={styles.receiptOverlay}>
                  <Ionicons name="eye-outline" size={24} color="#fff" />
                  <Text style={styles.receiptOverlayText}>View Receipt</Text>
                </View>
              </TouchableOpacity>
            )}
            
            {expense.receiptFileUrl && (
              <TouchableOpacity style={styles.downloadBtn} onPress={downloadReceipt}>
                <Ionicons name="document-outline" size={20} color={c.primary} />
                <Text style={[styles.downloadBtnText, { color: c.primary }]}>Download Receipt</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Mechanical Details */}
        {expense.isMechanical && (
          <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Mechanical Service Details</Text>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textMuted }]}>Mechanical Category</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>{expense.mechanicalCategory || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textMuted }]}>Mechanic/Shop</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>{expense.mechanicName || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textMuted }]}>Odometer Reading</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>{expense.odometerReading ? `${expense.odometerReading.toLocaleString()} km` : 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textMuted }]}>Labor Description</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>{expense.laborDescription || 'N/A'}</Text>
            </View>
            
            <View style={styles.costBreakdown}>
              <View style={styles.costItem}>
                <Text style={[styles.costLabel, { color: c.textMuted }]}>Labor Cost</Text>
                <Text style={[styles.costValue, { color: c.text }]}>R{(expense.laborCost || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.costDivider} />
              <View style={styles.costItem}>
                <Text style={[styles.costLabel, { color: c.textMuted }]}>Parts Cost</Text>
                <Text style={[styles.costValue, { color: c.text }]}>R{(expense.partsCost || 0).toFixed(2)}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textMuted }]}>Warranty Information</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>{expense.warrantyInfo || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textMuted }]}>Next Service Date</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>
                {expense.nextServiceDate ? new Date(expense.nextServiceDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>

            {/* Parts Replaced */}
            {expense.partsReplaced && expense.partsReplaced.length > 0 && (
              <View style={styles.partsSection}>
                <Text style={[styles.partsTitle, { color: c.text }]}>Parts Replaced</Text>
                {expense.partsReplaced.map((part, index) => (
                  <View key={index} style={[styles.partCard, { backgroundColor: c.background, borderColor: c.border }]}>
                    <View style={styles.partHeader}>
                      <Text style={[styles.partName, { color: c.text }]}>{part.partName}</Text>
                      <Text style={[styles.partCost, { color: c.text }]}>R{part.cost.toFixed(2)}</Text>
                    </View>
                    
                    {part.partNumber && (
                      <View style={styles.partInfo}>
                        <Text style={[styles.partInfoLabel, { color: c.textMuted }]}>Part Number:</Text>
                        <Text style={[styles.partInfoValue, { color: c.text }]}>{part.partNumber}</Text>
                      </View>
                    )}
                    
                    {part.brand && (
                      <View style={styles.partInfo}>
                        <Text style={[styles.partInfoLabel, { color: c.textMuted }]}>Brand:</Text>
                        <Text style={[styles.partInfoValue, { color: c.text }]}>{part.brand}</Text>
                      </View>
                    )}
                    
                    <View style={styles.partInfo}>
                      <Text style={[styles.partInfoLabel, { color: c.textMuted }]}>Quantity:</Text>
                      <Text style={[styles.partInfoValue, { color: c.text }]}>{part.quantity}</Text>
                    </View>
                    
                    {part.warrantyPeriod && (
                      <View style={styles.partInfo}>
                        <Text style={[styles.partInfoLabel, { color: c.textMuted }]}>Warranty:</Text>
                        <Text style={[styles.partInfoValue, { color: c.text }]}>{part.warrantyPeriod}</Text>
                      </View>
                    )}
                    
                    {part.notes && (
                      <View style={styles.partInfo}>
                        <Text style={[styles.partInfoLabel, { color: c.textMuted }]}>Notes:</Text>
                        <Text style={[styles.partInfoValue, { color: c.text }]}>{part.notes}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Metadata */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Record Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: c.textMuted }]}>Recorded On</Text>
            <Text style={[styles.infoValue, { color: c.text }]}>
              {new Date(expense.createdAt).toLocaleDateString()} at {new Date(expense.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Receipt Modal */}
      <Modal visible={showReceiptModal} transparent animationType="fade" onRequestClose={() => setShowReceiptModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setShowReceiptModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Receipt</Text>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={c.text} />
              </TouchableOpacity>
            </View>
            
            {expense.receiptImageUrl && (
              <Image source={{ uri: expense.receiptImageUrl }} style={styles.fullReceiptImage} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
  },
  backBtn: { padding: 8 },
  shareBtn: { padding: 8 },
  placeholder: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  errorSub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  amountCard: {
    borderRadius: 12, padding: 20, marginBottom: 16,
    alignItems: 'center',
  },
  amountLabel: { fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  amountValue: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 4 },
  amountDate: { fontSize: 12, color: '#94a3b8' },

  section: {
    borderRadius: 12, borderWidth: 1, padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  infoLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 14, fontWeight: '600', flex: 2, textAlign: 'right' },

  receiptPreview: {
    position: 'relative', borderRadius: 8, overflow: 'hidden',
    marginBottom: 12,
  },
  receiptThumbnail: { width: '100%', height: 150 },
  receiptOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  receiptOverlayText: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 4 },
  
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: 8, borderWidth: 1, gap: 8,
  },
  downloadBtnText: { fontSize: 14, fontWeight: '600' },

  costBreakdown: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 8, padding: 12,
    marginVertical: 12,
  },
  costItem: { flex: 1, alignItems: 'center' },
  costLabel: { fontSize: 12, marginBottom: 4 },
  costValue: { fontSize: 16, fontWeight: '700' },
  costDivider: { width: 1, height: 40, backgroundColor: '#e2e8f0', marginHorizontal: 16 },

  partsSection: { marginTop: 16 },
  partsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  
  partCard: {
    borderRadius: 8, borderWidth: 1, padding: 12,
    marginBottom: 8,
  },
  partHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  partName: { fontSize: 14, fontWeight: '600' },
  partCost: { fontSize: 14, fontWeight: '700' },
  
  partInfo: {
    flexDirection: 'row', marginBottom: 4,
  },
  partInfoLabel: { fontSize: 12, color: '#64748b', width: 80 },
  partInfoValue: { fontSize: 12, color: '#475569', flex: 1 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCloseArea: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  modalContent: {
    width: '90%', maxHeight: '80%', borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalCloseBtn: { padding: 4 },
  fullReceiptImage: { width: '100%', height: 400, resizeMode: 'contain' },
});
