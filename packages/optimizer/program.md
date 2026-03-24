# Optimizer Program

This loop tunes only the discovery ranking and promotion recommendation policy.

- domains: islets, ovarian-tissue
- max attempts: 40
- max accepted mutations: 4
- minimum score delta: 0.001
- minimum promote precision: 0.75
- minimum promote recall: 0.02

Guardrails:

- never mutate benchmark gold sets
- never mutate source enrichment records
- never mutate trusted atlas outputs
- only keep a policy edit if the deterministic local objective improves
