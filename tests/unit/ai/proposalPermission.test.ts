import { describe, expect, it } from 'vitest';
import { canRegisterProposals } from '@/lib/ai/proposalPermission';

describe('canRegisterProposals', () => {
  it('メンバーはすべての提案を登録できる', () => {
    expect(canRegisterProposals('member', [{ type: 'task' }, { type: 'collab' }, { type: 'schedule' }])).toBe(true);
  });

  it('スタッフはスケジュールだけなら登録できる', () => {
    expect(canRegisterProposals('staff', [{ type: 'schedule' }, { type: 'schedule' }])).toBe(true);
  });

  it.each(['task', 'collab', 'task_update'])('スタッフは %s を含む提案を登録できない', (type) => {
    expect(canRegisterProposals('staff', [{ type: 'schedule' }, { type }])).toBe(false);
  });

  it('所属がない（ロールなし）、提案が空なら登録できない', () => {
    expect(canRegisterProposals(null, [{ type: 'schedule' }])).toBe(false);
    expect(canRegisterProposals('staff', [])).toBe(false);
  });
});
