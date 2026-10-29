# Policy: Dependencies

Prefer the standard library or existing dependencies when adequate.

A new production dependency requires:

- explicit necessity;
- why existing capabilities are insufficient;
- build/deployment impact;
- license/security compatibility where relevant;
- version/update implications;
- inclusion in the active task scope.

Do not add a dependency solely to simplify a tiny implementation detail when the
maintenance cost exceeds the benefit.
