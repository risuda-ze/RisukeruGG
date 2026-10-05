import { describe, expect, it } from 'vitest';
import {
  canTransition,
  deriveReadiness,
  isBlockedByInput,
  missingRequiredFields,
} from '@/lib/briefs/transitions';
import { makeStep } from './fixtures';

describe('deriveReadiness', () => {
  it('先行工程が完了した待機工程を着手可能にする', () => {
    const steps = [
      makeStep({ id: 's1', key: 'a', status: 'done' }),
      makeStep({ id: 's2', key: 'b', status: 'waiting', dependsOn: ['a'] }),
      makeStep({ id: 's3', key: 'c', status: 'waiting', dependsOn: ['b'] }),
    ];
    expect(deriveReadiness(steps)).toEqual([{ stepId: 's2', stepKey: 'b', from: 'waiting', to: 'ready' }]);
  });

  it('スキップも完了とみなす。先行が未完了に戻った着手可能工程は待機に戻す', () => {
    const steps = [
      makeStep({ id: 's1', key: 'a', status: 'skipped' }),
      makeStep({ id: 's2', key: 'b', status: 'waiting', dependsOn: ['a'] }),
      makeStep({ id: 's3', key: 'c', status: 'ready', dependsOn: ['b'] }),
    ];
    expect(deriveReadiness(steps)).toEqual([
      { stepId: 's2', stepKey: 'b', from: 'waiting', to: 'ready' },
      { stepId: 's3', stepKey: 'c', from: 'ready', to: 'waiting' },
    ]);
  });

  it('参照先が存在しない先行工程は満たされたものとして扱う', () => {
    const steps = [makeStep({ id: 's1', key: 'a', status: 'waiting', dependsOn: ['ghost'] })];
    expect(deriveReadiness(steps)[0]?.to).toBe('ready');
  });
});

describe('canTransition', () => {
  const ready = makeStep({ id: 's', key: 'k', status: 'ready' });
  const waiting = makeStep({ id: 's', key: 'k', status: 'waiting' });
  const done = makeStep({ id: 's', key: 'k', status: 'done' });

  it('着手可能 → 作業中 / 完了は可', () => {
    expect(canTransition(ready, 'in_progress').ok).toBe(true);
    expect(canTransition(ready, 'done').ok).toBe(true);
  });

  it('待機中は完了にできない', () => {
    expect(canTransition(waiting, 'done').ok).toBe(false);
    expect(canTransition(waiting, 'in_progress').ok).toBe(false);
  });

  it('スキップは optional の工程だけ', () => {
    expect(canTransition(ready, 'skipped').ok).toBe(false);
    expect(canTransition({ ...ready, optional: true }, 'skipped').ok).toBe(true);
    expect(canTransition({ ...done, optional: true }, 'skipped').ok).toBe(false);
  });

  it('差し戻しは完了・スキップからのみ。待機への手動遷移は不可', () => {
    expect(canTransition(done, 'ready').ok).toBe(true);
    expect(canTransition(ready, 'ready').ok).toBe(false);
    expect(canTransition(done, 'waiting').ok).toBe(false);
  });
});

describe('入力待ち判定', () => {
  const fields = [
    { key: 'url', label: '素材', type: 'url' as const, required: true, ownerRoleLabel: '出演者' },
    { key: 'memo', label: 'メモ', type: 'text' as const, required: false, ownerRoleLabel: null },
  ];

  it('必須項目が空なら入力待ち。空白だけも未入力扱い', () => {
    const step = makeStep({ id: 's', key: 'k', status: 'ready', requiredFields: fields, fields: { url: '  ' } });
    expect(missingRequiredFields(step).map((f) => f.key)).toEqual(['url']);
    expect(isBlockedByInput(step)).toBe(true);
  });

  it('埋まれば入力待ちではない。待機中の工程は入力待ちにしない', () => {
    const filled = makeStep({ id: 's', key: 'k', status: 'ready', requiredFields: fields, fields: { url: 'https://x' } });
    expect(isBlockedByInput(filled)).toBe(false);
    const waiting = makeStep({ id: 's', key: 'k', status: 'waiting', requiredFields: fields });
    expect(isBlockedByInput(waiting)).toBe(false);
  });
});
