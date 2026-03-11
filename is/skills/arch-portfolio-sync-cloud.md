---
id: sk-arch-portfolio-sync-cloud
title: "Arch: Portfolio Cloud Sync (Local-First)"
status: draft
type: arch
reasoning_confidence: 0.78
reasoning_audited_at: ""
reasoning_checksum: ""
last_change: ""
---

# Arch: Portfolio Cloud Sync (Local-First)

> **Context**: Dual storage for user portfolios — local browser storage and Cloudflare D1 via `portfoliosClient`.

## Reasoning

- **#for-client-ssot-with-cloud-sync** Live SSOT for портфели остаётся на клиенте (`userPortfolios` + `portfolioConfig`), чтобы пользователь не зависел от сети для базовых операций. Cloudflare D1 выступает auth-scoped replica и источником восстановления при доступном соединении.
- **#for-endpoint-coherence** Путь данных портфелей в облако обязан использовать тот же Cloudflare origin, что и auth-flow (`cloudflare-config.getPortfoliosEndpoint` + JWT). Разнесение auth и portfolios по разным доменам ломает user scope и readback.

## Contracts

- Любое изменение портфеля сначала фиксируется локально через `portfolioConfig.saveLocalPortfolios(userPortfolios)`, затем синхронизируется в Cloudflare через `syncPortfolioToCloudflare`.
- Объект портфеля имеет поле `syncState`:
  - `local-only` — создан/изменён локально, ещё не синхронизирован;
  - `synced` — подтверждённый Cloudflare state (есть `cloudflareId`, последняя попытка успешна);
  - `error` — последняя попытка облачной записи завершилась ошибкой, но локальный state сохранён;
  - `stale` — портфель ранее был синхронизирован (`cloudflareId` существует), но больше не найден в D1 (например, удалён с другого устройства).
- UI обязан визуально различать `synced` и `local-only` / `error` (например, `opacity-50` в выпадающем списке).
- При включённом флаге `cloudSync` и валидной авторизации `syncPortfolioToCloudflare` должен возвращать булевый результат, по которому вызывающий код обновляет `syncState` и повторно сохраняет локальный список.
- При авторизации на устройстве без локальных портфелей `hydratePortfoliosFromCloud` загружает списки из Cloudflare D1 (`portfoliosClient.getPortfolios()`), адаптирует их через `portfolioAdapters.fromCloudflareRecord` к локальной схеме и дополняет `userPortfolios`, помечая такие записи как `synced`.
- Если локальный портфель имеет `cloudflareId`, но соответствующей записи нет в D1, `hydratePortfoliosFromCloud` не перезаписывает его и не создаёт заново, а только помечает `syncState='stale'` — уважая удаление/изменение с других устройств и сохраняя локальный слепок для пользователя.

