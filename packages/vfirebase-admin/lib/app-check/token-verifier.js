'use strict';
const jwt=require('../utils/jwt'),utils=require('../utils');
const {FirebaseAppCheckError}=require('./error');
const reject=message=>{throw new FirebaseAppCheckError({code:'invalid-argument',message})};
class AppCheckTokenVerifier {
  constructor(app){this.app=app;this.signatureVerifier=jwt.PublicKeySignatureVerifier.withJwksUrl('https://firebaseappcheck.googleapis.com/v1/jwks',app.options.httpAgent);}
  verifyToken(token){
    if(typeof token!=='string')reject('App check token must be a non-null string.');
    return this.ensureProjectId().then(project=>this.decodeAndVerify(token,project)).then(({payload})=>({...payload,app_id:payload.sub}));
  }
  async ensureProjectId(){const project=await utils.findProjectId(this.app);if(typeof project!=='string'||!project)throw new FirebaseAppCheckError({code:'invalid-credential',message:'Must initialize app with a cert credential or set your Firebase project ID as the GOOGLE_CLOUD_PROJECT environment variable to verify an App Check token.'});return project;}
  async decodeAndVerify(token,project){const decoded=await this.safeDecode(token);this.verifyContent(decoded,project);await this.verifySignature(token);return decoded;}
  safeDecode(token){return jwt.decodeJwt(token).catch(()=>reject('Decoding App Check token failed. Make sure you passed the entire string JWT which represents the Firebase App Check token.'));}
  verifyContent(decoded,project){
    const header=decoded?.header,payload=decoded?.payload;
    if(!header||!payload||typeof payload!=='object'||Array.isArray(payload))reject('App Check token must contain an object header and payload.');
    if(header.alg!=='RS256')reject(`The provided App Check token has incorrect algorithm. Expected "RS256" but got "${header.alg}".`);
    if(!Array.isArray(payload.aud)||!payload.aud.includes('projects/'+project))reject(`The provided App Check token has incorrect "aud" (audience) claim. Expected "projects/${project}" but got "${payload.aud}". Make sure the App Check token comes from the same Firebase project as the service account used to authenticate this SDK.`);
    if(typeof payload.iss!=='string'||!payload.iss.startsWith('https://firebaseappcheck.googleapis.com/'))reject('The provided App Check token has incorrect "iss" (issuer) claim.');
    if(typeof payload.sub!=='string')reject('The provided App Check token has no "sub" (subject) claim.');
    if(!payload.sub)reject('The provided App Check token has an empty string "sub" (subject) claim.');
  }
  verifySignature(token){return this.signatureVerifier.verify(token).catch(error=>{throw this.mapJwtErrorToAppCheckError(error)});}
  mapJwtErrorToAppCheckError(cause){
    const messages={
      [jwt.JwtErrorCode.TOKEN_EXPIRED]:'The provided App Check token has expired. Get a fresh App Check token from your client app and try again.',
      [jwt.JwtErrorCode.INVALID_SIGNATURE]:'The provided App Check token has invalid signature.',
      [jwt.JwtErrorCode.NO_MATCHING_KID]:'The provided App Check token has "kid" claim which does not correspond to a known public key. Most likely the provided App Check token is expired, so get a fresh token from your client app and try again.'
    };
    return new FirebaseAppCheckError({code:cause.code===jwt.JwtErrorCode.TOKEN_EXPIRED?'app-check-token-expired':'invalid-argument',message:messages[cause.code]??cause.message,cause});
  }
}
exports.AppCheckTokenVerifier=AppCheckTokenVerifier;
