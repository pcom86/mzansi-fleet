import React from 'react';
import { Button, View, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ImagePickerBase64({ onPicked, thumbnailStyle }) {
  const [uri, setUri] = React.useState(null);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (!res.cancelled) {
      setUri(res.uri);
      onPicked && onPicked({ uri: res.uri, base64: res.base64 });
    }
  }

  return (
    <View>
      <Button title="Pick image" onPress={pickImage} />
      {uri ? <Image source={{ uri }} style={[{ width: 120, height: 120, marginTop: 8 }, thumbnailStyle]} /> : null}
    </View>
  );
}
