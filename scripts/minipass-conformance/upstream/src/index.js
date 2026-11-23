import {createRequire} from 'node:module';
import process from 'node:process';
const require=createRequire(import.meta.url);
const api=require(process.env.VPM_MINIPASS_CONTROL?'minipass':process.env.VPM_MINIPASS_PACKAGE||'../../../../packages/vminipass');
export const {Minipass,isStream,isReadable,isWritable}=api;
