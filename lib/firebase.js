import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyCqkXSKzeeQ6LeQvanp3QGuflKK5Era-4s',
  authDomain: 'mindpath-3dcb9.firebaseapp.com',
  projectId: 'mindpath-3dcb9',
  storageBucket: 'mindpath-3dcb9.firebasestorage.app',
  messagingSenderId: '187899674876',
  appId: '1:187899674876:web:5e493df001d7d408905779',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

export { app, auth };
