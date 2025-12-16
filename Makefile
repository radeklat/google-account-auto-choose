.PHONY: help install clean build lint release sign sign-amo version-patch version-minor version-major

help: # Show help for each of the Makefile recipes
	@grep -E '^[a-zA-Z0-9_-]+:.*#' Makefile | sort | while read -r l; do \
		printf "\033[1;32m$$(echo $$l | cut -f 1 -d':')\033[00m: $$(echo $$l | cut -f 2- -d'#')\n"; \
	done

install: # Install dev dependencies
	npm install

clean: # Remove build output (dist/)
	rm -rf dist/

build: clean # Build the addon into dist/
	mkdir -p dist
	cp -r src/* dist/
	sed 's|src/||g' manifest.json > dist/manifest.json
	mkdir -p dist/icons
	cp icons/* dist/icons/ 2>/dev/null || echo 'Icons not found, creating placeholder'

lint: # Run ESLint on src/
	npx --no-install eslint src/
	npx --no-install web-ext lint --source-dir dist --self-hosted

version-patch: # Bump patch version (no git tag/commit) and sync manifest.json
	npm version patch --no-git-tag-version

version-minor: # Bump minor version (no git tag/commit) and sync manifest.json
	npm version minor --no-git-tag-version

version-major: # Bump major version (no git tag/commit) and sync manifest.json
	npm version major --no-git-tag-version

release: # Create a release (sign + update manifest) via scripts/release.js
	node scripts/release.js

sign: # Sign the addon using web-ext (self-hosted)
	npx --no-install web-ext sign --no-input --source-dir dist --artifacts-dir releases --channel unlisted

sign-amo: # Sign the addon using web-ext with AMO credentials (self-hosted)
	npx --no-install web-ext sign --no-input --source-dir dist --artifacts-dir releases --api-key $$AMO_JWT_ISSUER --api-secret $$AMO_JWT_SECRET --channel unlisted


