'use strict';
const {AppCheckTokenVerifier}=require('./token-verifier');
const {AppCheckApiClient}=require('./app-check-api-client-internal');
const {FirebaseAppCheckError}=require('./error');
class AppCheck {
  constructor(app){this.app=app;this.client=new AppCheckApiClient(app);this.appCheckTokenVerifier=new AppCheckTokenVerifier(app);}
  verifyToken(token,options){
    this.validateVerifyAppCheckTokenOptions(options);
    // Capture the policy before signature/key discovery yields to caller code.
    const consume=!!options?.consume;
    return this.appCheckTokenVerifier.verifyToken(token).then(async claims=>{
      const result={appId:claims.app_id,token:claims};
      if(consume)result.alreadyConsumed=await this.client.verifyReplayProtection(token);
      return result;
    });
  }
  validateVerifyAppCheckTokenOptions(options){if(options!==undefined&&(!options||typeof options!=='object'||Array.isArray(options)))throw new FirebaseAppCheckError({code:'invalid-argument',message:'VerifyAppCheckTokenOptions must be a non-null object.'});}
}
exports.AppCheck=AppCheck;
