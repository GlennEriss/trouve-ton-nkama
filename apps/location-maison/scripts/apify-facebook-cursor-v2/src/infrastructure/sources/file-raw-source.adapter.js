const fs = require('fs');
const { RawSourcePort } = require('../../application/ports/raw-source.port');
const { AppError } = require('../../shared/errors/app-error');

class FileRawSourceAdapter extends RawSourcePort {
  async loadRaw(inputFilePath) {
    if (!inputFilePath) {
      throw new AppError('Input file is required', { code: 'INPUT_FILE_REQUIRED', status: 400 });
    }

    if (!fs.existsSync(inputFilePath)) {
      throw new AppError(`Input file not found: ${inputFilePath}`, {
        code: 'INPUT_FILE_NOT_FOUND',
        status: 404,
      });
    }

    const raw = fs.readFileSync(inputFilePath, 'utf8');
    const payload = JSON.parse(raw);

    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload.properties)) {
      return payload.properties;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    throw new AppError('Unsupported input JSON shape', {
      code: 'INPUT_JSON_UNSUPPORTED_SHAPE',
      status: 422,
      details: { inputFilePath },
    });
  }
}

module.exports = { FileRawSourceAdapter };
