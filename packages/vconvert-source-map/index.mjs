import api from "./index.cjs";
export default api;
export const {
  fromObject,
  fromJSON,
  fromURI,
  fromBase64,
  fromComment,
  fromSource,
  fromMapFileComment,
  fromMapFileSource,
  removeComments,
  removeMapFileComments,
  generateMapFileComment,
} = api;
