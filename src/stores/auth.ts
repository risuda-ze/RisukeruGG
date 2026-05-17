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
      const expiresAt = Date.now() + 3500 * 1000;
      try {
        sessionStorage.setItem('gcal_token', JSON.stringify({ token: credential.accessToken, expiresAt }));
      } catch {}
      set({ googleAccessToken: credential.accessToken });
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    try { sessionStorage.removeItem('gcal_token'); } catch {}
    set({ currentUser: null, currentTeamId: null, currentTeam: null, members: [], idToken: null, googleAccessToken: null });
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

      // users/{uid} をリアルタイム購読 → currentTeamId の変化に追従
      unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (!snap.exists()) return;
        const newTeamId = snap.data().currentTeamId as string | null;
        const prev = useAuthStore.getState().currentTeamId;

        useAuthStore.setState({ currentTeamId: newTeamId });

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
        currentTeam: null,
        members: [],
        loading: false,
      });
    }
  });
}
