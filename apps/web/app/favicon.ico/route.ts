export const runtime = 'edge';

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#050505"/>
    </radialGradient>
  </defs>
  <rect width="192" height="192" rx="42" fill="url(#bg)"/>
  <g transform="translate(96, 96)">
    <polygon points="0,-52 45,-26 45,26 0,52 -45,26 -45,-26" fill="none" stroke="#c3f53b" stroke-width="4" opacity="0.15"/>
    <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19" fill="#c3f53b" opacity="0.08"/>
    <polygon points="0,-26 22,-13 22,13 0,26 -22,13 -22,-13" fill="#c3f53b" opacity="0.9"/>
    <circle cx="0" cy="0" r="8" fill="#050505"/>
  </g>
  <text x="96" y="162" text-anchor="middle" font-family="'Space Grotesk', 'Inter', sans-serif" font-weight="700" font-size="13" fill="#c3f53b" letter-spacing="1.5">ADNEXUS</text>
</svg>
`;

export function GET() {
  return new Response(favicon, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
