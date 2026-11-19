# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).
Types of changes are:

- **Breaking changes** for breaking changes.
- **Features** for new features or changes in existing functionality.
- **Fixes** for any bug fixes.
- **Deprecated** for soon-to-be removed features.

## [Unreleased]

## [1.4.0] - 2026-11-19

### Features

- Global "Show notification with matched rule" option (off by default): show a desktop notification with the matched rule name when an account is auto-selected. Adds the `notifications` permission.

## [1.3.0] - 2026-11-06

### Features

- Global "Passkey prompt delay" option (5 seconds by default): wait before auto-confirming the passkey page, so password managers (e.g. 1Password) can show their passkey prompt. Auto-confirm is skipped if you click "Continue" yourself during the delay.

## [1.2.2] - 2026-10-07

### Fixes

- "Restore" button opened a missing page in the installed (signed) addon.
- Settings were not saved when there were no rules (checkboxes, deleting the last rule).

## [1.2.1] - 2026-10-07

### Fixes

- Read `updates.json` from `raw.githubusercontent.com`, so automatic updates do not depend on GitHub Pages.

## [1.2.0] - 2026-10-07

### Features

- Optional global auto-confirm of passkey ("Continue") and OAuth consent ("Allow") pages, e.g. for `gcloud auth login`.
- Sync settings and rules between browsers via Firefox Sync. Existing settings are migrated automatically. Rules are limited to 8 KB in total; the popup warns when close to the limit.

### Fixes

- Automatic updates did not work because `updates.json` used a wrong addon ID.

## [1.1.0] - 2025-12-16

### Features

- Suggest previously used emails in rules.
- Backup and restore

## [1.0.3] - 2025-12-16

### Fixes

- Missing ID in manifest

## [1.0.2] - 2025-12-16

### Fixes

- Paths to update file in manifest
- Paths to artifacts in updates file

## [1.0.1] - 2025-12-16

### Fixes

- Show hits for each rule

## [1.0.0] - 2025-10-01

### Features

- Initial release

[Unreleased]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.4.0...HEAD
[1.4.0]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.3.0...releases/1.4.0
[1.3.0]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.2.2...releases/1.3.0
[1.2.2]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.2.1...releases/1.2.2
[1.2.1]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.2.0...releases/1.2.1
[1.2.0]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.1.0...releases/1.2.0
[1.1.0]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.0.3...releases/1.1.0
[1.0.3]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.0.2...releases/1.0.3
[1.0.2]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.0.1...releases/1.0.2
[1.0.1]: https://github.com/radeklat/google-account-auto-choose/compare/releases/1.0.0...releases/1.0.1
[1.0.0]: https://github.com/radeklat/google-account-auto-choose/releases/tag/releases/1.0.0
