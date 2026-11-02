'use strict';
module.exports=(...args)=>{const probe=globalThis.__vpmShallowProbe;probe.calls++;return probe.compare(...args);};
