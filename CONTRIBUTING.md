# Contributing

Thanks for helping improve Gothic Lock Breaker. This page is for **users and translators** reporting problems or ideas. For agent/developer architecture and commands, see [AGENTS.md](AGENTS.md).

## Where to go

| Goal | Channel |
| --- | --- |
| **Bug** (solver wrong, UI broken, crash) | [Open a bug report](https://github.com/Dsazz/gothic-remake-lockbreaker/issues/new?template=bug_report.yml) |
| **Translation** (DE / PL / UKR wording) | [Open a translation fix](https://github.com/Dsazz/gothic-remake-lockbreaker/issues/new?template=translation.yml) |
| **Feature idea** | [Open a feature request](https://github.com/Dsazz/gothic-remake-lockbreaker/issues/new?template=feature_request.yml) |
| **Not sure which** | [Issue template chooser](https://github.com/Dsazz/gothic-remake-lockbreaker/issues/new/choose) |
| **Ideas & how-to chat** | [GitHub Discussions](https://github.com/Dsazz/gothic-remake-lockbreaker/discussions) |
| **Tips / support the project** | [Ko-fi](https://ko-fi.com/swarmconductor) — voluntary; not for bug reports |

The in-app footer **Report an issue** link opens the template chooser. The translation banner (non-English locales) links straight to the translation template.

## Privacy

**Do not post lock state in issues or discussions.**

- No full page URL / hash (it encodes your lock)
- No coupling matrix or pin positions
- Plate count and walkthrough step number are fine when they help reproduce a bug

## Code changes

1. Branch off `main` (direct push to `main` is blocked).
2. `make install` once after clone; then `make lint && make test` before opening a PR.
3. Open a pull request to `main`. CI must pass before merge.

See [README.md](README.md) for local dev commands and deploy workflow.

## Maintainer: PostHog issue automation

Cursor Automation triages issues opened by the PostHog GitHub integration (`app/posthog-eu`). Workflow: [.github/workflows/cursor-posthog-issue.yml](.github/workflows/cursor-posthog-issue.yml).

### One-time setup

1. **Save the automation** in Cursor Automations (name: *Fix PostHog errors from GitHub Issues*). Copy the webhook URL and generate an API token (`crsr_…`).
2. **Repo secrets** ([Settings → Secrets → Actions](https://github.com/Dsazz/gothic-remake-lockbreaker/settings/secrets/actions)):
   - `CURSOR_WEBHOOK_URL` — webhook URL from the Automations UI
   - `CURSOR_AUTOMATION_TOKEN` — API token from the Automations UI
3. **PostHog MCP** connected on [cursor.com](https://cursor.com) for the Cloud Agent account.
4. **Cloud Agents** enabled for this repo in the [Cloud Agents dashboard](https://cursor.com/dashboard?tab=cloud-agents).
5. **Labels** (created once): `cursor-processing`, `cursor-fixed`, `cursor-skipped`, `cursor-fix`.

### Pre-flight

Before merging the workflow PR, POST a test payload to the webhook and confirm the automation run log shows PostHog MCP tools. If the webhook returns 401, regenerate the API token.

### Manual retry

Add the `cursor-fix` label to an issue to re-trigger (strips `cursor-fixed` / `cursor-skipped` first). Blocked while `cursor-processing` is set.

### Finish triage (comment + labels)

Cloud Agent tokens cannot write GitHub issues. After triage, dispatch [.github/workflows/cursor-triage-finish.yml](.github/workflows/cursor-triage-finish.yml) (**Actions → Finish Cursor PostHog triage → Run workflow**) with:

- `issue_number` — GitHub issue number
- `verdict` — `skipped` or `fixed`
- `comment_body` — markdown triage summary

This posts the comment, swaps `cursor-processing` / `cursor-fix` for `cursor-skipped` or `cursor-fixed`, and **closes the issue**. Triage comments remain on the closed issue as the audit trail.

Re-open manually or add the `cursor-fix` label to retry triage on a closed issue (the trigger workflow reopens it first).
