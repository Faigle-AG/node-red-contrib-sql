# Policy: Experiments and Benchmarks

Before a meaningful experiment, freeze when feasible:

- hypothesis;
- population/dataset;
- split policy;
- baseline;
- metric;
- seed policy;
- configuration;
- resource budget;
- acceptance interpretation.

Do not tune on held-out results and then call the replacement run confirmatory.

Label:

- preregistered/confirmatory;
- exploratory;
- post-hoc;
- mechanics pilot;
- representative evaluation.

Preserve prior runs when correcting design flaws.

Performance claims must distinguish algorithmic improvement, cache effects,
representation compaction, I/O changes, and raised resource limits.
