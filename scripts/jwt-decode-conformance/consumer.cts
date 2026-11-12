import jwtDecode, {
  jwtDecode as named,
  InvalidTokenError,
  type JwtPayload,
  type JwtHeader,
} from "vjwt-decode";
const { id }: { id: string } = jwtDecode("header.payload.signature");
const payload: JwtPayload = named("token");
const header: JwtHeader = named("token", { header: true });
const custom = named<{ id: string }>("token");
const error: Error = new InvalidTokenError("bad token");
void [id, payload, header, custom.id, error];
// @ts-expect-error token must be a string
named(42);
// @ts-expect-error header option is boolean
named("token", { header: 1 });
