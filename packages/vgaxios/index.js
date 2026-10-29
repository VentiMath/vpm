'use strict';
const {Gaxios}=require('./lib/gaxios');
exports.Gaxios=Gaxios;
exports.GaxiosError=require('./lib/common').GaxiosError;
exports.GaxiosInterceptorManager=require('./lib/interceptor').GaxiosInterceptorManager;
exports.instance=new Gaxios();
exports.request=options=>exports.instance.request(options);
