import Long from 'vlong';
const value: Long = Long.fromString('18446744073709551615', true);
const decoded: Long = Long.fromBytes(new Uint8Array(8), true);
const result: bigint = value.add(decoded).toBigInt();
const text: string = Long.MAX_UNSIGNED_VALUE.toString();
value.low = 123;
// @ts-expect-error predefined values cannot be mutated
Long.ZERO.low = 1;
// @ts-expect-error constants cannot be replaced
Long.ZERO = value;
void result; void text;
