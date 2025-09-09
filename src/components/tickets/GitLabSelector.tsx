"use client";
import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { GitLabMilestone, GitLabProject } from "../../lib/gitlab/types";
import type { GitLabAssignment } from "../../lib/tickets";

interface GitLabSelectorProps {
  projects: GitLabProject[];
  milestones: (GitLabMilestone & {
    project?: GitLabProject;
    group?: { id: number; name: string; full_path: string };
  })[];
  value?: GitLabAssignment;
  onChange: (assignment: GitLabAssignment | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function GitLabSelector({
  projects,
  milestones,
  value,
  onChange,
  disabled = false,
  placeholder = "Select project...",
}: GitLabSelectorProps) {
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showMilestoneDropdown, setShowMilestoneDropdown] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [milestoneSearch, setMilestoneSearch] = useState("");

  const filteredProjects = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return [];
    if (!projectSearch) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        project.path_with_namespace
          .toLowerCase()
          .includes(projectSearch.toLowerCase()),
    );
  }, [projects, projectSearch]);

  const selectedProject =
    projects && Array.isArray(projects)
      ? projects.find((p) => p.id === value?.projectId)
      : undefined;

  const filteredMilestones = useMemo(() => {
    if (!milestones || !Array.isArray(milestones) || !selectedProject)
      return [];

    // Filter milestones based on selected project
    const projectMilestones = milestones.filter((milestone) => {
      // Include project milestones from the selected project
      if (
        "project" in milestone &&
        milestone.project?.id === selectedProject.id
      ) {
        return true;
      }

      // Include group milestones from the project's parent groups
      if ("group" in milestone && milestone.group) {
        // Check if this group milestone is accessible to the selected project
        // This happens when the project is in the group or a subgroup
        const projectNamespace = selectedProject.path_with_namespace;
        const groupPath = milestone.group.full_path;

        // Check if project is in this group or a subgroup
        return (
          projectNamespace.startsWith(`${groupPath}/`) ||
          projectNamespace === groupPath
        );
      }

      return false;
    });

    // Deduplicate milestones by title
    const uniqueMilestones = projectMilestones.reduce(
      (acc, milestone) => {
        if (
          !acc.some(
            (existing) =>
              existing.title.toLowerCase() === milestone.title.toLowerCase(),
          )
        ) {
          acc.push(milestone);
        }
        return acc;
      },
      [] as typeof projectMilestones,
    );

    // Only filter by search term if provided
    if (milestoneSearch) {
      return uniqueMilestones.filter((milestone) =>
        milestone.title.toLowerCase().includes(milestoneSearch.toLowerCase()),
      );
    }

    return uniqueMilestones;
  }, [milestones, milestoneSearch, selectedProject]);

  const handleProjectSelect = (project: GitLabProject) => {
    onChange({
      projectId: project.id,
      projectName: project.name,
      // Clear milestone when project changes
    });
    setShowProjectDropdown(false);
    setProjectSearch("");
  };

  const handleMilestoneSelect = (
    milestone: GitLabMilestone, // Accept any milestone type (project or group)
  ) => {
    // Ensure project is selected before allowing milestone selection
    if (!selectedProject) return;

    onChange({
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      milestoneId: milestone.id,
      milestoneName: milestone.title,
    });
    setShowMilestoneDropdown(false);
    setMilestoneSearch("");
  };

  const clearSelection = () => {
    onChange(undefined);
  };

  if (disabled) {
    return (
      <div className="space-y-3 opacity-50">
        {/* Project Selection - Disabled */}
        <div className="relative">
          <div className="block text-sm font-medium text-[color:var(--color-text)] mb-1">
            Project
          </div>
          <div className="w-full flex items-center justify-between px-3 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg text-[color:var(--color-muted)] cursor-not-allowed">
            <span className="truncate">
              {selectedProject ? selectedProject.name : placeholder}
            </span>
            <ChevronDown size={16} className="flex-shrink-0 ml-2" />
          </div>
        </div>

        {/* Milestone Selection - Disabled */}
        {selectedProject && (
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium text-[color:var(--color-text)]">
                Milestone (optional)
              </div>
            </div>
            <div className="w-full flex items-center justify-between px-3 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg text-[color:var(--color-muted)] cursor-not-allowed">
              <span className="truncate">
                {value?.milestoneName || "No milestone"}
              </span>
              <ChevronDown size={16} className="flex-shrink-0 ml-2" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Project Selection */}
      <div className="relative flex-1">
        <button
          onClick={() => setShowProjectDropdown(!showProjectDropdown)}
          className="w-full flex items-center justify-between px-3 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg text-[color:var(--color-text)] hover:bg-[color:var(--color-card)] transition-colors"
        >
          <span className="truncate">
            {selectedProject ? selectedProject.name : placeholder}
          </span>
          <ChevronDown size={16} className="flex-shrink-0 ml-2" />
        </button>

        {showProjectDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowProjectDropdown(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg shadow-lg max-h-64 overflow-hidden">
              <div className="p-2 border-b border-[color:var(--color-border)]">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]"
                  />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)]"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className="w-full px-3 py-2 text-left hover:bg-[color:var(--color-card)] transition-colors"
                  >
                    <div className="font-medium text-[color:var(--color-text)]">
                      {project.name}
                    </div>
                    <div className="text-xs text-[color:var(--color-muted)]">
                      {project.path_with_namespace}
                    </div>
                  </button>
                ))}
                {filteredProjects.length === 0 && (
                  <div className="px-3 py-4 text-sm text-[color:var(--color-muted)] text-center">
                    No projects found
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Milestone Selection - only show when project is selected */}
      {selectedProject && (
        <div className="relative flex-1">
          <button
            onClick={() => setShowMilestoneDropdown(!showMilestoneDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg text-[color:var(--color-text)] hover:bg-[color:var(--color-card)] transition-colors"
          >
            <span className="truncate">
              {value?.milestoneName ||
                `Select milestone (${filteredMilestones.length} available)`}
            </span>
            <ChevronDown size={16} className="flex-shrink-0 ml-2" />
          </button>

          {showMilestoneDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMilestoneDropdown(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg shadow-lg max-h-64 overflow-hidden">
                <div className="p-2 border-b border-[color:var(--color-border)]">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]"
                    />
                    <input
                      type="text"
                      placeholder="Search milestones..."
                      value={milestoneSearch}
                      onChange={(e) => setMilestoneSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)]"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredMilestones.map((milestone) => (
                    <button
                      key={milestone.id}
                      onClick={() => handleMilestoneSelect(milestone)}
                      className="w-full px-3 py-2 text-left hover:bg-[color:var(--color-card)] transition-colors"
                    >
                      <div className="font-medium text-[color:var(--color-text)]">
                        {milestone.title}
                      </div>
                      <div className="text-xs text-[color:var(--color-muted)] flex items-center gap-2">
                        {"group" in milestone && milestone.group ? (
                          <span>📁 {milestone.group.full_path}</span>
                        ) : "project" in milestone && milestone.project ? (
                          <span>📄 {milestone.project.name}</span>
                        ) : milestone.group_id ? (
                          <span>📁 Group milestone</span>
                        ) : milestone.project_id ? (
                          <span>📄 Project milestone</span>
                        ) : null}
                        {milestone.due_date && (
                          <span>
                            Due:{" "}
                            {new Date(milestone.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredMilestones.length === 0 && (
                    <div className="px-3 py-4 text-sm text-[color:var(--color-muted)] text-center">
                      No milestones found
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Clear all selection */}
      {value && (
        <button
          onClick={clearSelection}
          className="text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] transition-colors"
        >
          Clear selection
        </button>
      )}
    </div>
  );
}
