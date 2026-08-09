ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "features" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_whatsapp" (
  "tenant_id" integer PRIMARY KEY NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "enabled" boolean DEFAULT false NOT NULL,
  "phone" varchar(30),
  "welcome_message" text,
  "handoff_message" text,
  "mode" varchar(20) DEFAULT 'rules' NOT NULL,
  "evolution_instance" varchar(120),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wa_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "phone" varchar(30) NOT NULL,
  "state" varchar(60) DEFAULT 'idle' NOT NULL,
  "draft" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "handoff" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wa_sessions_tenant_phone_idx" ON "wa_sessions" ("tenant_id","phone");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wa_message_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "phone" varchar(30) NOT NULL,
  "direction" varchar(10) NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
