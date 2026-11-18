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

const DATA_DIR = '.emulator-data';
const importArg = existsSync(`${DATA_DIR}/firebase-export-metadata.json`)
  ? ` --import ${DATA_DIR}`
  : '';

// firebase は devDependency の firebase-tools（pnpm 経由で PATH に入る）を使う
const child = spawn(
  `firebase emulators:start --project demo-risukeru${importArg} --export-on-exit ${DATA_DIR}`,
  { stdio: 'inherit', shell: true }
);

// Ctrl+C は子プロセスにも届く。export が終わるまで親は終了せずに待つ
process.on('SIGINT', () => {});
child.on('exit', (code) => process.exit(code ?? 1));
