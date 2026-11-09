"use strict";
const { makeClient, ...api } = require("./client.cjs");
const ky = makeClient();
module.exports = Object.assign(ky, { default: ky, ...api });
