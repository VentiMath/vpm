const api = require("./src/hooks.cjs");
module.exports = {
  __esModule: true,
  default: api.useIsFocusVisible,
  teardown: api.teardown,
};
