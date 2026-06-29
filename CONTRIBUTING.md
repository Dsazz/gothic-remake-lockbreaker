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
