function mergeAiResult(fallbackRecord, aiRecord) {
  if (!aiRecord || typeof aiRecord !== 'object') {
    return fallbackRecord;
  }

  const mergedLocation = {
    district: aiRecord.location?.district || fallbackRecord.location?.district || '',
    city: aiRecord.location?.city || fallbackRecord.location?.city || '',
    province: aiRecord.location?.province || fallbackRecord.location?.province || '',
    lon: Number(aiRecord.location?.lon ?? fallbackRecord.location?.lon ?? 0) || 0,
    lat: Number(aiRecord.location?.lat ?? fallbackRecord.location?.lat ?? 0) || 0,
  };

  return {
    ...fallbackRecord,
    ...aiRecord,
    title: aiRecord.title || fallbackRecord.title,
    description: aiRecord.description || fallbackRecord.description,
    typeProperty: aiRecord.typeProperty || fallbackRecord.typeProperty,
    status: aiRecord.status || fallbackRecord.status,
    price: Number(aiRecord.price ?? fallbackRecord.price ?? 0) || 0,
    area: Number(aiRecord.area ?? fallbackRecord.area ?? 0) || 0,
    contact: aiRecord.contact || fallbackRecord.contact || '',
    tags: Array.isArray(aiRecord.tags) ? aiRecord.tags : fallbackRecord.tags || [],
    location: mergedLocation,
    nbrRooms: Number(aiRecord.nbrRooms ?? fallbackRecord.nbrRooms ?? 0) || 0,
    nbrChickens: Number(aiRecord.nbrChickens ?? fallbackRecord.nbrChickens ?? 0) || 0,
    nbrBathrooms: Number(aiRecord.nbrBathrooms ?? fallbackRecord.nbrBathrooms ?? 0) || 0,
    nbrToilets: Number(aiRecord.nbrToilets ?? fallbackRecord.nbrToilets ?? 0) || 0,
    nbrLivingRoom: Number(aiRecord.nbrLivingRoom ?? fallbackRecord.nbrLivingRoom ?? 0) || 0,
  };
}

function applyResolvedLocation(record, resolvedLocation, defaults = {}) {
  if (!resolvedLocation) return record;

  const hasResolvedData = Boolean(
    resolvedLocation.district ||
      resolvedLocation.city ||
      resolvedLocation.province ||
      resolvedLocation.longitude ||
      resolvedLocation.latitude
  );

  if (!hasResolvedData) return record;

  const currentLocation = record.location || {};
  const defaultCity = String(defaults.cityDefault || '').trim();
  const defaultProvince = String(defaults.provinceDefault || '').trim();
  const formatName = (value) =>
    String(value || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const districtResolved = resolvedLocation.district || currentLocation.district || '';
  const cityResolved = resolvedLocation.city || currentLocation.city || defaultCity;
  const provinceResolved = resolvedLocation.province || currentLocation.province || defaultProvince;
  const districtFinal = districtResolved || cityResolved || defaultCity;

  return {
    ...record,
    location: {
      district: formatName(districtFinal),
      city: formatName(cityResolved),
      province: formatName(provinceResolved),
      lon: Number(resolvedLocation.longitude ?? currentLocation.lon ?? 0) || 0,
      lat: Number(resolvedLocation.latitude ?? currentLocation.lat ?? 0) || 0,
    },
  };
}

module.exports = {
  name: '04-enrich',
  async execute(context) {
    const records = context.artifacts.uniquePosts || [];
    const enriched = [];
    const aiFallbackByReason = new Map();
    const aiEnabled = Boolean(context.config?.ai?.enabled && context.adapters?.textNormalizer);
    const locationResolver = context.services?.osmLocationResolver;
    const locationHints = locationResolver?.getHints?.(20) || null;

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      const fallback = context.services.propertyEnricher.enrich(record, context.agency.defaults);
      const resolvedFromSource = locationResolver?.resolveFromText?.(
        record.rawText,
        record.raw?.text,
        record.raw?.description
      );
      const fallbackWithLocation = applyResolvedLocation(fallback, resolvedFromSource, context.agency?.defaults || {});

      if (fallbackWithLocation.location?.city || fallbackWithLocation.location?.province || fallbackWithLocation.location?.district) {
        context.metrics.locationResolved += 1;
      }

      if (!aiEnabled) {
        enriched.push(fallbackWithLocation);
        continue;
      }

      context.metrics.aiAttempted += 1;

      try {
        const aiRecord = await context.adapters.textNormalizer.normalizeRecord(record, {
          defaults: context.agency.defaults,
          fallbackRecord: fallbackWithLocation,
          locationHints,
        });
        const merged = mergeAiResult(fallbackWithLocation, aiRecord);

        const resolvedFromMerged = locationResolver?.resolveFromText?.(
          record.rawText,
          merged.title,
          merged.description,
          merged.location?.district,
          merged.location?.city,
          merged.location?.province
        );
        const mergedWithLocation = applyResolvedLocation(merged, resolvedFromMerged, context.agency?.defaults || {});
        enriched.push(mergedWithLocation);
        context.metrics.aiSuccess += 1;
      } catch (error) {
        enriched.push(fallbackWithLocation);
        context.metrics.aiFallback += 1;
        const reason = error?.message || 'Unknown AI error';
        aiFallbackByReason.set(reason, (aiFallbackByReason.get(reason) || 0) + 1);
        if (Array.isArray(context.warnings) && context.warnings.length < 100) {
          context.warnings.push({
            step: '04-enrich',
            sourceId: record.sourceId,
            message: reason,
          });
        }
        context.logger.warn('AI normalization failed, fallback applied', {
          index,
          sourceId: record.sourceId,
          error: reason,
        });
      }
    }

    context.artifacts.enrichedPosts = enriched;
    context.metrics.totalEnriched = enriched.length;
    const fallbackSummary = Object.fromEntries(aiFallbackByReason.entries());
    context.logger.info('Enrichment completed', {
      totalEnriched: enriched.length,
      aiEnabled,
      aiAttempted: context.metrics.aiAttempted,
      aiSuccess: context.metrics.aiSuccess,
      aiFallback: context.metrics.aiFallback,
      locationResolved: context.metrics.locationResolved,
      aiFallbackByReason: fallbackSummary,
    });
  },
};
