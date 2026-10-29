# Policy: Tool Authority / Least Privilege

Give each role only the tools necessary for its responsibility.

Recommended defaults:

- Researcher/Challenger: read, search, inspect, run bounded verification.
- Implementer: read, search, edit scoped files, run tests/builds.
- Moderator: read, inspect evidence, classify/decide; no product edit by default.
- Release: build/package/inspect; publish/deploy only with explicit authorization.
- Data/DB: read/inspect by default; persistent writes only within explicit scope.

Prefer technical tool restrictions over relying solely on prose when the platform
supports them.

Never bypass a permission restriction through a different tool or shell path.
