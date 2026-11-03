'use strict';
const path=require('node:path'),os=require('node:os'),fs=require('node:fs/promises'),crypto=require('node:crypto');
const {promisify}=require('node:util'),{execFile}=require('node:child_process');
const metadata=require('vgcp-metadata');
const {callback,readJSON,readStream}=require('./common');
const {JWT,UserRefreshClient,Compute,IdTokenClient,Impersonated,DEFAULT_UNIVERSE}=require('./client');
const {signingKey}=require('../signing-key');

class GoogleAuth {
  constructor(options={}) {
    this.clientOptions={...options.clientOptions,...(options.universeDomain?{universeDomain:options.universeDomain}:{})};
    this.scopes=options.scopes;this.keyFilename=options.keyFilename || options.keyFile;this.jsonContent=options.credentials;
    this.cachedCredential=options.authClient;this.cachedProjectId=options.projectId;this.apiKey=options.apiKey;
    if(this.apiKey&&this.jsonContent)throw new TypeError('API keys and credentials cannot be combined');
  }
  setGapicJWTValues(client) {if(client instanceof JWT){client.defaultServicePath ??= this.defaultServicePath;client.useJWTAccessWithScope ??= this.useJWTAccessWithScope;client.defaultScopes ??= this.defaultScopes;}}
  getAnyScopes() {return this.scopes || this.defaultScopes;}
  fromJSON(json,options={}) {
    if(!json || typeof json!=='object' || Array.isArray(json))throw new TypeError('Credentials must be an object');
    let client;const config={...this.clientOptions,...options};
    switch(json.type) {
      case 'authorized_user': client=new UserRefreshClient(config);client.fromJSON(json);break;
      case 'impersonated_service_account': {
        const source=this.fromJSON(json.source_credentials,config),url=new URL(json.service_account_impersonation_url);
        const match=/^\/v1\/projects\/-\/serviceAccounts\/([^/]+):generateAccessToken$/.exec(url.pathname);
        if(!match || !['https:','http:'].includes(url.protocol) || url.username || url.password)throw new TypeError('Invalid impersonation endpoint');
        client=new Impersonated({...config,sourceClient:source,targetPrincipal:decodeURIComponent(match[1]),endpoint:url.origin,delegates:json.delegates,targetScopes:this.getAnyScopes() ? (Array.isArray(this.getAnyScopes())?this.getAnyScopes():[this.getAnyScopes()]) : [],lifetime:json.service_account_impersonation?.token_lifetime_seconds});break;
      }
      case undefined: case 'service_account': client=new JWT({...config,scopes:this.scopes});client.fromJSON(json);this.setGapicJWTValues(client);break;
      default: throw new TypeError('Credential provider is outside the VentiMath application contract: '+String(json.type));
    }
    if(process.env.GOOGLE_CLOUD_QUOTA_PROJECT)client.quotaProjectId=process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
    return client;
  }
  fromStream(stream,options={},done) {if(typeof options==='function'){done=options;options={};}return callback(readStream(stream).then(json=>{this.jsonContent=json;return this.cachedCredential=this.fromJSON(json,options);}),done);}
  fromAPIKey(apiKey,options={}) {const client=new JWT({...this.clientOptions,...options});client.fromAPIKey(apiKey);return client;}
  async loadFile(file,options) {
    const info=await fs.stat(file);if(!info.isFile())throw new TypeError('Credential path must be a file');
    const json=await readJSON(file);const client=this.fromJSON(json,options);this.jsonContent=json;return client;
  }
  async _checkIsGCE() {if(this._isGCE===undefined)this._isGCE=await metadata.isAvailable();return this._isGCE;}
  get isGCE() {return this._isGCE;}
  async discover(options) {
    const explicit=process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.google_application_credentials;
    if(explicit)return this.loadFile(explicit,options);
    const home=process.platform==='win32'?process.env.APPDATA:path.join(os.homedir(),'.config');
    const config=process.env.CLOUDSDK_CONFIG || (home && path.join(home,'gcloud'));
    if(config){const file=path.join(config,'application_default_credentials.json');
      try{return await this.loadFile(file,options);}catch(error){if(error.code!=='ENOENT')throw error;}
    }
    if(await this._checkIsGCE())return new Compute({...this.clientOptions,...options,scopes:this.getAnyScopes()});
    throw new Error('Could not load application default credentials');
  }
  async getClient() {
    if(this.cachedCredential){this.setGapicJWTValues(this.cachedCredential);return this.cachedCredential;}
    if(!this.pendingClient)this.pendingClient=Promise.resolve().then(async()=>{
      const client=this.jsonContent ? this.fromJSON(this.jsonContent) : this.keyFilename ? await this.loadFile(this.keyFilename) : this.apiKey ? this.fromAPIKey(this.apiKey) : await this.discover();
      return this.cachedCredential=client;
    }).finally(()=>{this.pendingClient=undefined;});
    return this.pendingClient;
  }
  getApplicationDefault(options={},done) {
    if(typeof options==='function'){done=options;options={};}
    const pending=(async()=>{
      if(!this.cachedCredential){
        if(!this.pendingClient)this.pendingClient=Promise.resolve().then(()=>this.discover(options)).then(client=>(this.cachedCredential=client)).finally(()=>{this.pendingClient=undefined;});
        await this.pendingClient;
      }
      let projectId=null;try{projectId=await this.getProjectId();}catch{}
      return {credential:this.cachedCredential,projectId};
    })();
    return callback(pending,done,value=>[value.credential,value.projectId]);
  }
  getProductionProjectId() {return process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.gcloud_project || process.env.google_cloud_project;}
  async getGCEProjectId() {return metadata.project('project-id');}
  async getDefaultServiceProjectId() {try{const {stdout}=await promisify(execFile)('gcloud',['config','config-helper','--format=json'],{timeout:5000,maxBuffer:1024*1024});return JSON.parse(stdout).configuration?.properties?.core?.project;}catch{return undefined;}}
  getProjectId(done) {return callback(this.getProjectIdAsync(),done);}
  async getProjectIdAsync() {
    if(this.cachedProjectId)return this.cachedProjectId;
    if(!this.projectFlight)this.projectFlight=(async()=>{
      let project=this.getProductionProjectId() || this.jsonContent?.project_id;
      if(!project){const client=await this.getClient();project=client.projectId || this.jsonContent?.project_id;
        if(!project)project=await this.getDefaultServiceProjectId();
        if(!project&&client instanceof Compute)project=await this.getGCEProjectId();
      }
      if(!project)throw new Error('Unable to detect a Project Id in the current environment');
      return this.cachedProjectId=project;
    })().finally(()=>{this.projectFlight=undefined;});
    return this.projectFlight;
  }
  async getUniverseDomainFromMetadataServer() {try{return await metadata.universe('universe-domain') || DEFAULT_UNIVERSE;}catch(error){if(error.response?.status===404)return DEFAULT_UNIVERSE;throw error;}}
  async getUniverseDomain() {
    if(this.clientOptions.universeDomain)return this.clientOptions.universeDomain;
    let client;
    // Endpoint discovery also serves credential-free emulator clients. A failed
    // ADC lookup must not prevent selecting the default Google universe.
    try{client=await this.getClient();}catch{return DEFAULT_UNIVERSE;}
    if(client instanceof Compute)client.universeDomain=await this.getUniverseDomainFromMetadataServer();
    return client.universeDomain || DEFAULT_UNIVERSE;
  }
  getCredentials(done) {return callback((async()=>{
    const client=await this.getClient();
    if(client instanceof JWT){await client.getCredentials();return {client_email:client.email,private_key:client.key,universe_domain:client.universeDomain};}
    if(client instanceof Impersonated)return {client_email:client.targetPrincipal};
    if(this.jsonContent)return {client_email:this.jsonContent.client_email,private_key:this.jsonContent.private_key,universe_domain:this.jsonContent.universe_domain};
    if(client instanceof Compute)return {client_email:await metadata.instance('service-accounts/default/email'),universe_domain:await this.getUniverseDomain()};
    throw new Error('No credentials found');
  })(),done);}
  async getAccessToken() {return (await (await this.getClient()).getAccessToken()).token;}
  async getRequestHeaders(url) {return (await this.getClient()).getRequestHeaders(url);}
  async authorizeRequest(options={}) {const headers=new Headers(options.headers);(await this.getRequestHeaders(options.url || options.uri)).forEach((value,key)=>headers.set(key,value));return {...options,headers};}
  async request(options) {return (await this.getClient()).request(options);}
  async fetch(input,init) {return (await this.getClient()).fetch(input,init);}
  async getIdTokenClient(targetAudience) {const idTokenProvider=await this.getClient();if(typeof idTokenProvider.fetchIdToken!=='function')throw new TypeError('Credentials cannot fetch ID tokens');return new IdTokenClient({...this.clientOptions,targetAudience,idTokenProvider});}
  async sign(data,endpoint) {
    const client=await this.getClient();
    if(client instanceof JWT){await client.getCredentials();if(client.key)return crypto.sign('sha256',Buffer.from(data),signingKey(client,client.key)).toString('base64');}
    if(client instanceof Impersonated)return (await client.sign(data)).signedBlob;
    const credentials=await this.getCredentials();if(!credentials.client_email)throw new Error('Cannot sign without client_email');
    const base=endpoint || 'https://iamcredentials.'+await this.getUniverseDomain()+'/v1/projects/-/serviceAccounts/';
    const response=await this.request({url:base+encodeURIComponent(credentials.client_email)+':signBlob',method:'POST',data:{payload:Buffer.from(data).toString('base64')},retry:true,retryConfig:{httpMethodsToRetry:['POST']}});
    return response.data.signedBlob;
  }
}
exports.GoogleAuth=GoogleAuth;
