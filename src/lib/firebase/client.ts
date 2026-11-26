import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// functionsをモジュールレベルで作成し、エミュレータ接続前にインスタンスを確立する
export const functions = getFunctions(app, 'asia-northeast1');

// エミュレータへの接続（開発環境のみ・ブラウザ側で一度だけ実行）
declare global {
  interface Window {
    __firebaseEmulatorsConnected?: boolean;
  }
}

if (
  process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' &&
  typeof window !== 'undefined' &&
  !window.__firebaseEmulatorsConnected
) {
  window.__firebaseEmulatorsConnected = true;
  const emulatorHost = process.env.NEXT_PUBLIC_EMULATOR_HOST ?? 'localhost';
  // 警告バナーは画面下端に固定表示され、サイドバー下端・モバイル下部ナビのクリックを奪うため出さない
  connectAuthEmulator(auth, `http://${emulatorHost}:9098`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
  connectStorageEmulator(storage, emulatorHost, 9199);
  connectFunctionsEmulator(functions, emulatorHost, 5001);
}

export default app;
