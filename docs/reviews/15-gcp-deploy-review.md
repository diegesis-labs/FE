# Review 15: GCP Cloud Run 배포로 옮기기

- 대상 phase: [15-gcp-deploy.md](../phases/15-gcp-deploy.md)
- 리뷰 대상: 브랜치 `setup/33-gcp-deploy`, 기준 커밋 `28e7c0e` (phase의 구현 커밋)
- 리뷰 계획 커밋: `81c8261`
- 작성일: 2026-11-25
- 결과: 수정 후 통과

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff origin/main...28e7c0e` 기준 (중간에 합친 `main`의 #35 변경은 빼고 본다).

- `Dockerfile`, `.dockerignore`: Node 24 빌드 단계와 nginx 실행 단계. 기반 이미지 digest 고정
- `deploy/nginx/`: 서버 설정 템플릿, 보안 헤더 조각, `/api/` 처리를 만드는 시작 스크립트(`40-api-upstream.sh`)
- `cloudbuild.yaml`: 빌드 → 올리기 → 배포. `main`은 트래픽 100%, PR은 `--no-traffic --tag pr-<번호>`
- `scripts/check-process.mjs`, `scripts/check-process.test.mjs`: 검사 4가 phase 문서의 예전 이름도 찾는다 (계획 변경, 범위 8)
- `docs/architecture.md` 5장, `README.md`, `.env.example`, `docs/guardrails.md`
- GCP 리소스 (레포 밖): 프로젝트 `diegesis-front`의 API, 예산 알림, Artifact Registry, 서비스 계정 두 개, 소스 버킷, Cloud Run 서비스, GitHub 연결, 트리거 두 개

계획과 다른 점 (모두 phase 문서 변경 기록에 있음):

- phase 번호 13 → 15 (`main`의 13, 14와 겹침). 그 때문에 작업 절차 검사 수정이 범위에 들어옴
- `cloudbuild.yaml`을 단계 4에서 3으로 당김
- 서비스 공개를 `cloudbuild.yaml`이 아니라 소유자가 한 번 설정
- Cloud Build docker 빌더에 BuildKit 켬
- 로컬 제출용 소스 버킷을 따로 둠

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                            | 확인 방법                                                                                                                                                                                                 | 결과                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `format:check`, `lint`, `typecheck`, `build`, `test:scripts`, `check:process` 통과                                   | `28e7c0e`에서 여섯 명령 실행. PR #37의 CI `check` 결과                                                                                                                                                    | 통과. `28e7c0e`에서 여섯 명령 종료 코드 0 (`test:scripts` 127개). 리뷰 수정 뒤 `a30666d`의 PR #37 CI `check` 통과                                                                                                                                                                                                                                                                                                         |
| 2   | 이미지에 소스, `node_modules`, `.env*`가 없다. 이미지 크기 기록                                                      | Artifact Registry의 `fe:28e7c0e…`(또는 그 뒤 PR 빌드 이미지)를 받아 `docker run --rm <이미지> sh -c 'ls -R /usr/share/nginx/html; ls /'`, `find / -name node_modules -o -name ".env*"`, `docker image ls` | 통과. `fe:28e7c0e…` 이미지의 `/usr/share/nginx/html`에는 `index.html`, `favicon.svg`, `mockServiceWorker.js`, `assets/` 4개(js 3, css 1)만 있다. `node_modules`, `.env*`, `package.json`, `*.tsx` 없음. 크기 103MB (nginx 기반 이미지가 대부분)                                                                                                                                                                           |
| 3   | production 주소: `/` 책 목록, `/books/<id>?chapter=2` 새로 고침, 없는 경로는 앱 404 화면                             | 운영 주소를 브라우저(스크래치 폴더의 `playwright-core`와 Chromium)로 열고 화면 캡처. 사용자 브라우저 확인도 받기                                                                                          | 통과 (headless Chromium). 라이트·다크 `/`에 책 3권. `/books/bombom?chapter=2` 새로 고침 뒤 2장 리더. `/nope`은 "페이지를 찾을 수 없어요". 로그아웃 → `/login` → 로그인 버튼(`/login/mock`) → `/`. 콘솔·페이지 오류 없음. 사용자 브라우저 확인은 아직 (3절)                                                                                                                                                                |
| 4   | 헤더: 모든 경로에 보안 헤더 4개, `/assets/*` `immutable`, `index.html`·`mockServiceWorker.js` `no-cache`             | 운영 주소에 `curl -sI`로 `/`, `/books/x`, `/assets/<js>`, `/assets/<css>`, `/mockServiceWorker.js`, `/favicon.svg`, 없는 asset                                                                            | 통과. `/`, `/books/x`, `/nope`, js, css, `mockServiceWorker.js`, `favicon.svg`, 없는 asset 모두 보안 헤더 4개. js·css는 `public, max-age=31536000, immutable`, 없는 asset은 404에 캐시 헤더 없음, 나머지는 `no-cache`                                                                                                                                                                                                     |
| 5   | `BE_ORIGIN`이 없으면 `/api/books`가 404 `text/plain`                                                                 | 운영 주소에 `curl -i /api/books`, `/api/`, `/api` (슬래시 없음)                                                                                                                                           | 통과. `/api/books`, `/api/` 404 `text/plain`. `/api`(슬래시 없음)는 SPA `index.html` 200 (Vercel과 같음)                                                                                                                                                                                                                                                                                                                  |
| 6   | 로컬 컨테이너에 `BE_ORIGIN`을 주면 `/api/...`가 넘어가고 `Set-Cookie`가 그대로 온다                                  | BE에 로그인 코드가 없어서 API.md 4.2~4.3절대로 움직이는 가짜 BE로 확인한 기록(단계 2). 리뷰에서 `28e7c0e` 이미지로 한 번 더 돌린다                                                                        | 통과 (가짜 BE). `28e7c0e` 이미지에 `BE_ORIGIN=http://host.docker.internal:9002`: 로그인 시작 302와 상태 쿠키(`Path=/api/auth/google`), 틀린 상태·허용 목록 밖·정상 콜백, `/api/me`, 다른 출처 로그아웃 403, 로그아웃 204가 모두 계약대로. `Set-Cookie`, `Location`, `Origin`, 쿠키가 바뀌지 않음. BE의 실제 `/api/health`는 확인 못 함 (3절)                                                                              |
| 7   | `main` 머지 뒤 Cloud Build가 production을 바꾸고 이미지 태그가 머지 커밋 SHA와 같다                                  | 머지 전이라 지금은 확인할 수 없다. 단계 6에서 `gcloud builds list`, `gcloud run services describe`의 이미지 태그와 `git rev-parse origin/main` 비교                                                       | 확인 못 함 (머지 전). `main` 경로는 같은 `cloudbuild.yaml`을 손으로 제출해서 확인: `a30666d` 빌드가 리비전 `diegesis-fe-a30666d-75f172`를 만들고 트래픽 100%를 옮김. 이미지 태그가 커밋 SHA와 같음. → 머지 뒤 통과 (2026-11-26, phase 16에서 기록): PR #37 머지 `3d86352`의 `fe-main` 빌드가 SUCCESS, 리비전 `diegesis-fe-3d86352-24b201`이 트래픽 100%. 후속 PR #38 머지 `0528838`도 `diegesis-fe-0528838-608771`이 100% |
| 8   | PR마다 `pr-<번호>` 주소가 생기고 production 트래픽을 받지 않는다                                                     | PR #37 빌드 기록, `gcloud run services describe --format='yaml(status.traffic)'`, `pr-37` 주소와 운영 주소가 서로 다른 리비전인지 (응답의 JS 파일 이름 비교)                                              | 통과. PR #37의 `fe-pr` 빌드 4번 모두 성공. 트래픽: production 100%는 `diegesis-fe-a30666d-75f172`, `pr-37` 태그는 `diegesis-fe-a30666d-8c7a9e` (트래픽 0). 두 빌드의 `src/`가 같아 JS 파일 이름이 같으므로 리비전 이름으로 구분함                                                                                                                                                                                         |
| 9   | GitHub에 배포 비밀값이 없다. `ci.yml`·ruleset 그대로. 빌드 서비스 계정에 편집자 권한 없음                            | `gh secret list`, `gh variable list`, `git diff origin/main...28e7c0e -- .github/`, `gcloud projects get-iam-policy`에서 `fe-build`·`fe-run`의 역할                                                       | 통과. `gh secret list`, `gh variable list` 비어 있음. `.github/` 변경 없음. `fe-build`는 `run.developer`, `logging.logWriter`(프로젝트), `artifactregistry.writer`(저장소), `fe-run`의 `serviceAccountUser`, 소스 버킷 `objectViewer`뿐. `fe-run`은 권한 없음. 기본 Compute 계정의 편집자 권한은 발견 사항 2                                                                                                              |
| 10  | architecture.md 5장: 배포 구성, GCP 명령, BE가 생기면 할 일(`BE_ORIGIN`, `_VITE_API_MOCK`, 서비스 워커), 되돌리는 법 | 문서 읽기. 적힌 `gcloud` 플래그가 실제 CLI에 있는지 `--help`로 확인                                                                                                                                       | 통과. 5장에 구성 표, 컨테이너, 배포 흐름, 되돌리는 법, PR 미리보기 정리, GCP 명령, BE가 생기면 할 일(`BE_ORIGIN`, OAuth·`FRONTEND_URL`, `_VITE_API_MOCK`, 서비스 워커). `--update-substitutions`, `--to-revisions`, `--remove-tags`, `--to-latest`는 `gcloud --help`로 있는 것을 확인                                                                                                                                     |
| 11  | Vercel Git 연결이 끊기고 `vercel.json`이 없다                                                                        | 단계 6 후속 PR에서 확인. 이 리뷰에서는 "확인 못 함"                                                                                                                                                       | 확인 못 함 (단계 6 후속 PR). → 후속 PR #38(`1c4b07f`, 머지 `0528838`)에서 처리했다. 그 PR은 리뷰 계획 없이 머지됐다(절차 누락). 확인은 [16 리뷰](16-be-login-local-review.md)에서 한다. → 16 리뷰 1.4절에서 통과: `vercel.json` 없음, Vercel 프로젝트의 Git 연결(`link`) 없음, 그 뒤 Vercel 배포 없음, PR #38의 `check`·`fe-pr`·머지 뒤 `fe-main` 성공                                                                    |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                       | 확인 방법                                                                                                       | 결과                                                                                                                                                            |
| ------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FSD    | `src/` 변경 없음                                                | `git diff --stat origin/main...28e7c0e -- src/`                                                                 | 통과. `src/` 변경 없음                                                                                                                                          |
| 디자인 | 화면 변경 없음. 라이트/다크가 Vercel 배포와 같다                | 운영 주소 화면 캡처 (라이트, 다크)                                                                              | 통과. 라이트·다크 캡처가 기존 화면과 같음                                                                                                                       |
| 접근성 | 화면 변경 없음                                                  | 위와 같음                                                                                                       | 통과 (화면 코드 변경 없음)                                                                                                                                      |
| 상태   | 화면 변경 없음. 없는 경로와 `/api` 404에서 앱이 깨지지 않는다   | 없는 경로 화면                                                                                                  | 통과. 없는 경로는 앱 404 화면, `/api` 404에도 화면 오류 없음                                                                                                    |
| 보안   | 새 의존성(기반 이미지 2개, 빌더 이미지 2개)이 phase에 적혀 있다 | `Dockerfile`, `cloudbuild.yaml`의 digest와 phase "새 의존성" 비교. nginx 이미지는 빌드 3일이 지났는지 다시 확인 | 통과. `Dockerfile`의 node·nginx, `cloudbuild.yaml`의 docker·gcloud 빌더 digest가 phase와 같음. nginx 이미지는 2026-11-23 빌드라 오늘(11-25) 2일째 (발견 사항 6) |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                               | `git diff origin/main...28e7c0e`에서 `key`, `secret`, `token`, `password` 검색. `.dockerignore`의 `.env*`       | 통과. diff에서 걸린 것은 `server_tokens off` 하나. `.dockerignore`가 `.env`, `.env.*`를 뺌                                                                      |

### 1.4 이번 변경에서 특히 볼 것

- **nginx `/api/` 넘기기**: `BE_ORIGIN` 검증이 경로, 따옴표, 공백, `;`를 막는지 (설정 주입). `resolver`가 없는 환경에서 시작 실패하는지. 변수 `proxy_pass`라 요청 경로와 쿼리가 그대로 가는지. `Host`·SNI가 BE 호스트인지
- **`add_header` 상속**: `location`마다 보안 헤더 조각을 include 했는지. `always`가 없는 `Cache-Control`이 404에 붙지 않는지
- **`cloudbuild.yaml` 대체 변수**: `ALLOW_LOOSE`로 `_PR_NUMBER`가 비면 production 경로로 가는지. 셸 변수의 `$$` 이스케이프. PR 번호가 숫자 말고 다른 값이 될 수 없는지 (`--tag`에 들어감)
- **트래픽 고정**: PR 배포 뒤 `main` 배포가 `--to-latest`로 트래픽을 되돌리는지. PR 빌드와 `main` 빌드가 동시에 돌면 `--to-latest`가 PR 리비전을 가리킬 수 있는지 (순서 경쟁)
- **빌드 서비스 계정 권한**: `run.developer`가 프로젝트 전체에 걸려 있다. 서비스 단위로 줄일 수 있는지
- **PR 트리거 보안**: 조직 밖 PR은 댓글 승인 뒤에만 도는지. PR 빌드가 production 서비스의 설정(서비스 계정, 크기, 인스턴스 수)을 PR 코드의 `cloudbuild.yaml`로 바꿀 수 있는 점
- **작업 절차 검사 수정**: `git log --follow`가 다른 문서를 예전 이름으로 잘못 잡을 수 있는지. CI의 `fetch-depth: 0`
- **작업 순서**: BuildKit 수정 커밋 `d61fe71`이 phase 문서 기록(`88ac193`)보다 먼저 들어간 점
- **콜드 스타트**: 한동안 요청이 없던 뒤 첫 응답 시간 (위험 2)
- **`docs/guardrails.md`**: 한 줄을 고쳤는데 Prettier가 표 전체 폭을 다시 맞췄다. 내용 변경이 그 한 줄뿐인지

## 2. 발견 사항

| #   | 심각도 | 위치                          | 내용                                                                                                                                                                      | 조치                                                                                                                                                                                                                                                                                                                    |
| --- | ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 중간   | `cloudbuild.yaml` deploy 단계 | `main` 배포가 리비전을 만든 뒤 `--to-latest`로 트래픽을 옮겼다. 그 사이에 PR 빌드가 리비전을 만들면 "가장 최근 리비전"이 PR 것이 되어 production이 PR 코드로 바뀔 수 있다 | 고침 (`a30666d`). 리비전 이름을 `diegesis-fe-<커밋 7자리>-<빌드 ID 6자리>`로 정하고, 새 리비전은 언제나 트래픽 없이 만든 뒤 `main`만 그 이름으로 트래픽 100%를 옮긴다 (서비스가 없을 때의 첫 배포만 예외). `main` 경로(손으로 제출)와 PR 경로(`fe-pr`) 둘 다 다시 확인. architecture.md 5장도 고침                      |
| 2   | 낮음   | GCP IAM                       | Cloud Run API를 켤 때 GCP가 만든 기본 Compute 서비스 계정(`872555598631-compute@…`)에 프로젝트 편집자 권한이 있다. 이 서비스와 빌드는 이 계정을 쓰지 않는다               | 그대로 둠 (사용자 확인 필요). 편집자 권한을 빼는 것은 프로젝트 IAM 변경이라 사용자에게 묻는다. → 고침 ([phase 16](../phases/16-be-login-local.md) 단계 1, 2026-11-26, 사용자 결정). `roles/editor`를 뺐고 이 계정에 남은 프로젝트 역할은 없다. 뺀 뒤 production `/` 200. 다음 `fe-pr`·`fe-main` 빌드는 16 리뷰에서 확인 |
| 3   | 낮음   | `cloudbuild.yaml`, PR 트리거  | PR 빌드는 PR 브랜치의 `cloudbuild.yaml`로 `fe-build` 권한을 쓰므로, PR 코드가 production 서비스 설정과 트래픽을 바꿀 수 있다. 조직 밖 PR은 `/gcbrun` 승인 뒤에만 돈다     | 그대로 둠. 지금은 조직 구성원만 PR을 올린다. 승인 전에 `cloudbuild.yaml`·`Dockerfile` 변경을 읽으라고 architecture.md 5장에 적음                                                                                                                                                                                        |
| 4   | 낮음   | GCP IAM                       | `fe-build`의 `run.developer`가 프로젝트 전체에 걸려 있어 다른 Cloud Run 서비스도 만들 수 있다                                                                             | 그대로 둠. 프로젝트에 서비스가 `diegesis-fe` 하나뿐이다. 서비스가 늘면 서비스 단위로 줄인다                                                                                                                                                                                                                             |
| 5   | 낮음   | `cloudbuild.yaml`             | `main`에 머지가 연달아 있으면 두 빌드가 동시에 돌고, 늦게 끝난 쪽(예전 커밋일 수 있음)이 트래픽을 가져간다                                                                | 그대로 둠. 머지가 몇 분 안에 겹치는 일이 드물다. 생기면 다음 머지나 `--to-revisions`로 바로잡는다                                                                                                                                                                                                                       |
| 6   | 낮음   | `Dockerfile`                  | nginx 기반 이미지가 2026-11-23 빌드라 리뷰 시점에 2일째다. npm의 3일 규칙은 이미지에 적용되지 않는다                                                                      | 그대로 둠. Docker 공식 이미지이고 digest로 고정했다. 머지 시점에는 3일이 지난다                                                                                                                                                                                                                                         |
| 7   | 낮음   | 작업 순서                     | BuildKit 수정 커밋 `d61fe71`이 phase 문서의 계획 변경 기록(`88ac193`)보다 먼저 들어갔다                                                                                   | 그대로 둠. 첫 빌드 실패를 바로 고친 것이고, 바로 다음 커밋에서 phase 문서에 기록했다                                                                                                                                                                                                                                    |

1.4의 나머지 항목:

- `BE_ORIGIN` 검증: 경로(`/api`), `;`, 따옴표, 공백, `ftp://`, 빈 호스트, `user@`가 모두 시작 실패(종료 코드 1). `https://a.example:8443`만 통과. resolver가 없으면 실패하는 분기는 코드로 확인
- 요청 경로와 쿼리, `Host`: 가짜 BE가 받은 경로·쿼리가 그대로이고 `Host`가 BE 호스트. HTTPS BE의 인증서 확인과 SNI는 단계 2에서 `https://www.google.com`으로 확인
- `add_header`: 모든 `location`이 보안 헤더 조각을 include 한다. 4번 결과처럼 없는 asset 404에 `immutable`이 붙지 않음
- 대체 변수: `_PR_NUMBER`가 없는 손 제출이 `main` 경로로 갔다. `_PR_NUMBER`는 Cloud Build가 GitHub PR 번호(숫자)로만 채운다
- 작업 절차 검사: `git log --follow`는 이 문서의 이력만 따라간다 (`13-gcp-deploy.md`, `15-gcp-deploy.md`). CI는 `fetch-depth: 0`
- 콜드 스타트 (위험 2): 21분 동안 요청을 보내지 않은 뒤 첫 요청. Cloud Run 로그에 두 리비전 모두 그 시각 `Starting new instance`가 있다. 첫 응답(첫 바이트) production 0.35초, `pr-37` 0.49초, 그 뒤 0.08~0.12초. 최소 인스턴스 0으로 충분하다
- `docs/guardrails.md`: 단어 단위 diff에서 내용 변경은 한 문장뿐이고 나머지는 Prettier의 표 폭 맞춤

## 3. 확인 못 한 것

- ~~완료 기준 7: `main` 머지 뒤 `fe-main` 트리거. 단계 6에서 확인한다~~ → 확인함 (1.2절 7)
- ~~완료 기준 11: Vercel 정리. 후속 PR #38에서 처리, 확인은 [16 리뷰](16-be-login-local-review.md)~~ → 16 리뷰에서 확인함 (1.2절 11)
- 실제 BE를 통한 `/api/health`와 실제 Google 로그인: BE에 로그인 코드가 아직 없다 (E2). → 로컬 BE로는 [phase 16](../phases/16-be-login-local.md)에서 확인함 (개발 서버와 이 phase의 nginx 컨테이너 모두). 운영(GCP)에서는 E2에서 확인한다
- 사용자 브라우저(실제 기기)에서의 화면 확인

## 4. 결론

수정 후 통과. `main`과 PR 배포가 겹칠 때 production이 PR 코드로 바뀔 수 있던 문제를 고쳤고, 나머지 완료 기준은 머지 뒤에 확인할 두 항목(7, 11)을 빼고 통과했다. 남은 일은 머지 뒤 `fe-main` 확인과 Vercel 정리 후속 PR이다.

2026-11-26 덧붙임: 머지 뒤 `fe-main` 확인(7)은 통과했다. Vercel 정리(11)는 PR #38로 머지했지만 그 PR의 리뷰를 건너뛰어 16 리뷰에서 확인한다. 발견 사항 2(기본 Compute 계정의 편집자 권한)는 phase 16에서 뺐다.
