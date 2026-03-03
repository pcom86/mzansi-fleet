import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { sendMessage } from '../api/messaging';
import { useAppTheme } from '../theme';

export default function OwnerComposeMessageScreen({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const mode = route?.params?.mode || 'compose';
  const replyTo = route?.params?.replyTo || null;

  const senderId = useMemo(() => user?.id || user?.userId || null, [user]);

  const [receiverId, setReceiverId] = useState(String(route?.params?.receiverId || replyTo?.senderId || ''));
  const [subject, setSubject] = useState(String(route?.params?.subject || (replyTo?.subject ? `Re: ${replyTo.subject}` : '')));
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const parentMessageId = replyTo?.id || replyTo?.Id || route?.params?.parentMessageId || null;

  useEffect(() => {
    navigation.setOptions({ title: mode === 'reply' ? 'Reply' : 'New Message' });
  }, [navigation, mode]);

  function validate() {
    if (!senderId) {
      Alert.alert('Error', 'Sender is missing (not logged in)');
      return false;
    }
    if (!receiverId?.trim()) {
      Alert.alert('Validation', 'ReceiverId is required');
      return false;
    }
    if (!subject?.trim()) {
      Alert.alert('Validation', 'Subject is required');
      return false;
    }
    if (!content?.trim()) {
      Alert.alert('Validation', 'Message content is required');
      return false;
    }
    return true;
  }

  async function onSend() {
    if (!validate()) return;

    const payload = {
      senderId,
      receiverId,
      subject,
      content,
      parentMessageId: parentMessageId || null,
      relatedEntityType: replyTo?.relatedEntityType || null,
      relatedEntityId: replyTo?.relatedEntityId || null,
    };

    try {
      setSending(true);
      await sendMessage(payload);
      Alert.alert('Sent', 'Message sent successfully');
      navigation.goBack();
    } catch (e) {
      console.warn('Failed to send message', e);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.label}>To (Receiver ID)</Text>
      <TextInput
        value={receiverId}
        onChangeText={setReceiverId}
        style={styles.input}
        placeholder="Receiver GUID"
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        editable={!sending && mode !== 'reply'}
      />

      <Text style={styles.label}>Subject</Text>
      <TextInput
        value={subject}
        onChangeText={setSubject}
        style={styles.input}
        placeholder="Subject"
        placeholderTextColor={c.textMuted}
        editable={!sending}
      />

      <Text style={styles.label}>Message</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        style={[styles.input, styles.textArea]}
        placeholder="Write your message..."
        placeholderTextColor={c.textMuted}
        multiline
        editable={!sending}
      />

      <TouchableOpacity style={[styles.btnPrimary, sending && { opacity: 0.6 }]} onPress={onSend} disabled={sending}>
        {sending ? <ActivityIndicator color={c.primaryText} /> : <Text style={styles.btnPrimaryText}>Send</Text>}
      </TouchableOpacity>

      {mode === 'reply' && replyTo?.senderEmail ? (
        <Text style={styles.hint}>Replying to: {replyTo.senderEmail}</Text>
      ) : null}
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    label: { fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 6, color: c.text },
    input: { borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12, backgroundColor: c.surface, color: c.text },
    textArea: { minHeight: 120, textAlignVertical: 'top' },
    btnPrimary: { marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary, alignItems: 'center' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900' },
    hint: { marginTop: 10, fontSize: 12, color: c.textMuted },
  });
}
