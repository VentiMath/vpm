import {App} from '../app';
import {VerifyAppCheckTokenOptions,VerifyAppCheckTokenResponse} from './app-check-api';
export declare class AppCheck {readonly app:App; verifyToken(token:string,options?:VerifyAppCheckTokenOptions):Promise<VerifyAppCheckTokenResponse>;}
