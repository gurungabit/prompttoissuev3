import { pgTable, text, boolean, timestamp, integer, uuid, primaryKey, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  archived: boolean("archived").notNull().default(false),
  pinned: boolean("pinned").notNull().default(false),
  defaultModel: text("default_model"),
  summaryText: text("summary_text"),
  summaryModel: text("summary_model"),
  summaryUpdatedAt: timestamp("summary_updated_at", { withTimezone: true }),
  summaryJson: jsonb("summary_json"),
  turnCount: integer("turn_count").notNull().default(0),
  tokenEstimate: integer("token_estimate").notNull().default(0),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  pinned: boolean("pinned").notNull().default(false),
});

export const threadReads = pgTable(
  "thread_reads",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.threadId] }) }),
);
