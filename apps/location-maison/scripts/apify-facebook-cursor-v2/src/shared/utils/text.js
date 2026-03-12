function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function toSingleLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

module.exports = { normalizeText, toSingleLine };
