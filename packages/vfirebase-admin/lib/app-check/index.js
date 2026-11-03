'use strict';
const {AppCheck}=require('./app-check');
function getAppCheck(app=require('../app').getApp()){return app.getOrInitService('app-check',value=>new AppCheck(value));}
Object.assign(exports,{AppCheck,getAppCheck});
const errors=require('./error');
exports.FirebaseAppCheckError=errors.FirebaseAppCheckError;
exports.AppCheckErrorCode=errors.AppCheckErrorCode;
