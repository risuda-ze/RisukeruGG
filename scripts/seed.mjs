#!/usr/bin/env node
/**
 * Firebase Emulator シードスクリプト
 *
 * 使い方:
 *   node scripts/seed.mjs
 *   または: scripts\seed.bat
 *
 * 前提: Docker コンテナ (emulator) が起動済みであること
 *   - Auth      http://localhost:9099
 *   - Firestore http://localhost:8080
 *   - Functions http://localhost:5001
 *
 * 投入データ概要:
 *   - チームメンバー: 4人（オーナー・編集者×2・閲覧者）
 *   - スケジュール: 先月・当月・来月（週1回配信＋毎週土曜動画）
 *   - タスク: 10件（未着手・進行中・完了に分散）
 *   - 通知: 10件（すべて未読）
 *   - コラボセッション: 2件
 */

const PROJECT_ID = 'demo-risukeru';
const AUTH_BASE = 'http://localhost:9099';
const FS_BASE = `http://localhost:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const API_KEY = 'demo-api-key';

// ─────────────────────────────────────────────────────────────
//  Firestore ヘルパー
// ─────────────────────────────────────────────────────────────

function fsVal(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fsVal) } };
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fsVal(v)])),
      },
    };
  }
  throw new Error(`Unsupported type: ${typeof value}`);
}

function fsFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fsVal(v)]));
}

async function setDoc(path, data) {
  const url = `${FS_BASE}/${path}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      // Firestore エミュレーターのセキュリティルールをバイパス
      Authorization: 'Bearer owner',
    },
    body: JSON.stringify({ fields: fsFields(data) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`setDoc ${path} failed: ${res.status} ${text}`);
  }
}

// ─────────────────────────────────────────────────────────────
//  Auth ヘルパー
// ─────────────────────────────────────────────────────────────

async function clearAuthUsers() {
  const res = await fetch(`${AUTH_BASE}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 200) {
    console.warn('  Auth clear warning:', res.status);
  }
}

async function clearFirestore() {
  const res = await fetch(
    `http://localhost:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    console.warn('  Firestore clear warning:', res.status);
  }
}

/**
 * Auth エミュレーターにユーザーを作成して UID を返す。
 */
async function createAuthUser(email, displayName, password) {
  const res = await fetch(
    `${AUTH_BASE}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        displayName,
        password,
        emailVerified: true,
        returnSecureToken: false,
      }),
    }
  );
  const data = await res.json();
  if (data.error || !data.localId) {
    throw new Error(`createAuthUser ${email}: ${JSON.stringify(data.error ?? data)}`);
  }
  console.log(`  ✓ Auth ユーザー作成: ${displayName} (${email}) uid=${data.localId}`);
  return data.localId;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────
//  日付ヘルパー (基準: 2026-05-16 JST)
//  d(y, m, day, h, min) → UTC Date
// ─────────────────────────────────────────────────────────────
function d(y, m, day, h = 0, min = 0) {
  // JST (UTC+9) → UTC
  return new Date(Date.UTC(y, m - 1, day, h - 9, min));
}

const NOW = d(2026, 5, 16, 12, 0);

// ─────────────────────────────────────────────────────────────
//  メイン
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== リスケるGG シードスクリプト ===');
  console.log('基準日: 2026-05-16 (JST)\n');

  // ── Step 1: 既存データをクリア ───────────────────────────
  console.log('Step 1: 既存データをクリア中...');
  await clearAuthUsers();
  await clearFirestore();
  console.log('  ✓ クリア完了\n');

  // ── Step 2: Auth ユーザーを作成 (4人) ────────────────────
  console.log('Step 2: Auth ユーザーを作成中...');
  const UID1 = await createAuthUser('taro@example.com', '配信太郎', 'password123');
  const UID2 = await createAuthUser('hanako@example.com', '編集花子', 'password123');
  const UID3 = await createAuthUser('kenta@example.com', 'マネージャー健太', 'password123');
  const UID4 = await createAuthUser('saburo@example.com', '視聴者三郎', 'password123');
  console.log('\n  onUserCreate トリガー待機中 (10秒)...');
  await sleep(10000);
  console.log('  ✓ トリガー待機完了\n');

  // ── Step 3: Firestore シードデータを投入 ─────────────────
  console.log('Step 3: Firestore シードデータを投入中...');

  const TEAM_ID = 'teamAlpha';
  const TEAM_CODE = 'ALPHA001';

  const defaultNotifPrefs = {
    collab: { inApp: true, push: false },
    tasks: { inApp: true, push: false },
    reminders: { inApp: true, push: false },
    system: { inApp: true, push: false },
  };

  // ── ユーザードキュメント (4人) ───────────────────────────
  await setDoc(`users/${UID1}`, {
    displayName: '配信太郎',
    email: 'taro@example.com',
    avatarUrl: null,
    currentTeamId: TEAM_ID,
    plan: 'party',
    planUpdatedAt: NOW,
    monthlyTaskCount: 4,
    monthlyCollabCount: 2,
    countResetAt: d(2026, 5, 1),
    createdAt: d(2026, 4, 1),
    notificationPreferences: defaultNotifPrefs,
    fcmTokens: [],
    googleCalendar: null,
  });
  await setDoc(`users/${UID2}`, {
    displayName: '編集花子',
    email: 'hanako@example.com',
    avatarUrl: null,
    currentTeamId: TEAM_ID,
    plan: 'party',
    planUpdatedAt: NOW,
    monthlyTaskCount: 3,
    monthlyCollabCount: 1,
    countResetAt: d(2026, 5, 1),
    createdAt: d(2026, 4, 3),
    notificationPreferences: defaultNotifPrefs,
    fcmTokens: [],
    googleCalendar: null,
  });
  await setDoc(`users/${UID3}`, {
    displayName: 'マネージャー健太',
    email: 'kenta@example.com',
    avatarUrl: null,
    currentTeamId: TEAM_ID,
    plan: 'party',
    planUpdatedAt: NOW,
    monthlyTaskCount: 2,
    monthlyCollabCount: 1,
    countResetAt: d(2026, 5, 1),
    createdAt: d(2026, 4, 5),
    notificationPreferences: defaultNotifPrefs,
    fcmTokens: [],
    googleCalendar: null,
  });
  await setDoc(`users/${UID4}`, {
    displayName: '視聴者三郎',
    email: 'saburo@example.com',
    avatarUrl: null,
    currentTeamId: TEAM_ID,
    plan: 'light',
    planUpdatedAt: NOW,
    monthlyTaskCount: 0,
    monthlyCollabCount: 0,
    countResetAt: d(2026, 5, 1),
    createdAt: d(2026, 4, 10),
    notificationPreferences: defaultNotifPrefs,
    fcmTokens: [],
    googleCalendar: null,
  });
  console.log('  ✓ users (4件)');

  // ── チーム ────────────────────────────────────────────────
  await setDoc(`teams/${TEAM_ID}`, {
    name: '配信チームα',
    ownerId: UID1,
    teamCode: TEAM_CODE,
    createdAt: d(2026, 4, 1),
  });
  console.log('  ✓ teams (1件)');

  // ── チームコード ──────────────────────────────────────────
  await setDoc(`teamCodes/${TEAM_CODE}`, { teamId: TEAM_ID, createdAt: d(2026, 4, 1) });
  console.log('  ✓ teamCodes (1件)');

  // ── チームメンバー (4人) ─────────────────────────────────
  await setDoc(`teams/${TEAM_ID}/members/${UID1}`, {
    role: 'owner',
    displayName: '配信太郎',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/members/${UID2}`, {
    role: 'editor',
    displayName: '編集花子',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 3),
  });
  await setDoc(`teams/${TEAM_ID}/members/${UID3}`, {
    role: 'editor',
    displayName: 'マネージャー健太',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 5),
  });
  await setDoc(`teams/${TEAM_ID}/members/${UID4}`, {
    role: 'viewer',
    displayName: '視聴者三郎',
    avatarUrl: null,
    plan: 'light',
    joinedAt: d(2026, 4, 10),
  });
  console.log('  ✓ team/members (4件)');

  // ── カンバンカラム ────────────────────────────────────────
  await setDoc(`teams/${TEAM_ID}/kanbanColumns/col001`, {
    name: '未着手',
    order: 0,
    color: '#7c3aed',
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/kanbanColumns/col002`, {
    name: '進行中',
    order: 1,
    color: '#f59e0b',
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/kanbanColumns/col003`, {
    name: '完了',
    order: 2,
    color: '#10b981',
    createdAt: d(2026, 4, 1),
  });
  console.log('  ✓ kanbanColumns (3件)');

  // ── タスク (10件) ─────────────────────────────────────────
  //   col001 = 未着手 (4件)
  //   col002 = 進行中 (3件)
  //   col003 = 完了   (3件)
  const tasks = [
    // 未着手
    {
      id: 'task001',
      title: '6月コラボ告知サムネイル制作',
      col: 'col001',
      cat: 'thumbnail',
      uid: UID2,
      due: d(2026, 5, 28),
    },
    {
      id: 'task002',
      title: '6月配信スケジュール確定・告知',
      col: 'col001',
      cat: 'announcement',
      uid: UID3,
      due: d(2026, 5, 25),
    },
    {
      id: 'task003',
      title: 'SEOタイトル・概要欄テンプレート更新',
      col: 'col001',
      cat: 'other',
      uid: UID3,
      due: null,
    },
    {
      id: 'task004',
      title: 'Discord サーバー告知テンプレート作成',
      col: 'col001',
      cat: 'announcement',
      uid: UID4,
      due: d(2026, 5, 30),
    },
    // 進行中
    {
      id: 'task005',
      title: '5月週次配信 動画編集（第4回）',
      col: 'col002',
      cat: 'editing',
      uid: UID2,
      due: d(2026, 5, 20),
    },
    {
      id: 'task006',
      title: 'コラボ企画 台本作成',
      col: 'col002',
      cat: 'other',
      uid: UID1,
      due: d(2026, 5, 18),
    },
    {
      id: 'task007',
      title: '5月振り返り動画 サムネイル制作',
      col: 'col002',
      cat: 'thumbnail',
      uid: UID2,
      due: d(2026, 5, 24),
    },
    // 完了
    {
      id: 'task008',
      title: '4月月次レポート作成',
      col: 'col003',
      cat: 'other',
      uid: UID3,
      due: d(2026, 5, 5),
    },
    {
      id: 'task009',
      title: '5月第2回配信 サムネ素材集め',
      col: 'col003',
      cat: 'thumbnail',
      uid: UID2,
      due: d(2026, 5, 8),
    },
    {
      id: 'task010',
      title: 'コラボ打診メッセージ送付',
      col: 'col003',
      cat: 'other',
      uid: UID1,
      due: d(2026, 5, 10),
    },
  ];
  for (const t of tasks) {
    await setDoc(`teams/${TEAM_ID}/tasks/${t.id}`, {
      title: t.title,
      columnId: t.col,
      category: t.cat,
      assigneeId: t.uid,
      dueDate: t.due,
      linkedScheduleId: null,
      updatedAt: NOW,
      createdBy: UID1,
      createdAt: d(2026, 5, 1),
    });
  }
  console.log(`  ✓ tasks (${tasks.length}件)`);

  // ── スケジュール ──────────────────────────────────────────
  //
  // ルール:
  //   - 週1回配信: 毎週水曜日 20:00〜22:00 (JST)  type=stream
  //   - 毎週土曜動画: 土曜日 15:00〜18:00 (JST)    type=video
  //
  // 先月 (4月): 水曜 Apr 1,8,15,22 / 土曜 Apr 4,11,18,25 → 全件 ended
  // 当月 (5月): 水曜 May 7,14 (ended) / May 21,28 (planned)
  //             土曜 May 3,10 (ended) / May 17,24,31 (planned)
  //             ※ 5/16 (今日) は土曜だが動画収録日のため別途 live 扱いにしない
  // 来月 (6月): 水曜 Jun 3,10,17,24 / 土曜 Jun 6,13,20,27 → 全件 planned
  // ─────────────────────────────────────────────────────────

  const schedules = [
    // ─── 先月 (4月) 配信 (水曜) ───────────────────────────
    {
      id: 'sched_apr_w1',
      title: '週次配信 #13 〜新シーズン開幕！〜',
      type: 'stream',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 4, 1, 20, 0),
      end: d(2026, 4, 1, 22, 0),
      pIds: [UID1, UID2, UID3],
    },
    {
      id: 'sched_apr_w2',
      title: '週次配信 #14 〜ランクマ挑戦〜',
      type: 'stream',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 4, 8, 20, 0),
      end: d(2026, 4, 8, 22, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_apr_w3',
      title: '週次配信 #15 〜コラボ直前特番〜',
      type: 'stream',
      status: 'ended',
      platform: 'both',
      start: d(2026, 4, 15, 20, 0),
      end: d(2026, 4, 15, 22, 0),
      pIds: [UID1, UID2, UID4],
    },
    {
      id: 'sched_apr_w4',
      title: '週次配信 #16 〜4月総まとめ〜',
      type: 'stream',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 4, 22, 20, 0),
      end: d(2026, 4, 22, 22, 0),
      pIds: [UID1, UID3],
    },
    // ─── 先月 (4月) 動画 (土曜) ───────────────────────────
    {
      id: 'sched_apr_s1',
      title: '【動画】新シーズン装備解説',
      type: 'video',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 4, 4, 15, 0),
      end: d(2026, 4, 4, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_apr_s2',
      title: '【動画】ランクマ振り返り切り抜き',
      type: 'video',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 4, 11, 15, 0),
      end: d(2026, 4, 11, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_apr_s3',
      title: '【動画】コラボ前日準備密着',
      type: 'video',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 4, 18, 15, 0),
      end: d(2026, 4, 18, 18, 0),
      pIds: [UID1, UID2, UID3],
    },
    {
      id: 'sched_apr_s4',
      title: '【動画】4月ハイライト総集編',
      type: 'video',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 4, 25, 15, 0),
      end: d(2026, 4, 25, 18, 0),
      pIds: [UID1, UID2],
    },
    // ─── 当月 (5月) 配信 (水曜) ───────────────────────────
    {
      id: 'sched_may_w1',
      title: '週次配信 #17 〜GW特番！〜',
      type: 'stream',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 5, 7, 20, 0),
      end: d(2026, 5, 7, 22, 0),
      pIds: [UID1, UID2, UID3, UID4],
    },
    {
      id: 'sched_may_w2',
      title: '週次配信 #18 〜視聴者参加回〜',
      type: 'stream',
      status: 'ended',
      platform: 'both',
      start: d(2026, 5, 14, 20, 0),
      end: d(2026, 5, 14, 22, 0),
      pIds: [UID1, UID2, UID4],
    },
    {
      id: 'sched_may_w3',
      title: '週次配信 #19 〜新MAP攻略〜',
      type: 'stream',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 5, 21, 20, 0),
      end: d(2026, 5, 21, 22, 0),
      pIds: [UID1, UID3],
    },
    {
      id: 'sched_may_w4',
      title: '週次配信 #20 〜5月振り返りライブ〜',
      type: 'stream',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 5, 28, 20, 0),
      end: d(2026, 5, 28, 22, 0),
      pIds: [UID1, UID2, UID3],
    },
    // ─── 当月 (5月) 動画 (土曜) ───────────────────────────
    {
      id: 'sched_may_s1',
      title: '【動画】GWゲームマラソン総集編',
      type: 'video',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 5, 3, 15, 0),
      end: d(2026, 5, 3, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_may_s2',
      title: '【動画】#18 視聴者参加回ダイジェスト',
      type: 'video',
      status: 'ended',
      platform: 'youtube',
      start: d(2026, 5, 10, 15, 0),
      end: d(2026, 5, 10, 18, 0),
      pIds: [UID1, UID2, UID3],
    },
    {
      id: 'sched_may_s3',
      title: '【動画】新MAP徹底解説',
      type: 'video',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 5, 23, 15, 0),
      end: d(2026, 5, 23, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_may_s4',
      title: '【動画】5月ベストシーン集',
      type: 'video',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 5, 30, 15, 0),
      end: d(2026, 5, 30, 18, 0),
      pIds: [UID1, UID2, UID3],
    },
    // ─── 来月 (6月) 配信 (水曜) ───────────────────────────
    {
      id: 'sched_jun_w1',
      title: '週次配信 #21 〜6月開幕！〜',
      type: 'stream',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 6, 3, 20, 0),
      end: d(2026, 6, 3, 22, 0),
      pIds: [UID1, UID3],
    },
    {
      id: 'sched_jun_w2',
      title: '週次配信 #22 〜コラボ配信 w/ ゲーム実況者B〜',
      type: 'stream',
      status: 'planned',
      platform: 'both',
      start: d(2026, 6, 10, 20, 0),
      end: d(2026, 6, 10, 22, 0),
      pIds: [UID1, UID2, UID3, UID4],
    },
    {
      id: 'sched_jun_w3',
      title: '週次配信 #23 〜夏ゲームプレビュー〜',
      type: 'stream',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 6, 17, 20, 0),
      end: d(2026, 6, 17, 22, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_jun_w4',
      title: '週次配信 #24 〜6月振り返り〜',
      type: 'stream',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 6, 24, 20, 0),
      end: d(2026, 6, 24, 22, 0),
      pIds: [UID1, UID3],
    },
    // ─── 来月 (6月) 動画 (土曜) ───────────────────────────
    {
      id: 'sched_jun_s1',
      title: '【動画】6月コラボ予告編',
      type: 'video',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 6, 6, 15, 0),
      end: d(2026, 6, 6, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_jun_s2',
      title: '【動画】コラボ配信ダイジェスト',
      type: 'video',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 6, 13, 15, 0),
      end: d(2026, 6, 13, 18, 0),
      pIds: [UID1, UID2, UID3],
    },
    {
      id: 'sched_jun_s3',
      title: '【動画】夏ゲーム期待作レビュー',
      type: 'video',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 6, 20, 15, 0),
      end: d(2026, 6, 20, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_jun_s4',
      title: '【動画】6月ベストプレイ集',
      type: 'video',
      status: 'planned',
      platform: 'youtube',
      start: d(2026, 6, 27, 15, 0),
      end: d(2026, 6, 27, 18, 0),
      pIds: [UID1, UID2, UID3],
    },
  ];

  for (const s of schedules) {
    await setDoc(`teams/${TEAM_ID}/schedules/${s.id}`, {
      title: s.title,
      type: s.type,
      status: s.status,
      platform: s.platform,
      startAt: s.start,
      endAt: s.end,
      participantIds: s.pIds,
      description: '',
      collabPartnerName: null,
      linkedTaskIds: [],
      updatedAt: NOW,
      createdBy: UID1,
      createdAt: d(2026, 4, 1),
    });
  }
  console.log(`  ✓ schedules (${schedules.length}件 — 先月8・当月8・来月8)`);

  // ── コラボセッション ──────────────────────────────────────
  await setDoc(`teams/${TEAM_ID}/collabSessions/collab001`, {
    title: 'ゲームコラボ企画 w/ ゲーム実況者B',
    partnerName: 'ゲーム実況者B',
    createdBy: UID1,
    teamId: TEAM_ID,
    proposedDates: [d(2026, 6, 10, 20, 0), d(2026, 6, 12, 20, 0), d(2026, 6, 17, 20, 0)],
    responses: null,
    expiresAt: d(2026, 5, 30),
    status: 'open',
    confirmedDate: null,
    linkedScheduleId: null,
    createdAt: d(2026, 5, 10),
  });
  await setDoc(`teams/${TEAM_ID}/collabSessions/collab002`, {
    title: 'アニメ感想コラボ動画',
    partnerName: 'アニメ感想チャンネルC',
    createdBy: UID1,
    teamId: TEAM_ID,
    proposedDates: [d(2026, 6, 20, 15, 0), d(2026, 6, 27, 15, 0)],
    responses: null,
    expiresAt: d(2026, 6, 10),
    status: 'open',
    confirmedDate: null,
    linkedScheduleId: null,
    createdAt: d(2026, 5, 13),
  });
  console.log('  ✓ collabSessions (2件)');

  // ── 通知 (10件・すべて未読・UID1=配信太郎 宛) ───────────
  const notifications = [
    {
      id: 'notif001',
      category: 'collab',
      type: 'collab_request',
      title: 'コラボ打診が届きました',
      body: 'ゲーム実況者B からコラボ打診が届きました。候補日程を確認してください。',
      refType: 'collab',
      refId: 'collab001',
      createdAt: d(2026, 5, 10, 12, 0),
    },
    {
      id: 'notif002',
      category: 'tasks',
      type: 'task_updated',
      title: 'タスクが更新されました',
      body: '「5月週次配信 動画編集（第4回）」のステータスが「進行中」に変わりました。',
      refType: 'task',
      refId: 'task005',
      createdAt: d(2026, 5, 14, 9, 30),
    },
    {
      id: 'notif003',
      category: 'reminders',
      type: 'live_reminder',
      title: 'まもなくLIVE開始',
      body: '「週次配信 #18 〜視聴者参加回〜」まであと30分です。',
      refType: 'schedule',
      refId: 'sched_may_w2',
      createdAt: d(2026, 5, 14, 19, 30),
    },
    {
      id: 'notif004',
      category: 'collab',
      type: 'collab_request',
      title: '新しいコラボ打診',
      body: 'アニメ感想チャンネルC からコラボ動画の打診が届きました。',
      refType: 'collab',
      refId: 'collab002',
      createdAt: d(2026, 5, 13, 15, 0),
    },
    {
      id: 'notif005',
      category: 'tasks',
      type: 'task_assigned',
      title: 'タスクが割り当てられました',
      body: '「コラボ企画 台本作成」があなたに割り当てられました。',
      refType: 'task',
      refId: 'task006',
      createdAt: d(2026, 5, 12, 10, 0),
    },
    {
      id: 'notif006',
      category: 'system',
      type: 'member_joined',
      title: 'メンバーが参加しました',
      body: 'マネージャー健太 がチームに参加しました。',
      refType: 'team',
      refId: TEAM_ID,
      createdAt: d(2026, 4, 5, 11, 0),
    },
    {
      id: 'notif007',
      category: 'tasks',
      type: 'task_due_soon',
      title: 'タスクの期限が近づいています',
      body: '「コラボ企画 台本作成」の期限まであと2日です。',
      refType: 'task',
      refId: 'task006',
      createdAt: d(2026, 5, 16, 8, 0),
    },
    {
      id: 'notif008',
      category: 'reminders',
      type: 'schedule_reminder',
      title: 'スケジュールのリマインダー',
      body: '「週次配信 #19 〜新MAP攻略〜」まで残り5日です。',
      refType: 'schedule',
      refId: 'sched_may_w3',
      createdAt: d(2026, 5, 16, 9, 0),
    },
    {
      id: 'notif009',
      category: 'collab',
      type: 'collab_date_confirmed',
      title: 'コラボ日程が確定しました',
      body: 'ゲーム実況者B とのコラボ日程が 6月10日 20:00 に確定しました。',
      refType: 'collab',
      refId: 'collab001',
      createdAt: d(2026, 5, 15, 14, 0),
    },
    {
      id: 'notif010',
      category: 'tasks',
      type: 'task_updated',
      title: 'タスクが完了しました',
      body: '「コラボ打診メッセージ送付」が完了済みにマークされました。',
      refType: 'task',
      refId: 'task010',
      createdAt: d(2026, 5, 11, 16, 30),
    },
  ];

  for (const n of notifications) {
    await setDoc(`teams/${TEAM_ID}/notifications/${n.id}`, {
      recipientId: UID1,
      category: n.category,
      type: n.type,
      title: n.title,
      body: n.body,
      refType: n.refType,
      refId: n.refId,
      isRead: false,
      createdAt: n.createdAt,
    });
  }
  console.log(`  ✓ notifications (${notifications.length}件 — すべて未読)`);

  // ── 完了サマリー ─────────────────────────────────────────
  console.log('\n=== シード完了 ===\n');
  console.log('テストアカウント (パスワード共通: password123):');
  console.log(`  配信太郎          (owner)  : taro@example.com    uid=${UID1}`);
  console.log(`  編集花子          (editor) : hanako@example.com  uid=${UID2}`);
  console.log(`  マネージャー健太  (editor) : kenta@example.com   uid=${UID3}`);
  console.log(`  視聴者三郎        (viewer) : saburo@example.com  uid=${UID4}`);
  console.log('\n投入データ件数:');
  console.log(`  スケジュール : ${schedules.length}件 (先月8・当月8・来月8)`);
  console.log(`  タスク       : ${tasks.length}件 (未着手4・進行中3・完了3)`);
  console.log(`  通知         : ${notifications.length}件 (すべて未読)`);
  console.log(`  コラボ       : 2件`);
  console.log('\nFirebase Emulator UI: http://localhost:4000\n');
}

main().catch((err) => {
  console.error('\nシードスクリプトエラー:', err);
  process.exit(1);
});
