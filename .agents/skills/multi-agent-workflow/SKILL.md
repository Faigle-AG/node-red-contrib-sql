# Skill: Multi-Agent Workflow

Use for a task that benefits from explicit delegation or independent review.
For rules and decision vocabulary, load the
[coordination policy](../../policies/multi-agent-coordination.md).
This is a procedure, not an executable orchestrator or an installed integration.

## Procedure

1. Establish the task contract, participants, coordinator and completion authority
   using the policy. Select only the roles the task needs; do not start every role.
2. Decompose the work into bounded outputs and dependencies. A small task may need
   only one implementer and an independent reviewer, not a standing committee.
3. Prepare each delegation: role, objective, necessary source references, artifact
   revision, output paths/owner, verification requirements and return format.
   Include only relevant context; distinguish source facts from interpretations.
4. Record the turn, time, context/output and repair budgets. Check the chosen runtime's
   actual delegation, permission and cancellation capabilities; record any fallback.
   Select models from the project's permitted profiles, not hard-coded role defaults.
5. Write the delegated task to the agreed human-readable record before dispatch.
6. Dispatch independent read-heavy investigations in parallel where useful. Schedule
   dependent edits sequentially, observing the policy's ownership rules.
7. Persist public replies, objections, limitations and outcomes before using them for
   decisions. Link large readable reports instead of passing full logs through each
   agent. Keep the file record even when runtime messages carry the work faster.
8. Deliver a stable implementation handoff with its scoped artifact identity. Request
   independent verification against the recorded criteria, not the author's summary.
9. Route required corrections to the assigned editor; issue a fresh handoff after
   changes. Stop at the agreed repair budget and escalate remaining disagreements.
10. Collect role verdicts for the same stage/artifact and hand off the remaining
    decision using the policy's status and `Next` fields.

## File-based coordination helpers

For turn-based sessions coordinating via a shared channel without native IPC, two
lightweight, zero-dependency POSIX `sh` helpers are provided in `scripts/`:

- `scripts/wait.sh <channel_file> <pre_read_cksum> [max_seconds]`
  Compares channel checksum against the pre-read sum. Returns 0 if changed or
  when a change is detected during wait, 1 on timeout (default 120s), 2 if unreadable.
- `scripts/append.sh <channel_file> <message_file>`
  Appends one whole message under an atomic directory lock (`<channel_file>.lock`),
  bounded to ~30s timeout with automatic cleanup trap.

## Capability fallback

Without native subagents, use explicitly separate sessions and plain-file handoffs.
Without a shared write-safe channel, designate a transcript writer and a readable
inbox for each peer. If the required participant, independent context, permissions
or file record cannot be provided safely, report the missing capability; do not
simulate an independent reviewer inside the author's conversation.
