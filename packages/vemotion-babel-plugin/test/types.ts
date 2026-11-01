import plugin = require('vemotion-babel-plugin');
import type {EmotionBabelPluginOptions} from 'vemotion-babel-plugin';
const options: EmotionBabelPluginOptions = {autoLabel: 'dev-only', labelFormat: '[filename]--[local]', sourceMap: false, importMap: {'my-ui': {styled: {canonicalImport: ['@emotion/styled', 'default']}}}};
const configured: [typeof plugin, EmotionBabelPluginOptions] = [plugin, options];
// @ts-expect-error autoLabel takes one of three values
const wrong: EmotionBabelPluginOptions = {autoLabel: 'sometimes'};
void [configured, wrong];
