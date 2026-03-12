const { toSingleLine } = require('../../shared/utils/text');

function extractMediaImageUrls(mediaItems = []) {
  if (!Array.isArray(mediaItems)) return [];

  return mediaItems
    .map((item) => {
      const uri = item?.image?.uri || item?.thumbnail || '';
      if (uri) return uri;

      const url = String(item?.url || '');
      if (!url) return '';

      const looksLikeImage =
        /scontent/i.test(url) || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
      return looksLikeImage ? url : '';
    })
    .filter(Boolean);
}

module.exports = {
  name: '02-clean',
  async execute(context) {
    const minImagesRequired = Number(context.config?.defaults?.pipeline?.minImagesRequired ?? 4);
    const droppedLowImages = [];

    const cleaned = (context.artifacts.rawPosts || [])
      .map((post, index) => {
        const rawText = toSingleLine(post.text || post.description || post.title || '');
        const imageUrlsRaw = Array.isArray(post.images)
          ? post.images.map((img) => (typeof img === 'string' ? img : img?.fileURL)).filter(Boolean)
          : Array.isArray(post.attachments)
            ? post.attachments
                .map((att) => att?.image?.uri)
                .filter(Boolean)
            : extractMediaImageUrls(post.media);

        const imageUrls = [...new Set(imageUrlsRaw)];
        const sourceId =
          post.id ||
          post.postId ||
          post.facebookPostId ||
          post.url ||
          `${context.job.id}-${index + 1}`;

        if (imageUrls.length < minImagesRequired) {
          droppedLowImages.push({
            sourceId,
            imagesCount: imageUrls.length,
          });
          return null;
        }

        return {
          sourceId,
          rawText,
          imageUrls,
          raw: post,
        };
      })
      .filter((record) => Boolean(record) && (record.rawText || record.imageUrls.length > 0));

    context.artifacts.cleanedPosts = cleaned;
    context.metrics.totalCleaned = cleaned.length;
    context.metrics.droppedLowImages = droppedLowImages.length;
    if (Array.isArray(context.warnings)) {
      droppedLowImages.slice(0, 100).forEach((item) => {
        context.warnings.push({
          step: '02-clean',
          sourceId: item.sourceId,
          message: `Annonce rejetee: ${item.imagesCount} image(s), minimum requis: ${minImagesRequired}`,
        });
      });
    }
    context.logger.info('Raw posts cleaned', {
      totalCleaned: cleaned.length,
      droppedLowImages: droppedLowImages.length,
      minImagesRequired,
    });
  },
};
