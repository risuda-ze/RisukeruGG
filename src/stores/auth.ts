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
  currentTeam: Team | null;
  members: TeamMember[];
  loading: boolean;
  idToken: string | null;

  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  _setUser: (user: FirebaseUser | null) => void;
  _setTeam: (team: Team | null) => void;
  _setMembers: (members: TeamMember[]) => void;
  _setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  currentTeamId: null,
  currentTeam: null,
  members: [],
  loading: true,
  idToken: null,

  signIn: async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar');
    await signInWithPopup(auth, provider);
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    set({ currentUser: null, currentTeamId: null, currentTeam: null, members: [], idToken: null });
  },

  _setUser: (user) => set({ currentUser: user }),
  _setTeam: (team) => set({ currentTeam: team }),
  _setMembers: (members) => set({ members }),
  _setLoading: (loading) => set({ loading }),
}));

// チーム購読のアンサブスクライバーを保持
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
    const store = useAuthStore.getState();

    if (user) {
      useAuthStore.setState({ currentUser: user, loading: false });

      // Firestoreからユーザーデータを取得してcurrentTeamIdを設定
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');
      const userSnap = await getDoc(doc(db, 'users', user.uid));

      if (userSnap.exists()) {
        const teamId = userSnap.data().currentTeamId as string | null;
        useAuthStore.setState({ currentTeamId: teamId });

        if (teamId) {
          // 古いサブスクリプションを解除
          unsubTeam?.();
          unsubMembers?.();

          // チームとメンバーをリアルタイム購読
          unsubTeam = subscribeTeam(teamId, (team) => store._setTeam(team));
          unsubMembers = subscribeMembers(teamId, (members) => store._setMembers(members));
        }
      }
    } else {
      unsubTeam?.();
      unsubMembers?.();
      unsubTeam = null;
      unsubMembers = null;
      useAuthStore.setState({
        currentUser: null,
        currentTeamId: null,
        currentTeam: null,
        members: [],
        loading: false,
      });
    }
  });
}
