import { z } from "zod";
import { TicketsPayloadSchema } from "./tickets";

export const MessageRole = z.enum(["user", "assistant", "system"]);

export const MessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  role: MessageRole,
  content: z.string(),
  model: z.string().nullish(),
  ticketsJson: TicketsPayloadSchema.optional().nullable(),
  createdAt: z.string(), // ISO
  pinned: z.boolean().optional().default(false),
});
export type Message = z.infer<typeof MessageSchema>;

export const ThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  ownerId: z.string().optional(),
  createdAt: z.string(), // ISO
  archived: z.boolean().default(false),
  pinned: z.boolean().default(false),
  defaultModel: z.string().optional().nullable(),
  summaryText: z.string().optional().nullable(),
  summaryModel: z.string().optional().nullable(),
  summaryUpdatedAt: z.string().optional().nullable(),
  summaryJson: z.any().optional().nullable(),
  turnCount: z.number().int().nonnegative().default(0),
  tokenEstimate: z.number().int().nonnegative().default(0),
});
export type Thread = z.infer<typeof ThreadSchema>;

export const PaginatedThreads = z.object({
  items: z.array(ThreadSchema),
  nextCursor: z.string().optional().nullable(),
});
export type PaginatedThreads = z.infer<typeof PaginatedThreads>;

// Extended thread list item that includes last message preview for sidebar
export const ThreadListItemSchema = ThreadSchema.extend({
  lastMessagePreview: z.string().optional().nullable(),
  unread: z.boolean().optional().nullable(),
});
export type ThreadListItem = z.infer<typeof ThreadListItemSchema>;

export const PaginatedThreadsWithPreview = z.object({
  items: z.array(ThreadListItemSchema),
  nextCursor: z.string().optional().nullable(),
});
export type PaginatedThreadsWithPreview = z.infer<
  typeof PaginatedThreadsWithPreview
>;

export const PaginatedMessages = z.object({
  items: z.array(MessageSchema),
  nextCursor: z.string().optional().nullable(),
});
export type PaginatedMessages = z.infer<typeof PaginatedMessages>;
