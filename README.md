# Encaixe

MVP SaaS multi-tenant de agendamentos para prestadores de serviços. Inclui página pública de reserva, cálculo de disponibilidade, painel administrativo e área básica do cliente.

Produção planejada: [encaixe.victorhazori.com.br](https://encaixe.victorhazori.com.br)

## Tecnologias

- React 19, Vite, TypeScript e React Router
- Express 5, JWT, bcryptjs e Zod
- PostgreSQL e Drizzle ORM
- Nginx e PM2 para produção

## Rodar localmente

Requisitos: Node.js 22 ou superior, npm e Docker.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

No Windows PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`.

Endereços:

- Reserva demo: `http://localhost:5173/barbearia-demo`
- Painel: `http://localhost:5173/admin`
- API: `http://localhost:5000/api/health`

Credenciais demonstrativas:

- E-mail: `admin@demo.encaixe`
- Senha: `Demo@1234`
- Identificador: `barbearia-demo`

## Scripts

- `npm run dev`: frontend e API com recarga automática
- `npm run dev:server`: somente API
- `npm run build`: valida TypeScript e gera `dist`
- `npm run db:generate`: gera migrações a partir do schema
- `npm run db:migrate`: aplica migrações
- `npm run db:seed`: cria dados demonstrativos

Sem `DATABASE_URL`, a API, as migrações e o seed encerram com mensagem clara. O frontend ainda pode ser compilado normalmente.

## Estrutura

```text
src/                 aplicação React
server/              API Express, autenticação e banco
server/db/schema.ts  schema multi-tenant
drizzle/             migrações SQL versionadas
deploy/              exemplo de configuração Nginx
scripts/             instalação Linux idempotente
docs/                documentação operacional
```

Todas as consultas de negócio da API são limitadas pelo tenant. A criação de agendamento usa transação e bloqueio consultivo no PostgreSQL para impedir concorrência de horários.

## Escopo Basic

O MVP cobre serviços, profissionais, jornadas, bloqueios, agenda, identidade visual, reserva pública, cadastro/login de cliente e cancelamento. WhatsApp, IA, pagamentos e cobrança de assinatura ficam fora desta etapa.

Consulte [docs/DEPLOY.md](docs/DEPLOY.md) para publicar na VPS.
