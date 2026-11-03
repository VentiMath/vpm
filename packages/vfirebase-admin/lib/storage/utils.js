'use strict';
exports.getFirebaseMetadata=(endpoint,file)=>new Promise((resolve,reject)=>{
  const uri=endpoint+'/b/'+encodeURIComponent(file.bucket.name)+'/o/'+encodeURIComponent(file.name);
  file.storage.makeAuthenticatedRequest({method:'GET',uri},(error,body)=>error?reject(error):resolve(body));
});
