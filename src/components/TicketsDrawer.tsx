"use client";
import { FileText, Pencil, Plus, Save, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStoredGitLab } from "../hooks/useStoredGitLab";
import { GitLabApiError } from "../lib/gitlab/types";
import type { GitLabAssignment, TicketsPayload } from "../lib/tickets";
import { Button } from "./Button";
import { ConfirmModal } from "./ConfirmModal";
import { useToast } from "./Toast";
import { EditableTicketCard } from "./tickets/EditableTicketCard";
import { GitLabSelector } from "./tickets/GitLabSelector";
import { ReadOnlyTicketCard } from "./tickets/ReadOnlyTicketCard";

// Utility function to create GitLab issues
async function createGitLabIssues(
  ticketsPayload: TicketsPayload,
  gitlabService: NonNullable<ReturnType<typeof useStoredGitLab>["service"]>,
  mode: "same" | "multiple",
): Promise<{
  count: number;
  issues: Array<{ title: string; url: string; projectName: string }>;
}> {
  let createdCount = 0;
  const createdIssues: Array<{
    title: string;
    url: string;
    projectName: string;
  }> = [];

  for (const ticket of ticketsPayload.tickets) {
    let assignment: GitLabAssignment | undefined;

    if (mode === "same") {
      assignment = ticketsPayload.globalGitlabAssignment;
    } else {
      assignment = ticket.gitlabAssignment;
    }

    if (!assignment?.projectId) continue;

    // Build issue description
    const sections: string[] = [];

    if (ticket.description) {
      sections.push(ticket.description);
    }

    if (ticket.acceptanceCriteria.length > 0) {
      sections.push("## Acceptance Criteria");
      sections.push(
        ...ticket.acceptanceCriteria.map((ac) => `- ${ac.description}`),
      );
    }

    if (ticket.tasks.length > 0) {
      sections.push("## Tasks");
      sections.push(...ticket.tasks.map((task) => `- [ ] ${task.description}`));
    }

    const description = sections.join("\n\n");
    const labels =
      ticket.labels.length > 0 ? ticket.labels.join(",") : undefined;

    try {
      // Get project details for the success message
      const projectInfo = await gitlabService.getProject(assignment.projectId);

      // Create the issue and get the response
      const createdIssue = await gitlabService.createIssue(
        assignment.projectId,
        {
          title: ticket.title,
          description,
          milestone_id: assignment.milestoneId,
          labels,
        },
      );

      createdCount++;
      createdIssues.push({
        title: createdIssue.title,
        url: createdIssue.web_url,
        projectName: projectInfo.name,
      });
    } catch (error) {
      console.error(
        `Failed to create issue for ticket "${ticket.title}":`,
        error,
      );

      // Handle 401 errors with automatic re-auth
      if (error instanceof GitLabApiError && error.status === 401) {
        window.location.assign("/api/auth/gitlab/login");
        return { count: createdCount, issues: createdIssues }; // Return what we have so far
      }

      // Provide more specific error information for other errors
      let errorMessage = `Failed to create issue "${ticket.title}"`;
      if (error instanceof Error) {
        if (error.message.includes("403")) {
          errorMessage +=
            ": Insufficient permissions. Check that you have at least Developer role in this project.";
        } else if (error.message.includes("404")) {
          errorMessage +=
            ": Project not found or you do not have access to it.";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }

      throw new Error(errorMessage);
    }
  }

  return { count: createdCount, issues: createdIssues };
}

export function TicketsDrawer({
  initialTickets,
  onSave,
  onClose,
  onSendMessage,
}: {
  initialTickets: TicketsPayload | null | undefined;
  onSave?: (tickets: TicketsPayload) => Promise<void> | void;
  onClose: () => void;
  onSendMessage?: (message: string) => void;
}) {
  const [loading, _setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TicketsPayload | null>(
    (initialTickets ?? null) as TicketsPayload | null,
  );
  const [draft, setDraft] = useState<TicketsPayload | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);

  // GitLab integration from stored connection
  const {
    service: gitlabService,
    projects: gitlabProjects,
    milestones: gitlabMilestones,
    isLoading: gitlabLoading,
    error: gitlabError,
    refreshProjects,
  } = useStoredGitLab();
  const toast = useToast();

  // Helper functions for GitLab assignment changes
  const updateGlobalGitLabAssignment = (
    assignment: GitLabAssignment | undefined,
  ) => {
    if (isEditing) {
      setDraft((prev) =>
        prev ? { ...prev, globalGitlabAssignment: assignment } : prev,
      );
    } else {
      setData((prev) =>
        prev ? { ...prev, globalGitlabAssignment: assignment } : prev,
      );
    }
  };

  const updateTicketGitLabAssignment = (
    ticketId: string,
    assignment: GitLabAssignment | undefined,
  ) => {
    if (isEditing) {
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              tickets: prev.tickets.map((x) =>
                x.id === ticketId ? { ...x, gitlabAssignment: assignment } : x,
              ),
            }
          : prev,
      );
    } else {
      setData((prev) =>
        prev
          ? {
              ...prev,
              tickets: prev.tickets.map((x) =>
                x.id === ticketId ? { ...x, gitlabAssignment: assignment } : x,
              ),
            }
          : prev,
      );
    }
  };

  useEffect(() => {
    setData((initialTickets ?? null) as TicketsPayload | null);
  }, [initialTickets]);

  const addTicket = () => {
    setDraft((prev) => {
      const base: TicketsPayload = prev ??
        data ?? {
          type: "tickets",
          tickets: [],
          reasoning: "",
          needsClarification: false,
          clarificationQuestions: [],
        };
      return {
        ...base,
        tickets: [
          ...base.tickets,
          {
            id: `t_${Math.random().toString(36).slice(2, 8)}`,
            title: "Untitled",
            description: "",
            acceptanceCriteria: [],
            tasks: [],
            labels: [],
            priority: "medium",
            type: "task",
          },
        ],
      };
    });
  };

  const deleteTicket = (ticketId: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            tickets: prev.tickets.filter((t) => t.id !== ticketId),
          }
        : prev,
    );
  };

  const save = async () => {
    const toSave = draft ?? data;
    if (!toSave) return;
    setSaving(true);
    try {
      if (onSave) await onSave(toSave);
      setData(toSave);
      setIsEditing(false);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(null);
  };

  const startEdit = () => {
    setIsEditing(true);
    setDraft((prev) => {
      if (prev) return prev; // retain if already staged
      const base =
        data ??
        ({
          type: "tickets",
          tickets: [],
          reasoning: "",
          needsClarification: false,
          clarificationQuestions: [],
        } satisfies TicketsPayload);
      // Prefer structuredClone if available at runtime; fallback to JSON clone
      try {
        const maybeClone: unknown = (
          globalThis as unknown as {
            structuredClone?: (x: unknown) => unknown;
          }
        ).structuredClone;
        if (typeof maybeClone === "function") {
          return maybeClone(base) as TicketsPayload;
        }
        return JSON.parse(JSON.stringify(base)) as TicketsPayload;
      } catch {
        return JSON.parse(JSON.stringify(base)) as TicketsPayload;
      }
    });
  };

  const ticketsToRender = useMemo(() => {
    return isEditing ? draft : data;
  }, [isEditing, draft, data]);

  // Computed value for whether we can create GitLab issues
  const canCreateIssues = useMemo(() => {
    if (!gitlabService || !ticketsToRender?.tickets.length) return false;

    const mode = ticketsToRender.gitlabMode || "same";
    if (mode === "same") {
      return !!ticketsToRender.globalGitlabAssignment?.projectId;
    } else {
      // For multiple mode, check if all tickets have project assignments
      return ticketsToRender.tickets.every(
        (ticket) => !!ticket.gitlabAssignment?.projectId,
      );
    }
  }, [gitlabService, ticketsToRender]);

  // Handle creating GitLab issues
  const handleCreateGitLabIssues = async () => {
    if (!gitlabService || !ticketsToRender) return;

    setSaving(true);
    try {
      const mode = ticketsToRender.gitlabMode || "same";
      const result = await createGitLabIssues(
        ticketsToRender,
        gitlabService,
        mode,
      );

      // Show success toast
      toast.show(
        `Successfully created ${result.count} GitLab issue${result.count !== 1 ? "s" : ""}!`,
        "success",
      );

      // Add a message to the chat showing the created issues
      if (result.issues.length > 0 && onSendMessage) {
        const issueLinks = result.issues
          .map(
            (issue) =>
              `- [${issue.title}](${issue.url}) in ${issue.projectName}`,
          )
          .join("\n");

        const chatMessage = `✅ Successfully created ${result.count} GitLab issue${result.count !== 1 ? "s" : ""}:\n\n${issueLinks}`;

        // Send the message to the chat
        onSendMessage(chatMessage);
      }
    } catch (error) {
      console.error("Error creating GitLab issues:", error);
      toast.show(
        error instanceof Error
          ? error.message
          : "Failed to create GitLab issues",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="h-full bg-[color:var(--color-surface)] border-l border-[color:var(--color-border)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">Tickets</div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && (
            <Button
              onClick={isEditing ? cancelEdit : startEdit}
              variant="outline"
              size="sm"
              className={
                isEditing
                  ? "text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                  : undefined
              }
              aria-label={isEditing ? "Cancel editing" : "Edit tickets"}
            >
              {isEditing ? <Undo2 size={14} /> : <Pencil size={14} />}
              <span className="ml-1">{isEditing ? "Cancel" : "Edit"}</span>
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[color:var(--color-card)] cursor-pointer"
            aria-label="Close tickets"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* GitLab Integration at top */}
      {gitlabService && (
        <div className="p-4 border-b border-[color:var(--color-border)] space-y-3">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (isEditing) {
                    setDraft((prev) =>
                      prev ? { ...prev, gitlabMode: "same" } : prev,
                    );
                  } else {
                    setData((prev) =>
                      prev ? { ...prev, gitlabMode: "same" } : prev,
                    );
                  }
                }}
                className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                  (ticketsToRender?.gitlabMode || "same") === "same"
                    ? "bg-[color:var(--color-primary)] text-white"
                    : "bg-[color:var(--color-card)] text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)]"
                }`}
              >
                Single Project
              </button>
              <button
                onClick={() => {
                  if (isEditing) {
                    setDraft((prev) =>
                      prev ? { ...prev, gitlabMode: "multiple" } : prev,
                    );
                  } else {
                    setData((prev) =>
                      prev ? { ...prev, gitlabMode: "multiple" } : prev,
                    );
                  }
                }}
                className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                  (ticketsToRender?.gitlabMode || "same") === "multiple"
                    ? "bg-[color:var(--color-primary)] text-white"
                    : "bg-[color:var(--color-card)] text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)]"
                }`}
              >
                Multiple Projects
              </button>
            </div>
            <Button
              onClick={handleCreateGitLabIssues}
              variant="solid"
              size="sm"
              disabled={!canCreateIssues || saving}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <FileText size={14} />
              {saving ? "Creating..." : "Create Issues"}
            </Button>
          </div>

          {/* Project/Milestone Selection for Single mode */}
          {(ticketsToRender?.gitlabMode || "same") === "same" && (
            <GitLabSelector
              projects={gitlabProjects || []}
              milestones={gitlabMilestones || []}
              value={ticketsToRender?.globalGitlabAssignment}
              onChange={updateGlobalGitLabAssignment}
              placeholder="Select GitLab project..."
            />
          )}

          {/* Connection Status & Error Handling */}
          {gitlabError?.includes("401") ? (
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-red-800 dark:text-red-200">
                  GitLab Token Expired
                </div>
                <div className="text-xs text-red-700 dark:text-red-300">
                  Please reconnect to GitLab
                </div>
              </div>
              <Button
                onClick={() => {
                  // Redirect to GitLab OAuth
                  window.location.assign("/api/auth/gitlab/login");
                }}
                variant="solid"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Reconnect GitLab
              </Button>
            </div>
          ) : gitlabError ? (
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  GitLab Error
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  {gitlabError}
                </div>
              </div>
              <Button
                onClick={() => {
                  if (refreshProjects) {
                    refreshProjects();
                  }
                }}
                variant="solid"
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Retry
              </Button>
            </div>
          ) : (
            gitlabLoading && (
              <div className="text-xs text-[color:var(--color-muted)] bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                Loading GitLab projects and milestones...
              </div>
            )
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-[color:var(--color-muted)] text-sm">
            Loading…
          </div>
        ) : !ticketsToRender ? (
          <div className="text-[color:var(--color-muted)] text-sm">
            No tickets.
          </div>
        ) : ticketsToRender.tickets.length === 0 && !isEditing ? (
          <div className="text-[color:var(--color-muted)] text-sm">
            No tickets. Click Edit to add.
          </div>
        ) : (
          ticketsToRender.tickets.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3 space-y-3"
            >
              {/* GitLab Assignment for Multiple Projects mode - always visible at top */}
              {gitlabService &&
                (ticketsToRender?.gitlabMode || "same") === "multiple" && (
                  <div className="pb-3 border-b border-[color:var(--color-border)]">
                    <GitLabSelector
                      projects={gitlabProjects || []}
                      milestones={gitlabMilestones || []}
                      value={t.gitlabAssignment}
                      onChange={(assignment) =>
                        updateTicketGitLabAssignment(t.id, assignment)
                      }
                      placeholder="Select project for this ticket..."
                    />
                  </div>
                )}

              {isEditing ? (
                <EditableTicketCard
                  ticket={t}
                  onChange={(next) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tickets: prev.tickets.map((x) =>
                              x.id === t.id ? next : x,
                            ),
                          }
                        : prev,
                    )
                  }
                  onDelete={() => setDeleteTicketId(t.id)}
                />
              ) : (
                <ReadOnlyTicketCard ticket={t} />
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--color-border)]">
        {isEditing ? (
          <>
            <Button onClick={addTicket} variant="solid" size="md">
              <Plus size={16} />
              <span className="ml-2">Add ticket</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={cancelEdit}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                <Undo2 size={16} />
                <span className="ml-2">Cancel</span>
              </Button>
              <Button onClick={save} variant="solid" disabled={saving}>
                <Save size={16} />
                <span className="ml-2">{saving ? "Saving…" : "Save"}</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="w-full flex justify-end">
            <Button onClick={startEdit} variant="outline">
              <Pencil size={16} />
              <span className="ml-2">Edit</span>
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTicketId)}
        onClose={() => setDeleteTicketId(null)}
        onConfirm={() => {
          if (deleteTicketId) deleteTicket(deleteTicketId);
          setDeleteTicketId(null);
        }}
        title="Delete ticket?"
        message="This will permanently remove the ticket from the draft."
        confirmText="Delete"
        cancelText="Cancel"
        dangerous
      />
    </aside>
  );
}
export default TicketsDrawer;
