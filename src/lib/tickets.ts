import { z } from "zod";

export const AcceptanceCriterionSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean(),
});

export const TaskItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean(),
});

export const TicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  tasks: z.array(TaskItemSchema),
  labels: z.array(z.string()),
  priority: z.enum(["low", "medium", "high", "critical"]),
  type: z.enum(["feature", "bug", "task", "improvement"]),
});

export const TicketsPayloadSchema = z.object({
  type: z.literal("tickets"),
  tickets: z.array(TicketSchema),
  reasoning: z.string(),
  needsClarification: z.boolean(),
  clarificationQuestions: z.array(z.string()),
});

export type TicketsPayload = z.infer<typeof TicketsPayloadSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
