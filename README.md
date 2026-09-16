# SQL nodes for Node-RED

Read and write data in PostgreSQL, MySQL, MariaDB, and Microsoft SQL Server from your Node-RED flows. Use these nodes to look up records, store incoming measurements, update application data, or run parameterized queries in response to messages.

The package provides two nodes:

- **SQL Connection** stores database credentials and shares a connection pool between query nodes.
- **SQL - Query** executes a SQL statement for each incoming message and passes the result to the next node or stores it in flow/global context.

## Run your first query

1. Add an **SQL - Query** node and connect an Inject node to its input and a Debug node to its output.
2. Open the query node and create an **SQL Connection**. Select your database driver and enter the host, port, database, username, and password.
3. Set **SQL** to the string type and enter `SELECT 1 AS value`.
4. Leave **Parameters** blank.
5. Set **Output To** to `msg.payload` by choosing the `msg` type and entering `payload`.
6. Deploy and trigger the Inject node.

The outgoing message contains:

```json
{
    "payload": {
        "data": [{ "value": 1 }],
        "driver": "postgres",
        "rowCount": 1,
        "rowsAffected": 1,
        "command": "SELECT"
    }
}
```

This example shows PostgreSQL metadata. The driver name and additional metadata depend on the selected database.

## Configure a connection

Reuse one **SQL Connection** in multiple query nodes that access the same database.

| Setting                                          | Purpose                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Driver                                           | PostgreSQL, MySQL / MariaDB, or Microsoft SQL Server.                                                                                                   |
| Host                                             | Database server hostname or IP address.                                                                                                                 |
| Port                                             | Defaults to 5432 for PostgreSQL, 3306 for MySQL / MariaDB, or 1433 for SQL Server.                                                                      |
| Database                                         | Database to connect to.                                                                                                                                 |
| Username / Password                              | Database credentials. The password is stored in Node-RED's credential storage. Leave it blank only when the server permits passwordless authentication. |
| Use TLS                                          | Encrypt the database connection.                                                                                                                        |
| Allow self-signed / untrusted server certificate | Allow a certificate that cannot be verified. Enable only when you trust the server and its certificate setup.                                           |
| Max Connections                                  | Maximum number of connections shared by the query nodes. Default: 10.                                                                                   |
| Connect (ms)                                     | Connection timeout in milliseconds. Default: 10000.                                                                                                     |
| Idle (ms)                                        | Idle connection timeout in milliseconds. Default: 30000. Set to 0 to retain idle connections.                                                           |

Connections open when the first query arrives and are reused for subsequent queries.

## Configure a query

| Setting                       | Purpose                                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL                           | A SQL string, a message/context property containing SQL, a JSONata expression, or an environment variable.                                                           |
| Parameters                    | Values to bind to the query. Read them from a message, flow/global context, JSON, JSONata, or an environment variable. Leave blank when the query has no parameters. |
| Timeout (ms)                  | Query timeout in milliseconds. Default: 30000.                                                                                                                       |
| Output To                     | Write the result to a message property or flow/global context. Default: `msg.payload`. Named context stores are supported.                                           |
| Enable query metadata logging | Log the database driver and parameter count. SQL text and parameter values are not logged by this option.                                                            |

To read SQL from `msg.topic`, select the `msg` type for **SQL** and enter `topic`. To read parameters from `msg.params`, select the `msg` type for **Parameters** and enter `params`.

Each incoming message runs one query. The selected output always contains both the returned rows in `data` and the query statistics.

## Parameterized queries

Keep values separate from SQL text. The placeholder syntax depends on the database.

### PostgreSQL

Use `$1`, `$2`, and so on, with an array of values.

```sql
SELECT id, name FROM customers WHERE id = $1
```

Incoming message, with **Parameters** set to `msg.params`:

```json
{ "params": ["K0001"] }
```

### MySQL / MariaDB

Use `?` placeholders with an array of values in the same order.

```sql
SELECT id, name FROM customers WHERE id = ?
```

```json
{ "params": ["K0001"] }
```

### Microsoft SQL Server

Use named placeholders with an object of parameter values.

```sql
SELECT id, name FROM customers WHERE id = @id
```

```json
{ "params": { "id": "K0001" } }
```

You can also use an array: its values bind to `@p1`, `@p2`, and so on. Object keys may include a leading `@`. Use names beginning with a letter or underscore, followed by letters, digits, or underscores. Do not repeat a name with different casing or with and without `@`.

### Write data

For example, to update a PostgreSQL record:

```sql
UPDATE customers SET name = $1 WHERE id = $2
```

```json
{ "params": ["Ada", "K0001"] }
```

Read `msg.payload.rowsAffected` to see the affected-row count.

For environment-based parameters, store a JSON array or object in the selected environment variable, such as `["K0001"]`.

Parameters represent values, not table names, column names, or SQL keywords. Use trusted, explicitly allowed identifiers when constructing those parts of a statement.

## Read the result

**Output To** receives one object containing the returned data and query statistics. With the default output `msg.payload`, a customer lookup produces:

```json
{
    "data": [{ "id": "K0001", "name": "Ada" }],
    "driver": "postgres",
    "rowCount": 1,
    "rowsAffected": 1,
    "command": "SELECT"
}
```

Read the rows from `msg.payload.data`, the row count from `msg.payload.rowCount`, and the affected-row count from `msg.payload.rowsAffected`.

If **Output To** is `msg.result`, those paths become `msg.result.data`, `msg.result.rowCount`, and `msg.result.rowsAffected`. Flow/global context receives the same complete object at the selected key.

| Field          | Contents                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `data`         | Array of returned rows; the first recordset for SQL Server. Statements without returned rows produce an empty array. |
| `driver`       | `postgres`, `mysql`, or `mssql`.                                                                                     |
| `rowCount`     | PostgreSQL's reported row count, or the number of returned rows for MySQL / SQL Server.                              |
| `rowsAffected` | Affected-row count reported by the driver, or returned-row count where applicable.                                   |
| `command`      | PostgreSQL command name, when available.                                                                             |
| `fields`       | PostgreSQL or MySQL field information, when available.                                                               |
| `insertId`     | MySQL insert ID, when returned by the database.                                                                      |

All result fields are stored together under **Output To**. Other incoming message properties are preserved except where the selected output writes a value.

Use one SQL statement per query for consistent behavior across databases. MySQL disables multiple statements. If PostgreSQL returns multiple results, the node uses the last result's rows and sums affected-row counts.

## Timeouts and errors

Timeouts use whole milliseconds. Connection and query timeouts must be between 1 and 2147483647; idle timeout also accepts 0.

Query timeout applies to driver query execution. Connection setup and waiting for an available pooled connection can add time. A timeout does not confirm that a write was cancelled or rolled back; check the database outcome before retrying a write.

Idle cleanup runs periodically. For MySQL, enabling idle cleanup also limits retained idle connections to one less than **Max Connections**. With a one-connection pool, its idle connection closes on the next cleanup cycle. Use idle timeout 0 to retain it.

Connect a **Catch** node scoped to the **SQL - Query** node to handle connection, configuration, and query errors. Connect the Catch node to Debug to inspect the error message. Failed queries do not emit a successful result from the query node.
