/**
 * URL 安全工具 —— 用于 API 路由中防范 SSRF。
 */

const BLOCKED_HOSTNAMES: ReadonlySet<string> = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

const BLOCKED_IPV4_PATTERNS: ReadonlyArray<RegExp> = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
];

const BLOCKED_IPV6_PREFIXES: ReadonlyArray<string> = [
  "::1",
  "fc00:",
  "fd",
  "fe80:",
];

function isBlockedHostname(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;

  if (BLOCKED_IPV4_PATTERNS.some((re) => re.test(hostname))) return true;

  const v6 = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_IPV6_PREFIXES.some((prefix) => v6.startsWith(prefix))) return true;

  return false;
}

/**
 * 校验 URL 是否安全（非内网/非本地地址）。
 */
export function isUrlSafe(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname;
    if (!hostname) return false;

    return !isBlockedHostname(hostname);
  } catch {
    return false;
  }
}
