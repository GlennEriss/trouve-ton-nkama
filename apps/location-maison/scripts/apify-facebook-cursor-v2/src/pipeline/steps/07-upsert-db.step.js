module.exports = {
  name: '07-upsert-db',
  async execute(context) {
    const properties = context.artifacts.mappedProperties || [];

    if (context.job.mode !== 'apply') {
      context.metrics.totalUpserted = 0;
      context.logger.info('Upsert skipped in dry-run mode', { totalMapped: properties.length });
      return;
    }

    const results = await context.adapters.propertyStore.upsertMany(properties, context);
    context.artifacts.persistResults = results;
    context.metrics.totalUpserted = results.length;
    context.logger.info('Upsert completed', { totalUpserted: results.length });
  },
};
