---
id: readme-96e7c2
status: active
last_updated: "2026-03-11"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Deployment Snapshot: `yandex-market-fetcher` (2026-03-11)

## Scope

- Snapshot path: `is/deployments/yandex-market-fetcher/2026-03-11/`.
- Source artifacts:
  - `is/yandex/functions/market-fetcher/index.js` (SHA256 `8B8E29BFEA72DEA0DEE276AB2085AD11CF7A2DFA172202B7B8449CCC10D8685A`)
  - `is/yandex/functions/market-fetcher/package.json` (SHA256 `7938D69E6A0AEC46BF01E74B954351853B29C567F15AA321F082DE845ABA5104`)
  - `is/yandex/functions/market-fetcher/package-lock.json` (SHA256 `CC38DBFB73C386B51FED292A40C33699504988989C8A07048EF9B4E61A9D33B6`)

## Archive Completeness Check

- [x] Full reachable settings captured (`settings.current.json`).
- [x] Previous-state baseline + structured diff captured (`settings.previous.json`, `changes-vs-previous.md`).
- [x] Causality updates applied and linked.

## Non-Secret Console Settings (summary)

- Function ID: `d4elqjuhiem6mavs9v0e`
- Active function version: `d4e8el3pha490sonmles`
- Runtime / entrypoint: `nodejs18` / `market-fetcher/index.handler`
- Memory / timeout / concurrency: `268435456` / `600s` / `1`
- Trigger schedule:
  - `coingecko-fetcher-cron-cap`: `0 * * * ? *`
  - `coingecko-fetcher-cron-vol`: `30 * * * ? *`

## Skills / AIS / Causalities

- Skills:
  - id:sk-e8f2a1
  - id:sk-3b1519
  - id:sk-5c0ef8
- AIS:
  - id:ais-8b2f1c
  - id:ais-e41384
- Causalities:
  - `#for-trigger-minute-routing`
  - `#for-manual-trigger-order-payload`
  - `#for-yc-public-invoke`
  - `#for-deploy-snapshot-diff`
  - `#for-post-deploy-auto-archive`

## Restore (short)

1. Re-deploy sources from `source/` and listed hashes.
2. Restore non-secret configuration from `settings.current.json`.
3. Re-apply secret values from secure storage according to env contract names.
4. Verify endpoint behavior and cycle history.

