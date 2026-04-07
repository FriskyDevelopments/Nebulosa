/**
 * Tests for the API validation middleware.
 */
'use strict';

const { z } = require('zod');
const { validateBody, validateQuery, validateParams } = require('../api/middleware/validate');

function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('validateBody', () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().int().positive() });

  it('calls next for valid body', () => {
    const req = { body: { name: 'Alice', age: 30 } };
    const res = makeRes();
    const next = vi.fn();

    validateBody(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid body', () => {
    const req = { body: { name: '', age: -1 } };
    const res = makeRes();
    const next = vi.fn();

    validateBody(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.error).toBe('Validation failed');
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('coerces and strips unknown fields when schema uses strip', () => {
    const strictSchema = z.object({ name: z.string() }).strip();
    const req = { body: { name: 'Bob', extra: 'ignored' } };
    const res = makeRes();
    const next = vi.fn();

    validateBody(strictSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Bob' });
  });
});

describe('validateQuery', () => {
  const schema = z.object({ page: z.coerce.number().optional() });

  it('calls next for valid query', () => {
    const req = { query: { page: '2' } };
    const res = makeRes();
    const next = vi.fn();

    validateQuery(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('validateParams', () => {
  const schema = z.object({ id: z.string().uuid() });

  it('calls next for valid UUID param', () => {
    const req = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };
    const res = makeRes();
    const next = vi.fn();

    validateParams(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 400 for non-UUID param', () => {
    const req = { params: { id: 'not-a-uuid' } };
    const res = makeRes();
    const next = vi.fn();

    validateParams(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
