import { buildTimeline } from './runtime.mjs';

export function registerActions(actions) {
  actions.register({
    name: 'build_timeline',
    effect: 'read',
    description: 'Read the current test log, sort events by UTC, and return original source line numbers.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute() {
      const log = document.querySelector('#log').value;
      if (log.length > 12000) throw new Error('Use a test log with at most 12,000 characters.');
      const result = buildTimeline(log);
      document.dispatchEvent(new CustomEvent('timeline-evidence', { detail: result }));
      return { events: result.events, skipped: result.skipped };
    },
  });
}
