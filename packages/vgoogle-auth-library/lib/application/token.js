'use strict';
const jws = require('vjws'), {request} = require('vgaxios');
const {signingKey} = require('../signing-key');
const {callback, scopes, readJSON, readStream, tokens, serviceAccount} = require('./common');
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

class JWTAccess {
  constructor(email, key, keyId, eagerRefreshThresholdMillis = 300000) {
    Object.assign(this, {email,key,keyId,eagerRefreshThresholdMillis}); this.cache = new Map();
  }
  static getExpirationTime(iat) {return iat + 3600;}
  getCachedKey(url, scope) {
    scope = scopes(scope);
    if (!url && !scope) throw new Error('Scopes or url must be provided');
    return scope ? 's'+JSON.stringify([url || null,scope]) : 'u'+url;
  }
  getRequestHeaders(url, extra, scope) {
    scope = scopes(scope);
    let encoded = '', claims;
    if (extra != null) {
      if (typeof extra !== 'object' || Array.isArray(extra)) throw new TypeError('Additional claims must be an object');
      encoded = JSON.stringify(extra); claims = JSON.parse(encoded);
      if (!claims || Array.isArray(claims) || typeof claims !== 'object') throw new TypeError('Additional claims must serialize to an object');
      for (const key of ['iss','sub','iat','exp',scope ? 'scope' : 'aud']) if (Object.hasOwn(claims,key)) throw new Error('Reserved claim is not allowed: '+key);
    }
    const previous = this.identity;
    if (!previous || previous.email!==this.email || previous.key!==this.key || previous.keyId!==this.keyId || ArrayBuffer.isView(this.key)) {this.cache.clear();this.identity={email:this.email,key:this.key,keyId:this.keyId};}
    const base = this.getCachedKey(url,scope), cacheKey = encoded ? 'c'+JSON.stringify([base,encoded]) : base;
    const now = Date.now(), old = this.cache.get(cacheKey);
    if (old && old.expiry - now > this.eagerRefreshThresholdMillis) {
      this.cache.delete(cacheKey);this.cache.set(cacheKey,old);
      return new Headers(old.headers);
    }
    const iat = Math.floor(now/1000), exp = JWTAccess.getExpirationTime(iat);
    const payload = {iss:this.email,sub:this.email,...(scope ? {scope} : {aud:url}),iat,exp,...claims};
    const authorization = 'Bearer '+jws.sign({header:{alg:'RS256',typ:'JWT',...(this.keyId ? {kid:this.keyId} : {})},payload,secret:signingKey(this,this.key)});
    const headers=new Headers({authorization});
    this.cache.delete(cacheKey);this.cache.set(cacheKey,{headers,expiry:exp*1000});
    if (this.cache.size>500) this.cache.delete(this.cache.keys().next().value);
    return new Headers(headers);
  }
  fromJSON(json) {Object.assign(this,serviceAccount(json));}
  fromStream(stream,done) {return callback(readStream(stream).then(json=>this.fromJSON(json)),done,()=>[]);}
}

class TokenHandler {
  constructor(options = {}) {this.tokenOptions=options;}
  hasExpired() {return !this.tokenExpiresAt || this.tokenExpiresAt<=Date.now();}
  isTokenExpiring() {return !this.tokenExpiresAt || this.tokenExpiresAt-Date.now()<=(this.tokenOptions.eagerRefreshThresholdMillis ?? 300000);}
  getToken(force = false) {
    // A snapshot owns each exchange. Credential edits cannot poison an older
    // flight's cache, and mutable key buffers never reuse a cached token.
    const options={...this.tokenOptions,scope:scopes(this.tokenOptions.scope)};
    options.additionalClaims = options.additionalClaims == null ? undefined : JSON.parse(JSON.stringify(options.additionalClaims));
    const stamp=JSON.stringify([options.iss,options.email,options.keyFile,options.scope,options.sub,options.additionalClaims]);
    const same = this.stamp===stamp && this.key===options.key && !ArrayBuffer.isView(options.key);
    if (same && this.inFlightRequest) return this.inFlightRequest;
    if (same && !force && this.token && !this.isTokenExpiring()) return Promise.resolve(this.token);
    this.stamp=stamp;this.key=options.key;
    const promise = Promise.resolve().then(async()=>{
      if (!options.key && options.keyFile) {
        const json=await readJSON(options.keyFile);options.key=json.private_key;options.iss ||= json.client_email;
      }
      options.iss ||= options.email;
      if (!options.key || !options.iss) throw new Error('A signing key and issuer are required');
      const iat=Math.floor(Date.now()/1000);
      const payload={iss:options.iss,scope:options.scope,aud:TOKEN_URL,iat,exp:iat+3600,...(options.sub ? {sub:options.sub} : {}),...options.additionalClaims};
      const assertion=jws.sign({header:{alg:'RS256'},payload,secret:signingKey(this,options.key)});
      const response=await (options.transporter || {request}).request({url:TOKEN_URL,method:'POST',data:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),responseType:'json',retryConfig:{httpMethodsToRetry:['POST']}});
      const validated=tokens(response.data,true);
      if (this.inFlightRequest===promise) {this.token={...response.data};this.tokenExpiresAt=validated.expiry_date;}
      return {...response.data};
    }).finally(()=>{if(this.inFlightRequest===promise)this.inFlightRequest=undefined;});
    this.inFlightRequest=promise;return promise;
  }
}
class GoogleToken {
  constructor(options = {}) {this.tokenOptions={...options};this.tokenHandler=new TokenHandler(this.tokenOptions);}
  get accessToken() {return this.tokenHandler.token?.access_token;}
  get idToken() {return this.tokenHandler.token?.id_token;}
  get tokenType() {return this.tokenHandler.token?.token_type;}
  get refreshToken() {return this.tokenHandler.token?.refresh_token;}
  get expiresAt() {return this.tokenHandler.tokenExpiresAt;}
  hasExpired() {return this.tokenHandler.hasExpired();}
  isTokenExpiring() {return this.tokenHandler.isTokenExpiring();}
  getToken(options, extra) {const done=typeof options==='function'?options:undefined;return callback(this.tokenHandler.getToken((done?extra:options)?.forceRefresh ?? false),done);}
  revokeToken(done) {
    const saved=this.tokenHandler.token;
    const pending=Promise.resolve().then(async()=>{
      if (!saved?.access_token) throw new Error('No token to revoke');
      await (this.tokenOptions.transporter || {request}).request({url:'https://oauth2.googleapis.com/revoke',method:'POST',data:new URLSearchParams({token:saved.access_token})});
      if (this.tokenHandler.token===saved) {this.tokenHandler.token=undefined;this.tokenHandler.tokenExpiresAt=undefined;}
    });
    return callback(pending,done,()=>[]);
  }
}
Object.assign(exports,{JWTAccess,GoogleToken,TokenHandler});
