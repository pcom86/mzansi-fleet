import React from 'react';
import { Button, View, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const IMAGE_MEDIA_TYPES =
  ImagePicker?.MediaType?.Image
    ? [ImagePicker.MediaType.Image]
    : (ImagePicker?.MediaTypeOptions?.Images ?? ImagePicker?.MediaTypeOptions?.All);

export default function ImagePickerBase64({ onPicked, thumbnailStyle }) {
  const [uri, setUri] = React.useState(null);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      ...(IMAGE_MEDIA_TYPES ? { mediaTypes: IMAGE_MEDIA_TYPES } : {}),
      base64: true,
      quality: 0.7,
    });

    if (res.canceled) return;

    const asset = res.assets?.[0];
    if (!asset?.uri) return;

    setUri(asset.uri);
    onPicked && onPicked({ uri: asset.uri, base64: asset.base64 });
  }

  return (
    <View>
      <Button title="Pick image" onPress={pickImage} />
      {uri ? <Image source={{ uri }} style={[{ width: 120, height: 120, marginTop: 8 }, thumbnailStyle]} /> : null}
    </View>
  );
}
