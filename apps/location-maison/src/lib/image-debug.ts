type ImageDebugContext = {
  component: string;
  propertyId?: string | number;
  title?: string;
  rawFileUrl?: unknown;
  resolvedSrc: string;
};

type ParsedImageSource = {
  sourceType: "relative" | "absolute" | "gs" | "invalid";
  protocol?: string;
  hostname?: string;
  bucket?: string | null;
  objectPath?: string | null;
  hasToken?: boolean;
  tokenLength?: number;
  parseError?: string;
};

const isImageDebugEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_IMAGE_DEBUG === "true";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseImageSource(src: string): ParsedImageSource {
  if (src.startsWith("gs://")) {
    const stripped = src.replace("gs://", "");
    const [bucket, ...rest] = stripped.split("/");
    return {
      sourceType: "gs",
      protocol: "gs:",
      bucket: bucket || null,
      objectPath: rest.join("/") || null,
      hasToken: false,
      tokenLength: 0,
    };
  }

  if (src.startsWith("/")) {
    return {
      sourceType: "relative",
    };
  }

  try {
    const parsed = new URL(src);
    const hostname = parsed.hostname;
    const isFirebaseStorageHost = hostname === "firebasestorage.googleapis.com";
    const isGoogleStorageHost = hostname === "storage.googleapis.com";

    let bucket: string | null = null;
    let objectPath: string | null = null;

    if (isFirebaseStorageHost) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const bucketIndex = parts.indexOf("b");
      const objectIndex = parts.indexOf("o");

      bucket =
        bucketIndex >= 0 && parts[bucketIndex + 1]
          ? safeDecodeURIComponent(parts[bucketIndex + 1])
          : null;

      objectPath =
        objectIndex >= 0 && parts[objectIndex + 1]
          ? safeDecodeURIComponent(parts.slice(objectIndex + 1).join("/"))
          : null;
    } else if (isGoogleStorageHost) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      bucket = parts[0] ? safeDecodeURIComponent(parts[0]) : null;
      objectPath =
        parts.length > 1 ? safeDecodeURIComponent(parts.slice(1).join("/")) : null;
    }

    const token = parsed.searchParams.get("token");

    return {
      sourceType: "absolute",
      protocol: parsed.protocol,
      hostname,
      bucket,
      objectPath,
      hasToken: Boolean(token),
      tokenLength: token?.length ?? 0,
    };
  } catch (error) {
    return {
      sourceType: "invalid",
      parseError: error instanceof Error ? error.message : "Unknown URL parse error",
    };
  }
}

function buildPayload(context: ImageDebugContext) {
  return {
    component: context.component,
    propertyId: context.propertyId ?? null,
    title: context.title ?? null,
    rawFileUrl: context.rawFileUrl ?? null,
    resolvedSrc: context.resolvedSrc,
    ...parseImageSource(context.resolvedSrc),
  };
}

export function logImageFallback(context: ImageDebugContext) {
  if (!isImageDebugEnabled || typeof window === "undefined") {
    return;
  }
  console.warn("[ImageDebug] fallback image utilisée", buildPayload(context));
}

export function logImageLoad(context: ImageDebugContext) {
  if (!isImageDebugEnabled || typeof window === "undefined") {
    return;
  }
  console.info("[ImageDebug] image chargée", buildPayload(context));
}

export function logImageError(context: ImageDebugContext) {
  if (!isImageDebugEnabled || typeof window === "undefined") {
    return;
  }
  console.error("[ImageDebug] échec de chargement image", buildPayload(context));
}
