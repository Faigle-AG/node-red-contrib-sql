'use strict';

module.exports = function (RED) {
    const DEFAULT_PORTS = {
        postgres: 5432,
        mysql: 3306,
        mssql: 1433,
    };

    const { MAX_TIMEOUT_MS, createError, integerOption } = require('./sql-utils');

    function normalizeArrayParameters(parameters, driverName) {
        if (parameters === undefined || parameters === null || parameters === '') return [];
        if (!Array.isArray(parameters)) {
            throw createError(`${driverName} parameters must be an array`, 'INVALID_PARAMETERS');
        }
        return parameters;
    }

    function normalizeSqlServerParameters(parameters) {
        if (parameters === undefined || parameters === null || parameters === '') return {};

        if (Array.isArray(parameters)) {
            return Object.fromEntries(parameters.map((value, index) => [`p${index + 1}`, value]));
        }

        if (Object.prototype.toString.call(parameters) !== '[object Object]') {
            throw createError(
                'SQL Server parameters must be an object or array',
                'INVALID_PARAMETERS',
            );
        }

        const names = new Set();
        for (const name of Object.keys(parameters)) {
            const normalized = name.replace(/^@/, '').toLowerCase();
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized) || names.has(normalized)) {
                throw createError(
                    `Invalid or duplicate SQL Server parameter name '${name}'`,
                    'INVALID_PARAMETERS',
                );
            }
            names.add(normalized);
        }
        return parameters;
    }

    function SqlConfigNode(config) {
        RED.nodes.createNode(this, config);

        this.name = config.name;
        this.driver = config.driver || 'postgres';
        this.host = String(config.host || '').trim();
        this.database = String(config.database || '').trim();
        this.username = String(config.username || '').trim();
        this.ssl = config.ssl === true;
        this.allowSelfSigned = config.allowSelfSigned === true;
        // Defer validation errors to input handling so Catch nodes receive them.
        let configurationError;
        try {
            this.port = integerOption(config.port, DEFAULT_PORTS[this.driver], 1, 65535, 'Port');
            this.poolMax = integerOption(config.poolMax, 10, 1, 2147483647, 'Pool size');
            this.connectionTimeoutMs = integerOption(
                config.connectionTimeoutMs,
                10000,
                1,
                MAX_TIMEOUT_MS,
                'Connection timeout',
            );
            this.idleTimeoutMs = integerOption(
                config.idleTimeoutMs,
                30000,
                0,
                MAX_TIMEOUT_MS,
                'Idle timeout',
            );
        } catch (err) {
            configurationError = err;
        }

        const node = this;
        let pool = null;
        let poolPromise = null;
        let closing = false;
        let closePromise = null;

        function validateConfiguration() {
            if (configurationError) throw configurationError;
            if (!['postgres', 'mysql', 'mssql'].includes(node.driver)) {
                throw createError(`Unsupported SQL driver '${node.driver}'`, 'UNSUPPORTED_DRIVER');
            }
            if (!node.host) throw createError('Database host is missing', 'HOST_MISSING');
            if (!node.database) throw createError('Database name is missing', 'DATABASE_MISSING');
            if (!node.username)
                throw createError('Database username is missing', 'USERNAME_MISSING');
        }

        async function createPostgresPool() {
            const { Pool } = require('pg');
            const pgPool = new Pool({
                host: node.host,
                port: node.port,
                database: node.database,
                user: node.username,
                password: node.credentials ? node.credentials.password : undefined,
                max: node.poolMax,
                connectionTimeoutMillis: node.connectionTimeoutMs,
                idleTimeoutMillis: node.idleTimeoutMs,
                ssl: node.ssl ? { rejectUnauthorized: !node.allowSelfSigned } : false,
                application_name: 'node-red',
            });

            pgPool.on('error', (err) => node.error(`PostgreSQL pool error: ${err.message}`));
            try {
                const client = await pgPool.connect();
                client.release();
                return pgPool;
            } catch (err) {
                await pgPool.end().catch(() => {});
                throw err;
            }
        }

        async function createMySqlPool() {
            const mysql = require('mysql2/promise');
            const mysqlPool = mysql.createPool({
                host: node.host,
                port: node.port,
                database: node.database,
                user: node.username,
                password: node.credentials ? node.credentials.password : undefined,
                connectionLimit: node.poolMax,
                // mysql2 only starts its idle reaper when maxIdle < connectionLimit.
                // Zero idle timeout explicitly disables idle eviction for all adapters.
                maxIdle: node.idleTimeoutMs === 0 ? node.poolMax : node.poolMax - 1,
                idleTimeout: node.idleTimeoutMs,
                waitForConnections: true,
                connectTimeout: node.connectionTimeoutMs,
                enableKeepAlive: true,
                multipleStatements: false,
                ssl: node.ssl ? { rejectUnauthorized: !node.allowSelfSigned } : undefined,
            });

            try {
                const connection = await mysqlPool.getConnection();
                connection.release();
                return mysqlPool;
            } catch (err) {
                await mysqlPool.end().catch(() => {});
                throw err;
            }
        }

        async function createSqlServerPool() {
            const sql = require('mssql');
            const sqlPool = new sql.ConnectionPool({
                server: node.host,
                port: node.port,
                database: node.database,
                user: node.username,
                password: node.credentials ? node.credentials.password : undefined,
                connectionTimeout: node.connectionTimeoutMs,
                requestTimeout: 30000,
                pool: {
                    max: node.poolMax,
                    min: node.idleTimeoutMs === 0 ? node.poolMax : 0,
                    // tarn does not accept zero; retain idle connections in that mode.
                    idleTimeoutMillis: node.idleTimeoutMs || 30000,
                },
                options: {
                    encrypt: node.ssl,
                    trustServerCertificate: node.allowSelfSigned,
                },
            });

            sqlPool.on('error', (err) => node.error(`SQL Server pool error: ${err.message}`));
            try {
                await sqlPool.connect();
                return sqlPool;
            } catch (err) {
                await sqlPool.close().catch(() => {});
                throw err;
            }
        }

        async function createPool() {
            validateConfiguration();
            if (node.driver === 'postgres') return createPostgresPool();
            if (node.driver === 'mysql') return createMySqlPool();
            return createSqlServerPool();
        }

        node.getPool = async function () {
            if (closing) throw createError('SQL connection is closing', 'NODE_CLOSING');
            if (pool) return pool;

            if (!poolPromise) {
                poolPromise = createPool()
                    .then((createdPool) => {
                        pool = createdPool;
                        return createdPool;
                    })
                    .catch((err) => {
                        poolPromise = null;
                        throw err;
                    });
            }

            const currentPool = await poolPromise;
            if (closing) throw createError('SQL connection is closing', 'NODE_CLOSING');
            return currentPool;
        };

        node.execute = async function (statement, parameters, options = {}) {
            if (typeof statement !== 'string' || !statement.trim()) {
                throw createError('SQL statement is missing', 'STATEMENT_MISSING');
            }

            const timeoutMs = integerOption(
                options.timeoutMs,
                30000,
                1,
                MAX_TIMEOUT_MS,
                'Query timeout',
            );
            // Reject invalid parameters before opening a network connection.
            const values =
                node.driver === 'mssql'
                    ? normalizeSqlServerParameters(parameters)
                    : normalizeArrayParameters(
                          parameters,
                          node.driver === 'postgres' ? 'PostgreSQL' : 'MySQL/MariaDB',
                      );
            const currentPool = await node.getPool();
            if (closing) throw createError('SQL connection is closing', 'NODE_CLOSING');

            if (node.driver === 'postgres') {
                const result = await currentPool.query({
                    text: statement,
                    values,
                    query_timeout: timeoutMs,
                });

                const results = Array.isArray(result) ? result : [result];
                const last = results[results.length - 1] || {};
                return {
                    driver: 'postgres',
                    rows: last.rows || [],
                    rowCount: last.rowCount ?? (last.rows ? last.rows.length : 0),
                    rowsAffected: results.reduce((sum, item) => sum + (item.rowCount || 0), 0),
                    command: last.command,
                    fields: Array.isArray(last.fields)
                        ? last.fields.map((field) => ({
                              name: field.name,
                              dataTypeID: field.dataTypeID,
                          }))
                        : [],
                };
            }

            if (node.driver === 'mysql') {
                const [result, fields] = await currentPool.execute(
                    { sql: statement, timeout: timeoutMs },
                    values,
                );

                const rows = Array.isArray(result) ? result : [];
                const affectedRows =
                    result && !Array.isArray(result) && Number.isInteger(result.affectedRows)
                        ? result.affectedRows
                        : rows.length;

                return {
                    driver: 'mysql',
                    rows,
                    rowCount: rows.length,
                    rowsAffected: affectedRows,
                    insertId: result && !Array.isArray(result) ? result.insertId : undefined,
                    fields: Array.isArray(fields)
                        ? fields.map((field) => ({ name: field.name, type: field.type }))
                        : [],
                };
            }

            const sql = require('mssql');
            const request = new sql.Request(currentPool, {
                requestTimeout: timeoutMs,
            });

            for (const [name, value] of Object.entries(values)) {
                request.input(name.replace(/^@/, ''), value);
            }

            const result = await request.query(statement);
            const rowsAffected = Array.isArray(result.rowsAffected)
                ? result.rowsAffected.reduce((sum, count) => sum + count, 0)
                : 0;

            return {
                driver: 'mssql',
                rows: result.recordset || [],
                recordsets: result.recordsets || [],
                rowCount: result.recordset ? result.recordset.length : 0,
                rowsAffected,
                output: result.output || {},
                returnValue: result.returnValue,
            };
        };

        node.on('close', function (removed, done) {
            closing = true;
            if (!closePromise) {
                closePromise = (async () => {
                    // Pool creation may still be in flight during a redeploy.
                    if (poolPromise) await poolPromise.catch(() => {});
                    try {
                        if (pool) {
                            if (node.driver === 'postgres' || node.driver === 'mysql')
                                await pool.end();
                            else await pool.close();
                        }
                    } finally {
                        pool = null;
                        poolPromise = null;
                    }
                })();
            }
            closePromise.then(() => done(), done);
        });
    }

    RED.nodes.registerType('database-sql-config', SqlConfigNode, {
        credentials: {
            password: { type: 'password' },
        },
    });
};
