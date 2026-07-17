import { AdminDataView } from "../AdminDataView";import { AdminShell } from "../AdminShell";
export default function AuditPage(){return <AdminShell title="관리자 감사 로그"><AdminDataView endpoint="/api/admin/audit" kind="audit" /></AdminShell>}
