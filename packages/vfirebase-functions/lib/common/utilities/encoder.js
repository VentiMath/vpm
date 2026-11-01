'use strict';
function dateToTimestampProto(value) {
  if (value === undefined) return undefined;
  if (value !== null && typeof value === 'object' && typeof value.seconds === 'number') {
    const nanos = value.nanoseconds ?? value.nanos ?? 0;
    if (!Number.isSafeInteger(value.seconds) || !Number.isInteger(nanos) || nanos < 0 || nanos >= 1000000000) throw new RangeError('Invalid event timestamp');
    return {seconds: value.seconds, nanos};
  }
  const milliseconds = new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) throw new RangeError('Invalid event timestamp');
  const fraction = typeof value === 'string' && /\.(\d+)(?:Z|[+-]\d\d:\d\d)$/i.exec(value);
  return {seconds: Math.floor(milliseconds / 1000), nanos: fraction
    ? Number(fraction[1].padEnd(9, '0').slice(0, 9)) : ((milliseconds % 1000 + 1000) % 1000) * 1000000};
}
exports.dateToTimestampProto = dateToTimestampProto;
