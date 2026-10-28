import cookie, { parse, serialize, parseCookie, stringifyCookie, parseSetCookie, stringifySetCookie, type Cookies, type SetCookie, type SerializeOptions } from 'vcookie';
const options: SerializeOptions = { maxAge: 10, path: '/', httpOnly: true, sameSite: 'lax' };
const header: string = serialize('name', '雪', options);
const parsed: Cookies = parse(header);
const value: string | undefined = cookie.parseCookie('x=y', { decode: v => v || undefined }).x;
const set: SetCookie = parseSetCookie('x=y; HttpOnly');
stringifyCookie(parsed); stringifySetCookie(set); stringifySetCookie({ name: 'empty' });
stringifySetCookie({ name: 'empty', value: null });
parseCookie(header, null);
// @ts-expect-error explicit string input required
parseCookie(1);
// @ts-expect-error value must be a string
serialize('name', 1);
// @ts-expect-error boolean flags are not strings
serialize('name', 'value', { secure: 'false' });
// @ts-expect-error encoder returns a string
stringifyCookie({ x: 'y' }, { encode: () => 1 });
// @ts-expect-error name is required
stringifySetCookie({ value: 'x' });
// @ts-expect-error parsed cookie may be absent
const required: string = value;
void [required, value];
