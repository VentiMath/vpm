'use strict';
class RasterError extends Error {constructor(code,message){super(message);this.name='RasterError';this.code=code;}}
exports.RasterError=RasterError;
