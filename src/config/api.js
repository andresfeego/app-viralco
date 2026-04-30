import { Platform } from 'react-native';

const explicitBaseUrl = String(process?.env?.VIRALCO_API_URL || '').trim();
const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
const port = '4000';

export const API_BASE_URL = explicitBaseUrl || `http://${host}:${port}`;
