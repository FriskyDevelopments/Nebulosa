/**
 * Tests for the error handler middleware.
 */
'use strict';

process.env.NODE_ENV = 'test';

const { errorHandler, notFound } = require('../api/middleware/error-handler');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  it('returns the error status and message', () => {
    const err = new Error('Something went wrong');
    err.status = 422;
    const req = { method: 'GET', url: '/test' };
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Something went wrong' }));
  });

  it('defaults to 500 when no status on error', () => {
    const err = new Error('Oops');
    const req = { method: 'POST', url: '/data' };
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('notFound', () => {
  it('returns 404 with route info', () => {
    const req = { method: 'DELETE', path: '/nonexistent' };
    const res = makeRes();

    notFound(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toContain('DELETE');
    expect(body.error).toContain('/nonexistent');
  });
});
