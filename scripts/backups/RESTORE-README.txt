Restore from backup archive
===========================

1. Extract this ZIP to any temporary folder (e.g. Downloads).

2. Open PowerShell in that folder and run:
   .\restore-app.ps1

3. When prompted, paste or type the destination path.
   Example: D:\Clouds\AO\OneDrive\Portfolio-CV\Refactoring\ToDo\Statistics
   The script will create a\ and mmb\ inside that folder.

4. The script syncs a\ and mmb\ (copy+overwrite, no purge), then runs npm install in mmb.

Requirements: Node 18+, PowerShell, Robocopy (built-in on Windows).
