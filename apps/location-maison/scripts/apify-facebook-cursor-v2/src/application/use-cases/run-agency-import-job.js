const path = require('path');
const { createAgency } = require('../../domain/entities/agency');
const { DuplicateDetector } = require('../../domain/services/duplicate-detector');
const { PropertyEnricher } = require('../../domain/services/property-enricher');
const { TagSelector } = require('../../domain/services/tag-selector');
const { OSMGabonLocationResolver } = require('../../domain/services/osm-location-resolver');
const { PipelineRunner } = require('../../pipeline/pipeline-runner');

const step01 = require('../../pipeline/steps/01-load-raw.step');
const step02 = require('../../pipeline/steps/02-clean.step');
const step03 = require('../../pipeline/steps/03-dedupe.step');
const step04 = require('../../pipeline/steps/04-enrich.step');
const step05 = require('../../pipeline/steps/05-map-property.step');
const step06 = require('../../pipeline/steps/06-upload-images.step');
const step07 = require('../../pipeline/steps/07-upsert-db.step');
const step08 = require('../../pipeline/steps/08-report.step');

const { AppError } = require('../../shared/errors/app-error');

async function runAgencyImportJob(params) {
  const {
    job,
    agencyKey,
    agenciesConfig,
    logger,
    adapters,
  } = params;

  const agencies = Array.isArray(agenciesConfig?.agencies) ? agenciesConfig.agencies : [];
  const agencyRaw = agencies.find((item) => item.key === agencyKey);

  if (!agencyRaw) {
    throw new AppError(`Agency not found: ${agencyKey}`, { code: 'AGENCY_NOT_FOUND', status: 404 });
  }

  const agency = createAgency(agencyRaw);
  if (!agency.enabled) {
    throw new AppError(`Agency is disabled: ${agency.key}`, { code: 'AGENCY_DISABLED', status: 409 });
  }

  const context = {
    job: {
      ...job,
      status: 'running',
      startedAt: new Date().toISOString(),
    },
    agency,
    config: {
      defaults: params.defaultsConfig || {},
      ai: params.aiConfig || { enabled: false },
    },
    adapters,
    services: {
      duplicateDetector: new DuplicateDetector(),
      propertyEnricher: new PropertyEnricher(),
      tagSelector: new TagSelector(),
      osmLocationResolver: new OSMGabonLocationResolver(),
    },
    artifacts: {
      rawPosts: [],
      cleanedPosts: [],
      duplicatePosts: [],
      uniquePosts: [],
      enrichedPosts: [],
      mappedProperties: [],
      persistResults: [],
    },
    metrics: {
      totalRaw: 0,
      totalCleaned: 0,
      droppedLowImages: 0,
      duplicatesRemoved: 0,
      totalUnique: 0,
      totalEnriched: 0,
      totalMapped: 0,
      totalImages: 0,
      totalUpserted: 0,
      aiAttempted: 0,
      aiSuccess: 0,
      aiFallback: 0,
      locationResolved: 0,
    },
    warnings: [],
    errors: [],
    logger: logger.child({ jobId: job.id, agencyKey: agency.key }),
    paths: {
      rootDir: params.rootDir,
      dataDir: path.join(params.rootDir, 'data'),
    },
  };

  const runner = new PipelineRunner([step01, step02, step03, step04, step05, step06, step07, step08]);

  try {
    await runner.run(context);
    context.job.status = 'completed';
    context.logger.info('Import job completed', {
      reportFile: context.job.reportFile,
      mappedFile: context.job.mappedFile,
      metrics: context.metrics,
    });
    return context;
  } catch (error) {
    context.job.status = 'failed';
    context.logger.error('Import job failed', {
      error: {
        message: error?.message,
        code: error?.code,
      },
    });
    throw error;
  }
}

module.exports = { runAgencyImportJob };
