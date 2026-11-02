"use strict";
const http2 = require("node:http2");
let count = 0;
const server = http2.createServer();
server.on("stream", (stream) => {
  stream.on("error", () => {});
  stream.on("data", () => {});
  if (process.argv[2] === "cancel") {
    stream.close(http2.constants.NGHTTP2_CANCEL);
    return;
  }
  if (++count === 1) {
    stream.close(http2.constants.NGHTTP2_REFUSED_STREAM);
    return;
  }
  stream.respond(
    { ":status": 200, "content-type": "application/grpc" },
    { waitForTrailers: true },
  );
  stream.on("wantTrailers", () => stream.sendTrailers({ "grpc-status": "0" }));
  const b = Buffer.from(JSON.stringify({ attempts: count })),
    h = Buffer.alloc(5);
  h.writeUInt32BE(b.length, 1);
  stream.end(Buffer.concat([h, b]));
});
server.listen(0, "127.0.0.1", () =>
  process.stdout.write(String(server.address().port) + "\n"),
);
