---
id: bskill-11683c
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Docker Infrastructure (Deferred)

> **Status**: DEFERRED — Docker not yet deployed in Target App. Move to `is/skills/` when `docker-compose.yml` exists.
> **Source**: Extracted from arch-backend-core, arch-mcp-ecosystem, arch-rollback, arch-testing-ci, arch-foundation.

## Docker Resource Governance

**Goal**: Keep Docker stack stable under mixed load. SSOT: `docker-compose.yml`. *(When settings sync exists: `INFRASTRUCTURE_CONFIG.yaml` per config-contracts — file may not exist yet.)*

**Network**: Split networks — `public` for externally exposed services, `internal` for private service-to-service traffic.

**Storage**: Named volume with `nocopy: true` for faster startup; large mutable data in dedicated mounted paths, not container layers.

**Logging**: Mandatory rotation — `driver: json-file`, `max-size: 10m`, `max-file: 3-5`.

**Profiles**: `core` for production runtime; `maintenance` for diagnostics.

**Verification**: `docker compose --profile core config`, `docker compose ps`, `docker network ls`.

## WSL2 & Docker Optimization

**Context**: WSL settings depend on hardware profile. When `INFRASTRUCTURE_CONFIG.yaml` exists (config-contracts), use it for profile-specific paths. File: `C:\Users\[User]\.wslconfig`.

**Profiles**: Home (high perf) — processors=12, memory=32GB, swap=8GB; Office — processors=4, memory=8GB, swap=4GB.

**Docker Desktop**: WSL Integration for Ubuntu-22.04; Resource Saver Auto; enable containerd; DISABLE Kubernetes.

**Applying changes**: `wsl --shutdown` → restart Docker Desktop → verify with `free -h` and `nproc`.

## Docker Image Hardening

**Baseline**: Stable LTS base (e.g. `node:20-slim`); minimal deterministic layers; `--no-install-recommends` for OS packages.

**Build performance**: BuildKit cache in Compose; reuse package manifests before full source copy.

**Runtime safety**: `init: true` in Compose for zombie handling; log rotation; `tmpfs` for `/tmp` when possible.

**Verification**: `docker compose config` → `build` → `up -d` → `curl /health`.

## Docker Networking (Container ↔ Host)

**Rule**: `localhost` in container ≠ `localhost` on host. Host → Container: use mapped port (e.g. 3002). Container → Container: use service name (e.g. `http://continue-cli:3000`). Container → Host: use `host.docker.internal`. Pitfall: using external port (3002) inside container — wrong; use internal port (3000).

## Docker Code Not Updating (Stale Behavior)

**Diagnosis order**: (A) Rule out port shadow — `netstat -ano | findstr PORT`; (B) Prefer `docker-compose up -d --force-recreate` over `restart`; (C) Verify bind mount with `docker inspect`; (D) `.env` loads at creation — use `--force-recreate`; (E) OneDrive: verify `md5sum` host vs container.

## Docker Port Shadow (Rogue Local Process)

**Root cause**: Local `node` process listens on same host port, intercepting before Docker. Diagnosis: `netstat -ano | findstr PORT` — two PIDs = shadow; kill rogue. On Windows, both `com.docker.backend.exe` and `node.exe` can bind to same port.

## Docker v29 Overlay Regression

Docker 29.0–29.2.0 — encrypted overlay networks fail. Fix: upgrade to v29.2.1+.

## Infrastructure Recovery (Docker/Compose)

1. **Fast health triage**: `docker compose ps`, `docker compose logs --tail=100`, `docker stats --no-stream`.
2. **Safe recovery**: `docker compose config` to validate; `docker compose restart <service>`.
3. **Controlled recreate**: `docker compose up -d --force-recreate --no-deps <service>`.
4. **Clean slate**: `docker compose down --remove-orphans`; verify env and mounts; rebuild; start.

## Docker Compose Release Validation

**Trigger**: New Docker Compose release; anomalies in container restart/healthcheck.

**Validation path**: (1) `docker compose config` must pass; (2) Restart key services; (3) Validate `GET /health`, `GET /api/health-check`; (4) Confirm webhooks respond.

## Continue CLI in Docker

**Architecture**: Trigger (n8n or Cron) → Node.js HTTP API wrapper → Continue CLI in Docker; Primary: Mistral; Fallback: Ollama.

**Config**: Placeholders `${MISTRAL_API_KEY}` patched at container startup via env-subst. **Endpoints**: `POST /prompt`, `POST /save`, `GET /health`.

**Continue MCP Setup**: Continue CLI (Docker) → MCP via Stdio → skills-mcp server. Verification: `docker exec -it continue-cli sh` → `ps aux | grep server.js`; `curl http://localhost:3002/models/status`.

**API Keys (Container Stale)**: Use `env-subst.js` entrypoint; `docker compose up -d --force-recreate continue-cli`.

**Response Mismatch (Port Shadow)**: Local `node` outside Docker bound to port 3002. Diagnosis: `netstat -ano | findstr "3002"`; kill rogue.

## Infrastructure Maintenance (Docker)

**Migration protocol**: When `INFRASTRUCTURE_CONFIG.yaml` exists, sync paths; copy `.env`; `docker volume create n8n_data`; run `npm run health-check` (invokes `is/scripts/infrastructure/health-check.js`).

**Routine**: `npm run health-check`; `docker compose pull`. **Recovery**: when infra-manager script exists: run recover; `docker restart continue-cli`; `docker compose build --no-cache continue-cli && docker compose up -d`.

## Windows Docker Paths & Lifecycle

Use PowerShell or escape paths for Docker commands. Ensure Docker Desktop running. Changing `.env` requires `docker-compose down && up -d --force-recreate`.
