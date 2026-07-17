import "server-only";
import { getFirebaseAdminConfig, initializeFirebaseAdmin } from "@/lib/firebase/admin";
import { FirestoreAdminSecurityStore, MemoryAdminSecurityStore } from "./adminStore";
const memory=new MemoryAdminSecurityStore();let production:FirestoreAdminSecurityStore|null=null;
export function getAdminSecurityStore(){if(process.env.NODE_ENV!=="production")return memory;if(production)return production;const config=getFirebaseAdminConfig();if(!config)throw new Error("firebase_admin_not_configured");production=new FirestoreAdminSecurityStore(initializeFirebaseAdmin(config).firestore);return production;}
export function getAdminFirestore(){if(process.env.NODE_ENV!=="production")return null;const config=getFirebaseAdminConfig();if(!config)throw new Error("firebase_admin_not_configured");return initializeFirebaseAdmin(config).firestore;}
