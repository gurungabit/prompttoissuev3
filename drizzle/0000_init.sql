CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "owner_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "archived" boolean NOT NULL DEFAULT false,
  "pinned" boolean NOT NULL DEFAULT false,
  "summary_text" text,
  "summary_model" text,
  "summary_updated_at" timestamptz,
  "turn_count" integer NOT NULL DEFAULT 0,
  "token_estimate" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL REFERENCES "threads"("id") ON DELETE CASCADE,
  "role" text NOT NULL CHECK ("role" IN ('user','assistant','system')),
  "content" text NOT NULL,
  "model" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "pinned" boolean NOT NULL DEFAULT false
);

