# 한잎(Hanip)

중학생이 AI와 문답하며 국어 문법을 이해하도록 돕는 Next.js 애플리케이션입니다. 개발과 자동 테스트에서는 Local Repository와 Mock AI가 기본값입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 확인합니다.

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
