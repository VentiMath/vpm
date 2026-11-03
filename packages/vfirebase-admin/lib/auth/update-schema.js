'use strict';
// Firebase wire names and error codes are contract data. This validator owns
// the request record and validates only fields the update endpoint accepts.
const v = require('../utils/validator');
const {FirebaseAuthError, authClientErrorCode: codes} = require('./error');
const fail = (code, message) => {throw new FirebaseAuthError(codes[code], message);};
const rules = {
  displayName: ['isString','INVALID_DISPLAY_NAME'], localId: ['isUid','INVALID_UID'],
  email: ['isEmail','INVALID_EMAIL'], phoneNumber: ['isPhoneNumber','INVALID_PHONE_NUMBER'],
  password: ['isPassword','INVALID_PASSWORD'], rawPassword: ['isPassword','INVALID_PASSWORD'],
  emailVerified: ['isBoolean','INVALID_EMAIL_VERIFIED'], photoUrl: ['isURL','INVALID_PHOTO_URL'],
  disabled: ['isBoolean','INVALID_DISABLED_FIELD'], disableUser: ['isBoolean','INVALID_DISABLED_FIELD'],
  validSince: ['isNumber','INVALID_TOKENS_VALID_AFTER_TIME'], createdAt: ['isNumber','INVALID_CREATION_TIME'],
  lastLoginAt: ['isNumber','INVALID_LAST_SIGN_IN_TIME'], passwordHash: ['isString','INVALID_PASSWORD_HASH'], salt: ['isString','INVALID_PASSWORD_SALT'],
};
const checks = Object.entries(rules);
const reserved = ['acr','amr','at_hash','aud','auth_time','azp','cnf','c_hash','exp','iat','iss','jti','nbf','nonce','sub','firebase'];
const allowed = new Set([...Object.keys(rules),'deleteAttribute','deleteProvider','sanityCheck','customAttributes','linkProviderUserInfo','providerUserInfo','mfa','mfaInfo']);
function only(record, keys) {for(const key of Object.keys(record)) if(!keys.has(key)) delete record[key];}
const providerKeys=new Set(['rawId','providerId','email','displayName','photoUrl']);
const factorKeys=new Set(['mfaEnrollmentId','displayName','phoneInfo','enrolledAt']);
function provider(record) {
  if(!v.isNonNullObject(record)) fail('INVALID_PROVIDER_DATA');
  only(record,providerKeys);
  if(!v.isNonEmptyString(record.providerId)) fail('INVALID_PROVIDER_ID');
  for(const [key,check,code] of [['displayName','isString','INVALID_DISPLAY_NAME'],['rawId','isNonEmptyString','INVALID_UID'],['email','isEmail','INVALID_EMAIL'],['photoUrl','isURL','INVALID_PHOTO_URL']]) {
    if((key==='rawId'||record[key]!==undefined)&&!v[check](record[key])) fail(code);
  }
}
function factor(record) {
  if(!v.isNonNullObject(record)) fail('INVALID_ENROLLED_FACTORS');
  only(record,factorKeys);
  const id=record.mfaEnrollmentId||record.phoneInfo||JSON.stringify(record);
  if(record.mfaEnrollmentId!==undefined&&!v.isNonEmptyString(record.mfaEnrollmentId))fail('INVALID_UID','The second factor "uid" must be a valid non-empty string.');
  if(record.displayName!==undefined&&!v.isString(record.displayName))fail('INVALID_DISPLAY_NAME',`The second factor "displayName" for "${id}" must be a valid string.`);
  if(record.enrolledAt!==undefined&&!v.isISODateString(record.enrolledAt))fail('INVALID_ENROLLMENT_TIME',`The second factor "enrollmentTime" for "${id}" must be a valid UTC date string.`);
  if(record.phoneInfo===undefined)fail('INVALID_ENROLLED_FACTORS','MFAInfo object provided is invalid.');
  if(!v.isPhoneNumber(record.phoneInfo))fail('INVALID_PHONE_NUMBER',`The second factor "phoneNumber" for "${id}" must be a non-empty E.164 standard compliant identifier string.`);
}
function validateUpdate(record) {
  if(record.localId===undefined)fail('INTERNAL_ERROR','INTERNAL ASSERT FAILED: Server request is missing user identifier');
  if(record.tenantId!==undefined)fail('INVALID_ARGUMENT','"tenantId" is an invalid "UpdateRequest" property.');
  const keys=Object.keys(record);
  // The application's disable/revoke requests contain exactly these two fields.
  // Check both own keys before skipping the general schema walk.
  if(keys.length===2&&Object.hasOwn(record,'localId')) {
    const field=Object.hasOwn(record,'disableUser')?'disableUser':Object.hasOwn(record,'validSince')?'validSince':undefined;
    if(field){if(!v.isUid(record.localId))fail('INVALID_UID');const [check,code]=rules[field];if(record[field]!==undefined&&!v[check](record[field]))fail(code);return;}
  }
  for(const key of keys)if(!allowed.has(key))delete record[key];
  for(const [key,[check,code]] of checks) if(record[key]!==undefined&&!v[check](record[key]))fail(code);
  if(record.customAttributes!==undefined) {
    let claims;try{claims=JSON.parse(record.customAttributes);}catch(error){fail('INVALID_CLAIMS',error.message);}
    if(!v.isNonNullObject(claims))fail('INVALID_CLAIMS');
    const forbidden=reserved.filter(key=>Object.hasOwn(claims,key));
    if(forbidden.length)fail('FORBIDDEN_CLAIM',forbidden.length===1?`Developer claim "${forbidden[0]}" is reserved and cannot be specified.`:`Developer claims "${forbidden.join('\", \"')}" are reserved and cannot be specified.`);
    if(record.customAttributes.length>1000)fail('CLAIMS_TOO_LARGE','Developer claims payload should not exceed 1000 characters.');
  }
  if(record.providerUserInfo!==undefined){if(!Array.isArray(record.providerUserInfo))fail('INVALID_PROVIDER_DATA');for(const item of record.providerUserInfo)provider(item);}
  if(record.linkProviderUserInfo!==undefined)provider(record.linkProviderUserInfo);
  const factors=record.mfaInfo||record.mfa?.enrollments;
  if(factors){if(!Array.isArray(factors))fail('INVALID_ENROLLED_FACTORS');for(const item of factors)factor(item);}
}
function convertMultiFactorInfoToServerFormat(info) {
  if(!v.isNonNullObject(info)||info.factorId!=='phone')fail('UNSUPPORTED_SECOND_FACTOR',`Unsupported second factor "${JSON.stringify(info)}" provided.`);
  const out={};
  for(const [from,to] of [['uid','mfaEnrollmentId'],['displayName','displayName'],['phoneNumber','phoneInfo']])if(info[from]!==undefined)out[to]=info[from];
  if(info.enrollmentTime!==undefined){if(!v.isUTCDateString(info.enrollmentTime))fail('INVALID_ENROLLMENT_TIME',`The second factor "enrollmentTime" for "${info.uid}" must be a valid UTC date string.`);out.enrolledAt=new Date(info.enrollmentTime).toISOString();}
  return out;
}
Object.assign(exports,{validateUpdate,convertMultiFactorInfoToServerFormat,RESERVED_CLAIMS:reserved});
