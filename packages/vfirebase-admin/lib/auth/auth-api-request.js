'use strict';
const {FirebaseAuthError,authClientErrorCode:codes}=require('./error');
const validator=require('../utils/validator');
const {ApiSettings}=require('../utils/api-request');
const {toHttpResponse}=require('../utils/error');
const {AuthResourceUrlBuilder,TenantAwareAuthResourceUrlBuilder,AuthHttpClient,dispatchAuth}=require('./auth-request');
const {UserRequests}=require('./user-operations');
const {validateUpdate,RESERVED_CLAIMS}=require('./update-schema');
const fail=message=>{throw new FirebaseAuthError(codes.INTERNAL_ERROR,message)};
const missing=response=>{throw new FirebaseAuthError({...codes.USER_NOT_FOUND,httpResponse:toHttpResponse(response)})};
const lookup=new ApiSettings('/accounts:lookup').setRequestValidator(body=>{if(!body.localId&&!body.email&&!body.phoneNumber&&!body.federatedUserId)fail('INTERNAL ASSERT FAILED: Server request is missing user identifier')}).setResponseValidator(response=>{if(!response.data?.users?.length)missing(response);if(!Array.isArray(response.data.users))fail('Corrupt GetAccountInfoResponse detected');});
const update=new ApiSettings('/accounts:update').setRequestValidator(validateUpdate).setResponseValidator(response=>{if(!response.data?.localId)missing(response);});
const deletion=new ApiSettings('/accounts:batchDelete').setRequestValidator(body=>{if(!body.localIds)fail('INTERNAL ASSERT FAILED: Server request is missing user identifiers');if(body.force!==true)fail('INTERNAL ASSERT FAILED: Server request is missing force=true field')}).setResponseValidator(response=>{const errors=response.data?.errors;if(errors===undefined)return;if(!Array.isArray(errors))fail('Corrupt BatchDeleteAccountsResponse detected');for(const error of errors){for(const key of ['index','localId'])if(error?.[key]===undefined||(key==='localId'&&!error[key]))fail(`INTERNAL ASSERT FAILED: Server BatchDeleteAccountResponse is missing an errors.${key} field`);}});
const listing=new ApiSettings('/accounts:batchGet','GET').setRequestValidator(body=>{
  if(body.nextPageToken!==undefined&&!validator.isNonEmptyString(body.nextPageToken))throw new FirebaseAuthError(codes.INVALID_PAGE_TOKEN);
  if(!validator.isNumber(body.maxResults)||!Number.isInteger(body.maxResults)||body.maxResults<=0||body.maxResults>1000)throw new FirebaseAuthError(codes.INVALID_ARGUMENT,'Required "maxResults" must be a positive integer that does not exceed 1000.');
});
class AbstractAuthRequestHandler {
  constructor(app,emHost) {
    if(!app||typeof app!=='object'||!('options'in app))throw new FirebaseAuthError(codes.INVALID_ARGUMENT,'First argument passed to admin.auth() must be a valid Firebase app instance.');
    this.app=app;this.emulatorHostValue=emHost===undefined?process.env.FIREBASE_AUTH_EMULATOR_HOST:emHost;
    this.httpClient=new AuthHttpClient(app,!!this.emulatorHostValue);
    this.users=new UserRequests((operation,body)=>this.invokeRequestHandler(this.getAuthUrlBuilder(),{lookup,update,delete:deletion}[operation],body));
  }
  getAuthUrlBuilder(){return this.authUrlBuilder??=this.newAuthUrlBuilder();}
  newAuthUrlBuilder(){return new AuthResourceUrlBuilder(this.app,'v1',this.emulatorHostValue);}
  getProjectConfigUrlBuilder(){return this.projectConfigUrlBuilder??=new AuthResourceUrlBuilder(this.app,'v2',this.emulatorHostValue);}
  invokeRequestHandler(builder,settings,body,params){return dispatchAuth(this.httpClient,builder,settings,body,params);}
  downloadAccount(maxResults=1000,pageToken){
    const body={maxResults};if(pageToken!==undefined)body.nextPageToken=pageToken;
    return this.invokeRequestHandler(this.getAuthUrlBuilder(),listing,body).then(response=>{
      if(response.users!=null&&!Array.isArray(response.users))fail('Corrupt DownloadAccountResponse detected');
      return {...response,users:response.users||[]};
    });
  }
  getAccountInfoByUid(uid){return this.users.lookup(uid);}
  updateExistingAccount(uid,properties){return this.users.update(uid,properties);}
  revokeRefreshTokens(uid){return this.users.revoke(uid);}
  deleteAccounts(uids,force){return this.users.delete(uids,force);}
  static getErrorCode(response){return response?.error?.message||null;}
}
class AuthRequestHandler extends AbstractAuthRequestHandler {}
// Internal resource-builder compatibility, not a public tenant-management API.
class TenantAwareAuthRequestHandler extends AbstractAuthRequestHandler {
  constructor(app,tenantId,emHost){super(app,emHost);this.tenantId=tenantId;}
  newAuthUrlBuilder(){return new TenantAwareAuthResourceUrlBuilder(this.app,'v1',this.tenantId,this.emulatorHostValue);}
}
Object.assign(exports,{AuthRequestHandler,AbstractAuthRequestHandler,TenantAwareAuthRequestHandler,RESERVED_CLAIMS,FIREBASE_AUTH_GET_ACCOUNT_INFO:lookup,FIREBASE_AUTH_DOWNLOAD_ACCOUNT:listing,FIREBASE_AUTH_SET_ACCOUNT_INFO:update,FIREBASE_AUTH_BATCH_DELETE_ACCOUNTS:deletion,useEmulator:()=>!!process.env.FIREBASE_AUTH_EMULATOR_HOST});
