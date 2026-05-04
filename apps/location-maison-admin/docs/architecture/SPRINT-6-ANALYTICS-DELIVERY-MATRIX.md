# Sprint 6 Analytics - Delivery Matrix (Owner / Estimation / Priority)

## 1. Objective

Provide an execution matrix for tickets `ANL-001` to `ANL-014` with:

- primary owner
- supporting owner
- effort estimate
- business priority
- sequencing

References:

- `docs/architecture/ANALYTICS-DATA-CONTRACT-V1.md`
- `docs/architecture/SPRINT-6-ANALYTICS-IMPLEMENTATION-BACKLOG.md`

## 2. Team roles (recommended)

- `DATA`: Data/Analytics engineer
- `BE`: Backend/API engineer
- `CF`: Cloud Functions/Integration engineer
- `FE`: Frontend engineer
- `SECOPS`: Security/Platform engineer
- `QA`: QA engineer
- `PO`: Product owner / architecture lead

## 3. Priority model

- `P0`: blocks sprint objective if missing
- `P1`: required for complete MVP sprint exit
- `P2`: useful optimization, can move to S7 if needed

## 4. Delivery matrix (multi-role team mode)

| Ticket | Primary owner | Secondary owner | Estimate (story points) | Estimate (ideal days) | Priority | Depends on | Target window |
|---|---|---|---:|---:|---|---|---|
| ANL-001 | DATA | BE | 5 | 2.0 | P0 | - | S6-W1 D1-D2 |
| ANL-002 | BE | SECOPS | 8 | 3.0 | P0 | ANL-001 | S6-W1 D2-D4 |
| ANL-003 | CF | BE | 5 | 2.0 | P0 | ANL-002 | S6-W1 D3-D4 |
| ANL-004 | CF | DATA | 3 | 1.5 | P0 | ANL-002 | S6-W1 D4-D5 |
| ANL-005 | CF | DATA | 5 | 2.0 | P0 | ANL-002 | S6-W1 D4-D5 |
| ANL-006 | DATA | CF | 8 | 3.0 | P0 | ANL-003/004/005 | S6-W2 D1-D2 |
| ANL-007 | BE | DATA | 5 | 2.0 | P1 | ANL-006 | S6-W2 D2-D3 |
| ANL-008 | BE | DATA | 3 | 1.5 | P1 | ANL-006 | S6-W2 D2-D3 |
| ANL-009 | BE | DATA | 3 | 1.5 | P1 | ANL-006 | S6-W2 D2-D3 |
| ANL-010 | FE | BE | 5 | 2.0 | P1 | ANL-007 | S6-W2 D3-D4 |
| ANL-011 | FE | BE | 3 | 1.5 | P1 | ANL-008 | S6-W2 D3-D4 |
| ANL-012 | FE | BE | 3 | 1.5 | P1 | ANL-009 | S6-W2 D3-D4 |
| ANL-013 | SECOPS | BE | 5 | 2.0 | P1 | ANL-007/008/009 | S6-W2 D4-D5 |
| ANL-014 | QA | PO | 5 | 2.0 | P1 | ANL-010/011/012/013 | S6-W2 D4-D5 |

Total:

- Story points: `66`
- Ideal effort: `26.5 engineer-days`

## 5. Execution matrix (solo mode - you as architect/dev)

If one person executes all tracks:

| Sequence | Ticket | Focus | Estimate (ideal days) | Priority |
|---|---|---|---:|---|
| 1 | ANL-001 | Data model + DDL | 2.0 | P0 |
| 2 | ANL-002 | Ingestion API contract + idempotency | 3.0 | P0 |
| 3 | ANL-003 | Search adapters | 2.0 | P0 |
| 4 | ANL-004 | Presence adapter | 1.5 | P0 |
| 5 | ANL-005 | Visits adapters (Firebase/Vercel) | 2.0 | P0 |
| 6 | ANL-006 | Aggregations + freshness controls | 3.0 | P0 |
| 7 | ANL-007 | Search analytics APIs | 2.0 | P1 |
| 8 | ANL-008 | Presence analytics APIs | 1.5 | P1 |
| 9 | ANL-009 | Traffic analytics APIs | 1.5 | P1 |
| 10 | ANL-010 | Search dashboard UI | 2.0 | P1 |
| 11 | ANL-011 | Presence dashboard UI | 1.5 | P1 |
| 12 | ANL-012 | Traffic dashboard UI | 1.5 | P1 |
| 13 | ANL-013 | Security hardening + observability | 2.0 | P1 |
| 14 | ANL-014 | QA pass + release checklist | 2.0 | P1 |

Total solo estimate:

- `26.5 ideal days`
- practical calendar with buffer: `4 to 6 weeks`

## 6. RACI quick view

| Ticket group | R (Responsible) | A (Accountable) | C (Consulted) | I (Informed) |
|---|---|---|---|---|
| ANL-001..006 (data/ingestion) | DATA/CF/BE | PO | SECOPS | FE/QA |
| ANL-007..009 (analytics APIs) | BE | PO | DATA | FE/QA |
| ANL-010..012 (dashboard UI) | FE | PO | BE | QA |
| ANL-013 (security/ops) | SECOPS | PO | BE | FE/QA |
| ANL-014 (quality gate) | QA | PO | All | All |

## 7. Suggested sprint checkpoints

- Checkpoint 1 (end S6-W1): `ANL-001..ANL-005` complete.
- Checkpoint 2 (mid S6-W2): `ANL-006..ANL-009` complete.
- Checkpoint 3 (end S6-W2): `ANL-010..ANL-014` complete and QA green.

## 8. Risk-based escalation rules

- If `ANL-002` slips by > 1 day: pause UI work, reinforce ingestion/API first.
- If `ANL-006` slips: reduce UI scope to read-only KPIs, keep 7d default mandatory.
- If `ANL-013` incomplete: no production release.

## 9. Definition of done for planning artifacts

This matrix is considered valid when:

- every ticket has owner, estimate, priority
- critical dependency chain is explicit (`001 -> 002 -> 003/004/005 -> 006 -> API/UI`)
- checkpoint dates are aligned with sprint cadence
