const path = require('path');

module.exports = {
  name: '08-report',
  async execute(context) {
    const completedAt = new Date().toISOString();
    const report = {
      metadata: {
        jobId: context.job.id,
        agencyKey: context.agency.key,
        mode: context.job.mode,
        startedAt: context.job.startedAt,
        completedAt,
        inputFile: context.job.inputFile,
      },
      metrics: context.metrics,
      warnings: context.warnings,
      errors: context.errors,
      samples: {
        mappedFirstProperty: context.artifacts.mappedProperties?.[0] || null,
      },
    };

    const detailedErrorsReport = {
      metadata: {
        jobId: context.job.id,
        agencyKey: context.agency.key,
        mode: context.job.mode,
        startedAt: context.job.startedAt,
        completedAt,
        inputFile: context.job.inputFile,
      },
      summary: {
        pipelineErrorsCount: Array.isArray(context.errors) ? context.errors.length : 0,
        warningsCount: Array.isArray(context.warnings) ? context.warnings.length : 0,
        aiErrorsCount: Array.isArray(context.artifacts?.aiErrors) ? context.artifacts.aiErrors.length : 0,
      },
      pipelineErrors: context.errors || [],
      warnings: context.warnings || [],
      aiErrors: context.artifacts?.aiErrors || [],
    };

    const reportFile = context.adapters.artifacts.writeJson(path.join('reports', `${context.job.id}.report.json`), report);
    const errorReportFile = context.adapters.artifacts.writeJson(
      path.join('reports', `${context.job.id}.errors.json`),
      detailedErrorsReport
    );
    const enrichedFile = context.adapters.artifacts.writeJson(
      path.join('staging', `${context.job.id}.enriched-posts.json`),
      context.artifacts.enrichedPosts || []
    );
    const mappedFile = context.adapters.artifacts.writeJson(
      path.join('staging', `${context.job.id}.mapped-properties.json`),
      context.artifacts.mappedProperties || []
    );

    context.job.reportFile = reportFile;
    context.job.errorReportFile = errorReportFile;
    context.job.enrichedFile = enrichedFile;
    context.job.mappedFile = mappedFile;

    context.logger.info('Artifacts written', {
      reportFile,
      errorReportFile,
      enrichedFile,
      mappedFile,
    });
  },
};
