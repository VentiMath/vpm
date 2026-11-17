"use strict";
const React = require('react');
const {styled, useThemeProps} = require('./theme.cjs');
const {Typography} = require('./text.cjs');
const DialogContext = require('./dialog-context.cjs');
const empty = Object.freeze({});
const join = (...parts) => parts.filter(Boolean).join(' ');
const utility = (name, slot) => 'Mui' + name + '-' + slot;

const TitleRoot = styled(Typography, {
  name: 'MuiDialogTitle', slot: 'Root', overridesResolver: (_, styles) => styles.root,
})({padding: '16px 24px', flex: '0 0 auto'});
const ContentRoot = styled('div', {
  name: 'MuiDialogContent', slot: 'Root',
  overridesResolver: ({ownerState}, styles) => [styles.root, ownerState.dividers && styles.dividers],
})(({theme, ownerState}) => ({
  flex: '1 1 auto', WebkitOverflowScrolling: 'touch', overflowY: 'auto',
  padding: ownerState.dividers ? '16px 24px' : '20px 24px',
  ...(ownerState.dividers ? {
    borderTop: '1px solid ' + (theme.vars?.palette || theme.palette).divider,
    borderBottom: '1px solid ' + (theme.vars?.palette || theme.palette).divider,
  } : {'.MuiDialogTitle-root + &': {paddingTop: 0}}),
}));
const ActionsRoot = styled('div', {
  name: 'MuiDialogActions', slot: 'Root',
  overridesResolver: ({ownerState}, styles) => [styles.root, !ownerState.disableSpacing && styles.spacing],
})(({ownerState}) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
  flex: '0 0 auto', padding: 8,
  // Style tags from server rendering must not take a button's spacing position.
  ...(!ownerState.disableSpacing ? {'& > :not(style) ~ :not(style)': {marginLeft: 8}} : empty),
}));

const DialogTitle = React.forwardRef(function DialogTitle(input, ref) {
  const props = useThemeProps({props: input, name: 'MuiDialogTitle'});
  const {classes = empty, className, id, ...rest} = props;
  const context = React.useContext(DialogContext);
  return React.createElement(TitleRoot, {
    component: 'h2', variant: 'h6', ...rest, id: id ?? context.titleId,
    ref, ownerState: props,
    className: join(utility('DialogTitle', 'root'), classes.root, className),
  });
});
const DialogContent = React.forwardRef(function DialogContent(input, ref) {
  const props = useThemeProps({props: input, name: 'MuiDialogContent'});
  const {classes = empty, className, dividers = false, ...rest} = props;
  return React.createElement(ContentRoot, {
    ...rest, ref, ownerState: {...props, dividers},
    className: join(utility('DialogContent', 'root'), dividers && utility('DialogContent', 'dividers'), classes.root, dividers && classes.dividers, className),
  });
});
const DialogActions = React.forwardRef(function DialogActions(input, ref) {
  const props = useThemeProps({props: input, name: 'MuiDialogActions'});
  const {classes = empty, className, disableSpacing = false, ...rest} = props;
  return React.createElement(ActionsRoot, {
    ...rest, ref, ownerState: {...props, disableSpacing},
    className: join(utility('DialogActions', 'root'), !disableSpacing && utility('DialogActions', 'spacing'), classes.root, !disableSpacing && classes.spacing, className),
  });
});
const api = {DialogTitle, DialogContent, DialogActions};
for (const [name, slots] of [['DialogTitle', ['root']], ['DialogContent', ['root', 'dividers']], ['DialogActions', ['root', 'spacing']]]) {
  api[name].displayName = name;
  api['get' + name + 'UtilityClass'] = slot => utility(name, slot);
  api[name[0].toLowerCase() + name.slice(1) + 'Classes'] = Object.freeze(Object.fromEntries(slots.map(slot => [slot, utility(name, slot)])));
}
module.exports = api;
