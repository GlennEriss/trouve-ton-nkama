const { normalizeText } = require('../../shared/utils/text');
const { sha256 } = require('../../shared/utils/hash');

class DuplicateDetector {
  createFingerprint(record) {
    const sourceId = String(record.sourceId || '');
    const text = normalizeText(record.rawText || '');
    const firstImage = String(record.imageUrls?.[0] || '');

    if (sourceId) {
      return `source:${sourceId}`;
    }

    return `hash:${sha256(`${text}|${firstImage}`)}`;
  }

  dedupe(records) {
    const seen = new Set();
    const unique = [];
    const duplicates = [];

    records.forEach((record) => {
      const fingerprint = this.createFingerprint(record);
      const enriched = { ...record, fingerprint };

      if (seen.has(fingerprint)) {
        duplicates.push(enriched);
        return;
      }

      seen.add(fingerprint);
      unique.push(enriched);
    });

    return { unique, duplicates };
  }
}

module.exports = { DuplicateDetector };
