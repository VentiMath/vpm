import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import cookies from 'vjs-cookie';
const require=createRequire(import.meta.url);assert.equal(cookies,require('vjs-cookie'));
assert.equal(cookies.get(),undefined);let raw='';globalThis.document={get cookie(){return raw},set cookie(v){raw=v}};
assert.equal(cookies.set('name','π'),'name=%CF%80; path=/');raw=raw.split(';')[0];assert.equal(cookies.get('name'),'π');delete globalThis.document;
console.log('Packed ESM/CommonJS identity and cookie encoding pass');
