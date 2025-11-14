# How to extract server-express-20251112-161422.zip into this repo

This repository contains the ZIP archive `server-express-20251112-161422.zip` at the repo root. To import its contents into the repository (on the `main` branch) do the following locally:

1. Make sure you have unzip and git installed.
2. From the repo root run:

```bash
chmod +x scripts/extract-zip.sh
./scripts/extract-zip.sh
```

The script will:
- Extract the ZIP into a temporary directory.
- Move top-level extracted items into the repository root (without overwriting existing files).
- Remove typical excluded folders (`node_modules`, `.firebase`, `backups`) to avoid committing large build artifacts.
- Stage and commit the imported files with message: "Import files from server-express-20251112-161422.zip (script-assisted)" if there are changes.

Notes:
- The script does not force-overwrite existing files. If you need to overwrite, inspect the extracted files first and adjust the `mv` command behavior.
- You may need to set your git user.name / user.email before the commit if not already configured.
- This approach keeps the large binary ZIP file in the repository (per your request). If you later want to remove it from history, consider using git-filter-repo or BFG.

