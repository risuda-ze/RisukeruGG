import { describe, expect, it } from 'vitest';
import { buildCollabSavePayload } from '@/lib/collab/savePayload';
import type { CollabSession } from '@/types/entities';

/* CO-032: 未編集のフィールドは書かず、候補日程・回答を書くときだけ楽観的ロックが要る */

const session: CollabSession = {
  id: 's1',
  title: 'コラボ',
  partnerName: '',
  createdBy: 'u1',
  teamId: 't1',
  proposedDates: [new Date('2026-12-01T10:00:00Z'), new Date('2026-12-02T10:00:00Z')],
  responses: null,
  expiresAt: new Date('2026-12-31T00:00:00Z'),
  status: 'open',
  confirmedDate: null,
  linkedScheduleId: null,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: new Date('2026-11-02T00:00:00Z'),
  icon: 'mic',
  content: '',
  participants: [{ id: 'm1', name: 'A', type: 'member' }],
  participantResponses: { ext_b: { '0': 'ok', '1': 'ng' } },
};

/* モーダルの初期 state と同じく、session の参照そのままから始める */
const unedited = () => ({
  title: session.title,
  content: '',
  icon: 'mic',
  participants: session.participants!,
  proposedDates: session.proposedDates,
  participantResponses: session.participantResponses!,
});

describe('buildCollabSavePayload', () => {
  it('タイトルだけを変えた保存は候補日程・回答を書かず、ロックも要らない', () => {
    const { payload, needsLock } = buildCollabSavePayload(session, { ...unedited(), title: '新タイトル' });
    expect(payload).toEqual({ title: '新タイトル', content: '', icon: 'mic' });
    expect(needsLock).toBe(false);
  });

  it('参加者だけを変えた保存は participants を書くがロックは要らない', () => {
    const participants = [...session.participants!, { id: 'ext_1', name: 'B', type: 'external' as const }];
    const { payload, needsLock } = buildCollabSavePayload(session, { ...unedited(), participants });
    expect(payload.participants).toBe(participants);
    expect(payload).not.toHaveProperty('proposedDates');
    expect(payload).not.toHaveProperty('participantResponses');
    expect(needsLock).toBe(false);
  });

  it('候補日程を削除した保存は候補日程と再インデックス後の回答を書き、ロックが要る', () => {
    const proposedDates = [session.proposedDates[1]!];
    const participantResponses = { ext_b: { '0': 'ng' as const } };
    const { payload, needsLock } = buildCollabSavePayload(session, {
      ...unedited(),
      proposedDates,
      participantResponses,
    });
    expect(payload.proposedDates).toBe(proposedDates);
    expect(payload.participantResponses).toBe(participantResponses);
    expect(needsLock).toBe(true);
  });

  it('候補日程の追加・編集だけでもロックが要る', () => {
    const proposedDates = [...session.proposedDates, new Date('2026-12-03T10:00:00Z')];
    const { payload, needsLock } = buildCollabSavePayload(session, { ...unedited(), proposedDates });
    expect(payload).not.toHaveProperty('participantResponses');
    expect(needsLock).toBe(true);
  });

  it('空白だけのタイトルは元のタイトルを書く', () => {
    expect(buildCollabSavePayload(session, { ...unedited(), title: '  ' }).payload.title).toBe('コラボ');
  });
});
