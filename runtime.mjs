export const sample = `2026-11-19T09:00:00Z INFO deploy Release 2.4 started
2026-11-19T09:03:06Z ERROR checkout Database connection timed out
2026-11-19T09:01:21Z WARN database Connection pool at capacity
2026-11-19T09:04:02Z INFO deploy Rollback started
2026-11-19T09:06:45Z INFO checkout Health checks passing`;

export function buildTimeline(log) {
  const lines = log.split(/\r?\n/);
  const events = [];
  const skipped = [];
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const match = /^(\S+)\s+(INFO|WARN|ERROR|DEBUG)\s+(\S+)\s+(.+)$/i.exec(line);
    const timestamp = match && Date.parse(match[1]);
    if (!match || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(match[1]) ||
        !Number.isFinite(timestamp)) {
      skipped.push(index + 1);
      return;
    }
    events.push({ timestamp, level: match[2].toUpperCase(), service: match[3], message: match[4], line: index + 1 });
  });
  events.sort((a, b) => a.timestamp - b.timestamp || a.line - b.line);
  return { lines, events, skipped };
}
