/**
 * Firebase Auth Emulator ヘルパー
 *
 * Playwright テスト内でエミュレーターのユーザーとしてサインインする。
 * Firebase Auth SDK が管理する IndexedDB にトークンを直接注入することで
 * Google サインインポップアップなしに認証状態を確立する。
 */
import { Page } from '@playwright/test';

const FIREBASE_API_KEY = 'demo-api-key';
const AUTH_EMULATOR = 'http://localhost:9099';

export interface EmulatorUser {
  localId: string;
  email: string;
  displayName: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
}

/** Auth Emulator の REST API 経由でサインインしトークンを取得する */
export async function signInWithEmulator(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Step 1: Auth Emulator からトークンを取得
  const res = await page.request.post(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      data: { email, password, returnSecureToken: true },
    }
  );

  const user = (await res.json()) as EmulatorUser & { error?: unknown };
  if (user.error || !user.idToken) {
    throw new Error(`Auth Emulator サインイン失敗: ${JSON.stringify(user.error ?? user)}`);
  }

  // Step 2: Firebase Auth が使う IndexedDB にトークンを書き込む
  await page.evaluate(
    async ({ user, apiKey }) => {
      const DB_NAME = 'firebaseLocalStorageDb';
      const STORE_NAME = 'firebaseLocalStorage';
      const fbaseKey = `firebase:authUser:${apiKey}:[DEFAULT]`;

      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);

        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'fbase_key' });
          }
        };

        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);

          const expiresInMs = parseInt(user.expiresIn ?? '3600') * 1000;

          store.put({
            fbase_key: fbaseKey,
            value: {
              uid: user.localId,
              email: user.email,
              displayName: user.displayName ?? '',
              photoURL: null,
              emailVerified: true,
              isAnonymous: false,
              providerData: [
                {
                  providerId: 'password',
                  uid: user.email,
                  displayName: user.displayName ?? '',
                  email: user.email,
                  phoneNumber: null,
                  photoURL: null,
                },
              ],
              stsTokenManager: {
                refreshToken: user.refreshToken,
                accessToken: user.idToken,
                expirationTime: Date.now() + expiresInMs,
              },
              createdAt: String(Date.now()),
              lastLoginAt: String(Date.now()),
              apiKey,
              appName: '[DEFAULT]',
            },
          });

          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };

        req.onerror = () => reject(req.error);
      });
    },
    { user, apiKey: FIREBASE_API_KEY }
  );

  // Step 3: ページをリロードして Firebase が IndexedDB から auth state を読み込むのを待つ
  await page.reload();
  // Firebase Auth の初期化完了を待つ（loadingState が false になるまで）
  await page.waitForFunction(
    () =>
      (window as Window & { __firebaseEmulatorsConnected?: boolean })
        .__firebaseEmulatorsConnected === true,
    { timeout: 10000 }
  );
}
