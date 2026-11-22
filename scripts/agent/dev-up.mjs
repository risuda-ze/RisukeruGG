// 使い方: node scripts/agent/dev-up.mjs
// エージェントが自分でアプリを動かす前の環境確認。Emulator が上がっていなければ起動方法を示して失敗し、
// dev サーバーが上がっていなければ Emulator 接続で起動して待つ。
import { spawn } from 'node:child_process';
import { connect } from 'node:net';

const EMULATORS = { auth: 9098, firestore: 8080, functions: 5001 }; // firebase.json と同じ
const APP = 3000;

const isOpen = (port) =>
  new Promise((ok) => {
    const s = connect(port, '127.0.0.1');
    s.once('connect', () => (s.destroy(), ok(true)));
    s.once('error', () => ok(false));
  });

const down = [];
for (const [name, port] of Object.entries(EMULATORS))
  if (!(await isOpen(port))) down.push(`${name}:${port}`);
if (down.length) {
  console.error(
    `Emulator が起動していない（${down.join(', ')}）。README「開発環境」の手順で Emulator を起動してから再実行する。`
  );
  process.exit(1);
}

if (!(await isOpen(APP))) {
  const child = spawn('pnpm', ['dev'], {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
    env: { ...process.env, NEXT_PUBLIC_USE_EMULATORS: 'true' },
  });
  child.unref();
  const deadline = Date.now() + 120_000;
  while (!(await isOpen(APP))) {
    if (Date.now() > deadline) {
      console.error(
        `dev サーバーが ${APP} で 120 秒以内に起動しなかった。pnpm dev を直接実行してエラーを確認する。`
      );
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
console.log(`準備完了: app http://localhost:${APP} / Emulator UI http://localhost:4000`);
