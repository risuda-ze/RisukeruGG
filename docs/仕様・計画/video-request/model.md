# 動画依頼のデータモデル

| Firestoreの格納先（チーム配下）                           | 責務                                                                                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `settings/videoRequests`                                  | 送信待ち・制作中・確認待ちの列ID（`pendingColumnId`、`progressColumnId`、`reviewColumnId`）とサムネ同時作成フラグ `createThumbnailTask` |
| `videoRequests/{id}`                                      | タイトル、担当Discord ID、編集概要、仮タイトル、資料、納期、各制作物の状態、リンク先タスクID。作成時の3列のIDを保存する                 |
| `tasks/{id}`                                              | 動画タスクは `videoRequestId`、サムネタスクは `thumbnailRequestId` で依頼に対応する                                                     |
| `videoRequests/{id}/discordEvents/{eventId}`              | 編集差分・修正・承認・Discord再送信の送信待ち、送信結果と失敗理由                                                                       |
| `videoRequests/{id}/deliveryInteractions/{interactionId}` | 同じDiscord操作の重複処理を防ぐ受領記録                                                                                                 |

動画の状態は `status`、サムネの状態は `thumbnailStatus`。各々が `pending_discord → in_progress → review_requested → completed` と遷移し、修正は制作中に戻す。サムネがない依頼ではサムネ状態は空。動画は異なる納品URLを蓄積し、サムネは最新の納品投稿を参照する。

スレッド作成の状態は `discord.status`（bot_queued / creating / created / failed）、追加通知は bot_queued / sending / sent / failed。`discord.expectedThreadCount`、作成済みスレッドURL、チャンネルごとの初回投稿済み状態を保存し、失敗時の再送信で既存スレッドを再利用する。通知結果と制作物の承認結果を独立して保存する。旧データに制作中列IDがない場合はチーム設定を参照する。

依頼は `discordTransport=integrated`。チーム設定の `routing` には編集の既定チャンネル、担当者別の送信先、サムネチャンネル、形式別のサムネ担当IDを保存する。依頼作成時に送信先と連携サーバーを `discordRouting` に記録する。
