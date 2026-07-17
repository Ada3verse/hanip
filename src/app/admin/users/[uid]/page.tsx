import { AdminShell } from "../../AdminShell";import { UserAdminClient } from "./UserAdminClient";
export default async function UserPage({params}:{params:Promise<{uid:string}>}){const{uid}=await params;return <AdminShell title="학생 계정 상세"><UserAdminClient uid={uid}/></AdminShell>}
