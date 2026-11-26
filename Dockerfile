# Diegesis FE 컨테이너 (Phase 15). Cloud Run에서 nginx가 dist/를 내보내고 /api/ 만 BE로 넘긴다.
# 빌드: docker build --build-arg VITE_API_MOCK=true -t diegesis-fe .
# 실행: docker run --rm -p 8080:8080 [-e BE_ORIGIN=https://<BE 주소>] diegesis-fe

# 1단계: 화면 파일 빌드. 이 단계의 파일(소스, node_modules)은 실행 이미지에 남지 않는다.
# node:24-alpine (Node 24.22.3, 2026-11-11 빌드)
FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build
WORKDIR /app
# package.json의 packageManager(pnpm 버전)를 Corepack이 그대로 쓴다.
RUN corepack enable
# lockfile과 공급망 설정(pnpm-workspace.yaml)만 먼저 복사해서 설치 단계를 캐시한다.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Vite가 빌드 때 박아 넣는 값. true면 MSW 데모 모드 (docs/architecture.md 3장).
ARG VITE_API_MOCK=false
ENV VITE_API_MOCK=$VITE_API_MOCK
RUN pnpm build

# 2단계: 실행 이미지. 화면 파일과 nginx 설정만 담는다.
# nginx:stable-alpine (nginx 1.30.8, 2026-11-23 빌드)
FROM nginx:stable-alpine@sha256:8eb2b5540eae779603cc3db84b3986a15ecb5308b54303146eee9837c137b51a
# 기본 설정 대신 deploy/nginx의 설정을 쓴다.
RUN rm /etc/nginx/conf.d/default.conf && rm -rf /usr/share/nginx/html/*
COPY deploy/nginx/templates/ /etc/nginx/templates/
COPY deploy/nginx/snippets/ /etc/nginx/snippets/
COPY --chmod=755 deploy/nginx/40-api-upstream.sh /docker-entrypoint.d/40-api-upstream.sh
COPY --from=build /app/dist /usr/share/nginx/html
# Cloud Run이 PORT를 넣는다 (기본 8080). 템플릿의 ${PORT}에 들어간다.
ENV PORT=8080
# /etc/resolv.conf의 DNS 서버를 NGINX_LOCAL_RESOLVERS로 꺼내 준다 (공식 이미지의 15-local-resolvers.envsh).
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
EXPOSE 8080
