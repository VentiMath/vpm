'use strict';
const {EventEmitter} = require('node:events');
const {Gaxios} = require('vgaxios'), metadata = require('vgcp-metadata');
const {callback, tokens, scopes, serviceAccount, readStream, readJSON} = require('./common');
const {JWTAccess, GoogleToken} = require('./token');
const {verifyToken} = require('../verify-token');
const DEFAULT_UNIVERSE = 'googleapis.com';
const authHeaders = (input, extra) => {const headers=new Headers(input);new Headers(extra).forEach((value,key)=>headers.set(key,value));return headers;};
const replayable = value => !value || !(typeof value.pipe==='function' || typeof value.getReader==='function' || typeof value[Symbol.asyncIterator]==='function');

class AuthClient extends EventEmitter {
  constructor(options = {}) {
    super();this.credentials=options.credentials || {};
    this.projectId=options.projectId ?? options.project_id ?? null;
    this.quotaProjectId=options.quotaProjectId ?? options.quota_project_id;
    this.universeDomain=options.universeDomain ?? options.universe_domain ?? DEFAULT_UNIVERSE;
    this.apiKey=options.apiKey;this.eagerRefreshThresholdMillis=options.eagerRefreshThresholdMillis ?? 300000;
    this.forceRefreshOnFailure=options.forceRefreshOnFailure ?? false;
    this.transporter=options.transporter ?? new Gaxios(options.transporterOptions);
    if (options.useAuthRequestParameters!==false) {
      this.transporter.interceptors?.request.add(AuthClient.DEFAULT_REQUEST_INTERCEPTOR);
      this.transporter.interceptors?.response.add(AuthClient.DEFAULT_RESPONSE_INTERCEPTOR);
    }
  }
  setCredentials(value) {this.credentials=value;}
  addSharedMetadataHeaders(headers) {if(this.quotaProjectId&&!headers.has('x-goog-user-project'))headers.set('x-goog-user-project',this.quotaProjectId);return headers;}
  addUserProjectAndAuthHeaders(target,source) {for(const key of ['authorization','x-goog-user-project'])if(source.has(key))target.set(key,source.get(key));return target;}
  fetch(input, init = {}) {
    const request=typeof input==='object' && !(input instanceof URL) ? input : undefined;
    const options={...(request ? {method:request.method,body:request.body,signal:request.signal,credentials:request.credentials,redirect:request.redirect} : {}),...init};
    options.headers=authHeaders(request?.headers,init.headers);options.url=request?.url ?? input;
    return this.request(options);
  }
  static log = require('vgoogle-logging-utils').log('auth');
  static RequestMethodNameSymbol = Symbol('request method name');
  static setMethodName(config,name) {try{config[this.RequestMethodNameSymbol]=name;}catch{}}
  static debug(message) {try{AuthClient.log.debug(message);}catch{}}
  static DEFAULT_REQUEST_INTERCEPTOR = {resolved:async config=>{
    if(!config.headers.has('x-goog-api-client'))config.headers.set('x-goog-api-client','gl-node/'+process.versions.node);
    if(!config.headers.has('user-agent'))config.headers.set('user-agent','google-api-nodejs-client/11.3.2');
    AuthClient.debug('Authentication request');return config;
  }};
  static DEFAULT_RESPONSE_INTERCEPTOR = {resolved:async value=>{AuthClient.debug('Authentication response');return value;},rejected:async error=>{AuthClient.debug('Authentication request error');throw error;}};
  static get RETRY_CONFIG() {return {retry:true,retryConfig:{httpMethodsToRetry:['GET','PUT','POST','HEAD','OPTIONS','DELETE']}};}
}
class LoginTicket {
  constructor(envelope,payload) {this.envelope=envelope;this.payload=payload;}
  getEnvelope() {return this.envelope;}
  getPayload() {return this.payload;}
  getUserId() {return this.payload?.sub ?? null;}
  getAttributes() {return {envelope:this.envelope,payload:this.payload};}
}
class PassThroughClient extends AuthClient {
  request(options) {return this.transporter.request(options);}
  async getAccessToken() {return {};}
  async getRequestHeaders() {return new Headers();}
}
class OAuth2Client extends AuthClient {
  constructor(options = {}, secret, redirectUri) {
    if(typeof options!=='object')options={clientId:options,clientSecret:secret,redirectUri};
    super(options);this._clientId=options.clientId ?? options.client_id;this._clientSecret=options.clientSecret ?? options.client_secret;
    this.redirectUri=options.redirectUri;this.refreshHandler=options.refreshHandler;this.refreshTokenPromises=new Map();
    this.endpoints={oauth2TokenUrl:'https://oauth2.googleapis.com/token',oauth2RevokeUrl:'https://oauth2.googleapis.com/revoke',oauth2FederatedSignonPemCertsUrl:'https://www.googleapis.com/oauth2/v1/certs',...options.endpoints};
    this.issuers=options.issuers ?? ['accounts.google.com','https://accounts.google.com',this.universeDomain];
  }
  isTokenExpiring() {return this.credentials.expiry_date!=null && this.credentials.expiry_date-Date.now()<=this.eagerRefreshThresholdMillis;}
  refreshToken(refreshToken = this.credentials.refresh_token) {
    const key=refreshToken ?? this.refreshHandler;
    if(this.refreshTokenPromises.has(key))return this.refreshTokenPromises.get(key);
    const pending=Promise.resolve().then(()=>this.refreshTokenNoCache(refreshToken)).finally(()=>{if(this.refreshTokenPromises.get(key)===pending)this.refreshTokenPromises.delete(key);});
    this.refreshTokenPromises.set(key,pending);return pending;
  }
  async refreshTokenNoCache(refreshToken) {
    if(this.refreshHandler) {const result=tokens(await this.refreshHandler());this.emit('tokens',result);return {tokens:result};}
    if(!refreshToken)throw new Error('No refresh token is set.');
    const data=new URLSearchParams({grant_type:'refresh_token',refresh_token:refreshToken});
    if(this._clientId)data.set('client_id',this._clientId);if(this._clientSecret)data.set('client_secret',this._clientSecret);
    const res=await this.transporter.request({...this.constructor.RETRY_CONFIG,url:this.endpoints.oauth2TokenUrl,method:'POST',data});
    const result=tokens(res.data);this.emit('tokens',result);return {tokens:result,res};
  }
  async refreshAccessTokenAsync() {
    const before=this.credentials, result=await this.refreshToken(before.refresh_token);
    const credentials={...result.tokens,refresh_token:before.refresh_token};
    if(this.credentials===before)this.credentials=credentials;
    return {credentials:this.credentials,res:result.res};
  }
  refreshAccessToken(done) {return callback(this.refreshAccessTokenAsync(),done,value=>[value.credentials,value.res]);}
  getAccessToken(done) {return callback(this.getAccessTokenAsync(),done,value=>[value.token,value.res]);}
  async getAccessTokenAsync() {
    if(this.credentials.access_token&&!this.isTokenExpiring())return {token:this.credentials.access_token};
    const result=await this.refreshAccessTokenAsync();
    if(!result.credentials.access_token)throw new Error('Could not refresh access token');
    return {token:result.credentials.access_token,res:result.res};
  }
  async getRequestMetadataAsync() {
    if(this.apiKey&&!this.credentials.access_token)return {headers:this.addSharedMetadataHeaders(new Headers({'x-goog-api-key':this.apiKey}))};
    const {token,res}=await this.getAccessToken();
    return {headers:this.addSharedMetadataHeaders(new Headers({authorization:(this.credentials.token_type || 'Bearer')+' '+token})),res};
  }
  async getRequestHeaders(url) {return (await this.getRequestMetadataAsync(url)).headers;}
  request(options,done) {return callback(this.requestAsync(options),done);}
  async requestAsync(options) {
    for(let attempt=0;;attempt++) {
      const headers=authHeaders(options.headers,await this.getRequestHeaders(options.url));
      if(this.apiKey)headers.set('x-goog-api-key',this.apiKey);
      try{return await this.transporter.request({...options,headers});}
      catch(error){
        if(attempt || ![401,403].includes(error.response?.status) || !replayable(options.data ?? options.body) ||
          !this.credentials.access_token || !(this.credentials.refresh_token || this.refreshHandler) ||
          this.credentials.expiry_date && !this.forceRefreshOnFailure)throw error;
        await this.refreshAccessTokenAsync();
      }
    }
  }
  async verifySignedJwtWithCertsAsync(token,certs,audience,issuers,maxExpiry=86400) {
    const parsed=verifyToken(token,certs,audience,issuers,maxExpiry,300);return new LoginTicket(parsed.header,parsed.payload);
  }
  verifyIdToken(options,done) {return callback((async()=>{
    if(!options?.idToken)throw new TypeError('An ID token is required');
    const {certs}=await this.getFederatedSignonCertsAsync();
    return this.verifySignedJwtWithCertsAsync(options.idToken,certs,options.audience,this.issuers,options.maxExpiry);
  })(),done);}
  async getFederatedSignonCertsAsync() {
    if(this.certificateCache&&this.certificateExpiry>Date.now())return {certs:this.certificateCache,format:'PEM'};
    if(!this.certificateFlight)this.certificateFlight=this.transporter.request({url:this.endpoints.oauth2FederatedSignonPemCertsUrl,...this.constructor.RETRY_CONFIG}).then(res=>{
      const age=Number(/(?:^|,)\s*max-age=(\d+)/i.exec(new Headers(res.headers).get('cache-control') || '')?.[1] || 0);
      this.certificateCache=res.data;this.certificateExpiry=Date.now()+age*1000;return {certs:res.data,format:'PEM',res};
    }).finally(()=>{this.certificateFlight=undefined;});
    return this.certificateFlight;
  }
  revokeToken(token,done) {return callback(this.transporter.request({url:this.endpoints.oauth2RevokeUrl,method:'POST',data:new URLSearchParams({token})}),done);}
  revokeCredentials(done) {const before=this.credentials;return callback(this.revokeToken(before.access_token).then(res=>{if(this.credentials===before)this.credentials={};return res;}),done);}
}
class UserRefreshClient extends OAuth2Client {
  constructor(options={},secret,refreshToken,eager,force) {
    if(typeof options==='string')options={clientId:options,clientSecret:secret,refreshToken,eagerRefreshThresholdMillis:eager,forceRefreshOnFailure:force};
    super(options);this._refreshToken=options.refreshToken;this.credentials={...this.credentials,refresh_token:options.refreshToken ?? this.credentials.refresh_token};
  }
  fromJSON(json) {if(json?.type!=='authorized_user')throw new TypeError('Expected authorized_user credentials');for(const key of ['client_id','client_secret','refresh_token'])if(typeof json[key]!=='string'||!json[key])throw new TypeError('Missing '+key);this._clientId=json.client_id;this._clientSecret=json.client_secret;this._refreshToken=json.refresh_token;this.credentials={refresh_token:json.refresh_token};this.quotaProjectId=json.quota_project_id;this.universeDomain=json.universe_domain || DEFAULT_UNIVERSE;}
  fromStream(stream,done) {return callback(readStream(stream).then(json=>this.fromJSON(json)),done,()=>[]);}
}
class JWT extends OAuth2Client {
  constructor(options={},keyFile,key,scope,subject,keyId) {
    if(typeof options==='string')options={email:options,keyFile,key,scopes:scope,subject,keyId};
    super(options);for(const name of ['email','keyFile','key','keyId','scopes','subject','additionalClaims','defaultScopes','defaultServicePath','useJWTAccessWithScope'])this[name]=options[name];
    this.credentials={expiry_date:1,refresh_token:'jwt-placeholder'};
  }
  hasUserScopes() {return !!scopes(this.scopes);}
  hasAnyScopes() {return !!scopes(this.scopes || this.defaultScopes);}
  fromJSON(json) {Object.assign(this,serviceAccount(json));}
  fromStream(stream,done) {return callback(readStream(stream).then(json=>this.fromJSON(json)),done,()=>[]);}
  async getCredentials() {if(!this.key&&this.keyFile){const json=await readJSON(this.keyFile);this.fromJSON(json);}return {private_key:this.key,client_email:this.email};}
  createGToken() {return new GoogleToken({key:this.key,keyFile:this.keyFile,iss:this.email,sub:this.subject,scope:this.scopes || this.defaultScopes,additionalClaims:this.additionalClaims,transporter:this.transporter,eagerRefreshThresholdMillis:this.eagerRefreshThresholdMillis});}
  async refreshTokenNoCache() {await this.getCredentials();this.gtoken=this.createGToken();const data=await this.gtoken.getToken({forceRefresh:true}),result=tokens(data,true);this.emit('tokens',result);return {tokens:result,res:null};}
  authorize(done) {return callback(this.refreshAccessTokenAsync().then(result=>result.credentials),done);}
  createScoped(scope) {const next=new JWT({email:this.email,key:this.key,keyId:this.keyId,keyFile:this.keyFile,scopes:scope,subject:this.subject,additionalClaims:this.additionalClaims});next.quotaProjectId=this.quotaProjectId;next.universeDomain=this.universeDomain;return next;}
  fromAPIKey(key) {if(typeof key!=='string')throw new TypeError('API key must be a string');this.apiKey=key;}
  async fetchIdToken(targetAudience) {await this.getCredentials();const token=new GoogleToken({key:this.key,iss:this.email,sub:this.subject,scope:this.scopes || this.defaultScopes,additionalClaims:{target_audience:targetAudience},transporter:this.transporter});const result=await token.getToken({forceRefresh:true});if(!result.id_token)throw new Error('Failed to fetch ID token');return result.id_token;}
  async getRequestMetadataAsync(url) {
    url=this.defaultServicePath ? 'https://'+this.defaultServicePath+'/' : url;
    if(this.subject&&this.universeDomain!==DEFAULT_UNIVERSE)throw new RangeError('Domain-wide delegation requires the default universe');
    if(!this.apiKey&&(!this.hasUserScopes()&&url || this.useJWTAccessWithScope&&this.hasAnyScopes() || this.universeDomain!==DEFAULT_UNIVERSE)){
      if(this.additionalClaims?.target_audience){const result=await this.refreshToken();return {headers:this.addSharedMetadataHeaders(new Headers({authorization:'Bearer '+result.tokens.id_token}))};}
      await this.getCredentials();this.access ||= new JWTAccess();
      Object.assign(this.access,{email:this.email,key:this.key,keyId:this.keyId,eagerRefreshThresholdMillis:this.eagerRefreshThresholdMillis});
      const useScope=this.useJWTAccessWithScope || this.universeDomain!==DEFAULT_UNIVERSE;
      return {headers:this.addSharedMetadataHeaders(this.access.getRequestHeaders(url,this.additionalClaims,useScope ? this.scopes || (!url ? this.defaultScopes : undefined) : undefined))};
    }
    return this.hasAnyScopes()||this.apiKey ? super.getRequestMetadataAsync(url) : {headers:new Headers()};
  }
}
class Compute extends OAuth2Client {
  constructor(options={}) {super(options);this.credentials={expiry_date:1,refresh_token:'compute-placeholder'};this.serviceAccountEmail=options.serviceAccountEmail || 'default';this.scopes=options.scopes ? (Array.isArray(options.scopes)?options.scopes:[options.scopes]) : [];}
  async refreshTokenNoCache() {const data=await metadata.instance({property:'service-accounts/'+encodeURIComponent(this.serviceAccountEmail)+'/token',...(this.scopes.length?{params:{scopes:this.scopes.join(',')}}:{})});const result=tokens(data);this.emit('tokens',result);return {tokens:result,res:null};}
  fetchIdToken(audience) {return metadata.instance({property:'service-accounts/'+encodeURIComponent(this.serviceAccountEmail)+'/identity',params:{format:'full',audience}});}
}
class IdTokenClient extends OAuth2Client {
  constructor(options) {super(options);this.targetAudience=options.targetAudience;this.idTokenProvider=options.idTokenProvider;}
  getIdTokenExpiryDate(token) {const payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));const expiry=payload.exp*1000;if(typeof payload.exp!=='number'||!Number.isFinite(expiry)||expiry<=0||expiry>8.64e15)throw new Error('Invalid ID token expiry');return expiry;}
  async getRequestMetadataAsync() {
    if(!this.credentials.id_token || !this.credentials.expiry_date || this.isTokenExpiring()){
      if(!this.identityFlight)this.identityFlight=Promise.resolve().then(()=>this.idTokenProvider.fetchIdToken(this.targetAudience)).then(token=>{this.credentials={id_token:token,expiry_date:this.getIdTokenExpiryDate(token)};}).finally(()=>{this.identityFlight=undefined;});
      await this.identityFlight;
    }
    return {headers:this.addSharedMetadataHeaders(new Headers({authorization:'Bearer '+this.credentials.id_token}))};
  }
}
class Impersonated extends OAuth2Client {
  constructor(options={}) {
    super(options);this.sourceClient=options.sourceClient;this.targetPrincipal=options.targetPrincipal;this.targetScopes=[...(options.targetScopes || [])];this.delegates=[...(options.delegates || [])];this.lifetime=options.lifetime ?? 3600;
    this.endpoint=options.endpoint || 'https://iamcredentials.'+this.universeDomain;this.credentials={expiry_date:1,refresh_token:'impersonated-placeholder'};
    if(this.sourceClient?.universeDomain && this.sourceClient.universeDomain!==this.universeDomain)throw new RangeError('Credential universe domains must match');
  }
  getTargetPrincipal() {return this.targetPrincipal;}
  async call(method,data) {await this.sourceClient.getAccessToken();return this.sourceClient.request({...this.constructor.RETRY_CONFIG,url:this.endpoint+'/v1/projects/-/serviceAccounts/'+encodeURIComponent(this.targetPrincipal)+':'+method,method:'POST',data:{delegates:this.delegates,...data}});}
  async refreshTokenNoCache() {const res=await this.call('generateAccessToken',{scope:this.targetScopes,lifetime:this.lifetime+'s'});const result=tokens({access_token:res.data.accessToken,expiry_date:Date.parse(res.data.expireTime)});this.emit('tokens',result);return {tokens:result,res};}
  async sign(value) {return (await this.call('signBlob',{payload:Buffer.from(value).toString('base64')})).data;}
  async fetchIdToken(audience,options) {return (await this.call('generateIdToken',{audience,includeEmail:options?.includeEmail ?? true,useEmailAzp:options?.includeEmail ?? true})).data.token;}
}
Object.assign(exports,{DEFAULT_UNIVERSE,AuthClient,OAuth2Client,UserRefreshClient,JWT,Compute,IdTokenClient,Impersonated,LoginTicket,PassThroughClient});
