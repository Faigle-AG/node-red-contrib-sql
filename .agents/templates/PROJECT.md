# PROJECT.md — <project name>

Project-specific context for agents, loaded by root `AGENTS.md` when present. It adds
specifics and never weakens root safety rules. Project commands live in the "Project
commands" section of `AGENTS.md`.

## Project context

Read only when relevant:

- Mission / architecture: `<path>`
- Current state: `<path>`
- Active task ledger: `<path>`

## Coordination

Define the project's actual coordination mechanism here, for example:

- Implementer → `<issue/PR/file/channel>`
- Reviewer → `<issue/PR/file/channel>`
- Moderator decision → `<issue/PR/file/channel>`

Do not create alternative coordination channels without authorization.

## Completion authority

Designated final authority for multi-agent acceptance:
`<role or human>`

## Production boundaries

- Production environment:
- Explicitly protected datasets/services:
- Required human approval:

## Operator environment

- Shell / OS / package manager:
- Sandbox: what is mounted; where version control and real data live:
- Where commands run (inside the agent harness or a separate terminal):
- How code reaches the operator (shared mount, copy, checkout):
- Clipboard / copy-paste available:

## Protected paths

- Paths agents must not read or search:

## Standing user decisions

- `<decision>` — `<date>` — `<scope>`

## Model profiles

- `<model / harness>`: context size, timeouts, supported capabilities; verify required instructions are loaded

## Plans and records

- Coordination workspace: `.agents/workspace/` by default; override: `<path | none>`
- Durable decision records (user-approved location): `<path | none>`
- Location for plans and task records: `<path | none>`
