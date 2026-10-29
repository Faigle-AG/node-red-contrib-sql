# Policy: Review and Status

Use precise classifications.

## Finding classifications

- **CONFIRMED DEFECT** — implementation is demonstrably incorrect.
- **REQUIRED** — must be resolved before scoped completion.
- **ACCEPTED** — satisfies the applicable contract.
- **OPTIONAL IMPROVEMENT** — useful but not required.
- **DEFERRED** — valid work intentionally postponed with justification.
- **OUT OF SCOPE** — unrelated to the active task.
- **UNRESOLVED** — evidence is insufficient.
- **BLOCKED** — progress depends on an external decision/resource.
- **SUPERSEDED** — replaced by newer authoritative direction.

Every finding should state evidence and resolution conditions.

## Role verdicts

A role's verdict always names an artifact identity:

- **ACCEPT** — this role finds the artifact satisfies its contract;
- **HOLD** — this role blocks it; state the finding;
- **AMEND** — acceptable after a stated change.

**Agent consensus** means every assigned role has posted ACCEPT on the same artifact
identity. It is not task acceptance: only the designated completion authority records
a task as ACCEPTED.

Do not invent compound statuses; use the status vocabulary in the root `AGENTS.md`.

Silence is never acceptance.
