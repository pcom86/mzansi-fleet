import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme';

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString();
}

export default function OwnerMessageDetailsScreen({ route, navigation }) {
  const { message } = route.params || {};
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const subject = useMemo(() => message?.subject || 'Message', [message]);

  useEffect(() => {
    navigation.setOptions({ title: subject });
  }, [navigation, subject]);

  if (!message) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Message</Text>
        <Text style={styles.empty}>No message selected.</Text>
      </View>
    );
  }

  const sender = message.senderName || message.senderEmail || message.senderId || 'Unknown sender';
  const recipient = message.recipientName || message.recipientEmail || message.recipientId || '';
  const date = formatDate(message.sentAt || message.createdAt || message.date);
  const body = message.content || message.body || message.message || '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>{message.subject || 'Message'}</Text>
      <Text style={styles.meta}>From: {sender}</Text>
      {!!recipient && <Text style={styles.meta}>To: {recipient}</Text>}
      {!!date && <Text style={styles.meta}>Date: {date}</Text>}

      <View style={{ height: 12 }} />
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('OwnerComposeMessage', { mode: 'reply', replyTo: message })}
        >
          <Text style={styles.btnText}>Reply</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 12 }} />
      <View style={styles.card}>
        <Text style={styles.body}>{body || 'No content'}</Text>
      </View>
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    title: { fontSize: 16, fontWeight: '900', marginBottom: 8, color: c.text },
    empty: { color: c.textMuted },
    meta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    actionsRow: { flexDirection: 'row', alignItems: 'center' },
    btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary },
    btnText: { color: c.primaryText, fontWeight: '900' },
    card: { padding: 12, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border },
    body: { fontSize: 13, color: c.text, lineHeight: 18 },
  });
}
