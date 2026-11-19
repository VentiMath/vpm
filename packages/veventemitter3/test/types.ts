import EE = require('../index.cjs');
const bus=new EE<{update:[id:string,count:number]}>();
bus.on('update',(id,n)=>id+n).emit('update','contest',1);
// @ts-expect-error count is required
bus.emit('update','contest');
