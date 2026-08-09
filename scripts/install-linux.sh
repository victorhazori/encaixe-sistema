#!/usr/bin/env bash
# Publica o Encaixe no EC2 sem alterar outros sites (pessoal/delivery).
# Uso típico (código em /opt/sites/encaixe):
#   sudo bash scripts/install-linux.sh
#   sudo bash scripts/install-linux.sh --skip-nginx
set -euo pipefail

DOMINIO="encaixe.victorhazori.com.br"
WWW_ROOT="/var/www/encaixe"
PULAR_NGINX=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-nginx) PULAR_NGINX=true; shift ;;
    --domain)
      DOMINIO="${2:-}"
      if [[ -z "$DOMINIO" ]]; then
        echo "Use: --domain encaixe.victorhazori.com.br"
        exit 1
      fi
      shift 2
      ;;
    --domain=*) DOMINIO="${1#*=}"; shift ;;
    *) echo "Argumento desconhecido: $1"; exit 1 ;;
  esac
done

log() { printf '[encaixe-install] %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  log "Execute este script com sudo."
  exit 1
fi

if [[ ! -f "${PROJECT_DIR}/package.json" ]]; then
  log "package.json não encontrado em ${PROJECT_DIR}"
  exit 1
fi

log "Projeto: ${PROJECT_DIR}"
log "Domínio: ${DOMINIO}"
log "WWW: ${WWW_ROOT}"

cd "${PROJECT_DIR}"
npm ci
npm run build

# Copia o front estático para o Nginx
mkdir -p "${WWW_ROOT}/current"
rm -rf "${WWW_ROOT}/current/"*
cp -a "${PROJECT_DIR}/dist/." "${WWW_ROOT}/current/"

if [[ ! -f "${PROJECT_DIR}/.env" ]]; then
  cp "${PROJECT_DIR}/.env.example" "${PROJECT_DIR}/.env"
  # Em servidor Linux, nunca deixe PGlite (é só para Windows local)
  sed -i 's/^DATABASE_URL=pglite/# DATABASE_URL=pglite/' "${PROJECT_DIR}/.env" || true
  if ! grep -Eiq '^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*postgresql://' "${PROJECT_DIR}/.env"; then
    {
      echo ""
      echo "NODE_ENV=production"
      echo "DATABASE_URL=postgresql://encaixe:SENHA@127.0.0.1:5432/encaixe"
    } >> "${PROJECT_DIR}/.env"
  fi
  chmod 600 "${PROJECT_DIR}/.env"
  log "Arquivo .env criado. Defina DATABASE_URL postgresql:// e JWT_SECRET, depois: npm run db:migrate && npm run db:seed"
fi

if grep -Eiq '^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*pglite' "${PROJECT_DIR}/.env" 2>/dev/null; then
  log "ERRO: DATABASE_URL=pglite no servidor. Troque por postgresql://... no .env do Encaixe."
  exit 1
fi

# Migra o banco se DATABASE_URL estiver configurada
if grep -Eiq '^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*postgresql://' "${PROJECT_DIR}/.env" 2>/dev/null; then
  log "Rodando migrations (drizzle)…"
  (cd "${PROJECT_DIR}" && npm run db:migrate) || log "Aviso: migrate falhou — confira Postgres e DATABASE_URL"
else
  log "DATABASE_URL postgresql:// ausente — migrate adiado. Configure o .env e rode: npm run db:migrate && npm run db:seed"
fi

if [[ "$PULAR_NGINX" == false ]]; then
  if command -v nginx >/dev/null 2>&1; then
    TMP="$(mktemp)"
    sed "s|__ROOT__|${WWW_ROOT}/current|g; s|encaixe.victorhazori.com.br|${DOMINIO}|g" \
      "${PROJECT_DIR}/deploy/nginx-encaixe.conf.example" > "${TMP}"
    cp "${TMP}" /etc/nginx/sites-available/encaixe
    rm -f "${TMP}"
    ln -sfn /etc/nginx/sites-available/encaixe /etc/nginx/sites-enabled/encaixe
    nginx -t
    systemctl reload nginx
    log "Nginx atualizado (site encaixe)."
  else
    log "Nginx não encontrado — pulando vhost."
  fi
else
  log "Nginx ignorado (--skip-nginx)."
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete encaixe-api >/dev/null 2>&1 || true
  pm2 start npm --name encaixe-api --cwd "${PROJECT_DIR}" -- start
  pm2 save
  log "PM2: encaixe-api iniciado."
else
  log "PM2 não encontrado — inicie a API manualmente: cd ${PROJECT_DIR} && npm start"
fi

log "Concluído. Site: https://${DOMINIO}"
log "SSL: sudo certbot --nginx -d ${DOMINIO}"
