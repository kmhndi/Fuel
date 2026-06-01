#!/usr/bin/env node
/**
 * Increments the build numbers in app.json so each App Store / Play upload
 * uses a fresh value (Apple and Google both reject reused build numbers).
 *
 *   node scripts/bump-build.mjs          # bump both iOS buildNumber + Android versionCode
 *   node scripts/bump-build.mjs ios      # bump iOS only
 *   node scripts/bump-build.mjs android  # bump Android only
 *
 * The marketing version (expo.version, e.g. "1.0.0") is left untouched — bump
 * that by hand when you ship a new release.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appJsonPath = join(root, 'app.json');
const config = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const expo = config.expo;

const target = process.argv[2]; // undefined | 'ios' | 'android'
const doIos = !target || target === 'ios';
const doAndroid = !target || target === 'android';

if (doIos) {
  expo.ios = expo.ios ?? {};
  const current = parseInt(expo.ios.buildNumber ?? '0', 10) || 0;
  expo.ios.buildNumber = String(current + 1);
  console.log(`iOS buildNumber: ${current} -> ${expo.ios.buildNumber}`);
}

if (doAndroid) {
  expo.android = expo.android ?? {};
  const current = Number(expo.android.versionCode ?? 0) || 0;
  expo.android.versionCode = current + 1;
  console.log(`Android versionCode: ${current} -> ${expo.android.versionCode}`);
}

writeFileSync(appJsonPath, JSON.stringify(config, null, 2) + '\n');
console.log('Updated app.json. Run `npx expo prebuild --clean` before archiving.');
