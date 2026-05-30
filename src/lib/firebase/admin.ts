import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App;

/**
 * Firebase Admin SDK を初期化して返す。
 * getApps() で重複初期化を防ぐ（Next.js のホットリロード対応）。
 * 認証には環境変数 FIREBASE_SERVICE_ACCOUNT_KEY（JSON 文字列）を使用する。
 */
function getAdminApp(): App {
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY 環境変数が設定されていません。' +
        '.env.local.example を参照してください。'
    );
  }

  const serviceAccount = JSON.parse(serviceAccountKey) as Record<string, string>;
  adminApp = initializeApp({ credential: cert(serviceAccount) });
  return adminApp;
}

/**
 * Next.js API Route 用の Firestore Admin インスタンスを返す。
 * Security Rules をバイパスするため、サーバーサイドでのみ使用すること。
 */
export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

/**
 * Firebase Admin Auth インスタンスを返す。
 * ID トークン検証・ユーザー管理に使用する。
 */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
