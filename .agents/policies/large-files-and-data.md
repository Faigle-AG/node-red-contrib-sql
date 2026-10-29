# Policy: Large Files and Data

Avoid full-context ingestion of large artifacts.

## Prefer

- metadata first;
- bounded samples;
- indexed database queries;
- aggregate counts;
- histograms;
- selected rows;
- small prefixes/tails;
- streaming hashes;
- explicit size checks.

## Reporting

State:

- file/database identity;
- inspected portion;
- query/sample method;
- what was not inspected.

Do not claim a full schema/data audit from a sample.

Hashing a full file for integrity is not equivalent to reading its content into context.
