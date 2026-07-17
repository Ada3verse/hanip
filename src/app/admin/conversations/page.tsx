import { AdminDataView } from "../AdminDataView";import { AdminShell } from "../AdminShell";
export default function ConversationsPage(){return <AdminShell title="대화 조회"><p className="mb-4 text-sm text-gray-600">원문은 상세 화면에서 조회 사유를 입력한 뒤에만 확인할 수 있습니다.</p><AdminDataView endpoint="/api/admin/conversations" kind="conversations" /></AdminShell>}
