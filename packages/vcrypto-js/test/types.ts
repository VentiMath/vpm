import api, {
  SHA256,
  HmacSHA256,
  WordArray,
  enc,
  type Message,
} from "vcrypto-js";
import hash from "vcrypto-js/sha256";
import hmac from "vcrypto-js/hmac-sha256";
import Base64 from "vcrypto-js/enc-base64";
import Utf8 from "vcrypto-js/enc-utf8";
const input: Message = Utf8.parse("α math");
const output: string = Base64.stringify(hmac(input, "key"));
const version: string = hash(
  JSON.stringify(["problem-a", "problem-b"]),
).toString();
const array: WordArray = SHA256(new Uint8Array([1, 2, 3]));
array.clone().concat(enc.Hex.parse("ab"));
void [output, version, HmacSHA256(input, "key"), api.lib.WordArray.create([1])];
// @ts-expect-error hashes require data
SHA256();
// @ts-expect-error unsupported cipher is not advertised
api.AES;
