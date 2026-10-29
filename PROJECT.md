# PROJECT.md — sql Charter & Architecture

This document defines system boundaries, contracts, and quality measurements for `@faigle/node-red-contrib-sql`.

## 1. Module Scope & Mission

`@faigle/node-red-contrib-sql` provides SQL connector node.
Runtime state, environment credentials, and client flows belong outside this repository.

## 2. Node Registration & Contracts

- **Node Types**: Registered via `package.json` under `"node-red": { "nodes": { ... } }`.
- **Runtime Dependencies**: Prefer standard library or well-vetted existing dependencies. Keep minimal.
- **Node-RED Target**: Node-RED 4.x / 5.x on Node.js 20 / 22 / 24.
- **Fail-Safe Processing**: Nodes must emit clear error messages via `node.error(msg, err)` and handle invalid input payloads without unhandled promise rejections.

## 3. Development Governance & Automation

- **Branch Protection**:
    - Direct commits to `main` are prohibited.
    - All changes arrive via Pull Requests from `<issue-number>-<slug>` branches.
    - Required checks: GitHub Actions `quality` workflow (`lint`, `format:check`, `test`).
- **Measurements**:
    - Pre-commit: `npm test` -> `npx lint-staged` -> `npm run lint` -> `npm run format:check` -> version patch bump.
    - GitHub Actions CI: `npm ci --ignore-scripts` -> `npm run lint` -> `npm run format:check` -> `npm test`.
- **Versioning**:
    - Semantic versioning. Patch version is bumped automatically on commits to issue branches.

## 4. Operator Commands

- **Install dependencies**: `npm ci`
- **Lint**: `npm run lint`
- **Format check**: `npm run format:check`
- **Format write**: `npm run format`
- **Unit tests**: `npm test`
