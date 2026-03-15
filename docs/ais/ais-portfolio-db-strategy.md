---
id: ais-db8c3e
status: complete
last_updated: "2026-03-12"
related_ais:
  - ais-6f2b1d
related_skills:
  - sk-02d3ea
  - sk-bb7c8e

---

# AIS: Стратегия хранения портфелей в Cloudflare D1

## 1. D1 Schema Layout

Таблица `portfolios` (id:ais-6f2b1d, is/cloudflare/edge-api/migrations/):

| Колонка | Тип | Назначение |
|---------|-----|------------|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | Уникальный идентификатор записи |
| user_id | INTEGER NOT NULL | FK на users(id), владелец портфеля |
| name | TEXT NOT NULL | Название портфеля |
| description | TEXT | JSON envelope или NULL; см. Description Envelope Format |
| assets | TEXT NOT NULL | JSON array монет; всегда валидный JSON |
| created_at | TEXT NOT NULL | ISO 8601 timestamp |
| updated_at | TEXT NOT NULL | ISO 8601 timestamp |
| archived | INTEGER NOT NULL DEFAULT 0 | 0/1 для UI-фильтрации |

Индексы:
- `idx_portfolios_user_id` — выборка по user_id
- `idx_portfolios_created_at` — сортировка по дате создания
- `idx_portfolios_user_archived_created_at` — составной: user, archived, created_at DESC

## 2. Extensibility Strategy

Hybrid model:
- **description**: JSON envelope for meta (settings, modelMix, snapshots, modelVersion, marketMetrics, etc.). Never add typed columns for envelope keys.
- **assets**: JSON array of coin objects. Structure defined by asset contract in id:ais-6f2b1d.
- **When to add typed column**: Only when the field is hot for filtering/sorting at DB level (e.g. archived). Envelope keys are sufficient for hydrate/display.
- **When to add envelope key**: New app-level meta that does not require index or cross-portfolio query. Adapter-only change.

## 3. Description Envelope Format

Structure (from #JS-fJ68ZfEu portfolio-adapters.js):

- \__appPortfolioMeta: 1\ - marker for envelope detection
- \portfolioId\ - local portfolio id for hydrate rebinding
- \userDescription\ - plain user-facing description string
- \schemaVersion\ - canonical schema version (>= 2)
- \settings\ - mode, balanceMode, modelId, horizonDays, mdnHours, agrMethod
- \modelVersion\, \marketMetrics\, \marketAnalysis\, \modelMix\ - optional meta
- \snapshots\ - snapshotId, market

Versioning: \schemaVersion\ in envelope; backward compatible parsing via parseCloudflareDescriptionEnvelope (plain string vs JSON).

## 4. Migration Policy

1. **Plain-text to JSON envelope**: Migration 004 converts non-JSON description to minimal envelope \{ userDescription, __appPortfolioMeta: 1 }\. NULL remains NULL.
2. **CHECK constraints**: SQLite does not support ALTER TABLE ADD CONSTRAINT. Migration 005 recreates portfolios table with CHECK; copies data; drops old; renames.
3. **Order**: 004 must run before 005. Both applied via \wrangler d1 execute app-database --file=./migrations/00X_*.sql\.

## 5. Index Strategy

Current indexes (from 001, 003):
- idx_portfolios_user_id, idx_portfolios_created_at, idx_portfolios_user_archived_created_at

When to add: new index only for hot filter/sort columns. Envelope JSON keys cannot be indexed without generated columns; prefer envelope for non-hot meta.

## 6. Validation Rules

DB-level:
- \description\: CHECK (json_valid(description) = 1 OR description IS NULL)
- \ssets\: CHECK (json_valid(assets) = 1)

Adapter-level (#JS-fJ68ZfEu): buildCloudflareDescriptionEnvelope, toCloudflarePayload ensure valid JSON before write. fromCloudflareRecord tolerates plain-text (legacy read path).

## 7. Rules for Adding New Fields

| Case | Action |
|------|--------|
| New field in envelope only | Adapter change; no migration |
| New D1 column | Migration + adapter |
| New envelope key | Adapter only; document in this AIS |
| New typed column for hot query | Migration + index consideration + adapter |

## References

- id:ais-6f2b1d (docs/ais/ais-portfolio-system.md) - canonical portfolio domain
- #JS-fJ68ZfEu (core/domain/portfolio-adapters.js)
- #JS-WP2ioNSZ (is/cloudflare/edge-api/src/portfolios.js)
- is/cloudflare/edge-api/migrations/
- #for-d1-schema-migrations, #for-canonical-portfolio-roundtrip, #not-d1-add-column-if-not-exists, #for-d1-recreate-table-prerequisites
