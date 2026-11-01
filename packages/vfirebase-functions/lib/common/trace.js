'use strict';
const {AsyncLocalStorage} = require('node:async_hooks');
const traceContext = new AsyncLocalStorage();
const hex = /^[0-9a-f]+$/;
function header(carrier, name) {
  if (!carrier) return undefined;
  if (typeof carrier.get === 'function') return carrier.get(name);
  if (Object.hasOwn(carrier, name)) return carrier[name];
  const key = Object.keys(carrier).find(key => key.toLowerCase() === name);
  return key === undefined ? undefined : carrier[key];
}
function traceparent(value) {
  if (typeof value !== 'string' || value.length < 55) return;
  if (value[2] !== '-' || value[35] !== '-' || value[52] !== '-') return;
  const version = value.slice(0, 2), traceId = value.slice(3, 35), parentId = value.slice(36, 52), flags = value.slice(53, 55);
  if (!hex.test(version) || version === 'ff' || !hex.test(traceId) || !hex.test(parentId) || !hex.test(flags)) return;
  if (/^0+$/.test(traceId) || /^0+$/.test(parentId)) return;
  if (version === '00' ? value.length !== 55 : value.length > 55 && value[55] !== '-') return;
  return {version, traceId, parentId, sample: Boolean(parseInt(flags, 16) & 1)};
}
function cloudTrace(value) {
  if (typeof value !== 'string') return;
  const fields = /^([a-fA-F0-9]{32})\/([0-9]{1,20})(?:;o=([0-3]))?$/.exec(value);
  if (!fields) return;
  const span = BigInt(fields[2]);
  if (span > 0xffffffffffffffffn) return;
  return {version: '00', traceId: fields[1], parentId: span.toString(16), sample: Boolean(Number(fields[3] ?? 0) & 1)};
}
function extractTraceContext(carrier) {
  // Prefer the portable header; use the legacy Google header as a fallback.
  return traceparent(header(carrier, 'traceparent')) ?? cloudTrace(header(carrier, 'x-cloud-trace-context'));
}
module.exports = {traceContext, extractTraceContext};
