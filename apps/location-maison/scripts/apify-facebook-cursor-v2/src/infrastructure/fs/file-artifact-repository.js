const fs = require('fs');
const path = require('path');

class FileArtifactRepository {
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  ensureDir(relativeDir) {
    const target = path.join(this.baseDir, relativeDir);
    fs.mkdirSync(target, { recursive: true });
    return target;
  }

  writeJson(relativeFilePath, payload) {
    const fullPath = path.join(this.baseDir, relativeFilePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), 'utf8');
    return fullPath;
  }
}

module.exports = { FileArtifactRepository };
