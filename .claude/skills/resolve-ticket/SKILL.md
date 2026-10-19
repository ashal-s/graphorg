---
name: resolve-ticket
description: Resolves a Jira/Linear ticket end-to-end — reads the issue, moves it to In Progress, branches from development, implements the work, pushes DB migrations, pushes code, and opens a PR. Use when the user provides a Jira key (e.g. HB-101, AB-101), asks to resolve/fix/complete a ticket, or invokes resolve-ticket.
---

# Resolve Ticket

End-to-end workflow: read Jira/Linear issue → move to In Progress → branch from `development` → implement → apply migrations → push → open PR to `development`.

## Inputs

The user provides a **Jira issue key** (e.g. `HB-101`, `AB-101`).

- For a **standalone** task/story/bug: use that key for the branch, commits, and PR.
- For a **sub-task**: implement the sub-task, but use the **parent** issue key for the branch and PR (see [Parent + sub-tasks workflow](#parent--sub-tasks-workflow) below).

---

## Choose workflow

After reading the issue in Step 1, pick one:

| Situation                                                                                                           | Workflow                                          |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Task, Story, Bug, or other **non-sub-task** with **no** open sub-tasks (or user is resolving the parent as a whole) | [Standalone ticket](#standalone-ticket)           |
| **Sub-task** key provided (e.g. `HB-131`), or parent has sub-tasks and user is resolving them one-by-one            | [Parent + sub-tasks](#parent--sub-tasks-workflow) |

**Default for sub-tasks:** one **local branch** = **parent key** (e.g. `HB-128`) — never a branch per sub-task. Commit message = **sub-task key** (e.g. `HB-131: …`). **Push after each sub-task commit** to `origin/<PARENT-KEY>`. Open **one PR** parent → `development` **only when the user explicitly says all sub-tasks are done** (not one PR per sub-task).

---

## Standalone ticket

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Read Jira/Linear issue
- [ ] Step 2: Move ticket to In Progress
- [ ] Step 3: Create and checkout branch from development
- [ ] Step 4: Implement all required changes
- [ ] Step 5: Commit changes
- [ ] Step 6: Apply DB migrations (Supabase MCP)
- [ ] Step 7: Push branch to remote
- [ ] Step 8: Open PR to development
```

Branch name, remote branch, commit prefix, and PR head = **the issue key** (e.g. `HB-101`).

---

## Parent + sub-tasks workflow

Use when Jira has a **parent** task/story/bug and **sub-tasks** underneath it (e.g. epic `HB-128` with `HB-129` … `HB-133`).

```
Epic progress:
- [ ] Step 1: Read parent + sub-task(s) from Jira
- [ ] Step 2: Move sub-task (and parent if needed) to In Progress
- [ ] Step 3: Create/checkout branch from development — name = PARENT key only
- [ ] Step 4: Implement current sub-task
- [ ] Step 5: Commit — message prefix = SUB-TASK key
- [ ] Step 6: Apply DB migrations if this sub-task added any
- [ ] Step 7: Push to origin PARENT branch after each sub-task (repeat Steps 4–7 for each sub-task)
- [ ] Step 8: Open ONE PR: PARENT → development (only when user says all sub-tasks are done)
```

### Branching and git

| Item               | Value                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Base branch        | `development`                                                                                          |
| **Branch name**    | **Parent key only** (e.g. `HB-128`) — one local branch per parent task; never `HB-129`, `HB-131`, etc. |
| **Remote branch**  | Same as parent key                                                                                     |
| **Commit message** | `<SUB-TASK-KEY>: <sub-task Jira summary>` — one commit per sub-task                                    |
| **Push**           | After **every** sub-task commit — `git push origin <PARENT-KEY>`                                       |
| **PR head**        | Parent branch                                                                                          |
| **PR base**        | `development`                                                                                          |
| **PR title**       | `<PARENT-KEY>: <parent Jira summary>` (e.g. `HB-128: Tutor portal changes`)                            |
| **PR timing**      | **Only** when user explicitly says all sub-tasks for that parent are done                              |

Example commit sequence on branch `HB-128`:

```
HB-129: Show student contact and onboarding prominently for tutors
HB-130: Clarify who can see General Notes in tutor portal
HB-131: Remove Calendar Session Log from tutor portal
HB-132: Remove tutor self-assignment of unassigned students
HB-133: Remove MyCourses and MyStudents from tutor portal
```

After **each** sub-task commit, push immediately:

```bash
git push origin <PARENT-KEY>
```

**Do not** create a separate branch or PR per sub-task.

### Git flow (parent + sub-tasks)

```
development
  └── <PARENT-KEY>          ← one local branch per parent task
        ├── <SUB-1-KEY>: <sub-task summary>   → push
        ├── <SUB-2-KEY>: <sub-task summary>   → push
        └── <SUB-3-KEY>: <sub-task summary>   → push
              └── PR: <PARENT-KEY> → development   (only when user says all sub-tasks are done)
```

### PR timing

- **While sub-tasks remain:** push to `origin/<PARENT-KEY>` after each sub-task commit. **Do not open a PR** — wait for the user to say all sub-tasks for that parent are done (e.g. “all subtasks done for HB-128”, “create PR for HB-128”).
- **When user confirms the parent is complete:** open **one** PR `<PARENT-KEY>` → `development`. PR body must list **every** sub-task with Jira links and what each delivered.
- If a parent PR already exists (opened earlier by mistake or user request), **update** its description instead of creating a duplicate (`gh pr list --head <PARENT-KEY> --base development`).

### Resolving multiple sub-tasks in one request

If the user asks for `HB-132` and `HB-133` together: stay on `<PARENT-KEY>`, implement both, **two commits** (one per sub-task key), **push after each commit**.

---

### Step 1: Read the Jira issue

1. Read the Atlassian MCP tool schemas before calling (`getAccessibleAtlassianResources`, `getJiraIssue`).
2. Resolve `cloudId` via `getAccessibleAtlassianResources` if not already known.
3. Fetch the issue:

```
getJiraIssue(
  cloudId="<cloudId>",
  issueIdOrKey="<KEY>",
  fields=["summary", "description", "status", "issuetype", "priority", "parent", "subtasks", "acceptance criteria", "comment"],
  responseContentFormat="markdown"
)
```

4. **If the issue is a sub-task:** also fetch the **parent** issue (`fields.parent` or parent key from Jira). Record:
   - `parentKey` — used for branch name and PR (e.g. `HB-128`)
   - `parentSummary` — used for PR title
   - `subTaskKey` — the key the user asked to resolve (e.g. `HB-131`) — used for commit message
5. **If the issue is a parent:** save **summary** for the PR title; list sub-tasks from Jira if present.
6. Summarize: title, description, acceptance criteria, comments, linked specs.
7. If requirements are ambiguous, ask the user before coding.

---

### Step 2: Move the ticket to In Progress

As soon as you begin work (after reading the issue, before branching), move the ticket into **In Progress**.

- **Sub-task workflow:** transition the **sub-task** being worked on. If the **parent** is still To Do, transition the parent to In Progress too.
- **Standalone:** transition the issue key provided.

- **Linear:** Read the `save_issue` schema, then set the state:

```
save_issue(id="<KEY>", state="In Progress")
```

`state` accepts a state type, name, or ID. If the team's workflow uses a different in-progress name (e.g. "In Development", "Started"), use `list_issue_statuses(team="<team>")` to find the matching state and pass it.

- **Jira:** Read the `getTransitionsForJiraIssue` and `transitionJiraIssue` schemas, then transition the issue:

```
getTransitionsForJiraIssue(cloudId="<cloudId>", issueIdOrKey="<KEY>")
transitionJiraIssue(cloudId="<cloudId>", issueIdOrKey="<KEY>", transition={ "id": "<In Progress transition id>" })
```

Pick the transition whose target status is "In Progress" (the transition name varies per workflow).

Guidance:

- If the ticket is **already** In Progress (or further along, e.g. In Review/Done), skip this step.
- Treat this as non-blocking: if the status can't be changed (permissions, missing transition), note it to the user and continue with the work.

---

### Step 3: Create branch from development

**Standalone:** branch name = issue key (e.g. `HB-101`).

**Parent + sub-tasks:** branch name = **parent key** (e.g. `HB-128`), even when implementing sub-task `HB-131`.

No prefix or suffix on branch names.

```bash
git fetch origin development
git checkout development
git pull origin development
git checkout -b <BRANCH-KEY>
```

`<BRANCH-KEY>` = issue key (standalone) or **parent key** (sub-task workflow).

If the branch already exists locally, check it out and rebase onto latest `development`:

```bash
git checkout <BRANCH-KEY>
git fetch origin development
git rebase origin/development
```

---

### Step 4: Implement changes

- Complete **all** work for the current ticket (standalone: whole issue; sub-task: that sub-task only).
- Follow existing project conventions; keep diffs focused.
- Run relevant tests or lint checks before committing.
- Do not commit secrets (`.env`, credentials).
- New schema changes → add SQL files under `supabase/migrations/` (use `supabase migration new <name>` when the CLI is available).

---

### Step 5: Commit changes

Only commit when this workflow is active (resolving a ticket implies committing).

1. Run in parallel: `git status`, `git diff`, `git log -3 --oneline`
2. Stage relevant files; write a commit message focused on **why**:

**Standalone** — prefix = issue key:

```bash
git add <files>
git commit -m "$(cat <<'EOF'
<KEY>: <short summary of why>

<optional detail>
EOF
)"
```

**Sub-task** — prefix = **sub-task key**, message includes the **sub-task Jira summary**:

```bash
git commit -m "$(cat <<'EOF'
<SUB-TASK-KEY>: <sub-task Jira summary>

<optional detail>
EOF
)"
```

If a pre-commit hook modifies files, fix and create a **new** commit (do not amend unless all amend rules are met).

---

### Step 6: Apply DB migrations (Supabase MCP)

If the branch adds or changes files in `supabase/migrations/`, apply them to the linked Supabase project **before** opening the PR (or before pushing, if migrations belong to the current sub-task).

1. **Authenticate** if tools are unavailable — read the Supabase MCP tool schemas first, then call `mcp_auth` for server `plugin-supabase-supabase` if needed.
2. **Discover tools** — read schemas for `list_migrations`, `apply_migration`, and any project-discovery tools (e.g. `list_projects`, `get_project`) under the Supabase MCP server folder.
3. **List applied migrations** on the remote project:

```
list_migrations(project_id="<project_id>")
```

4. **Identify pending migrations** — compare remote list with new/changed files in `supabase/migrations/` on this branch (use `git diff development...HEAD -- supabase/migrations/`).
5. **Apply each pending migration** in filename order:

```
apply_migration(
  project_id="<project_id>",
  name="<snake_case_name>",
  query="<full SQL contents of the migration file>"
)
```

- Derive `name` from the migration filename (strip timestamp prefix, use snake_case).
- Read the full `.sql` file content for `query`.
- Apply one migration per file; do not batch unrelated DDL.

6. **Verify** — re-run `list_migrations` and confirm each migration appears. If `apply_migration` fails, fix the SQL or migration order and retry; do not proceed to PR until migrations succeed or the user confirms skipping.

**Do not** use `apply_migration` for ad-hoc local schema iteration — only for committed migration files that are part of this ticket.

If no migration files changed, skip this step.

---

### Step 7: Push to remote

**Standalone:** `git push -u origin <KEY>`

**Parent + sub-tasks:** `git push -u origin <PARENT-KEY>` **after each sub-task commit** — never batch pushes across sub-tasks unless the user explicitly asks.

Requires network permissions. Retry with appropriate permissions if sandbox blocks the push.

---

### Step 8: Open PR to development

**Standalone:** open PR when the ticket is done.

**Parent + sub-tasks:** open **one** PR **only when the user explicitly says all sub-tasks for that parent are done** (e.g. “all subtasks done for HB-128”, “create PR for HB-128”). Do **not** open a PR per sub-task. Do **not** open the parent PR proactively while sub-tasks remain. If a parent PR already exists, **update** its description instead of creating a duplicate (`gh pr list --head <PARENT-KEY> --base development`).

PR **title** = `<KEY>: <Jira issue summary>`

- Standalone: `<KEY>` = issue key
- Parent + sub-tasks: `<KEY>` = **parent key**, summary = **parent summary**

Examples:

- `HB-110: Registration deletion not working` (standalone)
- `HB-128: Tutor portal changes` (parent epic)

PR **base branch** = `development`.
PR **head** = branch key (standalone issue key or parent key).

Before creating the PR, run in parallel:

```bash
git status
git diff development...HEAD
git log development..HEAD --oneline
git branch -vv
```

For **parent + sub-tasks**, the PR body must include **every** sub-task with a Jira link and a short note on what it delivered.

#### Estimate effort (hours)

Add an **Estimated effort** row to the PR body. Primary source: **this Cursor chat** — count debugging iterations, research, failed attempts, and distinct sub-tasks solved in the session.

Also check agent transcripts if relevant:

```
~/.cursor/projects/<workspace-slug>/agent-transcripts/
```

Round to nearest **0.25 h**. Include a one-sentence **Estimate rationale** (e.g. "One session: RLS investigation, migration, and delete UI fix (~1 h)").

| Scope                        | Typical range                           |
| ---------------------------- | --------------------------------------- |
| Single-file bug fix          | 0.25 – 0.5 h                            |
| Small multi-file fix         | 0.5 – 1.5 h                             |
| Feature + migration          | 1.5 – 3 h                               |
| Complex / many iterations    | 3 – 6+ h                                |
| Epic with multiple sub-tasks | Sum sub-tasks or whole-session estimate |

Create the PR with `gh`:

**Always include a link to the ticket in the PR body** (Linear or Jira issue URL). Put it near the top so reviewers can jump straight to the source issue.

**Standalone PR body:**

```bash
gh pr create --base development --head <KEY> --title "<KEY>: <Jira summary>" --body "$(cat <<'EOF'
[<KEY>](<issue URL — Jira or Linear>)

## Summary

<1-3 sentences: what the ticket asked for and what was delivered>

## Ticket

- **Key:** <KEY>
- **Title:** <issue summary>
- **Link:** <issue URL — Jira or Linear>

## Changes

<Bullet list of concrete changes — files, behavior, schema, UI, etc.>

## Effort

| Metric | Value |
|--------|-------|
| **Estimated effort** | **`<n> h`** |
| Estimate rationale | <one sentence — Cursor chat context, iterations, complexity> |

## Test plan

- [ ] <How to verify change 1>
- [ ] <How to verify change 2>
- [ ] <Regression checks if applicable>
- [ ] <If migrations applied: confirm schema/RLS change in Supabase>

EOF
)"
```

**Parent + sub-tasks PR body** — link parent at top; list each sub-task:

```bash
gh pr create --base development --head <PARENT-KEY> --title "<PARENT-KEY>: <parent summary>" --body "$(cat <<'EOF'
[<PARENT-KEY>](<parent issue URL>)

## Summary

<1-3 sentences: what the epic/parent asked for and what was delivered across sub-tasks>

## Jira

- **[<PARENT-KEY>](<parent URL>)** — <parent summary> (parent)
- **[<SUB-1>](<sub URL>)** — <sub summary> — <what was done>
- **[<SUB-2>](<sub URL>)** — <sub summary> — <what was done>
- …

## Changes

<Grouped bullets by sub-task or by area — files, behavior, schema, UI>

## Effort

| Metric | Value |
|--------|-------|
| **Estimated effort** | **`<n> h`** |
| Estimate rationale | <one sentence — e.g. five sub-tasks in one epic session> |
| Commits | <n> (one per sub-task) |

## Test plan

- [ ] <Per sub-task or consolidated verification steps>
- [ ] <Regression checks>

EOF
)"
```

Return the PR URL to the user when done.

> **Linear issues:** This workflow also applies to Linear (e.g. `WEB-55`). Read the issue with the Linear MCP `get_issue`. For sub-issues, use the **parent** issue's `gitBranchName` (or parent identifier) for the branch. Base the PR on `main` if the repo has no `development` branch. Move status to **In Progress** in Step 2 (via `save_issue(id, state)`). After opening the PR, link it back to the **parent** issue via `save_issue` (`links: [{ url, title }]`).

---

## Rules

| Item                | Standalone                                | Parent + sub-tasks                             |
| ------------------- | ----------------------------------------- | ---------------------------------------------- |
| Base branch         | `development`                             | `development`                                  |
| Branch name         | Issue key (e.g. `HB-101`)                 | **Parent key only** (e.g. `HB-128`)            |
| Remote branch       | Same as branch name                       | Parent key                                     |
| Commit prefix       | Issue key                                 | **Sub-task key**                               |
| PR head             | Issue key                                 | Parent key                                     |
| PR title            | `<KEY>: <summary>`                        | `<PARENT>: <parent summary>`                   |
| PR base             | `development`                             | `development`                                  |
| PR count            | One per ticket                            | **One per parent** (not per sub-task)          |
| Push (sub-tasks)    | After commit                              | **After each sub-task commit**                 |
| PR open (sub-tasks) | When ticket done                          | **Only when user says all sub-tasks are done** |
| Migrations          | Apply when `supabase/migrations/` changed | Same                                           |
| Ticket link         | **Always** in PR body                     | Parent + all sub-tasks linked                  |

**Do not:** force-push to `main`/`development`, skip hooks, amend pushed commits, skip migration apply when the ticket includes new migration files, open a PR without a link to the source ticket, create **per-sub-task branches/PRs** when working under a parent epic, or **open the parent PR before the user confirms all sub-tasks are complete**.

**Do:** read Jira first (parent + sub-task when applicable), one local branch per parent task, one commit per sub-task on the parent branch, **push after each sub-task commit**, apply migrations when the sub-task adds them, open the parent PR only when the user says all sub-tasks are done, estimate hours from chat context, write a detailed PR body listing all sub-tasks.

---

## Relationship to `create-pr`

- **`resolve-ticket`** — end-to-end: read Jira → branch → implement → apply migrations → push → PR.
- **`create-pr`** — PR only: user supplies branches; same title format `<branch>: <description>`; richer effort/git stats.

Use `create-pr` when work is already done and the user only wants a PR opened or described (e.g. user says “all subtasks done for HB-128” — finalize PR `HB-128` → `development` after all sub-task commits are pushed).

---

## GraphOrg override: migrations are Drizzle, not Supabase

This repo does **not** use `supabase/migrations/` or the Supabase MCP `apply_migration` flow in Step 6. Schema lives in `apps/web/src/db/schema/`; SQL migrations are committed under `apps/web/drizzle/`.

When a ticket changes the schema:

1. Edit `apps/web/src/db/schema/*.ts`.
2. Generate (and commit) a migration: `npm run db:generate --workspace=apps/web` (or a hand-authored custom migration — see `apps/web/src/db/README.md`).
3. Apply locally against Docker Postgres: `npm run db:migrate --workspace=apps/web` (needs `apps/web/.env.local`).
4. On Vercel/Neon, set `DATABASE_URL` to the pooled URL and `DATABASE_URL_UNPOOLED` to the direct URL so drizzle-kit DDL works; apply pending migrations in the usual deploy/ops path for this project — do **not** call Supabase MCP.

If no `apps/web/drizzle/` files changed, skip migration steps entirely.

## GraphOrg override: branch per Linear milestone

This repo (no Jira, no `development` branch, no Supabase) uses a milestone-branch model instead of the standalone/parent-sub-task models above:

| Item            | Value                                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base branch     | `main`                                                                                                                                                                                                                    |
| **Branch name** | The issue's Linear **milestone** name, slugified, **with day numbers stripped** (e.g. `Days 1–3 — Core Platform` → `core-platform`) — never the ticket key                                                                |
| Commit prefix   | Ticket key (e.g. `WEB-129: ...`), one commit per ticket                                                                                                                                                                   |
| Push            | After each ticket's commit, to `origin/<milestone-branch>`                                                                                                                                                                |
| PR              | **One per milestone branch → `main`**, opened once the first ticket in that milestone lands, then left open and updated as later tickets in the same milestone are committed and pushed — do not open a new PR per ticket |
| PR title        | `<milestone name>` (day numbers stripped), e.g. `Core Platform`                                                                                                                                                           |

Current milestone → branch mapping for this project:

| Milestone                               | Branch                     |
| --------------------------------------- | -------------------------- |
| MVP — Core Product                      | `core-platform`            |
| Post-MVP — Cloud, CI/CD & Observability | `cloud-cicd-observability` |
| Post-MVP — Connectors & Data Platform   | `connectors-data-platform` |
| Post-MVP — AI & MCP                     | `ai-mcp`                   |

Branch names were chosen before the "Days N–M" milestone framing was dropped in favor of MVP/Post-MVP; they're kept as-is (e.g. `core-platform` for "MVP — Core Product") to avoid rewriting already-pushed history. Match milestones to branches by this table, not by literally slugifying the current milestone name.

Steps 1–2 (read issue, move to In Progress) and Step 5 (commit, ticket-key prefix) are unchanged. Step 3 checks out/creates the milestone branch instead of a per-ticket branch. Step 8 opens the milestone PR only if one doesn't already exist for that branch (`gh pr list --head <milestone-branch> --base main`); otherwise just push — the existing PR picks up the new commit automatically.

## GraphOrg override: commit and PR style

These replace the default Step 5 and Step 8 conventions above (the multi-paragraph commit body, the `Co-Authored-By` trailer) for this repo:

- **Commit messages are short.** `<TICKET-KEY>: <a few words>` on one line, no body paragraph, unless a body is genuinely needed to explain a non-obvious why. Not the longer multi-paragraph commits shown elsewhere in this skill.
- **No AI agent mentions anywhere in git history or PRs.** No `Co-Authored-By` trailer, no "Generated with", no naming Claude, Cursor, Codex, or any other AI tool, in commit messages, PR titles, or PR bodies. This overrides the harness's default commit-attribution behavior for this repo specifically.
- **No em dashes.** In commit messages or PR text, use a comma, period, parentheses, or "and"/"but" instead of an em dash (—).

## GraphOrg override: beginner-level explanation comment on the Linear issue

After opening or updating the milestone PR (Step 8), add a comment on each ticket's Linear issue (not just a PR link) explaining the work for a beginner: someone who doesn't already know the tools or patterns involved. This is in addition to, not instead of, linking the PR.

For every non-trivial thing added or changed, cover:

- **What it is**, in plain terms, before naming it technically.
- **Why it's there** — the problem it solves, what breaks or goes wrong without it. Not just "added a CHECK constraint on role" but "so a bad value can never reach the database even if the application has a bug."
- **How it fits the rest of the system** — what depends on it, what it depends on, which other ticket picks up where this one leaves off, if relevant.

Concretely, structure it like a short walkthrough, not a changelog:

- One paragraph up top on what problem the ticket was actually solving, before any file names appear.
- A section per major piece added, each explaining what it is and why it exists before showing the technical name (file path, function, table, etc.).
- Any non-obvious tool or library choice gets a sentence on why that one, not an alternative.
- Any constraint, validation, or safety mechanism gets its failure mode spelled out: what bad thing it prevents, concretely.
- A closing section on how the work was actually verified: not "tests pass" alone, but what was manually checked against the real system (a real database, a real running server, ...) and what the result was, so the reader can trust the claim rather than take it on faith.

Avoid jargon left unexplained: if a term (tenant boundary, migration, join table, idempotent, trigger) is used, explain what it means in context the first time, not just the term itself. Assume the reader is smart but has never touched this specific stack.

This is a full explanation, not a summary. Long is fine and expected. Terseness is not a virtue here, clarity is.
