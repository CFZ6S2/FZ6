#!/usr/bin/env bash
set -euo pipefail

ZIP="server-express-20251112-161422.zip"

if [ ! -f "$ZIP" ]; then
  echo "Zip $ZIP not found in repository root. Make sure the file is present." >&2
  exit 1
fi

TMPDIR=$(mktemp -d)
echo "Extracting $ZIP to $TMPDIR"

# Extract preserving paths
unzip -q "$ZIP" -d "$TMPDIR"

# Move extracted content to repository root without overwriting existing files
shopt -s dotglob || true
for item in "$TMPDIR"/*; do
  base=$(basename "$item")
  # skip git metadata if present
  if [ "$base" = ".git" ]; then
    continue
  fi
  echo "Moving $base to repo root"
  # -n to not overwrite; adjust as needed
  mv -n "$item" . || true
done

# Remove excluded folders if present
echo "Removing excluded folders: node_modules, .firebase, backups (if any)"
rm -rf node_modules .firebase backups || true

# Show a small summary
echo "Summary of top-level files after extraction:"
ls -la | sed -n '1,200p'

# Stage and commit changes
git add -A
if git diff --cached --quiet; then
  echo "No new changes to commit."
else
  git commit -m "Import files from server-express-20251112-161422.zip (script-assisted)"
  echo "Committed imported files."i

# Cleanup
rm -rf "$TMPDIR"
echo "Extraction script finished.
