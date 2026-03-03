import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL = (typeof process !== 'undefined' && process.env.MF_API_URL) || `http://${localhost}:5000/api`;
