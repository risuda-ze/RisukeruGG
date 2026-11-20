// teams/{teamId}/members の Security Rules 自己チェック（権限昇格の回帰防止）。
// 実行: firebase emulators:exec --only firestore --project demo-risukeru "node scripts/check-member-rules.mjs"
import assert from 'node:assert/strict';

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const BASE = `http://${HOST}/v1/projects/demo-risukeru/databases/(default)/documents`;

// Emulator は署名なし JWT を受け付ける
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (uid) => `${b64({ alg: 'none' })}.${b64({ sub: uid, user_id: uid, iat: 0, exp: 9999999999 })}.`;

async function patch(path, fields, auth, mask) {
  const q = mask ? '?' + mask.map((f) => `updateMask.fieldPaths=${f}`).join('&') : '';
  const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { stringValue: v }])) };
  const res = await fetch(`${BASE}/${path}${q}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
    body: JSON.stringify(body),
  });
  return res.status;
}
const del = async (path, auth) =>
  (await fetch(`${BASE}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth}` } })).status;

// 'owner' は rules を迂回する（seed と同じ）
assert.equal(await patch('teams/t1/members/op', { role: 'operator', displayName: 'op' }, 'owner'), 200);
assert.equal(await patch('teams/t1/members/mem', { role: 'member', displayName: 'mem' }, 'owner'), 200);

const mem = token('mem');
const op = token('op');
const outsider = token('outsider');

// 拒否されるべき操作
assert.equal(await patch('teams/t1/members/mem', { role: 'operator' }, mem, ['role']), 403, '本人の role 書き換え');
assert.equal(await patch('teams/t1/members/mem', { plan: 'pro' }, mem, ['plan']), 403, '本人の plan 書き換え');
assert.equal(await patch('teams/t1/members/outsider', { role: 'operator' }, outsider), 403, '部外者の自己追加');
assert.equal(await patch('teams/t1/members/op', { displayName: 'x' }, mem, ['displayName']), 403, '他人の更新');
assert.equal(await patch('teams/t1/members/mem', { role: 'operator' }, op, ['role']), 403, 'operator でも role は Functions 経由');
assert.equal(await del('teams/t1/members/mem', mem), 403, '本人の直接削除');

// 許可されるべき操作
assert.equal(await patch('teams/t1/members/mem', { displayName: 'new' }, mem, ['displayName']), 200, '本人の表示名');
assert.equal(await patch('teams/t1/members/mem', { discordUsername: 'd' }, op, ['discordUsername']), 200, 'operator の Discord 名');

console.log('members rules: OK');
