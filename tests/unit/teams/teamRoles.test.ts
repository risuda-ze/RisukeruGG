import { describe, it, expect } from 'vitest';
import { canManageCreated, isLastMember, isMemberRole, toTeamRole } from '@/lib/utils/teamRoles';

describe('toTeamRole', () => {
  it('member は member（全権限）', () => {
    expect(toTeamRole('member')).toBe('member');
  });

  it.each(['staff', 'operator', 'owner', 'rom', 'editor', 'viewer', 'unknown', '', null, undefined])(
    '%s は staff（管理者にしない）',
    (raw) => {
      expect(toTeamRole(raw)).toBe('staff');
    }
  );
});

describe('isMemberRole', () => {
  it('member だけが全権限', () => {
    expect(isMemberRole('member')).toBe(true);
    expect(isMemberRole('staff')).toBe(false);
    expect(isMemberRole(null)).toBe(false);
  });
});

describe('canManageCreated（作成者かメンバー）', () => {
  it('メンバーは他人の作成物も扱える（作成者なしを含む）', () => {
    expect(canManageCreated('member', 'u_other', 'u_me')).toBe(true);
    expect(canManageCreated('member', null, 'u_me')).toBe(true);
  });

  it('スタッフは自分が作成したものだけ扱える', () => {
    expect(canManageCreated('staff', 'u_me', 'u_me')).toBe(true);
    expect(canManageCreated('staff', 'u_other', 'u_me')).toBe(false);
  });

  it.each(['discord-bot', 'system', null, undefined, ''])(
    'スタッフは作成者が %s のものを扱えない',
    (createdBy) => {
      expect(canManageCreated('staff', createdBy, 'u_me')).toBe(false);
    }
  );

  it('uid が無ければ扱えない', () => {
    expect(canManageCreated('staff', 'u_me', null)).toBe(false);
  });
});

describe('isLastMember（退出・アカウント削除の前に指名が要るか）', () => {
  const m = (userId: string, role: 'member' | 'staff') => ({ userId, role });

  it('自分以外にメンバーがいなければ最後のメンバー', () => {
    expect(isLastMember([m('me', 'member'), m('a', 'staff')], 'me')).toBe(true);
    expect(isLastMember([m('me', 'member')], 'me')).toBe(true);
  });

  it('自分以外にメンバーがいれば最後ではない（そのまま退出できる）', () => {
    expect(isLastMember([m('me', 'member'), m('b', 'member'), m('a', 'staff')], 'me')).toBe(false);
  });

  it('スタッフ、所属していない、uid なしは false', () => {
    expect(isLastMember([m('me', 'staff'), m('b', 'member')], 'me')).toBe(false);
    expect(isLastMember([m('b', 'member')], 'me')).toBe(false);
    expect(isLastMember([m('me', 'member')], null)).toBe(false);
  });
});
