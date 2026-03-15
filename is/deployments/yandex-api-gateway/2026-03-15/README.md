---
id: readme-f71052
status: active
last_updated: "2026-03-15"

---

# Deployment Snapshot: `yandex-api-gateway` (2026-03-15)

## Scope

- Snapshot path: `is/deployments/yandex-api-gateway/2026-03-15/`.
- Source artifacts:
  - `is/yandex/functions/api-gateway/index.js` (SHA256 `138E567559B94E441651C36854C9F24D654074419089CB09AE5342FD46C6E164`)
  - `is/yandex/functions/api-gateway/spec.yaml` (SHA256 `75D16C8728CD0892E09B9E1C7229AA4A0A7A65137456D66DF4681166F3B5AC9F`)
  - `is/yandex/functions/api-gateway/package.json` (SHA256 `FDA5EA9B544A2FAE0FB52037B7A8748BAC37C951EFB8602CACD17588EE1E4480`)
  - `is/yandex/functions/api-gateway/package-lock.json` (SHA256 `C4EEB72681E9281B7BCC2FF922098E9F28EF2C21FF32EE7FEF01682306F75EA3`)

## Archive Completeness Check

- [x] Full reachable settings captured (`settings.current.json`).
- [x] Previous-state baseline + structured diff captured (`settings.previous.json`, `changes-vs-previous.md`).
- [x] Causality updates applied and linked.

## Non-Secret Console Settings (summary)

- API Gateway ID: `d5dl2ia43kck6aqb1el5`
- API Gateway domain: `d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net`
- API Gateway timeout: `300s`
- Integrated function: `d4eb8mf98rc3k6p3ef7g`
- Active function version: `d4e8h5kvf8ksvnfsu0nd`
- Runtime / entrypoint: `nodejs18` / `api-gateway/index.handler`
- Memory / timeout / concurrency: `268435456` / `30s` / `1`

## Skills / AIS / Causalities

- Skills:
  - id:sk-e8f2a1
  - id:sk-3b1519
  - id:sk-73dcca
- AIS:
  - id:ais-8b2f1c
  - id:ais-e41384
- Causalities:
  - `#for-cloud-env-readback`
  - `#for-yc-public-invoke`
  - `#for-manual-trigger-order-payload`
  - `#for-deploy-snapshot-diff`
  - `#for-post-deploy-auto-archive`

## Restore (short)

1. Re-deploy sources from `source/` and listed hashes.
2. Restore non-secret configuration from `settings.current.json`.
3. Re-apply secret values from secure storage according to env contract names.
4. Verify endpoint behavior and cycle history.

