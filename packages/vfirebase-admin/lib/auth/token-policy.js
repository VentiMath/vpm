"use strict";
// Firebase claim names, endpoints and diagnostic wording are compatibility
// contracts. These checks separate token kind from per-request project identity.
const {FirebaseAuthError, authClientErrorCode: codes} = require('./error');
const customAudience = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

class TokenPolicy {
  constructor(info, article) {
    this.info = info;
    this.article = article;
    this.docs = ` See ${info.url} for details on how to retrieve ${article} ${info.shortName}.`;
    this.projectHint = ` Make sure the ${info.shortName} comes from the same Firebase project as the service account used to authenticate this SDK.`;
    this.blocking = info.verifyApiName === '_verifyAuthBlockingToken()';
  }
  reject(message) {throw new FirebaseAuthError(codes.INVALID_ARGUMENT, message);}
  check(decoded, project, issuer, emulator, audience) {
    const header = decoded?.header, claims = decoded?.payload, info = this.info;
    if (!record(header) || !record(claims)) this.reject(`${info.jwtName} must contain an object header and payload.` + this.docs);
    if (!emulator) {
      if (header.kid === undefined) {
        let message = `${info.jwtName} has no "kid" claim.`;
        if (claims.aud === customAudience) message = `${info.verifyApiName} expects ${this.article} ${info.shortName}, but was given a custom token.`;
        else if (header.alg === 'HS256' && claims.v === 0 && record(claims.d) && 'uid' in claims.d) {
          message = `${info.verifyApiName} expects ${this.article} ${info.shortName}, but was given a legacy custom token.`;
        }
        this.reject(message + this.docs);
      }
      if (header.alg !== 'RS256') this.reject(`${info.jwtName} has incorrect algorithm. Expected "RS256" but got "${header.alg}".` + this.docs);
    }
    // Blocking-function audiences retain the SDK's URL-fragment contract.
    // Ordinary ID/session tokens require the exact project ID instead.
    const matches = audience === undefined ? claims.aud === project :
      (typeof claims.aud === 'string' || Array.isArray(claims.aud)) && claims.aud.includes(audience);
    if (!matches) this.reject(`${info.jwtName} has incorrect "aud" (audience) claim. Expected "${audience === undefined ? project : audience}" but got "${claims.aud}".` + (audience === undefined ? this.projectHint : '') + this.docs);
    if (claims.iss !== issuer + project) this.reject(`${info.jwtName} has incorrect "iss" (issuer) claim. Expected "${issuer}${project}" but got "${claims.iss}".` + this.projectHint + this.docs);
    const subjectlessEvent = this.blocking && audience !== undefined &&
      (claims.event_type === 'beforeSendSms' || claims.event_type === 'beforeSendEmail');
    if (subjectlessEvent) return;
    let subjectError;
    if (typeof claims.sub !== 'string') subjectError = 'no "sub" (subject) claim';
    else if (claims.sub.length === 0) subjectError = 'an empty "sub" (subject) claim';
    else if (claims.sub.length > 128) subjectError = 'a "sub" (subject) claim longer than 128 characters';
    if (subjectError) this.reject(`${info.jwtName} has ${subjectError}.` + this.docs);
  }
}

async function verifyUserSession(getUser, claims, revokedCode) {
  // Capture the comparison input before the user lookup yields control.
  const authTime = claims.auth_time, user = await getUser(claims.sub);
  if (user.disabled) throw new FirebaseAuthError(codes.USER_DISABLED, 'The user record is disabled.');
  if (user.tokensValidAfterTime) {
    if (typeof authTime !== 'number' || !Number.isFinite(authTime * 1000)) {
      throw new FirebaseAuthError(codes.INVALID_ARGUMENT, 'The token must have a finite numeric auth_time claim to check revocation.');
    }
    const validAfter = Date.parse(user.tokensValidAfterTime);
    if (!Number.isFinite(validAfter)) throw new FirebaseAuthError(codes.INTERNAL_ERROR, 'The user record has an invalid tokensValidAfterTime.');
    if (authTime * 1000 < validAfter) throw new FirebaseAuthError(revokedCode);
  }
  return claims;
}
Object.assign(exports, {TokenPolicy, verifyUserSession});
