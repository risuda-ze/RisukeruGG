import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import { RELEASE_NOTES } from '@/lib/releaseNotes';

describe('RELEASE_NOTES', () => {
  // バージョンと原稿の同期を確認する
  it('先頭のバージョンが package.json の version と一致する', () => {
    expect(RELEASE_NOTES[0]?.version).toBe(packageJson.version);
  });

  it('バージョンが重複しない', () => {
    const versions = RELEASE_NOTES.map((note) => note.version);
    expect(new Set(versions).size).toBe(versions.length);
  });
});
