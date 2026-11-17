import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// firebase-tools はホスト用（ルートの devDependency）と Docker 用（Dockerfile の ARG）の
// 2 箇所で固定している。片方だけ更新してずれるのを防ぐ
describe('firebase-tools のバージョン固定', () => {
  const root = resolve(__dirname, '../../..');
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const pkgVersion: string = pkg.devDependencies['firebase-tools'];
  const dockerfile = readFileSync(resolve(root, 'docker/emulator/Dockerfile'), 'utf8');
  const argVersion = dockerfile.match(/^ARG FIREBASE_TOOLS_VERSION=(\S+)/m)?.[1];

  it('package.json は範囲指定ではなく完全固定になっている', () => {
    expect(pkgVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('Dockerfile の ARG と package.json のバージョンが一致する', () => {
    expect(argVersion).toBe(pkgVersion);
  });
});
