import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

import {
  migrateLegacyAccountIfNeeded,
  subscribeToUserProfile,
} from './firestore-data';
import { auth } from './firebase';

export function useLinkedAccount() {
  const [user, setUser] = useState(auth.currentUser ?? null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!isMounted) {
        return;
      }

      setUser(nextUser);
      setIsAuthReady(true);
      setProfileError('');

      if (!nextUser) {
        setUserProfile(null);
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);

      try {
        await migrateLegacyAccountIfNeeded(nextUser);
      } catch (error) {
        console.error('Legacy account migration failed', error);
        if (isMounted) {
          setProfileError(error?.message ?? 'Could not prepare this account.');
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      setIsProfileLoading(false);
      return undefined;
    }

    setIsProfileLoading(true);

    return subscribeToUserProfile(
      user.uid,
      (profile) => {
        setUserProfile(profile);
        setIsProfileLoading(false);
      },
      (error) => {
        console.error('User profile subscription failed', error);
        setProfileError(error?.message ?? 'Could not load the linked patient.');
        setIsProfileLoading(false);
      }
    );
  }, [user?.uid]);

  return {
    user,
    userId: user?.uid ?? null,
    userProfile,
    patientId: userProfile?.linkedPatientId ?? null,
    role: userProfile?.role ?? null,
    isAuthReady,
    isProfileLoading,
    profileError,
  };
}
