import { buildTimeline, sample } from '../../runtime.mjs';

const origin = 'https://incident-triage-workspace.vercel.app';
const model = 'openai/gpt-oss-20b';
const toolName = 'website_build_timeline';
const prompt = 'Build a timeline from the test log currently in this workspace.';
const tools = [{
  type: 'function',
  function: {
    name: toolName,
    description: 'Read and sort the fixed synthetic incident log.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
}];
const { events, skipped } = buildTimeline(sample);
const headers = { 'Cache-Control': 'no-store' };
const error = (status, message) => Response.json({ error: { message } }, { status, headers });
let windowStart = 0;
let callsInWindow = 0;

export async function POST(request) {
  if (request.headers.get('origin') !== origin) return error(403, 'Open the official demo to run this scenario.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) return error(415, 'Expected JSON.');
  const reader = request.body?.getReader();
  if (!reader) return error(400, 'Missing demo request.');
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      return error(413, 'Demo request is too large.');
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();

  let messages;
  try { ({ messages } = JSON.parse(body)); }
  catch { return error(400, 'Invalid demo request.'); }
  if (!Array.isArray(messages) || ![2, 4].includes(messages.length) ||
      messages[0]?.role !== 'system' || messages[1]?.role !== 'user' || messages[1].content !== prompt) {
    return error(400, 'Only the fixed synthetic demo is available.');
  }
  const upstream = [
    { role: 'system', content: 'You are an incident analyst. Use the timeline tool once. Summarize its observed events in UTC, retaining their original line numbers. Do not infer causality.' },
    { role: 'user', content: prompt },
  ];
  const firstStep = messages.length === 2;
  if (!firstStep) {
    const assistant = messages[2];
    const receipt = messages[3];
    const call = assistant?.tool_calls?.[0];
    if (assistant?.role !== 'assistant' || assistant.tool_calls?.length !== 1 ||
        call?.function?.name !== toolName || typeof call.id !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(call.id) || receipt?.role !== 'tool' ||
        receipt.tool_call_id !== call.id) return error(400, 'Invalid timeline tool receipt.');
    try {
      const parsed = JSON.parse(receipt.content);
      if (parsed.status !== 'succeeded' || JSON.stringify(parsed.result) !== JSON.stringify({ events, skipped })) {
        return error(400, 'Unexpected timeline evidence.');
      }
    } catch { return error(400, 'Invalid timeline evidence.'); }
    upstream.push(
      { role: 'assistant', content: null, tool_calls: [{ id: call.id, type: 'function', function: { name: toolName, arguments: '{}' } }] },
      { role: 'tool', tool_call_id: call.id, content: JSON.stringify({ events, skipped }) },
    );
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) return error(503, 'Live model is awaiting configuration. The browser demo is available.');
  const now = Date.now();
  if (now - windowStart >= 60_000) {
    windowStart = now;
    callsInWindow = 0;
  }
  if (callsInWindow >= 24) return error(429, 'Live demo is busy. Try again shortly or use the browser demo.');
  callsInWindow += 1;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: upstream,
        tools,
        tool_choice: firstStep ? { type: 'function', function: { name: toolName } } : 'none',
        parallel_tool_calls: false,
        max_completion_tokens: 600,
        reasoning_effort: 'low',
        stream: true,
      }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(25_000)]),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429) return error(429, 'Groq Free quota is temporarily unavailable. Use the browser demo.');
      return error(502, 'Groq rejected the demo request (HTTP ' + response.status + ').');
    }
    return new Response(response.body, { headers: { ...headers, 'Content-Type': 'text/event-stream' } });
  } catch {
    return error(502, 'The live model did not respond in time. Use the browser demo or retry.');
  }
}
