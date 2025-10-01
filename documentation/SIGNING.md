# Addon Signing Guide

This guide explains how to get your Firefox addon signed by Mozilla for self-hosting.

## Why Signing is Required

Firefox requires all addons to be signed by Mozilla before they can be installed by users. This applies to:
- Self-hosted addons
- Addons distributed outside of AMO (addons.mozilla.org)
- Addons with automatic updates

## Getting API Credentials

### Step 1: Create AMO Account

1. Go to [addons.mozilla.org](https://addons.mozilla.org)
2. Create an account or sign in
3. Go to [Developer Hub](https://addons.mozilla.org/developers/)

### Step 2: Generate API Credentials

1. In the Developer Hub, go to "API Credentials"
2. Click "Generate new credentials"
3. Choose "JWT issuer" and "JWT secret"
4. Save these credentials securely

### Step 3: Configure Environment Variables

Set up your API credentials as environment variables:

```bash
export AMO_JWT_ISSUER="your-jwt-issuer-here"
export AMO_JWT_SECRET="your-jwt-secret-here"
```

For GitHub Actions, add these as repository secrets:
- Go to your repository Settings → Secrets and variables → Actions
- Add `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` secrets

## Signing Methods

### Method 1: Automated Signing (Recommended)

The release script automatically attempts to sign the addon:

```bash
npm run release
```

This will:
1. Build the addon
2. Create an unsigned XPI
3. Attempt to sign it using web-ext
4. Update the updates.json manifest

### Method 2: Manual Signing

If automated signing fails, you can sign manually:

```bash
# Build the addon first
npm run build

# Sign using web-ext
npm run sign:amo
```

### Method 3: Using web-ext CLI

Install web-ext globally and sign manually:

```bash
npm install -g web-ext
web-ext sign --source-dir dist --artifacts-dir releases --api-key $AMO_JWT_ISSUER --api-secret $AMO_JWT_SECRET
```

## Troubleshooting

### Common Issues

1. **"web-ext not found"**
   - Install web-ext: `npm install -g web-ext`
   - Or use the local version: `npx web-ext sign ...`

2. **"Invalid API credentials"**
   - Verify your JWT issuer and secret are correct
   - Check that your AMO account is active
   - Ensure credentials haven't expired

3. **"Addon validation failed"**
   - Check the addon manifest for errors
   - Ensure all required fields are present
   - Verify permissions are correctly specified

4. **"Signing timeout"**
   - Mozilla's signing service may be busy
   - Try again after a few minutes
   - Check Mozilla's status page for service issues

### Debug Mode

Enable verbose logging to see what's happening:

```bash
web-ext sign --source-dir dist --artifacts-dir releases --api-key $AMO_JWT_ISSUER --api-secret $AMO_JWT_SECRET --verbose
```

## Manual Submission (Alternative)

If automated signing continues to fail, you can manually submit to AMO:

1. Go to [AMO Developer Hub](https://addons.mozilla.org/developers/)
2. Click "Submit a New Add-on"
3. Upload your XPI file
4. Choose "On this site" for distribution
5. Complete the submission process
6. Download the signed XPI from the submission page

## Testing Signed Addons

After signing, test the addon:

1. Install the signed XPI in Firefox
2. Verify it works correctly
3. Test automatic updates (if configured)
4. Check that no security warnings appear

## Security Notes

- Keep your API credentials secure
- Never commit credentials to version control
- Use environment variables or secure secret management
- Rotate credentials periodically
- Monitor for unauthorized usage

## Resources

- [Mozilla Add-on Signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- [web-ext Documentation](https://github.com/mozilla/web-ext)
- [AMO Developer Hub](https://addons.mozilla.org/developers/)
- [Firefox Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
