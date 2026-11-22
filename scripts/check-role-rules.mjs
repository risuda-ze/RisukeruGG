// ロール別の編集権限（isOwnerOrEditor）の Security Rules 自己チェック。
// staff が旧 member と同じ編集者であること、rom が編集できないことを確認する（変更仕様 two-roles の PR A）。
// 実行: firebase emulators:exec --only firestore --project demo-risukeru "node scripts/check-role-rules.mjs"
import assert from 'node:assert/strict';

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const BASE = `http://${HOST}/v1/projects/demo-risukeru/databases/(default)/documents`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (uid) => `${b64({ alg: 'none' })}.${b64({ sub: uid, user_id: uid, iat: 0, exp: 9999999999 })}.`;

async function write(path, fields, auth) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
    body: JSON.stringify({ fields }),
  });
  return res.status;
}

// 'owner' は rules を迂回する（seed と同じ）
const roles = ['operator', 'member', 'staff', 'rom'];
for (const role of roles) {
  assert.equal(await write(`teams/t1/members/${role}`, { role: { stringValue: role } }, 'owner'), 200);
}

const doc = { title: { stringValue: 'x' } };
const expected = { operator: 200, member: 200, staff: 200, rom: 403 };
for (const role of roles) {
  assert.equal(await write(`teams/t1/schedules/s_${role}`, doc, token(role)), expected[role], `${role} のスケジュール書き込み`);
}
assert.equal(await write('teams/t1/schedules/s_outsider', doc, token('outsider')), 403, '部外者の書き込み');

console.log('role rules: OK');
