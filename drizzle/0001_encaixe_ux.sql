ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "icon" varchar(40) DEFAULT 'scissors' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "extra_service_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
