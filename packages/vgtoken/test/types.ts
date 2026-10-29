import {GoogleToken, TokenError, type TokenData, type TokenOptions, type GetTokenOptions} from 'vgtoken';
import {Gaxios} from 'vgaxios';
const options: TokenOptions = {email: 'service@example.test', key: 'PEM', scope: ['a', 'b'], additionalClaims: {target_audience: 'audience'}, transporter: new Gaxios(), timeout: 1000};
const token = new GoogleToken(options);
const request: GetTokenOptions = {forceRefresh: true, signal: new AbortController().signal};
const promise: Promise<TokenData> = token.getToken(request);
token.getToken((error, result) => { const message: string | undefined = error?.message; const access: string | undefined = result?.access_token; void [message, access]; }, request);
const revoked: Promise<void> = token.revokeToken(); token.revokeToken(error => { void error?.message; });
const expiry: number | undefined = token.expiresAt;
const error: Error = new TokenError('CODE', 'message', 400);
// @ts-expect-error Token data is immutable.
const invalid: TokenOptions = {scope: 3};
void [promise, revoked, expiry, error, invalid];
