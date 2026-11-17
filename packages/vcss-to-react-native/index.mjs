import * as api from './index.cjs';
// Bun unwraps Babel-compatible CommonJS defaults; Node exposes exports itself.
export default typeof api.default === 'function' ? api.default : api.default.default;
export const {getPropertyName, getStylesForProperty} = api;
