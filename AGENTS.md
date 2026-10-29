# AGENTS.md — Repository Agent Contract

Universal rules only. Detailed instructions are loaded just in time.
This file is the AGENTS.md compatibility layer. The `.agents/` framework extension is
loaded only as directed here, by active tasks, or explicit harness configuration.

## Instruction loading

Every agent reads this file, then only:
1. its assigned role under `.agents/roles/`;
2. policies required by the active task;
3. `PROJECT.md` at the repository root, when present;
4. the nearest directory-level `AGENTS.md`;
5. the active task or execution plan;
6. a relevant `.agents/skills/*/SKILL.md` when that workflow is actually used;
7. `.agents/policies/multi-agent-coordination.md` when more than one agent works the same task.
   On joining, load it, pick a playful speaker name, and check in to the channel before other work.

Do not preload unrelated roles, policies, plans, or historical tasks.

## Precedence

Resolve conflicts in this order: (1) latest explicit user direction; (2) active acceptance
criteria; (3) repository mission / architecture invariants; (4) active task or execution plan;
(5) nearest directory `AGENTS.md`; (6) `PROJECT.md`; (7) this root file; (8) existing
implementation and historical notes. Record supersessions; never rewrite history.

`PROJECT.md` and nested `AGENTS.md` files add specifics; they never silently weaken root safety rules.

## Universal engineering rules

- Scope & Minimalism: Define scope and measurable acceptance criteria before substantive edits.
- Make the smallest coherent change meeting accepted criteria; do not silently expand scope.
- Scale process to risk; trivial reversible edits need no plan or task files.
- A user direction applies within stated scope ("you don't need to X" is permission, not prohibition).
- Separate facts from assumptions, hypotheses, risks, and unresolved questions. Unknown is valid.
- Absence of evidence is not negative evidence. A heuristic is not probability/confidence unless its event and denominator are defined.
- Never fabricate requirements, evidence, labels, benchmarks, citations, approval, or production observations.
- Preserve unrelated data, frozen evidence, provenance, and historical results.
- Take hashes, timestamps, and counts directly from tool output in the same step.
- When facts are disputed, re-check evidence; do not concede statements you cannot find.
- Green tests are evidence, not automatic acceptance. Negative or partial results beat false completion claims. Silence is not approval.
- A failing test may indicate implementation, fixture, specification, environment, or test-logic failure; find the faulty layer first, never weaken assertions or invent fixture evidence. Preserve useful pre-fix failures when practical (`.agents/policies/testing.md`).
- Separate Phases: Keep distinct: implementation; compilation / static validation; runtime testing; integration verification; training, data generation, benchmarking, or production operations; and independent review / completion decision. Success in one does not prove another.
- Single Writer: Use single-writer discipline for product code and shared coordination/index files. Only assigned editors change scoped product files. On concurrent/unexplained edits: stop on those files, preserve changes, report, and resume only after ownership is clear.
- Zero Attribution: Add no agent, model, or vendor attribution to commits, pull requests, issues, release notes, or other published text. Only an agent with a project-assigned git identity may appear in git metadata, and only as that identity.
- Proposals: Agent-originated thresholds and defaults are proposals; never let them override or filter a user choice.

## Safe autonomy

- Allowed: Read/search source; run bounded local tests; create disposable fixtures.
- Assigned editor only: Edit scoped product code.
- Task justification / scope required: Add production dependencies (`.agents/policies/dependencies.md`); modify persistent schemas (`.agents/policies/versioning-and-compatibility.md`).
- Explicit user authorization required: Touch production data; delete/rewrite evidence; publish/deploy/restart services; destructive git/history operations; read private data outside workspace (home, shell history, credentials); write outside workspace or approved scratch (report accidental writes); build/test/run untrusted or suspect code (isolate it in sandbox).
- Stricter harness permissions: Follow stricter harness permissions when present; never bypass them.

## Roles

Files are `.agents/roles/<name>.md`: implementer, challenger (reviewer), moderator (coordinator), architect, test-manager, repository-manager, documentation, security, release, data-database, research-ml. An agent may hold multiple explicitly assigned roles. Never silently assume one.

## Definition of done

Vocabulary: `PLANNED`, `IMPLEMENTING`, `IMPLEMENTED`, `VERIFIED`, `REVIEW PENDING`, `ACCEPTED`, `INCOMPLETE`, `BLOCKED`, `DEFERRED`, `REJECTED`, `OUT OF SCOPE`, `UNRESOLVED`, `SUPERSEDED`.
Do not claim COMPLETE/ACCEPTED while mandatory work or review remains.
