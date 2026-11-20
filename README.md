# Diegesis FE

Diegesis 웹 프론트엔드. Vite + React + TypeScript SPA.

기술스택, 폴더 구조, BE 연동 방식은 [docs/architecture.md](docs/architecture.md)에 정리되어 있다.

## 시작하기

Node 24 이상이 필요하다. pnpm 버전은 `package.json`의 `packageManager`로 고정되어 있으니 Corepack으로 맞춘다.

```bash
corepack enable        # 처음 한 번
pnpm install
cp .env.example .env.local   # 필요하면 BE 주소 수정
pnpm dev               # http://localhost:5173
```

## 스크립트

| 명령                                | 설명                                                 |
| ----------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                          | 개발 서버                                            |
| `pnpm build`                        | 타입 체크 + 프로덕션 빌드 (`dist/`)                  |
| `pnpm preview`                      | 빌드 결과 미리보기                                   |
| `pnpm lint`                         | ESLint + FSD 규칙 검사(steiger) + 가드레일 자체 검사 |
| `pnpm typecheck`                    | TypeScript 타입 체크                                 |
| `pnpm format` / `pnpm format:check` | Prettier 포맷 적용 / 확인                            |

## UI 컴포넌트 추가

shadcn/ui 컴포넌트는 CLI로 레포에 복사해서 쓴다.

```bash
pnpm dlx shadcn@latest add dialog
```
