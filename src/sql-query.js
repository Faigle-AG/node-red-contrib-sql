'use strict';

module.exports = function (RED) {
    const { extendNode } = require('@faigle/node-red-runtime-utils')(RED);

    const { MAX_TIMEOUT_MS, createError, integerOption } = require('./sql-utils');

    function normalizeError(err, driver) {
        const wrapped = new Error(err && err.message ? err.message : 'SQL query failed');
        wrapped.name = 'SqlQueryError';
        wrapped.code = err && (err.code ?? err.number ?? err.sqlState);
        wrapped.driver = driver;
        wrapped.cause = err;
        if (err && err.sqlState) wrapped.sqlState = err.sqlState;
        if (err && err.number !== undefined) wrapped.number = err.number;
        if (err && err.lineNumber !== undefined) wrapped.lineNumber = err.lineNumber;
        return wrapped;
    }

    function SqlQueryNode(config) {
        RED.nodes.createNode(this, config);

        this.name = config.name;
        this.configNode = RED.nodes.getNode(config.config);
        this.statement = config.statement;
        this.statementType = config.statementType || 'str';
        this.parameters = config.parameters ?? 'params';
        this.parametersType = config.parametersType || 'msg';
        this.output = config.output || 'payload';
        this.outputType = config.outputType || 'msg';
        this.timeoutMs = config.timeoutMs;
        this.enableLogging = config.enableLogging === true;

        const node = this;
        extendNode(node);

        let closing = false;
        let active = 0;
        node.on('close', function () {
            closing = true;
        });

        node.on('input', async function (msg, send, done) {
            send = send || ((message) => node.send(message));
            active += 1;
            try {
                if (closing) throw createError('SQL query node is closing', 'NODE_CLOSING');
                if (!node.configNode) throw new Error('Missing SQL connection configuration');

                const timeoutMs = integerOption(
                    node.timeoutMs,
                    30000,
                    1,
                    MAX_TIMEOUT_MS,
                    'Query timeout',
                );
                if (
                    !['str', 'msg', 'flow', 'global', 'jsonata', 'env'].includes(
                        node.statementType,
                    ) ||
                    !['msg', 'flow', 'global', 'json', 'jsonata', 'env'].includes(
                        node.parametersType,
                    ) ||
                    !['msg', 'flow', 'global'].includes(node.outputType)
                ) {
                    throw createError('Invalid query property type', 'INVALID_CONFIGURATION');
                }
                if (typeof node.output !== 'string' || !node.output.trim()) {
                    throw createError('Output property is missing', 'INVALID_CONFIGURATION');
                }
                const outputTarget =
                    node.outputType === 'msg'
                        ? { key: node.output }
                        : RED.util.parseContextStore(node.output);
                RED.util.normalisePropertyExpression(outputTarget.key);
                const statementValue = await node.getTypedProperty(
                    node.statement,
                    node.statementType,
                    msg,
                );
                if (typeof statementValue !== 'string' || !statementValue.trim()) {
                    throw createError(
                        'SQL statement must be a non-empty string',
                        'STATEMENT_MISSING',
                    );
                }
                const statement = statementValue.trim();

                let parameters;
                if (node.parameters) {
                    parameters = await node.getTypedProperty(
                        node.parameters,
                        node.parametersType,
                        msg,
                    );
                }

                if (
                    node.parametersType === 'env' &&
                    typeof parameters === 'string' &&
                    parameters.trim()
                ) {
                    try {
                        parameters = JSON.parse(parameters);
                    } catch (err) {
                        throw createError(
                            'Environment parameters must contain JSON',
                            'INVALID_PARAMETERS',
                            err,
                        );
                    }
                }
                const driver = node.configNode.driver || 'unknown';
                node.status.processing(`querying ${driver}`);

                if (node.enableLogging) {
                    const parameterCount = Array.isArray(parameters)
                        ? parameters.length
                        : parameters && typeof parameters === 'object'
                          ? Object.keys(parameters).length
                          : 0;
                    node.log(
                        `Executing SQL query using '${driver}' with ${parameterCount} parameter(s)`,
                    );
                }

                const result = await node.configNode.execute(statement, parameters, {
                    timeoutMs,
                });
                if (closing) throw createError('SQL query node is closing', 'NODE_CLOSING');
                const outputValue = {
                    data: result.rows || [],
                    driver: result.driver,
                    rowCount: result.rowCount,
                    rowsAffected: result.rowsAffected,
                };
                for (const key of ['command', 'insertId', 'fields']) {
                    if (result[key] !== undefined) outputValue[key] = result[key];
                }

                if (node.outputType === 'msg') {
                    await node.setTypedProperty(node.output, node.outputType, msg, outputValue);
                } else {
                    // Context typed inputs can select a named context store.
                    await new Promise((resolve, reject) => {
                        node.context()[node.outputType].set(
                            outputTarget.key,
                            outputValue,
                            outputTarget.store,
                            (err) => (err ? reject(err) : resolve()),
                        );
                    });
                }
                if (closing) throw createError('SQL query node is closing', 'NODE_CLOSING');
                send(msg);
                if (active === 1) node.status.succeeded('query complete');
            } catch (err) {
                const driver = node.configNode ? node.configNode.driver : undefined;
                const normalized = normalizeError(err, driver);
                if (!closing) node.status.failed(String(normalized.code || normalized.message));
                if (done) done(normalized);
                else node.error(normalized, msg);
                return;
            } finally {
                active -= 1;
            }
            if (done) done();
        });
    }

    RED.nodes.registerType('database-sql-query', SqlQueryNode);
};
