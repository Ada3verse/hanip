import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, adminTargetHash, verifyAdminSession, verifyAdministratorPassword } from "./adminAuth";
import { getAdminSecurityStore } from "./adminContext";
export async function requireAdministrator(){const cookie=(await cookies()).get(ADMIN_SESSION_COOKIE)?.value??"";return verifyAdminSession(cookie,process.env.HANIP_ADMIN_SESSION_SECRET??"",getAdminSecurityStore());}
export async function requireAdminReauthentication(password:unknown,confirmation:unknown,expected:string){if(typeof password!=="string"||confirmation!==expected)return false;return verifyAdministratorPassword(password,process.env.HANIP_ADMIN_PASSWORD_HASH??"",process.env.HANIP_ADMIN_PASSWORD_PEPPER??"");}
export async function auditAdmin(adminId:string,action:string,targetType:string,targetId:string,reason:string,result:"success"|"failure"="success"){await getAdminSecurityStore().audit({adminId,action,targetType,targetIdHash:adminTargetHash(targetId),reason:reason.slice(0,200),createdAt:new Date().toISOString(),result,requestId:randomUUID()});}
