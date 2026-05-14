'use client';

import { useEffect, useState } from 'react';
import { getMessagingIfSupported } from '@/lib/firebase/client';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { User as FirebaseUser } from 'firebase/auth';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function usePushPermission(currentUser: FirebaseUser | null) {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!currentUser || typeof Notification === 'undefined') return;
    const perm = Notification.permission;
    // Read browser permission state once after login — not a cascade risk
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermissionState(perm);
    if (perm === 'default') setShowBanner(true);
  }, [currentUser]);

  async function requestPermission() {
    if (!currentUser) return;

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      setShowBanner(false);

      if (permission !== 'granted') return;

      const messaging = await getMessagingIfSupported();
      if (!messaging || !VAPID_KEY) return;

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          fcmTokens: arrayUnion(token),
        });
      }
    } catch (err) {
      console.error('FCMトークン取得エラー:', err);
    }
  }

  function dismissBanner() {
    setShowBanner(false);
  }

  return { permissionState, showBanner, requestPermission, dismissBanner };
}
