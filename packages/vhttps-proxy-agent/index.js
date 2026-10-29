'use strict';
const net=require('node:net'),tls=require('node:tls');
const {Duplex}=require('node:stream');
const {Agent}=require('vagent-base');
const debug=require('vdebug')('https-proxy-agent');
const {readResponse,failure}=require('./lib/response');
const {snapshot,headers,authority,servername,compileHeaders}=require('./lib/options');
const states=new WeakMap();
const omitted=new Set(['headers','maxProxyHeaderSize','connectTimeout','host','hostname','port','path','protocol','keepAlive','keepAliveMsecs','maxSockets','maxTotalSockets','maxFreeSockets','scheduling']);
class HttpsProxyAgent extends Agent{
  constructor(proxy,options){
    if(options!==undefined&&(!options||typeof options!=='object'||Array.isArray(options)))throw new TypeError('Proxy agent options must be an object');
    const opts={...options};super(opts);
    let url;
    try{url=new URL(typeof proxy==='string'?proxy:proxy.href);}catch{throw new TypeError('Proxy must be a valid HTTP or HTTPS URL');}
    if(url.protocol!=='http:'&&url.protocol!=='https:')throw new TypeError('Proxy URL must use HTTP or HTTPS');
    if(!url.hostname)throw new TypeError('Proxy URL must include a hostname');
    const limit=opts.maxProxyHeaderSize??16384;
    if(!Number.isSafeInteger(limit)||limit<1||limit>0x7fffffff)throw new RangeError('maxProxyHeaderSize must be a positive integer at most 2147483647');
    let auth=null;
    if(url.username||url.password){try{auth=Buffer.from(decodeURIComponent(url.username)+':'+decodeURIComponent(url.password)).toString('base64');}catch{throw new TypeError('Invalid percent encoding in proxy credentials');}}
    const configured=opts.headers??{};
    const provider=typeof configured==='function'?configured:null;
    const fields=provider?null:headers(configured);
    const connection={ALPNProtocols:['http/1.1']};
    for(const key of Object.keys(opts))if(!omitted.has(key))connection[key]=snapshot(opts[key]);
    if(connection.ALPNProtocols!==undefined){
      const protocols=connection.ALPNProtocols;
      if(!Array.isArray(protocols)||protocols.some(p=>String(p)!=='http/1.1'))throw new TypeError('CONNECT proxy ALPNProtocols must contain only http/1.1');
    }
    connection.host=url.hostname.replace(/^\[|\]$/g,'');connection.port=Number(url.port)||(url.protocol==='https:'?443:80);
    const state={url:url.href,secure:url.protocol==='https:',connection:Object.freeze(servername(connection)),auth,provider,fields,limit,timeout:opts.connectTimeout??30000,pending:new Set()};
    state.keepAlive=this.keepAlive;
    state.staticHeaders=provider?null:compileHeaders(fields,auth,this.keepAlive);
    states.set(this,state);
    // Proxy TLS configuration must never disable verification at the destination.
    this.options={path:undefined};
    debug('Creating CONNECT agent for %s',url.origin);
  }
  get proxy(){return new URL(states.get(this).url);}
  get connectOpts(){const result={};for(const [name,value]of Object.entries(states.get(this).connection))result[name]=snapshot(value);return Object.freeze(result);}
  get proxyHeaders(){const state=states.get(this);if(state.provider)return state.provider;const values=Object.create(null);for(const {name,value}of Object.values(state.fields))values[name]=value;return Object.freeze(values);}
  async connect(request,options){
    const state=states.get(this),destination=authority(options);
    if(request.destroyed)throw failure('ECONNRESET','Request cancelled before CONNECT');
    if(!state.provider&&state.keepAlive!==this.keepAlive){state.keepAlive=this.keepAlive;state.staticHeaders=compileHeaders(state.fields,state.auth,this.keepAlive);}
    const extra=state.provider?compileHeaders(headers(state.provider.call(this)),state.auth,this.keepAlive):state.staticHeaders;
    const payload='CONNECT '+destination.text+' HTTP/1.1\r\nHost: '+destination.text+'\r\n'+extra+'\r\n';
    let socket,timer;
    const cancel=()=>socket?.destroy();
    const operation={cancel};state.pending.add(operation);
    try{
      socket=state.secure?tls.connect(state.connection):net.connect(state.connection);
      const response=readResponse(socket,state.limit);
      request.once('abort',cancel);request.once('close',cancel);
      if(state.timeout)timer=setTimeout(()=>socket.destroy(failure('ETIMEDOUT','Proxy CONNECT timed out')),state.timeout);
      try{socket.write(payload,'latin1');}catch(error){socket.destroy();await response.catch(()=>{});throw error;}
      const {connect,head,buffered}=await response;
      const statusCode=connect.statusCode;
      request.emit('proxyConnect',connect);this.emit('proxyConnect',connect,request);
      if(request.destroyed||socket.destroyed)throw failure('ECONNRESET','Request cancelled during CONNECT');
      debug('CONNECT completed with status %d',statusCode);
      if(statusCode>=200&&statusCode<300){
        if(head.length)socket.unshift(head);
        request.once('socket',resume);
        if(!options.secureEndpoint)return socket;
        const target={...options,host:destination.host};
        const secure=servername(target);delete secure.host;delete secure.port;delete secure.path;
        return tls.connect({...secure,socket});
      }
      socket.destroy();
      const replay=new ReplaySocket();
      request.once('socket',value=>{if(!request.destroyed){value.push(buffered);value.push(null);}else value.destroy();});
      return replay;
    }catch(error){socket?.destroy();throw error;}
    finally{clearTimeout(timer);request.removeListener('abort',cancel);request.removeListener('close',cancel);state.pending.delete(operation);}
  }
  destroy(){for(const operation of states.get(this)?.pending||[])operation.cancel();super.destroy();}
}
class ReplaySocket extends Duplex{
  _read(){}
  _write(chunk,encoding,done){done();}
  setTimeout(){return this;}
  setNoDelay(){return this;}
  setKeepAlive(){return this;}
}
function resume(socket){socket.resume();}
Object.defineProperty(HttpsProxyAgent,'protocols',{value:Object.freeze(['http','https']),enumerable:true});
module.exports.HttpsProxyAgent=HttpsProxyAgent;
