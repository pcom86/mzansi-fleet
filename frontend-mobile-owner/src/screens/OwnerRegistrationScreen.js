import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import ImagePickerBase64 from '../components/ImagePickerBase64';
import { createOwnerProfile, createUser } from '../api/identity';
import { Colors } from '../theme';

export default function OwnerRegistrationScreen({ navigation }) {
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name || !idNumber || !phone || !email || !password) return Alert.alert('Validation', 'All fields are required');
    try {
      setLoading(true);
      const userResp = await createUser({ tenantId: null, email, phone, password, role: 'Owner', isActive: true });
      const userId = userResp?.id || userResp?.userId || userResp?.data?.id;
      await createOwnerProfile({ userId: userId || null, name, idNumber, phone, email, photoUrl: photoBase64 });
      Alert.alert('Success', 'Owner registered');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Owner Registration</Text>
      <TextInput placeholder="Full name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="ID number" value={idNumber} onChangeText={setIdNumber} style={styles.input} />
      <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <ImagePickerBase64 onPicked={(data) => setPhotoBase64(data.base64)} />
      <View style={{ height: 12 }} />
      <Button color={Colors.primary} title={loading ? 'Submitting…' : 'Submit'} onPress={submit} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 }
});
