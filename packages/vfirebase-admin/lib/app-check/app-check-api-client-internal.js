'use strict';
const {AuthorizedHttpClient,RequestResponseError}=require('../utils/api-request');
const {toHttpResponse}=require('../utils/error');
const {FirebaseAppCheckError,APP_CHECK_ERROR_CODE_MAPPING}=require('./error');
const utils=require('../utils');
class AppCheckApiClient {
  constructor(app){if(!app||typeof app!=='object'||!('options'in app))throw new FirebaseAppCheckError({code:'invalid-argument',message:'First argument passed to admin.appCheck() must be a valid Firebase app instance.'});this.app=app;this.httpClient=new AuthorizedHttpClient(app);}
  async getProjectId(){
    const project=this.projectId??await utils.findProjectId(this.app);
    if(typeof project!=='string'||!project)throw new FirebaseAppCheckError({code:'unknown-error',message:'Failed to determine project ID. Initialize the SDK with service account credentials or set project ID as an app option. Alternatively, set the GOOGLE_CLOUD_PROJECT environment variable.'});
    return this.projectId=project;
  }
  async getVerifyTokenUrl(){const project=await this.getProjectId();if(project==='.'||project==='..')throw new FirebaseAppCheckError({code:'invalid-argument',message:'App Check project ID cannot be a dot segment.'});return 'https://firebaseappcheck.googleapis.com/v1beta/projects/'+encodeURIComponent(project)+':verifyAppCheckToken';}
  verifyReplayProtection(token){
    if(typeof token!=='string'||!token)throw new FirebaseAppCheckError({code:'invalid-argument',message:'`token` must be a non-empty string.'});
    return this.getVerifyTokenUrl().then(url=>this.httpClient.send({url,method:'POST',headers:{'X-Firebase-Client':'fire-admin-node/'+utils.getSdkVersion()},data:{app_check_token:token}})).then(response=>{
      if(!response.data||typeof response.data!=='object'||Array.isArray(response.data)||(response.data.alreadyConsumed!==undefined&&typeof response.data.alreadyConsumed!=='boolean'))throw new FirebaseAppCheckError({code:'invalid-argument',message:'`alreadyConsumed` must be a boolean value.',httpResponse:toHttpResponse(response)});
      return response.data.alreadyConsumed??false;
    }).catch(error=>{throw this.toFirebaseError(error)});
  }
  toFirebaseError(error){
    if(!(error instanceof RequestResponseError))return error;
    const response=error.response,body=response.isJson()?response.data?.error:undefined;
    return new FirebaseAppCheckError({code:typeof body?.status==='string'&&Object.hasOwn(APP_CHECK_ERROR_CODE_MAPPING,body.status)?APP_CHECK_ERROR_CODE_MAPPING[body.status]:'unknown-error',message:body?.message??'Unexpected App Check response.',httpResponse:toHttpResponse(response),cause:error});
  }
}
exports.AppCheckApiClient=AppCheckApiClient;
