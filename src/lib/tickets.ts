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

// GitLab integration schemas
export const GitLabAssignmentSchema = z.object({
  projectId: z.number(),
  projectName: z.string(),
  milestoneId: z.number().optional(),
  milestoneName: z.string().optional(),
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
  gitlabAssignment: GitLabAssignmentSchema.optional(), // For individual ticket assignments
});

export const TicketsPayloadSchema = z.object({
  type: z.literal("tickets"),
  tickets: z.array(TicketSchema),
  reasoning: z.string(),
  needsClarification: z.boolean(),
  clarificationQuestions: z.array(z.string()),
  // GitLab batch settings (when mode is "same")
  globalGitlabAssignment: GitLabAssignmentSchema.optional(),
  gitlabMode: z.enum(["same", "multiple"]).optional(),
});

export type TicketsPayload = z.infer<typeof TicketsPayloadSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type GitLabAssignment = z.infer<typeof GitLabAssignmentSchema>;

export function parseTicketsFromText(text: string): {
  payload: TicketsPayload | null;
  summaryText: string;
} {
  let working = text.trim();

  const codeBlockMatch = working.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch) {
    working = codeBlockMatch[1];
  } else if (working.startsWith("{") && working.endsWith("}")) {
    // already JSON
  } else {
    const startIndex = working.indexOf("{");
    const lastIndex = working.lastIndexOf("}");
    if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
      working = working.substring(startIndex, lastIndex + 1);
    }
  }

  try {
    const objUnknown = JSON.parse(working) as unknown;
    const parsed = TicketsPayloadSchema.safeParse(objUnknown);
    if (!parsed.success) {
      return {
        payload: null,
        summaryText:
          "Created tickets, but there was an issue parsing the details. Please check the ticket modal.",
      };
    }
    const count = parsed.data.tickets.length;
    const reasoning =
      parsed.data.reasoning ||
      "Breaking down requirements into actionable tickets";
    return {
      payload: parsed.data,
      summaryText: `Created ${count} ticket${
        count === 1 ? "" : "s"
      }.\n\nReasoning: ${reasoning}`,
    };
  } catch {
    return {
      payload: null,
      summaryText:
        "Created tickets based on your requirements, but couldn't parse the JSON format. Please try again.",
    };
  }
}
