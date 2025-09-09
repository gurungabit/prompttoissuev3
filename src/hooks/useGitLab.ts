"use client";
import { useCallback, useEffect, useState } from "react";
import { GitLabService } from "../lib/gitlab/service";
import type {
  GitLabMilestone,
  GitLabProject,
  GitLabUser,
} from "../lib/gitlab/types";
import { GitLabApiError } from "../lib/gitlab/types";

interface UseGitLabOptions {
  token?: string;
  baseUrl?: string;
}

interface UseGitLabReturn {
  service: GitLabService | null;
  user: GitLabUser | null;
  projects: GitLabProject[];
  milestones: (GitLabMilestone & {
    project?: GitLabProject;
    group?: { id: number; name: string; full_path: string };
  })[];
  isLoading: boolean;
  error: string | null;
  // Methods
  refreshProjects: () => Promise<void>;
  refreshMilestones: () => Promise<void>;
  searchProjects: (query: string) => Promise<GitLabProject[]>;
  createIssue: (
    projectId: number,
    title: string,
    description?: string,
    milestoneId?: number,
  ) => Promise<void>;
}

export function useGitLab(options: UseGitLabOptions = {}): UseGitLabReturn {
  const [service, setService] = useState<GitLabService | null>(null);
  const [user, setUser] = useState<GitLabUser | null>(null);
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [milestones, setMilestones] = useState<
    (GitLabMilestone & {
      project?: GitLabProject;
      group?: { id: number; name: string; full_path: string };
    })[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to handle 401 errors with automatic re-auth
  const handleApiError = useCallback((err: unknown, operation: string) => {
    if (err instanceof GitLabApiError && err.status === 401) {
      // Clear any existing error state
      setError(null);
      // Redirect to GitLab OAuth
      window.location.assign("/api/auth/gitlab/login");
      return true; // Indicate we handled the error
    }

    // For other errors, set error state normally
    const errorMessage =
      err instanceof Error ? err.message : `Failed to ${operation}`;
    setError(errorMessage);
    return false; // Indicate we didn't handle the error
  }, []);

  // Initialize service when token is provided
  useEffect(() => {
    if (options.token) {
      const gitlabService = new GitLabService(
        options.baseUrl || "https://gitlab.com/api/v4",
        options.token,
      );
      setService(gitlabService);
    } else {
      setService(null);
      setUser(null);
      setProjects([]);
      setMilestones([]);
    }
  }, [options.token, options.baseUrl]);

  // Fetch user data when service is available
  useEffect(() => {
    if (!service) return;

    const fetchUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userData = await service.getCurrentUser();
        setUser(userData);
      } catch (err) {
        const handled = handleApiError(err, "fetch user data");
        if (!handled) {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [service, handleApiError]);

  const refreshProjects = useCallback(async () => {
    if (!service) return;

    try {
      setIsLoading(true);
      setError(null);
      const projectData = await service.getProjects({ membership: true });
      setProjects(projectData);
    } catch (err) {
      const handled = handleApiError(err, "fetch projects");
      if (!handled) {
        setProjects([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [service, handleApiError]);

  const refreshMilestones = useCallback(async () => {
    if (!service) return;

    try {
      setIsLoading(true);
      setError(null);
      // Use the new method that gets both project and group milestones
      const milestoneData = await service.getActiveMilestones();
      setMilestones(milestoneData);
    } catch (err) {
      const handled = handleApiError(err, "fetch milestones");
      if (!handled) {
        setMilestones([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [service, handleApiError]);

  const searchProjects = useCallback(
    async (query: string): Promise<GitLabProject[]> => {
      if (!service) return [];

      try {
        setError(null);
        return await service.searchProjects(query);
      } catch (err) {
        const handled = handleApiError(err, "search projects");
        return handled ? [] : [];
      }
    },
    [service, handleApiError],
  );

  const createIssue = useCallback(
    async (
      projectId: number,
      title: string,
      description?: string,
      milestoneId?: number,
    ) => {
      if (!service) return;

      try {
        setError(null);
        await service.createIssue(projectId, {
          title,
          description,
          milestone_id: milestoneId,
        });
      } catch (err) {
        const handled = handleApiError(err, "create issue");
        if (!handled) {
          throw err;
        }
      }
    },
    [service, handleApiError],
  );

  // Auto-fetch projects when service becomes available
  useEffect(() => {
    if (service && user) {
      refreshProjects();
    }
  }, [service, user, refreshProjects]);

  // Auto-fetch milestones when service becomes available
  useEffect(() => {
    if (service && user) {
      refreshMilestones();
    }
  }, [service, user, refreshMilestones]);

  return {
    service,
    user,
    projects,
    milestones,
    isLoading,
    error,
    refreshProjects,
    refreshMilestones,
    searchProjects,
    createIssue,
  };
}
