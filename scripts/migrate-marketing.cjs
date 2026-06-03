/* One-shot migration helper: transforms legacy Vite SPA marketing pages into
   Next client components under components/marketing/. Mechanical edits only. */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../apps/web/src/spa-pages');
const DST = path.join(__dirname, '../apps/web/components/marketing');

// [sourceFile, exportName, newComponentName]
const FILES = [
  ['ComparePipeboard.tsx', 'ComparePipeboard', 'ComparePipeboardContent'],
  ['CompareMadgicx.tsx', 'CompareMadgicx', 'CompareMadgicxContent'],
  ['CompareBirch.tsx', 'CompareBirch', 'CompareRevealbotContent'],
  ['CompareSmartly.tsx', 'CompareSmartly', 'CompareSmartlyContent'],
  ['CompareAdKit.tsx', 'CompareAdKit', 'CompareAdKitContent'],
  ['Blog.tsx', 'Blog', 'BlogContent'],
  ['ToolsROASCalculator.tsx', 'ToolsROASCalculator', 'RoasCalculatorContent'],
];

function transform(src, exportName, newName) {
  let s = src;

  // Drop @ts-nocheck.
  s = s.replace(/^\/\/ @ts-nocheck\r?\n/, '');

  // Remove the SEO import line.
  s = s.replace(/import\s+SEO\s+from\s+['"][^'"]*SEO['"];?\r?\n/, '');

  // Remove the <SEO ... /> JSX block (multiline, self-closing).
  s = s.replace(/\s*<SEO[\s\S]*?\/>\r?\n/, '\n');

  // Router -> next.
  s = s.replace(/import\s+\{\s*Link\s*\}\s+from\s+['"]react-router-dom['"];?/g, "import Link from 'next/link';");

  // CTA links: /signup -> /auth/signup, /dashboard stays public-safe -> /auth/signup.
  s = s.replace(/(href|to)=("|\{`?)\/signup/g, '$1=$2/auth/signup');

  // Link "to=" prop -> "href=".
  s = s.replace(/\bto=(["{])/g, 'href=$1');

  // Rename the default export to a named export with the new component name.
  s = s.replace(
    new RegExp(`export default function ${exportName}\\(`),
    `export function ${newName}(`,
  );

  // If the wrapper had a redundant <> </> only around removed SEO, leave as-is
  // (React fragments with a single child are valid).

  // Prepend the client directive.
  s = `'use client';\n\n${s}`;

  return s;
}

for (const [file, exportName, newName] of FILES) {
  const src = fs.readFileSync(path.join(SRC, file), 'utf8');
  const out = transform(src, exportName, newName);
  const dest = path.join(DST, `${newName}.tsx`);
  fs.writeFileSync(dest, out);
  console.log(`wrote ${path.relative(path.join(__dirname, '..'), dest)}`);
}
console.log('done');
