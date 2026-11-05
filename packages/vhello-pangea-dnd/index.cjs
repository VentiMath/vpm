'use client';
'use strict';
const React = require('react'), { createStore } = require('./engine.cjs');
const h = React.createElement, Context = React.createContext(null), DropContext = React.createContext(null);
const hidden = { position: 'absolute', width: 1, height: 1, padding: 0, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };
function useStore() { const s = React.useContext(Context); if (!s) throw Error('DragDropContext is required'); return s; }
function DragDropContext(props) {
  if (props.sensors?.length) throw Error('Custom sensors are not supported by vhello-pangea-dnd');
  if (Object.keys(props.autoScrollerOptions || {}).some(key => key !== 'disabled')) throw Error('Only autoScrollerOptions.disabled is supported');
  if (typeof props.onDragEnd !== 'function') throw TypeError('onDragEnd is required');
  const id = React.useId(), ref = React.useRef(null);
  if (!ref.current) ref.current = createStore(id);
  const store = ref.current; store.props = props;
  React.useEffect(() => () => store.destroy(), [store]);
  return h(Context.Provider, { value: store }, props.children, h(Accessibility));
}
function Accessibility() {
  const store = useStore(), state = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return h(React.Fragment, null,
    h('div', { id: store.id + '-instructions', style: hidden }, store.props.dragHandleUsageInstructions || 'Press Space to lift. Use arrow keys to move. Press Space to drop or Escape to cancel.'),
    h('div', { style: hidden, role: 'status', 'aria-live': 'assertive', 'aria-atomic': true, 'data-vdnd-announcer': store.id }, state.announcement));
}
function Droppable(props) {
  if (props.mode && props.mode !== 'standard' || props.isCombineEnabled || props.renderClone || props.ignoreContainerClipping) throw Error('Virtual lists, combining, clones and unclipped targets are not supported by vhello-pangea-dnd');
  const store = useStore(), { droppableId: id, children } = props;
  if (typeof id !== 'string' || !id) throw TypeError('droppableId must be a nonempty string');
  const record = React.useMemo(() => ({ id, props, node: null }), [id]); record.props = props;
  const ref = React.useCallback(node => store.register(store.drops, record, node), [store, record]);
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot), drag = state.drag;
  const over = drag?.destination?.droppableId === id, home = drag?.source.droppableId === id;
  const placeholder = drag && (home || over) ? h('div', { 'data-rfd-placeholder-context-id': store.id, 'aria-hidden': true,
    style: { boxSizing: 'border-box', width: drag.box.width, height: drag.box.height, marginTop: drag.margins.top, marginRight: drag.margins.right, marginBottom: drag.margins.bottom, marginLeft: drag.margins.left, flexShrink: 0, pointerEvents: 'none' } }) : null;
  const provided = { innerRef: ref, placeholder, droppableProps: { 'data-rfd-droppable-id': id, 'data-rfd-droppable-context-id': store.id } };
  const snapshot = { isDraggingOver: !!over, draggingOverWith: over ? drag.draggableId : null, draggingFromThisWith: home ? drag.draggableId : null, isUsingPlaceholder: !!placeholder };
  const context = React.useMemo(() => ({ id, type: props.type || 'DEFAULT' }), [id, props.type]);
  return h(DropContext.Provider, { value: context }, children(provided, snapshot));
}
function Draggable(props) {
  const store = useStore(), drop = React.useContext(DropContext), { draggableId: id, children, index } = props;
  if (!drop) throw Error('Draggable requires a Droppable');
  const dropId = drop.id;
  if (typeof id !== 'string' || !id || !Number.isInteger(index) || index < 0) throw TypeError('Draggable requires a nonempty ID and nonnegative integer index');
  const record = React.useMemo(() => ({ id, dropId, props, node: null }), [id, dropId]); record.props = props;
  const ref = React.useCallback(node => store.register(store.items, record, node), [store, record]);
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot), drag = state.drag;
  const active = drag?.draggableId === id, offset = state.offsets.get(id);
  const style = active ? { position: 'fixed', left: drag.box.left, top: drag.box.top, width: drag.box.width, height: drag.box.height,
    margin: 0, boxSizing: 'border-box', pointerEvents: 'none', zIndex: 5000, transition: 'none', transform: 'translate(' + (drag.point.x - drag.start.x) + 'px,' + (drag.point.y - drag.start.y) + 'px)' }
    : { transform: offset ? 'translate(' + offset.x + 'px,' + offset.y + 'px)' : undefined, transition: 'none' };
  const handle = props.isDragDisabled ? null : {
    'data-rfd-drag-handle-context-id': store.id, 'data-rfd-drag-handle-draggable-id': id,
    role: 'button', tabIndex: 0, 'aria-describedby': store.id + '-instructions', draggable: false,
    onDragStart: event => event.preventDefault(), onMouseDown: event => store.mouse(event, record), onTouchStart: event => store.touch(event, record), onKeyDown: event => store.key(event, record),
  };
  const provided = { innerRef: ref, draggableProps: { 'data-rfd-draggable-context-id': store.id, 'data-rfd-draggable-id': id, style }, dragHandleProps: handle };
  const snapshot = { isDragging: !!active, isDropAnimating: false, dropAnimation: null, draggingOver: active ? drag.destination?.droppableId || null : null,
    combineWith: null, combineTargetFor: null, mode: active ? drag.mode : null, isClone: false };
  const rubric = { draggableId: id, type: drop.type, source: { droppableId: dropId, index } };
  return children(provided, snapshot, rubric);
}
module.exports = { DragDropContext, Droppable, Draggable };
