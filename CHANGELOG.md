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

[Unreleased]: https://github.com/radeklat/delfino-core/compare/1.2.0...HEAD
[1.2.0]: https://github.com/radeklat/delfino-core/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/radeklat/delfino-core/compare/1.0.3...1.1.0
[1.0.3]: https://github.com/radeklat/delfino-core/compare/1.0.2...1.0.3
[1.0.2]: https://github.com/radeklat/delfino-core/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/radeklat/delfino-core/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/radeklat/delfino-core/compare/initial...1.0.0
