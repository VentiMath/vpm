'use strict';
const {createStack, stackClasses, getStackUtilityClass} = require('vmui-system');
const {styled, useThemeProps} = require('./theme.cjs');

const Stack = createStack({
  createStyledComponent: styled('div', {
    name: 'MuiStack', slot: 'Root', overridesResolver: (_, styles) => styles.root,
  }),
  useThemeProps: props => useThemeProps({props, name:'MuiStack'}),
});
module.exports = {Stack, stackClasses, getStackUtilityClass};
