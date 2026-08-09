ALTER TABLE "tenant_whatsapp" ADD COLUMN IF NOT EXISTS "authorized" boolean DEFAULT false NOT NULL;
