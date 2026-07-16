import type { LearningRepository } from "./learningRepository";
import { LocalLearningRepository } from "./localLearningRepository";
import type { RepositoryProvider } from "./types";
import { getConfiguredFirebaseProvider, getFirebaseConfig } from "@/lib/firebase/config";
import type { FirebasePublicConfig } from "@/lib/firebase/types";
import { createFirebaseRepository, createFirebaseRepositoryStub } from "./firebase/firebaseProvider";

export interface RepositoryFactoryOptions {
  provider?: RepositoryProvider;
  storage?: Storage;
  firebaseConfig?: FirebasePublicConfig | null;
  firebaseImplementation?: "production" | "stub";
}

let localRepository: LocalLearningRepository | null = null;

export function createLearningRepository(options: RepositoryFactoryOptions): LearningRepository {
  const provider = options.provider ?? getConfiguredFirebaseProvider();
  if (provider === "firebase") {
    const config = options.firebaseConfig === undefined ? getFirebaseConfig() : options.firebaseConfig;
    if (config) {
      if (options.firebaseImplementation === "stub") return createFirebaseRepositoryStub(config);
      const fallback = options.storage ? new LocalLearningRepository(options.storage) : typeof window !== "undefined" ? new LocalLearningRepository(window.localStorage) : undefined;
      try { return createFirebaseRepository(config, fallback); } catch { if (fallback) return fallback; }
    }
  }
  if (options.storage) return new LocalLearningRepository(options.storage);
  if (typeof window === "undefined") throw new Error("Local Repository는 브라우저에서만 사용할 수 있습니다.");
  localRepository ??= new LocalLearningRepository(window.localStorage);
  return localRepository;
}

export function getLocalLearningRepository() {
  return createLearningRepository({ provider: "local" }) as LocalLearningRepository;
}
