# Review 16: 실제 BE와 Google 로그인을 로컬에서 확인

- 대상 phase: [16-be-login-local.md](../phases/16-be-login-local.md)
- 리뷰 대상: 브랜치 `setup/39-be-login-local`, 기준 커밋 `11e0282` (phase의 구현 커밋). 리뷰 문서 12·15 기록 `92b0af1`, phase 기록 `d5fa7be`까지 본다
- 함께 보는 것: phase 15 후속 PR #38 (`1c4b07f`, 머지 `0528838`). 그 PR은 리뷰 계획 없이 머지됐다. 15 리뷰 문서 1.2절 11에서 이 리뷰로 넘겼다
- 리뷰 계획 커밋: (1절까지 쓰고 커밋·푸시한 해시)
- 작성일: 2026-11-26
- 결과: 진행 중

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff 0528838..d5fa7be` 기준. 코드(`src/`)는 바뀌지 않았다 (계획대로).

- `docs/architecture.md`: 3장에 "실제 BE로 로컬 개발하기 (Phase 16)"를 더했다 (BE 띄우기, `.env`, 허용 목록 SQL, 개발 서버·컨테이너 두 경로, 확인할 때 볼 것). 5장 "컨테이너"의 로컬 BE 예시(`-p 8080:8080 -e BE_ORIGIN=...:8000`)는 지우고 3장을 가리키게 했다. **계획에 없던 변경**: 그 예시는 포트가 BE(8080)와 겹치고 Google 돌아올 주소(5173)와 맞지 않아 그대로 두면 틀린 안내였다.
- `.env.example`: `API_PROXY_TARGET` 위에 BE를 다른 포트로 띄웠을 때의 한 줄 설명.
- `docs/reviews/12-login-review.md`: 3절 "실제 BE와의 연결"을 확인 결과로 채우고 4절에 한 줄.
- `docs/reviews/15-gcp-deploy-review.md`: 1.2절 7(`fe-main` 확인) 결과, 11(Vercel 정리)을 이 리뷰로 넘김, 발견 사항 2(편집자 권한) 처리, 3·4절. Prettier가 표 열 너비를 다시 맞춰 줄 수가 크다.
- `docs/phases/16-be-login-local.md`: 계획 변경(BE 포트 8081), 단계·완료 기준 체크.
- GCP(저장소 밖): 기본 Compute 서비스 계정의 프로젝트 `roles/editor`를 뺐다 (단계 1).

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                        | 확인 방법                                                                                                                                                           | 결과 |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process` 통과 | 리뷰 기준 커밋에서 명령 실행. PR의 CI `check`                                                                                                                       |      |
| 2   | 개발 서버 경로에서 "확인할 것" 1~7이 기대와 같다 (계정 B가 없으면 5는 확인 못 함)                                | 단계 3에서 사용자가 본 화면과 그때 본 BE 로그(요청 경로·상태 코드)를 phase 문서 표와 하나씩 대조. 6은 콜백 `error=access_denied`로 확인한 것이 계획과 다름을 적는다 |      |
| 3   | 컨테이너 경로에서 같은 결과. 특히 2의 `Set-Cookie`와 4의 로그아웃 204가 nginx를 거쳐도 같다                      | 단계 4의 curl 결과(로그인 시작 302, 상태 쿠키 속성, 같은 출처 로그아웃 204, 다른 출처 403)와 BE 로그(콜백 302 → me 200 → logout 204 → me 401) 대조                  |      |
| 4   | BE 작업 폴더의 브랜치와 파일이 바뀌지 않았다                                                                     | `git -C ../BE status --short --branch`가 시작 전(`docs/flow-diagrams`, 변경 없음)과 같은지. `git -C ../BE reflog -5`에 이 세션의 움직임이 없는지                    |      |
| 5   | 비밀값, 이메일, 쿠키 값이 커밋·PR·대화에 없다                                                                    | `git diff 0528838..HEAD`에서 `@gmail`, `GOCSPX`, `client_id=`, `apps.googleusercontent`, `diegesis_session=` 검색. PR 설명도 같은 검색                              |      |
| 6   | architecture.md에 실제 BE로 로컬 개발하는 방법이 있다                                                            | 3장 새 절을 읽고, 명령이 BE `main` README와 맞는지 1.4절대로 확인                                                                                                   |      |
| 7   | 12 리뷰 문서 3절의 실제 BE 항목이 채워졌다                                                                       | 문서 읽기. 적힌 결과가 1.2절 2·3의 기록과 같은지                                                                                                                    |      |
| 8   | 기본 Compute 서비스 계정에 `roles/editor`가 없고, 뺀 뒤에도 `fe-main`·`fe-pr` 빌드와 production이 정상이다       | `gcloud projects get-iam-policy diegesis-front`에서 그 계정의 역할. 이 PR의 `fe-pr` 빌드 상태(`gcloud builds list`), production `/` 응답. `fe-main`은 머지 뒤 확인  |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                            | 확인 방법                                    | 결과 |
| ------ | -------------------------------------------------------------------- | -------------------------------------------- | ---- |
| FSD    | 아래 레이어가 위 레이어를 import 하지 않는다                         | `src/` 변경 없음 확인 (`git diff --stat`)    |      |
| FSD    | 같은 레이어 슬라이스끼리 import 하지 않는다                          | 위와 같음                                    |      |
| FSD    | 슬라이스 밖에서는 `index.ts`로만 import 한다                         | 위와 같음                                    |      |
| 디자인 | 색은 의미 토큰만 쓴다 (`#hex`, 팔레트 직접 사용 없음)                | 위와 같음                                    |      |
| 디자인 | 라이트/다크 둘 다 깨지지 않는다                                      | 화면 변경 없음. 해당 없음                    |      |
| 접근성 | 글자 대비 4.5:1 이상, 키보드로 조작 가능, 아이콘 버튼에 `aria-label` | 화면 변경 없음. 해당 없음                    |      |
| 상태   | 로딩, 빈 상태, 에러 상태가 있다                                      | 로그인 뒤 책 목록 404가 에러 상태로 보였는지 |      |
| 보안   | 새 의존성이 phase 문서에 적혀 있고 확인되었다                        | `package.json`, `pnpm-lock.yaml` 변경 없음   |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                    | 1.2절 5와 같음                               |      |

### 1.4 이번 변경에서 특히 볼 것

**architecture.md 새 절의 명령이 맞는지** (BE 레포는 `git show origin/main:<파일>`로만 읽는다)

- `git -C ../BE archive origin/main | tar -x -C <폴더>`가 그대로 동작하는지, 풀린 폴더에 `.env.example`이 있는지.
- `API_PORT`를 `.env`에 넣으면 compose가 읽는지 (BE `compose.yaml`의 포트 줄이 `${API_PORT:-8080}`인지). README는 셸 환경변수로 넘기는 방법만 적었다.
- 허용 목록 SQL과 `psql -U diegesis -d diegesis`가 BE README와 같은지.
- "셸에서 준 값이 `.env.local`보다 우선한다"가 `vite.config.ts`의 `loadEnv`와 Vite 동작에 맞는지 (`VITE_API_MOCK`, `API_PROXY_TARGET` 둘 다).
- 컨테이너 명령의 `-p 5173:8080`과 `BE_ORIGIN`이 `Dockerfile`(`PORT=8080`)과 `deploy/nginx/40-api-upstream.sh`에 맞는지.
- 5장에서 지운 예시를 다른 문서가 가리키지 않는지 (`grep -rn "host.docker.internal" docs`).

**15 리뷰 문서**

- Prettier가 표를 다시 맞춘 것 말고 내용이 바뀐 곳이 덧붙인 문장뿐인지 (`git diff -w --word-diff 0528838..HEAD -- docs/reviews/15-gcp-deploy-review.md`).
- 적은 빌드·리비전 이름(`diegesis-fe-3d86352-24b201`, `diegesis-fe-0528838-608771`)이 `gcloud builds list`, `gcloud run revisions list`와 같은지.

**phase 15 후속 PR #38 (리뷰를 건너뛰고 머지된 것)**

- `vercel.json`이 없고, 남은 Vercel 참조가 의도한 것뿐인지: `grep -rni vercel --exclude-dir=node_modules --exclude-dir=.git .`. architecture.md "Vercel (쓰지 않음)"이 남겨 둔다고 적은 것(`.gitignore`, `.dockerignore`, `eslint.config.js`의 `.vercel`)과 지난 phase·리뷰 문서의 기록만 남아야 한다.
- architecture.md "Vercel (쓰지 않음)" 절과 `security-headers.conf` 주석이 사실과 맞는지 (헤더 값이 phase 10의 `vercel.json`과 같은지 `git show 682bedf:vercel.json`과 대조).
- Vercel 프로젝트 `diegesis`의 Git 연결이 끊겼는지. Vercel CLI/API로 프로젝트의 `link`가 비었는지 본다. 작업 폴더에 `vercel link`의 부산물(`.vercel/`, `.env.local`, `.gitignore`의 `.env*`)이 남지 않았는지도 본다.
- PR #38의 CI `check`와 `fe-pr` 빌드(`1c4b07f`, `510ee28`), 머지 뒤 `fe-main`(`0528838`)이 성공했고 production이 그 리비전인지.
- PR #38 설명이 작업 절차 검사를 통과한 근거 (phase 15 문서와 15 리뷰 문서 링크). 리뷰 계획 없이 머지된 것 자체는 발견 사항으로 적는다.

**그 밖**

- phase 문서의 계획 변경(포트 8081)이 실제와 맞고, 계획 본문에 8080이 남은 곳이 BE 기본값 설명뿐인지.
- 단계 6(`LOGIN_FAILED`)을 Google 화면에서의 취소가 아니라 콜백 주소를 직접 열어 확인했다. 이것이 BE에서 같은 길(`error` 파라미터 → `LOGIN_FAILED`)인지 BE `main`의 콜백 코드로 확인한다.
- 이 세션 중에 FE 원래 작업 폴더의 브랜치가 바뀌어(11:34, `setup/33-gcp-deploy`) 개발 서버가 그 브랜치 코드로 돌았다. 그 브랜치와 이 브랜치의 `src/`, `vite.config.ts`가 같은지 확인한다 (다르면 단계 3 결과를 다시 봐야 한다).

## 2. 발견 사항

| #   | 심각도 | 위치 | 내용 | 조치 |
| --- | ------ | ---- | ---- | ---- |

## 3. 확인 못 한 것

## 4. 결론
