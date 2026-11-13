"use strict";
const api = require("./index.cjs");
module.exports = {
	__esModule: true,
	default: api.createCssVarsProvider,
	prepareCssVars: api.prepareCssVars,
	prepareTypographyVars: api.prepareTypographyVars,
	createCssVarsTheme: api.createCssVarsTheme,
	createGetColorSchemeSelector: api.createGetColorSchemeSelector,
};
