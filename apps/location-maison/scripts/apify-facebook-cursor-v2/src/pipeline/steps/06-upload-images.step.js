module.exports = {
  name: '06-upload-images',
  async execute(context) {
    const records = (context.artifacts.mappedProperties || []).map((property) => ({
      propertyId: property.id,
      imageUrls: (property.images || []).map((img) => img.fileURL).filter(Boolean),
      property,
    }));

    const uploaded = await context.adapters.imageStorage.uploadMany(records, context);

    const merged = uploaded.map((item) => {
      const imageUrls = (item.uploadedImages || []).map((img) => img.uploadedUrl || img.sourceUrl).filter(Boolean);
      return {
        ...item.property,
        images: imageUrls.map((url) => ({ fileURL: url })),
      };
    });

    context.artifacts.mappedProperties = merged;
    context.metrics.totalImages = merged.reduce((sum, property) => sum + (property.images?.length || 0), 0);
    context.logger.info('Image step completed', { totalImages: context.metrics.totalImages });
  },
};
