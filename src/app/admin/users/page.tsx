import { AdminDataView } from "../AdminDataView";import { AdminShell } from "../AdminShell";
export default function UsersPage(){return <AdminShell title="학생 계정 관리"><AdminDataView endpoint="/api/admin/users" kind="users" /></AdminShell>}
