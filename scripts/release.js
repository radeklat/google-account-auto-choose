#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ADDON_ID = '{3df6cb6d-7a64-478b-a424-6deb2eb09b3f}';
const GITHUB_USER = 'radeklat';
const REPO_NAME = 'google-account-auto-choose';
const BASE_URL = `https://${GITHUB_USER}.github.io/${REPO_NAME}`;

function getVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function calculateSHA256(filePath) {
  try {
    const hash = execSync(`sha256sum "${filePath}" | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
    return `sha256:${hash}`;
  } catch (error) {
    console.error('Error calculating SHA256:', error.message);
    return 'sha256:PLACEHOLDER_HASH';
  }
}

function createXPI(version) {
  const xpiName = `google-account-auto-chooser-${version}.xpi`;
  const xpiPath = path.join('releases', xpiName);
  
  // Ensure releases directory exists
  if (!fs.existsSync('releases')) {
    fs.mkdirSync('releases');
  }
  
  // Build the addon
  console.log('Building addon...');
  execSync('make build', { stdio: 'inherit' });
  
  // Check if API credentials are available for signing
  const amoJwtIssuer = (process.env.AMO_JWT_ISSUER || '').trim();
  const amoJwtSecret = (process.env.AMO_JWT_SECRET || '').trim();

  if (amoJwtIssuer && amoJwtSecret) {
    try {
      console.log('API credentials found, attempting to sign the addon...');
      
      // Track artifacts so we can locate the signed XPI reliably after signing.
      const artifactsBefore = new Set(fs.readdirSync('releases'));

      // Sign the addon using web-ext (self-hosted distribution should use the "unlisted" channel).
      // NOTE: Newer web-ext versions do not support --self-hosted for `sign`; use --channel instead.
      const signCommand =
        `npx --no-install web-ext sign --no-input --source-dir dist --artifacts-dir releases ` +
        `--api-key "${amoJwtIssuer}" --api-secret "${amoJwtSecret}" --channel unlisted`;
      execSync(signCommand, { stdio: 'inherit' });
      
      // Copy the signed XPI to the expected location/name used by updates.json.
      const artifactsAfter = fs.readdirSync('releases');
      const newXpis = artifactsAfter
        .filter((f) => f.endsWith('.xpi') && !artifactsBefore.has(f))
        .map((f) => path.join('releases', f));

      // Prefer a newly created XPI; otherwise fall back to "most recently modified .xpi".
      const candidateXpis = (newXpis.length > 0)
        ? newXpis
        : artifactsAfter
          .filter((f) => f.endsWith('.xpi'))
          .map((f) => path.join('releases', f));

      if (candidateXpis.length > 0) {
        const latestSigned = candidateXpis
          .map((p) => ({ p, mtimeMs: fs.statSync(p).mtimeMs }))
          .sort((a, b) => b.mtimeMs - a.mtimeMs)[0].p;

        fs.copyFileSync(latestSigned, xpiPath);
        console.log(`Signed XPI copied to: ${xpiName}`);
        return xpiPath;
      }

      console.log('Signing did not produce an XPI artifact, creating unsigned XPI');
      // Fall through to create unsigned XPI
    } catch (error) {
      console.log('Signing failed:', error.message);
      console.log('Creating unsigned XPI');
      // Fall through to create unsigned XPI
    }
  } else {
    console.log('No API credentials found (AMO_JWT_ISSUER and AMO_JWT_SECRET)');
    console.log('Creating unsigned XPI file');
    console.log('Note: You need to manually sign this addon with Mozilla');
  }
  
  // Create unsigned XPI file (fallback or when no credentials)
  console.log(`Creating XPI file: ${xpiName}`);
  execSync(`cd dist && zip -r "../${xpiPath}" .`, { stdio: 'inherit' });
  
  return xpiPath;
}

function updateUpdatesManifest(version, xpiPath) {
  const updatesPath = 'updates.json';
  let updates;
  
  if (fs.existsSync(updatesPath)) {
    updates = JSON.parse(fs.readFileSync(updatesPath, 'utf8'));
  } else {
    updates = {
      addons: {}
    };
  }
  
  if (!updates.addons[ADDON_ID]) {
    updates.addons[ADDON_ID] = { updates: [] };
  }
  
  // Calculate hash for the XPI file
  const hash = calculateSHA256(xpiPath);
  const updateUrl = `${BASE_URL}/releases/${path.basename(xpiPath)}`;
  
  // Add new update entry
  const newUpdate = {
    version: version,
    update_link: updateUrl,
    update_hash: hash
  };
  
  // Remove any existing entry for this version
  updates.addons[ADDON_ID].updates = updates.addons[ADDON_ID].updates.filter(
    update => update.version !== version
  );
  
  // Add the new update entry
  updates.addons[ADDON_ID].updates.push(newUpdate);
  
  // Sort updates by version (newest first)
  updates.addons[ADDON_ID].updates.sort((a, b) => {
    return b.version.localeCompare(a.version, undefined, { numeric: true });
  });
  
  // Write updated manifest
  fs.writeFileSync(updatesPath, JSON.stringify(updates, null, 2));
  console.log(`Updated ${updatesPath}`);
  
  return newUpdate;
}

function main() {
  const version = getVersion();
  console.log(`Creating release for version ${version}`);
  
  // Create XPI file
  const xpiPath = createXPI(version);
  
  // Update updates manifest
  const updateInfo = updateUpdatesManifest(version, xpiPath);
  
  console.log('\nRelease created successfully!');
  console.log(`Version: ${version}`);
  console.log(`XPI file: ${xpiPath}`);
  console.log(`Update URL: ${updateInfo.update_link}`);
  console.log(`SHA256: ${updateInfo.update_hash}`);
  console.log('\nNext steps:');
  console.log('1. Commit and push the changes');
  console.log('2. Upload the XPI file to GitHub releases');
  console.log('3. Enable GitHub Pages to serve the updates.json file');
}

if (require.main === module) {
  main();
}

module.exports = { createXPI, updateUpdatesManifest, calculateSHA256 };

