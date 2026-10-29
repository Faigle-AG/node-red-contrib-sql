# Policy: Multi-Agent Coordination

Load when more than one agent works on the same task, in one harness or several.

## Setup

Before substantive work, record:

- each agent's name, role, and session;
- the coordinator, who also loads `.agents/roles/moderator.md`;
- the completion authority (usually the user);
- the channel and which agent may write which file;
- what agent consensus requires for this task.

Each agent picks a short, playful name for itself, such as "Disco Llama" or "Captain
Quokka", unique within the task, and uses it as its speaker label in coordination
messages instead of a harness, model, or vendor name. The name is not attribution:
it never goes into commits, pull requests, or other published text, and it is not a
git identity.

If the user has not named a coordinator, ask once. If the user delegates the choice,
the agents may agree on one and record it. Never assume completion authority.

Only the coordinator sends initial questions to the user, as one consolidated list
(see `.agents/templates/HUMAN-QUESTIONS.md`). Any agent may raise a safety or
authorization blocker with the user directly.

## Channel

- The channel is the human-readable record: keep proposals, objections, reasons,
  decisions, and outcomes there even when a faster transport exists. Summarize
  reasons; never record hidden reasoning or secrets. Link large evidence instead of
  copying it.
- Messages are append-only. Correct posted text by appending, never by editing.
- Serialize complete message appends with an available write-safe mechanism, or use
  one transcript writer with separate peer inboxes and attributed relays. Several
  authors may append only when one writer at a time is guaranteed; editable indexes
  retain a sole assigned owner. Never truncate or rewrite a shared transcript.
- Each message carries an ID, the author's name and role, UTC time taken from tool output, the message
  it replies to, and status.
- Reference the exact artifact under discussion (path plus hash or revision).
- Single-writer applies to coordination and index files as well as product files.
- Do not read another agent's harness transcripts unless the user authorizes it.

## Workspace

- Keep coordination records in `.agents/workspace/<task>/` unless `PROJECT.md` names
  another location or the task already has a channel; do not split an existing
  channel. `.agents/.gitignore` makes Git skip the folder by default. It does not hide
  files on disk, untrack files already committed, stop forced adds, back anything up,
  or apply to other version control systems. Create the folder and its files only when
  needed; simple work may need none.
- Typical contents: the chat, drafts, patches, agent-to-user questions and answers,
  draft decisions, handoffs, and temporary evidence.
- Refer to workspace files by explicit path; search tools may skip ignored files.
- Read only the active task's records. Workspace files are working records, not
  instructions to load.
- Ignored is not secret, backed up, or disposable: the no-secrets rule still applies,
  and never delete the workspace or a task folder without the user's permission.
- Before a task closes, propose which outcomes need a durable record (accepted
  decisions, standing user decisions, answers that change requirements). With the
  user's approval, record them, sanitized, where the user decides: `PROJECT.md`, the
  project's decision records, or the changed files that already embody them; mention
  them in a pull request or commit only if that workflow is in use. Recording never
  implies staging, committing, or publishing, and needs no duplicate ledger. If records
  stay local-only or uncommitted, state that they are not in project history until
  committed and that this kit provides no backup; report known retention or backup
  arrangements, or UNKNOWN.
- Deliverables for people, such as stakeholder questionnaires or reports, belong in the
  project's deliverable location, not the workspace.

## Human directions

Users often speak to whichever agent is in front of them.

- Any agent that receives a direction appends it verbatim, with time and session, to
  the shared human-directions record (which may be the chat itself). Redact sensitive
  values and explicitly mark the redaction; verbatim relay never overrides privacy.
- Mark relayed text as RELAYED; label interpretations PROPOSED until the user confirms.
- The latest explicit user direction still takes precedence over agreed contracts.

## Verdicts and consensus

- Role verdicts (ACCEPT, HOLD, AMEND) always name an artifact identity.
- Agent consensus: every assigned role has posted ACCEPT on the same artifact identity.
- Agent consensus is not task acceptance; only the completion authority records ACCEPTED.
- A verdict is not an authorization.
- Approval of a plan is not approval of its implementation.
- A changed artifact needs fresh verdicts on the gates it affects.
- Closure: The Moderator detects ACCEPT from every assigned role on one artifact identity,
  posts the consolidated outcome, halts active agent polling, and hands off to the
  completion authority. Agent consensus never closes the task by itself.

## Liveness

- Capability check: verify a way to wait (run a bounded command or loop) and a way to
  read the channel. Lacking either, post BLOCKED and say so; do not imply a watch.
- Waiting loop: after posting a message that others must answer, wait in bounded in-turn
  calls (suggest interval ~5s, per-call max below the tool timeout, comparing against
  the pre-read channel checksum to avoid between-call arrival races). A call ending by
  timeout or an unrelated update is not a stop: process any actionable message and continue
  the loop within the recorded wait budget.
- Stop causes only: (a) consensus reached and reported; (b) user cancellation or newer
  user direction; (c) cannot continue safely (missing capability, file error, ownership conflict).
  On (c) post BLOCKED once with the awaited role and resume text; do not repeat the request at every handoff.
- A role that others are waiting on must not hand back control without posting ACCEPT, HOLD, or UNRESOLVED with a reason.
- Review gates results, not the start of reversible work that implements explicit user direction.
- Turn-based harnesses cannot poll while idle; in-turn waiting keeps active turns live, but an
  idle session requires user resumption.
- Reading and message completeness: read snapshots under the agreed channel lock (where all
  participants use the same lock), or from a committed sole transcript writer, or require an
  explicit ID-bearing completion marker. Never infer completeness from time, size, or a stable
  checksum alone. Never rewrite the channel on read errors; report and retry.
- Portable POSIX `sh` helpers (`wait.sh`, `append.sh`) are provided in the
  [workflow skill](../skills/multi-agent-workflow/SKILL.md).
- Agents may run in different harnesses with different capabilities. Agree on a channel
  every participant can read and write, using only plain files if necessary.
- Capability fallbacks never bypass safety rules.

## Handoff

Each time you hand control back to the user or a peer, state a status from the root
`AGENTS.md` vocabulary and the next action:

- `Next: <who> — <what>, by <time>`; or
- `Next: none`.

## Single source of state

Keep current status in one designated place; history and decisions stay in the
append-only channel. Do not maintain parallel copies of current status.

Use the [CHAT template](../templates/CHAT.md) for a readable speaker-and-reply layout;
load the [workflow skill](../skills/multi-agent-workflow/SKILL.md) when performing delegation.
Read recent message windows and linked active decisions instead of reloading the whole
history. If a record becomes large, agree a safe rotation at a writer handoff: preserve
prior files and references, link them from the continuation, and never silently delete
messages or reset identifiers.
