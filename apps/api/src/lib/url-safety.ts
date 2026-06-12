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

/** Returns true if the IPv4 string is in a private/reserved/loopback range. */
function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a > 255 || b > 255 || Number(m[3]) > 255 || Number(m[4]) > 255) return true;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  return false;
}

/** Returns true if the IPv6 string is loopback/link-local/unique-local. */
function isPrivateIPv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === '::1' || h === '::') return true; // loopback / unspecified
  if (h.startsWith('fe80')) return true; // link-local
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique-local fc00::/7
  // IPv4-mapped (::ffff:10.0.0.1)
  const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
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
  if (isPrivateIPv4(host)) return false;
  if (host.includes(':') || host.startsWith('[')) return isPrivateIPv6(host) ? false : true;

  return true;
}
