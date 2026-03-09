import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { client } from '../api/client';

const GOLD = '#FFD700';
const GREEN = '#28a745';
const RED = '#dc3545';

export default function MarshalLoginScreen({ navigation }) {
  const { colors: c } = useTheme();
  
  const [marshalCode, setMarshalCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem('marshalSession');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        navigation.replace('MarshalDashboard', { marshal: session });
      }
    } catch (error) {
      console.error('Check session error:', error);
    }
  };

  const validateLogin = () => {
    if (!marshalCode.trim()) {
      Alert.alert('Error', 'Please enter your marshal code');
      return false;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const login = async () => {
    if (!validateLogin()) return;

    setLoading(true);
    try {
      console.log('Marshal login attempt:', { marshalCode, phoneNumber });
      
      // Find marshal by code and phone
      const response = await client.get(`/QueueMarshals/by-code/${marshalCode}`);
      const marshals = response.data || [];
      
      const marshal = marshals.find(m => m.phoneNumber === phoneNumber);
      
      if (!marshal) {
        Alert.alert('Login Failed', 'Invalid marshal code or phone number');
        return;
      }

      if (marshal.status !== 'Active') {
        Alert.alert('Login Failed', 'Your account is not active. Please contact your administrator.');
        return;
      }

      // Store session
      const sessionData = {
        id: marshal.id,
        fullName: marshal.fullName,
        marshalCode: marshal.marshalCode,
        phoneNumber: marshal.phoneNumber,
        taxiRankId: marshal.taxiRankId,
        permissions: marshal.permissions
      };

      await AsyncStorage.setItem('marshalSession', JSON.stringify(sessionData));
      
      console.log('Marshal login successful:', sessionData);
      
      Alert.alert(
        'Login Successful!',
        `Welcome back, ${marshal.fullName}!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('MarshalDashboard', { marshal: sessionData })
          }
        ]
      );
    } catch (error) {
      console.error('Marshal login error:', error);
      Alert.alert('Login Failed', 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToOnboarding = () => {
    navigation.navigate('MarshalOnboarding');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Queue Marshal Login</Text>
        <Text style={styles.headerSubtitle}>Mzansi Fleet Management</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="shield-outline" size={48} color={GOLD} />
          </View>
          <Text style={[styles.appName, { color: c.text }]}>Queue Marshal Portal</Text>
          <Text style={[styles.appDescription, { color: c.textMuted }]}>
            Capture trips, view schedules, and manage communications
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>Marshal Code</Text>
            <View style={[styles.inputContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="shield-outline" size={20} color={c.textMuted} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder="Enter your marshal code"
                placeholderTextColor={c.textMuted}
                value={marshalCode}
                onChangeText={setMarshalCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>Phone Number</Text>
            <View style={[styles.inputContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={c.textMuted} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder="Enter your phone number"
                placeholderTextColor={c.textMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: GOLD }]}
            onPress={login}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={[styles.loginButtonText, { color: '#000' }]}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.textMuted }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.onboardingButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={goToOnboarding}
          >
            <Ionicons name="person-add-outline" size={20} color={GOLD} />
            <Text style={[styles.onboardingButtonText, { color: GOLD }]}>Create New Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <Text style={[styles.featuresTitle, { color: c.text }]}>Marshal Features:</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={GREEN} />
              <Text style={[styles.featureText, { color: c.text }]}>Capture Trips</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={GREEN} />
              <Text style={[styles.featureText, { color: c.text }]}>View Schedules</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={GREEN} />
              <Text style={[styles.featureText, { color: c.text }]}>Send & Receive Messages</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="close-circle" size={16} color={RED} />
              <Text style={[styles.featureText, { color: c.textMuted }]}>Limited Access (Security)</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textMuted }]}>
            Powered by Mzansi Fleet Management
          </Text>
          <Text style={[styles.versionText, { color: c.textMuted }]}>
            Version 1.0.0
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4
  },
  headerSubtitle: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '600'
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center'
  },
  appDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20
  },

  form: {
    marginBottom: 32
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16
  },

  loginButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24
  },
  dividerLine: {
    flex: 1,
    height: 1
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500'
  },

  onboardingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16
  },
  onboardingButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },

  features: {
    marginBottom: 32
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center'
  },
  featureList: {
    gap: 12
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500'
  },

  footer: {
    alignItems: 'center',
    paddingBottom: 40
  },
  footerText: {
    fontSize: 12,
    marginBottom: 4
  },
  versionText: {
    fontSize: 10
  }
});
