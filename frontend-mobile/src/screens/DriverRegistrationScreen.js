import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../theme';

const IMAGE_MEDIA_TYPES =
  ImagePicker?.MediaType?.image
    ? [ImagePicker.MediaType.image]
    : (ImagePicker?.MediaTypeOptions?.Images ?? ImagePicker?.MediaTypeOptions?.All);

export default function DriverRegistrationScreen({ navigation }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      ...(IMAGE_MEDIA_TYPES ? { mediaTypes: IMAGE_MEDIA_TYPES } : {}),
      base64: true,
      quality: 0.7,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null);
  }

  function next() {
    if (!name || !idNumber || !phone || !email || !password)
      return Alert.alert('Validation', 'All fields are required');
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) return Alert.alert('Validation', 'Enter a valid email address');
    if (password.length < 6) return Alert.alert('Validation', 'Password must be at least 6 characters');
    navigation.navigate('DriverOnboardingStep2', { name, idNumber, phone, email, password, photoUrl: photoBase64 || '' });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.stepHint}>Step 1 of 2</Text>
      <Text style={styles.title}>Basic Information</Text>

      <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>📷</Text>
            <Text style={styles.photoHint}>Tap to add photo</Text>
          </View>
        )}
        {photoUri && (
          <View style={styles.photoEditBadge}>
            <Text style={styles.photoEditText}>✏️</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Full Name</Text>
      <TextInput placeholder="Full name" placeholderTextColor={c.textMuted} value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>ID Number</Text>
      <TextInput placeholder="ID number" placeholderTextColor={c.textMuted} value={idNumber} onChangeText={setIdNumber} style={styles.input} />

      <Text style={styles.label}>Phone</Text>
      <TextInput placeholder="Phone" placeholderTextColor={c.textMuted} value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />

      <Text style={styles.label}>Email</Text>
      <TextInput placeholder="Email" placeholderTextColor={c.textMuted} value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" keyboardType="email-address" />

      <Text style={styles.label}>Password</Text>
      <TextInput placeholder="Password" placeholderTextColor={c.textMuted} value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

      <TouchableOpacity style={styles.btnPrimary} onPress={next}>
        <Text style={styles.btnPrimaryText}>Next  →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    stepHint: { fontSize: 12, fontWeight: '700', color: c.textMuted, textAlign: 'center', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' },
    title: { fontSize: 22, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 20 },
    photoPicker: { alignSelf: 'center', width: 110, height: 110, borderRadius: 55, overflow: 'hidden', marginBottom: 20, borderWidth: 2, borderColor: c.border, backgroundColor: c.surface },
    photoImage: { width: '100%', height: '100%' },
    photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    photoIcon: { fontSize: 32, marginBottom: 4 },
    photoHint: { fontSize: 10, color: c.textMuted, fontWeight: '600', textAlign: 'center', paddingHorizontal: 6 },
    photoEditBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: c.primary, borderRadius: 12, padding: 4 },
    photoEditText: { fontSize: 12 },
    label: { fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 6, color: c.text },
    input: { borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12, backgroundColor: c.surface, color: c.text, marginBottom: 4 },
    btnPrimary: { marginTop: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
    btnPrimaryText: { color: c.primaryText, fontWeight: '900', fontSize: 15 },
  });
}
