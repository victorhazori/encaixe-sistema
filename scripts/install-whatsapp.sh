#!/usr/bin/env bash
# =============================================================================
# Encaixe — instalador do WhatsApp (Evolution) em produção
# =============================================================================
# Para VPS Ubuntu/Debian onde o Encaixe (API + Nginx + PM2) JÁ está rodando.
# Coexiste com o Brasa na mesma máquina:
#   - Brasa Evolution  → 127.0.0.1:8080
#   - Encaixe Evolution → 127.0.0.1:8081
#
# SaaS multi-tenant:
#   - 1 Evolution compartilhada (Docker)
#   - 1 instância WhatsApp por negócio: encaixe-{slug}
#   - Webhook único na API Encaixe; o roteamento usa o nome da instância
#   - Sessões/mensagens isoladas por tenant_id no Postgres do Encaixe
#
# Uso (no servidor, na pasta do projeto):
#   cd /var/www/encaixe   # ou /opt/sites/encaixe
#   sudo bash scripts/install-whatsapp.sh
#
# Flags:
#   --dir /caminho/do/projeto
#   --non-interactive     (usa valores gerados / .env existente)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $*"; }
info() { echo -e "${CYAN}→${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }
die()  { err "$*"; exit 1; }

APP_DIR=""
NON_INTERACTIVE=0
EVOLUTION_PORT=8081
API_PORT=5000

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) APP_DIR="${2:-}"; shift 2 ;;
    --dir=*) APP_DIR="${1#*=}"; shift ;;
    --non-interactive) NON_INTERACTIVE=1; shift ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *) die "Argumento desconhecido: $1" ;;
  esac
done

need_root() {
  [[ "${EUID}" -eq 0 ]] || die "Execute com sudo: sudo bash scripts/install-whatsapp.sh"
}

rand_hex() {
  openssl rand -hex "${1:-24}"
}

detect_app_dir() {
  if [[ -n "${APP_DIR}" ]]; then
    [[ -f "${APP_DIR}/package.json" ]] || die "package.json não encontrado em ${APP_DIR}"
    return
  fi
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local candidate
  candidate="$(cd "${script_dir}/.." && pwd)"
  if [[ -f "${candidate}/package.json" ]]; then
    APP_DIR="${candidate}"
    return
  fi
  for candidate in /var/www/encaixe /opt/sites/encaixe; do
    if [[ -f "${candidate}/package.json" ]]; then
      APP_DIR="${candidate}"
      return
    fi
  done
  die "Pasta do Encaixe não encontrada. Use: --dir /caminho/do/projeto"
}

ask_yn() {
  local prompt="$1" default="${2:-y}" ans
  if [[ "${NON_INTERACTIVE}" -eq 1 ]]; then
    [[ "${default}" == "y" ]]
    return
  fi
  read -r -p "${prompt} [$([[ "${default}" == "y" ]] && echo Y/n || echo y/N)]: " ans || true
  ans="${ans:-$default}"
  [[ "${ans}" =~ ^[YySs] ]]
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker já instalado: $(docker --version)"
  else
    info "Instalando Docker…"
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    log "Docker instalado."
  fi
  if ! docker compose version >/dev/null 2>&1; then
    die "docker compose não disponível. Instale o plugin compose."
  fi
}

ensure_env_whatsapp() {
  local env_file="${APP_DIR}/.env"
  [[ -f "${env_file}" ]] || die "Arquivo .env não existe em ${APP_DIR}. Instale o Encaixe primeiro (scripts/install-linux.sh)."

  local evo_key evo_db webhook_secret
  if grep -Eq '^[[:space:]]*EVOLUTION_API_KEY=' "${env_file}"; then
    evo_key="$(grep -E '^[[:space:]]*EVOLUTION_API_KEY=' "${env_file}" | tail -1 | cut -d= -f2-)"
  else
    evo_key="$(rand_hex 24)"
  fi
  if grep -Eq '^[[:space:]]*EVOLUTION_DB_PASSWORD=' "${env_file}"; then
    evo_db="$(grep -E '^[[:space:]]*EVOLUTION_DB_PASSWORD=' "${env_file}" | tail -1 | cut -d= -f2-)"
  else
    evo_db="$(rand_hex 16)"
  fi
  if grep -Eq '^[[:space:]]*EVOLUTION_WEBHOOK_SECRET=' "${env_file}"; then
    webhook_secret="$(grep -E '^[[:space:]]*EVOLUTION_WEBHOOK_SECRET=' "${env_file}" | tail -1 | cut -d= -f2-)"
  else
    webhook_secret="$(rand_hex 24)"
  fi

  if grep -Eq '^[[:space:]]*PORT=' "${env_file}"; then
    API_PORT="$(grep -E '^[[:space:]]*PORT=' "${env_file}" | tail -1 | cut -d= -f2- | tr -d '[:space:]')"
  fi
  [[ -n "${API_PORT}" ]] || API_PORT=5000

  # Remove bloco antigo de WhatsApp (se houver) e reescreve
  local tmp
  tmp="$(mktemp)"
  grep -Ev '^[[:space:]]*(WHATSAPP_PROVIDER|EVOLUTION_API_URL|EVOLUTION_API_KEY|EVOLUTION_DB_PASSWORD|EVOLUTION_SERVER_URL|EVOLUTION_WEBHOOK_SECRET|EVOLUTION_WEBHOOK_HOST|EVOLUTION_WEBHOOK_URL)=' \
    "${env_file}" > "${tmp}" || true

  {
    cat "${tmp}"
    echo ""
    echo "# --- WhatsApp / Evolution (Encaixe SaaS) — gerado por install-whatsapp.sh ---"
    echo "WHATSAPP_PROVIDER=evolution"
    echo "EVOLUTION_API_URL=http://127.0.0.1:${EVOLUTION_PORT}"
    echo "EVOLUTION_SERVER_URL=http://127.0.0.1:${EVOLUTION_PORT}"
    echo "EVOLUTION_API_KEY=${evo_key}"
    echo "EVOLUTION_DB_PASSWORD=${evo_db}"
    echo "EVOLUTION_WEBHOOK_SECRET=${webhook_secret}"
    echo "EVOLUTION_WEBHOOK_HOST=host.docker.internal"
    echo "# Webhook montado automaticamente ao gerar QR: http://host.docker.internal:${API_PORT}/api/webhooks/evolution"
  } > "${env_file}"
  rm -f "${tmp}"
  chmod 600 "${env_file}"

  EVOLUTION_API_KEY="${evo_key}"
  EVOLUTION_DB_PASSWORD="${evo_db}"
  EVOLUTION_WEBHOOK_SECRET="${webhook_secret}"

  local secrets_file="/root/encaixe-whatsapp-$(date +%Y%m%d-%H%M%S).txt"
  umask 077
  cat > "${secrets_file}" <<EOF
================================================================================
ENCAIXE — WhatsApp / Evolution (produção)
Gerado em: $(date -Is)
GUARDE E APAGUE DEPOIS DE COPIAR.
================================================================================

Pasta:                    ${APP_DIR}
Evolution (localhost):    http://127.0.0.1:${EVOLUTION_PORT}
API Encaixe:              http://127.0.0.1:${API_PORT}

EVOLUTION_API_KEY:        ${EVOLUTION_API_KEY}
EVOLUTION_DB_PASSWORD:    ${EVOLUTION_DB_PASSWORD}
EVOLUTION_WEBHOOK_SECRET: ${EVOLUTION_WEBHOOK_SECRET}

Webhook (interno Docker):
  http://host.docker.internal:${API_PORT}/api/webhooks/evolution?apikey=${EVOLUTION_WEBHOOK_SECRET}

Multi-tenant:
  - Instância por loja: encaixe-{slug}
  - Master autoriza o módulo; a loja gera o QR no painel admin
  - Mensagens isoladas por tenant_id

NÃO exponha a porta ${EVOLUTION_PORT} na internet.
================================================================================
EOF
  chmod 600 "${secrets_file}"
  SECRETS_FILE="${secrets_file}"
  log ".env atualizado com WhatsApp."
  log "Credenciais salvas em: ${SECRETS_FILE}"
}

start_evolution() {
  info "Subindo Evolution do Encaixe (porta ${EVOLUTION_PORT}, projeto encaixe-wa)…"
  cd "${APP_DIR}"
  export EVOLUTION_API_KEY
  export EVOLUTION_DB_PASSWORD
  export EVOLUTION_SERVER_URL="http://127.0.0.1:${EVOLUTION_PORT}"

  # project-name evita colidir com containers do Brasa
  docker compose -f docker-compose.whatsapp.yml --project-name encaixe-wa up -d

  sleep 8
  echo
  docker ps --filter "name=encaixe-wa" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || \
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -n 20
  echo
  warn "Confira 3 containers do projeto encaixe-wa (api/redis/postgres)."
  warn "Brasa continua em :8080; Encaixe WhatsApp em :${EVOLUTION_PORT}."
}

restart_api() {
  info "Reiniciando API Encaixe para carregar .env…"
  if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe encaixe-api >/dev/null 2>&1; then
      pm2 restart encaixe-api --update-env || true
      # recreate com cwd certo
      pm2 delete encaixe-api >/dev/null 2>&1 || true
      pm2 start npm --name encaixe-api --cwd "${APP_DIR}" -- start
      pm2 save
      log "PM2 encaixe-api reiniciado."
    else
      warn "Processo encaixe-api não encontrado no PM2. Suba a API e rode de novo se precisar."
    fi
  else
    warn "PM2 não encontrado — reinicie a API manualmente."
  fi
}

verify() {
  info "Verificando…"
  if curl -fsS --max-time 5 "http://127.0.0.1:${EVOLUTION_PORT}" >/dev/null 2>&1 \
    || curl -fsS --max-time 5 -o /dev/null -w '' "http://127.0.0.1:${EVOLUTION_PORT}/"; then
    log "Evolution responde em :${EVOLUTION_PORT}"
  else
    # Evolution pode responder 401 sem path — ainda assim a porta está aberta
    if ss -lnt | grep -q ":${EVOLUTION_PORT}"; then
      log "Porta ${EVOLUTION_PORT} em escuta (Evolution)."
    else
      warn "Evolution pode não ter subido. Veja: docker compose -f docker-compose.whatsapp.yml --project-name encaixe-wa logs --tail=80"
    fi
  fi
  if curl -fsS --max-time 5 "http://127.0.0.1:${API_PORT}/api/master/config" >/dev/null 2>&1; then
    log "API Encaixe responde."
  else
    warn "API :${API_PORT} não respondeu config (normal se exigir auth). Confira: pm2 logs encaixe-api"
  fi
}

print_summary() {
  echo
  echo -e "${BOLD}============================================================${NC}"
  echo -e "${BOLD}  WhatsApp Encaixe instalado${NC}"
  echo -e "${BOLD}============================================================${NC}"
  echo
  echo "  Credenciais: ${SECRETS_FILE}"
  echo "  Evolution:   http://127.0.0.1:${EVOLUTION_PORT} (somente localhost)"
  echo
  echo "  Como usar (SaaS):"
  echo "    1. Master → Planos: feature whatsapp_bot no plano"
  echo "    2. Master → WhatsApp: autorizar o negócio"
  echo "    3. Loja → WhatsApp → Integração e bot: ativar + Gerar QR"
  echo "    4. Cada loja tem instância isolada: encaixe-{slug}"
  echo
  echo "  Comandos úteis:"
  echo "    docker compose -f ${APP_DIR}/docker-compose.whatsapp.yml --project-name encaixe-wa ps"
  echo "    docker compose -f ${APP_DIR}/docker-compose.whatsapp.yml --project-name encaixe-wa logs -f evolution-api"
  echo "    pm2 logs encaixe-api --lines 80"
  echo
  warn "Não abra a porta ${EVOLUTION_PORT} no firewall público."
  echo
}

main() {
  echo
  echo -e "${BOLD}============================================================${NC}"
  echo -e "${BOLD}  Encaixe — WhatsApp (Evolution) produção${NC}"
  echo -e "${BOLD}============================================================${NC}"
  echo "  Multi-tenant · porta ${EVOLUTION_PORT} · não conflita com Brasa :8080"
  echo

  need_root
  detect_app_dir
  info "Projeto: ${APP_DIR}"

  if [[ ! -t 0 && "${NON_INTERACTIVE}" -ne 1 ]]; then
    die "Sem TTY. Use --non-interactive ou rode em SSH interativo."
  fi

  ask_yn "Instalar/atualizar Evolution + configurar .env do Encaixe" "y" || die "Cancelado."

  install_docker
  ensure_env_whatsapp
  start_evolution
  restart_api
  verify
  print_summary
}

main "$@"
