const { ImageStoragePort } = require('../../application/ports/image-storage.port');

class NoopImageStorageAdapter extends ImageStoragePort {
  async uploadMany(records, _context) {
    return records.map((record) => ({
      ...record,
      uploadedImages: (record.imageUrls || []).map((url) => ({
        sourceUrl: url,
        uploadedUrl: url,
        uploaded: false,
      })),
    }));
  }
}

module.exports = { NoopImageStorageAdapter };
