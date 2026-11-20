import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import { RELEASE_NOTES } from '@/lib/releaseNotes';

describe('RELEASE_NOTES', () => {
  // バージョンだけ上げて原稿を移し忘れる（またはその逆）のを防ぐ
  it('先頭のバージョンが package.json の version と一致する', () => {
    expect(RELEASE_NOTES[0]?.version).toBe(packageJson.version);
  });

  it('バージョンが重複しない', () => {
    const versions = RELEASE_NOTES.map((note) => note.version);
    expect(new Set(versions).size).toBe(versions.length);
  });
});
