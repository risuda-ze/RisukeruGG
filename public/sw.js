/*
 * リセット用 Service Worker
 * ---------------------------------------------------------------------------
 * 旧バージョンでは next-pwa がこの /sw.js にプリキャッシュSWを生成していた。
 * next-pwa 撤去に伴い、旧SWを持つ既存クライアントを確実にクリーンな状態へ
 * 戻すため、/sw.js を「自己破棄する空SW」に置き換える。
 *
 * ブラウザはナビゲーション時や約24時間ごとに登録済み /sw.js を再取得するため、
 * 旧 next-pwa SW はこの内容に更新され、以下を実行する:
 *   1. 全 Cache Storage を削除（古いプリキャッシュ＝古いバンドルを一掃）
 *   2. 自身を unregister（プリキャッシュSWを恒久的に無効化）
 *   3. 制御下の全ウィンドウを一度リロードし、ネットワーク最新へ復帰
 *
 * 全クライアントの掃除が完了した後、この /sw.js は削除して差し支えない。
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. 全キャッシュ削除
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // 2. 自身を登録解除
      await self.registration.unregister();

      // 3. 制御下のウィンドウをリロードしてクリーンな状態に復帰
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if ('navigate' in client) {
          client.navigate(client.url).catch(() => {});
        }
      }
    })()
  );
});
