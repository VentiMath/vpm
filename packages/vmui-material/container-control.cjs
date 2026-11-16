'use strict';
const React = require('react');
const { styled, useThemeProps } = require('./theme.cjs');
const utility = slot => 'MuiContainer-' + slot;
const containerClasses = Object.freeze(Object.fromEntries([
  'root', 'disableGutters', 'fixed', 'maxWidthXs', 'maxWidthSm', 'maxWidthMd', 'maxWidthLg', 'maxWidthXl',
].map(slot => [slot, utility(slot)])));
const empty = Object.freeze({});
const slots = state => ['root', state.maxWidth && 'maxWidth' + state.maxWidth[0].toUpperCase() + state.maxWidth.slice(1),
  state.fixed && 'fixed', state.disableGutters && 'disableGutters'].filter(Boolean);
const Root = styled('div', {
  name: 'MuiContainer', slot: 'Root',
  overridesResolver: ({ ownerState }, overrides) => slots(ownerState).map(slot => Object.hasOwn(overrides, slot) && overrides[slot]),
})(({ theme, ownerState }) => {
  const { breakpoints, spacing } = theme;
  const { fixed, maxWidth, disableGutters } = ownerState;
  const rules = [{ width: '100%', boxSizing: 'border-box', marginLeft: 'auto', marginRight: 'auto' }];
  if (!disableGutters) rules.push({ paddingLeft: spacing(2), paddingRight: spacing(2),
    [breakpoints.up('sm')]: { paddingLeft: spacing(3), paddingRight: spacing(3) } });
  if (fixed) for (const key of breakpoints.keys) {
    const width = breakpoints.values[key];
    if (width !== 0) rules.push({ [breakpoints.up(key)]: { maxWidth: width + breakpoints.unit } });
  }
  // Keep the explicit cap after every fixed-width rule. Merging media-query
  // objects would move a small cap before the larger fixed breakpoints.
  if (maxWidth && Object.hasOwn(breakpoints.values, maxWidth)) {
    const width = maxWidth === 'xs' ? Math.max(444, breakpoints.values.xs) : breakpoints.values[maxWidth];
    rules.push({ [breakpoints.up(maxWidth)]: { maxWidth: maxWidth === 'xs' ? width : width + breakpoints.unit } });
  }
  return rules;
});
const Container = React.forwardRef(function Container(input, ref) {
  const props = useThemeProps({ props: input, name: 'MuiContainer' });
  const { component = 'div', maxWidth = 'lg', fixed = false, disableGutters = false,
    classes = empty, className, children, ...rest } = props;
  const state = { ...props, maxWidth, fixed, disableGutters };
  const names = slots(state).flatMap(slot => [utility(slot), Object.hasOwn(classes, slot) && classes[slot]]);
  return React.createElement(Root, { ...rest, as: component, ref, ownerState: state,
    className: [...names, className].filter(Boolean).join(' ') }, children);
});
Container.displayName = 'Container';
module.exports = { Container, containerClasses, getContainerUtilityClass: utility };
