"use strict";
// Shared only by dialog components. The future Dialog owns ID generation;
// a title must not invent an ID disconnected from its parent's aria-labelledby.
module.exports = require('react').createContext({});
