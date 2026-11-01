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

// Phase 2.9: the typed fields of the SQL query node. T1 pins what the editor offers (and that its
// validators accept exactly that), T2 checks that the runtime accepts exactly the offered types,
// T3 evaluates every offered type, T4 keeps rejecting any other type before execution, and T5
// pins the defaults of flows saved without the fields.

const FIELDS = {
    statement: {
        types: ['msg', 'flow', 'global', 'str', 'jsonata', 'env'],
        default: 'str',
        value: 'SELECT 1',
        type: 'str',
    },
    parameters: {
        types: ['msg', 'flow', 'global', 'json', 'jsonata', 'env'],
        default: 'msg',
        value: 'params',
        type: 'msg',
    },
    output: { types: ['msg', 'flow', 'global'], default: 'msg', value: 'payload', type: 'msg' },
};
// Every type a hand-edited or imported flow could carry: Node-RED's own plus an unknown name.
const CANDIDATES = [
    'str',
    'num',
    'bool',
    'json',
    'bin',
    're',
    'date',
    'jsonata',
    'env',
    'msg',
    'flow',
    'global',
    'node',
    'cred',
    'foo',
];

// Runs the editor's registration script and its oneditprepare against a recording jQuery stub.
function loadEditor() {
    const html = fs.readFileSync(path.join(root, 'src', 'sql-query.html'), 'utf8');
    const defs = {};
    const inputs = {};
    const element = (selector) =>
        new Proxy(function () {}, {
            get(target, prop) {
                if (prop === 'selector') return selector;
                if (prop === 'length') return 0;
                if (prop === 'typedInput') {
                    return (options) => {
                        inputs[selector.replace('#node-input-', '')] = {
                            // Copied into this realm: the editor script runs in its own.
                            types: Array.from(options.types),
                            default: options.default,
                            typeField: options.typeField && options.typeField.selector,
                        };
                        return element(selector);
                    };
                }
                if (prop === 'val') return () => '';
                if (prop === 'prop' || prop === 'is') return () => false;
                return () => element(selector);
            },
            apply: () => element(selector),
        });
    const RED = {
        nodes: { registerType: (name, def) => (defs[name] = def) },
        editor: { getEditStack: () => [] },
        validators: { typedInput: () => () => true },
        _: (key) => key,
    };
    const [, source] = html.match(/<script type="text\/javascript">([\s\S]*?)<\/script>/);
    vm.runInNewContext(source, { RED, $: (selector) => element(String(selector)) });
    const definition = defs['database-sql-query'];
    const self = Object.fromEntries(
        Object.entries(definition.defaults).map(([key, spec]) => [key, spec.value]),
    );
    definition.oneditprepare.call(self);
    return { definition, inputs };
}

// Loads the query node with a fake config node whose execute records its calls, real Node-RED
// util, and a context with readable named stores.
function loadQuery(config) {
    let Constructor;
    const executed = [];
    const stores = { default: {}, file: {} };
    const RED = {
        util: runtimeUtil,
        nodes: {
            registerType: (type, ctor) => (Constructor = ctor),
            getNode: () => ({
                driver: 'postgres',
                execute: async (statement, values) => {
                    executed.push({ statement, values });
                    return { driver: 'postgres', rows: [{ id: 1 }], rowCount: 1, rowsAffected: 1 };
                },
            }),
            createNode(node) {
                const events = new EventEmitter();
                node.on = events.on.bind(events);
                node.listeners = events.listeners.bind(events);
                node.emit = events.emit.bind(events);
                node.status = () => {};
                node.log = () => {};
                node.error = () => {};
                const scope = {
                    get(key, store, cb) {
                        if (typeof store === 'function') [cb, store] = [store, undefined];
                        const value = stores[store || 'default'][key];
                        return cb ? cb(null, value) : value;
                    },
                    set(key, value, store, cb) {
                        if (typeof store === 'function') [cb, store] = [store, undefined];
                        stores[store || 'default'][key] = value;
                        if (cb) cb();
                    },
                };
                node.context = () => ({ flow: scope, global: scope });
                node._flow = { getSetting: (key) => process.env[key] };
            },
        },
    };
    const filename = path.join(root, 'src', 'sql-query.js');
    const localRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(
        fs.readFileSync(filename, 'utf8'),
        { module, require: localRequire, setTimeout, clearTimeout, console },
        { filename },
    );
    module.exports(RED);
    const node = new Constructor(config);
    return { node, executed, stores };
}

async function run(config, msg = {}, preset = {}) {
    const { node, executed, stores } = loadQuery({
        statement: 'SELECT 1',
        parameters: '',
        ...config,
    });
    Object.assign(stores.default, preset);
    const sent = [];
    const completions = [];
    await node.listeners('input')[0](
        msg,
        (m) => sent.push(m),
        (err) => completions.push(err),
    );
    node.emit('close');
    return { sent, completions, executed, stores };
}

const rejected = (result) =>
    result.completions[0] && result.completions[0].message === 'Invalid query property type';

// T1

const { definition, inputs } = loadEditor();

test('T1: the editor creates exactly the expected typed inputs', () => {
    assert.deepEqual(Object.keys(inputs).sort(), Object.keys(FIELDS).sort());
});

for (const [field, expected] of Object.entries(FIELDS)) {
    test(`T1 ${field}: offered types, default type, type field and saved defaults`, () => {
        assert.deepEqual(inputs[field].types, expected.types);
        assert.equal(inputs[field].default, expected.default);
        assert.equal(inputs[field].typeField, `#node-input-${field}Type`);
        assert.equal(definition.defaults[field].value, expected.value);
        assert.equal(definition.defaults[`${field}Type`].value, expected.type);
    });

    test(`T1 ${field}: the editor validator accepts exactly the offered types`, () => {
        const accepted = CANDIDATES.filter(
            (type) =>
                definition.defaults[field].validate.call(
                    { id: 'n1', [`${field}Type`]: type },
                    'value',
                    {},
                ) === true,
        );
        assert.deepEqual(accepted.sort(), [...expected.types].sort());
    });
}

// T2

for (const [field, expected] of Object.entries(FIELDS)) {
    test(`T2 ${field}: the runtime accepts exactly the offered types`, async () => {
        const accepted = [];
        for (const type of CANDIDATES) {
            const result = await run({ [field]: 'value', [`${field}Type`]: type });
            if (!rejected(result)) accepted.push(type);
        }
        assert.deepEqual(accepted.sort(), [...expected.types].sort());
    });
}

// T3

const STATEMENT = 'SELECT 2';
const statementCases = {
    msg: [{ statement: 'q' }, { q: STATEMENT }],
    flow: [{ statement: 'q' }, {}, { q: STATEMENT }],
    global: [{ statement: 'q' }, {}, { q: STATEMENT }],
    str: [{ statement: STATEMENT }, {}],
    jsonata: [{ statement: 'q' }, { q: STATEMENT }],
    env: [{ statement: 'SQL_29_STATEMENT' }, {}],
};
for (const [type, [config, msg, preset]] of Object.entries(statementCases)) {
    test(`T3 statement of type ${type} is executed`, async () => {
        process.env.SQL_29_STATEMENT = STATEMENT;
        try {
            const result = await run({ ...config, statementType: type }, msg, preset);
            assert.equal(result.completions[0], undefined);
            assert.equal(result.executed[0].statement, STATEMENT);
        } finally {
            delete process.env.SQL_29_STATEMENT;
        }
    });
}

const parameterCases = {
    msg: [{ parameters: 'p' }, { p: [7] }],
    flow: [{ parameters: 'p' }, {}, { p: [7] }],
    global: [{ parameters: 'p' }, {}, { p: [7] }],
    json: [{ parameters: '[7]' }, {}],
    jsonata: [{ parameters: 'p' }, { p: [7] }],
    env: [{ parameters: 'SQL_29_PARAMS' }, {}],
};
for (const [type, [config, msg, preset]] of Object.entries(parameterCases)) {
    test(`T3 parameters of type ${type} reach execution`, async () => {
        process.env.SQL_29_PARAMS = '[7]';
        try {
            const result = await run({ ...config, parametersType: type }, msg, preset);
            assert.equal(result.completions[0], undefined);
            // Copied into this realm: the node runs in its own, where env JSON is parsed.
            assert.deepEqual([...result.executed[0].values], [7]);
        } finally {
            delete process.env.SQL_29_PARAMS;
        }
    });
}

for (const type of FIELDS.output.types) {
    test(`T3 output of type ${type} receives the result`, async () => {
        const result = await run({ output: 'out', outputType: type });
        assert.equal(result.completions[0], undefined);
        const written = type === 'msg' ? result.sent[0].out : result.stores.default.out;
        assert.equal(written.data[0].id, 1);
    });
}

test('T3 output to a named store writes that store only', async () => {
    const result = await run({ output: '#:(file)::out', outputType: 'flow' });
    assert.equal(result.stores.file.out.data[0].id, 1);
    assert.equal(result.stores.default.out, undefined);
});

// T4

for (const field of Object.keys(FIELDS)) {
    test(`T4 ${field} of an unoffered type fails before execution`, async () => {
        const result = await run({ [field]: 'value', [`${field}Type`]: 'num' });
        assert.equal(result.completions[0].code, 'INVALID_CONFIGURATION');
        assert.equal(result.completions[0].message, 'Invalid query property type');
        assert.deepEqual(result.executed, []);
    });
}

// T5

test('T5 a flow saved without types runs a string statement with msg.params into msg.payload', async () => {
    const { node, executed } = loadQuery({ statement: 'SELECT 3' });
    const sent = [];
    const completions = [];
    await node.listeners('input')[0](
        { params: [9] },
        (m) => sent.push(m),
        (err) => completions.push(err),
    );
    node.emit('close');
    assert.equal(completions[0], undefined);
    assert.equal(executed[0].statement, 'SELECT 3');
    assert.deepEqual(executed[0].values, [9]);
    assert.equal(sent[0].payload.data[0].id, 1);
});
