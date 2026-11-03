'use strict';
const {Storage}=require('./storage');
function getStorage(app=require('../app').getApp()){return app.getOrInitService('storage',value=>new Storage(value));}
Object.assign(exports,{Storage,getStorage});
const errors=require('./error');
exports.FirebaseStorageError=errors.FirebaseStorageError;
exports.StorageErrorCode=errors.StorageErrorCode;
// Download links use the endpoint captured by this client's Storage context.
exports.getDownloadURL=async file=>{
  const endpoint=require('./storage-context').downloadEndpoint(file)+'/v0';
  const base=endpoint+'/b/'+encodeURIComponent(file.bucket.name)+'/o/'+encodeURIComponent(file.name);
  const metadata=await require('./utils').getFirebaseMetadata(endpoint,file);
  const tokens=metadata?.downloadTokens;
  if(typeof tokens!=='string'||!tokens)throw new errors.FirebaseStorageError({code:'no-download-token',message:'No download token available. Please create one in the Firebase Console.'});
  return base+'?alt=media&token='+encodeURIComponent(tokens.split(',')[0]);
};
