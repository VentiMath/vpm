import {GoogleAuth, JWT, JWTAccess, OAuth2Client, Compute, UserRefreshClient, GoogleToken, IdTokenClient, type TokenPayload, type GoogleAuthOptions} from '..';
import {Readable} from 'node:stream';
import {Gaxios, type Headers as AuthHeaders} from 'vgaxios';
const options: GoogleAuthOptions = {projectId:'project',scopes:['scope'],authClient:new JWT({email:'service@example.test',key:'key'})};
const auth = new GoogleAuth(options);
const project: Promise<string> = auth.getProjectId();
const headers: Promise<AuthHeaders> = auth.getRequestHeaders(new URL('https://api.test'));
const signed: Promise<string> = auth.sign('storage signing input');
const stream = Readable.from(['{}']);
auth.fromStream(stream);
const access = new JWTAccess('email','key');
access.getRequestHeaders('url',{tenant:{id:1}},['scope']);
access.fromStream(stream, error=>{if(error)error.message;});
const client = new OAuth2Client({clientId:'id',transporter:new Gaxios()});
client.on('tokens',tokens=>{const value:string|null|undefined=tokens.access_token;void value;});
const ticket = client.verifyIdToken({idToken:'token',audience:['id']});
ticket.then(t=>{const payload:TokenPayload|undefined=t.getPayload();void payload;});
client.request<{ok:boolean}>({url:new URL('https://api.test')}).then(r=>r.data.ok);
client.fetch('https://api.test',{headers:new Headers({x:'y'})});
new Compute({scopes:['scope']});
new UserRefreshClient({clientId:'id',clientSecret:'secret',refreshToken:'token'});
new IdTokenClient({targetAudience:'audience',idTokenProvider:{fetchIdToken:async()=> 'token'}});
const tokens = new GoogleToken({key:'key',email:'email',scope:['scope']});
const revocation:Promise<void> = tokens.revokeToken();
// @ts-expect-error scopes must be a string or list of strings
new GoogleAuth({scopes:123});
// @ts-expect-error audience must be string or list of strings
client.verifyIdToken({idToken:'token',audience:123});
void [project,headers,signed,revocation];
