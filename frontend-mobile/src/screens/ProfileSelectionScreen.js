import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MzansiLogo from '../components/MzansiLogo';
import { useAppTheme } from '../theme';

export default function ProfileSelectionScreen({ navigation }) {
  const { theme } = useAppTheme();
  const c = theme.colors;

  const profiles = [
    { key: 'user', title: 'Passenger', subtitle: 'Book rides and track trips', icon: 'person-outline', onPress: () => navigation.navigate('Onboarding', { role: 'User' }) },
    { key: 'rank', title: 'Taxi Rank User', subtitle: 'Manage rank operations', icon: 'business-outline', onPress: () => navigation.navigate('TaxiRankRoleSelection') },
    { key: 'driver', title: 'Driver', subtitle: 'Register and start driving', icon: 'car-sport-outline', onPress: () => navigation.navigate('DriverRegistration') },
    { key: 'service', title: 'Service Provider', subtitle: 'Offer maintenance services', icon: 'construct-outline', onPress: () => navigation.navigate('ServiceProviderRegistration') },
    { key: 'owner', title: 'Owner', subtitle: 'Run your fleet dashboard', icon: 'briefcase-outline', onPress: () => navigation.navigate('Onboarding', { role: 'Owner' }) },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: c.primary }]}> 
        <View style={styles.heroIconWrap}>
          <Ionicons name="people-outline" size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Choose Your Profile</Text>
          <Text style={styles.heroSub}>Set up the right experience for your role in MzansiFleet App.</Text>
        </View>
      </View>

      <View style={[styles.brandCard, { backgroundColor: c.surface, borderColor: c.border }]}> 
        <View style={styles.logoWrap}>
          <MzansiLogo width={132} height={54} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>Select profile to register</Text>
      </View>

      <View style={styles.actionsWrap}>
        {profiles.map((profile, index) => (
          <TouchableOpacity
            key={profile.key}
            style={[
              styles.profileBtn,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                shadowColor: '#000',
              },
            ]}
            activeOpacity={0.88}
            onPress={profile.onPress}
          >
            <View style={[styles.profileIconWrap, { backgroundColor: `${index === 4 ? c.accent : c.primary}20` }]}>
              <Ionicons name={profile.icon} size={18} color={index === 4 ? c.accent : c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileTitle, { color: c.text }]}>{profile.title}</Text>
              <Text style={[styles.profileSub, { color: c.textMuted }]}>{profile.subtitle}</Text>
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
  heroCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 12 },
  heroIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  heroSub: { color: '#ffffffcc', fontSize: 12, marginTop: 4, lineHeight: 18 },
  brandCard: { borderWidth: 1, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 12, marginBottom: 12 },
  logoWrap: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  actionsWrap: { gap: 10 },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  profileTitle: { fontSize: 15, fontWeight: '800' },
  profileSub: { fontSize: 11, marginTop: 1 },
});
