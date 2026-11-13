"use strict";
const api = require("./index.cjs");
module.exports = {
	__esModule: true,
	hexToRgb: api.hexToRgb,
	decomposeColor: api.decomposeColor,
	recomposeColor: api.recomposeColor,
	hslToRgb: api.hslToRgb,
	rgbToHex: api.rgbToHex,
	colorChannel: api.colorChannel,
	alpha: api.alpha,
	darken: api.darken,
	lighten: api.lighten,
	getLuminance: api.getLuminance,
	getContrastRatio: api.getContrastRatio,
	emphasize: api.emphasize,
	blend: api.blend,
	private_safeAlpha: api.private_safeAlpha,
	private_safeDarken: api.private_safeDarken,
	private_safeLighten: api.private_safeLighten,
	private_safeEmphasize: api.private_safeEmphasize,
	private_safeColorChannel: api.private_safeColorChannel,
};
