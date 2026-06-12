/**
 * SSRF guards for user-supplied URLs (e.g. outbound webhook targets).
 *
 * A workspace admin can register a webhook URL that the server will later POST
 * to. Without validation that URL could point at internal infrastructure
 * (localhost, RFC1918 ranges, link-local, or the cloud metadata endpoint
 * 169.254.169.254), turning the webhook dispatcher into an SSRF primitive.
 *
 * NOTE: this is a syntactic guard on the literal host. It does NOT defend
 * against DNS rebinding (a public hostname that resolves to a private IP) —
 * that requires resolve-time checking in the delivery path. It does block the
 * overwhelmingly common cases and is cheap to apply at validation time.
 */

/**
 * Parse an IPv4 host in any of the encodings the C `inet_aton`/many HTTP
 * clients accept — dotted-quad, shorthand (`127.1`), single decimal
 * (`2130706433`), hex (`0x7f000001`), and octal (`0177.0.0.1`) — into a 32-bit
 * unsigned integer. Returns null if the host is not a parseable IPv4 literal.
 */
function ipv4ToLong(host: string): number | null {
  const parts = host.split('.');
  if (parts.length === 0 || parts.length > 4) return null;

  const nums: number[] = [];
  for (const p of parts) {
    if (p === '') return null;
    let n: number;
    if (/^0x[0-9a-f]+$/i.test(p)) n = parseInt(p, 16);
    else if (/^0[0-7]+$/.test(p)) n = parseInt(p, 8);
    else if (/^[0-9]+$/.test(p)) n = parseInt(p, 10);
    else return null;
    if (!Number.isInteger(n) || n < 0) return null;
    nums.push(n);
  }

  // inet_aton: the final part fills all remaining low-order bytes.
  let value: number;
  switch (nums.length) {
    case 1:
      value = nums[0];
      break;
    case 2:
      if (nums[0] > 0xff || nums[1] > 0xffffff) return null;
      value = nums[0] * 0x1000000 + nums[1];
      break;
    case 3:
      if (nums[0] > 0xff || nums[1] > 0xff || nums[2] > 0xffff) return null;
      value = nums[0] * 0x1000000 + nums[1] * 0x10000 + nums[2];
      break;
    default: // 4
      if (nums.some((n) => n > 0xff)) return null;
      value = nums[0] * 0x1000000 + nums[1] * 0x10000 + nums[2] * 0x100 + nums[3];
  }

  if (value < 0 || value > 0xffffffff) return null;
  return value >>> 0;
}

/** True if a 32-bit IPv4 value falls in a private/reserved/loopback range. */
function isPrivateIPv4Long(v: number): boolean {
  const inRange = (a: number, b: number) => v >= a && v <= b;
  return (
    inRange(0x00000000, 0x00ffffff) || // 0.0.0.0/8
    inRange(0x0a000000, 0x0affffff) || // 10.0.0.0/8
    inRange(0x64400000, 0x647fffff) || // 100.64.0.0/10 (CGNAT)
    inRange(0x7f000000, 0x7fffffff) || // 127.0.0.0/8 (loopback)
    inRange(0xa9fe0000, 0xa9feffff) || // 169.254.0.0/16 (link-local incl. metadata)
    inRange(0xac100000, 0xac1fffff) || // 172.16.0.0/12
    inRange(0xc0a80000, 0xc0a8ffff)    // 192.168.0.0/16
  );
}

/** Returns true if the IPv6 string is loopback/link-local/unique-local. */
function isPrivateIPv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === '::1' || h === '::') return true; // loopback / unspecified
  if (h.startsWith('fe80')) return true; // link-local
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique-local fc00::/7
  // IPv4-mapped (::ffff:10.0.0.1)
  const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) {
    const l = ipv4ToLong(mapped[1]);
    return l !== null && isPrivateIPv4Long(l);
  }
  return false;
}

/**
 * Validate that a URL is safe to use as an outbound webhook target:
 * http/https scheme and a host that is not loopback/private/link-local.
 */
export function isSafePublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host.endsWith('.local') || host.endsWith('.internal')) return false;

  // IPv6 literal (URL.hostname keeps the brackets for IPv6).
  if (host.includes(':') || host.startsWith('[')) {
    return !isPrivateIPv6(host);
  }

  // IPv4 in any encoding (dotted-quad, shorthand, decimal, hex, octal).
  const asLong = ipv4ToLong(host);
  if (asLong !== null) {
    return !isPrivateIPv4Long(asLong);
  }
  // A purely numeric/hex host that does not parse to a valid IPv4 is suspicious
  // (ambiguous to resolvers) — fail closed rather than allow it through.
  if (/^[0-9a-fx]+$/i.test(host)) return false;

  return true;
}
