"use strict";
const tls = require("node:tls"),
  fs = require("node:fs");
const { CallCredentials } = require("../build/src/call-credentials");
const settings = new WeakMap();
class ChannelCredentials {
  static createInsecure() {
    return new ChannelCredentials({
      secure: false,
      auth: CallCredentials.createEmpty(),
    });
  }
  static createSsl(ca, key, cert, verifyOptions = {}) {
    for (const [name, value] of [
      ["Root certificate", ca],
      ["Private key", key],
      ["Certificate chain", cert],
    ])
      if (value && !Buffer.isBuffer(value))
        throw TypeError(`${name}, if provided, must be a Buffer.`);
    if (!!key !== !!cert)
      throw Error(
        key
          ? "Private key must be given with accompanying certificate chain"
          : "Certificate chain must be given with accompanying private key",
      );
    if (ca == null && process.env.GRPC_DEFAULT_SSL_ROOTS_FILE_PATH)
      ca = fs.readFileSync(process.env.GRPC_DEFAULT_SSL_ROOTS_FILE_PATH);
    return ChannelCredentials.createFromSecureContext(
      tls.createSecureContext({
        ca: ca ?? undefined,
        key: key ?? undefined,
        cert: cert ?? undefined,
        ciphers: process.env.GRPC_SSL_CIPHER_SUITES,
      }),
      verifyOptions,
    );
  }
  static createFromSecureContext(secureContext, verifyOptions = {}) {
    if (!secureContext || typeof secureContext !== "object")
      throw TypeError("A TLS SecureContext is required");
    return new ChannelCredentials({
      secure: true,
      secureContext,
      verifyOptions: { ...verifyOptions },
      auth: CallCredentials.createEmpty(),
    });
  }
  constructor(value) {
    if (value) settings.set(this, value);
  }
  compose(auth) {
    const value = settings.get(this);
    if (!value?.secure) throw Error("Cannot compose insecure credentials");
    return new ChannelCredentials({ ...value, auth: value.auth.compose(auth) });
  }
  _isSecure() {
    return settings.get(this)?.secure === true;
  }
  _equals(other) {
    const a = settings.get(this),
      b = settings.get(other);
    return (
      this === other ||
      (!!a &&
        !!b &&
        a.secure === b.secure &&
        a.secureContext === b.secureContext &&
        a.auth._equals(b.auth) &&
        a.verifyOptions?.checkServerIdentity ===
          b.verifyOptions?.checkServerIdentity)
    );
  }
}
function connectionOptions(credentials, host, options) {
  const value = settings.get(credentials);
  if (!value)
    throw TypeError("Channel credentials must be created by vgrpc-js");
  const servername = options["grpc.ssl_target_name_override"] || host;
  return {
    secure: value.secure,
    auth: value.auth,
    tls: value.secure
      ? {
          secureContext: value.secureContext,
          servername: require("node:net").isIP(servername)
            ? undefined
            : servername,
          // Verify against the logical server name even when the transport connects to an IP.
          checkServerIdentity: (_host, cert) =>
            (
              value.verifyOptions.checkServerIdentity || tls.checkServerIdentity
            )(servername, cert),
          rejectUnauthorized: true,
        }
      : undefined,
  };
}
module.exports = { ChannelCredentials, connectionOptions };
