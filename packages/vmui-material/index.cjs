"use strict";
const {iconUtilities,...text}=require("./text.cjs");
module.exports={...require("./buttons.cjs"),...text,...require("./theme.cjs"),...require("./surfaces.cjs"),...require("./forms.cjs"),...require("./input-base.cjs"), ...require("./input-variants.cjs"),...require("./input-decorations.cjs"),...require("./text-field.cjs"),...require("./lists.cjs"),...require("./menus.cjs"),...require("./select-input.cjs"),...require("./check-controls.cjs"),...require("./radio-controls.cjs"),...require("./switch-control.cjs"),...require("./chip-control.cjs"),...require("./avatar-control.cjs"),...require("./progress-control.cjs"),...require("./skeleton-control.cjs"),...require("./container-control.cjs"),...require("./cards.cjs"),...require("./card-action-area.cjs"),...require("./avatar-group.cjs"),...require("./tooltips.cjs")};

Object.assign(module.exports,require("./collapses.cjs"));

Object.assign(module.exports,require("./dialog-parts.cjs"));

Object.assign(module.exports,require("./dialogs.cjs"));

Object.assign(module.exports,require("./slides.cjs"));

Object.assign(module.exports,require("./dialog-text.cjs"));

Object.assign(module.exports,require("./drawers.cjs"));

Object.assign(module.exports,require("./swipeable-drawers.cjs"));

Object.assign(module.exports,require('./tables.cjs'));

Object.assign(module.exports,require('./autocomplete-control.cjs'));

Object.assign(module.exports,require('./table-navigation.cjs'));

Object.assign(module.exports,require('./linear-progress.cjs'));

Object.assign(module.exports,require('./alerts.cjs'));

Object.assign(module.exports,require('./badges.cjs'));

Object.assign(module.exports,require('./bars.cjs'));

Object.assign(module.exports,require('./accordion-parts.cjs'));

Object.assign(module.exports,require('./accordions.cjs'));

Object.assign(module.exports,require('./tab-navigation.cjs'));

Object.assign(module.exports,require('./breadcrumb-trail.cjs'));
Object.assign(module.exports,require('./snackbars.cjs'));
Object.assign(module.exports,require('./stack-layout.cjs'));
Object.assign(module.exports,require('./grid-layout.cjs'));
Object.assign(module.exports,require('./rating-control.cjs'));
Object.assign(module.exports, require("./click-away.cjs"));
Object.assign(module.exports, require("./grow-transition.cjs"));
Object.assign(module.exports, require("./search-popper.cjs"));
Object.assign(module.exports, require("./font-slider.cjs"));
Object.assign(module.exports, require("./registration-steps.cjs"));
Object.assign(module.exports,require("./course-step-content.cjs"));

module.exports.CssBaseline = require("./CssBaseline.cjs");

module.exports.createTheme = require("./create-theme.cjs").createTheme;

// Material exposes the owned System color helpers at its root as well as styles.
{
 const colors = require("vmui-system");
 module.exports.alpha = colors.alpha;
 module.exports.darken = colors.darken;
 module.exports.decomposeColor = colors.decomposeColor;
 module.exports.emphasize = colors.emphasize;
 module.exports.getContrastRatio = colors.getContrastRatio;
 module.exports.getLuminance = colors.getLuminance;
 module.exports.hexToRgb = colors.hexToRgb;
 module.exports.hslToRgb = colors.hslToRgb;
 module.exports.lighten = colors.lighten;
 module.exports.recomposeColor = colors.recomposeColor;
 module.exports.rgbToHex = colors.rgbToHex;
}

Object.assign(module.exports, require("./fade-control.cjs"), require("./table-pagination.cjs"), require("./autocomplete-hook.cjs"));
module.exports.Unstable_TrapFocus=require("./focus-trap.cjs").TrapFocus;
