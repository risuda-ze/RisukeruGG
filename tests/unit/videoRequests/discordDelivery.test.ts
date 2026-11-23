// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import {
  deliveryModal,
  handleDelivery,
} from '@/app/api/discord/interactions/handlers/handleVideoDelivery';

const { firestore } = vi.hoisted(() => ({ firestore: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminFirestore: firestore }));
const snowflake = '123456789012345678';
const input = {
  kind: 'submit' as const,
  teamId: 'team',
  requestId: 'request',
  guild: 'guild',
  channel: 'video-thread',
  user: snowflake,
  interaction: 'receipt',
  app: 'app',
  token: 'token',
  url: 'https://example.com/delivery',
  note: '字幕修正済み',
};

function setup(overrides: Record<string, unknown> = {}, duplicate = false) {
  const data = {
    status: 'in_progress',
    thumbnailStatus: 'in_progress',
    taskId: 'video-task',
    thumbnailTaskId: 'thumb-task',
    discordTransport: 'integrated',
    reviewTaskColumnId: 'review',
    discord: {
      guildId: 'guild',
      editorThreadIds: ['video-thread'],
      thumbnailThreadId: 'thumb-thread',
    },
    discordRouting: { thumbnailLongIds: ['222222222222222222'] },
    ...overrides,
  };
  const ref = { collection: () => ({ doc: (key: string) => ({ ...ref, key }) }) };
  const update = vi.fn();
  const tx = {
    get: async (doc: { key: string }) => ({
      data: () => data,
      get: () => 'guild',
      exists: doc.key === 'receipt' && duplicate,
    }),
    update,
    set: vi.fn(),
  };
  firestore.mockReturnValue({
    ...ref,
    runTransaction: (fn: (arg: typeof tx) => Promise<unknown>) => fn(tx),
  });
  const network = vi.fn(async (url: string) =>
    url.includes('/messages?')
      ? Response.json([
          {
            id: '333333333333333333',
            author: { id: snowflake },
            attachments: [{ content_type: 'image/png' }],
          },
        ])
      : Response.json({})
  );
  vi.stubGlobal('fetch', network);
  return { update, network };
}
afterEach(() => vi.unstubAllGlobals());

it('動画のボタンは同じチーム・依頼に納品する入力フォームを開く', () => {
  const modal = deliveryModal('vr:video:team:request');
  expect(modal.type).toBe(9);
  expect(modal.data.custom_id).toBe('vr:submit:team:request');
  expect(modal.data.components.map((row) => row.components[0].required)).toEqual([true, false]);
});
it('納品URLと共有事項を保存し動画タスクを確認列へ移す', async () => {
  const { update, network } = setup();
  await handleDelivery(input);
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'video-task' }),
    expect.objectContaining({ columnId: 'review' })
  );
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'request' }),
    expect.objectContaining({ status: 'review_requested' })
  );
  expect(network).toHaveBeenCalledWith(
    expect.stringContaining('messages/@original'),
    expect.objectContaining({ body: expect.stringContaining('字幕修正済み') })
  );
});
it.each([{ guild: 'another' }, { channel: 'wrong-thread' }, { url: 'file:///invalid' }])(
  '不正な納品元やURLではタスクを更新しない',
  async (override) => {
    const { update } = setup();
    await handleDelivery({ ...input, ...override });
    expect(update).not.toHaveBeenCalled();
  }
);
it('同じDiscord操作を再配信しても納品記録と通知は増えない', async () => {
  const { update, network } = setup({}, true);
  await handleDelivery(input);
  expect(update).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
});
it('サムネ再納品は投稿者の新画像を記録し設定担当者にお礼を返す', async () => {
  const { update, network } = setup({ thumbnailMessageId: '222222222222222222' });
  await handleDelivery({
    ...input,
    kind: 'thumb',
    channel: 'thumb-thread',
    buttonId: '111111111111111111',
  });
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'request' }),
    expect.objectContaining({
      thumbnailMessageId: '333333333333333333',
      thumbnailStatus: 'review_requested',
    })
  );
  expect(network).toHaveBeenLastCalledWith(
    expect.stringContaining('@original'),
    expect.objectContaining({ body: expect.stringContaining('<@222222222222222222>') })
  );
  expect(network).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({ body: expect.stringContaining('修正ありがとう！') })
  );
});
