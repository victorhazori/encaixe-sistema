# Deploy do Encaixe

Este guia considera Ubuntu 22.04 ou superior, PostgreSQL, Nginx, PM2 e o domínio `encaixe.victorhazori.com.br`.

## 1. DNS

No provedor DNS de `victorhazori.com.br`, crie um registro:

- Tipo: `A`
- Nome/host: `encaixe`
- Valor: IP público IPv4 da VPS
- TTL: automático ou 300 segundos

Confirme a propagação antes de emitir o certificado.

## 2. Banco PostgreSQL

Crie banco e usuário próprios. Um exemplo no `psql`:

```sql
CREATE USER encaixe_producao WITH ENCRYPTED PASSWORD 'use-uma-senha-forte';
CREATE DATABASE encaixe OWNER encaixe_producao;
```

A porta 5432 não deve ficar pública. Monte a URL no formato:

```text
postgresql://encaixe_producao:SENHA@127.0.0.1:5432/encaixe
```

## 3. Código e variáveis

```bash
sudo mkdir -p /var/www/encaixe
sudo chown "$USER":"$USER" /var/www/encaixe
git clone https://github.com/victorhazori/encaixe-sistema.git /var/www/encaixe
cd /var/www/encaixe
cp .env.example .env
nano .env
```

Defina uma `JWT_SECRET` aleatória e longa, `DATABASE_URL` e `NODE_ENV=production`. Nunca envie o `.env` ao Git.

## 4. Instalação automatizada

```bash
cd /var/www/encaixe
chmod +x scripts/install-linux.sh
sudo ./scripts/install-linux.sh
```

Se outro proxy já estiver configurado:

```bash
sudo ./scripts/install-linux.sh --skip-nginx
```

O script é idempotente: instala apenas o que estiver ausente, recompila o projeto e recria o processo `encaixe-api` no PM2.

## 5. Migrações e dados iniciais

```bash
cd /var/www/encaixe
npm run db:migrate
npm run db:seed
pm2 restart encaixe-api
```

O seed cria o plano Basic e o ambiente demonstrativo. Em produção, troque a senha da conta demo ou remova esse tenant após validar a instalação.

## 6. HTTPS com Certbot

Depois que o DNS responder pelo IP da VPS:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d encaixe.victorhazori.com.br
sudo certbot renew --dry-run
```

O Certbot ajusta o bloco do Nginx e agenda a renovação automática.

## 7. WhatsApp (opcional, produção)

Na mesma VPS do Brasa, use o instalador dedicado (Evolution na porta **8081**, sem conflito com o Brasa em **8080**):

```bash
cd /var/www/encaixe
sudo bash scripts/install-whatsapp.sh
```

Detalhes multi-tenant: [`docs/WHATSAPP-PRODUCAO.MD`](./WHATSAPP-PRODUCAO.MD).

## 8. Operação

```bash
pm2 status
pm2 logs encaixe-api
sudo nginx -t
sudo systemctl reload nginx
```

Para atualizar:

```bash
cd /var/www/encaixe
git pull
npm ci
npm run build
npm run db:migrate
pm2 restart encaixe-api
```

Faça backup periódico do PostgreSQL com `pg_dump` e teste a restauração. Antes de abrir o produto ao público, remova credenciais de demonstração e limite SSH, banco e painel da VPS no firewall.
