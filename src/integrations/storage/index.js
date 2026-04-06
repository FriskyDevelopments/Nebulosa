/**
 * Storage integration.
 * Supports local filesystem and S3-compatible providers.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../../core/config');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'storage' });

class LocalStorageProvider {
  constructor(basePath) {
    this.basePath = basePath;
    fs.mkdirSync(basePath, { recursive: true });
  }

  async upload(key, buffer, mimeType) {
    const filePath = path.join(this.basePath, key);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, buffer);
    log.debug('File stored locally', { key });
    return { key, url: `/storage/${key}` };
  }

  async download(key) {
    const filePath = path.join(this.basePath, key);
    return await fs.promises.readFile(filePath);
  }

  async delete(key) {
    const filePath = path.join(this.basePath, key);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getUrl(key) {
    return `/storage/${key}`;
  }
}

/**
 * Returns the configured storage provider instance.
 * Extend with S3StorageProvider when needed.
 */
function getStorageProvider() {
  if (config.storage.provider === 'local') {
    return new LocalStorageProvider(config.storage.localPath);
  }
  // Future: return new S3StorageProvider(config.storage);
  throw new Error(`Unsupported storage provider: ${config.storage.provider}`);
}

module.exports = { getStorageProvider, LocalStorageProvider };
