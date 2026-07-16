import type { FirebaseClientDescriptor } from "@/lib/firebase/types";

export interface FirebaseRepositoryOptions {
  client: FirebaseClientDescriptor;
  seed?: Map<string, unknown>;
}

export interface FirebaseRepositoryMigrationResult {
  migrated: boolean;
  reason: "stub_no_remote_migration";
}

