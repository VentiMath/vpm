'use strict';
exports.toHttpResponse=response=>({status:response.status,headers:response.headers,data:response.isJson()?response.data:response.text});
class FirebaseError extends Error {
  constructor(info){super(info.message);this.code=info.code;for(const key of ['cause','httpResponse'])if(info[key]!==undefined)this[key]=info[key];}
  hasCode(code){return this.code===code||(this.codePrefix!=null&&this.code===this.codePrefix+'/'+code);}
  toJSON(){
    const result={code:this.code,message:this.message};
    if(this.httpResponse)result.httpResponse={status:this.httpResponse.status,headers:this.httpResponse.headers,data:this.httpResponse.data};
    if(this.cause){const cause=this.cause;result.cause={name:cause.name||'Error',message:cause.message||String(cause),stack:cause.stack};if(Array.isArray(cause.errors))result.cause.errors=cause.errors.map(error=>error instanceof Error?{name:error.name,message:error.message,stack:error.stack}:String(error));}
    return result;
  }
}
exports.FirebaseError=FirebaseError;
