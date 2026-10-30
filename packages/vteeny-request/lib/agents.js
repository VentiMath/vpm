'use strict';
const http = require('node:http'), https = require('node:https');
const {HttpProxyAgent} = require('vhttp-proxy-agent'), {HttpsProxyAgent} = require('vhttps-proxy-agent');
const pool = new Map(), records = new WeakMap(), limit = 64;
function bypass(url, list) {
  const host = url.hostname.toLowerCase(), port = url.port || (url.protocol === 'https:' ? '443' : '80');
  return String(list || '').split(',').some(item => {
    item = item.trim().toLowerCase(); if (!item) return false; if (item === '*') return true;
    if (item.includes('://')) {try {return new URL(item).origin === url.origin;} catch {return false;}}
    const match = /^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/.exec(item); if (!match || match[2] && match[2] !== port) return false;
    const pattern = match[1].replace(/^\*\./, '.');
    return pattern.startsWith('.') ? host.endsWith(pattern) : host === pattern;
  });
}
function keyPart(value, seen = new Set()) {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return 'number:' + value;
  if (ArrayBuffer.isView(value)) return 'bytes:' + Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64');
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return null;
  seen.add(value); const parts = [];
  for (const key of Object.keys(value).sort()) {const part = keyPart(value[key], seen); if (part === null) return null; parts.push(JSON.stringify(key) + ':' + part);}
  seen.delete(value); return (Array.isArray(value) ? '[' : '{') + parts.join(',') + (Array.isArray(value) ? ']' : '}');
}
function choose(uri, options) {
  const url = typeof uri === 'string' ? new URL(uri) : uri;
  const secure = url.protocol === 'https:';
  const explicit = options.proxy;
  const env = secure ? process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy : process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy;
  const proxy = explicit === false ? undefined : explicit || (bypass(url, process.env.NO_PROXY || process.env.no_proxy) ? undefined : env);
  if (!proxy && !options.forever) return;
  const config = {...options.pool}; if (options.forever) config.keepAlive = true;
  const detail = keyPart(config), key = detail === null ? null : url.protocol + '|' + (proxy || '') + '|' + detail;
  if (key !== null && pool.has(key)) {const agent = pool.get(key); pool.delete(key); pool.set(key, agent); return agent;}
  const agent = proxy ? new (secure ? HttpsProxyAgent : HttpProxyAgent)(proxy, config) : new (secure ? https.Agent : http.Agent)(config);
  const record = {uses: 0, cached: false}; records.set(agent, record);
  if (key !== null) {
    if (pool.size >= limit) for (const [oldKey, old] of pool) if (!records.get(old).uses) {pool.delete(oldKey); records.get(old).cached = false; old.destroy(); break;}
    if (pool.size < limit) {pool.set(key, agent); record.cached = true;}
  }
  return agent;
}
function getAgent(uri, options) {return choose(uri, options);}
function session(options) {
  const used = new Set(); let last, closed = false;
  return {
    select(url) {
      if (closed) throw new Error('Request already closed');
      last = choose(url, options);
      if (last && !used.has(last)) {used.add(last); records.get(last).uses++;}
      return last;
    },
    get agent() {return last || false;},
    close() {if (closed) return; closed = true; for (const agent of used) {const state = records.get(agent); state.uses--; if (!state.cached && !state.uses) agent.destroy();} used.clear();}
  };
}
function close() {for (const agent of pool.values()) {const state = records.get(agent); state.cached = false; if (!state.uses) agent.destroy();} pool.clear();}
module.exports = {getAgent, pool, session, close, bypass};
