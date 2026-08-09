# WhatsApp em produção (Encaixe SaaS)

Este guia é para a **mesma VPS** onde já roda o Brasa (ou qualquer Ubuntu/Debian com o Encaixe instalado).

## Arquitetura multi-tenant

| Camada | Isolamento |
|--------|------------|
| Evolution API | **Uma** para o Encaixe (Docker, porta **8081**) |
| Instância WhatsApp | **Uma por negócio**: `encaixe-{slug}` |
| Sessões / logs | Tabelas `wa_sessions` e `wa_message_log` com `tenant_id` |
| Webhook | Único na API: `/api/webhooks/evolution` — roteia pelo nome da instância |

Assim o bot da barbearia A **não** mistura conversa com a clínica B.

### Convivência com o Brasa

| Sistema | Evolution | Porta host |
|---------|-----------|------------|
| Brasa delivery | stack própria | `127.0.0.1:8080` |
| Encaixe | stack `encaixe-wa` | `127.0.0.1:8081` |

Não abra essas portas na internet. QR e status ficam no painel admin.

## Instalação (script)

No servidor, na pasta do Encaixe:

```bash
cd /var/www/encaixe   # ajuste se o path for outro
sudo bash scripts/install-whatsapp.sh
```

O script:

1. Instala Docker (se faltar)
2. Gera/atualiza chaves no `.env`
3. Sobe Redis + Postgres + Evolution (`--project-name encaixe-wa`)
4. Reinicia o PM2 `encaixe-api`
5. Salva credenciais em `/root/encaixe-whatsapp-*.txt`

Não interativo:

```bash
sudo bash scripts/install-whatsapp.sh --dir /var/www/encaixe --non-interactive
```

## Depois do script

1. **Master** → Planos: plano com `whatsapp_bot`
2. **Master** → WhatsApp: **Autorizar** o negócio
3. **Loja** → WhatsApp → Integração e bot: ativar, salvar, **Gerar QR**
4. Escaneie com o celular da loja
5. Teste no **Simulador** e depois no WhatsApp real

Ao gerar o QR, a API configura o webhook daquela instância para:

`http://host.docker.internal:PORTA/api/webhooks/evolution?apikey=SEGREDO`

## Variáveis (`.env`)

```env
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=http://127.0.0.1:8081
EVOLUTION_SERVER_URL=http://127.0.0.1:8081
EVOLUTION_API_KEY=...
EVOLUTION_DB_PASSWORD=...
EVOLUTION_WEBHOOK_SECRET=...
EVOLUTION_WEBHOOK_HOST=host.docker.internal
```

## Operação

```bash
# Status
docker compose -f docker-compose.whatsapp.yml --project-name encaixe-wa ps
pm2 logs encaixe-api --lines 80

# Logs Evolution
docker compose -f docker-compose.whatsapp.yml --project-name encaixe-wa logs --tail=100 evolution-api

# Parar só o WhatsApp do Encaixe (não mexe no Brasa)
docker compose -f docker-compose.whatsapp.yml --project-name encaixe-wa down
```

## Checklist se o bot não responde

1. Master autorizou + plano com `whatsapp_bot`?
2. Loja ativou a integração?
3. Evolution `open` no painel (QR escaneado)?
4. `WHATSAPP_PROVIDER=evolution` no `.env` e API reiniciada?
5. Containers `encaixe-wa` Up?
6. Logs da API mostram `[wa-webhook]`?
