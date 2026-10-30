import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type Auth,
  type User as FirebaseSdkUser
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  type Firestore
} from "firebase/firestore";

export const SUPER_ADMIN_EMAIL = "fabien.frikupgeneration@gmail.com";
export const DEFAULT_SUPER_ADMIN_PIN = "0000";

const firebaseConfig = {
  apiKey: "AIzaSyBcbHyFN15fHKtQLtW5bXeKNUJYBFU38EI",
  authDomain: "faab-projet.firebaseapp.com",
  projectId: "faab-projet",
  storageBucket: "faab-projet.firebasestorage.app",
  messagingSenderId: "739874836052",
  appId: "1:739874836052:web:acccab79a9f632a00ba7c1"
};

// Synchronise la configuration par défaut au cas où un CDN ESM (ex: esm.sh) isole les sous-modules @firebase/app
if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).__FIREBASE_DEFAULTS__ = {
    config: firebaseConfig
  };
}

// Vérifie les instances existantes avec getApps() avant d'initialiser l'application Firebase
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function initFirebaseAuth(firebaseApp: FirebaseApp): Auth {
  try {
    return getAuth(firebaseApp);
  } catch {
    return getAuth();
  }
}

function initFirebaseFirestore(firebaseApp: FirebaseApp): Firestore {
  try {
    return getFirestore(firebaseApp);
  } catch {
    return getFirestore();
  }
}

// Passe explicitement l'instance de l'application (app) à getAuth et getFirestore
export const auth: Auth = initFirebaseAuth(app);
export const db: Firestore = initFirebaseFirestore(auth.app || app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providers?: string[];
  creationTime?: string | null;
  lastSignInTime?: string | null;
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export function mapFirebaseSdkUser(user: FirebaseSdkUser): FirebaseUser {
  const providers = Array.from(
    new Set(
      (user.providerData || [])
        .map(p => p?.providerId)
        .filter((id): id is string => Boolean(id))
    )
  );
  if (providers.length === 0) {
    providers.push("google.com");
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    providers,
    creationTime: user.metadata?.creationTime || new Date().toISOString(),
    lastSignInTime: user.metadata?.lastSignInTime || new Date().toISOString()
  };
}

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy
};
