# Skill: Database Migration

Load this skill only when a schema/data migration is actually part of the task.

## Workflow

1. Identify current schema/version and authoritative migration mechanism.
2. Define forward and rollback behavior.
3. Define transaction/atomicity boundaries.
4. Define idempotency expectations.
5. Define compatibility window for old/new readers.
6. Create bounded disposable migration fixtures.
7. Test:
   - fresh database;
   - populated database;
   - rollback/failure;
   - repeated execution;
   - unsupported version;
   - data/reference integrity.
8. Run required integration/regression tests.
9. Never run against production without explicit production authorization.
