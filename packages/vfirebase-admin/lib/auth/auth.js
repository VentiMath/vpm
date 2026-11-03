'use strict';
const {BaseAuth}=require('./base-auth');
const {AuthRequestHandler}=require('./auth-api-request');
class Auth extends BaseAuth {
  constructor(app){super(app,new AuthRequestHandler(app));this.app_=app;}
  get app(){return this.app_;}
}
exports.Auth=Auth;
