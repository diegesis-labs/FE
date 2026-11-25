#!/bin/sh
# /api/ 요청을 어떻게 다룰지 정한다 (Phase 15). nginx 공식 이미지가 시작할 때 /docker-entrypoint.d/ 의 스크립트로 실행한다.
# - BE_ORIGIN이 비어 있으면 404 (BE가 배포되기 전, 데모 모드)
# - BE_ORIGIN이 있으면 그 출처로 넘긴다. 예: BE_ORIGIN=https://diegesis-be-123.asia-northeast3.run.app
# 값이 잘못되면 컨테이너가 뜨지 않게 실패한다. 빈 proxy_pass로 조용히 뜨는 것보다 배포 실패가 낫다.
set -eu

out=/etc/nginx/api.conf
me=$(basename "$0")

if [ -z "${BE_ORIGIN:-}" ]; then
  cat > "$out" <<'EOF'
default_type text/plain;
return 404 "Not Found\n";
EOF
  echo "$me: BE_ORIGIN 없음. /api/ 는 404를 준다."
  exit 0
fi

origin="${BE_ORIGIN%/}"
case "$origin" in
  https://* | http://*) ;;
  *)
    echo "$me: BE_ORIGIN은 https://호스트 형태여야 한다: $BE_ORIGIN" >&2
    exit 1
    ;;
esac
case "${origin#*://}" in
  "" | */* | *[!A-Za-z0-9.:-]*)
    echo "$me: BE_ORIGIN에는 경로 없이 출처(호스트와 포트)만 쓴다: $BE_ORIGIN" >&2
    exit 1
    ;;
esac

# BE 주소를 시작할 때 한 번만 풀지 않고 30초마다 다시 푼다 (Cloud Run 주소의 IP는 바뀔 수 있다).
resolver="${NGINX_LOCAL_RESOLVERS:-}"
if [ -z "$resolver" ]; then
  echo "$me: /etc/resolv.conf에서 DNS 서버를 찾지 못했다." >&2
  exit 1
fi

cat > "$out" <<EOF
resolver $resolver valid=30s ipv6=off;
set \$diegesis_be_origin "$origin";
# 변수로 주고 URI를 붙이지 않으면 요청 경로(/api/...)와 쿼리가 그대로 넘어간다.
proxy_pass \$diegesis_be_origin;
proxy_http_version 1.1;

# Host는 BE 호스트(\$proxy_host, 기본값)로 넘긴다. Cloud Run은 Host로 서비스를 고르기 때문이다.
# HTTPS 인증서를 확인하고, 같은 호스트 이름으로 SNI를 보낸다.
proxy_ssl_server_name on;
proxy_ssl_verify on;
proxy_ssl_verify_depth 3;
proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;

# 브라우저가 본 주소와 프로토콜. Origin, Cookie는 건드리지 않고 그대로 넘긴다 (BE의 ORIGIN_MISMATCH 검사, 로그인 쿠키).
proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto \$diegesis_forwarded_proto;
proxy_set_header X-Forwarded-Host \$host;

# 묶음 적재(POST /api/admin/bundles): Cloud Run 요청 본문 상한(32MiB)에 맞추고, 적재 시간을 기다린다.
client_max_body_size 32m;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
EOF
echo "$me: /api/ 를 $origin 으로 넘긴다 (resolver $resolver)."
