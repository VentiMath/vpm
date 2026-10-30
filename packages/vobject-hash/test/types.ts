import hash, {sha1,keys,MD5,keysMD5,writeToStream} from 'vobject-hash';
import {createHash} from 'node:crypto';
import {PassThrough} from 'node:stream';
const text:string=hash({x:1});const bytes:Uint8Array=hash('a',{encoding:'buffer'});const encoded:string=hash('a',{encoding:'buffer'}).toString('hex');
const options:hash.Options={algorithm:'sha256',unorderedArrays:true,replacer:value=>value};const result:string|hash.HashBuffer=hash('a',options);
writeToStream({x:1},new PassThrough());writeToStream('a',{},createHash('sha1'));
const values:string[]=[sha1('a'),keys({a:1}),MD5('a'),keysMD5('a')];void text;void bytes;void encoded;void result;void values;
// @ts-expect-error option must be boolean
hash('a',{unorderedArrays:'yes'});
// @ts-expect-error output is a byte buffer
const invalid:string=hash('a',{encoding:'buffer'});
// @ts-expect-error requires a sink
writeToStream('a',{});
