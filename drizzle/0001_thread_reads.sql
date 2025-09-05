CREATE TABLE IF NOT EXISTS "thread_reads" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "thread_id" uuid NOT NULL REFERENCES "threads"("id") ON DELETE CASCADE,
  "last_read_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "thread_id")
);

