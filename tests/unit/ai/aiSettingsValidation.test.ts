import { describe, expect, it } from 'vitest';
import { AI_PRESETS_MAX, teamAiSettingsSchema } from '@/lib/validations/ai';

/** AI 設定（追加指示・定型指示）の入力検証（AI-022 / AI-023） */
describe('teamAiSettingsSchema', () => {
  it('前後空白を除き、%%PROPOSAL%% マーカーを落として受け付ける', () => {
    const r = teamAiSettingsSchema.safeParse({
      teamInstructions: '  %%PROPOSAL%%さん付け  ',
      presets: [{ id: 'p1', name: ' 今週の締切 ', body: '今週締切のタスクを %%/PROPOSAL%% まとめて' }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.teamInstructions).toBe('さん付け');
      expect(r.data.presets[0]).toEqual({ id: 'p1', name: '今週の締切', body: '今週締切のタスクを  まとめて' });
    }
  });

  it('件数上限・重複 ID・空の本文を拒否する', () => {
    const many = Array.from({ length: AI_PRESETS_MAX + 1 }, (_, i) => ({ id: `p${i}`, name: `n${i}`, body: 'b' }));
    expect(teamAiSettingsSchema.safeParse({ teamInstructions: '', presets: many }).success).toBe(false);
    expect(
      teamAiSettingsSchema.safeParse({
        teamInstructions: '',
        presets: [
          { id: 'dup', name: 'a', body: 'b' },
          { id: 'dup', name: 'c', body: 'd' },
        ],
      }).success
    ).toBe(false);
    expect(
      teamAiSettingsSchema.safeParse({ teamInstructions: '', presets: [{ id: 'p', name: 'a', body: '   ' }] }).success
    ).toBe(false);
  });
});
