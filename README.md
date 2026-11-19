# Google Account Auto-Chooser Firefox Addon

A Firefox addon that automatically selects Google accounts on the account chooser page, with one rule per site.

## Features

- **Automatic Account Selection**: Automatically chooses the appropriate Google account when the account chooser page loads
- **Site Matching**: Finds the site that asks for sign-in (OAuth, SAML, Google services) from the account chooser URL
- **New Site Prompt**: On a site without a rule, pick an account once and the addon remembers it
- **Wildcards**: One rule for many sites with `*`, e.g. `app.*.example.com`
- **Easy Configuration**: Simple popup interface to manage your rules
- **Firefox Sync**: Settings and rules sync between browsers signed in to the same Firefox account

## Quick Start

**Want to get started immediately?**
1. Download the latest XPI file from [Releases](https://github.com/radeklat/google-account-auto-choose/releases)
2. Open Firefox → `about:addons` → gear icon → "Install Add-on From File..."
3. Select the downloaded XPI file and click "Add"
4. Click the addon icon in your toolbar to configure your rules
5. Sign in to a site with Google. On the account chooser, the addon asks which account to always use for this site.

## Installation

### For End Users (Self-Hosted)

This addon is self-hosted and supports automatic updates. You can install it in two ways:

#### Option 1: Install from XPI file (Recommended)

**Step 1: Download the Addon**
1. Go to the [Releases page](https://github.com/radeklat/google-account-auto-choose/releases)
2. Download the latest `google-account-auto-chooser-*.xpi` file (signed version)

**Step 2: Install in Firefox**

*Method A: Using Firefox Add-ons Manager (Recommended)*
1. Open Firefox
2. Navigate to `about:addons` (or press `Ctrl+Shift+A` / `Cmd+Shift+A`)
3. Click the gear icon (⚙️) in the top-right corner
4. Select "Install Add-on From File..."
5. Choose the downloaded XPI file
6. Click "Add" to install the addon
7. The addon should now appear in your extensions list

*Method B: Drag and Drop*
1. Open Firefox
2. Navigate to `about:addons`
3. Drag the downloaded XPI file directly onto the Firefox window
4. Click "Add" when prompted
5. The addon will be installed automatically

*Method C: Using Firefox Menu*
1. Open Firefox
2. Click the menu button (☰) → "Add-ons and themes" → "Extensions"
3. Click the gear icon → "Install Add-on From File..."
4. Select the downloaded XPI file
5. Click "Add" to install

**Step 3: Verify Installation**
1. Look for the addon icon in your Firefox toolbar
2. Click the icon to open the configuration popup
3. The addon is ready to use!

**Automatic Updates**
The addon will automatically check for updates every 24 hours. When a new version is available, Firefox will download and install it automatically.

**Important Notes:**
- Only signed XPI files can be installed in Firefox. Unsigned files will be rejected for security reasons.
- If you see a warning about "unsigned extensions," make sure you downloaded the signed version from the releases page.
- The addon requires permissions to access Google account pages and manage tabs for auto-close functionality.
- The `notifications` permission is used only for the optional matched rule notification.

#### Option 2: Temporary Installation (Development/Testing)

> **Warning:** Use a separate Firefox profile for testing. A temporary addon has the same ID as the installed addon.
> When Firefox removes the temporary addon, it also deletes the addon's local data, and the installed addon starts
> again with empty settings. Make a **Backup** first if you test in your main profile.

1. Download or clone this repository
2. Start Firefox with a test profile: `firefox -P test --no-remote`
   (create the profile in the dialog that opens, or with `firefox -CreateProfile test`)
3. Open Firefox and navigate to `about:debugging`
4. Click "This Firefox" in the left sidebar
5. Click "Load Temporary Add-on"
6. Select the `manifest.json` file from this project

**Note**: Temporary installations don't support automatic updates and will be removed when Firefox restarts.

## Configuration

The addon starts with an empty configuration. You need to set up rules based on your needs:

### Understanding the Configuration

Each rule has a **Site**. The addon finds the site ID of the app that asks for sign-in from the account chooser URL,
and selects the account of the first enabled rule whose Site matches. Site IDs:

| Sign-in type | Site ID | Example |
|--------------|---------|---------|
| OAuth / OIDC | Host name of the app | `app.dev.example.com` |
| SAML (e.g. VPN) | Host name of the service provider | `vpn.example.com` |
| Google services | Host name of the service | `mail.google.com` |
| CLI apps on `localhost` (e.g. `gcloud`) | OAuth client ID | `32555940559.apps.googleusercontent.com` |

**Site patterns:**

- Exact site ID: `app.example.com`
- `*` matches any text, dots included: `app.*.example.com` matches `app.dev.example.com` and
  `app.staging.example.com`. `*.example.com` matches all subdomains of `example.com` (not `example.com`).
- Case-insensitive. Regex is not supported.

**New site prompt:** when the addon is enabled and no rule matches the site, the account chooser shows a prompt. Edit
the Site (e.g. replace a part with `*`) and the Name, then click an account. The addon saves the rule and selects the
account. **Never ask for this site** saves a disabled rule, so the prompt does not show again. Delete that rule to see
the prompt again.

See [documentation/SITE_ID_EXTRACTION.md](documentation/SITE_ID_EXTRACTION.md) for details.

> **Upgrade from 1.x:** regex rules (**Match**) are not supported. Old rules show an empty **Site** and do not match.
> Fill in the Site, or delete the rules and use the new site prompt.

### Auto-Close Confirmation Pages

The addon includes an optional feature to automatically close confirmation pages that appear after successful account selection. This is useful for:

- **SAML authentication flows** where a "done=1" confirmation page appears
- **VPN connections** that show success messages
- **Any confirmation page** with success indicators in the URL or content

**Configuration Options:**
- **Addon enabled**: Master switch for the entire addon
- **Auto-close confirmation pages**: Enable/disable the auto-close functionality

**How it works:**
1. The addon runs on all Google account pages (not just the account chooser)
2. **NEW**: The addon also runs on any website for auto-close functionality
3. Detects confirmation pages using multiple methods:
   - URL parameters (e.g., `done=1`, `success`, `complete`)
   - Page content text (e.g., "successfully signed in", "authentication successful")
4. Automatically closes the tab when a confirmation page is detected
5. Respects your auto-close preference setting

**Rule-Specific Auto-close:**
Each rule can now include a custom auto-close pattern that will trigger tab closing when matched:
- **Auto-close**: Regex pattern to match specific confirmation page URLs
- **Example**: `.*done=1` for SAML authentication flows
- **Optional**: Leave empty to use the default confirmation detection methods

**Auto-confirm passkey and consent pages** (global, off by default): clicks "Continue" on the
passkey page and "Allow" on the OAuth consent page (e.g. `gcloud auth login`). "Allow" is clicked
only when the consent page account is an email of an enabled rule. Note: this grants access to
any app that asks for consent for such account.

**Passkey prompt delay** (global, 5 seconds by default): wait before clicking "Continue" on the
passkey page. Password managers (e.g. 1Password) need time to hook the page, otherwise the browser
native passkey prompt appears instead. Set to `0` to click immediately. Auto-click is skipped if
you click "Continue" yourself during the delay.

**Show notification with matched rule** (global, off by default): show a desktop notification with
the name of the matched rule and the selected email when an account is auto-selected.

### Setting Up Rules

Use the new site prompt, or add a rule by hand:

1. Click the addon icon in your Firefox toolbar
2. Click "+ Add New Rule" to create a new rule
3. Fill in the rule details (saved automatically):
   - **Name**: A descriptive name (e.g., "Work VPN", "Personal Gmail")
   - **Site**: Site ID or pattern (see [Understanding the Configuration](#understanding-the-configuration))
   - **Email**: The email address to automatically select

### Example Rules

#### Work VPN (SAML)
- **Name**: Work VPN
- **Site**: `vpn.company.com`
- **Email**: `user@company.com`
- **Auto-close**: `.*done=1`

#### Personal Gmail
- **Name**: Personal Gmail  
- **Site**: `mail.google.com`
- **Email**: `user@gmail.com`
- **Auto-close**: `` (leave empty for default detection)

#### All environments of one app
- **Name**: My app
- **Site**: `app.*.company.com`
- **Email**: `user@company.com`
- **Auto-close**: `` (leave empty for default detection)

#### Google Cloud CLI (`gcloud auth login`)
- **Name**: gcloud
- **Site**: `32555940559.apps.googleusercontent.com` (gcloud OAuth client ID, because the site is `localhost`)
- **Email**: `user@company.com`
- **Auto-close**: `docs\.cloud\.google\.com/sdk/auth_success`

### Syncing Settings Between Browsers

Settings and rules are stored in `browser.storage.sync`. Firefox Sync copies them to all browsers signed in to the same
Firefox account. Requirements:

- Signed in to Firefox Sync, with **Add-ons** selected in sync settings.
- Changes arrive on the next sync (about every 10 minutes, or immediately with "Sync Now").

Without Firefox Sync, settings stay in the local browser. On update from an older version, existing settings are copied
to sync storage automatically.

**Size limit:** Firefox limits one sync item to **8 KB**. All rules are stored in one item, so the total size of all
rules (names, sites, emails) must stay below 8 KB. That is approximately 40–80 rules, depending on pattern length.
The popup shows a warning at 80% of the limit. When the limit is exceeded, changes are not saved. Use **Backup** to keep a
copy of large configurations. See [documentation/SYNC_SIZE_LIMIT.md](documentation/SYNC_SIZE_LIMIT.md) for a possible
future fix.

### Site Pattern Examples

- `vpn.company.com` - Only this host
- `*.company.com` - All subdomains of `company.com`
- `app.*.company.com` - `app.dev.company.com`, `app.staging.company.com`, ...
- `*.google.com` - All Google services, e.g. `mail.google.com`, `calendar.google.com`

# Development

1. Clone the repository:
   ```bash
   git clone https://github.com/radeklat/google-account-auto-choose.git
   cd google-account-auto-choose
   ```

2. Install dependencies:
   ```bash
   make install
   ```

3. Build the addon:
   ```bash
   make build
   ```

4. Load in Firefox as a [temporary addon](#option-2-temporary-installation-developmenttesting).

## Project Structure

```
google-account-auto-choose/
├── src/
│   ├── account-chooser.js # Content script on Google pages: account selection, new site prompt
│   ├── auto-close.js      # Content script on all pages: closes confirmation pages
│   ├── background.js      # Background script for addon logic
│   ├── popup.html         # Configuration popup interface
│   ├── popup.js           # Popup script logic
│   ├── restore.html/.js   # Restore from backup page
│   └── site.js            # Site ID extraction and pattern matching
├── tests/                 # Unit tests (make test)
├── documentation/         # Design notes, e.g. SITE_ID_EXTRACTION.md
├── icons/                 # Addon icons
├── dist/                  # Build output (generated)
├── manifest.json          # Addon manifest
├── package.json           # Development dependencies
└── README.md             # This file
```

## Available Make targets

- `make build` - Build the addon to the `dist/` folder
- `make clean` - Clean the build output
- `make release` - Create a release with signed XPI file and update manifest
- `make sign` - Sign the addon using web-ext (requires API credentials)
- `make sign-amo` - Sign the addon with AMO API credentials
- `make lint` - Run ESLint on source code and validate addon using web-ext linter
- `make test` - Run unit tests (Node.js built-in test runner)

## Development Workflow

1. One time setup for auto-opened links in Firefox:
   ```shell
   cat > ~/.local/bin/firefox-testing <<'EOF'
   #!/bin/sh
   exec firefox -P google-account-auto-choose-testing "$@"
   EOF
   chmod +x ~/.local/bin/firefox-testing
   ```
2. Edit files in the `src/` directory
3. Open Firefox in a test profile:
   ```shell
   firefox -P google-account-auto-choose-testing &
   ```
4. Add addon as temporary in Firefox's `about:debugging` page. See the warning in [Temporary Installation](#option-2-temporary-installation-developmenttesting).
5. Restore data from a backup if you want to test with existing settings.
6. To test Firefox Sync, sign in to Sync in two test profiles and turn on "Add-ons".
7. Let apps open the test profile automatically with `firefox-testing`. For example:
   ```shell
   BROWSER=~/.local/bin/firefox-testing gcloud auth login
   ```
8. Make changes as needed.
9. Reload the addon in Firefox's `about:debugging` page.

## Icon Management

The addon requires icons in multiple sizes for different display contexts. If you want to update the icon design:

1. **Replace the source icon**: Place your new design as `icons/icon.png`
2. **Regenerate all sizes**: Run the following commands to create all required icon sizes:

```bash
for size in 16 19 32 38 48 64 96 128; do
   convert icons/icon.png -resize ${size}x${size} -quality 100 icons/icon-${size}.png
done

# Copy all icons to dist folder
cp icons/*.png dist/icons/
```

**Important**: Use the `-quality 100` flag to preserve colors and prevent the icons from becoming black and white.

3. **Test the build**: Run `make build` to ensure everything works correctly
4. **Reload in Firefox**: Test the new icons in the addon

**Requirements**: ImageMagick must be installed on your system (`convert` command available).

## Building for Distribution

### Create Release (Self-Hosted)

To create a new release for self-hosting:

1. **Get Mozilla API credentials** (required for signing):
   - Create account at [addons.mozilla.org](https://addons.mozilla.org)
   - Generate JWT issuer and secret in Developer Hub
   - See [SIGNING.md](documentation/SIGNING.md) for detailed instructions

2. **Set up environment variables**:
   ```bash
   export AMO_JWT_ISSUER="your-jwt-issuer-here"
   export AMO_JWT_SECRET="your-jwt-secret-here"
   ```

3. **Bump version (no git tag/commit)**:
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
   This automatically keeps `manifest.json` in sync with `package.json` (via an npm `version` hook).

4. **Create release**:
   ```bash
   make release
   ```

5. **Commit and push changes**:
   ```bash
   git add .
   git commit -m "Release version X.X.X"
   git push origin main
   ```

6. **Create GitHub release**:
   - Go to [GitHub Releases](https://github.com/radeklat/google-account-auto-choose/releases)
   - Click "Create a new release"
   - Set the tag name to `releases/X.X.X` (for example `releases/1.0.1`)
   - Upload the generated signed XPI file from `releases/` folder
   - Publish the release

7. **Merge to `main`**: Firefox reads `updates.json` from
   `https://raw.githubusercontent.com/radeklat/google-account-auto-choose/main/updates.json`.
   GitHub Pages also serves it for installs older than 1.2.1, which use the `github.io` URL. Keep Pages enabled.

**Important**: All Firefox addons must be signed by Mozilla before they can be installed. The release script automatically handles signing if you have the proper API credentials configured.

# Troubleshooting

## Installation Issues

**"This add-on could not be installed because it appears to be corrupt"**
- Make sure you downloaded the signed XPI file from the releases page
- Try downloading the file again
- Check that the file wasn't corrupted during download

**"This add-on could not be installed because it is not signed"**
- You need the signed version of the addon
- Download the XPI file from the [releases page](https://github.com/radeklat/google-account-auto-choose/releases)
- Do not use the unsigned version

**"Installation blocked" or "Firefox prevented this site from installing an add-on"**
- This is normal for self-hosted addons
- Use the "Install Add-on From File..." option in `about:addons`
- Do not try to install directly from the website

**Addon icon not appearing in toolbar**
- Check if the addon is enabled in `about:addons`
- Try pinning the addon to the toolbar: right-click on the addon → "Pin to Toolbar"
- Restart Firefox if the icon still doesn't appear

**"This add-on is not compatible with Firefox"**
- Make sure you're using a recent version of Firefox
- The addon requires Firefox 78 or later
- Update Firefox to the latest version

### Functionality Issues

- **Addon not working**: Make sure you're on the correct Google account chooser page
- **Wrong account selected**: Check your site patterns and make sure they're not too broad. The first matching enabled rule wins
- **No account selected**: Open the browser console on the account chooser and compare `Site ID: <id>` with your rule's Site
- **Build errors**: Make sure all dependencies are installed with `npm install`

### Debug Steps

1. Check the browser console for error messages (F12 → Console)
2. Verify the addon is loaded in `about:debugging`
3. Check that content scripts are running on Google pages
4. Verify your configuration rules are saved correctly
5. Test with a simple rule first (e.g., Site `*` to match any site)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to modify and distribute as needed.
