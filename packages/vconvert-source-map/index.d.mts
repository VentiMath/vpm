import * as api from "./index.cjs";
export default api;
export type { CommentOptions, Converter } from "./index.cjs";
export {
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
} from "./index.cjs";
