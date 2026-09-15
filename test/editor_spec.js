"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const runtimeUtil = require("@node-red/util").util;
const editorFile =
  process.env.NODE_RED_EDITOR_JS ||
  require.resolve("@node-red/editor-client/public/red/red.js");
const editorSource = fs.readFileSync(editorFile, "utf8");
function extractFunction(name) {
  const start = editorSource.indexOf("    function " + name + "(");
  assert.ok(start !== -1, `Node-RED editor function ${name} exists`);
  const end = editorSource.indexOf("\n    function ", start + 1);
  return editorSource.slice(start, end);
}
function loadEditors() {
  const defs = {},
    inputs = {},
    stack = [];
  const RED = {
    _: (key, data) => key + (data ? " " + JSON.stringify(data) : ""),
    util: runtimeUtil,
    utils: {
      normalisePropertyExpression: runtimeUtil.normalisePropertyExpression,
    },
    editor: { getEditStack: () => stack.slice() },
    nodes: {
      registerType: (name, def) => {
        defs[name] = def;
      },
      getType: (type) => defs[type],
      node: () => ({ valid: true }),
    },
  };
  const $ = (selector) => ({
    length: Object.hasOwn(inputs, selector) ? 1 : 0,
    val: () => inputs[selector],
    next: () => ({ length: 0 }),
  });
  const sandbox = vm.createContext({
    RED,
    $,
    console,
    jsonata: runtimeUtil.prepareJSONataExpression,
    normalisePropertyExpression: runtimeUtil.normalisePropertyExpression,
  });
  vm.runInContext(
    extractFunction("validatePropertyExpression") +
      extractFunction("validateTypedProperty"),
    sandbox,
  );
  RED.utils.validatePropertyExpression = sandbox.validatePropertyExpression;
  RED.utils.validateTypedProperty = sandbox.validateTypedProperty;
  const start = editorSource.indexOf("RED.validators = {");
  vm.runInContext(
    editorSource.slice(start, editorSource.indexOf("};;", start) + 2),
    sandbox,
  );
  vm.runInContext(extractFunction("validateNodeProperty"), sandbox);
  for (const name of ["sql-config", "sql-query"]) {
    const html = fs.readFileSync(
      path.join(__dirname, "..", "src", name + ".html"),
      "utf8",
    );
    vm.runInContext(
      html.match(/<script type="text\/javascript">([\s\S]*?)<\/script>/)[1],
      sandbox,
    );
  }
  function node(name) {
    const _def = defs[name];
    return {
      id: "test-node",
      type: name,
      _def,
      ...Object.fromEntries(
        Object.entries(_def.defaults).map(([key, def]) => [key, def.value]),
      ),
    };
  }
  function validate(node, key) {
    return sandbox.validateNodeProperty(
      node,
      node._def.defaults,
      key,
      node[key],
    );
  }
  return { node, validate, inputs, stack };
}
test("a fully configured query and connection pass real Node-RED saved-property validation", () => {
  const { node, validate } = loadEditors();
  const query = node("database-sql-query");
  query.config = "connection-id";
  const config = node("database-sql-config");
  Object.assign(config, {
    host: "localhost",
    database: "test",
    username: "test",
  });
  for (const n of [query, config])
    for (const key of Object.keys(n._def.defaults))
      assert.equal(validate(n, key), true, `${n.type}.${key}`);
});
test("blank parameters are valid and malformed JSON parameters show a validation error", () => {
  const { node, validate } = loadEditors();
  const n = node("database-sql-query");
  n.parameters = "";
  assert.equal(validate(n, "parameters"), true);
  n.parametersType = "json";
  n.parameters = "{bad";
  assert.equal(typeof validate(n, "parameters"), "string");
});
test("typed validation uses this node while a different node editor is open", () => {
  const { node, validate, inputs, stack } = loadEditors();
  const n = node("database-sql-query");
  inputs["#node-input-statementType"] = "jsonata";
  stack.push({ id: "different-node" });
  n.statement = "SELECT * FROM customer";
  assert.equal(validate(n, "statement"), true);
  stack.push(n);
  assert.notEqual(validate(n, "statement"), true);
});
test("invalid fields return useful errors, including timeout overflow and invalid port", () => {
  const { node, validate } = loadEditors();
  const n = node("database-sql-query");
  n.timeoutMs = 2147483648;
  assert.match(validate(n, "timeoutMs"), /Query timeout/);
  const config = node("database-sql-config");
  config.port = 65536;
  assert.match(validate(config, "port"), /Port/);
  n.output = "payload[";
  assert.notEqual(validate(n, "output"), true);
});
test("missing saved type properties retain runtime-compatible defaults", () => {
  const { node, validate } = loadEditors();
  const n = node("database-sql-query");
  delete n.statementType;
  delete n.outputType;
  assert.equal(validate(n, "statement"), true);
  assert.equal(validate(n, "output"), true);
});
