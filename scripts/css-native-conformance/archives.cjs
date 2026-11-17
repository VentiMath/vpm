'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-css-archives-'));
try{require('../pack-css-native-release.cjs').build({ref:'HEAD',tag:'css-to-react-native-3.2.0-check',out:temp});execFileSync(process.execPath,[path.resolve(__dirname,'../check-css-native-release.cjs'),temp],{stdio:'inherit',timeout:600000});}finally{fs.rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
