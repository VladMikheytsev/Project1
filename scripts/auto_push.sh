#!/usr/bin/env bash
set -euo pipefail

# Interval between checks in seconds (override with ENV INTERVAL_SECONDS)
INTERVAL_SECONDS=${INTERVAL_SECONDS:-10}

# Determine target branch
TARGET_BRANCH=${1:-}
if [[ -z "$TARGET_BRANCH" ]]; then
  TARGET_BRANCH=$(git rev-parse --abbrev-ref HEAD)
fi

echo "[auto-push] Watching repo on branch: ${TARGET_BRANCH} (interval: ${INTERVAL_SECONDS}s)"

while true; do
  # Detect untracked, unstaged, or staged changes
  has_untracked=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')
  has_worktree_changes=0
  if ! git diff --quiet; then has_worktree_changes=1; fi
  has_index_changes=0
  if ! git diff --cached --quiet; then has_index_changes=1; fi

  if [[ "$has_untracked" != "0" || "$has_worktree_changes" == "1" || "$has_index_changes" == "1" ]]; then
    echo "[auto-push] Changes detected. Committing..."
    git add -A
    # Commit if there is anything staged
    if ! git diff --cached --quiet; then
      ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      git commit -m "auto: sync ${ts}" || true
    fi

    # Push if remote 'origin' exists
    if git remote get-url origin >/dev/null 2>&1; then
      echo "[auto-push] Pushing to origin/${TARGET_BRANCH}..."
      git push origin "$TARGET_BRANCH" || true
    else
      echo "[auto-push] No remote 'origin' configured. Skipping push."
    fi
  fi

  sleep "$INTERVAL_SECONDS"
done


