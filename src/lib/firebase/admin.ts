import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App;

/**
 * Firebase Admin SDK を初期化して返す。
 * getApps() で重複初期化を防ぐ（Next.js のホットリロード対応）。
 * - エミュレータ環境: FIREBASE_AUTH_EMULATOR_HOST が設定されている場合はサービスアカウント不要。
 * - 本番環境: FIREBASE_SERVICE_ACCOUNT_KEY（JSON 文字列）を使用する。
 */
function getAdminApp(): App {
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  // FIREBASE_AUTH_EMULATOR_HOST が設定されている場合はエミュレータモード。
  // ただし Vercel は Preview/Production どちらのデプロイでも NODE_ENV=production になるため、
  // 本番ビルドではこの分岐を無視してサービスアカウント認証にフォールバックする
  // （デプロイ環境にエミュレータ変数が誤って残っていても本番の鍵検証を素通りしないようにするため）。
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    if (process.env.NODE_ENV !== 'production') {
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-risukeru',
      });
      return adminApp;
    }
    console.warn(
      '[firebase-admin] FIREBASE_AUTH_EMULATOR_HOST が本番ビルドで検出されましたが無視します。'
    );
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY 環境変数が設定されていません。' +
        'Firebase Console > プロジェクトの設定 > サービスアカウント で生成したJSONキー全体を' +
        '1行の文字列としてこの環境変数に設定してください。'
    );
  }

  let serviceAccount: Record<string, string>;
  try {
    serviceAccount = JSON.parse(serviceAccountKey) as Record<string, string>;
  } catch (err) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY の JSON 解析に失敗しました。' +
        '貼り付け時に private_key 内の \\n がリテラル改行に化けていないか確認してください。' +
        `（詳細: ${err instanceof Error ? err.message : String(err)}）`
    );
  }

  // Vercel等の環境変数UI経由で private_key 内のエスケープ済み \n が
  // 実際の改行文字として壊れることがあるため、常に正規化しておく。
  if (typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  const requiredFields = ['project_id', 'client_email', 'private_key'] as const;
  const missingFields = requiredFields.filter((field) => !serviceAccount[field]);
  if (missingFields.length > 0) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_KEY に必須フィールドがありません: ${missingFields.join(', ')}`
    );
  }

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
