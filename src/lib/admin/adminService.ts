import "server-only";
import { randomUUID } from "node:crypto";
import { adminTargetHash, isAcceptableAdministratorPassword, issueAdminSession, verifyAdministratorPassword } from "./adminAuth";
import type { AdminSecurityStore } from "./types";
import { assertProductionSecrets } from "@/lib/security/environment";

const MAX_FAILURES=5;let failedAttempts=0;let administratorLocked=false;
export function resetAdministratorLoginGuard(){failedAttempts=0;administratorLocked=false;}
export function getAdministratorLoginGuardState(){return{failedAttempts,locked:administratorLocked};}
export async function loginAdministrator(input:{adminId:string;password:string;ipHash:string;store:AdminSecurityStore}){
  assertProductionSecrets();const configuredId=process.env.HANIP_ADMIN_ID??"";
  if(administratorLocked){await input.store.audit({adminId:input.adminId||"unknown",action:"admin_login",targetType:"administrator",targetIdHash:adminTargetHash(input.adminId),reason:"administrator_locked",createdAt:new Date().toISOString(),result:"failure",requestId:randomUUID()});return{ok:false as const,locked:true};}
  const hash=process.env.HANIP_ADMIN_PASSWORD_HASH??"",pepper=process.env.HANIP_ADMIN_PASSWORD_PEPPER??"";const credentialsAllowed=isAcceptableAdministratorPassword(input.password,input.adminId);const passwordMatches=await verifyAdministratorPassword(input.password,hash,pepper);const success=credentialsAllowed&&input.adminId===configuredId&&passwordMatches;
  if(success)resetAdministratorLoginGuard();else{failedAttempts+=1;if(failedAttempts>=MAX_FAILURES)administratorLocked=true;}
  await input.store.audit({adminId:input.adminId||"unknown",action:"admin_login",targetType:"administrator",targetIdHash:adminTargetHash(input.adminId),reason:success?"authenticated":administratorLocked?"administrator_locked_after_five_failures":"invalid_credentials",createdAt:new Date().toISOString(),result:success?"success":"failure",requestId:randomUUID()});
  if(!success)return{ok:false as const,locked:administratorLocked};return{ok:true as const,cookie:await issueAdminSession(configuredId,process.env.HANIP_ADMIN_SESSION_SECRET??"",input.store)};
}
