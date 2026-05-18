import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';

interface SwitchActiveTeamData {
  teamId: string;
}

/** アクティブチームを切り替える */
export const switchActiveTeam = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<SwitchActiveTeamData>) => {
    const uid = requireAuth(request);
    const { teamId } = request.data;

    if (!teamId) {
      throw new HttpsError('invalid-argument', 'チームIDを指定してください');
    }

    const userData = await getUserDoc(uid);
    const currentTeamIds = (userData.teamIds as string[] | undefined) ?? (userData.currentTeamId ? [userData.currentTeamId as string] : []);

    if (!currentTeamIds.includes(teamId)) {
      throw new HttpsError('permission-denied', 'このチームに所属していません');
    }

    if (userData.currentTeamId === teamId) {
      return { success: true, teamId };
    }

    /* teamIds の後方互換: 切り替え先が teamIds にない場合は追加する */
    const needsUpdate = !currentTeamIds.includes(teamId);
    const updatePayload: Record<string, unknown> = { currentTeamId: teamId };
    if (needsUpdate) {
      const { FieldValue } = await import('firebase-admin/firestore');
      updatePayload.teamIds = FieldValue.arrayUnion(teamId);
    }

    await db.doc(`users/${uid}`).update(updatePayload);

    return { success: true, teamId };
  }
);
