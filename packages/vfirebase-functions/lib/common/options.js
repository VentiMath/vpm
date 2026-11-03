'use strict';
const marker=Symbol.for('firebase-functions:ResetValue:Tag');
class ResetValue {
  static [Symbol.hasInstance](value){return value?.[marker]===true;}
  get [marker](){return true;}
  static getInstance(){return new ResetValue();}
  toJSON(){return null;}
}
module.exports={ResetValue,RESET_VALUE:new ResetValue()};
