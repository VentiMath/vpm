"use strict";
const { snapshot } = require("./save.js");
const { formatAsUTCISO: date, unicodeJSONStringify } = require("./util.js");
module.exports = function postPolicy(file, supplied = {}) {
  const input = snapshot(supplied),
    expires = new Date(input.expires),
    now = new Date();
  if (!Number.isFinite(+expires))
    return Promise.reject(Error("The expiration date provided was invalid."));
  if (+expires < +now)
    return Promise.reject(Error("An expiration date cannot be in the past."));
  if (+expires - +now > 604800000)
    return Promise.reject(
      Error("Max allowed expiration is seven days (604800 seconds)."),
    );
  const name = file.name,
    bucket = file.bucket.name,
    auth = file.storage.authClient,
    endpoint = file.storage.apiEndpoint,
    universe = file.storage.universeDomain;
  const url =
    file.storage.emulatorHost !== undefined
      ? endpoint + "/" + bucket
      : file.storage.customEndpoint
        ? endpoint
        : input.virtualHostedStyle
          ? `https://${bucket}.storage.${universe}/`
          : input.bucketBoundHostname
            ? input.bucketBoundHostname.replace(/\/$/, "") + "/"
            : `https://storage.${universe}/${bucket}/`;
  return (async () => {
    const credentials = await auth.getCredentials(),
      fields = {
        ...input.fields,
        bucket,
        key: name,
        "x-goog-date": date(now, true),
        "x-goog-credential": `${credentials.client_email}/${date(now)}/auto/storage/goog4_request`,
        "x-goog-algorithm": "GOOG4-RSA-SHA256",
      };
    const conditions = [...(input.conditions || [])];
    for (const [key, value] of Object.entries(fields))
      if (!key.startsWith("x-ignore-")) conditions.push({ [key]: value });
    delete fields.bucket;
    const policy = Buffer.from(
      unicodeJSONStringify({
        conditions,
        expiration: date(expires, true, "-", ":"),
      }),
    ).toString("base64");
    const signature = await auth.sign(policy, input.signingEndpoint);
    return {
      url,
      fields: {
        ...fields,
        policy,
        "x-goog-signature": Buffer.from(signature, "base64").toString("hex"),
      },
    };
  })();
};
