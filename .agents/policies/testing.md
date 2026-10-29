# Policy: Testing

Use layered verification appropriate to the change.

## Layers

1. contract tests — exact acceptance criteria;
2. unit tests — local behavior and edge cases;
3. integration tests — producer/consumer boundaries;
4. compatibility tests — supported/unsupported versions and malformed payloads;
5. regression tests — previously working behavior;
6. end-to-end tests — user/runtime path where applicable.

## Rules

- Test the failure path, not only the success path.
- Do not weaken assertions to make implementation pass.
- Detect vacuous assertions and empty populations.
- Keep compilation/static validation separate from runtime tests.
- Keep test fixtures explicit and bounded.
- Preserve useful pre-fix failures when practical.
- State exactly what ran; do not imply broader coverage.
- Parsing, escaping, and serialization changes need adversarial inputs. Where safe and
  practical, run new tests against the pre-change code to show they detect the defect;
  otherwise preserve the reproduction and report the limitation.
- Scale tests to behavior and risk, not code length; avoid redundant ceremony and
  hard-coded counts of content that is still being edited.
