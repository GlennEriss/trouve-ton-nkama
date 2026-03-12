class PropertyStorePort {
  async upsertMany(_properties, _context) {
    throw new Error('PropertyStorePort.upsertMany must be implemented');
  }
}

module.exports = { PropertyStorePort };
