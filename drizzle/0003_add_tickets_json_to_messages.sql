-- Add tickets_json column to messages
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "tickets_json" jsonb;

