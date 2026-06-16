import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

export const DEMO_EMAIL = 'demo@phoenixvision.local';
export const DEMO_PASSWORD = '123456';
export const DEMO_USER_ID = 'demo-user';
export const DEMO_SESSION_KEY = 'phoenixvision:demo-session';

export type RegisterInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export type MockUser = {
  uid: string;
  email: string;
  displayName: string;
};

type AuthContextValue = {
  user: MockUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        localStorage.removeItem(DEMO_SESSION_KEY);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
        });
      } else {
        const demoSession = localStorage.getItem(DEMO_SESSION_KEY);
        setUser(demoSession === 'active' ? {
          uid: DEMO_USER_ID,
          email: DEMO_EMAIL,
          displayName: 'Tài khoản demo',
        } : null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
          localStorage.setItem(DEMO_SESSION_KEY, 'active');
          setUser({
            uid: DEMO_USER_ID,
            email: DEMO_EMAIL,
            displayName: 'Tài khoản demo',
          });
          return;
        }

        await signInWithEmailAndPassword(auth, email, password);
      },
      register: async (input) => {
        const userCredential = await createUserWithEmailAndPassword(auth, input.email, input.password);
        await updateProfile(userCredential.user, {
          displayName: input.fullName,
        });
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: input.email.trim().toLowerCase(),
          fullName: input.fullName,
          phone: input.phone,
          role: 'user',
          emailVerified: true,
          verifiedBy: 'otp',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        // Force local state update with displayName
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: input.fullName,
        });
      },
      logout: async () => {
        localStorage.removeItem(DEMO_SESSION_KEY);
        await signOut(auth);
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
