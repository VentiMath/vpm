"use strict";
/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
const {Transform} = require('node:stream');
const {decodeResponse} = require('./fallbackRest');
const whitespace = c => c===32 || c===9 || c===10 || c===13;
class StreamArrayParser extends Transform {
    constructor(rpc, options) {
        super({...options, readableObjectMode:true});
        this.rpc=rpc;
        this._state=0; this._depth=0; this._string=false; this._escape=false;
        this._parts=[]; this._bytes=0; this._allowEnd=true; this._done=false;
        this.cancelController=new AbortController(); this.cancelSignal=this.cancelController.signal;
        this.cancelRequested=false;
    }
    _transform(chunk, encoding, callback) {
        if(this.cancelRequested){callback();return;}
        if(!Buffer.isBuffer(chunk))chunk=Buffer.from(chunk,encoding);
        let start=this._state===2?0:-1;
        try {
            for(let i=0;i<chunk.length;i++) {
                const c=chunk[i];
                if(this._state===0) {
                    if(whitespace(c))continue;
                    if(c!==91)throw new SyntaxError("API service stream data must start with '['");
                    this._state=1; continue;
                }
                if(this._state===4) {
                    if(!whitespace(c))throw new SyntaxError('Data after JSON array');
                    continue;
                }
                if(this._state===1) {
                    if(whitespace(c))continue;
                    if(c===93 && this._allowEnd){this._state=4;this._done=true;continue;}
                    if(c!==123 && c!==91)throw new SyntaxError('Expected a JSON object or array');
                    start=i;this._state=2;this._depth=1;continue;
                }
                if(this._state===3) {
                    if(whitespace(c))continue;
                    if(c===44){this._state=1;this._allowEnd=false;continue;}
                    if(c===93){this._state=4;this._done=true;continue;}
                    throw new SyntaxError('Expected comma or array end');
                }
                if(this._string) {
                    if(this._escape)this._escape=false;
                    else if(c===92)this._escape=true;
                    else if(c===34)this._string=false;
                } else if(c===34)this._string=true;
                else if(c===123 || c===91)this._depth++;
                else if(c===125 || c===93) {
                    if(--this._depth===0) {
                        let bytes=chunk.subarray(start,i+1);
                        if(this._parts.length){this._parts.push(bytes);bytes=Buffer.concat(this._parts,this._bytes+bytes.length);}
                        this._parts=[];this._bytes=0;start=-1;this._state=3;
                        this.push(decodeResponse(this.rpc,true,bytes));
                    }
                }
            }
            if(this._state===2){const part=chunk.subarray(start);this._parts.push(part);this._bytes+=part.length;}
            callback();
        }catch(error){callback(error);}
    }
    _flush(callback) {
        callback(this.cancelRequested || this._state===4 ? undefined : new SyntaxError('Truncated JSON array'));
    }
    _destroy(error,callback) {
        this._parts=[];this._bytes=0;
        callback(this.cancelRequested ? null : error);
    }
    cancel() {
        this._done=true;this.cancelRequested=true;
        this.cancelController.abort();this.end();
    }
}
exports.StreamArrayParser=StreamArrayParser;
