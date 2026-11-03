'use client';
'use strict';
const React = require('react');
const {IS_DEVELOPMENT} = require('vradix-primitive/is-development');
const {useEffectEvent} = require('vradix-react-use-effect-event');
const noop = () => {};
function useModeWarning(controlled, caller) {
  if (IS_DEVELOPMENT) {
    const previous = React.useRef(controlled);
    React.useEffect(() => {
      if (previous.current !== controlled) console.warn(`${caller || 'Component'} changed from ${previous.current ? 'controlled' : 'uncontrolled'} to ${controlled ? 'controlled' : 'uncontrolled'} state. Keep one mode for its lifetime.`);
      previous.current = controlled;
    }, [controlled, caller]);
  }
}
function useControllableState({prop, defaultProp, onChange = noop, caller}) {
  const [stored, setStored] = React.useState(defaultProp);
  const controlled = prop !== undefined;
  const committed = React.useRef({controlled, prop, onChange, previous: stored});
  useModeWarning(controlled, caller);
  React.useInsertionEffect(() => {
    Object.assign(committed.current, {controlled, prop, onChange});
  });
  React.useEffect(() => {
    const record = committed.current;
    if (!Object.is(record.previous, stored)) {
      record.previous = stored;
      record.onChange?.(stored);
    }
  }, [stored]);
  const update = React.useCallback(next => {
    const record = committed.current;
    if (!record.controlled) { setStored(next); return; }
    const value = typeof next === 'function' ? next(record.prop) : next;
    if (!Object.is(value, record.prop)) record.onChange?.(value);
  }, []);
  return [controlled ? prop : stored, update];
}
const USER = 0, COMMITTED = 1;
function useControllableStateReducer(reducer, {prop, defaultProp, onChange, caller}, initialArg, init) {
  const controlled = prop !== undefined;
  const notify = useEffectEvent(onChange ?? noop);
  useModeWarning(controlled, caller);
  const [box, send] = React.useReducer((current, work) => {
    if (work.kind === COMMITTED) {
      const notices = current.notices.filter(entry => !work.handled.has(entry.token));
      const value = work.synchronize && !Object.is(current.value.state, work.prop)
        ? {...current.value, state: work.prop} : current.value;
      return notices.length === current.notices.length && value === current.value
        ? current : {value, notices};
    }
    const value = reducer(current.value, work.action);
    if (value === current.value) return current;
    const changed = controlled && !Object.is(value.state, current.value.state);
    return {value, notices: changed ? [...current.notices, {token: work.token, value: value.state}] : current.notices};
  }, null, () => {
    const initial = {...initialArg, state: defaultProp};
    return {value: init ? init(initial) : initial, notices: []};
  });
  const previous = React.useRef(box.value.state);
  const delivered = React.useRef(new WeakSet());
  const dispatch = React.useCallback(action => send({kind: USER, action, token: {}}), []);
  React.useEffect(() => {
    const value = box.value.state;
    const changed = !Object.is(previous.current, value);
    previous.current = value;
    for (const entry of box.notices) {
      if (!delivered.current.has(entry.token)) {
        delivered.current.add(entry.token);
        if (controlled) notify(entry.value);
      }
    }
    if (!controlled && changed) notify(value);
    // Reducers remain pure. Only a committed render delivers its proposals;
    // identity tokens prevent StrictMode/rebase replay from notifying twice.
    if (box.notices.length || controlled && !Object.is(prop, value)) {
      send({kind: COMMITTED, handled: new Set(box.notices.map(entry => entry.token)), synchronize: controlled, prop});
    }
  }, [box, controlled, prop]);
  const value = React.useMemo(() => controlled ? {...box.value, state: prop} : box.value, [box.value, controlled, prop]);
  return [value, dispatch];
}
exports.useControllableState = useControllableState;
exports.useControllableStateReducer = useControllableStateReducer;
