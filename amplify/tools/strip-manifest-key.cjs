#!/usr/bin/env node
// scripts/strip-manifest-key.cjs
const fs = require('fs');
const path = require('path');

const argPath = process.argv[2];
const manifestPath = path.resolve(process.cwd(), argPath || './dist/manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`[strip-manifest-key] No manifest found at: ${manifestPath}`);
  process.exit(1);
}

try {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const json = JSON.parse(raw);

  if (Object.prototype.hasOwnProperty.call(json, 'key')) {
    delete json.key;
    fs.writeFileSync(manifestPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`[strip-manifest-key] Removed "key" from ${manifestPath}`);
  } else {
    console.log('[strip-manifest-key] No "key" field present — nothing to do.');
  }
} catch (e) {
  console.error('[strip-manifest-key] Failed:', e.message);
  process.exit(1);
}
