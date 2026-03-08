---
id: doc-del-log
status: active
last_updated: "2026-03-08"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Deletion Log

Лог удалённых документов. Commit — хэш коммита, в котором файл удалён. Протокол: `@skill process-docs-lifecycle` § Doc Deletion Protocol.

| Doc | Commit | Rationale |
|-----|--------|-----------|
| `docs/plans/legacy-link-remediation-registry.md` | — | LIR complete, #JS-cMCNbcJ1 (path-contracts.js) SSOT |
| `docs/plans/plan-legacy-link-remediation-integrations-strategy.md` | — | LIR-022 FIN, Path Rewrite Log in AIS |
| `docs/plans/plan-global-md-id-contract-rollout.md` | — | id-contract rollout complete, id-registry.json SSOT |
| `docs/done/plan-skill-anti-staleness.md` | — | дистиллирован в ais-anti-staleness |
| `docs/done/rrg-modernization.md` | — | дистиллирован в id:ais-c4e9b2 (docs/ais/ais-rrg-contour.md); удаление по протоколу #for-distillation-cleanup |
| `docs/plans/plan-skills-migration-registry.md` | — | archived, path-contracts + index-skills SSOT |
| `docs/done/mcp-data-contour-migration.md` | ae39770 | дистиллирован в id:ais-8d3c2a (ais-mcp-data-flow); telemetry.sqlite → mcp.sqlite |
| `docs/done/ssot-contract-plane-rollout.md` | — | дистиллирован в id:ais-7f8e9d (docs/ais/ais-ssot-contract-plane.md); план выполнен |
| `docs/done/file-header-rollout.md` | — | дистиллирован в id:ais-f7e2a1 (docs/ais/ais-file-header-standard.md); план выполнен |
