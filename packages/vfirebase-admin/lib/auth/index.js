'use strict';
const {Auth}=require('./auth');
function getAuth(app=require('../app').getApp()){return app.getOrInitService('auth',value=>new Auth(value));}
Object.assign(exports,{Auth,getAuth});
const errors=require('./error');
exports.FirebaseAuthError=errors.FirebaseAuthError;
exports.AuthErrorCode=errors.AuthErrorCode;
Object.assign(exports,require('./user-record'),require('./base-auth'));
