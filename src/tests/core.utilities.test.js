/**
 * Tests for core utilities module.
 */
'use strict';

const { generateId, asyncHandler, paginationMeta, parsePagination, omit, sleep } = require('../core/utilities');

describe('generateId', () => {
  it('returns a valid UUID v4 string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, generateId));
    expect(ids.size).toBe(100);
  });
});

describe('paginationMeta', () => {
  it('calculates pages correctly', () => {
    expect(paginationMeta(100, 1, 20)).toEqual({ total: 100, page: 1, limit: 20, pages: 5 });
  });

  it('rounds pages up', () => {
    expect(paginationMeta(21, 1, 20)).toEqual({ total: 21, page: 1, limit: 20, pages: 2 });
  });

  it('handles zero total', () => {
    expect(paginationMeta(0, 1, 20)).toEqual({ total: 0, page: 1, limit: 20, pages: 0 });
  });
});

describe('parsePagination', () => {
  it('returns defaults when no query params', () => {
    const req = { query: {} };
    expect(parsePagination(req)).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('parses page and limit from query', () => {
    const req = { query: { page: '2', limit: '10' } };
    expect(parsePagination(req)).toEqual({ page: 2, limit: 10, offset: 10 });
  });

  it('clamps limit to max 100', () => {
    const req = { query: { limit: '999' } };
    expect(parsePagination(req).limit).toBe(100);
  });

  it('clamps page to min 1', () => {
    const req = { query: { page: '-5' } };
    expect(parsePagination(req).page).toBe(1);
  });
});

describe('omit', () => {
  it('removes specified fields', () => {
    const result = omit({ a: 1, b: 2, c: 3 }, ['b', 'c']);
    expect(result).toEqual({ a: 1 });
  });

  it('does not mutate the original object', () => {
    const obj = { a: 1, b: 2 };
    omit(obj, ['a']);
    expect(obj).toEqual({ a: 1, b: 2 });
  });

  it('handles missing fields gracefully', () => {
    const result = omit({ a: 1 }, ['nonexistent']);
    expect(result).toEqual({ a: 1 });
  });
});

describe('asyncHandler', () => {
  it('calls next with error on rejection', async () => {
    const error = new Error('test error');
    const handler = asyncHandler(() => Promise.reject(error));
    const next = jest.fn();
    await handler({}, {}, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next on success', async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const handler = asyncHandler(async (req, r) => r.status(200).json({}));
    const next = jest.fn();
    await handler({}, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('sleep', () => {
  it('resolves after approximately the given time', async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});
