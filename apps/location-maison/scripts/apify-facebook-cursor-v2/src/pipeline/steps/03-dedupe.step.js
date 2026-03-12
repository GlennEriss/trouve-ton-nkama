module.exports = {
  name: '03-dedupe',
  async execute(context) {
    const { unique, duplicates } = context.services.duplicateDetector.dedupe(context.artifacts.cleanedPosts || []);
    context.artifacts.uniquePosts = unique;
    context.artifacts.duplicatePosts = duplicates;
    context.metrics.duplicatesRemoved = duplicates.length;
    context.metrics.totalUnique = unique.length;

    context.logger.info('Deduplication completed', {
      duplicatesRemoved: duplicates.length,
      totalUnique: unique.length,
    });
  },
};
