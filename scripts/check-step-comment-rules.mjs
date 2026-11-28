// teams/{teamId}/briefs/{briefId}/steps/{stepId}/comments の Security Rules 自己チェック（TE-023 / TE-024）。
// 実行: firebase emulators:exec --only firestore --project demo-risukeru "node scripts/check-step-comment-rules.mjs"
import assert from 'node:assert/strict';

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const ROOT = 'projects/demo-risukeru/databases/(default)/documents';
const BASE = `http://${HOST}/v1/${ROOT}`;

// Emulator は署名なし JWT を受け付ける
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (uid) =>
  `${b64({ alg: 'none' })}.${b64({ sub: uid, user_id: uid, iat: 0, exp: 9999999999 })}.`;

const toFields = (o) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { stringValue: v }]));
const set = (path, data) => ({ update: { name: `${ROOT}/${path}`, fields: toFields(data) } });
const remove = (path) => ({ delete: `${ROOT}/${path}` });

/** writes を 1 回の commit（writeBatch と同じ）で送り、HTTP ステータスを返す */
async function commit(writes, auth) {
  const res = await fetch(`${BASE}:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
    body: JSON.stringify({ writes }),
  });
  return res.status;
}

const brief = 'teams/t1/briefs/b1';
const comment = (author) => ({ authorId: author, authorName: author, body: 'hi', source: 'web' });

// 'owner' は rules を迂回する（seed と同じ）
assert.equal(
  await commit(
    [
      set('teams/t1/members/op', { role: 'member' }),
      set('teams/t1/members/stf', { role: 'staff' }),
      set('teams/t1/members/oth', { role: 'staff' }),
      set(brief, { createdBy: 'stf', title: 'b1' }),
      ...['s1', 's2', 's3'].map((s) => set(`${brief}/steps/${s}`, { createdBy: 'stf', title: s })),
      set(`${brief}/steps/s1/comments/c_oth`, comment('oth')),
      set(`${brief}/steps/s2/comments/c_oth`, comment('oth')),
      set(`${brief}/steps/s3/comments/c_oth`, comment('oth')),
    ],
    'owner'
  ),
  200
);

const [op, stf, oth] = ['op', 'stf', 'oth'].map(token);

// 作成: 親の工程があるときだけ
assert.equal(
  await commit([set(`${brief}/steps/s1/comments/c1`, comment('oth'))], oth),
  200,
  '工程があれば作成できる'
);
assert.equal(
  await commit([set(`${brief}/steps/none/comments/c1`, comment('oth'))], oth),
  403,
  '存在しない工程には作成できない'
);
assert.equal(
  await commit([set('teams/t1/briefs/none/steps/s1/comments/c1', comment('oth'))], oth),
  403,
  '存在しないブリーフの工程には作成できない'
);

// 削除: 工程を残したまま他人のコメントを消せるのは本人かメンバーだけ
assert.equal(
  await commit([remove(`${brief}/steps/s2/comments/c_oth`)], stf),
  403,
  'ブリーフの作成者でも、工程を残したまま他人のコメントは消せない'
);

// 工程の削除に伴う削除: 工程を消せる者は配下の他人のコメントも同じバッチで消せる
assert.equal(
  await commit(
    [
      remove(`${brief}/steps/s1/comments/c_oth`),
      remove(`${brief}/steps/s1/comments/c1`),
      remove(`${brief}/steps/s1`),
    ],
    stf
  ),
  200,
  'ブリーフの作成者（スタッフ）は工程と配下のコメントを一緒に消せる'
);
assert.equal(
  await commit([set(`${brief}/steps/s1/comments/c2`, comment('oth'))], oth),
  403,
  '削除済みの工程にはコメントを作成できない'
);
assert.equal(
  await commit([remove(`${brief}/steps/s2/comments/c_oth`), remove(`${brief}/steps/s2`)], oth),
  403,
  'ブリーフの作成者でないスタッフは工程を消せない'
);
assert.equal(
  await commit([remove(`${brief}/steps/s3/comments/c_oth`), remove(`${brief}/steps/s3`)], op),
  200,
  'メンバーは工程と配下のコメントを一緒に消せる'
);

console.log('step comment rules: OK');
