const path = require('path');

module.exports = {
  name: '08-report',
  async execute(context) {
    const report = {
      metadata: {
        jobId: context.job.id,
        agencyKey: context.agency.key,
        mode: context.job.mode,
        startedAt: context.job.startedAt,
        completedAt: new Date().toISOString(),
        inputFile: context.job.inputFile,
      },
      metrics: context.metrics,
      warnings: context.warnings,
      errors: context.errors,
      samples: {
        mappedFirstProperty: context.artifacts.mappedProperties?.[0] || null,
      },
    };

    const reportFile = context.adapters.artifacts.writeJson(path.join('reports', `${context.job.id}.report.json`), report);
    const enrichedFile = context.adapters.artifacts.writeJson(
      path.join('staging', `${context.job.id}.enriched-posts.json`),
      context.artifacts.enrichedPosts || []
    );
    const mappedFile = context.adapters.artifacts.writeJson(
      path.join('staging', `${context.job.id}.mapped-properties.json`),
      context.artifacts.mappedProperties || []
    );

    context.job.reportFile = reportFile;
    context.job.enrichedFile = enrichedFile;
    context.job.mappedFile = mappedFile;

    context.logger.info('Artifacts written', { reportFile, enrichedFile, mappedFile });
  },
};
