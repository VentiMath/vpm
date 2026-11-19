'use strict';

const React = require('react');
const { styled, useThemeProps } = require('./theme.cjs');
const { Paper } = require('./surfaces.cjs');
const { Collapse } = require('./collapses.cjs');
const Context = require('./accordion-context.cjs');
const h = React.createElement;
const join = (...values) => values.filter(Boolean).join(' ');
const keys = ['root', 'rounded', 'expanded', 'disabled', 'gutters', 'region', 'heading'];

function getAccordionUtilityClass(slot) {
  return ['expanded','disabled','focusVisible','selected','checked','error','focused','required','readOnly','active','completed'].includes(slot)
    ? 'Mui-' + slot : 'MuiAccordion-' + slot;
}
const accordionClasses = Object.freeze(Object.fromEntries(keys.map(key => [key, getAccordionUtilityClass(key)])));
function transition(theme, properties) {
  const duration = theme.transitions?.duration?.shortest ?? 150;
  return theme.transitions?.create?.(properties, {duration}) ??
    properties.map(p => p + ' ' + duration + 'ms cubic-bezier(0.4, 0, 0.2, 1) 0ms').join(',');
}
const Root = styled(Paper, {
  name: 'MuiAccordion', slot: 'Root',
  overridesResolver: ({ownerState}, styles) => [styles.root, !ownerState.square && styles.rounded, !ownerState.disableGutters && styles.gutters]
})(({theme, ownerState}) => {
  const palette = theme.vars?.palette || theme.palette;
  const radius = theme.vars?.shape?.borderRadius ?? theme.shape.borderRadius;
  return {
    position: 'relative', overflowAnchor: 'none', transition: transition(theme,['margin']),
    '&::before': {
      content: '""', position: 'absolute', top: -1, left: 0, right: 0, height: 1,
      opacity: 1, backgroundColor: palette.divider, transition: transition(theme,['opacity','background-color'])
    },
    '&:first-of-type::before, &.Mui-expanded + .MuiAccordion-root.Mui-expanded::before': {display:'none'},
    '&.Mui-expanded::before': {opacity:0},
    '&.Mui-disabled': {backgroundColor:palette.action?.disabledBackground ?? 'rgba(0, 0, 0, 0.12)'},
    ...(!ownerState.disableGutters && {'&.Mui-expanded': {margin:'16px 0'}}),
    '&.Mui-expanded:first-of-type': {marginTop:0},
    '&.Mui-expanded:last-of-type': {marginBottom:0},
    ...(!ownerState.square && {
      borderRadius:0,
      '&:first-of-type': {borderTopLeftRadius:radius,borderTopRightRadius:radius},
      '&:last-of-type': {borderBottomLeftRadius:radius,borderBottomRightRadius:radius}
    })
  };
});
const Heading = styled('h3', {name:'MuiAccordion',slot:'Heading'})({all:'unset'});
const Region = styled('div', {name:'MuiAccordion',slot:'Region'})({});

function slotProps(value, state) {
  return (typeof value === 'function' ? value(state) : value) || {};
}
function mergeRefs(first, second) {
  if (!first || !second) return first || second;
  return node => {
    const cleanups = [first, second].map(ref => {
      if (typeof ref === 'function') {
        const cleanup = ref(node);
        return typeof cleanup === 'function' ? cleanup : () => ref(null);
      }
      ref.current = node;
      return () => { ref.current = null };
    });
    return () => cleanups.forEach(cleanup => cleanup());
  };
}
function part(Component, props, base, state, defaultSlot) {
  const {component, className, ...attributes} = props;
  const merged = {...base, ...attributes, className:join(base.className, className)};
  if (typeof Component !== 'string') merged.ownerState = state;
  if (component && Component === defaultSlot) merged.as = component;
  return [Component, merged];
}

const Accordion = React.forwardRef(function Accordion(input, ref) {
  const props = useThemeProps({props:input, name:'MuiAccordion'});
  const {children, defaultExpanded=false, expanded:controlled, disabled=false, disableGutters=false,
    square=false, onChange, slots={}, slotProps:options={}, classes={}, className, ...paper} = props;
  const [local, setLocal] = React.useState(defaultExpanded);
  const expanded = controlled ?? local;
  const toggle = React.useCallback(event => {
    if (disabled) return;
    if (controlled === undefined) setLocal(!expanded);
    onChange?.(event, !expanded);
  }, [disabled, controlled, expanded, onChange]);
  const context = React.useMemo(() => ({expanded,disabled,disableGutters,toggle}), [expanded,disabled,disableGutters,toggle]);
  const state = {...props, expanded, disabled, disableGutters, square};
  const [summary, ...details] = React.Children.toArray(children);
  const slotClass = key => join(accordionClasses[key], classes[key]);
  const root = slotProps(options.root,state);
  const rootRef = React.useMemo(()=>mergeRefs(ref,root.ref),[ref,root.ref]);
  const rootClass = join(slotClass('root'), !square && slotClass('rounded'), expanded && slotClass('expanded'),
    disabled && slotClass('disabled'), !disableGutters && slotClass('gutters'), className, root.className);
  const [heading, headingProps] = part(slots.heading || Heading, slotProps(options.heading,state),
    {className:slotClass('heading')}, state, Heading);
  const [region, regionProps] = part(slots.region || Region, slotProps(options.region,state),
    {id:summary?.props?.['aria-controls'], 'aria-labelledby':summary?.props?.id, role:'region', className:slotClass('region')}, state, Region);
  const rootType = slots.root || Root;
  const rootProps = {...paper,...root, ref:rootRef, className:rootClass};
  if (typeof rootType !== 'string') Object.assign(rootProps,{square,ownerState:state});
  return h(rootType,rootProps,
    h(heading,headingProps,h(Context.Provider,{value:context},summary)),
    h(slots.transition || Collapse,{timeout:'auto',in:expanded,...slotProps(options.transition,state)},
      h(region,regionProps,details)));
});
Accordion.displayName = 'Accordion';
module.exports = { Accordion, accordionClasses, getAccordionUtilityClass };
