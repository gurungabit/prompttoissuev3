// GitLab API response types

import { z } from "zod";

// Types for GitLab API responses (minimal shapes we use)
export const ProjectShape = {
  id: z.number(),
  name: z.string(),
  name_with_namespace: z.string().optional(),
  path_with_namespace: z.string(),
  default_branch: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  web_url: z.string().optional(),
  visibility: z.string().optional(),
  created_at: z.string().optional(),
  last_activity_at: z.string().optional(),
};

export const BranchShape = {
  name: z.string(),
  default: z.boolean().optional(),
  protected: z.boolean().optional(),
};

export const TreeItemShape = {
  id: z.string().optional(),
  name: z.string(),
  type: z.enum(["blob", "tree"]),
  path: z.string(),
  mode: z.string().optional(),
};

export const BlobSearchResultShape = {
  filename: z.string(),
  path: z.string(),
  startline: z.number().optional(),
  ref: z.string().optional(),
  project_id: z.number().optional(),
  data: z.string().optional(),
};

export const LanguagesShape = z.record(z.string(), z.number());
