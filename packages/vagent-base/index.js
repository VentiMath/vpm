'use strict';
const http = require('node:http');
const https = require('node:https');
const { Socket } = require('node:net');
const { Duplex } = require('node:stream');
const { AsyncResource } = require('node:async_hooks');
const { getCallSites } = require('node:util');
const states = new WeakMap();
const delegations = new WeakMap();
const error = (code, message) => Object.assign(new Error(message), { code });
const normalize = value => value instanceof Error ? value : error('ERR_AGENT_CONNECT', 'Agent connection failed');
function reserve(agent, name) {
  if (agent.maxSockets === Infinity && agent.maxTotalSockets === Infinity) return null;
  const socket = new Socket({ writable:false });
  (agent.sockets[name] ||= []).push(socket);
  agent.totalSocketCount++;
  return socket;
}
function release(agent, name, socket) {
  if (!socket) return;
  const list = agent.sockets[name], index = list?.indexOf(socket) ?? -1;
  if (index !== -1) {
    list.splice(index,1); agent.totalSocketCount--;
    if (!list.length) delete agent.sockets[name];
  }
  socket.destroy();
}
function removeQueued(agent, request) {
  for (const name of Object.keys(agent.requests)) {
    const list = agent.requests[name], index = list.indexOf(request);
    if (index !== -1) { list.splice(index,1); if (!list.length) delete agent.requests[name]; return; }
  }
}
function drain(agent) {
  const state = states.get(agent);
  if (state.destroying || state.drainScheduled) return;
  state.drainScheduled = true;
  process.nextTick(() => {
    state.drainScheduled = false;
    if (state.destroying) return;
    for (const name of Object.keys(agent.requests)) {
      const request = agent.requests[name]?.[0];
      if (!request || state.pending?.has(request)) continue;
      const options = state.requestOptions?.get(request)?.options;
      if (!options) continue;
      if ((agent.sockets[name]?.length || 0) + (agent.freeSockets[name]?.length || 0) >= agent.maxSockets || agent.totalSocketCount >= agent.maxTotalSockets) continue;
      // Let the native queue dispatch preserve request async context and pooling.
      http.Agent.prototype.removeSocket.call(agent, { writable:false }, options);
    }
  });
}
class Agent extends http.Agent {
  constructor(options) {
    if (options !== undefined && (!options || typeof options !== 'object' || Array.isArray(options))) throw new TypeError('Agent options must be an object');
    const snapshot = { ...options };
    const timeout = snapshot.connectTimeout ?? 30000;
    if (!Number.isSafeInteger(timeout) || timeout < 0 || timeout > 2147483647) throw new RangeError('connectTimeout must be an integer from 0 to 2147483647');
    for (const field of ['maxSockets','maxTotalSockets','maxFreeSockets']) {
      const value = snapshot[field];
      if (value !== undefined && value !== Infinity && (!Number.isSafeInteger(value) || value < 1)) throw new RangeError(field + ' must be a positive integer or Infinity');
    }
    delete snapshot.connectTimeout;
    super(snapshot);
    states.set(this, { timeout, pending:null, requestOptions:null, transfer:null, destroying:false, drainScheduled:false });
  }
  connect() { throw error('ERR_AGENT_CONNECT', 'Agent subclasses must implement connect()'); }
  isSecureEndpoint(options) {
    if (options) {
      const secure = options.secureEndpoint;
      if (typeof secure === 'boolean') return secure;
      const protocol = options.protocol;
      if (typeof protocol === 'string') return protocol === 'https:';
      const defaultProtocol = options._defaultAgent?.protocol;
      if (typeof defaultProtocol === 'string') return defaultProtocol === 'https:';
    }
    const explicit = states.get(this)?.protocol;
    if (explicit !== undefined) return explicit === 'https:';
    // Native ClientRequest reads protocol/defaultPort before handing us options.
    // Structured call sites avoid user stack formatters and string formatting.
    if (getCallSites) return getCallSites(8).some(site => site.scriptName === 'node:https' || site.scriptName === 'https.js');
    const stack = new Error().stack;
    if (typeof stack !== 'string') throw error('ERR_AGENT_PROTOCOL', 'Cannot infer protocol; set agent.protocol explicitly');
    return stack.includes('(https.js:') || stack.includes('node:https:');
  }
  get protocol() { return states.get(this)?.protocol ?? (this.isSecureEndpoint() ? 'https:' : 'http:'); }
  set protocol(value) { const state=states.get(this);if(state){if(typeof value!=='string')throw new TypeError('protocol must be a string');state.protocol=value;} }
  get defaultPort() { return states.get(this)?.port ?? (this.protocol === 'https:' ? 443 : 80); }
  set defaultPort(value) { const state=states.get(this);if(state){if(!Number.isInteger(value)||value<1||value>65535)throw new RangeError('defaultPort must be from 1 to 65535');state.port=value;} }
  getName(options) {
    const state=states.get(this);
    const name=(this.isSecureEndpoint(options) ? https.Agent : http.Agent).prototype.getName.call(this,options);
    if(state?.addingRequest) (state.requestOptions ||= new WeakMap()).set(state.addingRequest,{options,name});
    return name;
  }
  addRequest(request, options, port, localAddress) {
    const state=states.get(this), previous=state.addingRequest;
    state.addingRequest=request;
    try {
      const result=super.addRequest(request,options,port,localAddress);
      const metadata=state.requestOptions?.get(request);
      if(metadata && this.requests[metadata.name]?.includes(request)) {
        const context=metadata.context=new AsyncResource('VPMAgentQueuedConnect');
        const cleanup=()=>{
          request.removeListener('socket',cleanup);request.removeListener('close',cleanup);
          if(metadata.context===context){metadata.context=null;context.emitDestroy();}
        };
        request.once('socket',cleanup);request.once('close',cleanup);
      }
      return result;
    }
    finally { state.addingRequest=previous; }
  }
  createSocket(request, options, callback) {
    if(typeof callback!=='function')throw new TypeError('callback must be a function');
    const state=states.get(this);
    const metadata=state.requestOptions?.get(request);
    if(metadata?.context) {
      const context=metadata.context;metadata.context=null;
      try{return context.runInAsyncScope(this.createSocket,this,request,options,callback);}
      finally{context.emitDestroy();}
    }
    let connectOptions,name,reservation,settled=false,timer,restore;
    const complete=(failure,socket)=>process.nextTick(callback,failure,socket);
    const cleanup=()=>{
      clearTimeout(timer);restore?.();request.removeListener('abort',abort);
      state.pending?.delete(request);release(this,name,reservation);
    };
    const fail=failure=>{
      if(settled)return;settled=true;
      cleanup();removeQueued(this,request);delegations.delete(request);
      complete(normalize(failure));drain(this);
    };
    const abort=()=>fail(error('ECONNRESET','Request cancelled before the connection was ready'));
    const accept=socket=>{
      if(settled){if(socket instanceof Duplex)socket.destroy();return;}
      if(request.destroyed){if(socket instanceof Duplex)socket.destroy();abort();return;}
      let addRequest;
      try {
        if(socket !== null && (typeof socket === 'object' || typeof socket === 'function')) addRequest=socket.addRequest;
      } catch(failure){fail(failure);return;}
      const delegate=typeof addRequest==='function';
      if(!(socket instanceof Duplex) && !delegate){fail(error('ERR_AGENT_SOCKET','connect() must return a Duplex stream or an agent with addRequest()'));return;}
      if(socket instanceof Duplex && socket.destroyed){fail(error('ERR_AGENT_SOCKET','connect() returned a destroyed stream'));return;}
      settled=true;cleanup();
      if(delegate){
        removeQueued(this,request);
        try { Reflect.apply(addRequest,socket,[request,connectOptions]); }
        catch(failure){removeQueued(this,request);delegations.delete(request);complete(normalize(failure));}
        drain(this);return;
      }
      delegations.delete(request);
      const transfer={socket},previous=state.transfer;state.transfer=transfer;
      let completed=false;
      const oncreate=(failure,value)=>{if(completed)return;completed=true;complete(failure,value);};
      try { super.createSocket(request,connectOptions,oncreate); }
      catch(failure){socket.destroy();removeQueued(this,request);if(!completed)oncreate(normalize(failure));drain(this);}
      finally { state.transfer=previous;if(transfer.socket)transfer.socket.destroy(); }
    };
    try {
      connectOptions={...options,secureEndpoint:this.isSecureEndpoint(options)};
      name=this.getName(connectOptions);
      if(request.destroyed){abort();return;}
      const seen=delegations.get(request)||new Set();
      if(seen.has(this)){fail(error('ERR_AGENT_CYCLE','Agent delegation cycle'));return;}
      seen.add(this);delegations.set(request,seen);
      reservation=reserve(this,name);
      (state.pending ||= new Map()).set(request,{fail});
      const result=this.connect(request,connectOptions);
      if(result instanceof Duplex || result instanceof http.Agent){accept(result);return;}
      Promise.resolve(result).then(accept,fail);
      if(state.timeout)timer=setTimeout(()=>fail(error('ETIMEDOUT','Agent connection timed out')),state.timeout);
      request.once('abort',abort);
      const descriptor=Object.getOwnPropertyDescriptor(request,'destroy'), original=request.destroy;
      const wrapped=function(...args){const value=Reflect.apply(original,this,args);if(this===request)abort();return value;};
      Object.defineProperty(request,'destroy',{value:wrapped,writable:true,configurable:true});
      restore=()=>{if(request.destroy===wrapped){if(descriptor)Object.defineProperty(request,'destroy',descriptor);else delete request.destroy;}};
      if(request.destroyed)abort();
    } catch(failure){fail(failure);}
  }
  createConnection() {
    const transfer=states.get(this).transfer;
    if(!transfer?.socket)throw error('ERR_AGENT_SOCKET','No socket is awaiting native handoff');
    const socket=transfer.socket;transfer.socket=undefined;return socket;
  }
  destroy() {
    const state=states.get(this);state.destroying=true;
    try {
      for(const operation of [...(state.pending?.values() || [])])operation.fail(error('ERR_AGENT_DESTROYED','Agent destroyed before connection completed'));
      for(const name of Object.keys(this.requests)){
        const queued=this.requests[name];delete this.requests[name];
        for(const request of queued){delegations.delete(request);process.nextTick(()=>request.onSocket(null,error('ERR_AGENT_DESTROYED','Agent destroyed before connection completed')));}
      }
      super.destroy();
    } finally { state.destroying=false; }
  }
}
module.exports.Agent=Agent;
const helpers=require('./helpers');
module.exports.toBuffer=helpers.toBuffer;
module.exports.json=helpers.json;
module.exports.req=helpers.req;
