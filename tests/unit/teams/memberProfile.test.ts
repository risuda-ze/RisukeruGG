import { describe, expect, it } from 'vitest';
import { memberProfileSchema } from '@/lib/validations/team';

/** 担当分野・ひとことの検証（TE-014） */
describe('memberProfileSchema', () => {
  it('候補の担当分野とひとことを受け付ける', () => {
    const r = memberProfileSchema.parse({ duties: ['cast', 'edit'], note: ' よろしく ' });
    expect(r).toEqual({ duties: ['cast', 'edit'], note: 'よろしく' });
  });

  it('空のひとことは null に正規化する', () => {
    expect(memberProfileSchema.parse({ duties: [], note: '  ' }).note).toBeNull();
  });

  it('候補外・重複・101 字・改行は拒否する', () => {
    expect(memberProfileSchema.safeParse({ duties: ['dancer'], note: null }).success).toBe(false);
    expect(memberProfileSchema.safeParse({ duties: ['cast', 'cast'], note: null }).success).toBe(
      false
    );
    expect(memberProfileSchema.safeParse({ duties: [], note: 'あ'.repeat(101) }).success).toBe(
      false
    );
    expect(memberProfileSchema.safeParse({ duties: [], note: 'a\nb' }).success).toBe(false);
  });

  it('100 字ちょうどは許可する', () => {
    expect(memberProfileSchema.safeParse({ duties: [], note: 'あ'.repeat(100) }).success).toBe(
      true
    );
  });
});
