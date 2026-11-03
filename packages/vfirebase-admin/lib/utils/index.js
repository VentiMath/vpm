'use strict';
const {ServiceAccountCredential,ApplicationDefaultCredential}=require('../app/credential-internal');
const text=value=>typeof value==='string'&&value.length>0;
const version=require('../../package.json').version;
exports.getSdkVersion=()=>version;
exports.getMetricsHeader=()=>`gl-node/${process.versions.node} fire-admin/${version}`;
exports.getExplicitProjectId=app=>{
  const options=app.options;
  if(text(options.projectId))return options.projectId;
  if(options.credential instanceof ServiceAccountCredential)return options.credential.projectId;
  const environment=process.env.GOOGLE_CLOUD_PROJECT||process.env.GCLOUD_PROJECT;
  return text(environment)?environment:null;
};
exports.findProjectId=app=>{
  const explicit=exports.getExplicitProjectId(app);
  if(explicit)return Promise.resolve(explicit);
  return app.options.credential instanceof ApplicationDefaultCredential?app.options.credential.getProjectId():Promise.resolve(null);
};
