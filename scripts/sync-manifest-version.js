#!/usr/bin/env node

const fs = require("fs");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n");
}

function syncManifestVersion() {
  const pkg = readJson("package.json");
  const manifestPath = "manifest.json";
  const manifest = readJson(manifestPath);

  if (!pkg.version || typeof pkg.version !== "string") {
    throw new Error("package.json is missing a string 'version' field");
  }

  if (manifest.version !== pkg.version) {
    manifest.version = pkg.version;
    writeJson(manifestPath, manifest);
    console.log(`Synced manifest.json version -> ${pkg.version}`);
  } else {
    console.log(`manifest.json already matches package.json version (${pkg.version})`);
  }
}

if (require.main === module) {
  syncManifestVersion();
}

module.exports = { syncManifestVersion };


