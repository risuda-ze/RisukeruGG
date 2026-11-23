// @vitest-environment node
import { generateKeyPairSync, sign } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }));
vi.mock('@/app/api/discord/interactions/handlers/handleRisukerugg', () => ({
  handleAiConversation: vi.fn(),
}));
vi.mock('@/app/api/discord/interactions/handlers/handleStepButton', () => ({
  handleStepButton: vi.fn(),
}));
vi.mock('@/app/api/discord/interactions/handlers/handleButtonClick', () => ({
  handleButtonClick: vi.fn(),
}));
vi.mock('@/app/api/discord/interactions/handlers/handlePresetAutocomplete', () => ({
  buildPresetChoices: vi.fn(),
}));

import { POST } from '@/app/api/discord/interactions/route';

afterEach(() => vi.unstubAllEnvs());

it('既存Botと同じ署名付きの受付で動画納品ボタンにフォームを返す', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicBytes = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  vi.stubEnv('DISCORD_PUBLIC_KEY', publicBytes.toString('hex'));
  vi.stubEnv('DISCORD_APPLICATION_ID', '123456789012345678');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({
    type: 3,
    guild_id: '123456789012345678',
    channel_id: '223456789012345678',
    id: '323456789012345678',
    token: 'local-test',
    member: { user: { id: '423456789012345678' } },
    data: { custom_id: 'vr:video:teamAlpha:request01' },
  });
  const headers = {
    'x-signature-timestamp': timestamp,
    'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), privateKey).toString('hex'),
  };
  const response = await POST(
    new NextRequest('http://localhost/api/discord/interactions', { method: 'POST', headers, body })
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    type: 9,
    data: { custom_id: 'vr:submit:teamAlpha:request01' },
  });
});
