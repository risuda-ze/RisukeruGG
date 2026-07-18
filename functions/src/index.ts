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

// Phase 4: US2 — カレンダー同期
export * from './calendar/syncGoogleCalendar';

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

// Phase 8: US6 — 通知
export * from './notifications/markNotificationRead';
export * from './notifications/scheduleReminders';
export * from './notifications/taskDiscordNotifications';

// お問い合わせフォーム
export * from './contact/sendContactEmail';

// クローズドベータ利用申請（T11）
export * from './beta/requestBetaAccess';

