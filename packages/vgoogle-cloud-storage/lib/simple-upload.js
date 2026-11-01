"use strict";
const { Transform } = require("node:stream");
const { snapshot } = require("./save.js");
const { GCCL_GCS_CMD_KEY } = require("./util.js");

// An upload attempt is one-shot. File.save owns retries using fresh streams;
// neither the HTTP adapter nor authentication may replay this consumed body.
exports.startSimpleUpload = function startSimpleUpload(
  file,
  destination,
  supplied = {},
) {
  if (destination.destroyed) return;
  const controller = new AbortController();
  let progress,
    settled = false,
    written = 0;
  function detach() {
    destination.removeListener("close", cancel);
    destination.removeListener("error", fail);
  }
  function cancel() {
    if (settled) return;
    settled = true;
    detach();
    // No supplied failure: the HTTP adapter creates the public AbortError.
    // Avoid allocating an unused default DOMException stack on cancellation.
    controller.abort(null);
    progress?.destroy();
  }
  function fail(error) {
    if (settled) return;
    settled = true;
    detach();
    controller.abort(error);
    progress?.destroy(error);
    if (!destination.destroyed) destination.destroy(error);
  }
  destination.once("close", cancel);
  destination.once("error", fail);
  try {
    const uri = `${file.storage.apiEndpoint}/upload/storage/v1/b/${file.bucket.name}/o`;
    const options = snapshot(supplied),
      metadata = options.metadata || {};
    const query = { uploadType: "multipart", name: file.name };
    if (file.generation !== undefined)
      query.ifGenerationMatch = file.generation;
    if (file.kmsKeyName !== undefined) query.kmsKeyName = file.kmsKeyName;
    const userProject = options.userProject || file.userProject;
    if (userProject) query.userProject = userProject;
    const acl =
      options.predefinedAcl ||
      (options.private ? "private" : options.public ? "publicRead" : undefined);
    if (acl) query.predefinedAcl = acl;
    Object.assign(
      query,
      snapshot(file.instancePreconditionOpts),
      options.preconditionOpts,
    );
    const serialized = JSON.stringify(metadata);
    progress = new Transform({
      transform(chunk, encoding, callback) {
        written += chunk.length;
        destination.emit("progress", {
          bytesWritten: written,
          contentLength: "*",
        });
        callback(null, chunk);
      },
    });
    // Keep an error handler through async stream teardown; its guard settles once.
    progress.on("error", fail);
    destination.setWritable(progress);
    if (destination.destroyed || settled) {
      cancel();
      return;
    }
    const request = {
      uri,
      method: "POST",
      qs: query,
      timeout: typeof options.timeout === "number" ? options.timeout : 0,
      maxRetries: 0,
      signal: controller.signal,
      [GCCL_GCS_CMD_KEY]: options[GCCL_GCS_CMD_KEY],
      multipart: [
        { "Content-Type": "application/json", body: serialized },
        {
          "Content-Type": metadata.contentType || "application/octet-stream",
          body: progress,
        },
      ],
    };
    // SDK request dispatch retains auth, encryption/interceptor headers and
    // error conversion. VPM teeny-request owns MIME framing and native transport.
    file.request(request, (error, body, response) => {
      if (settled || destination.destroyed) return;
      if (error) {
        fail(error);
        return;
      }
      settled = true;
      detach();
      file.metadata = body;
      destination.emit("metadata", body);
      if (!destination.destroyed) destination.emit("response", response);
      if (!destination.destroyed) destination.emit("complete");
    });
  } catch (error) {
    fail(error);
  }
};
