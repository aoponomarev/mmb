# Infrastructure Contracts (`is/contracts/`)

## Scope
This directory contains the Single Source of Truth (SSOT) definitions and validation schemas for fundamental project boundaries.

## Subdirectories
- `env/`: Zod schemas defining the required environment variables. Ensures fail-fast behavior if secrets are missing.
- `naming/`: Kebab-case enforcement and legacy terminology bans (Name Gate).
- `paths/`: The `paths.js` file, which is the absolute SSOT for all file system locations used across the project.

## Constraints
- Code anywhere in the project must import from these contracts rather than hardcoding values.
- Failures in contract validation block the `preflight` script, preventing the application or tests from running.
