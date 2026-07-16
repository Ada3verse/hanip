import { getFirebaseConfig } from "./config";
import type { FirebaseClientDescriptor, FirebasePublicConfig } from "./types";
import type { FirebaseClientServices } from "./types";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

let services: FirebaseClientServices | null = null;

export function initializeFirebaseClient(config: FirebasePublicConfig | null = getFirebaseConfig()): FirebaseClientServices {
  if (!config) throw new Error("Firebase 환경설정이 완전하지 않습니다.");
  if (services) return services;
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  services = { app, auth: getAuth(app), firestore: getFirestore(app), config };
  return services;
}

export function createFirebaseClientDescriptor(config: FirebasePublicConfig | null = getFirebaseConfig()): FirebaseClientDescriptor {
  return { status: config ? "configured" : "unconfigured", config, networkEnabled: false, sdkInitialized: false };
}

// Firebase SDK 설치 전 경계입니다. 실제 app/auth/firestore 객체를 만들지 않습니다.
export function assertFirebaseNetworkDisabled(descriptor: FirebaseClientDescriptor) {
  return descriptor.networkEnabled === false && descriptor.sdkInitialized === false;
}

export function resetFirebaseClientForTests() { services = null; }
