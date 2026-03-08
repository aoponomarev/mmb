---
id: backlog-7f8e9d
status: active
last_updated: "2026-03-08"
related_ais:
  - ais-7f8e9d

---
<!-- Backlog for SSOT Contract Plane (plan дистиллирован в id:ais-7f8e9d). Per #for-plan-backlog. -->

# Fix backlog: SSOT Contract Plane Rollout

Issues found during execution, deferred fixes, edge cases.

## Entries

| Date | Issue | Status |
|------|-------|--------|
| 2026-03-08 | audit-path-centric-doc-links: ais-infrastructure-integrations, ais-workspace-storage | fixed — заменены на id: |
| 2026-03-08 | validate-causality: #for-tab-provider-decoupling, #for-invalid-provider-cleanup отсутствовали | fixed — добавлены в causality-registry |
| 2026-03-08 | hardcoded paths scan: 37 скриптов с path.resolve(__dirname) | fixed — миграция на ROOT из path-contracts (#not-hardcoded-paths) |
| 2026-03-08 | hardcoded paths: 8 тестов (.test.js) исключены | fixed — миграция на ROOT, исключение .test.js убрано из проверки |
