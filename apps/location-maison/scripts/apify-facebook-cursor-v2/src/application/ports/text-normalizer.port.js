class TextNormalizerPort {
  async normalizeRecord(_record, _context) {
    throw new Error('TextNormalizerPort.normalizeRecord must be implemented');
  }
}

module.exports = { TextNormalizerPort };
