'use strict';
// Official ICU drop-in timezone resources, pinned independently of the runtime.
// https://unicode-org.github.io/icu/userguide/datetime/timezone/
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const revision='bae5ca647fa41703393dbf00240ec1b807a9c353';
const hashes={
 'zoneinfo64.res':'5a168fb78cccfc872f9a50e91facf0bf8b7204a6c4f92fe5c64a8165e9e62448',
 'windowsZones.res':'b8c3a7adb94fd659f8203ee4af4dc72a4e6b14566baac1855c493096f337184b',
 'timezoneTypes.res':'5e77ce5afb7374a36cbe3be197d0a6deaa919e6f672c2a372f7a9d91b7f8534f',
 'metaZones.res':'5b484c7f02c99d5164208ce84e18fba67c6314d77cf60503e2b19f708b66c6da',
};
(async()=>{
 assert.equal(os.endianness(),'LE','These ICU resources are for little-endian runtimes');
 const directory=path.resolve(process.env.RUNNER_TEMP||os.tmpdir(),'vpm-icu-tzdata-2026e');
 fs.mkdirSync(directory,{recursive:true});
 for(const [name,hash]of Object.entries(hashes)){
  const response=await fetch(`https://raw.githubusercontent.com/unicode-org/icu-data/${revision}/tzdata/icunew/2026e/44/le/${name}`,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('ICU resource download failed: '+response.status+' '+name);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name+' integrity');
  fs.writeFileSync(path.join(directory,name),bytes);
 }
 if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`ICU_TIMEZONE_FILES_DIR=${directory}\n`);
 console.log('ICU_TIMEZONE_FILES_DIR='+directory);
})().catch(e=>{console.error(e);process.exitCode=1;});
