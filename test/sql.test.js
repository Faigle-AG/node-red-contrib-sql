'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { EventEmitter } = require('node:events');
const runtimeUtil = require('@node-red/util').util;
const root = path.resolve(__dirname, '..');
const { integerOption, MAX_TIMEOUT_MS } = require('../src/sql-utils');

function deferred() {
    let resolve, reject;
    const promise = new Promise((a, b) => {
        resolve = a;
        reject = b;
    });
    return { promise, resolve, reject };
}
function loadNode(file, overrides = {}, configNode) {
    let Constructor;
    const RED = {
        util: runtimeUtil,
        nodes: {
            registerType(type, ctor) {
                Constructor = ctor;
            },
            getNode() {
                return configNode;
            },
            createNode(node) {
                const events = new EventEmitter();
                node.on = events.on.bind(events);
                node.listeners = events.listeners.bind(events);
                node.emit = events.emit.bind(events);
                node.credentials = {};
                node.statuses = [];
                node.status = (status) => node.statuses.push(status);
                node.log = () => {};
                node.error = () => {};
                node.contextWrites = [];
                const context = {
                    set(key, value, store, cb) {
                        if (typeof store === 'function') {
                            cb = store;
                            store = undefined;
                        }
                        node.contextWrites.push({ key, value, store });
                        cb();
                    },
                };
                node.context = () => ({ flow: context, global: context });
                node._flow = { getSetting: (key) => process.env[key] };
            },
        },
    };
    const filename = path.join(root, 'src', file);
    const localRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(
        fs.readFileSync(filename, 'utf8'),
        {
            module,
            require: (name) => overrides[name] || localRequire(name),
            setTimeout,
            clearTimeout,
            console,
        },
        { filename },
    );
    module.exports(RED);
    return Constructor;
}
function makeAdapter(driver, options = {}) {
    const state = { pools: [], queries: [], closed: 0 };
    class Pool {
        constructor(config) {
            this.config = config;
            state.pools.push(this);
        }
        on() {}
        async connect() {
            if (options.opening) await options.opening.promise;
            if (options.fail) throw options.fail;
            return { release() {} };
        }
        getConnection() {
            return this.connect();
        }
        async end() {
            state.closed++;
        }
        async close() {
            state.closed++;
        }
        async query(query) {
            state.queries.push(query);
            return (
                options.result || {
                    rows: [{ id: 1 }],
                    rowCount: 1,
                    command: 'SELECT',
                    fields: [],
                }
            );
        }
        async execute(query, values) {
            state.queries.push({ query, values });
            return [[{ id: 1 }], []];
        }
    }
    class Request {
        constructor(pool, overrides) {
            state.request = { pool, overrides, parameters: {} };
        }
        input(name, value) {
            state.request.parameters[name] = value;
        }
        async query(statement) {
            state.queries.push(statement);
            return { recordset: [{ id: 1 }], rowsAffected: [1] };
        }
    }
    const Constructor = loadNode('sql-config.js', {
        pg: { Pool },
        'mysql2/promise': { createPool: (config) => new Pool(config) },
        mssql: { ConnectionPool: Pool, Request },
    });
    const node = new Constructor({
        driver,
        host: 'localhost',
        database: 'test',
        username: 'test',
        ...options.config,
    });
    return { state, node };
}
function close(node) {
    return new Promise((resolve, reject) =>
        node.listeners('close')[0](false, (err) => (err ? reject(err) : resolve())),
    );
}
async function runQuery(
    config = {},
    msg = {},
    execute = async () => ({
        driver: 'postgres',
        rows: [{ id: 1 }],
        rowCount: 1,
        rowsAffected: 1,
    }),
) {
    let calls = 0;
    const Constructor = loadNode(
        'sql-query.js',
        {},
        {
            driver: 'postgres',
            execute: async (...args) => {
                calls++;
                return execute(...args);
            },
        },
    );
    const node = new Constructor({
        statement: 'SELECT 1',
        parameters: '',
        ...config,
    });
    const sent = [],
        completions = [];
    await node.listeners('input')[0](
        msg,
        (m) => sent.push(m),
        (err) => completions.push(err),
    );
    node.emit('close');
    return { node, sent, completions, calls };
}

test('runtime numeric options default absent values and reject invalid/overflow values', () => {
    for (const value of [undefined, null, ''])
        assert.equal(integerOption(value, 30000, 1, MAX_TIMEOUT_MS, 'Timeout'), 30000);
    for (const value of [0, -1, 0.5, Infinity, 'bad', ' ', true, [], 2147483648]) {
        assert.throws(() => integerOption(value, 30000, 1, MAX_TIMEOUT_MS, 'Timeout'), {
            code: 'INVALID_CONFIGURATION',
        });
    }
    assert.equal(integerOption('10000', 0, 1, MAX_TIMEOUT_MS, 'Timeout'), 10000);
});
for (const driver of ['postgres', 'mysql', 'mssql']) {
    test(`${driver}: nondefault timeout is applied and concurrent startup shares one pool`, async () => {
        const { node, state } = makeAdapter(driver);
        await Promise.all([
            node.execute('SELECT 1', undefined, { timeoutMs: 1234 }),
            node.getPool(),
        ]);
        assert.equal(state.pools.length, 1);
        if (driver === 'postgres') assert.equal(state.queries[0].query_timeout, 1234);
        if (driver === 'mysql') assert.equal(state.queries[0].query.timeout, 1234);
        if (driver === 'mssql') assert.equal(state.request.overrides.requestTimeout, 1234);
        await close(node);
        assert.equal(state.closed, 1);
    });
    test(`${driver}: failed initial connection closes the failed pool and permits retry`, async () => {
        const fail = new Error('connection failed');
        const { node, state } = makeAdapter(driver, { fail });
        await assert.rejects(node.getPool(), /connection failed/);
        await assert.rejects(node.getPool(), /connection failed/);
        assert.equal(state.pools.length, 2);
        assert.equal(state.closed, 2);
        await close(node);
    });
    test(`${driver}: closing during startup disposes the eventual pool and prevents queries`, async () => {
        const opening = deferred();
        const { node, state } = makeAdapter(driver, { opening });
        const query = node.execute('SELECT 1');
        const rejected = assert.rejects(query, { code: 'NODE_CLOSING' });
        const shutdown = close(node);
        opening.resolve();
        await Promise.all([shutdown, rejected]);
        assert.equal(state.closed, 1);
        assert.equal(state.queries.length, 0);
        await assert.rejects(node.getPool(), { code: 'NODE_CLOSING' });
    });
    test(`${driver}: invalid port is rejected before creating a pool`, async () => {
        const { node, state } = makeAdapter(driver, { config: { port: 65536 } });
        await assert.rejects(node.getPool(), { code: 'INVALID_CONFIGURATION' });
        assert.equal(state.pools.length, 0);
    });
}
test('MySQL idle cleanup is enabled, including a one-connection pool', async () => {
    for (const poolMax of [1, 10]) {
        const { node, state } = makeAdapter('mysql', {
            config: { poolMax, idleTimeoutMs: 1234 },
        });
        await node.getPool();
        assert.equal(state.pools[0].config.idleTimeout, 1234);
        assert.equal(state.pools[0].config.maxIdle, poolMax - 1);
        await close(node);
    }
});
test('zero idle timeout disables eviction for each adapter', async () => {
    for (const driver of ['postgres', 'mysql', 'mssql']) {
        const { node, state } = makeAdapter(driver, {
            config: { idleTimeoutMs: 0, poolMax: 4 },
        });
        await node.getPool();
        const config = state.pools[0].config;
        if (driver === 'postgres') assert.equal(config.idleTimeoutMillis, 0);
        if (driver === 'mysql') assert.equal(config.maxIdle, config.connectionLimit);
        if (driver === 'mssql') assert.equal(config.pool.min, config.pool.max);
        await close(node);
    }
});
test('SQL Server invalid and duplicate parameter names fail before connection', async () => {
    for (const values of [new Date(), { 'bad-name': 1 }, { id: 1, '@ID': 2 }]) {
        const { node, state } = makeAdapter('mssql');
        await assert.rejects(node.execute('SELECT @id', values), {
            code: 'INVALID_PARAMETERS',
        });
        assert.equal(state.pools.length, 0);
    }
});
test('PostgreSQL multiple result sets retain final rows and total affected count', async () => {
    const { node } = makeAdapter('postgres', {
        result: [
            { rows: [], rowCount: 2 },
            { rows: [{ id: 3 }], rowCount: 1 },
        ],
    });
    const result = await node.execute('UPDATE test SET id=3; SELECT id FROM test');
    assert.equal(result.rows[0].id, 3);
    assert.equal(result.rowsAffected, 3);
    await close(node);
});
test('blank parameters stay empty, missing timeout defaults, done runs once', async () => {
    const result = await runQuery(
        {},
        { params: ['unwanted'] },
        async (statement, parameters, options) => {
            assert.equal(parameters, undefined);
            assert.equal(options.timeoutMs, 30000);
            return { driver: 'postgres', rows: [], rowCount: 0 };
        },
    );
    assert.equal(result.sent.length, 1);
    assert.deepEqual(result.completions, [undefined]);
});
test('invalid timeout and non-string SQL fail before execution', async () => {
    for (const config of [
        { timeoutMs: 2147483648 },
        { statement: 'payload', statementType: 'msg' },
        { output: 'a[' },
    ]) {
        const result = await runQuery(config, { payload: { sql: 'SELECT 1' } });
        assert.equal(result.calls, 0);
        assert.equal(result.sent.length, 0);
        assert.equal(result.completions.length, 1);
        assert.ok(result.completions[0]);
    }
});
test('combined output can target msg.sql', async () => {
    const result = await runQuery({ output: 'sql' });
    assert.equal(result.sent[0].sql.data[0].id, 1);
});
test('named flow context store is parsed and used', async () => {
    const result = await runQuery({
        output: '#:(file)::result',
        outputType: 'flow',
    });
    assert.equal(result.completions[0], undefined);
    assert.equal(result.node.contextWrites[0].key, 'result');
    assert.equal(result.node.contextWrites[0].store, 'file');
});
test('JSON environment parameters are decoded', async () => {
    process.env.SQL_NODE_TEST_PARAMS = '[42]';
    try {
        const result = await runQuery(
            { parameters: 'SQL_NODE_TEST_PARAMS', parametersType: 'env' },
            {},
            async (sql, values) => {
                assert.equal(values[0], 42);
                return { rows: [], driver: 'postgres' };
            },
        );
        assert.equal(result.completions[0], undefined);
    } finally {
        delete process.env.SQL_NODE_TEST_PARAMS;
    }
});
test('query error reaches Catch once and preserves its code', async () => {
    const result = await runQuery({}, {}, async () => {
        throw Object.assign(new Error('timed out'), { code: 'ETIMEOUT' });
    });
    assert.equal(result.completions.length, 1);
    assert.equal(result.completions[0].code, 'ETIMEOUT');
    assert.equal(result.sent.length, 0);
});
test('installed driver APIs accept the configured timeout and MySQL idle options', async () => {
    const sql = require('mssql');
    const pool = new sql.ConnectionPool({
        server: 'localhost',
        pool: { max: 2, min: 2, idleTimeoutMillis: 30000 },
    });
    const request = new sql.Request(pool, { requestTimeout: 1234 });
    assert.equal(request.overrides.requestTimeout, 1234);
    const mysql = require('mysql2/promise');
    const mysqlPool = mysql.createPool({
        connectionLimit: 1,
        maxIdle: 0,
        idleTimeout: 1234,
    });
    assert.equal(mysqlPool.pool.config.idleTimeout, 1234);
    assert.ok(mysqlPool.pool._removeIdleTimeoutConnectionsTimer);
    await mysqlPool.end();
});

test('message output contains data and statistics together without a separate sql property', async () => {
    for (const outputMode of [undefined, 'rows', 'result']) {
        const result = await runQuery({ outputMode });
        const msg = result.sent[0];
        assert.equal(msg.payload.data[0].id, 1);
        assert.equal(msg.payload.driver, 'postgres');
        assert.equal(msg.payload.rowCount, 1);
        assert.equal(msg.payload.rowsAffected, 1);
        assert.equal(Object.hasOwn(msg, 'sql'), false);
        assert.equal(Object.hasOwn(msg.payload, 'rows'), false);
    }
});
test('nested output preserves incoming metadata and includes optional driver statistics', async () => {
    const sql = { source: 'upstream' };
    const result = await runQuery({ output: 'result.database' }, { sql }, async () => ({
        rows: [],
        driver: 'mysql',
        rowCount: 0,
        rowsAffected: 1,
        insertId: 42,
        fields: [],
    }));
    const msg = result.sent[0];
    assert.equal(msg.sql, sql);
    assert.equal(msg.result.database.data.length, 0);
    assert.equal(msg.result.database.rowsAffected, 1);
    assert.equal(msg.result.database.insertId, 42);
});
test('flow and global outputs store data and statistics together', async () => {
    for (const outputType of ['flow', 'global']) {
        const result = await runQuery({ output: '#:(file)::result', outputType });
        const stored = result.node.contextWrites[0];
        assert.equal(stored.key, 'result');
        assert.equal(stored.store, 'file');
        assert.equal(stored.value.data[0].id, 1);
        assert.equal(stored.value.driver, 'postgres');
        assert.equal(stored.value.rowCount, 1);
        assert.equal(stored.value.rowsAffected, 1);
        assert.equal(Object.hasOwn(result.sent[0], 'sql'), false);
    }
});

// Starts a query node whose typed reads, execution and context writes can be held, so a test
// can close the node at each boundary and then release it.
function startQueries(config = {}, { execute, contextSet } = {}) {
    const executed = [];
    const Constructor = loadNode(
        'sql-query.js',
        {},
        {
            driver: 'postgres',
            execute: async (...args) => {
                executed.push(args);
                return execute
                    ? execute(...args)
                    : { driver: 'postgres', rows: [{ id: 1 }], rowCount: 1, rowsAffected: 1 };
            },
        },
    );
    const node = new Constructor({ statement: 'SELECT 1', parameters: '', ...config });
    if (contextSet) node.context = () => ({ flow: { set: contextSet } });
    const reads = [];
    node.getTypedProperty = (value, type) => {
        const read = deferred();
        reads.push({ value, type, ...read });
        return read.promise;
    };
    const sent = [];
    const completions = [];
    const input = (msg = {}) =>
        node.listeners('input')[0](
            msg,
            (m) => sent.push(m),
            (err) => completions.push(err),
        );
    return { node, reads, executed, sent, completions, input };
}

// Lets awaited continuations run.
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('query close: a held statement read starts no execute and completes with NODE_CLOSING', async () => {
    const q = startQueries();
    const running = q.input();
    q.node.emit('close');
    const statusesAtClose = q.node.statuses.length;
    q.reads[0].resolve('SELECT 1');
    await running;
    assert.equal(q.executed.length, 0);
    assert.equal(q.sent.length, 0);
    assert.equal(q.completions.length, 1);
    assert.equal(q.completions[0].code, 'NODE_CLOSING');
    assert.equal(q.node.statuses.length, statusesAtClose);
});

test('query close: a held parameters read starts no execute and completes with NODE_CLOSING', async () => {
    const q = startQueries({ parameters: 'params', parametersType: 'msg' });
    const running = q.input({ params: [1] });
    q.reads[0].resolve('SELECT $1');
    await settle();
    assert.equal(q.reads.length, 2);
    q.node.emit('close');
    const statusesAtClose = q.node.statuses.length;
    q.reads[1].resolve([1]);
    await running;
    assert.equal(q.executed.length, 0);
    assert.equal(q.sent.length, 0);
    assert.deepEqual(
        q.completions.map((err) => err.code),
        ['NODE_CLOSING'],
    );
    assert.equal(q.node.statuses.length, statusesAtClose);
});

test('query close: concurrent held reads all complete with NODE_CLOSING and none executes', async () => {
    const q = startQueries();
    const running = [q.input(), q.input()];
    q.node.emit('close');
    for (const read of q.reads) read.resolve('SELECT 1');
    await Promise.all(running);
    assert.equal(q.executed.length, 0);
    assert.equal(q.sent.length, 0);
    assert.deepEqual(
        q.completions.map((err) => err.code),
        ['NODE_CLOSING', 'NODE_CLOSING'],
    );
});

// Controls: these pass before and after the pre-execute guard.

test('query close: a held read that rejects after close completes with its own error and no failed status', async () => {
    const q = startQueries();
    const running = q.input();
    q.node.emit('close');
    const statusesAtClose = q.node.statuses.length;
    const readError = Object.assign(new Error('read failed'), { code: 'READ_FAILED' });
    q.reads[0].reject(readError);
    await running;
    assert.equal(q.executed.length, 0);
    assert.equal(q.completions.length, 1);
    assert.equal(q.completions[0].cause, readError);
    assert.equal(q.completions[0].code, 'READ_FAILED');
    assert.equal(q.node.statuses.length, statusesAtClose);
});

test('query close: input after close completes with NODE_CLOSING before any read', async () => {
    const q = startQueries();
    q.node.emit('close');
    await q.input();
    assert.equal(q.reads.length, 0);
    assert.equal(q.executed.length, 0);
    assert.equal(q.completions[0].code, 'NODE_CLOSING');
});

test('query close: a held execute that resolves after close sends nothing', async () => {
    const execution = deferred();
    const q = startQueries({}, { execute: () => execution.promise });
    const running = q.input();
    q.reads[0].resolve('SELECT 1');
    await settle();
    assert.equal(q.executed.length, 1);
    q.node.emit('close');
    execution.resolve({ driver: 'postgres', rows: [], rowCount: 0, rowsAffected: 0 });
    await running;
    assert.equal(q.sent.length, 0);
    assert.equal(q.completions[0].code, 'NODE_CLOSING');
});

test('query close: a held context write sends nothing after close, and its late error passes through', async () => {
    for (const writeError of [null, Object.assign(new Error('store failed'), { code: 'STORE' })]) {
        let release;
        const q = startQueries(
            { output: 'result', outputType: 'flow' },
            { contextSet: (key, value, store, cb) => (release = () => cb(writeError)) },
        );
        const running = q.input();
        q.reads[0].resolve('SELECT 1');
        await settle();
        assert.equal(typeof release, 'function');
        q.node.emit('close');
        const statusesAtClose = q.node.statuses.length;
        release();
        await running;
        assert.equal(q.sent.length, 0);
        assert.equal(q.completions.length, 1);
        if (writeError) assert.equal(q.completions[0].cause, writeError);
        else assert.equal(q.completions[0].code, 'NODE_CLOSING');
        assert.equal(q.node.statuses.length, statusesAtClose);
    }
});
