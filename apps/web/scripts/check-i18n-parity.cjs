#!/usr/bin/env node
/**
 * i18n parity guard.
 *
 * Fails (exit 1) when any non-default locale drifts further behind the default
 * locale (`en.json`) than the agreed baseline. This prevents new English keys
 * from silently shipping untranslated while we backfill the existing gap.
 *
 * Usage:
 *   node scripts/check-i18n-parity.cjs            # enforce baseline
 *   node scripts/check-i18n-parity.cjs --report   # print full missing-key list
 *   node scripts/check-i18n-parity.cjs --update    # rewrite the baseline snapshot
 *
 * The baseline lives in messages/.parity-baseline.json. Lower the numbers as
 * translations land; CI fails if any locale regresses above its baseline.
 */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const DEFAULT_LOCALE = 'en';
const BASELINE_PATH = path.join(MESSAGES_DIR, '.parity-baseline.json');

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(flattenKeys(value, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

function loadLocale(locale) {
  const file = path.join(MESSAGES_DIR, `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function localeFiles() {
  return fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
    .map((f) => f.replace(/\.json$/, ''))
    .filter((l) => l !== DEFAULT_LOCALE)
    .sort();
}

function main() {
  const report = process.argv.includes('--report');
  const update = process.argv.includes('--update');

  const defaultKeys = new Set(flattenKeys(loadLocale(DEFAULT_LOCALE)));
  const locales = localeFiles();

  const missingByLocale = {};
  for (const locale of locales) {
    const localeKeys = new Set(flattenKeys(loadLocale(locale)));
    missingByLocale[locale] = [...defaultKeys].filter((k) => !localeKeys.has(k));
  }

  const counts = Object.fromEntries(
    locales.map((l) => [l, missingByLocale[l].length]),
  );

  if (update) {
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`);
    console.log('Updated i18n parity baseline:', counts);
    return;
  }

  if (report) {
    for (const locale of locales) {
      console.log(`\n# ${locale} — ${missingByLocale[locale].length} missing`);
      for (const key of missingByLocale[locale]) console.log(`  ${key}`);
    }
  }

  let baseline = {};
  if (fs.existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  }

  const regressions = [];
  for (const locale of locales) {
    const allowed = baseline[locale] ?? 0;
    if (counts[locale] > allowed) {
      regressions.push(
        `${locale}: ${counts[locale]} missing keys (baseline ${allowed}) — ` +
          `new untranslated keys: ${missingByLocale[locale]
            .slice(0, 10)
            .join(', ')}`,
      );
    }
  }

  console.log('i18n parity vs', `${DEFAULT_LOCALE}.json`, '→', counts);

  if (regressions.length > 0) {
    console.error('\n✖ i18n parity regression detected:');
    for (const r of regressions) console.error('  - ' + r);
    console.error(
      '\nTranslate the new keys, or (if intentional) run ' +
        '`node scripts/check-i18n-parity.cjs --update` to move the baseline.',
    );
    process.exit(1);
  }

  console.log('✓ No i18n parity regressions.');
}

main();
