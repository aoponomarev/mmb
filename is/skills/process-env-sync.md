# Process: Environment Sync Governance

> **Context**: Ensures `.env` and `.env.example` are always synchronized. Prevents "works on my machine" failures caused by missing env variables.
> **Scope**: Root `.env`, `.env.example`, `is/contracts/env/env-rules.js`

## 1. The EIP Principle (Every Item Present)

Every key defined in `.env` MUST have a corresponding entry in `.env.example` with a placeholder.
Every key in `.env.example` MUST correspond to a key that is still expected in `.env`.

The preflight script (`npm run preflight`) enforces this contract on every run.

## 2. Verification Protocol

**Automated check**: Zod validation in `is/contracts/env/env-rules.js` is run inside `is/scripts/preflight.js`.

If validation fails:
- **Key in `.env` but missing in `.env.example`**: You added a variable but forgot to update the template.
- **Key in `.env.example` but missing in `.env`**: Stale placeholder or missing local secret.
- **Fix first, commit second.**

## 3. Sync Workflow

When adding a new feature requiring an environment variable:

1. Add the real value to `.env`.
2. **Immediately** add a placeholder entry to `.env.example` with a descriptive comment.
3. Update `is/contracts/env/env-rules.js` if the variable is required (add it to the Zod schema).
4. Run `npm run preflight` to verify.
5. Commit only `.env.example` and `env-rules.js`.

## 4. Hard Constraints

1. **No real secrets in `.env.example`.** Use descriptive placeholders only.
2. **Mandatory comments**: Every variable in `.env.example` must have a `#` comment explaining its purpose and where to obtain the value.
3. **Required vs optional**: Mark each variable's criticality in `env-rules.js` (Zod `.required()` vs `.optional()`).
4. **Cloud function alignment**: If a variable is consumed by Cloudflare Workers or Yandex Cloud functions, it must be present in both `.env` and `.env.example`.

## 5. DATA_PLANE_ACTIVE_APP (Single-Writer Guard)

This special variable controls which application instance is allowed to write data to shared cloud resources.

**Valid values**: `TARGET`, `LEGACY`

The health-check (`npm run health-check`) validates this variable explicitly. An invalid or missing value will cause the `contracts` plane to show a warning.

**Rule**: Only one value (`TARGET`) should be active during normal Target App operation. Switch to `LEGACY` only when intentionally handing over write authority.
