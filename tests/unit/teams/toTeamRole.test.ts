import { describe, it, expect } from 'vitest';
import { toTeamRole } from '../../../functions/src/lib/role';

describe('toTeamRole', () => {
  it.each(['member', 'operator', 'owner'])('%s は member（全権限）', (raw) => {
    expect(toTeamRole(raw)).toBe('member');
  });

  it.each(['staff', 'rom', 'editor', 'viewer', 'unknown', '', null, undefined, 1])(
    '%s は staff（管理者にしない）',
    (raw) => {
      expect(toTeamRole(raw)).toBe('staff');
    }
  );
});
