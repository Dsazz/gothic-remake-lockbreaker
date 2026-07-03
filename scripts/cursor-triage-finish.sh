#!/usr/bin/env bash
# Finish Cursor PostHog triage on GitHub (comment + labels).
# Requires cursor-triage-finish.yml on main and a token with repo contents access.
set -euo pipefail

issue_number="${1:?issue number required}"
verdict="${2:?verdict required (skipped|fixed)}"
comment="${3:-}"

repo="${GITHUB_REPOSITORY:-Dsazz/gothic-remake-lockbreaker}"
token="${GITHUB_TOKEN:-$(git remote get-url origin 2>/dev/null | sed -n 's|.*x-access-token:\([^@]*\)@.*|\1|p' || true)}"
if [ -z "$token" ]; then
  echo "GITHUB_TOKEN or git remote token required" >&2
  exit 1
fi

payload=$(jq -n \
  --argjson issue_number "$issue_number" \
  --arg verdict "$verdict" \
  --arg comment "$comment" \
  '{event_type:"cursor-triage-complete", client_payload:{issue_number:$issue_number, verdict:$verdict, comment:$comment}}')

curl -fsSL -X POST "https://api.github.com/repos/${repo}/dispatches" \
  -H "Authorization: Bearer ${token}" \
  -H "Accept: application/vnd.github+json" \
  -d "$payload"

echo "Dispatched cursor-triage-complete for issue #${issue_number} (${verdict})"
