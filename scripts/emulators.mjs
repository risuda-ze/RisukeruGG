#!/usr/bin/env node
/**
 * Firebase Emulator をホストで起動する
 *
 * 使い方: pnpm emulators（Functions のビルド後にこのスクリプトが呼ばれる）
 *
 * データは .emulator-data/ に終了時 export し、次回起動時に import する。
 * Ctrl+C で終了すること。強制終了すると export されずデータが残らない。
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const DATA_DIR = '.emulator-data';

// devDependency の firebase-tools を node で直接実行する。
// firebase.cmd 経由にすると Windows で Ctrl+C 時に「バッチ ジョブを終了しますか」が
// 余分に出るため、シェルを介さない
const firebaseBin = createRequire(import.meta.url).resolve('firebase-tools/lib/bin/firebase.js');

const args = [
  firebaseBin,
  'emulators:start',
  '--project',
  'demo-risukeru',
  // firebase.json に hosting 定義があるが、ローカルでは Next.js を pnpm dev で動かすため起動しない
  '--only',
  'auth,functions,firestore,storage',
  '--export-on-exit',
  DATA_DIR,
];
if (existsSync(`${DATA_DIR}/firebase-export-metadata.json`)) {
  args.push('--import', DATA_DIR);
}

const child = spawn(process.execPath, args, { stdio: 'inherit' });

// Ctrl+C は子プロセスにも届く。export が終わるまで親は終了せずに待つ
process.on('SIGINT', () => {});
child.on('exit', (code) => process.exit(code ?? 1));
