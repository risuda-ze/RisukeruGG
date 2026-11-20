#!/usr/bin/env node
/**
 * Firebase Emulator シードスクリプト
 *
 * 使い方:
 *   node scripts/seed.mjs
 *   または: scripts\seed.bat
 *
 * 前提: Firebase Emulator (pnpm emulators) が起動済みであること
 *   - Auth      http://localhost:9098
 *   - Firestore http://localhost:8080
 *   - Functions http://localhost:5001
 *
 * 投入データ概要:
 *   - テストユーザー: 6人（operator×2・member×2・rom×2）
 *   - 複数チーム所属: 2チーム（teamAlpha / teamBeta）
 *   - スケジュール: 先月・当月・来月（週1回配信＋毎週土曜動画）
 *   - タスク: ステータス・担当・期限・連携有無の組み合わせを網羅
 *   - 通知: 10件（すべて未読）
 *   - コラボセッション: 2件
 *   - 対応不可時間: teamAlpha の 5 人ぶん（実行日基準。1 人は未入力）
 */

const PROJECT_ID = 'demo-risukeru';
const AUTH_BASE = 'http://localhost:9098';
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

  // ── Step 2: Auth ユーザーを作成 (6人) ────────────────────
  console.log('Step 2: Auth ユーザーを作成中...');
  const UID1 = await createAuthUser('taro@example.com', '配信太郎', 'password123');
  const UID2 = await createAuthUser('hanako@example.com', '運営花子', 'password123');
  const UID3 = await createAuthUser('kenta@example.com', 'マネージャー健太', 'password123');
  const UID4 = await createAuthUser('saburo@example.com', 'ROM三郎', 'password123');
  const UID5 = await createAuthUser('rina@example.com', 'サポート里奈', 'password123');
  const UID6 = await createAuthUser('mika@example.com', 'ROM美香', 'password123');
  console.log('\n  onUserCreate トリガー待機中 (10秒)...');
  await sleep(10000);
  console.log('  ✓ トリガー待機完了\n');

  // ── Step 3: Firestore シードデータを投入 ─────────────────
  console.log('Step 3: Firestore シードデータを投入中...');

  const TEAM_ID = 'teamAlpha';
  const TEAM_CODE = 'ALPHA001';
  const TEAM_BETA_ID = 'teamBeta';
  const TEAM_BETA_CODE = 'BETA002';

  // ── ユーザードキュメント (6人) ───────────────────────────
  const users = [
    {
      uid: UID1,
      displayName: '配信太郎',
      email: 'taro@example.com',
      currentTeamId: TEAM_ID,
      teamIds: [TEAM_ID, TEAM_BETA_ID],
      plan: 'party',
      monthlyTaskCount: 4,
      monthlyCollabCount: 2,
      createdAt: d(2026, 4, 1),
    },
    {
      uid: UID2,
      displayName: '運営花子',
      email: 'hanako@example.com',
      currentTeamId: TEAM_ID,
      teamIds: [TEAM_ID, TEAM_BETA_ID],
      plan: 'party',
      monthlyTaskCount: 3,
      monthlyCollabCount: 1,
      createdAt: d(2026, 4, 3),
    },
    {
      uid: UID3,
      displayName: 'マネージャー健太',
      email: 'kenta@example.com',
      currentTeamId: TEAM_ID,
      teamIds: [TEAM_ID],
      plan: 'party',
      monthlyTaskCount: 2,
      monthlyCollabCount: 1,
      createdAt: d(2026, 4, 5),
    },
    {
      uid: UID4,
      displayName: 'ROM三郎',
      email: 'saburo@example.com',
      currentTeamId: TEAM_ID,
      teamIds: [TEAM_ID],
      plan: 'light',
      monthlyTaskCount: 0,
      monthlyCollabCount: 0,
      createdAt: d(2026, 4, 10),
    },
    {
      uid: UID5,
      displayName: 'サポート里奈',
      email: 'rina@example.com',
      currentTeamId: TEAM_BETA_ID,
      teamIds: [TEAM_ID, TEAM_BETA_ID],
      plan: 'party',
      monthlyTaskCount: 1,
      monthlyCollabCount: 1,
      createdAt: d(2026, 4, 12),
    },
    {
      uid: UID6,
      displayName: 'ROM美香',
      email: 'mika@example.com',
      currentTeamId: TEAM_ID,
      teamIds: [TEAM_ID],
      plan: 'light',
      monthlyTaskCount: 0,
      monthlyCollabCount: 0,
      createdAt: d(2026, 4, 15),
    },
  ];

  for (const user of users) {
    await setDoc(`users/${user.uid}`, {
      displayName: user.displayName,
      email: user.email,
      avatarUrl: null,
      currentTeamId: user.currentTeamId,
      teamIds: user.teamIds,
      plan: user.plan,
      planUpdatedAt: NOW,
      monthlyTaskCount: user.monthlyTaskCount,
      monthlyCollabCount: user.monthlyCollabCount,
      countResetAt: d(2026, 5, 1),
      createdAt: user.createdAt,
    });
  }
  console.log(`  ✓ users (${users.length}件)`);

  // ── チーム ────────────────────────────────────────────────
  await setDoc(`teams/${TEAM_ID}`, {
    name: '配信チームα',
    operatorUids: [UID1, UID2],
    teamCode: TEAM_CODE,
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_BETA_ID}`, {
    name: '編集チームβ',
    operatorUids: [UID2, UID5],
    teamCode: TEAM_BETA_CODE,
    createdAt: d(2026, 4, 20),
  });
  console.log('  ✓ teams (2件)');

  // ── チームコード ──────────────────────────────────────────
  await setDoc(`teamCodes/${TEAM_CODE}`, { teamId: TEAM_ID, createdAt: d(2026, 4, 1) });
  await setDoc(`teamCodes/${TEAM_BETA_CODE}`, { teamId: TEAM_BETA_ID, createdAt: d(2026, 4, 20) });
  console.log('  ✓ teamCodes (2件)');

  // ── チームメンバー (teamAlpha: 6人 / teamBeta: 3人) ─────
  await setDoc(`teams/${TEAM_ID}/members/${UID1}`, {
    role: 'operator',
    displayName: '配信太郎',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/members/${UID2}`, {
    role: 'operator',
    displayName: '運営花子',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 3),
  });
  await setDoc(`teams/${TEAM_ID}/members/${UID3}`, {
    role: 'member',
    displayName: 'マネージャー健太',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 5),
  });
  await setDoc(`teams/${TEAM_ID}/members/${UID4}`, {
    role: 'rom',
    displayName: 'ROM三郎',
    avatarUrl: null,
    plan: 'light',
    joinedAt: d(2026, 4, 10),
  });
  await setDoc(`teams/${TEAM_ID}/members/${UID5}`, {
    role: 'member',
    displayName: 'サポート里奈',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 12),
  });
  await setDoc(`teams/${TEAM_ID}/members/${UID6}`, {
    role: 'rom',
    displayName: 'ROM美香',
    avatarUrl: null,
    plan: 'light',
    joinedAt: d(2026, 4, 15),
  });

  await setDoc(`teams/${TEAM_BETA_ID}/members/${UID2}`, {
    role: 'operator',
    displayName: '運営花子',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 20),
  });
  await setDoc(`teams/${TEAM_BETA_ID}/members/${UID5}`, {
    role: 'operator',
    displayName: 'サポート里奈',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 20),
  });
  await setDoc(`teams/${TEAM_BETA_ID}/members/${UID1}`, {
    role: 'member',
    displayName: '配信太郎',
    avatarUrl: null,
    plan: 'party',
    joinedAt: d(2026, 4, 21),
  });
  console.log('  ✓ team/members (teamAlpha: 6件, teamBeta: 3件)');

  // ── 統合カテゴリ（タスク・スケジュール共通） ──────────────────
  // 旧 scheduleCategories(scat*) と taskCategories(tcat*) を単一の categories
  // コレクションに統合。既存 ID を維持し、タスク・スケジュールの categoryId 参照を保つ。
  await setDoc(`teams/${TEAM_ID}/categories/scat001`, {
    name: '配信枠',
    icon: 'live_tv',
    color: '#7F77DD',
    order: 0,
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/categories/scat002`, {
    name: '動画投稿',
    icon: 'video_library',
    color: '#EF9F27',
    order: 1,
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/categories/scat003`, {
    name: 'コラボ',
    icon: 'group',
    color: '#3fcf7f',
    order: 2,
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/categories/tcat001`, {
    name: '動画編集',
    icon: null,
    color: '#EF9F27',
    order: 3,
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/categories/tcat002`, {
    name: '企画',
    icon: null,
    color: '#534AB7',
    order: 4,
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/categories/tcat003`, {
    name: '台本',
    icon: null,
    color: '#7F77DD',
    order: 5,
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/categories/tcat004`, {
    name: '告知',
    icon: null,
    color: '#ff4d6d',
    order: 6,
    createdAt: d(2026, 4, 1),
  });
  console.log('  ✓ categories (統合: 7件)');

  // ── カンバンカラム ────────────────────────────────────────
  await setDoc(`teams/${TEAM_ID}/taskStatuses/col001`, {
    name: '未着手',
    order: 0,
    color: '#7c3aed',
    role: null,
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/taskStatuses/col002`, {
    name: '進行中',
    order: 1,
    color: '#f59e0b',
    role: null,
    createdAt: d(2026, 4, 1),
  });
  await setDoc(`teams/${TEAM_ID}/taskStatuses/col003`, {
    name: '完了',
    order: 2,
    color: '#10b981',
    role: 'done',
    createdAt: d(2026, 4, 1),
  });
  console.log('  ✓ taskStatuses (3件)');

  // ── タスク (14件) ─────────────────────────────────────────
  //   col001 = 未着手 (6件)
  //   col002 = 進行中 (4件)
  //   col003 = 完了   (4件)
  //   追加網羅: assignee=null, linkedScheduleIdあり, descriptionあり, dueDate=null
  const tasks = [
    // 未着手
    {
      id: 'task001',
      title: '6月コラボ告知サムネイル制作',
      col: 'col001',
      catId: 'tcat002',
      uid: UID2,
      due: d(2026, 5, 28),
    },
    {
      id: 'task002',
      title: '6月配信スケジュール確定・告知',
      col: 'col001',
      catId: 'tcat004',
      uid: UID3,
      due: d(2026, 5, 25),
    },
    {
      id: 'task003',
      title: 'SEOタイトル・概要欄テンプレート更新',
      col: 'col001',
      catId: null,
      uid: UID3,
      due: null,
    },
    {
      id: 'task004',
      title: 'Discord サーバー告知テンプレート作成',
      col: 'col001',
      catId: 'tcat004',
      uid: UID4,
      due: d(2026, 5, 30),
    },
    // 進行中
    {
      id: 'task005',
      title: '5月週次配信 動画編集（第4回）',
      col: 'col002',
      catId: 'tcat001',
      uid: UID2,
      due: d(2026, 5, 20),
    },
    {
      id: 'task006',
      title: 'コラボ企画 台本作成',
      col: 'col002',
      catId: 'tcat003',
      uid: UID1,
      due: d(2026, 5, 18),
    },
    {
      id: 'task007',
      title: '5月振り返り動画 サムネイル制作',
      col: 'col002',
      catId: 'tcat002',
      uid: UID2,
      due: d(2026, 5, 24),
    },
    // 完了
    {
      id: 'task008',
      title: '4月月次レポート作成',
      col: 'col003',
      catId: null,
      uid: UID3,
      due: d(2026, 5, 5),
    },
    {
      id: 'task009',
      title: '5月第2回配信 サムネ素材集め',
      col: 'col003',
      catId: 'tcat002',
      uid: UID2,
      due: d(2026, 5, 8),
    },
    {
      id: 'task010',
      title: 'コラボ打診メッセージ送付',
      col: 'col003',
      catId: null,
      uid: UID1,
      due: d(2026, 5, 10),
    },
    // 追加パターン
    {
      id: 'task011',
      title: '【未アサイン】アーカイブ整理',
      col: 'col001',
      catId: null,
      uid: null,
      due: null,
      desc: '担当未定のバックログタスク',
      linkedScheduleId: null,
    },
    {
      id: 'task012',
      title: '配信#19 サムネ最終調整',
      col: 'col002',
      catId: 'tcat001',
      uid: UID5,
      due: d(2026, 5, 21),
      desc: '配信前に文字可読性を確認して書き出す',
      linkedScheduleId: 'sched_may_w3',
    },
    {
      id: 'task013',
      title: '6月第1回動画 公開設定',
      col: 'col001',
      catId: 'tcat004',
      uid: UID3,
      due: d(2026, 6, 3),
      desc: null,
      linkedScheduleId: 'sched_jun_s1',
    },
    {
      id: 'task014',
      title: 'コラボ候補日程の棚卸し',
      col: 'col003',
      catId: 'tcat003',
      uid: UID2,
      due: null,
      desc: '確定済み/期限切れセッションの整理',
      linkedScheduleId: null,
    },
  ];
  for (const t of tasks) {
    await setDoc(`teams/${TEAM_ID}/tasks/${t.id}`, {
      title: t.title,
      columnId: t.col,
      categoryId: t.catId,
      description: t.desc ?? null,
      assigneeId: t.uid,
      dueDate: t.due,
      linkedScheduleId: t.linkedScheduleId ?? null,
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

  // categoryId: scat001=配信枠, scat002=動画投稿, scat003=コラボ
  const schedules = [
    // ─── 先月 (4月) 配信 (水曜) ───────────────────────────
    {
      id: 'sched_apr_w1',
      title: '週次配信 #13 〜新シーズン開幕！〜',
      catId: 'scat001',
      start: d(2026, 4, 1, 20, 0),
      end: d(2026, 4, 1, 22, 0),
      pIds: [UID1, UID2, UID3],
    },
    {
      id: 'sched_apr_w2',
      title: '週次配信 #14 〜ランクマ挑戦〜',
      catId: 'scat001',
      start: d(2026, 4, 8, 20, 0),
      end: d(2026, 4, 8, 22, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_apr_w3',
      title: '週次配信 #15 〜コラボ直前特番〜',
      catId: 'scat003',
      start: d(2026, 4, 15, 20, 0),
      end: d(2026, 4, 15, 22, 0),
      pIds: [UID1, UID2, UID4],
    },
    {
      id: 'sched_apr_w4',
      title: '週次配信 #16 〜4月総まとめ〜',
      catId: 'scat001',
      start: d(2026, 4, 22, 20, 0),
      end: d(2026, 4, 22, 22, 0),
      pIds: [UID1, UID3],
    },
    // ─── 先月 (4月) 動画 (土曜) ───────────────────────────
    {
      id: 'sched_apr_s1',
      title: '【動画】新シーズン装備解説',
      catId: 'scat002',
      start: d(2026, 4, 4, 15, 0),
      end: d(2026, 4, 4, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_apr_s2',
      title: '【動画】ランクマ振り返り切り抜き',
      catId: 'scat002',
      start: d(2026, 4, 11, 15, 0),
      end: d(2026, 4, 11, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_apr_s3',
      title: '【動画】コラボ前日準備密着',
      catId: 'scat002',
      start: d(2026, 4, 18, 15, 0),
      end: d(2026, 4, 18, 18, 0),
      pIds: [UID1, UID2, UID3],
    },
    {
      id: 'sched_apr_s4',
      title: '【動画】4月ハイライト総集編',
      catId: 'scat002',
      start: d(2026, 4, 25, 15, 0),
      end: d(2026, 4, 25, 18, 0),
      pIds: [UID1, UID2],
    },
    // ─── 当月 (5月) 配信 (水曜) ───────────────────────────
    {
      id: 'sched_may_w1',
      title: '週次配信 #17 〜GW特番！〜',
      catId: 'scat001',
      start: d(2026, 5, 7, 20, 0),
      end: d(2026, 5, 7, 22, 0),
      pIds: [UID1, UID2, UID3, UID4],
    },
    {
      id: 'sched_may_w2',
      title: '週次配信 #18 〜視聴者参加回〜',
      catId: 'scat001',
      start: d(2026, 5, 14, 20, 0),
      end: d(2026, 5, 14, 22, 0),
      pIds: [UID1, UID2, UID4],
    },
    {
      id: 'sched_may_w3',
      title: '週次配信 #19 〜新MAP攻略〜',
      catId: 'scat001',
      start: d(2026, 5, 21, 20, 0),
      end: d(2026, 5, 21, 22, 0),
      pIds: [UID1, UID3],
    },
    {
      id: 'sched_may_w4',
      title: '週次配信 #20 〜5月振り返りライブ〜',
      catId: 'scat001',
      start: d(2026, 5, 28, 20, 0),
      end: d(2026, 5, 28, 22, 0),
      pIds: [UID1, UID2, UID3],
    },
    // ─── 当月 (5月) 動画 (土曜) ───────────────────────────
    {
      id: 'sched_may_s1',
      title: '【動画】GWゲームマラソン総集編',
      catId: 'scat002',
      start: d(2026, 5, 3, 15, 0),
      end: d(2026, 5, 3, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_may_s2',
      title: '【動画】#18 視聴者参加回ダイジェスト',
      catId: 'scat002',
      start: d(2026, 5, 10, 15, 0),
      end: d(2026, 5, 10, 18, 0),
      pIds: [UID1, UID2, UID3],
    },
    {
      id: 'sched_may_s3',
      title: '【動画】新MAP徹底解説',
      catId: 'scat002',
      start: d(2026, 5, 23, 15, 0),
      end: d(2026, 5, 23, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_may_s4',
      title: '【動画】5月ベストシーン集',
      catId: 'scat002',
      start: d(2026, 5, 30, 15, 0),
      end: d(2026, 5, 30, 18, 0),
      pIds: [UID1, UID2, UID3],
    },
    // ─── 当月 (5月) 追加予定 ────────────────────────────
    // 5月21日: この日は予定が3件入る（sched_may_w3 と合わせて）
    {
      id: 'sched_may_21_prep',
      title: '配信前ミーティング（機材・構成確認）',
      catId: 'scat001',
      start: d(2026, 5, 21, 10, 0),
      end: d(2026, 5, 21, 11, 30),
      pIds: [UID1, UID2, UID3],
    },
    {
      id: 'sched_may_21_rec',
      title: '【収録】コメント読み動画 アーカイブ用',
      catId: 'scat002',
      start: d(2026, 5, 21, 14, 0),
      end: d(2026, 5, 21, 16, 0),
      pIds: [UID1, UID2],
    },
    // 5月17日（土）: 特別週末配信
    {
      id: 'sched_may_17_live',
      title: '特別週末配信 〜リスナー感謝祭〜',
      catId: 'scat001',
      start: d(2026, 5, 17, 18, 0),
      end: d(2026, 5, 17, 21, 0),
      pIds: [UID1, UID2, UID3, UID4],
    },
    // 5月22日（木）: 6月企画会議
    {
      id: 'sched_may_22_mtg',
      title: '6月コンテンツ企画会議',
      catId: null,
      start: d(2026, 5, 22, 13, 0),
      end: d(2026, 5, 22, 14, 30),
      pIds: [UID1, UID2, UID3],
    },
    // 5月25日（月）: コラボ事前打合せ
    {
      id: 'sched_may_25_collab',
      title: 'コラボ事前打合せ w/ ゲーム実況者B',
      catId: 'scat003',
      start: d(2026, 5, 25, 20, 0),
      end: d(2026, 5, 25, 21, 30),
      pIds: [UID1, UID3],
    },
    // 5月27日（水）: 来月分動画収録
    {
      id: 'sched_may_27_rec',
      title: '【前倒し収録】6月第1回動画素材',
      catId: 'scat002',
      start: d(2026, 5, 27, 14, 0),
      end: d(2026, 5, 27, 17, 0),
      pIds: [UID1, UID2],
    },
    // 5月29日（金）: 月末振り返り
    {
      id: 'sched_may_29_retro',
      title: '5月月末振り返りミーティング',
      catId: null,
      start: d(2026, 5, 29, 11, 0),
      end: d(2026, 5, 29, 12, 0),
      pIds: [UID1, UID2, UID3],
    },
    // ─── 来月 (6月) 配信 (水曜) ───────────────────────────
    {
      id: 'sched_jun_w1',
      title: '週次配信 #21 〜6月開幕！〜',
      catId: 'scat001',
      start: d(2026, 6, 3, 20, 0),
      end: d(2026, 6, 3, 22, 0),
      pIds: [UID1, UID3],
    },
    {
      id: 'sched_jun_w2',
      title: '週次配信 #22 〜コラボ配信 w/ ゲーム実況者B〜',
      catId: 'scat003',
      start: d(2026, 6, 10, 20, 0),
      end: d(2026, 6, 10, 22, 0),
      pIds: [UID1, UID2, UID3, UID4],
    },
    {
      id: 'sched_jun_w3',
      title: '週次配信 #23 〜夏ゲームプレビュー〜',
      catId: 'scat001',
      start: d(2026, 6, 17, 20, 0),
      end: d(2026, 6, 17, 22, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_jun_w4',
      title: '週次配信 #24 〜6月振り返り〜',
      catId: 'scat001',
      start: d(2026, 6, 24, 20, 0),
      end: d(2026, 6, 24, 22, 0),
      pIds: [UID1, UID3],
    },
    // ─── 来月 (6月) 動画 (土曜) ───────────────────────────
    {
      id: 'sched_jun_s1',
      title: '【動画】6月コラボ予告編',
      catId: 'scat002',
      start: d(2026, 6, 6, 15, 0),
      end: d(2026, 6, 6, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_jun_s2',
      title: '【動画】コラボ配信ダイジェスト',
      catId: 'scat002',
      start: d(2026, 6, 13, 15, 0),
      end: d(2026, 6, 13, 18, 0),
      pIds: [UID1, UID2, UID3],
    },
    {
      id: 'sched_jun_s3',
      title: '【動画】夏ゲーム期待作レビュー',
      catId: 'scat002',
      start: d(2026, 6, 20, 15, 0),
      end: d(2026, 6, 20, 18, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_jun_s4',
      title: '【動画】6月ベストプレイ集',
      catId: 'scat002',
      start: d(2026, 6, 27, 15, 0),
      end: d(2026, 6, 27, 18, 0),
      pIds: [UID1, UID2, UID3],
    },

    // ─── テスト: 複数日バー重なり確認 (6/22週) ────────────
    // Mon 6/22: 1件 (バーA のみ、オーバーフローなし)
    // Tue 6/23: 2件 (A+B、オーバーフローなし)
    // Wed 6/24: 3件 (A+B+C → +1件 表示)
    // Thu 6/25: 4件 (A+B+C+D → +2件 表示)
    {
      id: 'sched_test_md_a',
      title: '[テスト] 複数日バーA（6/22〜28）',
      allDay: true,
      catId: 'scat001',
      start: d(2026, 6, 22, 0, 0),
      end: d(2026, 6, 29, 0, 0), // 排他的終了（6/28まで表示）
      pIds: [UID1],
    },
    {
      id: 'sched_test_md_b',
      title: '[テスト] 複数日バーB（6/23〜28）',
      allDay: true,
      catId: 'scat002',
      start: d(2026, 6, 23, 0, 0),
      end: d(2026, 6, 29, 0, 0), // 排他的終了（6/28まで表示）
      pIds: [UID1],
    },
    {
      id: 'sched_test_md_c',
      title: '[テスト] 複数日バーC（6/24〜28）',
      allDay: true,
      catId: 'scat003',
      start: d(2026, 6, 24, 0, 0),
      end: d(2026, 6, 29, 0, 0), // 排他的終了（6/28まで表示）
      pIds: [UID1],
    },
    {
      id: 'sched_test_md_d',
      title: '[テスト] 複数日バーD（6/25〜28）',
      allDay: true,
      catId: null,
      start: d(2026, 6, 25, 0, 0),
      end: d(2026, 6, 29, 0, 0), // 排他的終了（6/28まで表示）
      pIds: [UID1],
    },

    // ─── テスト: 単日予定10件 (5/20 水) ──────────────────
    {
      id: 'sched_test_10_01',
      title: '[テスト] ①朝のMTG',
      catId: 'scat001',
      start: d(2026, 5, 20, 8, 0),
      end: d(2026, 5, 20, 9, 0),
      pIds: [UID1],
    },
    {
      id: 'sched_test_10_02',
      title: '[テスト] ②企画レビュー',
      catId: 'scat002',
      start: d(2026, 5, 20, 9, 30),
      end: d(2026, 5, 20, 10, 30),
      pIds: [UID1],
    },
    {
      id: 'sched_test_10_03',
      title: '[テスト] ③サムネイル確認',
      catId: 'scat001',
      start: d(2026, 5, 20, 11, 0),
      end: d(2026, 5, 20, 12, 0),
      pIds: [UID1],
    },
    {
      id: 'sched_test_10_04',
      title: '[テスト] ④昼食ミーティング',
      catId: null,
      start: d(2026, 5, 20, 13, 0),
      end: d(2026, 5, 20, 14, 0),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_test_10_05',
      title: '[テスト] ⑤台本作成',
      catId: 'scat003',
      start: d(2026, 5, 20, 14, 30),
      end: d(2026, 5, 20, 15, 30),
      pIds: [UID1],
    },
    {
      id: 'sched_test_10_06',
      title: '[テスト] ⑥収録準備',
      catId: 'scat001',
      start: d(2026, 5, 20, 16, 0),
      end: d(2026, 5, 20, 17, 0),
      pIds: [UID1],
    },
    {
      id: 'sched_test_10_07',
      title: '[テスト] ⑦収録',
      catId: 'scat002',
      start: d(2026, 5, 20, 17, 30),
      end: d(2026, 5, 20, 18, 30),
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_test_10_08',
      title: '[テスト] ⑧編集作業',
      catId: 'scat002',
      start: d(2026, 5, 20, 19, 0),
      end: d(2026, 5, 20, 20, 0),
      pIds: [UID2],
    },
    {
      id: 'sched_test_10_09',
      title: '[テスト] ⑨配信前チェック',
      catId: 'scat001',
      start: d(2026, 5, 20, 20, 30),
      end: d(2026, 5, 20, 21, 30),
      pIds: [UID1, UID3],
    },
    {
      id: 'sched_test_10_10',
      title: '[テスト] ⑩深夜配信',
      catId: 'scat001',
      start: d(2026, 5, 20, 22, 0),
      end: d(2026, 5, 20, 23, 30),
      pIds: [UID1],
    },
    // ─── 追加パターン: allDay単日 / participantなし / task連携 / collab表示 ───
    {
      id: 'sched_test_allday_single',
      title: '[テスト] 終日予定（単日）',
      allDay: true,
      catId: null,
      start: d(2026, 5, 26, 0, 0),
      end: d(2026, 5, 27, 0, 0), // 排他的終了（5/26のみ表示）
      pIds: [UID1, UID2],
    },
    {
      id: 'sched_test_no_participant',
      title: '[テスト] 参加者なし予定',
      catId: 'scat002',
      start: d(2026, 5, 26, 13, 0),
      end: d(2026, 5, 26, 14, 0),
      pIds: [],
    },
    {
      id: 'sched_test_linked_task',
      title: '[テスト] タスク連携・コラボ相手あり',
      catId: 'scat003',
      start: d(2026, 5, 26, 20, 0),
      end: d(2026, 5, 26, 21, 0),
      pIds: [UID1, UID5],
      linkedTaskIds: ['task012', 'task013'],
      collabPartnerName: '外部ストリーマーZ',
    },
  ];

  for (const s of schedules) {
    await setDoc(`teams/${TEAM_ID}/schedules/${s.id}`, {
      title: s.title,
      categoryId: s.catId,
      startAt: s.start,
      endAt: s.end,
      allDay: s.allDay ?? false,
      participantIds: s.pIds,
      description: '',
      collabPartnerName: s.collabPartnerName ?? null,
      linkedTaskIds: s.linkedTaskIds ?? [],
      updatedAt: NOW,
      createdBy: UID1,
      createdAt: d(2026, 4, 1),
    });
  }
  console.log(
    `  ✓ schedules (${schedules.length}件 — 先月8・当月${schedules.filter((s) => s.id.startsWith('sched_may')).length}・来月${schedules.filter((s) => s.id.startsWith('sched_jun')).length}・テスト${schedules.filter((s) => s.id.startsWith('sched_test')).length})`
  );

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
  await setDoc(`teams/${TEAM_ID}/collabSessions/collab003`, {
    title: '確定済みコラボ配信',
    partnerName: 'ゲーム実況者D',
    createdBy: UID2,
    teamId: TEAM_ID,
    proposedDates: [d(2026, 5, 26, 20, 0), d(2026, 5, 27, 20, 0)],
    responses: {
      dates: { 0: 'ok', 1: 'ng' },
      alternativeDates: [],
      respondedAt: d(2026, 5, 20, 12, 0),
      note: '5/26希望です',
    },
    expiresAt: d(2026, 5, 30),
    status: 'confirmed',
    confirmedDate: d(2026, 5, 26, 20, 0),
    linkedScheduleId: 'sched_test_linked_task',
    createdAt: d(2026, 5, 18),
  });
  await setDoc(`teams/${TEAM_ID}/collabSessions/collab004`, {
    title: '期限切れコラボ打診',
    partnerName: '外部チャンネルE',
    createdBy: UID3,
    teamId: TEAM_ID,
    proposedDates: [d(2026, 5, 1, 21, 0), d(2026, 5, 2, 21, 0)],
    responses: null,
    expiresAt: d(2026, 5, 3),
    status: 'expired',
    confirmedDate: null,
    linkedScheduleId: null,
    createdAt: d(2026, 4, 28),
  });
  await setDoc(`teams/${TEAM_ID}/collabSessions/collab005`, {
    title: 'キャンセル済みコラボ',
    partnerName: '外部チャンネルF',
    createdBy: UID5,
    teamId: TEAM_ID,
    proposedDates: [d(2026, 5, 9, 20, 0)],
    responses: null,
    expiresAt: d(2026, 5, 12),
    status: 'cancelled',
    confirmedDate: null,
    linkedScheduleId: null,
    createdAt: d(2026, 5, 6),
  });
  console.log('  ✓ collabSessions (5件)');

  // ── 対応不可時間 ──────────────────────────────────────────
  // 画面は実行時点の JST 当日を基準に前月〜翌月を表示するため、ここだけ固定の基準日ではなく実行日からの相対で作る
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  /** JST の当日から offset 日後の `yyyy-mm-dd` */
  const day = (offset) =>
    new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + offset))
      .toISOString()
      .slice(0, 10);
  /** start 時〜end 時（end は排他的）の日マスク */
  const hours = (start, end) => (2 ** (end - start) - 1) * 2 ** start;
  /** 月ドキュメントに分けて書く。days / notes が空でも当月のドキュメントは作る（入力済みで不可なし） */
  async function seedUnavailability(uid, updatedDaysAgo, days, notes = []) {
    const months = new Set([day(0), ...Object.keys(days), ...notes.map((n) => n.date)].map((v) => v.slice(0, 7)));
    for (const month of months) {
      await setDoc(`teams/${TEAM_ID}/unavailability/${uid}_${month}`, {
        userId: uid,
        month,
        days: Object.fromEntries(Object.entries(days).filter(([date]) => date.startsWith(month))),
        notes: notes.filter((n) => n.date.startsWith(month)),
        updatedAt: new Date(Date.now() - updatedDaysAgo * 24 * 60 * 60 * 1000),
      });
    }
    return months.size;
  }
  let unavailabilityDocs = 0;
  // 配信太郎: 当日 9〜12 時・20 時〜翌 2 時（E2E が参照する）、メモは同一時間帯の横並びを含む
  unavailabilityDocs += await seedUnavailability(
    UID1,
    0,
    {
      [day(0)]: hours(9, 12) | hours(20, 24),
      [day(1)]: hours(0, 2), // 当日 20 時から日をまたいで続く
      [day(2)]: hours(0, 24),
      [day(-3)]: hours(13, 18),
    },
    [
      { id: 'note1', date: day(0), start: 9, end: 12, text: '移動中のため返信は遅れます' },
      { id: 'note2', date: day(0), start: 10, end: 11, text: '通話は不可' },
      { id: 'note3', date: day(0), start: 20, end: 22, text: 'チャットなら返せます' },
    ]
  );
  unavailabilityDocs += await seedUnavailability(UID2, 3, { [day(0)]: hours(18, 22), [day(1)]: hours(0, 24) });
  unavailabilityDocs += await seedUnavailability(UID3, 10, {
    [day(5)]: hours(10, 15),
    [day(-25)]: hours(19, 23),
    [day(25)]: hours(8, 12),
  });
  unavailabilityDocs += await seedUnavailability(UID5, 0, { [day(0)]: hours(0, 6) });
  // ROM美香: 入力済みだが対応不可なし。ROM三郎（UID4）はドキュメントを作らない（未入力）
  unavailabilityDocs += await seedUnavailability(UID6, 1, {});
  console.log(`  ✓ unavailability (${unavailabilityDocs}件)`);

  // ── 完了サマリー ─────────────────────────────────────────
  console.log('\n=== シード完了 ===\n');
  console.log('テストアカウント (パスワード共通: password123):');
  console.log(`  配信太郎          (operator): taro@example.com    uid=${UID1}`);
  console.log(`  運営花子          (operator): hanako@example.com  uid=${UID2}`);
  console.log(`  マネージャー健太  (member)  : kenta@example.com   uid=${UID3}`);
  console.log(`  ROM三郎           (rom)     : saburo@example.com  uid=${UID4}`);
  console.log(`  サポート里奈      (member)  : rina@example.com    uid=${UID5}`);
  console.log(`  ROM美香           (rom)     : mika@example.com    uid=${UID6}`);
  console.log('');
  console.log('チーム構成:');
  console.log(`  teamAlpha (${TEAM_CODE}) operator=2, member=2, rom=2`);
  console.log(`  teamBeta  (${TEAM_BETA_CODE}) operator=2, member=1`);
  console.log('\n投入データ件数:');
  console.log(`  スケジュール : ${schedules.length}件`);
  console.log('    先月(4月): 8件');
  console.log('    当月(5月): 15件  ※ 5/20 は単日10件テスト, 5/21 は3件');
  console.log('    来月(6月): 8件   ※ 6/22週は複数日バー重なりテスト');
  console.log('    テスト    : 14件 (複数日バー×4 + 単日10件)');
  console.log('');
  console.log('  テスト確認日:');
  console.log('    5/20 (水) — 単日10件スクロールテスト');
  console.log('    6/22 (月) — 複数日バー 1件（オーバーフローなし）');
  console.log('    6/23 (火) — 複数日バー 2件（オーバーフローなし）');
  console.log('    6/24 (水) — 複数日バー 3件（+1件 表示）');
  console.log('    6/25 (木) — 複数日バー 4件（+2件 表示）');
  console.log(`  タスク       : ${tasks.length}件 (未着手6・進行中4・完了4)`);
  console.log('  コラボ       : 5件 (open/confirmed/expired/cancelled を含む)');
  console.log('\nFirebase Emulator UI: http://localhost:4000\n');
}

main().catch((err) => {
  console.error('\nシードスクリプトエラー:', err);
  process.exit(1);
});
