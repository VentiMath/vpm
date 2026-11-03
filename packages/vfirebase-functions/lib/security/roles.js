'use strict';
const {globalManifest}=require('../runtime/manifest.js');
const current=()=>Array.isArray(globalManifest.requiredRoles)?globalManifest.requiredRoles:[];
function registerRole(role){if(!current().includes(role)){if(!Array.isArray(globalManifest.requiredRoles))globalManifest.requiredRoles=[];globalManifest.requiredRoles.push(role);}}
const declaredRoles={
  get size(){return current().length},add:registerRole,
  has:role=>current().includes(role),
  delete(role){const list=current(),index=list.indexOf(role);if(index<0)return false;list.splice(index,1);return true;},
  clear(){delete globalManifest.requiredRoles;},
  keys(){return current().values()},values(){return current().values()},[Symbol.iterator](){return current().values()},
  *entries(){for(const role of current())yield [role,role]},
  forEach(callback,thisArg){for(const role of current())callback.call(thisArg,role,role,declaredRoles)},
};
module.exports={registerRole,declaredRoles};
