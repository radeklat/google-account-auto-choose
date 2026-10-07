# Google Account Auto-Chooser Firefox Addon

A Firefox addon that automatically selects Google accounts on the account chooser page based on URL patterns and user configuration.

## Features

- **Automatic Account Selection**: Automatically chooses the appropriate Google account when the account chooser page loads
- **URL Pattern Matching**: Uses regex patterns to match the `continue` parameter in URLs
- **Configurable Rules**: Set up multiple rules for different scenarios
- **Easy Configuration**: Simple popup interface to manage your rules
- **Firefox Sync**: Settings and rules sync between browsers signed in to the same Firefox account

## Quick Start

**Want to get started immediately?**
1. Download the latest XPI file from [Releases](https://github.com/radeklat/google-account-auto-choose/releases)
2. Open Firefox → `about:addons` → gear icon → "Install Add-on From File..."
3. Select the downloaded XPI file and click "Add"
4. Click the addon icon in your toolbar to configure your rules
5. Add a rule like: Name: "Work", Match: `.*/saml2/.*`, Email: `your-work@email.com`

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

#### Option 2: Temporary Installation (Development/Testing)

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from this project

**Note**: Temporary installations don't support automatic updates and will be removed when Firefox restarts.

## Configuration

The addon starts with an empty configuration. You need to set up rules based on your needs:

### Understanding the Configuration

The addon works by matching the `continue` parameter in Google account chooser URLs. For example:

- **URL**: `https://accounts.google.com/v3/signin/accountchooser?continue=https://accounts.google.com/o/saml2/continue`
- **Continue Parameter**: `https://accounts.google.com/o/saml2/continue`
- **Pattern**: `.*/saml2/.*` (matches any URL containing `/saml2/`)

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

### Setting Up Rules

1. Click the addon icon in your Firefox toolbar
2. Click "+ Add New Rule" to create a new rule
3. Fill in the rule details:
   - **Name**: A descriptive name (e.g., "Work SAML", "Personal Gmail")
   - **Match**: Regex pattern to match the continue parameter
   - **Email**: The email address to automatically select
4. Click "Save Configuration"

### Example Rules

#### Work Account (SAML)
- **Name**: Work SAML
- **Match**: `.*/saml2/.*`
- **Email**: `user@company.com`
- **Auto-close**: `.*done=1`

#### Personal Gmail
- **Name**: Personal Gmail  
- **Match**: `.*/gmail/.*`
- **Email**: `user@gmail.com`
- **Auto-close**: `` (leave empty for default detection)

#### Specific Service
- **Name**: Google Drive
- **Match**: `.*/drive/.*`
- **Email**: `user@gmail.com`
- **Auto-close**: `.*/success.*` (matches any URL containing `/success`)

#### Google Cloud CLI (`gcloud auth login`)
- **Name**: gcloud
- **Match**: `32555940559\.apps\.googleusercontent\.com` (gcloud OAuth client ID, present on all pages of the flow)
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
rules (names, patterns, emails) must stay below 8 KB. That is approximately 40–80 rules, depending on pattern length.
The popup shows a warning at 80% of the limit. When the limit is exceeded, changes are not saved. Use **Backup** to keep a
copy of large configurations. See [documentation/SYNC_SIZE_LIMIT.md](documentation/SYNC_SIZE_LIMIT.md) for a possible
future fix.

### Regex Pattern Examples

- `.*/saml2/.*` - Matches any URL containing `/saml2/`
- `.*google\.com.*` - Matches any Google domain
- `.*/mybusiness/.*` - Matches Google My Business URLs
- `.*calendar.*` - Matches Google Calendar URLs
- `.*docs.*` - Matches Google Docs URLs

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
│   ├── background.js      # Background script for addon logic
│   ├── content.js         # Content script that runs on Google pages
│   ├── popup.html         # Configuration popup interface
│   └── popup.js           # Popup script logic
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

## Development Workflow

1. **Make Changes**: Edit files in the `src/` directory
2. **Test**: Reload the addon in Firefox's `about:debugging` page
3. **Repeat**: Make changes and rebuild as needed

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
- **Wrong account selected**: Check your regex patterns and make sure they're not too broad
- **No account selected**: Verify your patterns match the actual URLs you're visiting
- **Build errors**: Make sure all dependencies are installed with `npm install`

### Debug Steps

1. Check the browser console for error messages (F12 → Console)
2. Verify the addon is loaded in `about:debugging`
3. Check that content scripts are running on Google pages
4. Verify your configuration rules are saved correctly
5. Test with a simple rule first (e.g., `.*` to match any URL)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to modify and distribute as needed.
