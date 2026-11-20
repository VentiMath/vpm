'use strict';
const React = require('react');
const { Transition } = require('vreact-transition-group');
const { unstable_useForkRef: useForkRef } = require('vmui-utils');
const { styled, useTheme, useThemeProps } = require('./theme.cjs');
const { Paper } = require('./surfaces.cjs');
const h = React.createElement;
const join = (...parts) => parts.filter(Boolean).join(' ');
const capitalize = word => word[0].toUpperCase() + word.slice(1);
const anchorKey = ({vertical, horizontal}) => 'anchorOrigin' + capitalize(vertical) + capitalize(horizontal);
const getSnackbarUtilityClass = slot => 'MuiSnackbar-' + slot;
const getSnackbarContentUtilityClass = slot => 'MuiSnackbarContent-' + slot;
const classMap = (slots, utility) => Object.freeze(Object.fromEntries(slots.map(k => [k, utility(k)])));
const anchors = ['top','bottom'].flatMap(vertical => ['left','center','right'].map(horizontal => anchorKey({vertical,horizontal})));
const snackbarClasses = classMap(['root', ...anchors], getSnackbarUtilityClass);
const snackbarContentClasses = classMap(['root','message','action'], getSnackbarContentUtilityClass);

const Root = styled('div', {
  name: 'MuiSnackbar', slot: 'Root',
  overridesResolver: ({ownerState}, s) => [s.root, s[anchorKey(ownerState.anchorOrigin)]],
})(({theme, ownerState}) => {
  const {vertical, horizontal} = ownerState.anchorOrigin;
  const desktop = horizontal === 'center' ? {left:'50%', right:'auto', transform:'translateX(-50%)'} :
    horizontal === 'left' ? {left:24, right:'auto'} : {right:24, left:'auto'};
  return {
    position:'fixed', zIndex:(theme.vars || theme).zIndex?.snackbar ?? 1400, display:'flex', alignItems:'center',
    justifyContent:({left:'flex-start', right:'flex-end', center:'center'})[horizontal],
    left:8, right:8, [vertical]:8, [theme.breakpoints.up('sm')]:{...desktop, [vertical]:24},
  };
});
const Body = styled(Paper, {name:'MuiSnackbarContent',slot:'Root'})(({theme}) => {
  const dark = theme.palette.mode === 'dark';
  return {
    ...theme.typography.body2, display:'flex', alignItems:'center', flexWrap:'wrap',
    color:theme.vars?.palette?.SnackbarContent?.color ?? (dark ? 'rgba(0, 0, 0, 0.87)' : '#fff'),
    backgroundColor:theme.vars?.palette?.SnackbarContent?.bg ?? (dark ? 'rgb(250, 250, 250)' : 'rgb(50, 50, 50)'),
    padding:'6px 16px', flexGrow:1, [theme.breakpoints.up('sm')]:{flexGrow:'initial', minWidth:288},
  };
});
const Message = styled('div', {name:'MuiSnackbarContent',slot:'Message'})({padding:'8px 0'});
const Action = styled('div', {name:'MuiSnackbarContent',slot:'Action'})({
  display:'flex', alignItems:'center', marginLeft:'auto', paddingLeft:16, marginRight:-8,
});
const SnackbarContent = React.forwardRef(function SnackbarContent(input, ref) {
  const props = useThemeProps({props:input, name:'MuiSnackbarContent'});
  const {message, action, classes = {}, className, role = 'alert', ...paper} = props;
  const cls = slot => join(snackbarContentClasses[slot], classes[slot]);
  return h(Body, {elevation:6, ...paper, ref, role, className:join(cls('root'), className), ownerState:props},
    h(Message, {className:cls('message'), ownerState:props}, message),
    action ? h(Action, {className:cls('action'), ownerState:props}, action) : null);
});

// A parent often passes an inline close callback. Updating that callback must
// not extend an already-running announcement or leave a stale timer behind.
function useDismissal(root, open, duration, resumeDuration, disableWindowBlur, onClose) {
  const latest = React.useRef(onClose);
  React.useLayoutEffect(() => { latest.current = onClose; }, [onClose]);
  const clock = React.useRef();
  const insideEvent = React.useRef();
  const pause = React.useCallback(() => clearTimeout(clock.current), []);
  const start = React.useCallback(ms => {
    pause();
    if (ms != null && latest.current) clock.current = setTimeout(() => latest.current?.(null, 'timeout'), ms);
  }, [pause]);
  const resume = React.useCallback(() => {
    if (open && duration != null) start(resumeDuration ?? duration / 2);
  }, [open, duration, resumeDuration, start]);
  React.useEffect(() => {
    if (open) start(duration);
    return pause;
  }, [open, duration, start, pause]);
  React.useEffect(() => {
    if (!open || !root.current) return;
    const doc = root.current.ownerDocument;
    const win = doc.defaultView;
    let active = false, moved = false;
    const activate = setTimeout(() => { active = true; }, 0);
    function escape(event) {
      if (event.key === 'Escape' && !event.defaultPrevented) latest.current?.(event, 'escapeKeyDown');
    }
    function away(event) {
      if (event.type === 'touchend' && moved) { moved = false; return; }
      if (!active || insideEvent.current === event || !root.current) return;
      if (event.type === 'click' && (event.clientX > doc.documentElement.clientWidth || event.clientY > doc.documentElement.clientHeight)) return;
      const inside = event.composedPath ? event.composedPath().includes(root.current) : root.current.contains(event.target);
      if (!inside) latest.current?.(event, 'clickaway');
    }
    const move = () => { moved = true; };
    doc.addEventListener('keydown', escape);
    doc.addEventListener('click', away);
    doc.addEventListener('touchend', away);
    doc.addEventListener('touchmove', move);
    if (!disableWindowBlur) { win?.addEventListener('blur', pause); win?.addEventListener('focus', resume); }
    return () => {
      clearTimeout(activate);
      doc.removeEventListener('keydown', escape);
      doc.removeEventListener('click', away);
      doc.removeEventListener('touchend', away);
      doc.removeEventListener('touchmove', move);
      win?.removeEventListener('blur', pause);
      win?.removeEventListener('focus', resume);
    };
  }, [root, open, disableWindowBlur, pause, resume]);
  return {pause, resume, insideEvent};
}
const bottomLeft = {vertical:'bottom', horizontal:'left'};
const Snackbar = React.forwardRef(function Snackbar(input, ref) {
  const props = useThemeProps({props:input, name:'MuiSnackbar'});
  const {open = false, message, action, children, onClose, anchorOrigin = bottomLeft, classes = {}, className,
    autoHideDuration = null, resumeHideDuration, disableWindowBlurListener = false, transitionDuration,
    onMouseEnter, onMouseLeave, onFocus, onBlur, onClick, onTouchEnd, ...rest} = props;
  const theme = useTheme();
  const duration = transitionDuration ?? {enter:theme.transitions?.duration?.enteringScreen ?? 225, exit:theme.transitions?.duration?.leavingScreen ?? 195};
  const root = React.useRef(null), node = React.useRef(null);
  const rootRef = useForkRef(root, ref);
  const contentRef = useForkRef(node, children?.props.ref);
  const [exited, setExited] = React.useState(true);
  const {pause, resume, insideEvent} = useDismissal(root, open, autoHideDuration, resumeHideDuration, disableWindowBlurListener, onClose);
  if (!open && exited) return null;
  const slot = anchorKey(anchorOrigin);
  const content = children || h(SnackbarContent, {message, action});
  const ownerState = {...props, anchorOrigin};
  return h(Root, {...rest, ref:rootRef, role:'presentation', ownerState,
    className:join(snackbarClasses.root, classes.root, snackbarClasses[slot], classes[slot], className),
    onMouseEnter:e => { onMouseEnter?.(e); pause(); }, onMouseLeave:e => { onMouseLeave?.(e); resume(); },
    onFocus:e => { onFocus?.(e); pause(); }, onBlur:e => { onBlur?.(e); resume(); },
    onClick:e => { insideEvent.current = e.nativeEvent; onClick?.(e); },
    onTouchEnd:e => { insideEvent.current = e.nativeEvent; onTouchEnd?.(e); },
  }, h(Transition, {in:open, appear:true, timeout:duration, nodeRef:node,
    onEnter:() => { setExited(false); if (node.current) void node.current.offsetHeight; },
    onExited:() => setExited(true),
  }, state => {
    const visible = state === 'entering' || state === 'entered';
    const ms = typeof duration === 'number' ? duration : (duration[visible ? 'enter' : 'exit'] ?? 0);
    const style = {opacity:visible ? 1 : 0, transform:visible ? 'none' : 'scale(0.75, 0.5625)'};
    if (state !== 'exited') style.transition = 'opacity ' + ms + 'ms ease, transform ' + ms + 'ms ease';
    return React.cloneElement(content, {ref:contentRef, direction:anchorOrigin.vertical === 'top' ? 'down' : 'up', style:{...style, ...content.props.style}});
  }));
});
module.exports = {Snackbar, SnackbarContent, snackbarClasses, snackbarContentClasses, getSnackbarUtilityClass, getSnackbarContentUtilityClass};
