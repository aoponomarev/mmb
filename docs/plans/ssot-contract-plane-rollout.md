---
id: plan-7f8e9d
status: draft
last_updated: "2026-03-08"
related_skills:
  - sk-02d3ea
  - sk-0e193a
  - sk-87700e
  - sk-8f9e0d
related_ais:
  - ais-7f8e9d

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# План внедрения: Плоскость контрактов SSOT (SSOT Contract Plane Rollout)

**Цель:** Упростить работу ИИ-агентов со слоем SSOT: единый индекс, формализованный ЕИП, ясность Mixed Reference Mode и Memory MCP. Спецификация: id:ais-7f8e9d (docs/ais/ais-ssot-contract-plane.md).

**Решения (зафиксированы):**
- Формат ssot-index: **Markdown** (Variant A).
- ЕИП scope: **без hardcoded paths scan** — много false positives, отложено.
- SSOT-декларации: **ручной** первый проход.
- config-contracts: **ссылка на ssot-index**; config-contracts специализирован для core/config/.
- Memory ≠ SSOT: явно в memory-protocol.

---

## Фаза 0: Подготовка (текущая)

- [x] AIS id:ais-7f8e9d.
- [x] План id:plan-7f8e9d (docs/plans/ssot-contract-plane-rollout.md).
- [x] AIS и план зарегистрированы в id-registry.

---

## Фаза 1: SSOT Index (Идея 1)

- [x] Создать `is/contracts/docs/ssot-index.md`:
  - Формат: **Markdown** с таблицей (домен | SSOT-файл | краткое описание).
  - Покрыть: paths, path-contracts, prefixes, id-registry, code-file-registry, causality-registry, core/config/*, .env.example, INFRASTRUCTURE_CONFIG.yaml, core/ssot/policies.js (Runtime SSOT — вне Contract Plane, но в индексе для полноты).
- [x] Обновить is/contracts/README.md: ssot-index как точка входа для поиска SSOT.

---

## Фаза 2: validate-ssot + preflight (Идея 2)

- [x] Расширить #JS-gs3VQRd3 (validate-ssot.js) под контракт ЕИП (id:sk-87700e): текущие проверки сохранены.
- [x] Добавить вызов validate-ssot в #JS-NrBeANnz (is/scripts/preflight.js) — шаг 2.5.
- [ ] Опционально: `npm run eip` как alias для ssot:check.

---

## Фаза 3: Mixed Reference Mode + Memory MCP (Идеи 3, 4)

- [x] Обновить mixed-reference-mode-always.mdc:
  - Секция Resolve Algorithm: id: → id-registry; #JS-xxx → code-file-registry; ссылка на ssot-index.
- [x] Обновить memory-protocol-always.mdc:
  - Секция «SSOT vs Memory»: Memory — ArchDecision/MigrationState/AgentAgreement; SSOT — в is/contracts/; не искать через search_nodes.

---

## Фаза 4: Консолидация SSOT-деклараций + config-contracts (Идеи 5, 6)

- [x] Ручной проход: ключевые SSOT из skills добавлены в ssot-index (preflight, cloudflare, modules-config, MCP).
- [x] Обновить id:sk-02d3ea (core/skills/config-contracts.md): ссылка на ssot-index в Context block.
- [x] config-contracts не дублирует полную таблицу — только core/config/ governance.

---

## Фаза 5: Критерии завершения

- [x] ssot-index.md создан и актуален.
- [x] validate-ssot вызывается в preflight.
- [x] Cursor rules обновлены (mixed-reference, memory).
- [x] config-contracts содержит ссылку на ssot-index.
- [ ] План помечен complete или статус переведён в docs/done (после финальной верификации).

---

## Связи с архитектурой (проверено)

| Компонент | Статус |
|-----------|--------|
| preflight.js | validate-ssot вызывается (шаг 2.5) |
| preflight-solo.ps1 | вызывает skills:check; ssot:check — через preflight при health-check |
| health-check.js | запускает preflight → после добавления ssot:check будет проходить |
| ais-docs-governance | id-registry, path-contracts; согласовано |
| ais-mcp-data-flow | id-registry, code-file-registry, causality-registry; согласовано |
| core/ssot/policies.js | Runtime SSOT; вне Contract Plane; в ssot-index для справки |

---

## Ссылки

- AIS: id:ais-7f8e9d
- validate-ssot: #JS-gs3VQRd3
- resolve-id: #JS-op2rXujz (core), #JS-v1JRkux7 (MCP wrapper)
- commands (ЕИП): id:sk-87700e
