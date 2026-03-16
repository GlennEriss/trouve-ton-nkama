const { AppError } = require('../../shared/errors/app-error');

function toTextPreview(value, maxLength = 260) {
  const text =
    typeof value === 'string'
      ? value
      : value == null
        ? ''
        : (() => {
            try {
              return JSON.stringify(value);
            } catch (_error) {
              return String(value);
            }
          })();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function toNonNegativeInt(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.round(numeric);
}

function normalizeAiRecord(record, aiRecord) {
  const safe = aiRecord && typeof aiRecord === 'object' ? aiRecord : {};
  const location = safe.location && typeof safe.location === 'object' ? safe.location : {};
  const normalizedTags = Array.isArray(safe.tags)
    ? [...new Set(safe.tags.map((tag) => String(tag || '').trim()).filter(Boolean))]
    : [];

  return {
    ...record,
    ...safe,
    title: String(safe.title || '').trim(),
    description: String(safe.description || '').trim(),
    typeProperty: String(safe.typeProperty || '').trim(),
    status: String(safe.status || '').trim(),
    price: toNonNegativeInt(safe.price),
    area: toNonNegativeInt(safe.area),
    contact: String(safe.contact || '').trim(),
    tags: normalizedTags,
    location: {
      district: String(location.district || '').trim(),
      city: String(location.city || '').trim(),
      province: String(location.province || '').trim(),
      lon: Number(location.lon ?? location.longitude ?? 0) || 0,
      lat: Number(location.lat ?? location.latitude ?? 0) || 0,
    },
    nbrRooms: toNonNegativeInt(safe.nbrRooms),
    nbrKitchens: toNonNegativeInt(safe.nbrKitchens ?? safe.nbrChickens),
    nbrBathrooms: toNonNegativeInt(safe.nbrBathrooms),
    nbrToilets: toNonNegativeInt(safe.nbrToilets),
    nbrLivingRoom: toNonNegativeInt(safe.nbrLivingRoom),
  };
}

function buildAiErrorReason(error) {
  const message = error?.details?.message || error?.message || 'Unknown AI error';
  const code =
    error?.details?.code ||
    error?.code ||
    error?.details?.lastErrorDetails?.code ||
    '';
  const variantErrors =
    error?.details?.lastErrorDetails?.variantErrors ||
    error?.details?.variantErrors ||
    [];
  const firstVariant = Array.isArray(variantErrors) ? variantErrors[0] : null;
  const firstVariantLabel = firstVariant
    ? `${firstVariant.variant || 'unknown'}:${firstVariant.code || firstVariant.status || 'error'}`
    : '';
  const bodyPreview =
    firstVariant?.details?.body ||
    error?.details?.lastErrorDetails?.body ||
    error?.details?.body ||
    '';

  const parts = [message];
  if (code) parts.push(`code=${code}`);
  if (firstVariantLabel) parts.push(`variant=${firstVariantLabel}`);
  if (bodyPreview) parts.push(`body=${toTextPreview(bodyPreview, 180)}`);
  return parts.join(' | ');
}

function buildAiErrorDetail(error) {
  const rawVariantErrors =
    error?.details?.lastErrorDetails?.variantErrors ||
    error?.details?.variantErrors ||
    [];
  const variantErrors = Array.isArray(rawVariantErrors)
    ? rawVariantErrors.map((entry) => ({
        variant: entry?.variant || null,
        message: entry?.message || null,
        code: entry?.code || null,
        status: entry?.status || null,
        details: {
          url: entry?.details?.url || null,
          bodyPreview: toTextPreview(entry?.details?.body || '', 400),
        },
      }))
    : [];

  return {
    message: error?.message || 'Unknown AI error',
    code: error?.code || null,
    status: error?.status || null,
    details: {
      message: error?.details?.message || null,
      code: error?.details?.code || null,
      bodyPreview: toTextPreview(
        error?.details?.body || error?.details?.lastErrorDetails?.body || '',
        400
      ),
      variantErrors,
    },
  };
}

module.exports = {
  name: '04-enrich',
  async execute(context) {
    const records = context.artifacts.uniquePosts || [];
    const enriched = [];
    const aiFailureByReason = new Map();
    const aiEnabled = Boolean(context.config?.ai?.enabled && context.adapters?.textNormalizer);
    const droppedByAiFailure = [];

    if (!aiEnabled) {
      throw new AppError('AI normalizer is required for enrichment', {
        code: 'AI_REQUIRED_FOR_ENRICHMENT',
        status: 500,
      });
    }

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      context.metrics.aiAttempted += 1;

      try {
        const aiRecord = await context.adapters.textNormalizer.normalizeRecord(record);
        const normalized = normalizeAiRecord(record, aiRecord);

        if (
          normalized.location?.district ||
          normalized.location?.city ||
          normalized.location?.province
        ) {
          context.metrics.locationResolved += 1;
        }

        enriched.push(normalized);
        context.metrics.aiSuccess += 1;
      } catch (error) {
        context.metrics.aiFallback += 1;
        const reason = buildAiErrorReason(error);
        aiFailureByReason.set(reason, (aiFailureByReason.get(reason) || 0) + 1);

        if (!Array.isArray(context.artifacts.aiErrors)) {
          context.artifacts.aiErrors = [];
        }
        context.artifacts.aiErrors.push({
          step: '04-enrich',
          index,
          sourceId: record.sourceId,
          reason,
          recordPreview: {
            sourceId: record.sourceId,
            fingerprint: record.fingerprint || null,
            textPreview: toTextPreview(
              record.rawText || record.raw?.text || record.raw?.description || '',
              260
            ),
          },
          error: buildAiErrorDetail(error),
        });

        if (Array.isArray(context.warnings) && context.warnings.length < 100) {
          context.warnings.push({
            step: '04-enrich',
            sourceId: record.sourceId,
            message: reason,
          });
        }

        droppedByAiFailure.push({ index, sourceId: record.sourceId, reason });
        context.logger.warn('AI normalization failed, record dropped', {
          index,
          sourceId: record.sourceId,
          error: reason,
        });
      }
    }

    context.artifacts.enrichedPosts = enriched;
    context.metrics.totalEnriched = enriched.length;
    context.metrics.aiDropped = droppedByAiFailure.length;
    const failureSummary = Object.fromEntries(aiFailureByReason.entries());

    context.logger.info('Enrichment completed', {
      totalEnriched: enriched.length,
      aiEnabled,
      aiAttempted: context.metrics.aiAttempted,
      aiSuccess: context.metrics.aiSuccess,
      aiFallback: context.metrics.aiFallback,
      aiDropped: droppedByAiFailure.length,
      locationResolved: context.metrics.locationResolved,
      aiFallbackByReason: failureSummary,
    });

    if (records.length > 0 && enriched.length === 0) {
      throw new AppError('AI strict mode failed: 0 annonce valide produite', {
        code: 'AI_STRICT_NO_OUTPUT',
        status: 502,
        details: {
          totalRecords: records.length,
          dropped: droppedByAiFailure.length,
          sample: droppedByAiFailure.slice(0, 5),
        },
      });
    }
  },
};
