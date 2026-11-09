import api from "./index.cjs";
export default api;
export const {
  KyError,
  HTTPError,
  TimeoutError,
  NetworkError,
  ResponseSizeError,
  isKyError,
  isHTTPError,
  isTimeoutError,
  isNetworkError,
  isResponseSizeError,
  replaceOption,
} = api;
