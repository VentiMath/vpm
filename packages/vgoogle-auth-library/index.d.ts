import type {Gaxios, GaxiosOptions, GaxiosResponse, Headers, PreparedURL} from 'vgaxios';
import {EventEmitter, Readable} from './lib/platform';
export * as gaxios from 'vgaxios';
export * as gcpMetadata from 'vgcp-metadata';
export declare const DEFAULT_UNIVERSE = 'googleapis.com';
export interface Credentials {access_token?:string|null;refresh_token?:string|null;id_token?:string|null;token_type?:string|null;expiry_date?:number|null;scope?:string;}
export interface CredentialBody {client_email?:string;private_key?:string;universe_domain?:string;}
export interface JWTInput extends CredentialBody {type?:string;project_id?:string;private_key_id?:string;client_id?:string;client_secret?:string;refresh_token?:string;quota_project_id?:string;source_credentials?:JWTInput;service_account_impersonation_url?:string;delegates?:string[];service_account_impersonation?:{token_lifetime_seconds?:number};}
export interface TokenPayload {iss:string;aud:string;iat:number;exp:number;sub:string;email?:string;email_verified?:boolean;[key:string]:unknown;}
export type ProjectIdCallback = (error:Error|null,projectId?:string|null)=>void;
export type Callback<T> = (error:Error|null,result?:T)=>void;
export interface AuthClientOptions {credentials?:Credentials;projectId?:string;project_id?:string;quotaProjectId?:string;quota_project_id?:string;universeDomain?:string;universe_domain?:string;apiKey?:string;transporter?:Pick<Gaxios,'request'>;transporterOptions?:GaxiosOptions;eagerRefreshThresholdMillis?:number;forceRefreshOnFailure?:boolean;useAuthRequestParameters?:boolean;}
export declare abstract class AuthClient extends EventEmitter {
  constructor(options?:AuthClientOptions);
  credentials:Credentials;projectId:string|null;quotaProjectId?:string;universeDomain:string;apiKey?:string;
  transporter:Gaxios;eagerRefreshThresholdMillis:number;forceRefreshOnFailure:boolean;
  setCredentials(value:Credentials):void;
  on(event:'tokens',listener:(credentials:Credentials)=>void):this;
  on(event:string|symbol,listener:(...args:any[])=>void):this;
  addSharedMetadataHeaders(headers:Headers):Headers;
  addUserProjectAndAuthHeaders(target:Headers,source:Headers):Headers;
  abstract getAccessToken():Promise<{token?:string|null;res?:GaxiosResponse|null}>;
  abstract getRequestHeaders(url?:string|PreparedURL):Promise<Headers>;
  abstract request<T=any>(options:GaxiosOptions):Promise<GaxiosResponse<T>>;
  fetch:Gaxios['fetch'];
  static setMethodName(config:GaxiosOptions,name:string):void;
  static readonly RETRY_CONFIG:GaxiosOptions;
}
export interface OAuth2ClientOptions extends AuthClientOptions {clientId?:string;client_id?:string;clientSecret?:string;client_secret?:string;redirectUri?:string;endpoints?:{oauth2TokenUrl?:string;oauth2RevokeUrl?:string;oauth2FederatedSignonPemCertsUrl?:string};issuers?:string[];refreshHandler?:()=>Promise<Credentials>;}
export interface VerifyIdTokenOptions {idToken:string;audience?:string|string[];maxExpiry?:number;}
export declare class LoginTicket {
  constructor(envelope?:unknown,payload?:TokenPayload);
  getEnvelope():unknown;getPayload():TokenPayload|undefined;getUserId():string|null;getAttributes():{envelope:unknown;payload:TokenPayload|undefined};
}
export declare class OAuth2Client extends AuthClient {
  constructor(options?:OAuth2ClientOptions);
  constructor(clientId?:string,clientSecret?:string,redirectUri?:string);
  refreshHandler?:()=>Promise<Credentials>;
  endpoints:Required<NonNullable<OAuth2ClientOptions['endpoints']>>;
  isTokenExpiring():boolean;
  getAccessToken():Promise<{token?:string|null;res?:GaxiosResponse|null}>;
  getAccessToken(done:(error:Error|null,token?:string|null,res?:GaxiosResponse|null)=>void):void;
  getRequestHeaders(url?:string|PreparedURL):Promise<Headers>;
  getRequestMetadataAsync(url?:string|PreparedURL):Promise<{headers:Headers;res?:GaxiosResponse|null}>;
  refreshToken(token?:string|null):Promise<{tokens:Credentials;res?:GaxiosResponse|null}>;
  refreshAccessToken():Promise<{credentials:Credentials;res?:GaxiosResponse|null}>;
  refreshAccessToken(done:(error:Error|null,credentials?:Credentials,res?:GaxiosResponse|null)=>void):void;
  request<T=any>(options:GaxiosOptions):Promise<GaxiosResponse<T>>;
  request<T=any>(options:GaxiosOptions,done:Callback<GaxiosResponse<T>>):void;
  verifySignedJwtWithCertsAsync(token:string,certs:Record<string,unknown>,audience?:string|string[],issuers?:string[],maxExpiry?:number):Promise<LoginTicket>;
  verifyIdToken(options:VerifyIdTokenOptions):Promise<LoginTicket>;
  verifyIdToken(options:VerifyIdTokenOptions,done:Callback<LoginTicket>):void;
  getFederatedSignonCertsAsync():Promise<{certs:Record<string,unknown>;format:'PEM';res?:GaxiosResponse}>;
  revokeToken(token:string):Promise<GaxiosResponse>;
  revokeToken(token:string,done:Callback<GaxiosResponse>):void;
  revokeCredentials():Promise<GaxiosResponse>;
  revokeCredentials(done:Callback<GaxiosResponse>):void;
}
export interface UserRefreshClientOptions extends OAuth2ClientOptions {refreshToken?:string;}
export declare class UserRefreshClient extends OAuth2Client {
  constructor(options?:UserRefreshClientOptions);
  constructor(clientId:string,clientSecret?:string,refreshToken?:string,eagerRefreshThresholdMillis?:number,forceRefreshOnFailure?:boolean);
  fromJSON(json:JWTInput):void;
  fromStream(stream:Readable):Promise<void>;fromStream(stream:Readable,done:Callback<void>):void;
}
export interface JWTOptions extends OAuth2ClientOptions {email?:string;keyFile?:string;key?:string;keyId?:string;scopes?:string|string[];subject?:string;additionalClaims?:Record<string,unknown>;defaultScopes?:string|string[];defaultServicePath?:string;useJWTAccessWithScope?:boolean;}
export interface IdTokenProvider {fetchIdToken(audience:string):Promise<string>;}
export declare class JWT extends OAuth2Client implements IdTokenProvider {
  constructor(options?:JWTOptions);
  constructor(email:string,keyFile?:string,key?:string,scopes?:string|string[],subject?:string,keyId?:string);
  email?:string;key?:string;keyId?:string;keyFile?:string;scopes?:string|string[];subject?:string;additionalClaims?:Record<string,unknown>;defaultScopes?:string|string[];defaultServicePath?:string;useJWTAccessWithScope?:boolean;
  fromJSON(json:JWTInput):void;fromStream(stream:Readable):Promise<void>;fromStream(stream:Readable,done:Callback<void>):void;
  fromAPIKey(apiKey:string):void;hasUserScopes():boolean;hasAnyScopes():boolean;
  authorize():Promise<Credentials>;authorize(done:Callback<Credentials>):void;
  createScoped(scopes?:string|string[]):JWT;fetchIdToken(audience:string):Promise<string>;getCredentials():Promise<CredentialBody>;
}
export interface ComputeOptions extends OAuth2ClientOptions {serviceAccountEmail?:string;scopes?:string|string[];}
export declare class Compute extends OAuth2Client implements IdTokenProvider {constructor(options?:ComputeOptions);serviceAccountEmail:string;scopes:string[];fetchIdToken(audience:string):Promise<string>;}
export declare class IdTokenClient extends OAuth2Client {constructor(options:OAuth2ClientOptions&{targetAudience:string;idTokenProvider:IdTokenProvider});targetAudience:string;idTokenProvider:IdTokenProvider;getIdTokenExpiryDate(token:string):number;}
export interface ImpersonatedOptions extends OAuth2ClientOptions {sourceClient?:AuthClient;targetPrincipal?:string;targetScopes?:string[];delegates?:string[];lifetime?:number;endpoint?:string;}
export declare class Impersonated extends OAuth2Client implements IdTokenProvider {
  constructor(options?:ImpersonatedOptions);targetPrincipal?:string;sourceClient:AuthClient;targetScopes:string[];delegates:string[];lifetime:number;
  getTargetPrincipal():string;sign(value:string):Promise<{signedBlob:string;keyId?:string}>;
  fetchIdToken(audience:string,options?:{includeEmail?:boolean}):Promise<string>;
}
export declare class JWTAccess {
  constructor(email?:string,key?:string,keyId?:string,eagerRefreshThresholdMillis?:number);
  email?:string;key?:string;keyId?:string;projectId?:string;eagerRefreshThresholdMillis:number;cache:Map<string,unknown>;
  static getExpirationTime(iat:number):number;getCachedKey(url?:string,scopes?:string|string[]):string;
  getRequestHeaders(url?:string,claims?:Record<string,unknown>,scopes?:string|string[]):Headers;
  fromJSON(json:JWTInput):void;fromStream(stream:Readable):Promise<void>;fromStream(stream:Readable,done:Callback<void>):void;
}
export interface GoogleTokenOptions {key?:string;keyFile?:string;email?:string;iss?:string;sub?:string;scope?:string|string[];additionalClaims?:Record<string,unknown>;eagerRefreshThresholdMillis?:number;transporter?:Pick<Gaxios,'request'>;}
export interface TokenData extends Credentials {expires_in?:number;}
export declare class GoogleToken {
  constructor(options?:GoogleTokenOptions);readonly accessToken:string|undefined;readonly idToken:string|undefined;readonly expiresAt:number|undefined;readonly tokenType:string|undefined;readonly refreshToken:string|undefined;
  hasExpired():boolean;isTokenExpiring():boolean;getToken(options?:{forceRefresh?:boolean}):Promise<TokenData>;getToken(done:Callback<TokenData>,options?:{forceRefresh?:boolean}):void;revokeToken():Promise<void>;revokeToken(done:Callback<void>):void;
}
export declare class PassThroughClient extends AuthClient {getAccessToken():Promise<{}>;getRequestHeaders():Promise<Headers>;request<T=any>(options:GaxiosOptions):Promise<GaxiosResponse<T>>;}
export type AnyAuthClient = JWT|UserRefreshClient|Compute|Impersonated|IdTokenClient|OAuth2Client|PassThroughClient;
export interface GoogleAuthOptions<T extends AuthClient=AuthClient> {authClient?:T;credentials?:JWTInput;projectId?:string;keyFilename?:string;keyFile?:string;apiKey?:string;scopes?:string|string[];clientOptions?:JWTOptions;universeDomain?:string;}
export declare class GoogleAuth<T extends AuthClient=AuthClient> {
  constructor(options?:GoogleAuthOptions<T>);clientOptions:JWTOptions;scopes?:string|string[];defaultScopes?:string|string[];defaultServicePath?:string;useJWTAccessWithScope?:boolean;cachedCredential?:T;readonly isGCE:boolean|undefined;
  getClient():Promise<T>;fromJSON(json:JWTInput,options?:JWTOptions):JWT|UserRefreshClient|Impersonated;
  fromStream(stream:Readable,options?:JWTOptions):Promise<JWT|UserRefreshClient|Impersonated>;
  fromStream(stream:Readable,done:Callback<JWT|UserRefreshClient|Impersonated>):void;
  fromStream(stream:Readable,options:JWTOptions,done:Callback<JWT|UserRefreshClient|Impersonated>):void;
  fromAPIKey(key:string,options?:JWTOptions):JWT;
  getApplicationDefault(options?:AuthClientOptions):Promise<{credential:AuthClient;projectId:string|null}>;
  getApplicationDefault(done:(error:Error|null,credential?:AuthClient,projectId?:string|null)=>void):void;
  getApplicationDefault(options:AuthClientOptions,done:(error:Error|null,credential?:AuthClient,projectId?:string|null)=>void):void;
  getProjectId():Promise<string>;getProjectId(done:ProjectIdCallback):void;
  getGCEProjectId():Promise<string>;getUniverseDomainFromMetadataServer():Promise<string>;getUniverseDomain():Promise<string>;
  getCredentials():Promise<CredentialBody>;getCredentials(done:Callback<CredentialBody>):void;
  getAccessToken():Promise<string|null|undefined>;getRequestHeaders(url?:string|PreparedURL):Promise<Headers>;
  authorizeRequest(options?:GaxiosOptions&{uri?:string}):Promise<GaxiosOptions&{headers:Headers}>;
  request<T=any>(options:GaxiosOptions):Promise<GaxiosResponse<T>>;fetch:Gaxios['fetch'];
  getIdTokenClient(audience:string):Promise<IdTokenClient>;sign(data:string,endpoint?:string):Promise<string>;
}
export declare const auth:GoogleAuth;
