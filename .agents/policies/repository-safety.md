# Policy: Repository Safety

Before broad changes:

- inspect working-tree state;
- identify unrelated modifications;
- identify generated/vendor boundaries;
- identify active editor ownership.

During changes:

- preserve unrelated work;
- avoid destructive reset/rewrite;
- keep source and generated artifacts separate;
- preserve frozen evidence;
- do not remove historical failures merely because a fix now passes.

If concurrent edits are detected, stop on the conflicting files and coordinate ownership.
