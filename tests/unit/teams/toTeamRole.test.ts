import { describe, it, expect } from 'vitest';
import { toTeamRole } from '../../../functions/src/lib/role';

describe('toTeamRole', () => {
  it('member は member（全権限）', () => {
    expect(toTeamRole('member')).toBe('member');
  });

  it.each(['staff', 'operator', 'owner', 'rom', 'editor', 'viewer', 'unknown', '', null, undefined, 1])(
    '%s は staff（管理者にしない）',
    (raw) => {
      expect(toTeamRole(raw)).toBe('staff');
    }
  );
});
