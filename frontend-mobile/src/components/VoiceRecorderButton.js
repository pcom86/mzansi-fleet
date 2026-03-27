import React, { useState, useRef } from 'react';
import { View, Button, Text, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

/**
 * VoiceRecorderButton
 * A reusable component for recording audio and returning the audio blob.
 * Props:
 *   onRecordingComplete: (audioBlob) => void
 *   isRecording: boolean (optional, for external control)
 *   style: object (optional)
 */
export default function VoiceRecorderButton({ onRecordingComplete, style }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const recordingRef = useRef(null);

  async function startRecording() {
    try {
      setError(null);
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      setError('Could not start recording: ' + err.message);
    }
  }

  async function stopRecording() {
    try {
      setIsRecording(false);
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const response = await fetch(uri);
      const audioBlob = await response.blob();
      setRecording(null);
      recordingRef.current = null;
      if (onRecordingComplete) onRecordingComplete(audioBlob);
    } catch (err) {
      setError('Could not stop recording: ' + err.message);
    }
  }

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={isRecording ? stopRecording : startRecording}
        style={{
          backgroundColor: isRecording ? '#e74c3c' : '#2ecc71',
          padding: 12,
          borderRadius: 25,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 50,
          minHeight: 50,
        }}
      >
        <Ionicons 
          name={isRecording ? 'stop' : 'mic'} 
          size={24} 
          color="#fff" 
        />
      </TouchableOpacity>
      {error && <Text style={{ color: 'red', marginTop: 8, fontSize: 12 }}>{error}</Text>}
    </View>
  );
}
