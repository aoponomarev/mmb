# /is - Infrastructure Source

This directory contains **deployed infrastructure code** for the app project.
Application code lives in `/core` and `/app`; only deploy artifacts and cloud function sources belong here.

## Structure

```
is/
├── cloudflare/
│   └── workers/          # Cloudflare Workers (app-api)
│       ├── src/          # Worker source code (router, auth, proxy, APIs)
│       ├── migrations/   # D1 database migrations
│       ├── wrangler.toml # Wrangler deploy config
│       └── *.md          # Deploy instructions
│
└── yandex/
    └── functions/
        ├── coingecko-fetcher/  # Cron function: fetches CoinGecko -> PostgreSQL
        └── app-api/            # API function: serves data from PostgreSQL
```

## Deployment

### Cloudflare Workers

```bash
cd is/cloudflare/workers
npx wrangler deploy
```

Secrets (never committed):
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `JWT_SECRET` - JWT signing key

Set via: `wrangler secret put <NAME>`

### Yandex Cloud Functions

Each function has its own `package.json`. Deploy via Yandex CLI or the console.

Required environment variables (set in Yandex Cloud console):
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `COINGECKO_API_KEY` (optional, for higher rate limits)

### What does NOT belong here

- `node_modules/` (install locally per function)
- `.wrangler/state/` (local dev state)
- Secrets, API keys, passwords
- Application UI code (belongs in `/core` or `/app`)
