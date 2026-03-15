import { onAuthStateChanged } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { saveUserPushToken } from '@/lib/firestore-data';
import { auth } from '@/lib/firebase';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';

const firebaseAuth = auth as Auth;

export function PushNotificationGate() {
  const [userId, setUserId] = useState(firebaseAuth.currentUser?.uid ?? '');

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    return onAuthStateChanged(firebaseAuth, (user) => {
      setUserId(user?.uid ?? '');
    });
  }, []);

  useEffect(() => {
    if (!userId || Platform.OS === 'web') {
      return;
    }

    let isCancelled = false;

    async function syncPushToken() {
      try {
        const pushToken = await registerForPushNotificationsAsync();

        if (!pushToken || isCancelled) {
          return;
        }

        await saveUserPushToken(userId, pushToken);
      } catch (error) {
        console.error('Push token registration failed', error);
      }
    }

    void syncPushToken();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  return null;
}
