# CPSC — Consumer Product Safety Commission Ingest (Scoping Placeholder)

**Status:** Research pending
**Owner:** Lance
**Sequencing:** Builds first (no AEMS exposure)
**Next:** Deep-research scoping in chat, then pipeline implementation

---

This file is a placeholder. CPSC is the first source in the CPSC → FAERS → MAUDE arc because it sits entirely outside the FDA AEMS migration risk that affects FAERS and MAUDE (see `faers.md` §7 and `maude.md` §6). Building CPSC first lets us iterate on the shared openFDA-style ingest architecture (HTTP client, retry, manufacturer normalization, tort-signal scoring) without the moving-target risk of AEMS endpoint/schema changes.

Once the deep-research scoping doc lands (counterpart to `faers.md` / `maude.md`), this file should be replaced with the verbatim research output covering, at minimum:

1. Endpoint shape (SaferProducts.gov public API, NEISS, recalls feed — confirm which is canonical)
2. Volume and pagination behavior
3. Manufacturer / brand identification and join keys to existing tables
4. Severity / hazard filtering for tort signal
5. NLP / clustering implications (free-text narratives present on SaferProducts.gov reports — confirm extent)
6. Known issues, gotchas, deprecations
7. Architecture recommendation (sibling pipeline pattern aligned with `openfda_device_recalls.py`)
