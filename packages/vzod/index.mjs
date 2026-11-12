import api from "./index.cjs";
export const {string,number,boolean,object,array,union,literal,record,lazy,unknown,any,email,url,strictObject,looseObject,coerce,ZodError,ZodType,ZodIssueCode,z}=api;
const enumeration=api.enum;
export {enumeration as enum};
export default api.z;
