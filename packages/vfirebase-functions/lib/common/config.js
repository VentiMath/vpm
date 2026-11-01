'use strict';
const fs = require('node:fs'), path = require('node:path');
const logger = require('../logger/index.js');
let cached = null;
function resetCache(value = null) {cached = value;}
function firebaseConfig() {
  if (cached) return cached;
  const env = process.env;
  if (env.FIREBASE_CONFIG) {
    const value = env.FIREBASE_CONFIG.trimStart();
    cached = JSON.parse(value.startsWith('{') ? value : fs.readFileSync(path.resolve(env.PWD || process.cwd(), env.FIREBASE_CONFIG), 'utf8'));
  } else if (env.GCLOUD_PROJECT) {
    logger.warn('Warning, estimating Firebase Config based on GCLOUD_PROJECT. Initializing firebase-admin may fail');
    cached = {projectId: env.GCLOUD_PROJECT, databaseURL: env.DATABASE_URL || `https://${env.GCLOUD_PROJECT}.firebaseio.com`,
      storageBucket: env.STORAGE_BUCKET_URL || `${env.GCLOUD_PROJECT}.appspot.com`};
  } else logger.warn('Warning, FIREBASE_CONFIG and GCLOUD_PROJECT environment variables are missing. Initializing firebase-admin will fail');
  return cached;
}
module.exports = {firebaseConfig, resetCache};
