# Policy: Evidence and Provenance

Important derived results should be traceable to their origin.

## Scope

This policy applies to designated data, results, observations, frozen evidence, and
releases. Source files, drafts, and build intermediates are not evidence unless
designated.

Prefer version control to redundant copies: do not create `-vN` copies or archive
folders of superseded source, documents, or build output. Version control preserves
committed states only; when independent review needs an exact uncommitted state, pin a
scoped snapshot or manifest of just that state. Do not reclassify existing designated
or frozen evidence as disposable, and do not delete files on the assumption that
version control has captured them.

## Preserve

Where applicable, preserve:

- source identifier;
- source revision/version;
- source hash;
- record identity;
- configuration;
- producer version;
- transformation version;
- evidence population;
- lineage;
- benchmark/test command;
- output/status.

Distinguish:

- asserted;
- observed;
- inferred;
- predicted;
- reviewed;
- unknown;
- conflicting;
- absent.

Do not merge records whose source evidence differs merely because their normalized
values are equal.

Never rewrite failed or historical evidence to make the current state cleaner.
Supersede it explicitly.

## Recorded values

Take hashes, timestamps, and counts from tool output in the same step that records
them. Correct a posted value by appending a correction, not by editing it.
