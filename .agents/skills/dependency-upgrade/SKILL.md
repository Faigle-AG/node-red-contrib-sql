# Skill: Dependency Upgrade

Load for dependency additions/upgrades.

## Workflow

1. Identify direct reason for the dependency/change.
2. Review release notes / breaking changes relevant to actual usage.
3. Check security/license constraints where required.
4. Update the authoritative dependency declaration and lock mechanism.
5. Avoid unrelated bulk upgrades unless explicitly scoped.
6. Run compatibility and regression tests.
7. Record any runtime, deployment, or API implications.
