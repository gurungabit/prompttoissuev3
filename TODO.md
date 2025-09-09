# TODO

## GitLab Integration & Issue Management

### 1. GitLab Client-Side Service ✅

- [X] Create GitLab service for client-side operations
  - [X] List all available projects for current user
  - [X] List all active/upcoming milestones for all projects
  - [X] Create issues
  - [X] Update issues
  - [X] Delete issues
- [X] Implement proper error handling
- [X] Add TypeScript types (Zod) for GitLab API responses

### 2. Enhanced Tickets Sidepanel ✅

- [X] Update current sidepanel Tickets UI
  - [X] Add "Custom" dropdown with search functionality
    - [X] Show all Projects (searchable)
    - [X] Show all Milestones (searchable)
  - [X] Implement toggle: "Same / Multiple"
    - [X] **Same**: All tickets created in single selected project/milestone
    - [X] **Multiple**: Each ticket has its own project/milestone selection
- [X] Make sidepanel design beautiful and wider if needed
- [X] Ensure responsive design for different screen sizes

### 3. Authentication Flow ✅

- [X] Setup tabbed settings interface (MCP | Connectors)
- [X] Add GitLab connection options (Token & OAuth placeholder)
- [X] Store and manage GitLab access tokens securely in localStorage
- [X] Add authentication state management with automatic loading
- [X] Protect GitLab-related features behind auth (token validation)
- [X] Configure direct GitLab OAuth (implemented with setup guide)
- [X] Implement GitLab OAuth login/logout flow (/api/auth/gitlab/login)
- [X] Handle OAuth token storage and validation
- [ ] Handle token refresh/expiration for OAuth tokens

### Implementation Notes

- Use client-side GitLab API calls (no server proxy needed)
- Maintain current ticket generation functionality
- Ensure backward compatibility with existing ticket system
- Consider caching project/milestone data for better UX
