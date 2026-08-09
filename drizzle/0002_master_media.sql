ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "hero_image_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "gallery_urls" jsonb DEFAULT '[]'::jsonb NOT NULL;
