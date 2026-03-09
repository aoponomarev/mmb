# Deployment Snapshot: `cloudflare-edge-api` (2026-03-09)

## Scope

- Snapshot path: `is/deployments/cloudflare-edge-api/2026-03-09/`.
- Source artifacts:
  - `is/cloudflare/edge-api/src/index.js` (SHA256 `ED9A235A6966AAE66D0BB28EDD92F45E7F8AFDA4B63105B6C21DB1BA7E2DA0A9`)
  - `is/cloudflare/edge-api/src/auth.js` (SHA256 `ACF674B9A48F8279AFB751E10BDFEA367CF362B2378A1CE20DB42B3DD6397E45`)
  - `is/cloudflare/edge-api/src/portfolios.js` (SHA256 `94F395DE3C16417321B08A115D4AEDBD9D35F5C0379E60EC443EF463B09FBDD8`)
  - `is/cloudflare/edge-api/src/datasets.js` (SHA256 `267D7B3E0D84FA02FBC9F0D5C55C9A5069224ACD6FC375B868B396645017412D`)
  - `is/cloudflare/edge-api/src/coin-sets.js` (SHA256 `F0F9B3A51C5E8333F2FC40DD4660BD1FF19F4A9A818331283001F75D0903BBBA`)
  - `is/cloudflare/edge-api/src/api-proxy.js` (SHA256 `7380AAFA5B1032FA1C30CD657E9546F0A1CFFC673F42B58DEF707215F8CAD9C0`)
  - `is/cloudflare/edge-api/src/settings.js` (SHA256 `CF99309AF8560ACD0FE1468AF785EDD1189EFF0721EAC0CC59AA5AA2D979D672`)
  - `is/cloudflare/edge-api/src/utils/cors.js` (SHA256 `AFA873354A0FDB65AB36B9CAC023034E8961C3798550B76969C17631C159D6CA`)
  - `is/cloudflare/edge-api/src/utils/auth.js` (SHA256 `BF74BDF8ADC8564BBCCAF1DB3D3E8FAD77DC174499A99FCA4F39A71E96B05C76`)
  - `is/cloudflare/edge-api/src/utils/d1-helpers.js` (SHA256 `0DE6DF129761BD186151D9B2F1F8F9F80A60C6B27EEFC7E4C482A640D363C34E`)
  - `is/cloudflare/edge-api/migrations/001_initial_schema.sql` (SHA256 `02825F6932224BC29532E8410AC35510DDE3B151E74EF6E15FDC92EC357C0FAA`)
  - `is/cloudflare/edge-api/migrations/002_user_coin_sets.sql` (SHA256 `27CA2EB023704FDC2BD97EFBB499B13A52F99777F2D7CE3651F5CFC699207D26`)
  - `is/cloudflare/edge-api/wrangler.toml` (SHA256 `E3BC5FE86908E257DCAE2E1AB133CA2DD985FDB1740C0F0D9CF1CD0DF96515C2`)

## Archive Completeness Check

- [x] Full reachable settings captured (`settings.current.json`).
- [x] Previous-state baseline + structured diff captured (`settings.previous.json`, `changes-vs-previous.md`).
- [x] Causality updates applied and linked.

## Non-Secret Console Settings (summary)

- Worker name: `app-api`
- Entrypoint: `src/index.js`
- Compatibility date: `2024-01-01`
- Vars count: `1`
- D1 bindings: `1`
- KV bindings: `2`
- Reachable cloud settings via wrangler: `full`

## Skills / AIS / Causalities

- Skills:
  - id:sk-e8f2a1
  - id:sk-3b1519
  - id:sk-5cd3c9
- AIS:
  - id:ais-8b2f1c
  - id:ais-e41384
- Causalities:
  - `#for-cloudflare-kv-proxy`
  - `#for-d1-schema-migrations`
  - `#for-deploy-snapshot-diff`
  - `#for-post-deploy-auto-archive`
  - `#for-provider-readback-fallback`

## Restore (short)

1. Re-deploy sources from `source/` and listed hashes.
2. Restore non-secret configuration from `settings.current.json`.
3. Re-apply secret values from secure storage according to env contract names.
4. Verify endpoint behavior and cycle history.

