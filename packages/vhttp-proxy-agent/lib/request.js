'use strict';
// Delayed agent delegation may receive headers already buffered by ClientRequest.
// Only replace a verified header prefix; preserve queued body bytes and encoding.
function buffered(request) {
  const previous = request._header;
  if (!previous) return null;
  const sent = request._headerSent, first = request.outputData?.[0];
  if (sent) {
    const data = first?.data;
    const matches = typeof data === 'string' ? data.startsWith(previous) : Buffer.isBuffer(data) && data.subarray(0, previous.length).equals(Buffer.from(previous, 'latin1'));
    if (!matches) throw new Error('Cannot change proxy headers after request bytes have been sent');
  }
  return {previous, sent, first};
}
function rebuild(request, saved) {
  if (!saved) return;
  request._implicitHeader();
  if (!saved.sent) return;
  const {first, previous} = saved, header = request._header;
  first.data = typeof first.data === 'string' ? header + first.data.slice(previous.length) : Buffer.concat([Buffer.from(header, 'latin1'), first.data.subarray(previous.length)]);
  const delta = header.length - previous.length;
  request.outputSize += delta;
  request._onPendingData?.(delta);
  request._headerSent = true;
}
module.exports = {buffered, rebuild};
