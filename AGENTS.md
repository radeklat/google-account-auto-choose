# AGENTS.md — AI Agent Guide

This repository is a **Firefox (Manifest V2) addon** that:

- **Auto-selects a Google account** on the Google account chooser page based on **user rules** (site patterns with `*`
  matched against a site ID extracted from the chooser URL). Offers to create a rule for a site without one.
- Optionally **auto-closes “confirmation/success” pages** after account selection (via URL/content heuristics and
  optional per-rule regex).

Use this doc to make safe, repo-aligned changes quickly.

## What to edit (and what not to)

- **Edit source only**: `src/`
- **Do not hand-edit generated output**: `dist/` is produced by `make build`
- **Top-level `manifest.json`** is the source manifest; build copies it to `dist/manifest.json` with path adjustments.

## Key entry points

- **Popup UI** (rule management):
    - `src/popup.html`
    - `src/popup.js`
- **Account chooser automation** (runs on Google account pages / chooser):
    - `src/account-chooser.js`
    - `src/site.js` (site ID extraction and pattern matching, see `documentation/SITE_ID_EXTRACTION.md`)
- **Auto-close logic** (runs on all URLs, used to close “done/success” confirmation pages):
    - `src/auto-close.js`
- **Background script** (addon-level wiring, tab management/storage helpers):
    - `src/background.js`

## Make commands

- build: Build the addon into dist/
- clean: Remove build output (dist/)
- help: Show help for each of the Makefile recipes
- install: Install dev dependencies
- lint: Run ESLint on src/ and tests/
- test: Run unit tests
- release: Create a release (sign + update manifest) via scripts/release.js
- sign-amo: Sign the addon using web-ext with AMO credentials (self-hosted)
- sign: Sign the addon using web-ext (self-hosted)

## Runtime behavior (what the addon actually does)

### Account selection logic (high-level)

- Triggered on Google’s account chooser page (`accounts.google.com/.../accountchooser`)
- Extracts a **site ID** from the URL (`app_domain`/`redirect_uri` host, SAML Issuer, `continue` host, `client_id`).
  Read `documentation/SITE_ID_EXTRACTION.md` before adding a new source; keep it and `tests/site.test.js` up to date
- Compares it against user-configured **site patterns** (`*` wildcard, no regex)
- Picks the configured **email/account** and clicks the matching account element
- No rule for the site (enabled or disabled) and addon enabled → shows a prompt to create a rule

When modifying this flow:

- Keep it resilient to minor DOM changes
- Prefer stable selectors/attributes, and avoid brittle text-only matching
- Fail safely: if no matching rule/account is found, do nothing

### Auto-close logic (high-level)

- Runs on `<all_urls>`
- Detects “success/complete/done” confirmation states using:
    - URL parameters (e.g. `done=1`, `success`, `complete`)
    - Page content phrases (e.g. “successfully signed in”)
    - Optional per-rule **auto-close regex** pattern (if configured)
- Closes the tab when detected (must respect user preferences)

When modifying auto-close behavior:

- Avoid overly broad detection that could close unrelated pages
- Ensure it respects the user’s “auto-close enabled” setting

## Storage and configuration expectations

The addon uses `browser.storage.sync` to persist:

- A master “enabled” switch (addon on/off)
- An “auto-close enabled” preference
- A list of rules, each typically containing:
    - **name** (display label)
    - **site** (site ID pattern, `*` wildcard)
    - **email** (target account)
    - **autoClose** (optional regex string for confirmation URLs)

When changing storage shape:

- Add defensive migrations and defaults (treat missing fields as “off/empty”)
- Avoid breaking existing users’ stored configs

## Permissions and scope (be careful)

`manifest.json` requests:

- `storage`, `tabs`, `activeTab`
- `*://accounts.google.com/*`
- `<all_urls>` (required for auto-close content script)

If you propose new permissions:

- Justify them in code comments and update docs accordingly
- Prefer not to widen host permissions unless necessary

## Contribution conventions for AI agents

- Prefer small, targeted changes.
- Keep `src/` as the source of truth; rebuild before finishing.
- Preserve user privacy and avoid collecting sensitive data.
- Avoid adding heavy dependencies; this is a small MV2 addon.

## Version bumping (no git tag/commit)

Use npm’s built-in version bump command (this repo syncs `manifest.json` from `package.json` automatically):

```bash
# Preferred (Makefile helpers):
make version-patch
# or:
make version-minor
make version-major

# Equivalent (direct npm):
# npm version patch --no-git-tag-version
# npm version minor --no-git-tag-version
# npm version major --no-git-tag-version
```

Then rebuild:

```bash
npm run build
```


