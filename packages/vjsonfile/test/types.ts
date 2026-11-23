import json,{readFile,readFileSync,writeFile,writeFileSync} from '../index.cjs';
import {stringify,stripBom} from '../utils.cjs';
import fs from 'node:fs';
const promise:Promise<{enabled:boolean}>=readFile<{enabled:boolean}>('config.json',{fs,encoding:'utf8'});
const value=readFileSync<{name:string}>(new URL('file:///tmp/config.json'),{fs});
readFile<{name:string}>('config.json',(error,value)=>{if(!error&&value)console.log(value.name);});
writeFile('config.json',{name:'demo'},{spaces:'\t',finalEOL:false,fs,signal:new AbortController().signal});
writeFile('config.json',{},undefined,error=>void error);writeFileSync(1,{ok:true});
const text:string=stringify(value,{EOL:'\r\n',replacer:['name']});stripBom(Buffer.from(text));json.readFile('config.json');
// @ts-expect-error Indentation must be a number or string.
writeFile('config.json',{}, {spaces:true});
// @ts-expect-error Paths are not arbitrary objects.
readFile({path:'config.json'});
void promise;
const nullable:Promise<{ok:boolean}|null>=readFile<{ok:boolean}>('bad.json',{throws:false});
const maybeSync:{ok:boolean}|null=readFileSync<{ok:boolean}>('bad.json',{throws:false});
// @ts-expect-error Suppressed errors may return null.
const notNullable:{ok:boolean}=readFileSync<{ok:boolean}>('bad.json',{throws:false});
readFile<{ok:boolean}>('bad.json',{throws:false},(error,value)=>{if(!error&&value)console.log(value.ok)});
void nullable;void maybeSync;
