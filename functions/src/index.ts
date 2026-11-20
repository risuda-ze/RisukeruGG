// Cloud Functions エントリポイント

// Phase 3: US1 — 認証・チーム管理
export * from './teams/createTeam';
export * from './teams/joinTeam';
export * from './teams/leaveTeam';
export * from './teams/leaveSpecificTeam';
export * from './teams/switchActiveTeam';
export * from './teams/resetTeamCode';
export * from './teams/removeTeamMember';
export * from './teams/updateMemberRole';
export * from './teams/dissolveTeam';
export * from './teams/updateDiscordSettings';
export * from './auth/onUserCreate';
export * from './auth/deleteAccount';
export * from './plan/resetMonthlyPlanCounts';

// 対応不可時間: 前々月以前の月次削除
export * from './unavailability/purgeOldUnavailability';

// Phase 4: US2 — カレンダー同期

// Phase 5: US3 — タスク管理
export * from './tasks/createTask';
export * from './tasks/deleteCompletedTasks';

// スケジュール管理
export * from './schedules/createSchedule';

// Phase 6: US4 — コラボ日程調整
export * from './collab/createCollabSession';
export * from './collab/createCollabSessionDraft';
export * from './collab/respondToCollab';
export * from './collab/confirmCollabDate';
export * from './collab/cancelCollabSession';
export * from './collab/reopenCollabSession';
export * from './collab/expireCollabSessions';

// Phase 8: US6 — Discord 通知
export * from './notifications/scheduleReminders';
export * from './notifications/taskDiscordNotifications';

// タスク管理 v2（ブリーフ）× Discord: スレッド同期・朝ダイジェスト
export * from './briefs/discordTriggers';
export * from './briefs/briefDigest';
export * from './videoRequests/videoRequests';

// お問い合わせフォーム
export * from './contact/sendContactEmail';

// クローズドベータ利用申請（T11）
export * from './beta/requestBetaAccess';

// T4: Stripe 課金
export * from './stripe/createCheckoutSession';
export * from './stripe/createPortalSession';
export * from './stripe/stripeWebhook';

