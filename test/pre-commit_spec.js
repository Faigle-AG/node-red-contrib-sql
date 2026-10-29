const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const hook = path.resolve(__dirname, '../.husky/pre-commit');
const branchLookup = 'git symbolic-ref --quiet --short HEAD';

describe('pre-commit branch guard', function () {
    let directory;
    let trace;

    beforeEach(function () {
        directory = fs.mkdtempSync(path.join(__dirname, '.pre-commit-fixture-'));
        trace = path.join(directory, 'trace');
        fs.writeFileSync(
            path.join(directory, 'git'),
            `#!/bin/sh
printf 'git %s\\n' "$*" >> "$HOOK_TRACE"
case "$*" in
    'symbolic-ref --quiet --short HEAD')
        [ "$TEST_GIT_STATUS" = 0 ] || exit "$TEST_GIT_STATUS"
        printf '%s\\n' "$TEST_BRANCH"
        ;;
    'add package.json package-lock.json') ;;
    *) exit 97 ;;
esac
`,
            { mode: 0o755 },
        );
        fs.writeFileSync(
            path.join(directory, 'npm'),
            `#!/bin/sh
printf 'npm %s\\n' "$*" >> "$HOOK_TRACE"
case "$*" in
    test) exit "$TEST_NPM_STATUS" ;;
    'run lint') exit "$TEST_LINT_STATUS" ;;
    'run format:check') exit "$TEST_FORMAT_STATUS" ;;
    'version patch --no-git-tag-version') exit "$TEST_VERSION_STATUS" ;;
    *) exit 98 ;;
esac
`,
            { mode: 0o755 },
        );
        fs.writeFileSync(
            path.join(directory, 'npx'),
            `#!/bin/sh
printf 'npx %s\\n' "$*" >> "$HOOK_TRACE"
[ "$*" = lint-staged ] || exit 99
exit "$TEST_NPX_STATUS"
`,
            { mode: 0o755 },
        );
    });

    afterEach(function () {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    function runHook(overrides = {}) {
        // Match Husky's `sh -e` invocation, but never run real npm/npx/git commands.
        const result = spawnSync('sh', ['-e', hook], {
            cwd: directory,
            env: {
                ...process.env,
                PATH: `${directory}${path.delimiter}${process.env.PATH}`,
                HOOK_TRACE: trace,
                TEST_BRANCH: '42-example-issue',
                TEST_GIT_STATUS: '0',
                TEST_NPM_STATUS: '0',
                TEST_NPX_STATUS: '0',
                TEST_LINT_STATUS: '0',
                TEST_FORMAT_STATUS: '0',
                TEST_VERSION_STATUS: '0',
                ...overrides,
            },
            encoding: 'utf8',
            timeout: 5000,
        });
        assert.ifError(result.error);
        assert.equal(result.signal, null);
        const calls = fs.existsSync(trace) ? fs.readFileSync(trace, 'utf8').trim().split('\n') : [];
        return { ...result, calls };
    }

    for (const branch of ['main', 'master']) {
        it(`rejects ${branch} before tests, version bumps or staging`, function () {
            const result = runHook({ TEST_BRANCH: branch });
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Commit blocked:/);
            assert.deepEqual(result.calls, [branchLookup]);
        });
    }

    for (const [name, status] of [
        ['detached HEAD', '1'],
        ['Git lookup failure', '128'],
    ]) {
        it(`rejects ${name} before any npm command`, function () {
            const result = runHook({ TEST_GIT_STATUS: status });
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Commit blocked:/);
            assert.deepEqual(result.calls, [branchLookup]);
        });
    }

    const allowedCalls = [
        branchLookup,
        'npm test',
        'npx lint-staged',
        'npm run lint',
        'npm run format:check',
        'npm version patch --no-git-tag-version',
        'git add package.json package-lock.json',
    ];

    it('preserves validation, patch bump and staging on an issue branch', function () {
        const result = runHook();
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(result.calls, allowedCalls);
    });

    for (const [name, variable, count] of [
        ['tests', 'TEST_NPM_STATUS', 2],
        ['lint-staged', 'TEST_NPX_STATUS', 3],
        ['full lint', 'TEST_LINT_STATUS', 4],
        ['format validation', 'TEST_FORMAT_STATUS', 5],
        ['version bump', 'TEST_VERSION_STATUS', 6],
    ]) {
        it(`stops after failing ${name} without running later commands`, function () {
            const result = runHook({ [variable]: '17' });
            assert.equal(result.status, 17);
            assert.deepEqual(result.calls, allowedCalls.slice(0, count));
        });
    }
});
