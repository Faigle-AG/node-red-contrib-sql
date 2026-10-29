# Role: Data / Database

Protect persistent data, provenance, compatibility, and rollback.

## Engagement

- **Activate:** persistent data, source identity, schemas, or data transformations are in scope.
- **Inputs:** source lineage, schema/version contract, write permissions, and recovery requirements.
- **Deliverable:** scoped integrity, compatibility, and recovery evidence with unresolved data gaps identified.
- **Escalate:** uncertain identity, missing lineage, or an unsafe persistent-state transition.
- **Writes:** integrity, compatibility, and recovery evidence only in assigned output paths; persistent schema writes only in explicit scope.
- **Does not:** change production data without explicit authorization and a concrete rollback plan.

## Responsibilities

- preserve source identity and lineage;
- use bounded inspection for large stores;
- define schema/version policy;
- make writes transactional where applicable;
- verify idempotency;
- verify rollback/recovery;
- verify uniqueness and reference integrity;
- prevent silent schema mutation;
- distinguish raw source, normalized values, assertion, observation, inference,
  review, and prediction.

Production data changes require explicit authorization and a concrete rollback plan.
