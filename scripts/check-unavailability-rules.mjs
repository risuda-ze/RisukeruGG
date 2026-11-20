// teams/{teamId}/unavailability の Security Rules 自己チェック（UN-010〜UN-013）。
// 実行: firebase emulators:exec --only firestore --project demo-risukeru "node scripts/check-unavailability-rules.mjs"
import assert from 'node:assert/strict';

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const ROOT = 'projects/demo-risukeru/databases/(default)/documents';
const BASE = `http://${HOST}/v1/${ROOT}`;

// Emulator は署名なし JWT を受け付ける
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (uid) =>
  `${b64({ alg: 'none' })}.${b64({ sub: uid, user_id: uid, iat: 0, exp: 9999999999 })}.`;

/** JS の値を Firestore REST の Value にする */
function toValue(v) {
  if (typeof v === 'string') return { stringValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: toFields(v) } };
}
const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));

const headers = (auth) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` });

/** クライアントの setDoc(merge) と同じ形で書く。serverTime=true なら updatedAt をサーバー時刻にする */
async function write(path, data, auth, { serverTime = true } = {}) {
  const body = {
    writes: [
      {
        update: { name: `${ROOT}/${path}`, fields: toFields(data) },
        updateMask: { fieldPaths: Object.keys(data) },
        ...(serverTime && {
          updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
        }),
      },
    ],
  };
  const res = await fetch(`${BASE}:commit`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(body),
  });
  return res.status;
}
const read = async (path, auth) =>
  (await fetch(`${BASE}/${path}`, { headers: headers(auth) })).status;
const del = async (path, auth) =>
  (await fetch(`${BASE}/${path}`, { method: 'DELETE', headers: headers(auth) })).status;

// 'owner' は rules を迂回する（seed と同じ）
for (const [uid, role] of [
  ['op', 'operator'],
  ['mem', 'member'],
  ['rom', 'rom'],
]) {
  assert.equal(
    await write(`teams/t1/members/${uid}`, { role }, 'owner', { serverTime: false }),
    200
  );
}

const [op, mem, rom, outsider] = ['op', 'mem', 'rom', 'outsider'].map(token);
const dir = 'teams/t1/unavailability';
const doc = (userId, month = '2026-11') => ({ userId, month, days: { '2026-11-14': 15728640 } });
const note = (i) => ({ id: `n${i}`, date: '2026-11-14', start: 20, end: 24, text: 'memo' });

// 許可されるべき操作
assert.equal(await write(`${dir}/mem_2026-11`, doc('mem'), mem), 200, '本人の作成');
assert.equal(
  await write(`${dir}/rom_2026-11`, doc('rom'), rom),
  200,
  'rom も自分の分は書ける（UN-011）'
);
assert.equal(
  await write(`${dir}/mem_2026-11`, { userId: 'mem', month: '2026-11', notes: [note(1)] }, mem),
  200,
  '本人の更新（メモだけ）'
);
assert.equal(
  await write(
    `${dir}/mem_2026-12`,
    { userId: 'mem', month: '2026-12', notes: Array.from({ length: 200 }, (_, i) => note(i)) },
    mem
  ),
  200,
  'メモ 200 件'
);
assert.equal(
  await read(`${dir}/mem_2026-11`, rom),
  200,
  'rom を含む同一チームのメンバーは読める（UN-012）'
);

// 拒否されるべき操作
assert.equal(
  await write(`${dir}/mem_2026-11`, doc('mem'), op),
  403,
  'operator でも他人の分は書けない（UN-010）'
);
assert.equal(
  await write(`${dir}/mem_2026-10`, doc('op', '2026-10'), op),
  403,
  '他人の ID の下に自分の userId'
);
assert.equal(
  await write(`${dir}/op_2026-10`, doc('mem', '2026-10'), op),
  403,
  '自分の ID の下に他人の userId'
);
assert.equal(await write(`${dir}/mem_2026-10`, doc('mem'), mem), 403, 'ID の月と month の不一致');
assert.equal(await write(`${dir}/mem_2026-13`, doc('mem', '2026-13'), mem), 403, 'month の形式');
assert.equal(
  await write(`${dir}/mem_2026-11`, { ...doc('mem'), extra: 'x' }, mem),
  403,
  '定義外のフィールド'
);
assert.equal(
  await write(
    `${dir}/mem_2026-11`,
    { userId: 'mem', month: '2026-11', notes: Array.from({ length: 201 }, (_, i) => note(i)) },
    mem
  ),
  403,
  'メモ 201 件'
);
assert.equal(
  await write(`${dir}/mem_2026-11`, { ...doc('mem'), updatedAt: new Date(0) }, mem, {
    serverTime: false,
  }),
  403,
  'updatedAt がサーバー時刻でない'
);
assert.equal(
  await write(`${dir}/outsider_2026-11`, doc('outsider'), outsider),
  403,
  '他チームの書き込み'
);
assert.equal(await read(`${dir}/mem_2026-11`, outsider), 403, '他チームの読み取り（UN-012）');
assert.equal(await del(`${dir}/mem_2026-11`, mem), 403, '本人でも削除はできない');

console.log('unavailability rules: OK');
