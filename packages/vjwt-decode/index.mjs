import jwtDecode from "./index.cjs";
const { InvalidTokenError } = jwtDecode;
export { jwtDecode, InvalidTokenError };
export default jwtDecode;
