# WhatsApp no Encaixe

## Quem configura o quê

| Papel | O que faz |
|-------|-----------|
| **Master** | Autoriza o módulo + features do plano (`whatsapp_bot` / `whatsapp_ai`) |
| **Loja** | Ativa bot, mensagens, QR, conversas e simulador |

## Local (sem Docker)

```env
WHATSAPP_PROVIDER=console
```

Use **Simulador de chat** no `/admin`.

## Produção (Evolution multi-tenant)

Guia completo: [`WHATSAPP-PRODUCAO.MD`](./WHATSAPP-PRODUCAO.MD)

```bash
sudo bash scripts/install-whatsapp.sh
```

- Evolution do Encaixe em `127.0.0.1:8081` (Brasa fica em `:8080`)
- Instância por loja: `encaixe-{slug}`
- Webhook: `POST /api/webhooks/evolution`

## Menu do bot (regras)

1. Próximos agendamentos  
2. Cancelar agendamento  
3. Falar com atendente (`*bot*` volta ao automático)
