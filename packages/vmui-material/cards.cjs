'use strict';
const React = require('react');
const { styled, useThemeProps } = require('./theme.cjs');
const { Paper } = require('./surfaces.cjs');
const empty = Object.freeze({});
const rootClass = (name, classes, className) => ['Mui' + name + '-root',
  Object.hasOwn(classes, 'root') && classes.root, className].filter(Boolean).join(' ');
// Paper owns the surface, elevation and dark overlay. Card adds clipping and its
// own theme layer, so app Paper and Card overrides continue to compose.
const CardRoot = styled(Paper, {
  name: 'MuiCard', slot: 'Root', overridesResolver: (_, overrides) => overrides.root,
})({ overflow: 'hidden' });
const ContentRoot = styled('div', {
  name: 'MuiCardContent', slot: 'Root', overridesResolver: (_, overrides) => overrides.root,
})({ padding: 16, '&:last-child': { paddingBottom: 24 } });
const Card = React.forwardRef(function Card(input, ref) {
  const props = useThemeProps({ props: input, name: 'MuiCard' });
  const { raised = false, classes = empty, className, ...rest } = props;
  return React.createElement(CardRoot, {
    elevation: raised ? 8 : undefined, ...rest, ref, ownerState: { ...props, raised },
    className: rootClass('Card', classes, className),
  });
});
const CardContent = React.forwardRef(function CardContent(input, ref) {
  const props = useThemeProps({ props: input, name: 'MuiCardContent' });
  const { component = 'div', classes = empty, className, ...rest } = props;
  return React.createElement(ContentRoot, { ...rest, as: component, ref, ownerState: props,
    className: rootClass('CardContent', classes, className) });
});
const api = { Card, CardContent };
for (const name of ['Card', 'CardContent']) {
  api[name].displayName = name;
  api['get' + name + 'UtilityClass'] = slot => 'Mui' + name + '-' + slot;
  api[name[0].toLowerCase() + name.slice(1) + 'Classes'] = Object.freeze({ root: 'Mui' + name + '-root' });
}
module.exports = api;
