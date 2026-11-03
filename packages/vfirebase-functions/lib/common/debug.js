'use strict';
const enabled=process.env.FIREBASE_DEBUG_MODE==='true';
function debugFeatureValue(name){
  if(!enabled)return;
  try{const flags=JSON.parse(process.env.FIREBASE_DEBUG_FEATURES);return flags&&typeof flags==='object'&&Object.hasOwn(flags,name)?flags[name]:undefined;}catch{return;}
}
module.exports={debugFeatureValue,isDebugFeatureEnabled:name=>enabled&&!!debugFeatureValue(name)};
