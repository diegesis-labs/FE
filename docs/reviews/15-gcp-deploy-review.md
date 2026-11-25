# Review 15: GCP Cloud Run 배포로 옮기기

- 대상 phase: [15-gcp-deploy.md](../phases/15-gcp-deploy.md)
- 리뷰 대상: 브랜치 `setup/33-gcp-deploy`, 기준 커밋 `28e7c0e` (phase의 구현 커밋)
- 리뷰 계획 커밋: (1절까지 쓰고 커밋·푸시한 해시)
- 작성일: 2026-11-25
- 결과: 진행 중

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

| #   | 완료 기준                                                                                                            | 확인 방법                                                                                                                                                                                                 | 결과 |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `format:check`, `lint`, `typecheck`, `build`, `test:scripts`, `check:process` 통과                                   | `28e7c0e`에서 여섯 명령 실행. PR #37의 CI `check` 결과                                                                                                                                                    |      |
| 2   | 이미지에 소스, `node_modules`, `.env*`가 없다. 이미지 크기 기록                                                      | Artifact Registry의 `fe:28e7c0e…`(또는 그 뒤 PR 빌드 이미지)를 받아 `docker run --rm <이미지> sh -c 'ls -R /usr/share/nginx/html; ls /'`, `find / -name node_modules -o -name ".env*"`, `docker image ls` |      |
| 3   | production 주소: `/` 책 목록, `/books/<id>?chapter=2` 새로 고침, 없는 경로는 앱 404 화면                             | 운영 주소를 브라우저(스크래치 폴더의 `playwright-core`와 Chromium)로 열고 화면 캡처. 사용자 브라우저 확인도 받기                                                                                          |      |
| 4   | 헤더: 모든 경로에 보안 헤더 4개, `/assets/*` `immutable`, `index.html`·`mockServiceWorker.js` `no-cache`             | 운영 주소에 `curl -sI`로 `/`, `/books/x`, `/assets/<js>`, `/assets/<css>`, `/mockServiceWorker.js`, `/favicon.svg`, 없는 asset                                                                            |      |
| 5   | `BE_ORIGIN`이 없으면 `/api/books`가 404 `text/plain`                                                                 | 운영 주소에 `curl -i /api/books`, `/api/`, `/api` (슬래시 없음)                                                                                                                                           |      |
| 6   | 로컬 컨테이너에 `BE_ORIGIN`을 주면 `/api/...`가 넘어가고 `Set-Cookie`가 그대로 온다                                  | BE에 로그인 코드가 없어서 API.md 4.2~4.3절대로 움직이는 가짜 BE로 확인한 기록(단계 2). 리뷰에서 `28e7c0e` 이미지로 한 번 더 돌린다                                                                        |      |
| 7   | `main` 머지 뒤 Cloud Build가 production을 바꾸고 이미지 태그가 머지 커밋 SHA와 같다                                  | 머지 전이라 지금은 확인할 수 없다. 단계 6에서 `gcloud builds list`, `gcloud run services describe`의 이미지 태그와 `git rev-parse origin/main` 비교                                                       |      |
| 8   | PR마다 `pr-<번호>` 주소가 생기고 production 트래픽을 받지 않는다                                                     | PR #37 빌드 기록, `gcloud run services describe --format='yaml(status.traffic)'`, `pr-37` 주소와 운영 주소가 서로 다른 리비전인지 (응답의 JS 파일 이름 비교)                                              |      |
| 9   | GitHub에 배포 비밀값이 없다. `ci.yml`·ruleset 그대로. 빌드 서비스 계정에 편집자 권한 없음                            | `gh secret list`, `gh variable list`, `git diff origin/main...28e7c0e -- .github/`, `gcloud projects get-iam-policy`에서 `fe-build`·`fe-run`의 역할                                                       |      |
| 10  | architecture.md 5장: 배포 구성, GCP 명령, BE가 생기면 할 일(`BE_ORIGIN`, `_VITE_API_MOCK`, 서비스 워커), 되돌리는 법 | 문서 읽기. 적힌 `gcloud` 플래그가 실제 CLI에 있는지 `--help`로 확인                                                                                                                                       |      |
| 11  | Vercel Git 연결이 끊기고 `vercel.json`이 없다                                                                        | 단계 6 후속 PR에서 확인. 이 리뷰에서는 "확인 못 함"                                                                                                                                                       |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                       | 확인 방법                                                                                                       | 결과 |
| ------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---- |
| FSD    | `src/` 변경 없음                                                | `git diff --stat origin/main...28e7c0e -- src/`                                                                 |      |
| 디자인 | 화면 변경 없음. 라이트/다크가 Vercel 배포와 같다                | 운영 주소 화면 캡처 (라이트, 다크)                                                                              |      |
| 접근성 | 화면 변경 없음                                                  | 위와 같음                                                                                                       |      |
| 상태   | 화면 변경 없음. 없는 경로와 `/api` 404에서 앱이 깨지지 않는다   | 없는 경로 화면                                                                                                  |      |
| 보안   | 새 의존성(기반 이미지 2개, 빌더 이미지 2개)이 phase에 적혀 있다 | `Dockerfile`, `cloudbuild.yaml`의 digest와 phase "새 의존성" 비교. nginx 이미지는 빌드 3일이 지났는지 다시 확인 |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                               | `git diff origin/main...28e7c0e`에서 `key`, `secret`, `token`, `password` 검색. `.dockerignore`의 `.env*`       |      |

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

| #   | 심각도 | 위치 | 내용 | 조치 |
| --- | ------ | ---- | ---- | ---- |

## 3. 확인 못 한 것

## 4. 결론
