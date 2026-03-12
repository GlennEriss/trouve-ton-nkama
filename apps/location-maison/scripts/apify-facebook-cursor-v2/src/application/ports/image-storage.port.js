class ImageStoragePort {
  async uploadMany(_records, _context) {
    throw new Error('ImageStoragePort.uploadMany must be implemented');
  }
}

module.exports = { ImageStoragePort };
