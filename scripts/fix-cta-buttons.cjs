const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../apps/web/components/marketing');
const FILES = [
  'ComparePipeboardContent.tsx',
  'CompareMadgicxContent.tsx',
  'CompareRevealbotContent.tsx',
  'CompareSmartlyContent.tsx',
  'CompareAdKitContent.tsx',
];

const CLIENT = "'use client';";

for (const f of FILES) {
  const p = path.join(DIR, f);
  let s = fs.readFileSync(p, 'utf8');

  if (!/from 'next\/link'/.test(s)) {
    s = s.replace(CLIENT + '\n', CLIENT + "\nimport Link from 'next/link';\n");
  }

  // Convert CTA <button> blocks that have NO onClick into <Link href=...>.
  s = s.replace(
    /<button(\s+(?:(?!onClick)(?!>)[\s\S])*?)>\s*((?:Start Free Audit|Start Free Trial|Start Free|Get Started Free|Talk to Founder))([\s\S]*?)<\/button>/g,
    (_m, attrs, label, rest) => {
      const href = /Talk to Founder/.test(label) ? '/contact' : '/auth/signup';
      return `<Link href="${href}"${attrs}>${label}${rest}</Link>`;
    },
  );

  fs.writeFileSync(p, s);
  console.log('processed', f);
}
