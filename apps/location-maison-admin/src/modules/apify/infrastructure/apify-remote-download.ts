import https from "node:https";
import { isIP } from "node:net";

/**
 * Shared fbcdn downloader used by both the listing image import
 * (`api/admin/v1/apify/import`) and the reel video import
 * (`api/admin/v1/apify/import-reel`). Extracted as-is from the original
 * image-only implementation — only the size/timeout limits are now caller
 * parameters instead of fixed constants, since a reel video needs a much
 * higher cap than a listing photo.
 */

export type DownloadResult = { status: number; contentType: string; buffer: Buffer };
export type DownloadOptions = { maxBytes: number; timeoutMs: number };

const MAX_REDIRECTS = 3;
const IMAGE_PROXY_BASE_URL = "https://wsrv.nl/";
// Browser-like headers — fbcdn returns 403 to unidentified server clients.
const FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,video/*,*/*;q=0.8",
};

export function errorDetail(cause: unknown): string {
  const error =
    cause as
      | {
          cause?: { code?: unknown; message?: unknown };
          code?: unknown;
          message?: unknown;
          name?: unknown;
        }
      | null
      | undefined;
  const detail = error?.cause?.code ?? error?.cause?.message ?? error?.code ?? error?.message ?? error?.name;
  return typeof detail === "string" && detail.trim() ? detail : "échec";
}

export function normalizeRemoteUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim().replaceAll("&amp;", "&"));
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isPublicIpv4(ip: string): boolean {
  if (isIP(ip) !== 4) return false;

  const [first, second] = ip.split(".").map(Number);
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 168) return false;

  return true;
}

export function isFacebookCdnHostname(hostname: string): boolean {
  return hostname === "fbcdn.net" || hostname.endsWith(".fbcdn.net");
}

function proxiedUrl(url: string): string {
  const proxy = new URL(IMAGE_PROXY_BASE_URL);
  const target = new URL(url);
  proxy.searchParams.set("url", isFacebookCdnHostname(target.hostname) ? url.replace(/^https?:\/\//, "") : url);
  return proxy.toString();
}

async function fetchRemote(url: string, opts: DownloadOptions): Promise<DownloadResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
  const response = await fetch(url, { signal: controller.signal, headers: FETCH_HEADERS }).finally(() =>
    clearTimeout(timeout),
  );
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

/** Resolve a hostname to an IPv4 via Cloudflare DoH (reachable by IP, no DNS). */
async function resolveIpv4ViaDoH(hostname: string): Promise<string | null> {
  try {
    const response = await fetch(`https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
      headers: { accept: "application/dns-json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { Answer?: Array<{ type: number; data: string }> };
    const record = data.Answer?.find((entry) => entry.type === 1 && isPublicIpv4(entry.data));
    return record?.data ?? null;
  } catch {
    return null;
  }
}

/** Fetch over HTTPS connecting to a fixed IP (keeps SNI/Host = hostname). */
function httpsGetViaIp(
  url: string,
  ip: string,
  opts: DownloadOptions,
  redirectCount = 0,
): Promise<DownloadResult> {
  return new Promise((resolve, reject) => {
    if (!isPublicIpv4(ip)) {
      reject(new Error(`DNS IPv4 invalide: ${ip}`));
      return;
    }

    const target = new URL(url);
    const request = https.get(
      {
        hostname: ip,
        port: target.port ? Number(target.port) : 443,
        path: `${target.pathname}${target.search}`,
        headers: { ...FETCH_HEADERS, host: target.hostname },
        servername: target.hostname,
        timeout: opts.timeoutMs,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;

        if ([301, 302, 303, 307, 308].includes(status) && location) {
          response.resume();
          if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error("trop de redirections"));
            return;
          }
          const nextUrl = new URL(String(location), target).toString();
          downloadRemoteFile(nextUrl, opts, redirectCount + 1).then(resolve).catch(reject);
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;

        response.on("data", (chunk) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer);
          totalBytes += buffer.length;
          if (totalBytes > opts.maxBytes) {
            request.destroy(new Error(`size ${totalBytes}`));
            return;
          }
          chunks.push(buffer);
        });
        response.on("end", () =>
          resolve({
            status,
            contentType: String(response.headers["content-type"] ?? ""),
            buffer: Buffer.concat(chunks),
          }),
        );
      },
    );
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", reject);
  });
}

/**
 * Download a remote (fbcdn) file, falling back to DoH + direct-IP when local
 * DNS fails, then to the `wsrv.nl` proxy. Caller is responsible for checking
 * `buffer.length` against its own size cap for the successful non-streamed
 * path (only the direct-IP path enforces `opts.maxBytes` while streaming).
 */
export async function downloadRemoteFile(
  url: string,
  opts: DownloadOptions,
  redirectCount = 0,
): Promise<DownloadResult> {
  const normalized = normalizeRemoteUrl(url);
  if (!normalized) throw new Error("URL invalide");

  const target = new URL(normalized);

  try {
    const result = await fetchRemote(normalized, opts);
    if (result.status >= 200 && result.status < 300) return result;
  } catch {
    // Continue with the fallbacks below.
  }

  if (isFacebookCdnHostname(target.hostname)) {
    return fetchRemote(proxiedUrl(normalized), opts);
  }

  if (target.protocol === "https:") {
    try {
      const ip = await resolveIpv4ViaDoH(target.hostname);
      if (ip) {
        const result = await httpsGetViaIp(normalized, ip, opts, redirectCount);
        if (result.status >= 200 && result.status < 300) return result;
      }
    } catch {
      // Continue with the proxy fallback.
    }
  }

  return fetchRemote(proxiedUrl(normalized), opts);
}
