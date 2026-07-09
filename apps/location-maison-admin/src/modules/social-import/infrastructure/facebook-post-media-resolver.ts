const DEFAULT_TIMEOUT_MS = Number(process.env.SOCIAL_IMPORT_MEDIA_RESOLVE_TIMEOUT_MS ?? 12000);
const DEFAULT_MAX_PHOTO_LINKS = Number(process.env.SOCIAL_IMPORT_MEDIA_RESOLVE_MAX_PHOTO_LINKS ?? 10);

type ResolveOriginalFacebookPostMediaInput = {
  postUrl: string;
  fallbackUrls: string[];
  timeoutMs?: number;
  maxPhotoLinks?: number;
};

export type ResolveOriginalFacebookPostMediaResult = {
  imageUrls: string[];
  usedFallback: boolean;
  details: {
    sourcePostUrl: string;
    fetchedPostUrl: string | null;
    discoveredPhotoLinkCount: number;
    checkedPhotoLinkCount: number;
    extractedDirectImageCount: number;
    extractedMetaImageCount: number;
    authWallDetected: boolean;
    errorCode: string | null;
  };
};

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeFacebookPostUrl(value: string) {
  const raw = toTrimmedString(value);
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol === "http:" ? "https:" : parsed.protocol;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "m.facebook.com" || hostname === "web.facebook.com") {
      parsed.hostname = "www.facebook.com";
    }
    parsed.protocol = protocol;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return raw;
  }
}

function decodeEscapedUrl(value: string) {
  let decoded = value;
  decoded = decoded.replace(/\\u0025/gi, "%");
  decoded = decoded.replace(/\\u0026/gi, "&");
  decoded = decoded.replace(/\\u002F/gi, "/");
  decoded = decoded.replace(/\\\//g, "/");
  decoded = decoded.replace(/&amp;/gi, "&");
  decoded = decoded.replace(/\\x3C/gi, "<");
  decoded = decoded.replace(/\\x3E/gi, ">");
  decoded = decoded.replace(/\\"/g, '"');

  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Ignore malformed URI sequences.
  }

  return decoded.trim();
}

function looksLikeAuthWall(html: string, finalUrl: string | null) {
  const lowerHtml = html.toLowerCase();
  const lowerUrl = (finalUrl ?? "").toLowerCase();

  if (
    lowerUrl.includes("/login") ||
    lowerUrl.includes("checkpoint") ||
    lowerUrl.includes("two_step_verification")
  ) {
    return true;
  }

  if (
    lowerHtml.includes("name=\"login\"") ||
    lowerHtml.includes("id=\"loginbutton\"") ||
    lowerHtml.includes("mot de passe") && lowerHtml.includes("facebook") ||
    lowerHtml.includes("you must log in")
  ) {
    return true;
  }

  return false;
}

function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  }).finally(() => clearTimeout(timer));
}

function normalizeScontentUrl(url: string) {
  const normalized = decodeEscapedUrl(url);
  if (!normalized) {
    return "";
  }

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    return "";
  }

  return normalized;
}

function extractDirectImageUrlsFromHtml(html: string) {
  const matches: string[] = [];

  const patterns = [
    /https?:\\\/\\\/[^"'\\s<>]*scontent[^"'\\s<>]*/gi,
    /https?:\/\/[^"]*scontent[^"'\s<>]*/gi,
  ];

  for (const pattern of patterns) {
    const found = html.match(pattern) ?? [];
    for (const match of found) {
      const normalized = normalizeScontentUrl(match);
      if (normalized) {
        matches.push(normalized);
      }
    }
  }

  return uniqueStrings(matches).filter(isLikelyUsefulImageUrl);
}

function toAbsoluteFacebookUrl(candidate: string) {
  const decoded = decodeEscapedUrl(candidate);
  if (!decoded) {
    return "";
  }

  if (decoded.startsWith("/")) {
    return `https://www.facebook.com${decoded}`;
  }

  if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
    return normalizeFacebookPostUrl(decoded);
  }

  return "";
}

function extractPhotoPageLinks(html: string) {
  const discovered: string[] = [];

  const patterns = [
    /https?:\\\/\\\/(?:www|web|m)\\\.facebook\\\.com\\\/(?:photo\\\/?\\\?[^"'\\s<>]+|photo\\\.php\\\?[^"'\\s<>]+)/gi,
    /https?:\/\/(?:www|web|m)\.facebook\.com\/(?:photo\/?\?[^"'\s<>]+|photo\.php\?[^"'\s<>]+)/gi,
    /(?:href=|src=)["']((?:\\\/|\/)(?:photo\/?\?[^"'\s<>]+|photo\.php\?[^"'\s<>]+))["']/gi,
  ];

  for (const pattern of patterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const candidate = match[1] ?? match[0] ?? "";
      const absolute = toAbsoluteFacebookUrl(candidate);
      if (absolute) {
        discovered.push(absolute);
      }
    }
  }

  return uniqueStrings(discovered);
}

function extractMetaImage(html: string) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const normalized = normalizeScontentUrl(match[1]);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
}

function computeImageQualityScore(url: string) {
  const lower = url.toLowerCase();
  let score = 0;

  if (lower.includes("scontent")) {
    score += 30;
  }

  if (lower.includes("/v/t39.30808") || lower.includes("/v/t1.")) {
    score += 15;
  }

  if (!/s\d{2,4}x\d{2,4}/i.test(lower) && !/p\d{2,4}x\d{2,4}/i.test(lower)) {
    score += 8;
  }

  if (!lower.includes("s40x40") && !lower.includes("s50x50") && !lower.includes("s80x80")) {
    score += 6;
  }

  if (lower.includes("stp=dst-") || lower.includes("stp=cp0_dst-")) {
    score += 5;
  }

  if (lower.includes("_nc_ht=") || lower.includes("oe=")) {
    score += 2;
  }

  return score;
}

function isLikelyUsefulImageUrl(url: string) {
  const lower = url.toLowerCase();

  if (!lower.includes("scontent")) {
    return false;
  }

  if (
    lower.includes("profile_picture") ||
    lower.includes("cover_photo") ||
    lower.includes("safe_image.php")
  ) {
    return false;
  }

  if (lower.includes("s40x40") || lower.includes("s50x50") || lower.includes("s80x80")) {
    return false;
  }

  return true;
}

export async function resolveOriginalFacebookPostMedia(
  input: ResolveOriginalFacebookPostMediaInput,
): Promise<ResolveOriginalFacebookPostMediaResult> {
  const normalizedPostUrl = normalizeFacebookPostUrl(input.postUrl);
  const fallbackUrls = uniqueStrings(input.fallbackUrls).filter(isLikelyUsefulImageUrl);

  const details: ResolveOriginalFacebookPostMediaResult["details"] = {
    sourcePostUrl: normalizedPostUrl,
    fetchedPostUrl: null,
    discoveredPhotoLinkCount: 0,
    checkedPhotoLinkCount: 0,
    extractedDirectImageCount: 0,
    extractedMetaImageCount: 0,
    authWallDetected: false,
    errorCode: null,
  };

  if (!normalizedPostUrl) {
    details.errorCode = "POST_URL_MISSING";
    return {
      imageUrls: fallbackUrls,
      usedFallback: true,
      details,
    };
  }

  const timeoutMs = Math.max(3000, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const maxPhotoLinks = Math.max(1, input.maxPhotoLinks ?? DEFAULT_MAX_PHOTO_LINKS);

  try {
    const postResponse = await fetchWithTimeout(normalizedPostUrl, timeoutMs);
    const postHtml = await postResponse.text();
    details.fetchedPostUrl = postResponse.url || normalizedPostUrl;
    details.authWallDetected = looksLikeAuthWall(postHtml, details.fetchedPostUrl);

    const directFromPost = extractDirectImageUrlsFromHtml(postHtml);
    details.extractedDirectImageCount = directFromPost.length;

    const photoLinks = extractPhotoPageLinks(postHtml);
    details.discoveredPhotoLinkCount = photoLinks.length;

    const metaImageUrls: string[] = [];
    const limitedPhotoLinks = photoLinks.slice(0, maxPhotoLinks);
    details.checkedPhotoLinkCount = limitedPhotoLinks.length;

    for (const photoLink of limitedPhotoLinks) {
      try {
        const photoResponse = await fetchWithTimeout(photoLink, timeoutMs);
        const photoHtml = await photoResponse.text();
        const metaImage = extractMetaImage(photoHtml);
        if (metaImage && isLikelyUsefulImageUrl(metaImage)) {
          metaImageUrls.push(metaImage);
        }
        const directFromPhoto = extractDirectImageUrlsFromHtml(photoHtml);
        if (directFromPhoto.length > 0) {
          directFromPost.push(...directFromPhoto);
        }
      } catch {
        // Continue with the other links.
      }
    }

    details.extractedMetaImageCount = metaImageUrls.length;

    const merged = uniqueStrings([
      ...metaImageUrls,
      ...directFromPost,
      ...fallbackUrls,
    ]).filter(isLikelyUsefulImageUrl);

    const ranked = merged
      .map((url) => ({
        url,
        score: computeImageQualityScore(url),
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.url);

    const finalUrls = uniqueStrings(ranked);

    if (finalUrls.length === 0) {
      details.errorCode = details.authWallDetected ? "AUTH_WALL" : "NO_IMAGE_DISCOVERED";
      return {
        imageUrls: fallbackUrls,
        usedFallback: true,
        details,
      };
    }

    return {
      imageUrls: finalUrls,
      usedFallback: false,
      details,
    };
  } catch (error) {
    details.errorCode =
      error instanceof Error && error.name === "AbortError"
        ? "FETCH_TIMEOUT"
        : error instanceof Error
          ? error.message
          : "POST_FETCH_FAILED";

    return {
      imageUrls: fallbackUrls,
      usedFallback: true,
      details,
    };
  }
}
