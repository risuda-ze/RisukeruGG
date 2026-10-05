import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { discordBotToken } from '../discord/botToken';
import { sendMessage } from '../discord/rest';
import { resolveMemberMention } from '../discord/resolveMention';
import { buildDigestMessage, buildReminderMessage, selectReminderTargets, type DigestEvent } from './digest';
import { briefUrl, loadDiscordConfig, loadMembers, memberLabelFn, toSummaryBrief, toSummaryStep } from './discordSync';

/** JST の現在時（0〜23） */
function jstHour(d: Date): number {
  return Number(new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: 'numeric', hour12: false }).format(d));
}

/** 'HH:mm' の時（不正・未設定は 9） */
function digestHourOf(time: string | undefined): number {
  const m = /^(\d{1,2}):/.exec(time ?? '');
  const h = m ? Number(m[1]) : 9;
  return Number.isInteger(h) && h >= 0 && h <= 23 ? h : 9;
}

/**
 * 朝ダイジェストと締切前リマインド（IN-027 / IN-028）。
 * 毎時 0 分に起動し、チームの `digestTime` の時と一致するチームだけ処理する（1 日 1 回）。
 */
export const briefDigest = onSchedule(
  { schedule: '0 * * * *', timeZone: 'Asia/Tokyo', region: 'asia-northeast1', secrets: [discordBotToken] },
  async (event) => {
    const now = new Date(event.scheduleTime ?? Date.now());
    const hour = jstHour(now);

    const configsSnap = await db.collectionGroup('discord').where('guildId', '!=', null).get();
    let sent = 0;

    for (const configDoc of configsSnap.docs) {
      const teamRef = configDoc.ref.parent.parent;
      if (!teamRef) continue;
      const teamId = teamRef.id;
      const config = await loadDiscordConfig(teamId);
      if (!config?.guildId || config.digestEnabled === false) continue;
      if (digestHourOf(config.digestTime) !== hour) continue;
      const channelId = config.digestChannelId ?? config.channelId;
      if (!channelId) continue;

      try {
        // 進行中のブリーフと工程
        const briefsSnap = await db
          .collection(`teams/${teamId}/briefs`)
          .where('status', 'in', ['planning', 'in_progress'])
          .get();
        if (briefsSnap.empty) continue;
        const briefs = briefsSnap.docs.map((d) => toSummaryBrief(d.id, d.data() as Record<string, unknown>));
        const briefLinks = new Map(
          briefsSnap.docs.map((d) => [d.id, (d.data().discord as { threadId?: string } | null)?.threadId ?? null])
        );

        const stepsSnap = await db.collectionGroup('steps').where('teamId', '==', teamId).get();
        const briefIds = new Set(briefs.map((b) => b.id));
        const steps = stepsSnap.docs
          .map((d) => toSummaryStep(d.id, d.data() as Record<string, unknown>))
          .filter((s) => briefIds.has(s.briefId));

        // 直近 24 時間の差分
        const since = Timestamp.fromMillis(now.getTime() - 24 * 60 * 60 * 1000);
        const events: DigestEvent[] = [];
        for (const b of briefs) {
          const evSnap = await db
            .collection(`teams/${teamId}/briefs/${b.id}/briefEvents`)
            .where('createdAt', '>=', since)
            .get();
          for (const e of evSnap.docs) {
            const d = e.data();
            events.push({
              type: d.type as string,
              briefId: b.id,
              stepKey: (d.stepKey as string | null) ?? null,
              before: d.before instanceof Timestamp ? d.before.toDate() : d.before,
              after: d.after instanceof Timestamp ? d.after.toDate() : d.after,
              createdAt: (d.createdAt as Timestamp).toDate(),
            });
          }
        }

        const members = await loadMembers(teamId);
        const message = buildDigestMessage({
          briefs,
          steps,
          events,
          memberLabel: memberLabelFn(members),
          briefUrl,
          now,
        });
        if (message) {
          await sendMessage(channelId, { content: message, allowed_mentions: { parse: ['users'] } });
          sent += 1;
        }

        // 締切前リマインド: ブリーフのスレッドがあればそこへ、なければダイジェスト先へ
        for (const step of selectReminderTargets(steps, now)) {
          let mention = '担当未定';
          if (step.assigneeId) {
            const m = members.get(step.assigneeId);
            if (m) mention = await resolveMemberMention(teamId, config.guildId, m);
          }
          const target = briefLinks.get(step.briefId) ?? channelId;
          await sendMessage(target, {
            content: buildReminderMessage(step, mention, briefUrl(step.briefId), step.reminderDaysBefore),
            allowed_mentions: { parse: ['users'] },
          });
        }
      } catch (err) {
        logger.warn('ダイジェスト送信に失敗しました', { teamId, err });
      }
    }

    logger.info('briefDigest 完了', { hour, sent });
  }
);
