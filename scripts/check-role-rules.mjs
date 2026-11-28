// ロールと作成者に基づく編集権限の Security Rules 自己チェック（変更仕様 two-roles の権限表）。
// 実行: firebase emulators:exec --only firestore --project demo-risukeru "node scripts/check-role-rules.mjs"
import assert from 'node:assert/strict';

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const BASE = `http://${HOST}/v1/projects/demo-risukeru/databases/(default)/documents`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (uid) => `${b64({ alg: 'none' })}.${b64({ sub: uid, user_id: uid, iat: 0, exp: 9999999999 })}.`;
const str = (v) => ({ stringValue: v });

/** 作成・全置換 */
async function put(path, fields, auth) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
    body: JSON.stringify({ fields }),
  });
  return res.status;
}
/** 指定フィールドだけの更新（updateMask） */
async function patch(path, fields, auth) {
  const q = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&');
  const res = await fetch(`${BASE}/${path}?${q}&currentDocument.exists=true`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
    body: JSON.stringify({ fields }),
  });
  return res.status;
}
const del = async (path, auth) =>
  (await fetch(`${BASE}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth}` } })).status;

const OWNER = 'owner'; // rules を迂回する（seed と同じ）

// 所属者: 管理者（member）、スタッフ（staff。旧 operator / rom も staff 扱い）
const roles = { mem: 'member', op: 'operator', st: 'staff', st2: 'staff', rom: 'rom' };
for (const [uid, role] of Object.entries(roles)) {
  assert.equal(await put(`teams/t1/members/${uid}`, { role: str(role) }, OWNER), 200);
}
const t = Object.fromEntries(['mem', 'op', 'st', 'st2', 'rom', 'out', 'gone'].map((u) => [u, token(u)]));
const ok = (status, msg) => assert.equal(status, 200, msg);
const ng = (status, msg) => assert.equal(status, 403, msg);

// ── スケジュール: 作成は所属者全員、編集・削除はメンバーか作成者 ──
ok(await put('teams/t1/schedules/s_st', { title: str('x'), createdBy: str('st') }, t.st), 'スタッフが自分名義で作成');
ng(await put('teams/t1/schedules/s_fake', { title: str('x'), createdBy: str('mem') }, t.st), '他人名義での作成');
ng(await put('teams/t1/schedules/s_nocreator', { title: str('x') }, t.st), '作成者なしでの作成');
ng(await put('teams/t1/schedules/s_out', { title: str('x'), createdBy: str('out') }, t.out), '部外者の作成');
ok(await patch('teams/t1/schedules/s_st', { title: str('y') }, t.st), '作成者が自分のスケジュールを編集');
ng(await patch('teams/t1/schedules/s_st', { title: str('z') }, t.st2), '他のスタッフは編集不可');
ng(await patch('teams/t1/schedules/s_st', { createdBy: str('st2') }, t.st), '作成者の書き換え');
ng(await patch('teams/t1/schedules/s_st', { createdBy: str('st2') }, t.mem), 'メンバーでも作成者は書き換え不可');
ok(await patch('teams/t1/schedules/s_st', { title: str('m') }, t.mem), 'メンバーは他人のスケジュールを編集');
ng(await patch('teams/t1/schedules/s_st', { title: str('o') }, t.op), '旧 operator は管理者ではない');
ng(await patch('teams/t1/schedules/s_st', { title: str('r') }, t.rom), '旧 rom は他人分を編集不可');
ng(await del('teams/t1/schedules/s_st', t.st2), '他のスタッフは削除不可');
ok(await del('teams/t1/schedules/s_st', t.st), '作成者は自分のスケジュールを削除');
// Discord 経由・作成者なし・退会者は、メンバーのみ
for (const [id, createdBy] of [['s_discord', 'discord-bot'], ['s_legacy', null], ['s_gone', 'gone']]) {
  const fields = createdBy ? { title: str('x'), createdBy: str(createdBy) } : { title: str('x') };
  assert.equal(await put(`teams/t1/schedules/${id}`, fields, OWNER), 200);
  ng(await patch(`teams/t1/schedules/${id}`, { title: str('y') }, t.st), `${id} はスタッフが編集不可`);
  ng(await del(`teams/t1/schedules/${id}`, t.st), `${id} はスタッフが削除不可`);
  ok(await patch(`teams/t1/schedules/${id}`, { title: str('y') }, t.mem), `${id} はメンバーが編集可`);
}

// ── タスク・コラボ: 更新はメンバーのみ。削除はコラボはメンバーのみ、タスクは deleteTask 経由だけ ──
for (const col of ['tasks', 'collabSessions']) {
  assert.equal(await put(`teams/t1/${col}/c1`, { title: str('x'), createdBy: str('st') }, OWNER), 200);
  ng(await patch(`teams/t1/${col}/c1`, { title: str('y') }, t.st), `${col}: スタッフは作成者でも編集不可`);
  ng(await del(`teams/t1/${col}/c1`, t.st), `${col}: スタッフは削除不可`);
  ok(await patch(`teams/t1/${col}/c1`, { title: str('y') }, t.mem), `${col}: メンバーは編集可`);
}
ng(await del('teams/t1/tasks/c1', t.mem), 'tasks: メンバーでも直接削除は不可（deleteTask 経由）');
ok(await del('teams/t1/collabSessions/c1', t.mem), 'collabSessions: メンバーは削除可');

// ── 進め方・カテゴリ・カンバン列・Discord・AI 設定: メンバーのみ ──
for (const path of ['ai/a1', 'discord/d1']) {
  ng(await put(`teams/t1/${path}`, { name: str('x') }, t.st), `${path}: スタッフは書けない`);
  ok(await put(`teams/t1/${path}`, { name: str('x') }, t.mem), `${path}: メンバーは書ける`);
}
// 作成者（createdBy）を持つ設定系: メンバーのみ。作成時は自分の uid、更新で createdBy は変更不可
for (const path of ['playbooks/p1', 'categories/c1', 'taskStatuses/k1']) {
  const doc = (by) => ({ name: str('x'), createdBy: str(by) });
  ng(await put(`teams/t1/${path}`, doc('st'), t.st), `${path}: スタッフは作成不可`);
  ng(await put(`teams/t1/${path}`, { name: str('x') }, t.mem), `${path}: createdBy なしでは作成不可`);
  ng(await put(`teams/t1/${path}`, doc('st'), t.mem), `${path}: 他人名義では作成不可`);
  ok(await put(`teams/t1/${path}`, doc('mem'), t.mem), `${path}: メンバーが自分名義で作成`);
  ok(await patch(`teams/t1/${path}`, { name: str('y'), updatedBy: str('mem') }, t.mem), `${path}: メンバーは編集可`);
  ng(await patch(`teams/t1/${path}`, { createdBy: str('st') }, t.mem), `${path}: createdBy は書き換え不可`);
  ng(await patch(`teams/t1/${path}`, { name: str('z') }, t.st), `${path}: スタッフは編集不可`);
  ng(await del(`teams/t1/${path}`, t.st), `${path}: スタッフは削除不可`);
}

// ── ブリーフ・工程・工程コメント ──
ok(await put('teams/t1/briefs/b1', { title: str('b'), createdBy: str('st') }, t.st), 'スタッフが自分名義でブリーフ作成');
ng(await put('teams/t1/briefs/b_fake', { title: str('b'), createdBy: str('mem') }, t.st), '他人名義でのブリーフ作成');
ok(await patch('teams/t1/briefs/b1', { title: str('c') }, t.st), '作成者がブリーフを編集');
ng(await patch('teams/t1/briefs/b1', { title: str('d') }, t.st2), '他のスタッフはブリーフを編集不可');
ok(await patch('teams/t1/briefs/b1', { title: str('e') }, t.mem), 'メンバーはブリーフを編集');
ng(await del('teams/t1/briefs/b1', t.st), 'ブリーフの削除は作成者のスタッフでも不可');
// 工程: ブリーフの作成者が触れる。担当者は完了・状態変更だけ
const step = (assignee, status = 'ready', by = 'st') => ({
  title: str('s'),
  status: str(status),
  assigneeId: str(assignee),
  createdBy: str(by),
});
ok(await put('teams/t1/briefs/b1/steps/s1', step('st2'), t.st), 'ブリーフ作成者が工程を作成');
ng(await put('teams/t1/briefs/b1/steps/s2', step('st2', 'ready', 'st2'), t.st2), '作成者でも担当者でもないスタッフは工程を作れない');
ng(await put('teams/t1/briefs/b1/steps/s2', step('st2', 'ready', 'mem'), t.st), '他人名義の工程は作れない');
ok(await patch('teams/t1/briefs/b1/steps/s1', { status: str('done'), completedBy: str('st2'), updatedBy: str('st2') }, t.st2), '担当者が完了できる（updatedBy を伴う）');
ng(await patch('teams/t1/briefs/b1/steps/s1', { title: str('t') }, t.st2), '担当者でもタイトルは変更不可');
ng(await patch('teams/t1/briefs/b1/steps/s1', { assigneeId: str('mem') }, t.st2), '担当者でも担当は変更不可');
ok(await patch('teams/t1/briefs/b1/steps/s1', { title: str('t') }, t.st), 'ブリーフ作成者は工程を編集');
assert.equal(await put('teams/t1/briefs/b1/steps/s3', step('mem', 'waiting'), OWNER), 200);
ok(await patch('teams/t1/briefs/b1/steps/s3', { status: str('ready') }, t.st2), '依存関係の再評価（waiting→ready）');
ng(await patch('teams/t1/briefs/b1/steps/s3', { status: str('done') }, t.st2), '担当外の工程を完了不可');
ng(await del('teams/t1/briefs/b1/steps/s3', t.st2), '作成者でないスタッフは工程を削除不可');
ok(await del('teams/t1/briefs/b1/steps/s3', t.mem), 'メンバーは工程を削除');
// 工程コメント: 作成は所属者全員、編集・削除は本人かメンバー
ok(await put('teams/t1/briefs/b1/steps/s1/comments/c1', { authorId: str('st2'), body: str('x') }, t.st2), 'スタッフがコメント作成');
ng(await patch('teams/t1/briefs/b1/steps/s1/comments/c1', { body: str('y') }, t.st), '他人のコメントは編集不可');
ok(await patch('teams/t1/briefs/b1/steps/s1/comments/c1', { body: str('y') }, t.st2), '本人はコメントを編集');
ok(await del('teams/t1/briefs/b1/steps/s1/comments/c1', t.mem), 'メンバーはコメントを削除');
// 差分: 追記のみ。ブリーフごと消すときのメンバー削除だけ許す
ok(await put('teams/t1/briefs/b1/briefEvents/e1', { type: str('x') }, t.st2), '所属者は差分を追記できる');
ng(await patch('teams/t1/briefs/b1/briefEvents/e1', { type: str('y') }, t.mem), '差分は改変不可');
ng(await del('teams/t1/briefs/b1/briefEvents/e1', t.st), '差分の削除はスタッフ不可');
ok(await del('teams/t1/briefs/b1/briefEvents/e1', t.mem), 'メンバーは差分を削除できる（ブリーフ削除の連鎖）');
ok(await patch('teams/t1/briefs/b1', { updatedBy: str('st2') }, t.st2), '所属者はブリーフの updatedAt/updatedBy だけ更新できる');
ok(await del('teams/t1/briefs/b1', t.mem), 'メンバーはブリーフを削除');

// ── チーム設定: メンバーのみ ──
assert.equal(await put('teams/t1', { name: str('t') }, OWNER), 200);
ng(await patch('teams/t1', { name: str('y') }, t.st), 'スタッフはチーム設定を変更不可');
ok(await patch('teams/t1', { name: str('y') }, t.mem), 'メンバーはチーム設定を変更可');

console.log('role rules: OK');
