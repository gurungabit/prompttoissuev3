import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "./client";
import { messages, threads, threadReads, users } from "./schema";

export async function listThreads({ q, archived }: { q?: string; archived?: boolean }) {
  const db = getDb();
  const where = [] as any[];
  if (typeof archived === "boolean") where.push(eq(threads.archived, archived));
  if (q && q.trim()) {
    const needle = `%${q.trim()}%`;
    where.push(or(ilike(threads.title, needle), ilike(threads.summaryText, needle)));
  }
  const rows = await db
    .select()
    .from(threads)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(threads.createdAt));
  return rows;
}

export async function getOrCreateDevUserId() {
  const db = getDb();
  const email = "dev@local";
  const name = "Developer";
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [row] = await db
    .insert(users)
    .values({ email, displayName: name })
    .returning();
  return row.id;
}

export async function createThread({ title, ownerId }: { title?: string; ownerId?: string }) {
  const db = getDb();
  const owner = ownerId ?? (await getOrCreateDevUserId());
  const [row] = await db
    .insert(threads)
    .values({ title: title ?? "Untitled", ownerId: owner })
    .returning();
  return row;
}

export async function patchThread(id: string, patch: Partial<typeof threads.$inferInsert>) {
  const db = getDb();
  await db.update(threads).set(patch).where(eq(threads.id, id));
}

export async function deleteThread(id: string) {
  const db = getDb();
  await db.delete(threads).where(eq(threads.id, id));
}

export async function listMessages(threadId: string) {
  const db = getDb();
  const rows = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(messages.createdAt);
  return rows;
}

export async function createMessage(data: typeof messages.$inferInsert) {
  const db = getDb();
  const [row] = await db.insert(messages).values(data).returning();
  return row;
}

export async function getThread(id: string) {
  const db = getDb();
  const [row] = await db.select().from(threads).where(eq(threads.id, id)).limit(1);
  return row ?? null;
}

export async function patchMessage(id: string, patch: Partial<typeof messages.$inferInsert>) {
  const db = getDb();
  await db.update(messages).set(patch).where(eq(messages.id, id));
}

export async function deleteMessage(id: string) {
  const db = getDb();
  await db.delete(messages).where(eq(messages.id, id));
}

export async function markThreadRead(userId: string | undefined, threadId: string, lastReadAt: Date = new Date()) {
  const db = getDb();
  const uid = userId ?? (await getOrCreateDevUserId());
  await db
    .insert(threadReads)
    .values({ userId: uid, threadId, lastReadAt })
    .onConflictDoUpdate({
      target: [threadReads.userId, threadReads.threadId],
      set: { lastReadAt },
    });
}

export async function getThreadReads(userId: string, threadIds: string[]) {
  if (threadIds.length === 0) return [] as { threadId: string; lastReadAt: Date }[];
  const db = getDb();
  const rows = await db
    .select({ threadId: threadReads.threadId, lastReadAt: threadReads.lastReadAt })
    .from(threadReads)
    .where(and(eq(threadReads.userId, userId), inArray(threadReads.threadId, threadIds)));
  return rows;
}
