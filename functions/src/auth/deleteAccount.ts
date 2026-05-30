import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';

interface DeleteAccountData {
  operatorAssignments?: { teamId: string; newOperatorId: string }[];
}

/**
 * アカウントと関連データを削除する。
 * - 自分が唯一のオペレーターで他メンバーがいるチームがある場合、operatorAssignments で新オペレーターの指定が必要
 * - ソロチームのオペレーター: チームごと削除
 * - 複数オペレーターの1人: operatorUids から自分を除去して脱退
 * - member/rom: チームから脱退してアカウント削除
 */
export const deleteAccount = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<DeleteAccountData>) => {
    const uid = requireAuth(request);
    const assignments = request.data?.operatorAssignments ?? [];
    const userData = await getUserDoc(uid);

    const rawTeamIds = (userData.teamIds as string[] | undefined) ?? [];
    const currentTeamId = userData.currentTeamId as string | null;
    const teamIds = Array.from(new Set([...rawTeamIds, ...(currentTeamId ? [currentTeamId] : [])]));

    type TeamData = {
      teamId: string;
      role: string;
      memberCount: number;
      teamCode?: string;
      isSolo: boolean;
      isLastOperator: boolean;
      operatorUids: string[];
    };

    // 各チームの状態を取得
    const teamDataList: TeamData[] = [];
    for (const teamId of teamIds) {
      const [memberSnap, membersSnap, teamSnap] = await Promise.all([
        db.doc(`teams/${teamId}/members/${uid}`).get(),
        db.collection(`teams/${teamId}/members`).get(),
        db.doc(`teams/${teamId}`).get(),
      ]);
      if (!memberSnap.exists) continue;

      const role = memberSnap.data()!.role as string;
      const memberCount = membersSnap.size;
      const teamCode = teamSnap.data()?.teamCode as string | undefined;
      const operatorUids = Array.isArray(teamSnap.data()?.operatorUids)
        ? (teamSnap.data()!.operatorUids as string[])
        : teamSnap.data()?.ownerId
          ? [teamSnap.data()!.ownerId as string]
          : [];
      const isSolo = role === 'operator' && memberCount <= 1;
      const isLastOperator =
        (role === 'operator' || role === 'owner') &&
        operatorUids.length === 1 &&
        operatorUids[0] === uid;

      teamDataList.push({
        teamId,
        role,
        memberCount,
        teamCode,
        isSolo,
        isLastOperator,
        operatorUids,
      });
    }

    // 最後のオペレーターかつ他メンバーがいるチームは新オペレーター指名が必要
    const teamsNeedingOperator = teamDataList.filter(
      (t) => t.isLastOperator && !t.isSolo && !assignments.some((a) => a.teamId === t.teamId)
    );
    if (teamsNeedingOperator.length > 0) {
      throw new HttpsError(
        'failed-precondition',
        `次のチームで新しいオペレーターを指名してください: ${teamsNeedingOperator.map((t) => t.teamId).join(', ')}`
      );
    }

    // 指定されたオペレーター候補のバリデーション
    for (const assignment of assignments) {
      const newOpSnap = await db
        .doc(`teams/${assignment.teamId}/members/${assignment.newOperatorId}`)
        .get();
      if (!newOpSnap.exists) {
        throw new HttpsError(
          'invalid-argument',
          '指定されたオペレーターがチームメンバーではありません'
        );
      }
    }

    // 複数メンバーチームのタスク再アサインに必要なクエリをトランザクション外で準備
    const nonSoloTeamIds = teamDataList.filter((t) => !t.isSolo).map((t) => t.teamId);

    await db.runTransaction(async (tx) => {
      // 読み取りフェーズ: 各チームの担当タスクを取得
      const taskSnaps = await Promise.all(
        nonSoloTeamIds.map((teamId) =>
          tx.get(db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', uid))
        )
      );

      // 書き込みフェーズ
      for (const teamData of teamDataList) {
        const { teamId, isSolo, teamCode, isLastOperator, operatorUids } = teamData;

        if (isSolo) {
          // ソロチーム: チームごと削除
          tx.delete(db.doc(`teams/${teamId}/members/${uid}`));
          tx.delete(db.doc(`teams/${teamId}`));
          if (teamCode) tx.delete(db.doc(`teamCodes/${teamCode}`));
        } else {
          const assignment = assignments.find((a) => a.teamId === teamId);

          if (isLastOperator && assignment) {
            // 最後のオペレーター: 新オペレーターを昇格し operatorUids を更新
            tx.update(db.doc(`teams/${teamId}/members/${assignment.newOperatorId}`), {
              role: 'operator',
              updatedAt: FieldValue.serverTimestamp(),
            });
            const newOperatorUids = [
              ...operatorUids.filter((id) => id !== uid),
              ...(operatorUids.includes(assignment.newOperatorId)
                ? []
                : [assignment.newOperatorId]),
            ];
            tx.update(db.doc(`teams/${teamId}`), { operatorUids: newOperatorUids });
          } else if (teamData.role === 'operator' || teamData.role === 'owner') {
            // 複数オペレーターの1人: operatorUids から自分を除去するだけ
            tx.update(db.doc(`teams/${teamId}`), {
              operatorUids: operatorUids.filter((id) => id !== uid),
            });
          }

          const taskIdx = nonSoloTeamIds.indexOf(teamId);
          for (const taskDoc of taskSnaps[taskIdx].docs) {
            tx.update(taskDoc.ref, {
              assigneeId: null,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

          tx.delete(db.doc(`teams/${teamId}/members/${uid}`));
        }
      }

      tx.set(db.doc(`users/${uid}`), {
        uid,
        displayName: userData.displayName as string,
        avatarUrl: (userData.avatarUrl as string | null) ?? null,
        deleted: true,
        deletedAt: FieldValue.serverTimestamp(),
      });
    });

    await getAuth().deleteUser(uid);
    return { success: true };
  }
);
