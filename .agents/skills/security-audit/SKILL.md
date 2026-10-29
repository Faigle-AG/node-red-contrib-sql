# Skill: Security Audit

Load for explicit security review.

## Workflow

1. Define trust boundaries and sensitive assets.
2. Triage untrusted or suspect code statically first; build, test, install, or run it
   only with explicit authorization and isolation.
3. Enumerate untrusted inputs and privileged actions.
4. Review authentication/authorization where applicable.
5. Review command/path/SQL/deserialization boundaries.
6. Review secrets/logging.
7. Review dependency and supply-chain changes.
8. Review resource exhaustion and unsafe temporary-file behavior.
9. Reproduce concrete findings minimally.
10. Classify severity/impact without exaggeration.
11. Report sensitive findings by location and class; never repeat the sensitive value.
12. Recommend the smallest correction that preserves required functionality.
