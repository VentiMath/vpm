'use strict';
const {Messaging}=require('./messaging');
function getMessaging(app=require('../app').getApp()){return app.getOrInitService('messaging',value=>new Messaging(value));}
Object.assign(exports,{Messaging,getMessaging});
const errors=require('./error');
exports.FirebaseMessagingError=errors.FirebaseMessagingError;
exports.MessagingErrorCode=errors.MessagingErrorCode;
