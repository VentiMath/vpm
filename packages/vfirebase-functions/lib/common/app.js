'use strict';
const configuration = require('./config.js');
const serviceName = '__FIREBASE_FUNCTIONS_SDK__';
let selected, admin;
const api = () => admin ??= require('vfirebase-admin/app');
function getApp() {
  if (selected !== undefined) return selected;
  try {selected = api().getApp();}
  catch (error) {
    if (error?.code !== 'app/no-app') throw error;
    selected = api().initializeApp({...configuration.firebaseConfig(), credential: api().applicationDefault()}, serviceName);
  }
  return selected;
}
function setApp(value) {
  const previous = selected;
  selected = value;
  if (previous?.name === serviceName && previous !== value) void api().deleteApp(previous);
}
module.exports = {getApp, setApp};
