export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId: string;
}

export interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export type FirebaseClientStatus = "configured" | "unconfigured";

export interface FirebaseClientDescriptor {
  status: FirebaseClientStatus;
  config: FirebasePublicConfig | null;
  networkEnabled: false;
  sdkInitialized: false;
}

export interface FirebaseClientServices {
  app: import("firebase/app").FirebaseApp;
  auth: import("firebase/auth").Auth;
  firestore: import("firebase/firestore").Firestore;
  config: FirebasePublicConfig;
}
