'use strict';
const assert=require('node:assert/strict');
const original=require('./node_modules/firebase-admin/lib/auth/auth-api-request').FIREBASE_AUTH_SET_ACCOUNT_INFO.getRequestValidator();
const replacement=require('../../packages/vfirebase-admin/lib/auth/auth-api-request').FIREBASE_AUTH_SET_ACCOUNT_INFO.getRequestValidator();
const values=[undefined,null,true,false,0,NaN,Infinity,'','a','hello@example.com','+15555550100','123456','https://example.com/a',[],{},['a']];
const keys=['displayName','localId','email','phoneNumber','password','rawPassword','emailVerified','photoUrl','disabled','disableUser','validSince','createdAt','lastLoginAt','passwordHash','salt','providerUserInfo','customAttributes','tenantId'];
let count=0;
const result=(fn,body)=>{try{fn(body);return {value:JSON.parse(JSON.stringify(body))};}catch(error){return {error:error.code}}};
for(const key of keys)for(const value of values){const body={localId:'one',[key]:value};const a=result(original,structuredClone(body)),b=result(replacement,structuredClone(body));
 // JSON scalar claims are deliberately rejected with a structured SDK error;
 // upstream can throw a TypeError or accept a nonsensical claim container.
 if(key==='customAttributes'&&['null','true','false','0','123456'].includes(String(value))){assert.equal(b.error,'auth/invalid-claims');}
 else if(key==='providerUserInfo'&&Array.isArray(value)&&value[0]==='a'){assert.equal(a.error,undefined);assert.equal(b.error,'auth/invalid-provider-data');}
 else assert.deepEqual(b,a,key+' / '+String(value));count++;}
for(const body of [{localId:'one',linkProviderUserInfo:{providerId:'github.com',rawId:'external',unknown:1}}, {localId:'one',mfa:{enrollments:[{mfaEnrollmentId:'factor',phoneInfo:'+15555550100',displayName:'phone'}]}}, {localId:'one',customAttributes:'{"canImpersonate":true}'},{localId:'one',customAttributes:'{"aud":"wrong"}'}]){assert.deepEqual(result(replacement,structuredClone(body)),result(original,structuredClone(body)));count++;}
const own=JSON.parse('{"localId":"one","__proto__":{"polluted":true},"constructor":1,"disabled":true}');replacement(own);assert(!Object.hasOwn(own,'__proto__'));assert(!Object.hasOwn(own,'constructor'));assert.equal({}.polluted,undefined);
console.log(count+' Auth endpoint validation controls and prototype ownership pass.');
