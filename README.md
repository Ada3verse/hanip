# 한잎(Hanip)

> AI 기반 국어 문법 학습 플랫폼

중학생이 디벗을 활용하여 국어 문법을 스스로 학습할 수 있도록 개발한 AI 기반 학습 웹앱입니다.

**🌐 Demo**

[https://hanip.vercel.app](https://hanip.vercel.app)

**👨‍🎓 대상**

- 중학생
- 국어 교사

**🛠 Tech**

- Next.js
- TypeScript
- Firebase
- OpenAI
- Vercel

**현재 범위**: 품사 중심 Knowledge Pack Draft · 운영자 발급 학생 계정 · 학교 현장 시험 운영 전 단계

## 목차

- [프로젝트 소개](#프로젝트-소개)
- [핵심 기능](#핵심-기능)
- [교육적 설계](#교육적-설계)
- [개인정보·보안](#개인정보보안)
- [기술 스택](#기술-스택)
- [서비스 구조](#서비스-구조)
- [로컬 실행](#로컬-실행)
- [현재 상태](#현재-상태)

## 프로젝트 소개

중학생들이 디벗을 활용하여 국어 문법을 스스로 학습할 수 있도록 AI 기반 문법 학습 웹앱 「한잎」을 기획·개발하였습니다. 학생이 학습 목적에 맞게 질문하면 AI가 이해 수준에 맞는 설명을 제공하고 학습 기록을 저장하여 자기주도 학습을 지원하며, 실제 학교 현장에서 활용할 수 있도록 계정 관리와 개인정보 보호 기능도 함께 구현하였습니다.

현재 학생 계정은 운영자가 발급합니다. 학생은 발급받은 닉네임과 4자리 PIN으로 로그인하며, 공개 회원가입은 제공하지 않습니다.

## 개발 배경

- 학생들이 생성형 AI에 무엇을 질문해야 할지 어려워하는 문제
- 일반적인 AI 답변이 학생의 학습 수준과 반복되는 오개념을 충분히 반영하지 못하는 문제
- 디벗을 활용한 자기주도 국어 문법 학습을 지원할 도구의 필요
- 학교 현장에서 사용할 수 있는 계정·보안·관리 구조의 필요

## 핵심 기능

### 학생

- 운영자가 발급한 닉네임과 4자리 PIN으로 로그인
- 처음부터 배우기·복습·문제 연습 등 학습 방식과 목표 선택
- AI와 국어 문법 질의응답
- 학생 이해도, 오개념, 설명 이력을 반영한 설명과 후속 질문
- 대화와 학습 기록 저장·복원
- 학습 기록, 접근성 설정, 계정 및 개인정보 관리

### 관리자

- 학생 인증과 분리된 관리자 ID·비밀번호 로그인
- 학생 검색, 로그인 실패 횟수, 잠금 및 보유 기한 확인
- 학생 PIN 초기화와 계정 잠금 해제
- PIN 초기화 후 기존 대화·학습 기록 유지 및 기존 세션 폐기
- 조회 사유를 입력한 뒤 학생별 대화와 AI 답변 열람
- 품사 개념별 질문·어려움·오개념 통계 확인
- 재인증을 거친 학생 계정 영구 삭제
- 연말 보유기간 만료 데이터 점검 및 정리
- 관리자 로그인, 원문 조회, PIN 초기화, 삭제 작업 등의 Audit Log

## 교육적 설계

- 학생의 요청에는 먼저 직접 답하고, 필요한 경우 단계적 설명과 선수 개념 학습으로 연결
- 이해 수준과 답변 평가에 따라 설명 깊이와 질문 난이도 조절
- 정의, 비교, 대조, 예시, 반례, 퀴즈, Worked Example 등 설명 전략 전환
- 반복 실패 시 같은 설명을 되풀이하지 않고 예시와 설명 방식 변경
- 학습 기록의 설명 이력과 사용 예시를 참고하여 불필요한 반복 방지
- 교사용 교과서에서 구조화한 품사 Knowledge Pack Draft를 필요한 범위만 Retrieval하여 사용
- Knowledge에 없는 내용을 일반 모델 지식으로 임의 보완하지 않는 fail-closed 흐름

## 개인정보·보안

- 학생 인증과 관리자 인증 및 세션 완전 분리
- 학생 PIN과 관리자 비밀번호 평문 저장 금지
- 사용자별 salt, 서버 전용 pepper와 `scrypt` 기반 해시
- HttpOnly 세션 쿠키와 서버 저장 토큰 해시 사용
- 학생 PIN 5회 실패 시 계정 잠금, 관리자 인증 5회 실패 시 관리자 로그인 잠금
- 보호된 화면과 서버 API에서 세션 재검증
- 본인 데이터 경로만 허용하는 Firestore Security Rules
- PIN 초기화, 학생 영구 삭제, 보유기간 삭제 전 관리자 비밀번호 재인증
- 대화 원문 조회 사유 확인 및 Audit Log 기록
- 학생 데이터는 운영 정책상 매년 12월 31일까지 보유 후 정리
- 실명, 학번, 전화번호, 이메일을 기본 수집 항목으로 사용하지 않음

자세한 내용은 서비스 내 개인정보 처리방침과 이용약관 화면에서 확인할 수 있습니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Web | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4 |
| AI | OpenAI Responses API, 개발·회귀 검사용 Mock Provider |
| Data & Auth | Firebase Authentication, Cloud Firestore, Firebase Admin SDK |
| Rendering | React Markdown |
| Deployment | Vercel |
| Quality | ESLint, Security Gate, Deployment Readiness 검사 |

## 서비스 구조

```text
학생 로그인
→ 학습 방식·목표 선택
→ Knowledge Retrieval
→ Student Model 분석
→ 설명 전략 선택
→ OpenAI 응답
→ 대화·학습 기록 저장
→ 관리자 통계·검토
```

Runtime은 현재 대화, Student Model, 학습 목표, Retrieval 결과를 조합합니다. 개발 및 자동 회귀 검사에서는 같은 응답 계약을 따르는 Mock Provider를 사용하고, 운영 설정에서만 OpenAI Provider를 사용합니다.

## 프로젝트 구조

```text
src/
├── app/                 # 학생·관리자 화면과 서버 API
├── components/ui/       # 공통 UI 컴포넌트
└── lib/
    ├── runtime/         # 튜터 Runtime과 응답 Provider
    ├── learningState/   # 현재 학습 상태 계산
    ├── knowledge/       # 품사 Knowledge Pack과 Retrieval
    ├── studentModel/    # 학생 이해도와 설명 이력
    ├── repository/      # Local·Firebase 저장소 Provider
    ├── security/        # 학생 인증, 세션, 개인정보 보호
    └── admin/           # 관리자 인증과 운영 기능
public/                  # 아이콘, manifest, offline 자산
scripts/                 # 보안·배포·계정·보유기간 운영 검사
firestore.rules          # Firestore 접근 제어 규칙
firestore.indexes.json   # Firestore Index 설정
```

개발 전용 검증 화면은 `src/app/dev`에 분리되어 있으며 Production build 과정에서 제외됩니다.

## 주요 화면

현재 저장소에는 README에 사용할 실제 화면 캡처가 포함되어 있지 않아 임의의 이미지 링크를 만들지 않았습니다.

- 로그인 화면
- 학생 홈
- 학습 대화
- 학습 기록
- 관리자 대시보드

추후 캡처는 `docs/screenshots`에 아래 규칙으로 추가하는 것을 권장합니다.

```text
docs/screenshots/login-desktop.webp
docs/screenshots/student-home-tablet.webp
docs/screenshots/chat-tablet.webp
docs/screenshots/progress-desktop.webp
docs/screenshots/admin-dashboard-desktop.webp
```

파일명은 `화면-기기.webp` 형식을 사용하고, 실제 학생 정보와 대화 원문은 반드시 비식별 처리합니다.

## 로컬 실행

### 1. 설치 및 개발 서버 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속합니다. 학생 전용 화면은 유효한 학생 계정과 세션이 있어야 열립니다.

### 2. 환경변수 설정

`.env.local.example`을 참고해 `.env.local`을 만들고 실제 값은 로컬 환경 또는 배포 플랫폼의 비밀 환경변수에만 저장합니다.

```dotenv
# AI: 개발과 자동 테스트의 기본값
OPENAI_API_KEY=your_server_only_openai_key
OPENAI_MODEL=your_responses_api_model
HANIP_USE_MOCK_AI=true
HANIP_ENABLE_LIVE_AI_TESTS=false

# 학생 인증·요청 보호: 서로 다른 긴 난수 사용
HANIP_PIN_PEPPER=replace_with_a_long_random_value
HANIP_SESSION_SECRET=replace_with_another_long_random_value
HANIP_RATE_LIMIT_SECRET=replace_with_another_long_random_value
HANIP_ALLOWED_ORIGINS=http://localhost:3000

# 관리자 인증
HANIP_ADMIN_ID=your_admin_id
HANIP_ADMIN_PASSWORD_HASH=generated_scrypt_admin_v1_hash
HANIP_ADMIN_PASSWORD_PEPPER=replace_with_a_long_random_value
HANIP_ADMIN_SESSION_SECRET=replace_with_another_long_random_value

# Repository와 Firebase Web 설정
NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER=local
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=false
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin: 서버 전용
FIREBASE_CLIENT_EMAIL=your_firebase_admin_client_email
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your_multiline_private_key_from_secret_manager
```

`OPENAI_API_KEY`, Firebase Admin 자격 증명, PIN·세션·관리자 비밀값에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. Production에서 OpenAI를 사용할 때는 `HANIP_USE_MOCK_AI=false`로 설정하며, 키나 설정이 없으면 Mock으로 자동 우회하지 않고 요청을 안전하게 중단합니다.

학생 계정 생성, PIN 초기화, 보유기간 점검 등 운영 명령은 `package.json`과 `.env.local.example`의 안내를 확인한 뒤 서버 자격 증명이 있는 통제된 환경에서만 실행합니다.

## 배포 전 점검

```bash
npm run lint
npm run build
npm run security:gate
npm run deployment:ready
```

- `security:gate`는 인증·세션·개인정보·보안 설정과 Production build를 검사합니다.
- `deployment:ready`는 필수 환경변수, Firebase Admin 설정 형식, 보안 헤더, robots·sitemap·noindex 및 Production build를 확인합니다.
- 두 명령은 OpenAI 또는 Firebase 네트워크를 자동 호출하지 않습니다.
- Firestore Rules와 Indexes는 Vercel 배포와 별도로 Firebase 프로젝트에 배포해야 합니다.

## 현재 상태

- 교과서 기반 품사 Knowledge Pack Draft와 품사 중심 학습 흐름 구현
- Production build, Vercel 배포, Firebase·OpenAI Provider 전환 구조 구현
- 학생 로그인·학습·기록·설정·계정 기능 구현
- 관리자 학생 관리·대화 조회·학습 통계·감사·보유기간 기능 구현
- 실제 학교 현장 시험 운영 전 단계

## 향후 계획

- 실제 학생 사용성 검증
- 검토된 교육 자료를 바탕으로 문법 학습 범위 확대
- 교사 피드백 기반 관리자 통계 개선
- 접근성과 디벗 사용성 지속 보완

## 저작권 주의

- 교과서 PDF 원문은 저장소에 포함하지 않습니다.
- 교과서 원문 전체를 학생 응답이나 관리자 화면에 노출하지 않습니다.
- 출처 검토를 거쳐 교육 목적에 필요한 구조화된 지식만 사용합니다.
