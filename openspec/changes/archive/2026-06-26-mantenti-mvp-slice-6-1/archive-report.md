# Archive Report: mantenti-mvp-slice-6-1

| Field | Value |
|-------|-------|
| Change | mantenti-mvp-slice-6-1 |
| Archived | 2026-06-26 |
| Final Status | PASS_WITH_WARNINGS |
| PR Strategy | stacked-to-main (PR-A → PR-B → PR-C) |
| Total Commits | 15 (8 PR-C tasks + M2 revert + docs + 2 scope-creep fixes) |
| Mode | Standard (no test runner) |

## PR Stack Summary

| PR | Priority | Tasks | Status |
|----|----------|-------|--------|
| PR-A | CRITICAL | 3 (pushsubscriptionchange, skipWaiting/claim, advisory lock) | Merged to master |
| PR-B | HIGH | 5 (VAPID docs, bell list semantics, NotificationPreference model, body validation, markAllRead batching) | Merged to master |
| PR-C | MEDIUM | 8 (pino logger, count dedup revert, composite index, push subscriptions GET/DELETE, SW URL tightening, isLoading, design drift fix, spec update) + 2 scope-creep (E1: PDFKit crash + advisory lock hang, E2: dead code removal) | Pending merge (PR-C branch) |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| notifications | Updated (M8) | 5 requirements added: NotificationPreference Management, Body Length Validation, Batched markAllRead, Structured Logging, Push Subscription Management |

No remaining delta specs — all changes merged into canonical in commit `9026f0a`.

## Archive Contents

| File | Present |
|------|---------|
| proposal.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ (16/16 implementation tasks complete) |
| apply-progress.md | ✅ |
| verify-report.md | ✅ |
| archive-report.md | ✅ (this file) |

## Known Follow-ups

### Warnings (2)
1. **M2 revert commit message clarity** — Revert commit says "This reverts commit f03bfef" without rationale. Mitigated by apply-progress.md documentation.
2. **E1 commit message inaccuracy** — Mentions `switchToPage(0)` but actual fix uses `bufferPages: true` + per-page Y tracking. Functionally correct; message slightly misleading.

### Suggestions (2)
1. **isLoading shared state** — Module-scope refs mean all consumers share one loading state. Matches existing pattern; refactor only if multi-component independence needed.
2. **DELETE endpoint URL encoding** — Consider documenting URL-encoded endpoint param in API contract for future developers.

## Risks

- M2 filter-coupled total semantics — documented, low risk
- Advisory lock non-blocking behavior — very low risk, Postgres auto-releases xact locks
- PDFKit bufferPages memory — low risk, monitor in production

## Next Recommended Slice

None pending. Slice 7 not yet proposed.
