import { describe, it, expect } from 'vitest';
import { canEditRole } from '@/lib/utils/teamRoles';

describe('canEditRole', () => {
  it.each(['operator', 'member', 'staff'] as const)('%s は編集できる', (role) => {
    expect(canEditRole(role)).toBe(true);
  });

  it.each(['rom', null, undefined] as const)('%s は編集できない', (role) => {
    expect(canEditRole(role)).toBe(false);
  });
});
