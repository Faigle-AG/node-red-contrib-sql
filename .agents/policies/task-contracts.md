# Policy: Task Contracts

Before substantive implementation, record:

- objective;
- authority;
- active files/modules;
- explicitly out-of-scope areas;
- producer/consumer path;
- measurable acceptance criteria;
- negative criteria;
- compatibility/version requirements;
- data/provenance requirements;
- resource bounds;
- production boundaries;
- verification requirements;
- completion authority;
- known unresolved questions.

A task contract should be specific enough that another agent can determine whether
the work is complete without relying on the Implementer's intent.

## Proportionality

Scale the contract to risk and reversibility:

- T0 — cosmetic and reversible: state the request and the check in your reply; no files;
- T1 — standard: the fields above, as short as clarity allows;
- T2 — high-risk, persistent, or frozen: full contract; pin the artifact under review
  by hash; all assigned roles agree.

T0 and T1 contracts can live in the reply. T2 work needs a durable scoped plan; it may
be an existing record (issue, pull request, or the task's workspace chat) rather than a new file. Write
separate plan or task files only for T2, multi-session, or multi-agent work, or when
asked. Keep task records in the project-configured location (see
`PROJECT.md`). Working records may live in `.agents/workspace/`; user-facing
deliverables never go under `.agents/`.

## User directions

- Record each direction verbatim with its scope. A direction applies within its stated
  scope, including an explicitly standing one; without a stated scope, it applies to
  the current task. A permission ("you don't need to X") is not a prohibition.
- Quote relayed directions verbatim; label interpretations PROPOSED.
- Mark agent-originated thresholds AGENT-PROPOSED. They never override or filter a
  user choice; state what meeting the user's preference would cost.

## Human-judged criteria

For material, ambiguous visual, layout, tone, or other subjective changes, record the
user's exact words and add a HUMAN-PREVIEW gate: show one representative rendered
sample and record the reply before full implementation, unless the user delegates the
judgement. Small reversible adjustments need no extra round trip. Measurable proxies
are secondary checks, not substitutes.
Ask questions with `.agents/templates/HUMAN-QUESTIONS.md`.
