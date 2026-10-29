import jwks = require('vjwks-rsa');
import { Agent } from 'node:https';
const options: jwks.Options = { jwksUri:'https://example.test/keys', requestAgent:new Agent(), maxResponseBytes:1024 };
const client = jwks(options);
const promise: Promise<jwks.SigningKey> = client.getSigningKey();
client.getSigningKey('a', (error, key) => { if (key) { const pem: string = key.getPublicKey(); void pem; } void error; });
const keys: Promise<jwks.JSONWebKey[]> = client.getKeys();
const provider = jwks.expressJwtSecret({fetcher:async()=>({keys:[]})});
const secret: Promise<string | undefined> = provider({}, {header:{alg:'RS256'}});
provider({}, {alg:'RS256',kid:null}, {}, (error, key)=>{void error;void key;});
jwks.passportJwtSecret(options)({}, 'token', (err,key)=>{void err;void key;});
jwks.koaJwtSecret(options)({alg:'ES256'});
jwks.hapiJwt2Key(options)({header:{alg:'RS256'}}, (err,pem,key)=>{void err;void pem;void key;});
const hapi: Promise<{key:string}> = jwks.hapiJwt2KeyAsync(options)({header:{alg:'EdDSA'}});
// @ts-expect-error endpoint or fetcher required
jwks({ cache:true });
// @ts-expect-error key identifiers are not numbers
client.getSigningKey(1);
void [promise,keys,secret,hapi];
