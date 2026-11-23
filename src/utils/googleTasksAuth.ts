import { getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
] as const;

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Strictly stored in memory only — never persist OAuth access tokens to localStorage or sessionStorage.
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearCachedAccessToken(): void {
  cachedAccessToken = null;
}

export function subscribeGoogleAuthState(
  callback: (user: User | null, token: string | null) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedAccessToken = null;
      callback(null, null);
      return;
    }
    if (isSigningIn) {
      return;
    }
    callback(user, cachedAccessToken);
  });
}

function buildGoogleTasksProvider(forceConsent: boolean): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  for (const scope of SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({
    prompt: forceConsent ? 'consent select_account' : 'select_account consent',
    include_granted_scopes: 'true',
  });
  return provider;
}

export async function googleSignIn(options?: {
  forceConsent?: boolean;
}): Promise<{ user: User; accessToken: string }> {
  const provider = buildGoogleTasksProvider(Boolean(options?.forceConsent));
  isSigningIn = true;

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;

    if (!token) {
      throw new Error('NO_ACCESS_TOKEN');
    }

    cachedAccessToken = token;
    return { user: result.user, accessToken: token };
  } finally {
    isSigningIn = false;
  }
}

export async function googleSignOut(): Promise<void> {
  cachedAccessToken = null;
  await signOut(auth);
}
