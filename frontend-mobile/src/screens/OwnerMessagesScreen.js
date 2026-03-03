import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getInbox, markAsRead } from '../api/messaging';
import { useAppTheme } from '../theme';

export default function OwnerMessagesScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);

  const userId = useMemo(() => user?.id || user?.userId || null, [user]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const inbox = await getInbox(userId);
        if (!mounted) return;
        setMessages(Array.isArray(inbox) ? inbox : []);
      } catch (e) {
        Alert.alert('Error', 'Failed to load messages');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (userId) load();
    else setLoading(false);
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (!userId) return;
      try {
        const inbox = await getInbox(userId);
        setMessages(Array.isArray(inbox) ? inbox : []);
      } catch {
        // ignore
      }
    });
    return unsubscribe;
  }, [navigation, userId]);

  function isUnread(msg) {
    return msg?.isRead === false || msg?.IsRead === false;
  }

  async function openMessage(item) {
    navigation.navigate('OwnerMessageDetails', { message: item });

    const id = item?.id || item?.Id;
    if (!id) return;
    if (!isUnread(item)) return;

    setMessages(prev => prev.map(m => ((m.id || m.Id) === id ? { ...m, isRead: true, IsRead: true } : m)));
    try {
      await markAsRead(id);
    } catch (e) {
      // if mark-as-read fails, we keep optimistic UI
      console.warn('Failed to mark message read', e);
    }
  }

  if (loading) return (
    <View style={styles.loading}><ActivityIndicator size="large" /></View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Inbox</Text>
        <TouchableOpacity style={styles.composeBtn} onPress={() => navigation.navigate('OwnerComposeMessage', { mode: 'compose' })}>
          <Text style={styles.composeBtnText}>Compose</Text>
        </TouchableOpacity>
      </View>
      {messages.length === 0 ? (
        <Text style={styles.empty}>No messages.</Text>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item, idx) => item.id || String(idx)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openMessage(item)}>
              <View style={[styles.card, isUnread(item) && styles.cardUnread]}>
                <View style={styles.rowTop}>
                  <Text style={[styles.subject, isUnread(item) && styles.subjectUnread]} numberOfLines={1}>
                    {item.subject || 'Message'}
                  </Text>
                  {isUnread(item) && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.meta}>{item.senderName || item.senderEmail || item.senderId || 'Unknown sender'}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.content || item.body || item.message || ''}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '900', color: c.text },
    empty: { color: c.textMuted },
    card: { padding: 12, backgroundColor: c.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    cardUnread: { borderColor: c.primary },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    subject: { fontSize: 14, fontWeight: '800', flex: 1, paddingRight: 10, color: c.text },
    subjectUnread: { fontWeight: '900' },
    meta: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    body: { fontSize: 12, color: c.textMuted, marginTop: 6 },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary },
    composeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary },
    composeBtnText: { color: c.primaryText, fontWeight: '900' },
  });
}
