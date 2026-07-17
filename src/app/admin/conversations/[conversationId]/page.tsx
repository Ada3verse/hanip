import { AdminShell } from "../../AdminShell";import { ConversationReviewClient } from "./ConversationReviewClient";
export default async function ConversationPage({params}:{params:Promise<{conversationId:string}>}){const{conversationId}=await params;return <AdminShell title="대화 상세"><ConversationReviewClient conversationId={conversationId}/></AdminShell>}
