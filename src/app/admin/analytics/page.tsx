import { AdminDataView } from "../AdminDataView";import { AdminShell } from "../AdminShell";
export default function AnalyticsPage(){return <AdminShell title="익명화 학습 통계"><AdminDataView endpoint="/api/admin/analytics" kind="analytics" /></AdminShell>}
