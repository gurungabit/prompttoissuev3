import { z } from "zod";

// GitLab API Response Types
export const GitLabProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  path: z.string(),
  path_with_namespace: z.string(),
  description: z.string().nullable(),
  default_branch: z.string(),
  web_url: z.string(),
  avatar_url: z.string().nullable(),
  visibility: z.enum(["private", "internal", "public"]),
  namespace: z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    kind: z.string(),
  }),
});

export const GitLabMilestoneSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.enum(["active", "closed"]),
  due_date: z.string().nullable(),
  start_date: z.string().nullable(),
  web_url: z.string(),
  project_id: z.number().optional(), // Optional for group milestones
  group_id: z.number().optional(), // Optional for project milestones
});

export const GitLabIssueSchema = z.object({
  id: z.number(),
  iid: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.enum(["opened", "closed"]),
  web_url: z.string(),
  project_id: z.number(),
  milestone: GitLabMilestoneSchema.nullable(),
  assignees: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      username: z.string(),
      avatar_url: z.string(),
    }),
  ),
  labels: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const GitLabGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  path: z.string(),
  full_path: z.string(),
});

export const GitLabUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  avatar_url: z.string(),
});

// Inferred Types
export type GitLabProject = z.infer<typeof GitLabProjectSchema>;
export type GitLabMilestone = z.infer<typeof GitLabMilestoneSchema>;
export type GitLabIssue = z.infer<typeof GitLabIssueSchema>;
export type GitLabGroup = z.infer<typeof GitLabGroupSchema>;
export type GitLabUser = z.infer<typeof GitLabUserSchema>;

// Request Types
export interface CreateIssueRequest {
  title: string;
  description?: string;
  milestone_id?: number;
  assignee_ids?: number[];
  labels?: string;
}

export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  milestone_id?: number;
  assignee_ids?: number[];
  labels?: string;
  state_event?: "close" | "reopen";
}

// Error Types
export class GitLabApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = "GitLabApiError";
  }
}
