/**
 * Firebase Auth Emulator ヘルパー
 *
 * Playwright テスト内でエミュレーターのユーザーとしてサインインする。
 * Firebase Auth SDK が管理する IndexedDB にトークンを直接注入することで
 * Google サインインポップアップなしに認証状態を確立する。
 */
import { Page } from '@playwright/test';

const FIREBASE_API_KEY = 'demo-api-key';
const AUTH_EMULATOR = 'http://localhost:9098';

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

  // SDKの初期化とテスト用トークンの保存が競合しないよう、同一オリジンの空ページで書き込む。
  const appUrl = page.url();
  const setupUrl = new URL('/__e2e_auth_setup', appUrl).href;
  await page.route(setupUrl, (route) => route.fulfill({ contentType: 'text/html', body: '' }), {
    times: 1,
  });
  await page.goto(setupUrl);

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

  // 接続フラグは認証の復元前に立つため、保護されたアプリシェルの表示を待つ。
  await page.goto('/dashboard');
  await page.locator('main').waitFor({ state: 'visible' });
}
