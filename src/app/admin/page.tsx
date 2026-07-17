import { AdminDataView } from "./AdminDataView";import { AdminShell } from "./AdminShell";
export default function AdminPage(){return <AdminShell title="운영 개요"><AdminDataView endpoint="/api/admin/analytics" kind="analytics" /></AdminShell>}
