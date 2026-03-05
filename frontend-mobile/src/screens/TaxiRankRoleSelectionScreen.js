import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';

export default function TaxiRankRoleSelectionScreen({ navigation }) {
  const { theme } = useAppTheme();
  const c = theme.colors;

  const roles = [
    {
      key: 'admin',
      title: 'Taxi Rank Manager',
      subtitle: 'Manage the rank, marshals, vehicles and schedules',
      icon: 'people-outline',
      role: 'TaxiRankAdmin',
    },
    {
      key: 'marshal',
      title: 'Taxi Marshal',
      subtitle: 'Operate at a taxi rank and manage daily queues',
      icon: 'shield-outline',
      role: 'TaxiMarshal',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: c.primary }]}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="business-outline" size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Taxi Rank Registration</Text>
          <Text style={styles.heroSub}>Select the type of taxi rank user you would like to register as.</Text>
        </View>
      </View>

      <View style={styles.rolesWrap}>
        {roles.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.roleBtn, { backgroundColor: c.surface, borderColor: c.border, shadowColor: '#000' }]}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Onboarding', { role: item.role })}
          >
            <View style={[styles.roleIconWrap, { backgroundColor: `${c.primary}20` }]}>
              <Ionicons name={item.icon} size={22} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleTitle, { color: c.text }]}>{item.title}</Text>
              <Text style={[styles.roleSub, { color: c.textMuted }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  heroCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 20 },
  heroIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  heroSub: { color: '#ffffffcc', fontSize: 12, marginTop: 4, lineHeight: 18 },
  rolesWrap: { gap: 12 },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  roleIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  roleTitle: { fontSize: 16, fontWeight: '800' },
  roleSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
});
