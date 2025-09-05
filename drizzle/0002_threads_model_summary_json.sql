ALTER TABLE "threads" ADD COLUMN IF NOT EXISTS "default_model" text;
ALTER TABLE "threads" ADD COLUMN IF NOT EXISTS "summary_json" jsonb;

