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
import { parseGoogleCalendarExports } from '@/lib/repositories/googleCalendarExports';
import type { GoogleCalendarExport, Team, TeamMember } from '@/types/entities';

interface AuthState {
  currentUser: FirebaseUser | null;
  currentTeamId: string | null;
  /** 所属している全チームの ID リスト */
  teamIds: string[];
  currentTeam: Team | null;
  members: TeamMember[];
  loading: boolean;
  idToken: string | null;
  /** Google カレンダー書き出しの状態。キーは teamId */
  googleCalendarExports: Record<string, GoogleCalendarExport>;

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
  googleCalendarExports: {},

  signIn: async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    set({ currentUser: null, currentTeamId: null, teamIds: [], currentTeam: null, members: [], idToken: null, googleCalendarExports: {} });
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

        useAuthStore.setState({
          currentTeamId: newTeamId,
          teamIds: newTeamIds,
          googleCalendarExports: parseGoogleCalendarExports(data.googleCalendarExports),
        });

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
        googleCalendarExports: {},
        loading: false,
      });
    }
  });
}
