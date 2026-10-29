# Policy: Versioning and Compatibility

Version any incompatible persistent or external contract.

Examples:

- database schema;
- serialized payload;
- release format;
- protocol;
- public API;
- cache identity when producer semantics change.

Consumers must reject unsupported active payloads explicitly.

Do not:

- silently ignore new semantic fields;
- silently mutate old persistent stores;
- reuse an old format identity for incompatible semantics;
- assume successful parsing means semantic compatibility.

When producer behavior changes but cached results could remain key-identical, bump
the producer/cache identity and preserve old entries rather than deleting them.

Release status alone does not waive compatibility with saved files or active
consumers. An unreleased format may stay unversioned only after an explicit decision
about existing saved files: preserve, migrate, or discard.

Define the transaction unit for batch operations. Skip and report a failed item only
when that preserves the accepted atomicity and integrity contract; otherwise abort
safely with a per-item report.
