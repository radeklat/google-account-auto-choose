# Google Account Auto-Chooser Firefox Addon

A Firefox addon that automatically selects Google accounts on the account chooser page based on URL patterns and user configuration.

## Features

- **Automatic Account Selection**: Automatically chooses the appropriate Google account when the account chooser page loads
- **URL Pattern Matching**: Uses regex patterns to match the `continue` parameter in URLs
- **Configurable Rules**: Set up multiple rules for different scenarios
- **Easy Configuration**: Simple popup interface to manage your rules

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

### For Developers

1. Clone the repository:
   ```bash
   git clone https://github.com/radeklat/google-account-auto-choose.git
   cd google-account-auto-choose
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the addon:
   ```bash
   npm run build
   ```

4. Load in Firefox:
   - Open Firefox and go to `about:debugging`
   - Click "This Firefox" in the left sidebar
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the `dist/` folder

## Development

### Project Structure

```
google-account-auto-choose/
├── src/
│   ├── background.js      # Background script for addon logic
│   ├── content.js         # Content script that runs on Google pages
│   ├── popup.html         # Configuration popup interface
│   └── popup.js           # Popup script logic
├── icons/                 # Addon icons (create your own)
│   ├── icon.png          # Source icon file (your custom design)
│   ├── icon-19.png       # 19x19 toolbar icon
│   ├── icon-38.png       # 38x38 toolbar icon @2x
│   ├── icon-48.png       # 48x48 addon manager icon
│   └── icon-96.png       # 96x96 addon manager icon @2x
├── dist/                  # Build output (generated)
├── manifest.json          # Addon manifest
├── package.json           # Development dependencies
└── README.md             # This file
```

### Available Scripts

- `npm run build` - Build the addon to the `dist/` folder
- `npm run dev` - Build and show instructions for loading
- `npm run watch` - Watch for changes and rebuild automatically
- `npm run clean` - Clean the build output
- `npm run package` - Create a distributable ZIP file
- `npm run release` - Create a release with signed XPI file and update manifest
- `npm run sign` - Sign the addon using web-ext (requires API credentials)
- `npm run sign:amo` - Sign the addon with AMO API credentials
- `npm run lint` - Run ESLint on source code
- `npm run lint:web-ext` - Validate addon using web-ext linter

### Development Workflow

1. **Make Changes**: Edit files in the `src/` directory
2. **Build**: Run `npm run build` to update the `dist/` folder
3. **Test**: Reload the addon in Firefox's `about:debugging` page
4. **Repeat**: Make changes and rebuild as needed

### Hot Reloading

For development, use the watch mode:
```bash
npm run watch
```

This will automatically rebuild the addon whenever you save changes to source files.

### Icon Management

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

3. **Test the build**: Run `npm run build` to ensure everything works correctly
4. **Reload in Firefox**: Test the new icons in the addon

**Requirements**: ImageMagick must be installed on your system (`convert` command available).

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

### Regex Pattern Examples

- `.*/saml2/.*` - Matches any URL containing `/saml2/`
- `.*google\.com.*` - Matches any Google domain
- `.*/mybusiness/.*` - Matches Google My Business URLs
- `.*calendar.*` - Matches Google Calendar URLs
- `.*docs.*` - Matches Google Docs URLs

## Testing

### Manual Testing

1. **Build the Addon**:
   ```bash
   npm run build
   ```

2. **Load in Firefox**:
   - Go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select `dist/manifest.json`

3. **Configure Rules**:
   - Click the addon icon in the toolbar
   - Add a test rule (e.g., `.*/saml2/.*` → `your.email@company.com`)

4. **Test Account Selection**:
   - Visit a Google account chooser page with a matching URL
   - The addon should automatically select the configured account

### Testing URLs

Create test URLs like:
```
https://accounts.google.com/v3/signin/accountchooser?continue=https://accounts.google.com/o/saml2/continue
https://accounts.google.com/v3/signin/accountchooser?continue=https://accounts.google.com/gmail/
https://accounts.google.com/v3/signin/accountchooser?continue=https://accounts.google.com/drive/
```

### Debugging

- **Console Logs**: Check the browser console for addon messages
- **Storage**: Use `browser.storage.local.get()` in the console to check configuration
- **Content Script**: The content script logs its actions to the console

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

3. **Update version** in `package.json`:
   ```bash
   # Edit package.json to increment version number
   ```

4. **Create release**:
   ```bash
   npm run release
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
   - Upload the generated signed XPI file from `releases/` folder
   - Publish the release

7. **Enable GitHub Pages** (if not already enabled):
   - Go to repository Settings → Pages
   - Select "Deploy from a branch" → "main" branch
   - This will serve the `updates.json` file for automatic updates

**Important**: All Firefox addons must be signed by Mozilla before they can be installed. The release script automatically handles signing if you have the proper API credentials configured.

### Create ZIP Package (Legacy)

```bash
npm run package
```

This creates `google-account-auto-chooser.zip` that can be distributed.

### Firefox Add-ons Store

To publish to the Firefox Add-ons store:
1. Create an account at [addons.mozilla.org](https://addons.mozilla.org)
2. Submit the ZIP file for review
3. Wait for approval and publication

## Troubleshooting

### Installation Issues

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

## Development

This addon is built using:
- Manifest V2 (Firefox compatibility)
- Content scripts for page interaction
- Storage API for configuration persistence
- Popup interface for user configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to modify and distribute as needed.
