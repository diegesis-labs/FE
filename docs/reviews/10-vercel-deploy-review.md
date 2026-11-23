# Review 10: Vercel 배포

- 대상 phase: [10-vercel-deploy.md](../phases/10-vercel-deploy.md)
- 리뷰 대상: 브랜치 `setup/23-vercel-deploy`, 기준 커밋 `682bedf` (phase의 구현 커밋). 이후 코드 변경 `a99d810`(Node 24.x 고정), `604c052`(배포 주소 문서)까지 포함
- 리뷰 계획 커밋: (1절까지 쓰고 커밋·푸시한 해시)
- 작성일: 2026-11-23
- 결과: 진행 중

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff 725e8ce..604c052`에서 `docs/phases`를 뺀 8개 파일, +65 −11.

- `src/app/mocks/enable-mocking.ts`: 켜는 조건에서 `import.meta.env.DEV`를 뺌. `VITE_API_MOCK === 'true'`만 본다.
- `vercel.json` (새 파일): 설치·빌드 명령, 출력 폴더, SPA rewrite(`/api/` 제외), 보안 헤더 4개, `/assets/` 1년 immutable 캐시.
- `package.json`: `engines.node`를 `>=24`에서 `24.x`로 (계획에 없던 변경, phase 변경 기록에 있음).
- `.gitignore`: `.vercel` 추가. `eslint.config.js`: `globalIgnores`에 `.vercel` (계획에 없던 변경).
- 문서: architecture.md 3장(목 켜는 조건, 서비스 워커), 5장(배포 구성, 주소, BE가 생기면 할 일), `.env.example`, README.

Vercel 쪽 (레포 밖): 프로젝트 `diegesis`(def-uk), Git 연결, 환경 변수 5개, Node 24.x, 도메인 `diegesis-fe.vercel.app`.

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                      | 확인 방법                                                                                                     | 결과 |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`가 통과한다               | 브랜치 끝에서 다섯 명령. PR CI `check`                                                                        |      |
| 2   | `VITE_API_MOCK` 없이 빌드하면 `dist/`에 MSW 코드와 목 데이터가 없다                                            | 변수 없이 `pnpm build` 후 `grep -rl "setupWorker\|운수 좋은 날" dist/assets`. `main`과 번들 해시 비교         |      |
| 3   | `VITE_API_MOCK=true`로 빌드하면 목이 켜지고, 로컬 `pnpm preview`에서 책 목록과 리더가 보인다                   | 목 chunk가 생기는지. 화면은 배포 주소에서 확인 (로컬 브라우저 확인이 안 되면 그 사실을 적는다)                |      |
| 4   | PR에 Vercel Preview 배포가 생기고, 빌드 로그의 pnpm이 `12.21.0`, Node가 24.x다                                 | `vercel ls`, PR 상태 검사, `vercel inspect --logs`. Node는 프로젝트 설정과 `engines` 변경 뒤 배포의 로그·설정 |      |
| 5   | 배포 주소에서 `/`에 책 목록, `/books/<id>?chapter=2` 직접 열기·새로 고침에 리더, 없는 경로는 앱의 404 화면이다 | `curl`로 상태 코드와 `content-type`. 화면은 사용자 확인                                                       |      |
| 6   | 보안 헤더 4개, `/assets/*`는 `immutable`, `index.html`은 장기 캐시가 아니다                                    | `curl -I`로 `/`, 임의 경로, `/assets/index-*.js`                                                              |      |
| 7   | `main` 머지 때 production 배포가 자동으로 생기고, production 주소가 README와 architecture.md 5장에 있다        | 주소는 문서 `grep`. 머지 뒤 production 배포는 PR 머지 후 확인 (머지 전에는 확인 못 함으로 적는다)             |      |
| 8   | `ci.yml`, ruleset, 레포 시크릿이 바뀌지 않았다. 새 의존성이 없다                                               | `git diff 725e8ce.. -- .github pnpm-lock.yaml`, `gh secret list`, ruleset `updated_at`, `package.json` diff   |      |
| 9   | architecture.md 5장에 BE가 생기면 할 일(`/api` rewrite 추가, 데모 모드 끄기)이 적혀 있다                       | 5장 읽기. rewrite 예시가 SPA rewrite 앞에 들어가야 한다는 것, 서비스 워커 정리가 있는지                       |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                            | 확인 방법                                                                     | 결과 |
| ------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---- |
| FSD    | 아래 레이어가 위 레이어를 import 하지 않는다                         | `src` 변경은 `app/mocks` 한 파일, import 변경 없음                            |      |
| FSD    | 같은 레이어 슬라이스끼리 import 하지 않는다                          | 위와 같음, steiger                                                            |      |
| FSD    | 슬라이스 밖에서는 `index.ts`로만 import 한다                         | 위와 같음                                                                     |      |
| 디자인 | 색은 의미 토큰만 쓴다 (`#hex`, 팔레트 직접 사용 없음)                | 해당 없음 (화면 코드 변경 없음)                                               |      |
| 디자인 | 라이트/다크 둘 다 깨지지 않는다                                      | 해당 없음 (화면 코드 변경 없음)                                               |      |
| 접근성 | 글자 대비 4.5:1 이상, 키보드로 조작 가능, 아이콘 버튼에 `aria-label` | 해당 없음                                                                     |      |
| 상태   | 로딩, 빈 상태, 에러 상태가 있다                                      | 06의 MSW 시나리오가 배포에서도 같은 코드로 도는지                             |      |
| 보안   | 새 의존성이 phase 문서에 적혀 있고 확인되었다                        | 1.2의 8                                                                       |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                    | diff 검색. `vercel link`가 만든 `.env.local`(OIDC 토큰)이 git에 안 들어가는지 |      |

### 1.4 이번 변경에서 특히 볼 것

- **`.gitignore`와 비밀값**: `vercel link`가 만든 `.env.local`에 `VERCEL_OIDC_TOKEN`이 있다. `git check-ignore`로 무시되는지, 커밋 이력에 없는지. `.env.example`이 계속 추적되는지.
- **데모 모드의 공개 범위**: production은 공개 주소다. 목 데이터가 저작권이 끝난 글인지(06 결정), 목 시나리오 전환(`localStorage`)이 배포에서 누구에게 무엇을 노출하는지.
- **Vercel 설정의 출처**: 빌드 설정은 `vercel.json`이 기준인데, 대시보드에 남은 값(Framework Preset "Other" 등)이 덮어쓰지 않는지. 빌드 로그가 `vercel.json`의 설치 명령을 쓰는지.
- **Preview 보호**: 프로젝트의 `ssoProtection`이 Preview를 막고 production 주소는 공개인지.
- **첫 배포가 production**: PR 브랜치 코드가 머지 전에 production에 나가 있다. 내용이 이 PR과 같은지, 머지하면 바뀌는지.
- **`/api/` 404**: 데모 모드에서는 MSW가 `/api`를 받으므로 404가 사용자에게 보이지 않는지. 목이 켜지기 전(서비스 워커 준비 전)에 나가는 요청이 없는지 (`main.tsx`가 목 준비 뒤에 렌더함).
