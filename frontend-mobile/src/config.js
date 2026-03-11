import { Platform } from 'react-native';
import Constants from 'expo-constants';

function extractHost(value) {
  if (!value || typeof value !== 'string') return null;

  if (value.includes('://')) {
    try {
      return new URL(value).hostname || null;
    } catch {
      return null;
    }
  }

  return value.split(':')[0] || null;
}

const extraApiUrl =
  Constants.expoConfig?.extra?.apiUrl
  || Constants.manifest2?.extra?.expoClient?.extra?.apiUrl
  || Constants.manifest?.extra?.apiUrl
  || null;

const envApiUrl = (typeof process !== 'undefined' && (process.env.EXPO_PUBLIC_API_URL || process.env.MF_API_URL)) || null;
const hostUriCandidates = [
  Constants.expoConfig?.hostUri,
  Constants.expoGoConfig?.debuggerHost,
  Constants.linkingUri,
  Constants.manifest2?.extra?.expoClient?.hostUri,
  Constants.manifest?.debuggerHost,
];
const expoHost = hostUriCandidates.map(extractHost).find(Boolean) || null;
const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const host = Platform.OS === 'web' ? 'localhost' : (expoHost || defaultHost);

export const API_URL = extraApiUrl || envApiUrl || `http://192.168.1.160:5000/api`;
