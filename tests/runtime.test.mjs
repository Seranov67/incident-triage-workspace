import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, formatUtc, sample } from '../runtime.mjs';

const one = log => buildTimeline(log);

test('sample keeps original line numbers in UTC order', () => {
  const { events, skipped } = one(sample);
  assert.deepEqual(events.map(e => e.line), [1, 3, 2, 4, 5]);
  assert.deepEqual(skipped, []);
});

test('rejects impossible calendar values instead of rolling them over', () => {
  for (const ts of ['2026-02-30T10:00:00Z', '2026-11-19T24:00:00Z', '2026-11-19T10:60:00Z',
    '2026-11-19T10:00:60Z', '2026-13-01T10:00:00Z', '2026-11-19T10:00:00+25:00']) {
    assert.deepEqual(one(`${ts} INFO svc msg`).skipped, [1], ts);
  }
  assert.equal(one('2028-02-29T10:00:00Z INFO svc leap day').events.length, 1);
});

test('normalizes offsets to UTC', () => {
  const [e] = one('2026-11-19T12:00:00+02:00 WARN svc offset').events;
  assert.equal(new Date(e.timestamp).toISOString(), '2026-11-19T10:00:00.000Z');
});

test('accepts BOM, indentation, CRLF and common severities', () => {
  const log = '\uFEFF  2026-11-19T10:00:00Z FATAL a crash  \r\n2026-11-19T09:00:00Z warning b disk\r\n';
  const { events, skipped } = one(log);
  assert.deepEqual(skipped, []);
  assert.deepEqual(events.map(e => [e.line, e.level, e.message]), [[2, 'WARNING', 'disk'], [1, 'FATAL', 'crash']]);
});

test('reports unparsed lines by original number', () => {
  assert.deepEqual(one('garbage\n\n2026-11-19T10:00:00Z INFO a ok\nmore garbage').skipped, [1, 4]);
});

test('formats UTC with and without milliseconds', () => {
  assert.equal(formatUtc(Date.parse('2026-11-19T10:00:00Z')), '2026-11-19 10:00:00 UTC');
  assert.equal(formatUtc(Date.parse('2026-11-19T10:00:00.123Z')), '2026-11-19 10:00:00.123 UTC');
});
