import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { updatedFields } from '../lib/audit';
import { getAuth } from 'firebase-admin/auth';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';
import { toTeamRole } from '../lib/role';
import { deleteUserUnavailability } from '../unavailability/cleanup';

interface DeleteAccountData {
  memberAssignments?: { teamId: string; newMemberId: string }[];
}

/**
 * アカウントと関連データを削除する。
 * - 自分が唯一のメンバー（全権限のロール）で他の所属者がいるチームがある場合、memberAssignments で新しいメンバーの指定が必要
 * - ソロチームのメンバー: チームごと削除
 * - 複数メンバーの1人: チームから脱退
 * - スタッフ: チームから脱退してアカウント削除
 */
export const deleteAccount = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<DeleteAccountData>) => {
    const uid = requireAuth(request);
    const assignments = request.data?.memberAssignments ?? [];
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
      isLastMember: boolean;
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
      const isMember = toTeamRole(role) === 'member';
      const isSolo = isMember && memberCount <= 1;
      // 自分以外にメンバーがいなければ最後のメンバー
      const isLastMember =
        isMember &&
        !membersSnap.docs.some((d) => d.id !== uid && toTeamRole(d.data().role) === 'member');

      teamDataList.push({
        teamId,
        role,
        memberCount,
        teamCode,
        isSolo,
        isLastMember,
      });
    }

    // 最後のメンバーかつ他の所属者がいるチームは新しいメンバーの指名が必要
    const teamsNeedingMember = teamDataList.filter(
      (t) => t.isLastMember && !t.isSolo && !assignments.some((a) => a.teamId === t.teamId)
    );
    if (teamsNeedingMember.length > 0) {
      throw new HttpsError(
        'failed-precondition',
        `次のチームで新しいメンバーを指名してください: ${teamsNeedingMember.map((t) => t.teamId).join(', ')}`
      );
    }

    // 指定された新メンバー候補のバリデーション
    for (const assignment of assignments) {
      const newMemberSnap = await db
        .doc(`teams/${assignment.teamId}/members/${assignment.newMemberId}`)
        .get();
      if (!newMemberSnap.exists) {
        throw new HttpsError(
          'invalid-argument',
          '指定された所属者がチームに所属していません'
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
        const { teamId, isSolo, teamCode, isLastMember } = teamData;

        if (isSolo) {
          // ソロチーム: チームごと削除
          tx.delete(db.doc(`teams/${teamId}/members/${uid}`));
          tx.delete(db.doc(`teams/${teamId}`));
          if (teamCode) tx.delete(db.doc(`teamCodes/${teamCode}`));
        } else {
          const assignment = assignments.find((a) => a.teamId === teamId);

          if (isLastMember && assignment) {
            // 最後のメンバー: 指名された所属者をメンバーに昇格
            tx.update(db.doc(`teams/${teamId}/members/${assignment.newMemberId}`), {
              role: 'member',
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

          const taskIdx = nonSoloTeamIds.indexOf(teamId);
          for (const taskDoc of taskSnaps[taskIdx].docs) {
            tx.update(taskDoc.ref, { assigneeId: null, ...updatedFields(uid) });
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

    await Promise.all(teamDataList.map((t) => deleteUserUnavailability(t.teamId, uid)));

    await getAuth().deleteUser(uid);
    return { success: true };
  }
);
