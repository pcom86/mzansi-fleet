import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';

export default function RatingReviewModal({ visible, onClose, onSubmit, request, role }) {
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const targetName = role === 'driver' ? request?.vehicleRegistration || 'Vehicle' : request?.serviceProviderName || 'Service Provider';
  const jobTitle = request?.category || 'Job';

  async function handleSubmit() {
    if (rating === 0) return Alert.alert('Rating Required', 'Please select a star rating');
    try {
      setSubmitting(true);
      await onSubmit({ rating, review: review.trim() || null });
      onClose();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="star-outline" size={22} color={c.primary} />
              <Text style={[styles.title, { color: c.text }]}>Rate & Review</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={26} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.jobInfo, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.jobTitle, { color: c.text }]}>{jobTitle}</Text>
            <Text style={[styles.jobTarget, { color: c.textMuted }]}>{targetName}</Text>
            <Text style={[styles.jobDate, { color: c.textMuted }]}>
              {request?.scheduledDate ? new Date(request.scheduledDate).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
            </Text>
          </View>

          <Text style={[styles.label, { color: c.textMuted }]}>Overall Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= rating ? '#fbbf24' : c.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.ratingHint, { color: c.textMuted }]}>
            {rating === 0 ? 'Tap to rate' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </Text>

          <Text style={[styles.label, { color: c.textMuted }]}>Review (optional)</Text>
          <TextInput
            value={review}
            onChangeText={setReview}
            multiline
            style={[styles.textarea, { borderColor: c.border, backgroundColor: c.background, color: c.text }]}
            placeholder="Share your experience…"
            placeholderTextColor={c.textMuted}
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: c.primary }, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <Text style={styles.submitBtnTxt}>Submitting…</Text>
              : <Text style={styles.submitBtnTxt}>Submit Review</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '800' },
  jobInfo: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  jobTitle: { fontSize: 15, fontWeight: '800' },
  jobTarget: { fontSize: 13, marginTop: 2 },
  jobDate: { fontSize: 12, marginTop: 1 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 4 },
  ratingHint: { textAlign: 'center', fontSize: 12, marginBottom: 12 },
  textarea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  submitBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});