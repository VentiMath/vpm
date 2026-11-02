"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { IamClient } = require("../build/src/iamService");
const { GrpcClient } = require("../build/src/grpc");
const { GoogleAuth, PassThroughClient } = require("vgoogle-auth-library");
const grpc = require("vgrpc-js");
test("IAM supplies valid defaults and preserves explicit endpoint and port options", async () => {
  for (const [options, expected] of [
    [{}, "cloudkms.googleapis.com:443"],
    [{ apiEndpoint: "custom.invalid", port: 8443 }, "custom.invalid:8443"],
    [
      {
        servicePath: "service.invalid",
        apiEndpoint: "alias.invalid",
        port: 9443,
      },
      "service.invalid:9443",
    ],
  ]) {
    const transport = new GrpcClient();
    transport.auth = new GoogleAuth({ authClient: new PassThroughClient() });
    const input = Object.freeze({ ...options, projectId: "fixture" }),
      client = new IamClient(transport, input);
    const stub = await client.initialize();
    try {
      assert.equal(stub.getChannel().getTarget(), expected);
      assert.deepEqual(input, { ...options, projectId: "fixture" });
    } finally {
      stub.close();
    }
  }
});
test("malformed explicit endpoints remain rejected by gRPC target validation", () => {
  assert.throws(
    () =>
      new grpc.Client("undefined:undefined", grpc.credentials.createInsecure()),
  );
  assert.throws(
    () =>
      new grpc.Client(
        "user:secret@example.com",
        grpc.credentials.createInsecure(),
      ),
    /Credentials/,
  );
});
