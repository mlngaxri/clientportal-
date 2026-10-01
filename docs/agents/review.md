# Builder 3 — Review handoff

## Ownership
Initial Direction, media and annotation UX, Review, revision lifecycle, locking/withdrawal/history and associated accessibility/reliability.

## Current baseline
The repository contains interactive simulated Direction and Review flows. Strengthen real interaction behavior and invariants without pretending the live review bridge or external upload pipeline is already integrated.

## Handoff log
No autonomous run recorded under the refined protocol yet.


### 2026-10-01 — Prevent accidental empty revision submission
- Added a shared completeness rule for draft Review Directions: target-only/whitespace placeholders are incomplete, while explicit prose, committed assets, drawings and valid HTTP(S) references carry customer intent.
- Review now blocks submission while any empty Direction remains and tells the customer to finish or delete it. This prevents a placeholder pin from being frozen into a revision batch and consuming an entitlement accidentally through the normal UI.
- Added focused automated regression coverage for completeness classification.
- Evidence: **S0 pending CI** at commit creation; Builder 5 should promote to S1 only after the repository workflow passes.
- Boundary: this is a UX/invariant guard. The transactional database remains authoritative for revision accounting; no external review bridge or provider acceptance is claimed.
- Next: harden the server-side submit invariant so API clients cannot submit semantically empty Direction objects, then test replay/withdrawal against that validation.
