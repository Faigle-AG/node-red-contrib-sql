# Policy: Production Safety

Production operations require explicit authorization.

Unless authorized, do not:

- write production data;
- run production migrations;
- restart/stop production services;
- delete production evidence;
- change production thresholds;
- retrain production models;
- publish packages;
- deploy releases;
- mutate frozen artifacts.

Authorized production work must define:

- exact target/path/service;
- change scope;
- backup/rollback;
- atomicity where applicable;
- resource expectations;
- verification;
- abort conditions.

Never infer production authorization from implementation authorization.
