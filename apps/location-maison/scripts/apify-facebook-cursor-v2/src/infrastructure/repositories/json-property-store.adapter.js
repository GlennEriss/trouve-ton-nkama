const path = require('path');
const { PropertyStorePort } = require('../../application/ports/property-store.port');

class JsonPropertyStoreAdapter extends PropertyStorePort {
  constructor(artifactRepository) {
    super();
    this.artifactRepository = artifactRepository;
  }

  async upsertMany(properties, context) {
    const relativePath = path.join('staging', `${context.job.id}.upsert-payload.json`);
    const filePath = this.artifactRepository.writeJson(relativePath, {
      metadata: {
        jobId: context.job.id,
        agencyKey: context.agency.key,
        mode: context.job.mode,
        createdAt: new Date().toISOString(),
      },
      properties,
    });

    return properties.map((property, index) => ({
      propertyId: property.id || `${context.job.id}-${index + 1}`,
      created: false,
      updated: false,
      dryRun: context.job.mode !== 'apply',
      filePath,
    }));
  }
}

module.exports = { JsonPropertyStoreAdapter };
