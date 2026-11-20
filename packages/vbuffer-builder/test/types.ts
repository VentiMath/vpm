import BufferBuilder = require('../index.cjs');
const builder = new BufferBuilder(8).appendUInt8(130).appendUInt8(1);
const target = new Uint8Array(builder.length);
const bytes:number = builder.copy(target);
const hex:string = builder.get().toString('hex');
void [bytes,hex];
