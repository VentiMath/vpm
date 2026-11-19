import EE = require('veventemitter3');
const emitter = new EE<{change:[string]}>();
emitter.on('change',id=>id.toUpperCase());
const same:EE.EventEmitterStatic=EE.EventEmitter;void same;
// @ts-expect-error missing argument
emitter.emit('change');
