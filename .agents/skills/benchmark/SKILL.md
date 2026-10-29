# Skill: Benchmark

Load when measuring performance, memory, throughput, size, or model quality.

## Workflow

1. Freeze workload/population and metric.
2. Pin baseline and candidate configuration.
3. Pin resource limits and environment details that matter.
4. Separate warmup from measured runs when applicable.
5. Repeat enough to expose variance where needed.
6. Preserve raw measurements and summary derivation.
7. Report negative/mixed results.
8. Do not attribute a change to algorithmic improvement if it came from a larger cap,
   different cache state, different data, or changed hardware.
