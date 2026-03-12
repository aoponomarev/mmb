---
id: sk-6ac4d2
title: "Arch: Portfolio Cloud Sync (Local-First)"
status: draft
type: arch
reasoning_confidence: 0.78
reasoning_audited_at: ""
reasoning_checksum: ""
last_change: "2026-03-12"
related_skills:
  - sk-c3d639
  - sk-a17d41
  - sk-02d3ea
related_ais:
  - ais-6f2b1d
  - ais-54c2aa
  - ais-c2d3e4
---

# Arch: Portfolio Cloud Sync (Local-First)

> **Context**: Local-first portfolio storage with Cloudflare D1 as auth-scoped replica and recovery source.
> **Primary SSOT**: id:ais-6f2b1d (`docs/ais/ais-portfolio-system.md`).

## Reasoning

- **#for-client-ssot-with-cloud-sync** Live SSOT for портфели остаётся на клиенте (`userPortfolios` + `portfolioConfig`), чтобы пользователь не зависел от сети для базовых операций. Cloudflare D1 выступает auth-scoped replica и источником восстановления при доступном соединении.
- **#for-endpoint-coherence** Путь данных портфелей в облако обязан использовать тот же Cloudflare origin, что и auth-flow (`cloudflare-config.getPortfoliosEndpoint` + JWT). Разнесение auth и portfolios по разным доменам ломает user scope и readback.
- **#for-canonical-portfolio-roundtrip** Cloudflare transport обязан сохранять не только веса и AGR, но и каноническое состояние asset (`keyMetric`, rebalance flags, recoverable coin snapshot) плюс portfolio meta. Иначе hydrate на новом устройстве создаёт деградировавшую копию, в которой новые поля silently теряются.
- **#for-auth-scoped-portfolio-storage** Guest-local и authenticated-local портфели нельзя держать под одним localStorage key. Иначе logout/login смешивает два пользовательских контекста и может потерять pending auth-only изменения.
- **#for-single-portfolio-runtime-path** Активный runtime должен иметь одного owner для CRUD semantics (`app-ui-root` + portfolio-form/view modals). Import/export может существовать как secondary operational flow, но не как второй CRUD owner.
- **#for-explicit-import-sync** Import JSON-архива не должен silently перезаписать или rebind-ить remote replica. Архивный портфель сначала становится локальной explicit-copy и только после явного save/update может снова войти в cloud sync-flow.
- **#for-portfolio-lifecycle-preservation** Rebalance/edit form пересобирает canonical portfolio object из UI draft. Если перед сохранением не вернуть `createdAt`, `cloudflareId` и `cloudUpdatedAt`, то conflict detection будет сравнивать уже оборванную lineage и давать ложные решения.
- **#for-multi-device-conflict-forking** При divergence между устройствами нельзя выбирать между silent overwrite и silent discard. Безопасная policy: cloud-bound version остаётся основной, а локальная divergent version fork-ится в detached explicit-copy.

## Contracts

- Любое изменение портфеля сначала фиксируется локально через `portfolioConfig.saveLocalPortfolios(userPortfolios)`, затем синхронизируется в Cloudflare через `syncPortfolioToCloudflare`.
- `portfolioConfig.saveLocalPortfolios(...)` и `getLocalPortfolios(...)` работают поверх scope-aware local keys: guest scope (`app-portfolios`) и auth scope (`app-portfolios::<user-email>`).
- `syncPortfolioToCloudflare` не собирает Cloudflare payload вручную. Формат определяется единым adapter-контрактом `portfolioConfig.toCloudflarePayload(...)`, чтобы local save, cloud write и hydrate использовали одну и ту же схему.
- Cloudflare является единственной активной remote readback plane для portfolio runtime. Optional Postgres compatibility hooks не входят в active contract.
- Объект портфеля имеет поле `syncState`:
  - `local-only` — создан/изменён локально, ещё не синхронизирован;
  - `synced` — подтверждённый Cloudflare state (есть `cloudflareId`, последняя попытка успешна);
  - `error` — последняя попытка облачной записи завершилась ошибкой, но локальный state сохранён;
  - `stale` — портфель ранее был синхронизирован (`cloudflareId` существует), но больше не найден в D1 (например, удалён с другого устройства);
  - `conflict` — локальная divergent version была сохранена как detached copy после multi-device conflict resolution.
- Объект портфеля также хранит `cloudSyncMode`:
  - `auto` — normal local-first save path с возможной облачной записью при доступной auth/cloud среде;
  - `explicit` — импортированная локальная копия, которую hydrate не должен silently rebinding к cloud record до явного save/update.
- Объект портфеля хранит `cloudUpdatedAt` как последний подтверждённый `updated_at` remote replica. Это опорная точка для сравнения локальной и облачной revisions.
- Detached conflict copy хранит `conflictMeta` с `detectedAt`, `localUpdatedAt`, `remoteUpdatedAt`, `originPortfolioId`, `originCloudflareId`, `strategy`.
- UI обязан визуально различать `synced` и `local-only` / `error` / `conflict`; conflict copy не может теряться в общей dimmed-ветке и требует отдельного warning-marker с поясняющим tooltip в селекторе и view modal.
- При включённом флаге `cloudSync` и валидной авторизации `syncPortfolioToCloudflare` возвращает structured result `{ ok, status, reason, details, cloudflareId, cloudUpdatedAt, counts?, resolution? }`, по которому вызывающий код обновляет `syncState`, повторно сохраняет локальный список и пишет optional observability event.
- Для существующего `cloudflareId` `syncPortfolioToCloudflare` сначала читает текущую remote revision. Если remote `updated_at` новее локального `cloudUpdatedAt` и локальный объект уже ушёл вперёд после последней подтверждённой sync-point, cloud write блокируется как conflict.
- При авторизации на устройстве без локальных портфелей `hydratePortfoliosFromCloud` загружает списки из Cloudflare D1 (`portfoliosClient.getPortfolios()`), адаптирует их через `portfolioAdapters.fromCloudflareRecord` к локальной схеме и дополняет `userPortfolios`, помечая такие записи как `synced`.
- Если auth-scoped local key пуст, допускается одноразовый bootstrap из guest-local key до cloud hydrate, чтобы локальные guest-портфели не терялись при первом login.
- Если локальный портфель имеет `cloudflareId`, но соответствующей записи нет в D1, `hydratePortfoliosFromCloud` не перезаписывает его и не создаёт заново, а только помечает `syncState='stale'` — уважая удаление/изменение с других устройств и сохраняя локальный слепок для пользователя.
- Если local object совпал по canonical `portfolio.id`, но был импортирован как `cloudSyncMode='explicit'`, hydrate должен считать cloud record shadowed и не rebinding-ить `cloudflareId` автоматически.
- Если local object уже привязан к `cloudflareId`, а remote revision новее:
  - при отсутствии local pending changes cloud hydrate заменяет bound copy на fresh remote version;
  - при наличии local pending changes runtime создаёт detached conflict fork и оставляет remote version основной.
- Cloudflare asset payload хранит recoverable portfolio state: `coinId`, `ticker`, `name`, `weight`, `side`, `delegatedBy`, `agr`, `currentPrice`, `pvs`, `metrics`, `isLocked`, `isDisabledInRebalance`, `keyMetric`.
- Если в D1 нет отдельных полей для portfolio meta, transport допускает JSON envelope в `description`, который сохраняет `portfolioId`, `settings`, `modelVersion`, `marketMetrics`, `marketAnalysis`, `modelMix` и market-level snapshot meta. `fromCloudflareRecord` обязан распаковать envelope, а `normalizePortfolio` — достроить недостающие `snapshots.assets` / `snapshots.metrics`.
- Hydrate merge сначала доверяет `cloudflareId`, затем каноническому локальному `portfolio.id` из envelope. Match по local `id` должен связывать existing local object с `cloudflareId`, а не создавать duplicate.
- Export/import архивов работает только с current local scope через `portfolioConfig.exportPortfolios(...)` и `importPortfolios(...)`. Import сохраняет локальный список, сбрасывает `cloudflareId`, переводит записи в `syncState='local-only'` + `cloudSyncMode='explicit'`, сообщает о результате через `portfolios-imported` и не запускает implicit cloud sync.
- Optional diagnostics публикуются через `portfolio-observed` с typed envelope (`action`, `stage`, `status`, optional `ids`, `reason`, `counts`). Conflict-resolution path обязан дополнительно фиксировать `conflicted`, `refreshed`, `forked` counters, но этот event не заменяет primary save/delete callbacks.

