'use strict';
const React = require('react');
const { alpha } = require('vmui-system');
const { styled, useThemeProps } = require('./theme.cjs');
const h = React.createElement;
const empty = Object.freeze({});
const utility = slot => 'MuiSkeleton-' + slot;
const skeletonClasses = Object.freeze(Object.fromEntries([
  'root', 'text', 'rectangular', 'rounded', 'circular', 'pulse', 'wave',
  'withChildren', 'fitContent', 'heightAuto',
].map(slot => [slot, utility(slot)])));
const join = (...values) => values.filter(Boolean).join(' ');
const slots = state => ['root', state.variant, state.animation,
  state.hasChildren && 'withChildren', state.hasChildren && !state.width && 'fitContent',
  state.hasChildren && !state.height && 'heightAuto'].filter(Boolean);
const Root = styled('span', {
  name: 'MuiSkeleton', slot: 'Root',
  overridesResolver: ({ ownerState }, overrides) => slots(ownerState).map(slot => Object.hasOwn(overrides, slot) && overrides[slot]),
})(({ theme, ownerState: state }) => {
  const palette = theme.vars?.palette || theme.palette;
  const radius = theme.shape?.borderRadius ?? 4;
  const styles = {
    display: 'block',
    backgroundColor: palette.Skeleton?.bg || alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.13 : 0.11),
    height: '1.2em',
  };
  if (state.variant === 'text') Object.assign(styles, {
    marginTop: 0, marginBottom: 0, height: 'auto', transformOrigin: '0 55%', transform: 'scale(1, 0.6)',
    borderRadius: typeof radius === 'number' ? `${radius}px / ${(radius / 0.6).toFixed(1)}px` : `${radius} / calc(${radius} / 0.6)`,
    '&:empty:before': { content: '"\\00a0"' },
  });
  if (state.variant === 'rounded') styles.borderRadius = radius;
  if (state.variant === 'circular') styles.borderRadius = '50%';
  if (state.hasChildren) Object.assign(styles, {
    // Native inert removes measurement content from focus/accessibility. This
    // also hides direct text nodes, which the child-element rule cannot reach.
    color: 'transparent', '& > *': { visibility: 'hidden' },
    ...(!state.width && { maxWidth: 'fit-content' }), ...(!state.height && { height: 'auto' }),
  });
  if (state.animation === 'pulse') Object.assign(styles, {
    animation: 'vpm-skeleton-pulse 2s ease-in-out 0.5s infinite',
    '@keyframes vpm-skeleton-pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
  });
  if (state.animation === 'wave') Object.assign(styles, {
    position: 'relative', overflow: 'hidden', WebkitMaskImage: '-webkit-radial-gradient(white, black)',
    '&::after': {
      content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `linear-gradient(90deg, transparent, ${palette.action?.hover || (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)')}, transparent)`,
      transform: 'translateX(-100%)', animation: 'vpm-skeleton-wave 2s linear 0.5s infinite',
    },
    '@keyframes vpm-skeleton-wave': { '0%': { transform: 'translateX(-100%)' }, '50%, 100%': { transform: 'translateX(100%)' } },
  });
  if (state.animation) styles['@media (prefers-reduced-motion: reduce)'] = { animation: 'none', '&::after': { animation: 'none' } };
  return styles;
});
const Skeleton = React.forwardRef(function Skeleton(input, ref) {
  const props = useThemeProps({ props: input, name: 'MuiSkeleton' });
  const { animation = 'pulse', variant = 'text', component = 'span', children,
    width, height, classes = empty, className, style, ...rest } = props;
  const hasChildren = Boolean(children) || children === 0;
  const state = { ...props, animation, variant, hasChildren, width, height };
  return h(Root, {
    ...rest, as: component, ref, ownerState: state, ...(hasChildren && { inert: true }),
    className: join(...slots(state).map(slot => join(utility(slot), Object.hasOwn(classes, slot) && classes[slot])), className),
    style: { width, height, ...style },
  }, children);
});
Skeleton.displayName = 'Skeleton';
Skeleton.muiName = 'Skeleton';
module.exports = { Skeleton, skeletonClasses, getSkeletonUtilityClass: utility };
