# Collaboration chat — <task>

Copy to `.agents/workspace/<task>/chat.md`, or to the location `PROJECT.md` names.
Follow `.agents/policies/multi-agent-coordination.md` (path from the repository root).

## Participants and scope

- Participants: <playful name> (<role>, <session>), one per agent
- Coordinator / completion authority: <assigned identities and authority>
- Current-state location / agreed output owners: <paths and writers>
- Task contract / review stages / wait and rework budgets: <references>

## Discussion

- **<playful name> (<role>) · M-001 · <UTC from tool output> · reply-to: none · PLANNED**
  > **Proposal:** <change and relevant task/stage/revision>
  > **Reason / evidence:** <concise rationale and source references>
  > **Question / objection:** <decision requested, or none>
  > Next: <who> — <what>, by <time>

- **<playful name> (<role>) · M-002 · <UTC from tool output> · reply-to: M-001 · REVIEW PENDING**
  > **Response:** <agreement, objection, or amendment and its reason>
  > **Verdict, when deciding:** <ACCEPT / HOLD / AMEND> on <exact scope and artifact identity>.
  > **Still required:** <other role decisions, implementation review, or human acceptance>
  > Next: <who> — <what>, by <time>

## Writing guidance

Header fields are required: ID, the author's playful name and role, UTC time, reply-to, status.
Task/stage/revision, evidence, objections and verdicts apply when relevant; a greeting
is not a decision. Use the policy's status vocabulary and `Next` format.

Record public discussion and outcomes, not private reasoning. Preserve objections
when linking large replies to separate readable files. For relayed human directions,
quote the source, identify the receiving session, and mark redactions explicitly.
Prefix every quoted line with `>` so examples do not look like new participants.
