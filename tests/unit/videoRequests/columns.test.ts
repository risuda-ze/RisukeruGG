import { describe, it, expect } from 'vitest';
import { videoRequestColumns } from '../../../functions/src/videoRequests/columns';

const config = {
  pendingColumnId: 'inbox',
  progressColumnId: 'editing',
  reviewColumnId: 'screening',
};
describe('動画依頼に使うチーム列', () => {
  it('固有名を持つ3列のIDをそのまま保持する', () => {
    expect(videoRequestColumns(config)).toEqual(config);
  });
  it.each(['inbox', 'editing', '', 'nested/column', undefined])(
    '無効な確認列 %s を拒否する',
    (reviewColumnId) => {
      expect(videoRequestColumns({ ...config, reviewColumnId })).toBeNull();
    }
  );
});
