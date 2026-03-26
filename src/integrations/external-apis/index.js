/**
 * External API client wrapper.
 * Provides a base HTTP client with retry logic and error handling.
 */
'use strict';

const axios = require('axios');
const { withContext } = require('../../core/logger');
const { sleep } = require('../../core/utilities');

const log = withContext({ module: 'external-api' });

class ExternalApiClient {
  /**
   * @param {string} baseURL
   * @param {{ timeout?: number, retries?: number, headers?: Record<string, string> }} options
   */
  constructor(baseURL, { timeout = 10000, retries = 3, headers = {} } = {}) {
    this.retries = retries;
    this.client = axios.create({ baseURL, timeout, headers });

    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        log.warn('External API error', {
          url: err.config?.url,
          status: err.response?.status,
          message: err.message,
        });
        return Promise.reject(err);
      }
    );
  }

  async get(path, params = {}) {
    return this._request(() => this.client.get(path, { params }));
  }

  async post(path, data = {}) {
    return this._request(() => this.client.post(path, data));
  }

  async put(path, data = {}) {
    return this._request(() => this.client.put(path, data));
  }

  async delete(path) {
    return this._request(() => this.client.delete(path));
  }

  async _request(fn, attempt = 1) {
    try {
      const res = await fn();
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      const isRetryable = !status || status >= 500 || status === 429;

      if (isRetryable && attempt < this.retries) {
        const delay = Math.pow(2, attempt) * 500;
        log.info(`Retrying request (attempt ${attempt + 1})`, { delay });
        await sleep(delay);
        return this._request(fn, attempt + 1);
      }
      throw err;
    }
  }
}

module.exports = { ExternalApiClient };
