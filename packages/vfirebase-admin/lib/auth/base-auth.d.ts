import {App,FirebaseArrayIndexError} from '../app';
import {DecodedIdToken} from './token-verifier';
import {UpdateRequest} from './auth-config';
import {UserRecord} from './user-record';
export interface DeleteUsersResult { successCount:number; failureCount:number; errors:FirebaseArrayIndexError[]; }
export interface ListUsersResult {users:UserRecord[]; pageToken?:string;}
export declare class BaseAuth { listUsers(maxResults?:number,pageToken?:string):Promise<ListUsersResult>; verifyIdToken(token:string,checkRevoked?:boolean):Promise<DecodedIdToken>; getUser(uid:string):Promise<UserRecord>; updateUser(uid:string,properties:UpdateRequest):Promise<UserRecord>; revokeRefreshTokens(uid:string):Promise<void>; deleteUsers(uids:string[]):Promise<DeleteUsersResult>; }
