'use strict';
const {UserDeletion,clientChanges}=require('./user-operations');
const {UserRecord}=require('./user-record');
const {verifyUserSession}=require('./token-policy');
const {createIdTokenVerifier}=require('./token-verifier');
const {authClientErrorCode}=require('./error');
class BaseAuth {
  constructor(app,handler){this.authRequestHandler=handler;this.emulatorMode=!!handler.emulatorHostValue;this.idTokenVerifier=createIdTokenVerifier(app);}
  verifyIdToken(token,checkRevoked=false){return this.idTokenVerifier.verifyJWT(token,this.emulatorMode).then(claims=>checkRevoked||this.emulatorMode?this.verifyDecodedJWTNotRevokedOrDisabled(claims,authClientErrorCode.ID_TOKEN_REVOKED):claims);}
  verifyDecodedJWTNotRevokedOrDisabled(claims,code){return verifyUserSession(uid=>this.getUser(uid),claims,code);}
  listUsers(maxResults,pageToken){return this.authRequestHandler.downloadAccount(maxResults,pageToken).then(body=>{
    const result={users:body.users.map(user=>new UserRecord(user))};if(body.nextPageToken!==undefined)result.pageToken=body.nextPageToken;return result;
  });}
  getUser(uid){return this.authRequestHandler.getAccountInfoByUid(uid).then(body=>new UserRecord(body.users[0]));}
  updateUser(uid,properties){return this.authRequestHandler.updateExistingAccount(uid,clientChanges(properties)).then(id=>this.getUser(id));}
  revokeRefreshTokens(uid){return this.authRequestHandler.revokeRefreshTokens(uid).then(()=>undefined);}
  deleteUsers(uids){const plan=new UserDeletion(uids);return this.authRequestHandler.deleteAccounts(plan.uids,true).then(body=>plan.complete(body));}
}
exports.BaseAuth=BaseAuth;
