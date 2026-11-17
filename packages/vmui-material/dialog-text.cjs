"use strict";
const React = require('react');
const {styled, useThemeProps} = require('./theme.cjs');
const {Typography} = require('./text.cjs');

const TextRoot = styled(Typography, {
  name: 'MuiDialogContentText', slot: 'Root',
  overridesResolver: (_, styles) => styles.root,
})({});
const DialogContentText = React.forwardRef(function DialogContentText(input, ref) {
  const props = useThemeProps({props: input, name: 'MuiDialogContentText'});
  const {classes, className, ...rest} = props;
  return React.createElement(TextRoot, {
    component: 'p', variant: 'body1', color: 'text.secondary', ...rest,
    ref, ownerState: props,
    className: ['MuiDialogContentText-root', classes?.root, className].filter(Boolean).join(' '),
  });
});
DialogContentText.displayName = 'DialogContentText';
module.exports = {
  DialogContentText,
  dialogContentTextClasses: Object.freeze({root: 'MuiDialogContentText-root'}),
  getDialogContentTextUtilityClass: slot => 'MuiDialogContentText-' + slot,
};
