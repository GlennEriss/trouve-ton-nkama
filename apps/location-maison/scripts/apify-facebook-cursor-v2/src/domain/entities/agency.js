const { AppError } = require('../../shared/errors/app-error');

function createAgency(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new AppError('Agency config must be an object', { code: 'AGENCY_CONFIG_INVALID', status: 422 });
  }

  const key = String(raw.key || '').trim();
  const uid = String(raw.uid || '').trim();
  const documentId = String(raw.documentId || '').trim();

  if (!key) {
    throw new AppError('Agency key is required', { code: 'AGENCY_KEY_REQUIRED', status: 422 });
  }
  if (!uid) {
    throw new AppError('Agency uid is required', { code: 'AGENCY_UID_REQUIRED', status: 422 });
  }
  if (!documentId) {
    throw new AppError('Agency documentId is required', {
      code: 'AGENCY_DOCUMENT_ID_REQUIRED',
      status: 422,
    });
  }

  return {
    key,
    name: String(raw.name || key),
    uid,
    documentId,
    enabled: raw.enabled !== false,
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    defaults: {
      country: raw.defaults?.country || 'Gabon',
      countryCode: raw.defaults?.countryCode || 'GA',
      statusDefault: raw.defaults?.statusDefault || 'FOR_RENT',
      cityDefault: raw.defaults?.cityDefault || '',
      provinceDefault: raw.defaults?.provinceDefault || '',
    },
  };
}

module.exports = { createAgency };
