'use strict';
const lifecycle=require('./lifecycle'),credentials=require('./credential-factory');
Object.assign(exports,{initializeApp:lifecycle.initializeApp,getApp:lifecycle.getApp,getApps:lifecycle.getApps,deleteApp:lifecycle.deleteApp,applicationDefault:credentials.applicationDefault,cert:credentials.cert,refreshToken:credentials.refreshToken,SDK_VERSION:require('../utils').getSdkVersion(),FirebaseError:require('../utils/error').FirebaseError,...require('./error')});
