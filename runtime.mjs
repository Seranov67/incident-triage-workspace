export const sample = `2026-11-19T09:00:00Z INFO deploy Release 2.4 started
2026-11-19T09:03:06Z ERROR checkout Database connection timed out
2026-11-19T09:01:21Z WARN database Connection pool at capacity
2026-11-19T09:04:02Z INFO deploy Rollback started
2026-11-19T09:06:45Z INFO checkout Health checks passing`;

export const LEVELS = ['TRACE', 'DEBUG', 'INFO', 'NOTICE', 'WARN', 'WARNING', 'ERROR', 'CRITICAL', 'FATAL'];

const LINE = new RegExp(`^(\\S+)\\s+(${LEVELS.join('|')})\\s+(\\S+)\\s+(.+)$`, 'i');
const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/;

// Date.parse silently rolls impossible values forward (2026-02-30 -> 2026-03-02,
// 24:00 -> next day). An evidence timeline must reject them instead.
export function parseTimestamp(text) {
  const m = ISO.exec(text);
  if (!m) return NaN;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  if (hour > 23 || minute > 59 || second > 59) return NaN;
  if (m[9] !== undefined && (Number(m[9]) > 23 || Number(m[10]) > 59)) return NaN;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return NaN;
  return Date.parse(text);
}

export function buildTimeline(log) {
  const lines = log.replace(/^\uFEFF/, '').split(/\r?\n/);
  const events = [];
  const skipped = [];
  lines.forEach((line, index) => {
    const text = line.trim();
    if (!text) return;
    const match = LINE.exec(text);
    const timestamp = match ? parseTimestamp(match[1]) : NaN;
    if (!Number.isFinite(timestamp)) {
      skipped.push(index + 1);
      return;
    }
    events.push({ timestamp, level: match[2].toUpperCase(), service: match[3], message: match[4], line: index + 1 });
  });
  events.sort((a, b) => a.timestamp - b.timestamp || a.line - b.line);
  return { lines, events, skipped };
}

export function formatUtc(timestamp) {
  return new Date(timestamp).toISOString().replace('T', ' ').replace(/(\.\d{3})?Z$/, (_, ms) => (ms && ms !== '.000' ? ms : '') + ' UTC');
}
