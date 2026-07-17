import Link from "next/link";
import { privacyRetentionPolicy as policy } from "@/lib/security/privacyPolicy";
const sections = [
  ["처리 항목", "닉네임, 인증·접속 기록, 학습 기록, 대화 기록을 처리합니다. 실명, 학교명, 전화번호, 이메일은 원칙적으로 수집하지 않습니다."],
  ["처리 목적", "학습 제공, 학습 상태 유지와 서비스 보안을 위해 이용합니다."],
  ["보유·이용 기간", "해당 학년도 종료 시인 매년 12월 31일까지 보관한 뒤 일괄 삭제합니다."],
  ["삭제 요청", "이용자가 그 전에 계정 또는 대화 삭제를 요청하면 본인 확인 후 처리합니다."],
  ["별도 보존", "법령상 별도 보존 의무가 있는 기록은 근거와 기간을 별도로 고지하며, 근거가 없으면 임의 보존하지 않습니다."],
  ["입력 시 주의", "대화창에 실명, 학교명, 전화번호, 이메일 등 개인 식별 정보를 입력하지 마세요."],
  ["처리 서비스", "서비스 제공을 위해 Firebase/Google Cloud와 Vercel을 사용합니다. OpenAI 전송은 운영 설정으로 활성화한 경우에만 이루어집니다."],
];
export default function PrivacyPage(){return <main className="min-h-screen bg-white px-5 py-10 text-black"><article className="mx-auto max-w-2xl"><p className="rounded bg-amber-50 p-3 text-sm font-semibold">운영 정책값을 반영한 개인정보 처리방침입니다. 법률 검토 완료를 의미하지는 않습니다.</p><h1 className="mt-6 text-3xl font-bold">개인정보 처리방침</h1>{sections.map(([title,content],index)=><section key={title} className="mt-7"><h2 className="text-lg font-bold">{index+1}. {title}</h2><p className="mt-2 leading-7 text-zinc-700">{content}</p></section>)}<p className="mt-8 text-sm">시행일: 2026년 7월 1일 · 개인정보 문의: {policy.contact} · 정책 버전: {policy.privacyVersion}</p><div className="mt-8 flex gap-4"><Link className="underline" href="/privacy/summary">학생용 쉬운 안내</Link><Link className="underline" href="/login">로그인으로</Link></div></article></main>}
