# RSA verification follow-up

The eight JSON files in this directory are the final measurements: three fresh
processes and one identical-code control for each runtime. Run
`node packages/vjwa/bench/summarize-rsa.cjs --verify-current` from the repository
root to reproduce the paired summaries and check source fingerprints.

`initial-fixtures/` preserves the complete earlier run. Final review found that
native RSA key generation rounded a requested 2049-bit test key to 2048 bits.
The untimed correctness fixture was replaced with a verified 2050-bit key, and
the reports were rerun to capture the final fixture/provenance fingerprints.
Runtime code, benchmark code and timed inputs are identical between these two
sets. The central comparison uses the final set; no samples were removed from
either set.

The last diagnostic row uses the labels `upstream`, `before`, and `after` for
native key import, import plus key type, and import plus key details. Those
labels do not represent package implementations in that row. All other rows
compare upstream jwa 2.0.1, the byte-identical VPM runtime from c3bc17f, and the
current implementation. Controls run identical upstream code under all three
labels, including identical import-only calls in the diagnostic row.
