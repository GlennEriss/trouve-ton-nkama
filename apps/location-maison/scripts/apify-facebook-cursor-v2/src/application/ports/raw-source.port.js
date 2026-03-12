class RawSourcePort {
  async loadRaw(_inputFilePath) {
    throw new Error('RawSourcePort.loadRaw must be implemented');
  }
}

module.exports = { RawSourcePort };
