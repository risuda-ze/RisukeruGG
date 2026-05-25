import { create } from 'zustand';
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { subscribeTeam, subscribeMembers } from '@/lib/repositories/teams';
import type { Team, TeamMember } from '@/types/entities';

interface AuthState {
  currentUser: FirebaseUser | null;
  currentTeamId: string | null;
  /** 所属している全チームの ID リスト */
  teamIds: string[];
  currentTeam: Team | null;
  members: TeamMember[];
  loading: boolean;
  idToken: string | null;
  googleAccessToken: string | null;

  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  _setUser: (user: FirebaseUser | null) => void;
  _setTeam: (team: Team | null) => void;
  _setMembers: (members: TeamMember[]) => void;
  _setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  currentTeamId: null,
  teamIds: [],
  currentTeam: null,
  members: [],
  loading: true,
  idToken: null,
  googleAccessToken: null,

  signIn: async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      const accessToken = credential.accessToken;
      const expiresAt = Date.now() + 3500 * 1000;
      try {
        sessionStorage.setItem('gcal_token', JSON.stringify({ token: accessToken, expiresAt }));
      } catch {}
      set({ googleAccessToken: accessToken });

      // Googleカレンダー接続直後に同期を実行
      // （onSnapshot は onAuthStateChanged より先に token が設定されないことがあるため、ここでも同期する）
      const { currentTeamId } = useAuthStore.getState();
      const user = useAuthStore.getState().currentUser;
      if (currentTeamId && user) {
        const displayName = user.displayName ?? 'メンバー';
        (async () => {
          try {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            twoWeeksLater.setHours(23, 59, 59, 999);
            const [{ fetchGCalEvents }, { saveMemberCalendarEvents }] = await Promise.all([
              import('@/lib/googleCalendar'),
              import('@/lib/repositories/memberCalendars'),
            ]);
            const { events } = await fetchGCalEvents(accessToken, now, twoWeeksLater);
            const toSave = events.map((e) => ({
              sourceEventId: e.id.replace(/^gcal_/, ''),
              startAt: e.startAt,
              endAt: e.endAt,
              allDay: e.allDay ?? false,
            }));
            await saveMemberCalendarEvents(currentTeamId, user.uid, displayName, toSave);
          } catch {
            // GCal同期エラーはサイレントに無視
          }
        })();
      }
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    try { sessionStorage.removeItem('gcal_token'); } catch {}
    set({ currentUser: null, currentTeamId: null, teamIds: [], currentTeam: null, members: [], idToken: null, googleAccessToken: null });
  },

  _setUser: (user) => set({ currentUser: user }),
  _setTeam: (team) => set({ currentTeam: team }),
  _setMembers: (members) => set({ members }),
  _setLoading: (loading) => set({ loading }),
}));

// 各種購読のアンサブスクライバーを保持
let unsubUser: (() => void) | null = null;
let unsubTeam: (() => void) | null = null;
let unsubMembers: (() => void) | null = null;

/** アプリ起動時に一度だけ呼ぶ認証リスナーの初期化 */
export function initAuthListener() {
  // IDトークンの自動リフレッシュ（セッション維持）
  onIdTokenChanged(auth, async (user) => {
    if (user) {
      const token = await user.getIdToken();
      useAuthStore.setState({ idToken: token });
    } else {
      useAuthStore.setState({ idToken: null });
    }
  });

  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      useAuthStore.setState({ currentUser: user, loading: false });

      // sessionStorageからGoogleアクセストークンを復元
      try {
        const stored = sessionStorage.getItem('gcal_token');
        if (stored) {
          const { token, expiresAt } = JSON.parse(stored) as { token: string; expiresAt: number };
          if (Date.now() < expiresAt) {
            useAuthStore.setState({ googleAccessToken: token });
          } else {
            sessionStorage.removeItem('gcal_token');
          }
        }
      } catch {}

      const { doc, onSnapshot } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');

      // 古いユーザードキュメント購読を解除して再設定
      unsubUser?.();

      // users/{uid} をリアルタイム購読 → currentTeamId / teamIds の変化に追従
      unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const newTeamId = data.currentTeamId as string | null;
        const newTeamIds = (data.teamIds as string[] | undefined) ?? (newTeamId ? [newTeamId] : []);
        const prev = useAuthStore.getState().currentTeamId;

        useAuthStore.setState({ currentTeamId: newTeamId, teamIds: newTeamIds });

        if (newTeamId !== prev) {
          unsubTeam?.();
          unsubMembers?.();
          unsubTeam = null;
          unsubMembers = null;

          if (newTeamId) {
            unsubTeam = subscribeTeam(newTeamId, (team) =>
              useAuthStore.setState({ currentTeam: team })
            );
            unsubMembers = subscribeMembers(newTeamId, (members) =>
              useAuthStore.setState({ members })
            );

            // Googleカレンダー同期: チームID確定時にアクセストークンがあれば同期
            const { googleAccessToken } = useAuthStore.getState();
            if (googleAccessToken) {
              const displayName = user.displayName ?? 'メンバー';
              const capturedTeamId = newTeamId;
              (async () => {
                try {
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                  twoWeeksLater.setHours(23, 59, 59, 999);
                  const [{ fetchGCalEvents }, { saveMemberCalendarEvents }] = await Promise.all([
                    import('@/lib/googleCalendar'),
                    import('@/lib/repositories/memberCalendars'),
                  ]);
                  const { events } = await fetchGCalEvents(googleAccessToken, now, twoWeeksLater);
                  const toSave = events.map((e) => ({
                    sourceEventId: e.id.replace(/^gcal_/, ''),
                    startAt: e.startAt,
                    endAt: e.endAt,
                    allDay: e.allDay ?? false,
                  }));
                  await saveMemberCalendarEvents(capturedTeamId, user.uid, displayName, toSave);
                } catch {
                  // Googleカレンダー同期エラーはサイレントに無視
                }
              })();
            }
          } else {
            useAuthStore.setState({ currentTeam: null, members: [] });
          }
        }
      });
    } else {
      unsubUser?.();
      unsubTeam?.();
      unsubMembers?.();
      unsubUser = null;
      unsubTeam = null;
      unsubMembers = null;
      useAuthStore.setState({
        currentUser: null,
        currentTeamId: null,
        teamIds: [],
        currentTeam: null,
        members: [],
        loading: false,
      });
    }
  });
}
