'use strict';
const net = require('node:net'), tls = require('node:tls');
const {Agent} = require('vagent-base');
const debug = require('vdebug')('http-proxy-agent');
const {snapshot, headers, target} = require('./lib/options');
const {buffered, rebuild} = require('./lib/request');
const states = new WeakMap(), prepared = new WeakMap();
const omitted = new Set(['headers', 'negotiate', 'onProxyAuth', 'connectTimeout', 'host', 'hostname', 'port', 'path', 'protocol', 'keepAlive', 'keepAliveMsecs', 'maxSockets', 'maxTotalSockets', 'maxFreeSockets', 'scheduling']);
const failure = (code, message) => Object.assign(new Error(message), {code});
function ignoreError() {}
class HttpProxyAgent extends Agent {
  constructor(proxy, options) {
    if (options !== undefined && (!options || typeof options !== 'object' || Array.isArray(options))) throw new TypeError('Proxy agent options must be an object');
    const opts = {...options}; super(opts);
    // Forward requests always use HTTP destinations; avoid stack-based inference.
    this.protocol = 'http:';
    if (opts.negotiate !== undefined && opts.negotiate !== false || opts.onProxyAuth !== undefined) throw new TypeError('Automatic proxy authentication is unsupported; supply proxy credentials or headers');
    let url;
    try {url = new URL(typeof proxy === 'string' ? proxy : proxy.href);} catch {throw new TypeError('Proxy must be a valid HTTP or HTTPS URL');}
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new TypeError('Proxy URL must use HTTP or HTTPS with a hostname');
    let auth;
    if (url.username || url.password) {
      try {auth = 'Basic ' + Buffer.from(decodeURIComponent(url.username) + ':' + decodeURIComponent(url.password)).toString('base64');}
      catch {throw new TypeError('Invalid percent encoding in proxy credentials');}
    }
    const configured = opts.headers ?? {}, provider = typeof configured === 'function' ? configured : null;
    const fields = provider ? null : headers(configured);
    const connection = {ALPNProtocols: ['http/1.1']};
    for (const key of Object.keys(opts)) if (!omitted.has(key)) connection[key] = snapshot(opts[key]);
    if (!Array.isArray(connection.ALPNProtocols) || connection.ALPNProtocols.some(value => value !== 'http/1.1')) throw new TypeError('Proxy ALPNProtocols must contain only http/1.1');
    connection.host = url.hostname.replace(/^\[|\]$/g, ''); connection.port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
    if (connection.servername === undefined && !net.isIP(connection.host)) connection.servername = connection.host;
    const redacted = url.origin + url.pathname;
    states.set(this, {url: url.href, redacted, secure: url.protocol === 'https:', auth, provider, fields, connection: Object.freeze(connection), timeout: opts.connectTimeout ?? 30000, pending: null});
    this.options = {path: undefined};
    debug('Creating forward proxy agent for %s', url.origin);
  }
  get proxy() {return new URL(states.get(this).url);}
  get proxyHeaders() {
    const state = states.get(this); if (state.provider) return state.provider;
    return Object.freeze(Object.fromEntries(Object.values(state.fields).map(({name, value}) => [name, value])));
  }
  get connectOpts() {const result = {}; for (const [key, value] of Object.entries(states.get(this).connection)) result[key] = snapshot(value); return Object.freeze(result);}
  setRequestProps(request, options) {
    const state = states.get(this), path = target(request, options);
    const fields = state.provider ? headers(state.provider.call(this)) : state.fields;
    const saved = buffered(request);
    request._header = null; request.path = path;
    for (const [lower, {name, value}] of Object.entries(fields)) if (lower !== 'proxy-authorization' || state.auth === undefined) request.setHeader(name, value);
    if (state.auth !== undefined) request.setHeader('Proxy-Authorization', state.auth);
    if (!Object.hasOwn(fields, 'proxy-connection')) request.setHeader('Proxy-Connection', this.keepAlive ? 'Keep-Alive' : 'close');
    rebuild(request, saved); prepared.set(request, this);
  }
  addRequest(request, options) {this.setRequestProps(request, options); return super.addRequest(request, options);}
  async connect(request, options) {
    const state = states.get(this);
    if (prepared.get(request) !== this) this.setRequestProps(request, options);
    if (request.destroyed) throw failure('ECONNRESET', 'Request cancelled before proxy connection');
    const socket = state.secure ? tls.connect(state.connection) : net.connect(state.connection);
    (state.pending ||= new Set()).add(socket);
    const cancel = () => socket.destroy();
    request.once('abort', cancel); request.once('close', cancel);
    let timer;
    try {
      await new Promise((resolve, reject) => {
        const cleanup = () => {socket.removeListener('error', failed); socket.removeListener('close', closed); socket.removeListener(state.secure ? 'secureConnect' : 'connect', ready);};
        const ready = () => {cleanup(); resolve();};
        const failed = error => {cleanup(); reject(error);};
        const closed = () => failed(failure('ECONNRESET', 'Proxy connection closed before it was ready'));
        socket.once('error', failed); socket.once('close', closed); socket.once(state.secure ? 'secureConnect' : 'connect', ready);
        if (state.timeout) timer = setTimeout(() => socket.destroy(failure('ETIMEDOUT', 'Proxy connection timed out')), state.timeout);
      });
      socket.on('error', ignoreError);
      const handedOff = () => {socket.removeListener('error', ignoreError); request.removeListener('socket', handedOff); request.removeListener('close', handedOff);};
      request.once('socket', handedOff); request.once('close', handedOff);
      const connect = {socket}; request.emit('proxyConnect', connect); this.emit('proxyConnect', connect, request);
      request.emit('proxy', {proxy: state.redacted, socket});
      if (request.destroyed || socket.destroyed) throw failure('ECONNRESET', 'Request cancelled during proxy connection');
      debug('Forward proxy connection ready'); return socket;
    } catch (error) {socket.destroy(); throw error;}
    finally {clearTimeout(timer); request.removeListener('abort', cancel); request.removeListener('close', cancel); state.pending.delete(socket);}
  }
  destroy() {for (const socket of states.get(this)?.pending ?? []) socket.destroy(); super.destroy();}
}
Object.defineProperty(HttpProxyAgent, 'protocols', {value: Object.freeze(['http', 'https']), enumerable: true});
module.exports.HttpProxyAgent = HttpProxyAgent;
