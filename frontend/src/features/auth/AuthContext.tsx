import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../lib/firebase';

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
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
        });
      } else {
        setUser(null);
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
        await signInWithEmailAndPassword(auth, email, password);
      },
      register: async (input) => {
        const userCredential = await createUserWithEmailAndPassword(auth, input.email, input.password);
        await updateProfile(userCredential.user, {
          displayName: input.fullName,
        });
        // Force local state update with displayName
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: input.fullName,
        });
      },
      logout: async () => {
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
