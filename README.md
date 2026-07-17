# 한잎(Hanip)

중학생이 AI와 문답하며 국어 문법을 이해하도록 돕는 Next.js 애플리케이션입니다. 개발과 자동 테스트에서는 Local Repository와 Mock AI가 기본값입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 확인합니다.

## AI Provider 설정

개발과 자동 테스트는 항상 Mock을 기본으로 사용합니다.

```dotenv
HANIP_USE_MOCK_AI=true
HANIP_ENABLE_LIVE_AI_TESTS=false
```

개발 환경에서 실제 API를 수동으로 한 번 확인할 때만 `HANIP_USE_MOCK_AI=false`, `HANIP_ENABLE_LIVE_AI_TESTS=true`로 설정하고 `/dev/prompt-test`에서 사용자가 직접 `실제 AI 테스트` 버튼을 누릅니다. 페이지 진입, 새로고침, build 및 자동 테스트는 Live 요청을 만들지 않습니다.

Production 학생 채팅은 다음 조합을 사용합니다.

```dotenv
HANIP_USE_MOCK_AI=false
HANIP_ENABLE_LIVE_AI_TESTS=false
OPENAI_API_KEY=...
```

`OPENAI_API_KEY`는 서버 전용입니다. `NEXT_PUBLIC_` 접두사를 사용하지 않습니다. 키가 없거나 Provider가 실패하면 Mock 응답으로 위장하지 않고 안전한 오류를 반환합니다.

## 학생 인증과 개인정보 보호

학생용 인증은 닉네임과 4자리 PIN을 서버에서 검증합니다. PIN은 `scrypt`와 사용자별 salt, 서버 전용 `HANIP_PIN_PEPPER`로 해시하며 평문·URL·localStorage·로그에 저장하지 않습니다. 세션은 HttpOnly, SameSite 쿠키를 사용하고 서버 저장소에는 토큰 해시만 보관합니다.

```dotenv
HANIP_PIN_PEPPER=...
HANIP_SESSION_SECRET=...
HANIP_RATE_LIMIT_SECRET=...
HANIP_STUDENT_ACCOUNTS_JSON=[]
```

각 값은 서로 다른 긴 난수로 설정하고 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다. 현재 학생 Credential 저장소는 서버 어댑터 경계가 fail-closed 상태입니다. Firebase Admin SDK와 Custom Token을 도입하기 전에는 브라우저 Anonymous Auth를 학생 PIN 인증 성공으로 간주하지 않습니다.

- `/terms`, `/privacy`, `/privacy/summary`는 로그인 전 접근할 수 있습니다.
- 운영 정책의 시행일은 2026년 7월 1일, 문의처는 동신중학교 정보교육 담당(정경원), 보유기간은 매년 12월 31일까지로 확정했습니다. 이는 법률 검토 완료를 의미하지 않으며 처리 지역과 외부 수탁 관계는 운영자가 별도로 확인합니다.
- `/chat`, `/progress`, `/settings`, `/account`는 학생 세션 쿠키가 없으면 `/login`으로 이동합니다.
- 개인정보 삭제·정정·동의 철회 요청은 본인 확인과 관리자 처리 이력을 거쳐야 합니다.

## Firebase 프로젝트 준비

1. Firebase Console에서 Web App을 포함한 프로젝트를 생성합니다.
2. Authentication의 Sign-in method에서 Anonymous 로그인을 활성화합니다.
3. Cloud Firestore Database를 생성합니다. 배포 지역은 실제 사용자와 가까운 곳을 선택합니다.
4. 프로젝트의 Web App 설정 값을 `.env.local`에 입력합니다.

```dotenv
HANIP_USE_MOCK_AI=true
HANIP_ENABLE_LIVE_AI_TESTS=false
NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER=firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

설정이 없거나 Firebase 작업이 실패하면 Local Provider로 전환됩니다. Local을 명시하려면 `NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER=local`을 사용합니다.

## Firestore Rules와 Indexes

프로젝트 루트의 `firestore.rules`는 로그인한 사용자가 자신의 `users/{uid}` 문서와 그 하위 경로만 접근하도록 제한합니다. 다른 Collection은 모두 거부합니다.

현재 Repository는 사용자 문서 단건 접근만 하므로 Composite Index가 필요하지 않습니다. `firestore.indexes.json`은 빈 목록을 유지합니다.

Firebase CLI를 구성한 뒤 대상 프로젝트를 확인하고 배포합니다.

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Health 확인

- `GET /api/health`: 네트워크 호출 없이 Provider와 설정 상태를 JSON으로 반환합니다.
- `/dev/firebase`: 개발 환경에서만 열리며, 버튼을 직접 눌렀을 때 Anonymous Auth와 Firestore read/write, Repository load/save를 실제로 검사합니다.
- 학생 화면에는 Firebase 내부 상태가 표시되지 않습니다.

## Vercel 배포

1. Git 저장소를 Vercel 프로젝트에 연결합니다.
2. Project Settings → Environment Variables에 Firebase 변수와 `NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER=firebase`를 등록합니다.
3. AI를 활성화할 때만 서버 전용 `OPENAI_API_KEY`를 등록합니다. 키를 `NEXT_PUBLIC_` 변수로 만들지 않습니다.
4. Preview와 Production 환경의 값을 분리해 등록합니다.
5. `npm run lint`와 `npm run build`가 통과하는지 확인한 뒤 배포합니다.
6. 배포 후 `/api/health`를 확인하고, 개발 환경에서는 `/dev/firebase` 수동 검사를 수행합니다.

Firestore Security Rules는 Firebase에 별도로 배포해야 하며 Vercel 배포만으로 적용되지 않습니다.

## Production Release Checklist

- [ ] `npm run lint`가 warning 없이 통과
- [ ] `npm run build` production build 통과
- [ ] Firebase Anonymous Auth 활성화 확인
- [ ] Firestore Database 생성 및 배포 지역 확인
- [ ] `firestore.rules`와 `firestore.indexes.json` 배포
- [ ] Vercel Preview/Production 환경변수 분리 등록
- [ ] Production에서 `NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER=firebase` 확인
- [ ] Production AI 사용 시 `HANIP_USE_MOCK_AI=false`와 서버 전용 `OPENAI_API_KEY` 확인
- [ ] `/api/health`가 민감정보 없이 응답하는지 확인
- [ ] 개발 환경의 `/dev/firebase`에서 수동 Firebase Health 검사
- [ ] Conversation QA, Mock Regression, Readiness, Repository, Runtime, Health 테스트 통과
- [ ] 모바일 키보드·터치, 키보드 탐색, Screen Reader, 명암 확인
- [ ] manifest, icon, robots, sitemap, offline fallback 확인

## Production Checklist

배포 전 `npm run deployment:ready`를 실행합니다. 이 명령은 설정 구조와 Production build만 확인하며 OpenAI 또는 Firebase 네트워크를 호출하지 않습니다.

- [ ] Firebase 프로젝트 생성
- [ ] Firestore Rules 배포
- [ ] Vercel Production 환경변수 등록
- [ ] 서버 전용 OpenAI API Key 등록
- [ ] `HANIP_USE_MOCK_AI=false`, `HANIP_ENABLE_LIVE_AI_TESTS=false` 확인
- [ ] Vercel Redeploy
- [ ] 본인 소유 배포 주소에서 운영 보안 테스트
- [ ] 학생 계정 생성
- [x] 이용약관·개인정보 처리방침의 시행일·문의처·보유기간 반영
- [ ] 서비스 공개

Firebase Admin 자격 증명은 `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` 환경변수로만 등록합니다. Service Account JSON 또는 Private Key 파일을 저장소에 추가하지 않습니다. Emulator는 개발 환경에서만 사용하고 Production에서는 실제 Firestore Provider를 선택합니다.

### 학생 계정 운영

공개 회원가입은 제공하지 않습니다. 아래 명령은 Firebase Admin 환경변수가 설정된 운영자 터미널에서만 실행합니다. `--pin`을 생략하면 대화형으로 입력할 수 있으며, 명령행에 PIN을 넣으면 셸 기록에 남을 수 있습니다.

```bash
npm run user:create -- --nickname 학생01
npm run user:reset-pin -- --nickname 학생01
```

임시 PIN은 생성 또는 초기화 직후 한 번만 표시되며 Firestore에는 scrypt 해시만 저장됩니다. PIN 초기화 시 기존 세션은 모두 revoke됩니다.

### 연말 보유기간 삭제

```bash
npm run retention:check
npm run retention:delete -- --confirm
```

첫 명령은 삭제 대상 수만 확인하는 Dry Run입니다. 두 번째 명령만 만료 계정과 하위 세션·대화·메시지·학습 상태를 재귀 삭제하고 별도 Audit 결과를 남깁니다.

### 관리자 운영 대시보드

`/admin/login`은 학생 로그인과 분리된 관리자 전용 인증 경계입니다. 관리자 ID와 비밀번호만 사용하며, 평문 비밀번호를 저장하지 않고 `scrypt-admin-v1` 해시와 별도 pepper를 사용합니다. 관리자 세션은 최대 30분 동안만 유지됩니다.

필수 운영 환경변수는 `HANIP_ADMIN_ID`, `HANIP_ADMIN_PASSWORD_HASH`, `HANIP_ADMIN_PASSWORD_PEPPER`, `HANIP_ADMIN_SESSION_SECRET`입니다. 관리자 비밀번호는 최소 8자이며 12자 이상을 권장하고, 관리자 ID와 같거나 흔한 비밀번호는 사용할 수 없습니다. 관리자 비밀번호를 저장소, 브라우저, 로그에 기록하지 않습니다.

관리자 자격 증명은 서버 전용 Terminal에서 생성합니다. 비밀번호는 입력 과정에서 화면에 보일 수 있으므로 주변 노출과 터미널 기록에 주의하고, 출력 결과는 Vercel 환경변수에 직접 옮긴 뒤 파일로 저장하지 않습니다.

```bash
HANIP_ADMIN_PASSWORD_PEPPER='32자 이상의 별도 비밀값' npm run admin:credential:create
```

로그인에 5회 연속 실패하면 관리자 인증이 잠깁니다. 잠금 원인을 확인한 운영자만 서버 재배포 또는 통제된 서버 운영 절차로 잠금을 해제할 수 있으며, 학생 화면에서는 해제할 수 없습니다.

대시보드에서 학생 목록·계정 상태·학습 통계·보유기간·감사 로그를 확인할 수 있습니다. 대화 원문 상세 조회에는 사유 입력이 필요하고 감사 로그가 남습니다. PIN 재발급은 기존 학생 세션을 폐기합니다. 계정 영구 삭제와 만료 데이터 삭제는 관리자 비밀번호 재입력과 정확한 확인 문구가 모두 필요합니다.

- [ ] 관리자 전용 ID와 강한 비밀번호 해시 등록
- [ ] 관리자 세션 비밀값을 학생 세션 비밀값과 다르게 등록
- [ ] 관리자 비밀번호 정책과 5회 실패 잠금 해제 절차 확인
- [ ] `/admin`과 `/api/admin` 비인증 접근 차단 확인
- [ ] 대화 원문 조회·PIN 재발급·잠금·삭제 감사 로그 확인
- [ ] 연말 보유기간 Dry Run 후 재인증 삭제 절차 확인

## 최종 Production 환경변수

공개 설정: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_HANIP_REPOSITORY_PROVIDER=firebase`.

서버 전용 설정: `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, 선택적 `FIREBASE_PROJECT_ID`, `OPENAI_API_KEY`, `HANIP_PIN_PEPPER`, `HANIP_SESSION_SECRET`, `HANIP_RATE_LIMIT_SECRET`, `HANIP_ALLOWED_ORIGINS`, `HANIP_ADMIN_ID`, `HANIP_ADMIN_PASSWORD_HASH`, `HANIP_ADMIN_PASSWORD_PEPPER`, `HANIP_ADMIN_SESSION_SECRET`.

Production에서는 `HANIP_USE_MOCK_AI=false`, `HANIP_ENABLE_LIVE_AI_TESTS=false`를 사용합니다. 개발과 자동 테스트는 각각 `true`, `false`를 유지합니다. PIN pepper와 세 가지 세션·rate-limit 비밀값은 서로 다른 32자 이상의 비예측값이어야 합니다.

## 최초 운영 절차

1. Vercel에 위 공개·서버 환경변수를 Production 범위로 등록합니다.
2. Firebase Console에서 Firestore와 운영 프로젝트 ID를 확인합니다.
3. Terminal에서 `firebase deploy --only firestore:rules`와 `firebase deploy --only firestore:indexes`를 수동 실행합니다.
4. Terminal에서 `npm run admin:credential:create`를 실행하고 출력된 관리자 비밀번호 해시를 운영 환경변수에 한 번만 등록합니다.
5. Terminal에서 `npm run user:create -- --nickname 테스트학생`으로 시험 계정 하나를 만듭니다.
6. Mock 환경에서 로그인·질문 저장·로그아웃·복원을 확인하고 관리자 페이지에서 동일 계정을 조회합니다.
7. PIN을 5회 틀린 뒤 관리자 PIN 초기화로 기존 대화와 학습 기록이 유지되는지 확인합니다.
8. `npm run retention:check`, `npm run security:gate`, `npm run deployment:ready`와 배포 URL 외부 검사를 수행합니다.
9. Vercel에서 `HANIP_USE_MOCK_AI=false`로 바꾸고 재배포한 뒤 운영자 계정으로 실제 질문을 정확히 1회 수동 확인합니다.
10. Health·감사 로그·오류율을 확인한 뒤 공개합니다.
