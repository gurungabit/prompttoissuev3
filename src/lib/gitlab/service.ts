import {
  type CreateIssueRequest,
  GitLabApiError,
  type GitLabGroup,
  GitLabGroupSchema,
  type GitLabIssue,
  GitLabIssueSchema,
  type GitLabMilestone,
  GitLabMilestoneSchema,
  type GitLabProject,
  GitLabProjectSchema,
  type GitLabUser,
  GitLabUserSchema,
  type UpdateIssueRequest,
} from "./types";

export class GitLabService {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = "https://gitlab.com/api/v4", token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.token = token;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GitLabApiError(
          `GitLab API Error: ${response.status} ${response.statusText}`,
          response.status,
          errorData,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof GitLabApiError) {
        throw error;
      }
      throw new GitLabApiError(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        0,
      );
    }
  }

  // User Operations
  async getCurrentUser(): Promise<GitLabUser> {
    const data = await this.makeRequest<unknown>("/user");
    return GitLabUserSchema.parse(data);
  }

  // Project Operations
  async getProjects(
    options: {
      search?: string;
      membership?: boolean;
      owned?: boolean;
      per_page?: number;
      page?: number;
    } = {},
  ): Promise<GitLabProject[]> {
    const params = new URLSearchParams();

    if (options.search) params.append("search", options.search);
    if (options.membership) params.append("membership", "true");
    if (options.owned) params.append("owned", "true");
    params.append("per_page", String(options.per_page || 100));
    params.append("page", String(options.page || 1));
    params.append("order_by", "last_activity_at");
    params.append("sort", "desc");

    const data = await this.makeRequest<unknown[]>(
      `/projects?${params.toString()}`,
    );
    return data.map((project) => GitLabProjectSchema.parse(project));
  }

  async getProject(projectId: number): Promise<GitLabProject> {
    const data = await this.makeRequest<unknown>(`/projects/${projectId}`);
    return GitLabProjectSchema.parse(data);
  }

  // Milestone Operations
  async getProjectMilestones(
    projectId: number,
    options: {
      state?: "active" | "closed";
      search?: string;
    } = {},
  ): Promise<GitLabMilestone[]> {
    const params = new URLSearchParams();
    if (options.state) params.append("state", options.state);
    if (options.search) params.append("search", options.search);

    const data = await this.makeRequest<unknown[]>(
      `/projects/${projectId}/milestones?${params.toString()}`,
    );
    return data.map((milestone) => GitLabMilestoneSchema.parse(milestone));
  }

  async getAllMilestones(
    projects: GitLabProject[],
    options: { state?: "active" | "closed" } = {},
  ): Promise<(GitLabMilestone & { project: GitLabProject })[]> {
    const milestonePromises = projects.map(async (project) => {
      try {
        const milestones = await this.getProjectMilestones(project.id, options);
        return milestones.map((milestone) => ({ ...milestone, project }));
      } catch (error) {
        // Some projects might not have milestones or permission issues
        console.warn(
          `Failed to fetch milestones for project ${project.name}:`,
          error,
        );
        return [];
      }
    });

    const results = await Promise.allSettled(milestonePromises);
    return results
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<
          (GitLabMilestone & { project: GitLabProject })[]
        > => result.status === "fulfilled",
      )
      .flatMap((result) => result.value);
  }

  // Issue Operations
  async getProjectIssues(
    projectId: number,
    options: {
      state?: "opened" | "closed" | "all";
      milestone_id?: number;
      assignee_id?: number;
      search?: string;
      per_page?: number;
      page?: number;
    } = {},
  ): Promise<GitLabIssue[]> {
    const params = new URLSearchParams();

    if (options.state) params.append("state", options.state);
    if (options.milestone_id)
      params.append("milestone_id", String(options.milestone_id));
    if (options.assignee_id)
      params.append("assignee_id", String(options.assignee_id));
    if (options.search) params.append("search", options.search);
    params.append("per_page", String(options.per_page || 100));
    params.append("page", String(options.page || 1));

    const data = await this.makeRequest<unknown[]>(
      `/projects/${projectId}/issues?${params.toString()}`,
    );
    return data.map((issue) => GitLabIssueSchema.parse(issue));
  }

  async createIssue(
    projectId: number,
    issue: CreateIssueRequest,
  ): Promise<GitLabIssue> {
    const data = await this.makeRequest<unknown>(
      `/projects/${projectId}/issues`,
      {
        method: "POST",
        body: JSON.stringify(issue),
      },
    );
    return GitLabIssueSchema.parse(data);
  }

  async updateIssue(
    projectId: number,
    issueIid: number,
    updates: UpdateIssueRequest,
  ): Promise<GitLabIssue> {
    const data = await this.makeRequest<unknown>(
      `/projects/${projectId}/issues/${issueIid}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      },
    );
    return GitLabIssueSchema.parse(data);
  }

  async deleteIssue(projectId: number, issueIid: number): Promise<void> {
    await this.makeRequest(`/projects/${projectId}/issues/${issueIid}`, {
      method: "DELETE",
    });
  }

  // Group Operations
  async getGroups(
    options: { membership?: boolean; per_page?: number; page?: number } = {},
  ): Promise<GitLabGroup[]> {
    const params = new URLSearchParams();

    if (options.membership) params.append("membership", "true");
    params.append("per_page", String(options.per_page || 100));
    params.append("page", String(options.page || 1));

    const data = await this.makeRequest<unknown[]>(
      `/groups?${params.toString()}`,
    );
    return data.map((group) => GitLabGroupSchema.parse(group));
  }

  async getGroupMilestones(
    groupId: number,
    options: {
      state?: "active" | "closed";
      search?: string;
    } = {},
  ): Promise<GitLabMilestone[]> {
    const params = new URLSearchParams();
    if (options.state) params.append("state", options.state);
    if (options.search) params.append("search", options.search);

    const data = await this.makeRequest<unknown[]>(
      `/groups/${groupId}/milestones?${params.toString()}`,
    );
    return data.map((milestone) => GitLabMilestoneSchema.parse(milestone));
  }

  // Utility Methods
  async searchProjects(query: string): Promise<GitLabProject[]> {
    return this.getProjects({ search: query, membership: true });
  }

  async getActiveMilestones(): Promise<
    (GitLabMilestone & {
      project?: GitLabProject;
      group?: { id: number; name: string; full_path: string };
    })[]
  > {
    // Get both project and group milestones
    const [projects, groups] = await Promise.all([
      this.getProjects({ membership: true }),
      this.getGroups({ membership: true }),
    ]);

    // Get project milestones
    const projectMilestones = await this.getAllMilestones(projects, {
      state: "active",
    });

    // Get group milestones
    const groupMilestonePromises = groups.map(async (group) => {
      try {
        const milestones = await this.getGroupMilestones(group.id, {
          state: "active",
        });
        return milestones.map((milestone) => ({
          ...milestone,
          group: { id: group.id, name: group.name, full_path: group.full_path },
        }));
      } catch (error) {
        console.warn(
          `Failed to fetch milestones for group ${group.name}:`,
          error,
        );
        return [];
      }
    });

    const groupMilestonesResults = await Promise.allSettled(
      groupMilestonePromises,
    );
    const groupMilestones = groupMilestonesResults
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<
          (GitLabMilestone & { group: GitLabGroup })[]
        > => result.status === "fulfilled",
      )
      .flatMap((result) => result.value);

    return [...projectMilestones, ...groupMilestones];
  }
}
