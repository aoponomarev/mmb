---
title: "Process: Windows & PowerShell Patterns for AI Agents"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "41c0dbe9"
---

# Process: Windows & PowerShell Patterns for AI Agents

> **Context**: AI agents (Cursor, Continue) running on Windows encounter shell errors when using Git Bash for file operations. This skill provides mandatory patterns to avoid known failures.
> **Scope**: All shell commands issued by AI agents in Cursor on Windows.

## Reasoning

- **#for-bash-ban-powershell** Windows Defender and OneDrive file locks block Unix pipe creation in Git Bash, resulting in unfixable OS-level `Win32 error 5`. PowerShell is required for reliable execution.
- **#for-path-format-context** Mixing forward slashes (Node.js) with backslashes (PowerShell `-Path`) causes silent failures.
- **#for-semicolon-over-and** The `&&` operator is bash syntax; PowerShell uses `;` for chaining commands.
- **#for-sqlite-no-onedrive** OneDrive locking during file sync corrupts SQLite databases.

### HARD BAN: Never Use Bash in Cursor

Git Bash + Cursor = `Win32 error 5 (Access Denied)`. This is a known OS-level conflict with no fix.

```
bash (XXXXX) C:\Program Files\Git\bin\..\usr\bin\bash.exe:
*** fatal error - couldn't create signal pipe, Win32 error 5
```

**Root cause**: Windows Defender blocks Unix pipe creation when Cursor spawns bash. OneDrive file locks compound the issue.

**Rule**: Always use PowerShell. If a command starts with `bash`, rewrite it for PowerShell before executing.

## Core Rules

1. Does the command start with `bash`? → **STOP. Rewrite for PowerShell.**
2. Using Unix operators (`&&`, `|`, `>`, backtick)? → **Wrap in `powershell -Command`.**
3. Path uses forward slashes for PowerShell `-Path`? → **Convert to backslashes.**

### Command Translation Table

| Bash | PowerShell |
|---|---|
| `mkdir -p "path"` | `New-Item -ItemType Directory -Force -Path 'path'` |
| `cp -r src dest` | `Copy-Item -Path 'src' -Destination 'dest' -Recurse -Force` |
| `mv src dest` | `Move-Item -Path 'src' -Destination 'dest' -Force` |
| `rm -rf path` | `Remove-Item -Path 'path' -Recurse -Force` |
| `ls -la` | `Get-ChildItem -Force` |
| `test -f file` | `Test-Path 'file'` |
| `cmd1 && cmd2` | `cmd1; cmd2` (or use `;` in `-Command` string) |

### Path Format Rules

| Context | Format | Example |
|---|---|---|
| PowerShell `-Path` parameter | Backslash, single quotes | `'D:\Clouds\AO\OneDrive\AI'` |
| PowerShell `-Command` string | Backslash, escaped | `"D:\\Clouds\\AO\\OneDrive\\AI"` |
| Node.js `path.join()` | Forward slash (cross-platform) | `path.join('D:/Clouds', 'file.txt')` |
| Docker volume mount | Forward slash | `D:/Clouds/AO:/data` |

### Multiple Operations

```powershell
# Chain with semicolons (NOT &&):
powershell -Command "New-Item -ItemType Directory -Force -Path 'path1'; Copy-Item 'src' 'dest' -Force"
```

### Troubleshooting

### Common Error Patterns & Fixes

### `Win32 error 5` in Git Bash
Use PowerShell instead of bash for the operation.

### `path should be a 'path.relative()'d string`
Cursor sandbox rejects absolute paths outside workspace. Wrap in `powershell -Command` or add `required_permissions: ["all"]` to the shell tool call.

### `The process cannot access the file because it is being used by another process`
OneDrive sync has the file locked. Wait for sync to complete (check tray icon), then retry with `-Force`.

### SQLite files + OneDrive
Never sync SQLite `.db` files through OneDrive — file locking causes corruption. Store them in a non-synced path or `data/` (gitignored).

### Debugging Checklist

When any file operation fails:
1. Is OneDrive syncing? (blue arrows in Explorer tray)
2. Is antivirus scanning the path?
3. Are paths using the correct format for the context?
4. Does the Shell tool call need `required_permissions: ["all"]`?
