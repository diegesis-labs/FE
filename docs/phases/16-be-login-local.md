# Phase 16: 실제 BE와 Google 로그인을 로컬에서 확인

- 상태: 승인됨
- 선행 phase: [12 로그인 화면](12-login.md), [15 GCP 배포](15-gcp-deploy.md) (둘 다 `main`에 머지됨). BE Epic 1 ([diegesis-labs/BE#11](https://github.com/diegesis-labs/BE/pull/11), `31e02ee`)도 BE `main`에 머지됨
- 관련 이슈: [#39 실제 BE와 Google 로그인을 로컬에서 확인](https://github.com/diegesis-labs/FE/issues/39)
- 브랜치: `setup/39-be-login-local` (`main`의 `0528838`에서 만듦)
- 계획 커밋: `b6b2eaf` (계획 변경: `22a1261`)
- 구현 커밋: `11e0282` (리뷰 문서 12·15 기록: `92b0af1`)
- 리뷰 문서: [16-be-login-local-review.md](../reviews/16-be-login-local-review.md) (리뷰 단계에서 작성)

## 목표

로컬에 띄운 실제 BE(BE `main`)에 FE를 붙여, 실제 Google 계정으로 로그인, 허용 목록 밖 안내, 로그인 실패 안내, 로그아웃이 BE 계약대로 동작하는 것을 확인한다. FE 개발 서버(Vite 프록시)와 배포용 컨테이너(nginx) 두 경로 모두에서 본다. 어긋나는 것이 있으면 FE 쪽을 고친다.

## 배경

- BE가 Epic 1(로그인과 허용 목록)을 BE `main`에 머지했다 (2026-11-26, BE#11). BE는 자기 쪽 점검을 FE 대신 대역 서버(`scripts/login_check.py`)로 했다 (BE `phases/1-login-allowlist/MANUAL.md`). 실제 FE 화면으로는 아직 아무도 확인하지 않았다.
- [phase 12](12-login.md) 위험 1: "BE E1이 `main`에 합쳐지면 로컬에서 docker compose로 띄운 BE에 붙여, 로그인, 허용 목록 밖, 로그아웃, 로그아웃 요청이 `ORIGIN_MISMATCH` 없이 `204`인지 확인한다." 이 phase가 그 확인이다. 결과는 [12 리뷰 문서](../reviews/12-login-review.md) 3절의 "확인 못 함"에도 채운다.
- 2026-11-24 FE·BE 회의(Confluence "FE, BE API/마일스톤 회의")의 일정상 E2(배포 연결)는 3주차 초다. 운영(GCP)에서 BE를 붙이는 것은 BE가 배포된 뒤 E2에서 한다. 2026-11-25 "2주차 전체 회의"에는 FE·BE 계약에 관한 새 결정이 없다.
- Google OAuth 클라이언트는 사용자가 만들었다 (2026-11-26). 돌아올 주소로 `http://localhost:5173/api/auth/google/callback`과 운영 주소의 같은 경로를 등록하기로 했다.
- 이미 맞춰 둔 것 (BE `main`의 `docs/API.md` 2.2~2.4절, 4.2~4.3절과 대조함): `GET /api/me`의 `role`, `/login?error=NOT_ALLOWED`·`LOGIN_FAILED`, 401·403 처리, `credentials: 'include'`, 상대 경로 `/api`. FE 코드를 바꿀 것은 없을 것으로 본다.

## 범위

### 하는 것

1. **BE를 BE 레포를 건드리지 않고 띄운다**: BE `origin/main`을 `git archive`로 임시 폴더(작업 폴더 밖)에 풀어 `docker compose`로 띄운다. BE 작업 폴더의 브랜치와 파일은 바꾸지 않는다.
2. **비밀값은 사용자가 넣는다**: 임시 폴더의 `.env`에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`을 사용자가 직접 넣는다. Claude는 값을 읽거나 출력하지 않는다. 허용 목록에는 사용자가 알려 준 계정 A를 `user`로 넣는다 (BE README의 SQL).
3. **개발 서버 경로**: `VITE_API_MOCK=false pnpm dev --strictPort`(5173)로 띄워 아래 "확인할 것"을 본다. 포트가 5174로 밀리면 Google 돌아올 주소가 맞지 않으므로 `--strictPort`를 쓴다.
4. **컨테이너 경로**: `VITE_API_MOCK=false`로 빌드한 이미지를 `-p 5173:8080 -e BE_ORIGIN=http://host.docker.internal:<BE 포트>`로 띄워 같은 것을 본다. 운영과 같은 nginx 넘겨주기(쿠키, `Origin`, `X-Forwarded-*`)를 실제 BE로 확인한다.
5. **어긋난 것 고치기**: 확인 중 FE 결함이 나오면 이 문서를 먼저 고치고(계획 변경 커밋) FE를 고친다.
6. **문서**: architecture.md에 "실제 BE로 로컬 개발하기"(BE 띄우기, `.env`, 허용 목록, 두 경로)를 적는다. 12 리뷰 문서 3절에 결과를 채운다.
7. **GCP 정리 (phase 15 리뷰 지적 2)**: 기본 Compute 서비스 계정(`872555598631-compute@developer.gserviceaccount.com`)의 프로젝트 `roles/editor`를 뺀다 (사용자 결정 2026-11-26). 우리 서비스(`fe-run`)와 빌드(`fe-build`)는 이 계정을 쓰지 않는다. 빼기 전후의 역할과, 뺀 뒤 `fe-main`·`fe-pr` 빌드와 production 응답이 그대로인지 15 리뷰 문서에 적는다.

### 하지 않는 것

- BE 레포의 코드, 문서, 브랜치 수정 (사용자 결정 "be는 건들지말고"). BE 결함으로 보이는 것은 BE 담당자에게 알릴 내용으로만 리뷰 문서에 적는다.
- 운영(GCP)에 BE 붙이기: `BE_ORIGIN`, `_VITE_API_MOCK=false`, 서비스 워커 정리 (E2, architecture.md 5장 "BE가 생기면")
- 책 목록·본문을 실제 BE로 보기. BE에 `/api/books`가 아직 없어서(BE `main`의 라우터는 health, auth뿐) 로그인 뒤 첫 화면은 책 목록 에러 상태가 된다. 이것은 정상으로 보고 기록만 한다.
- "로그인은 실제 BE, 책은 목" 같은 섞은 모드 (열린 질문 1)
- 관리자 화면 (`ADMIN_ONLY`)

## 설계

### FSD 배치

코드 변경은 없을 것으로 본다. 확인 중 결함이 나오면 계획 변경으로 적는다.

| 파일                                   | 바꿀 것                                           |
| -------------------------------------- | ------------------------------------------------- |
| `docs/architecture.md`                 | 3장(또는 5장)에 "실제 BE로 로컬 개발하기"         |
| `docs/reviews/12-login-review.md`      | 3절 "확인 못 한 것"의 실제 BE 항목에 결과         |
| `docs/reviews/15-gcp-deploy-review.md` | 지적 2(기본 Compute 계정의 편집자 권한) 처리 결과 |
| `.env.example`                         | 필요하면 실제 BE로 붙일 때의 값 설명 한 줄        |

### 로컬 구성

```
브라우저 ── http://localhost:5173 ──┬─ 개발 서버(Vite) ── /api 프록시 ──┐
                                    └─ 또는 FE 컨테이너(nginx) ─────────┴─▶ BE api (localhost:8081) ─▶ PostgreSQL (compose)
Google ── 돌아올 주소 http://localhost:5173/api/auth/google/callback
```

- BE의 `FRONTEND_URL`은 `http://localhost:5173` 그대로다. 그래서 BE가 보내는 리다이렉트, 쿠키(`Secure` 없음), 출처 확인의 기준이 FE 주소와 맞는다.
- 두 경로는 같은 포트를 쓰므로 한 번에 하나만 띄운다.
- BE 포트: BE 기본값은 8080이지만, 이 컴퓨터에서는 8080을 다른 프로그램(code-server)이 쓰고 있어 임시 폴더의 `.env`에 `API_PORT=8081`을 더해 8081로 띄웠다. 그래서 개발 서버는 `API_PROXY_TARGET=http://localhost:8081`, 컨테이너는 `BE_ORIGIN=http://host.docker.internal:8081`이다. FE 코드와 BE 계약에는 영향이 없다.
- 확인은 평소 브라우저 프로필이 아니라 Chrome 게스트 창에서 한다 (쿠키 없이 시작, 계정 로그인이 남지 않게. BE ADR-031과 같은 이유).

### 확인할 것 (두 경로 각각)

| #   | 할 일                                                          | 기대하는 결과                                                                                       |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | 새 게스트 창에서 `/`를 연다                                    | `/login`으로 간다 (`GET /api/me` 401)                                                               |
| 2   | [Google로 로그인] → 계정 A                                     | `/`로 돌아온다. `diegesis_session` 쿠키(`HttpOnly`, `SameSite=Lax`, `Path=/`). 헤더에 로그아웃 버튼 |
| 3   | 새로 고침                                                      | 로그인이 유지된다. 책 목록은 `/api/books` 404로 에러 상태 (정상, 하지 않는 것)                      |
| 4   | [로그아웃]                                                     | `POST /api/auth/logout` 204 (`ORIGIN_MISMATCH` 없음). `/login`으로 간다. 다시 `/`를 열면 `/login`   |
| 5   | 게스트 창을 새로 열고 계정 B(허용 목록 밖)로 로그인            | `/login?error=NOT_ALLOWED` 안내. 세션 쿠키 없음                                                     |
| 6   | 게스트 창을 새로 열고 Google 동의 화면에서 취소                | `/login?error=LOGIN_FAILED` 안내                                                                    |
| 7   | 로그인한 상태에서 SQL로 계정 A를 허용 목록에서 뺀 뒤 새로 고침 | `/login?error=NOT_ALLOWED`로 간다 (`GET /api/me` 403 `NOT_ALLOWED`). 확인 뒤 A를 다시 넣는다        |

계정 B가 없으면 5는 "확인 못 함"으로 남긴다. 결과에는 이메일, 쿠키 값, 비밀값을 적지 않는다.

### API

BE `main`의 `docs/API.md` 그대로다 (2.2절 관문, 2.4절 출처 확인, 4.2절 로그인과 로그아웃, 4.3절 내 정보). 바뀐 계약은 없다.

### 화면과 상태

phase 12에서 만든 화면을 그대로 쓴다. 바꾸지 않는다.

### 새 의존성

없음. BE를 띄우는 데 docker compose를 쓴다 (이미 설치됨).

## 작업 단계

- [ ] 1. GCP: 기본 Compute 서비스 계정에서 `roles/editor`를 뺀다. 남은 역할을 확인하고, 다음 빌드와 production 응답이 그대로인지 본다 (범위 7).
  - [x] 뺐다 (2026-11-26). 남은 프로젝트 역할 없음. production `/` 200 그대로
  - [ ] 이 PR의 `fe-pr` 빌드, 머지 뒤 `fe-main` 빌드가 성공하는지 (PR을 올린 뒤 리뷰에서 확인)
- [x] 2. BE `origin/main`을 임시 폴더에 풀고, 사용자가 `.env`에 Google 값을 넣는다. `docker compose up --build -d --wait`, 허용 목록에 계정 A를 넣는다. `GET /api/health` 200을 본다.
- [x] 3. 개발 서버 경로로 "확인할 것" 1~7을 사용자와 함께 본다. Claude는 BE 로그와 응답 헤더를, 사용자는 게스트 창의 화면을 본다.
- [x] 4. 컨테이너 경로로 같은 것을 본다.
- [x] 5. 결함이 나오면 이 문서를 고치고(계획 변경) FE를 고친다. 없으면 건너뛴다.
- [x] 6. architecture.md, 12 리뷰 문서 3절, 15 리뷰 문서를 고친다.
- [x] 7. BE를 내리고(`docker compose down -v`) 임시 폴더를 지운다. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process`를 통과시킨다.

## 완료 기준

- [x] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process`가 통과한다.
- [x] 개발 서버 경로에서 "확인할 것" 1~7의 결과가 기대와 같다 (계정 B가 없으면 5는 확인 못 함으로 적는다).
- [x] 컨테이너 경로에서 같은 결과다. 특히 2의 `Set-Cookie`와 4의 로그아웃 204가 nginx를 거쳐도 같다.
- [x] BE 작업 폴더의 브랜치와 파일이 바뀌지 않았다 (`git -C ../BE status`가 시작 전과 같다).
- [x] 비밀값, 이메일, 쿠키 값이 커밋·PR·대화에 없다.
- [x] architecture.md에 실제 BE로 로컬 개발하는 방법이 있다.
- [x] 12 리뷰 문서 3절의 실제 BE 항목이 채워졌다.
- [ ] 기본 Compute 서비스 계정에 `roles/editor`가 없고, 뺀 뒤에도 `fe-main`·`fe-pr` 빌드와 production이 정상이다.

## 위험과 열린 질문

1. **로그인 뒤 책 목록이 에러다**: BE에 책 API가 생기기 전(Epic 2)까지 실제 BE로는 로그인 흐름만 볼 수 있다. 로그인은 실제 BE, 책은 목으로 보는 모드(MSW가 `/api/auth`, `/api/me`를 그냥 넘기게)가 필요하면 다음 phase로 정한다.
2. **Google 동의 화면이 "테스트" 상태**: 테스트 사용자로 등록하지 않은 계정은 Google 화면에서 막혀 BE까지 오지 않는다. 그러면 5(허용 목록 밖)를 볼 수 없으므로, 계정 B도 테스트 사용자에는 넣고 허용 목록에는 넣지 않는다.
3. **Vite 프록시의 `changeOrigin: true`**: `Host`만 BE 주소로 바뀌고 `Origin`은 그대로라서 출처 확인을 통과할 것으로 본다. 4에서 확인한다.
4. **BE 결함이 나오면**: 이 phase에서 BE를 고치지 않는다. 재현 방법과 관찰한 값을 리뷰 문서에 적고 BE 담당자에게 알린다. FE가 우회하지 않는다.
5. **편집자 권한을 뺀 뒤의 영향**: 기본 Compute 계정을 쓰는 다른 GCP 기능이 지금은 없다. 나중에 기본 계정으로 도는 기능(예: 서비스 계정을 지정하지 않은 Cloud Run 서비스)을 만들면 그때 필요한 역할만 준다.

## 변경 기록

- 2026-11-26: 작성. BE Epic 1 머지 뒤 실제 BE로 로그인을 확인하는 phase. 기본 Compute 계정의 편집자 권한 빼기(사용자 결정)도 이 phase에 넣음
- 2026-11-26: 승인. 운영 주소가 아니라 로컬에서만 확인한다는 것을 사용자와 다시 확인함. 계정 A는 사용자가 알려 준 계정(이메일은 문서에 적지 않음). 이슈 #39 생성, 브랜치 `setup/39-be-login-local`
- 2026-11-26: 계획 변경 - BE 포트 8081. 8080을 code-server가 쓰고 있어 BE를 `API_PORT=8081`로 띄움 (로컬 구성에 적음). 단계 2~4 완료: 두 경로 모두 확인할 것 1~4, 6, 7이 기대와 같음(6·7은 개발 서버 경로에서). 5는 계정 B가 없어 확인 못 함. FE 결함 없음(단계 5 건너뜀)
- 2026-11-26: 단계 6·7 완료. 기본 Compute 계정의 `roles/editor`는 뺐고, 뺀 뒤의 `fe-pr`·`fe-main` 빌드는 PR을 올린 뒤 리뷰에서 확인한다 (완료 기준 마지막 항목은 그때 체크)
