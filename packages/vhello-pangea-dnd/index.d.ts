import type * as React from 'react';
export type Id = string;
export type DraggableId = string;
export type DroppableId = string;
export type TypeId = string;
export type Direction = 'horizontal' | 'vertical';
export type MovementMode = 'FLUID' | 'SNAP';
export interface DraggableLocation { droppableId: string; index: number }
export interface DraggableRubric { draggableId: string; type: string; source: DraggableLocation }
export interface BeforeCapture { draggableId: string; mode: MovementMode }
export interface DragStart extends DraggableRubric { mode: MovementMode }
export interface DragUpdate extends DragStart { destination: DraggableLocation | null; combine: null }
export interface DropResult extends DragUpdate { reason: 'DROP' | 'CANCEL' }
export type Announce = (message: string) => void;
export interface ResponderProvided { announce: Announce }
export type OnBeforeCaptureResponder = (value: BeforeCapture) => void;
export type OnBeforeDragStartResponder = (value: DragStart) => void;
export type OnDragStartResponder = (value: DragStart, provided: ResponderProvided) => void;
export type OnDragUpdateResponder = (value: DragUpdate, provided: ResponderProvided) => void;
export type OnDragEndResponder = (value: DropResult, provided: ResponderProvided) => void;
export interface DragDropContextProps {
  children: React.ReactNode;
  onDragEnd: OnDragEndResponder;
  onBeforeCapture?: OnBeforeCaptureResponder | undefined;
  onBeforeDragStart?: OnBeforeDragStartResponder | undefined;
  onDragStart?: OnDragStartResponder | undefined;
  onDragUpdate?: OnDragUpdateResponder | undefined;
  dragHandleUsageInstructions?: string | undefined;
  enableDefaultSensors?: boolean | null | undefined;
  autoScrollerOptions?: { disabled?: boolean | undefined } | undefined;
  nonce?: string | undefined;
}
export interface DraggableProvidedDraggableProps {
  'data-rfd-draggable-context-id': string;
  'data-rfd-draggable-id': string;
  style?: React.CSSProperties | undefined;
}
export interface DraggableProvidedDragHandleProps extends Pick<React.HTMLAttributes<HTMLElement>, 'onMouseDown' | 'onTouchStart' | 'onKeyDown' | 'onDragStart'> {
  'data-rfd-drag-handle-context-id': string;
  'data-rfd-drag-handle-draggable-id': string;
  role: string;
  tabIndex: number;
  'aria-describedby': string;
  draggable: boolean;
}
export interface DraggableProvided {
  innerRef: (element?: HTMLElement | null) => void;
  draggableProps: DraggableProvidedDraggableProps;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
}
export interface DraggableStateSnapshot {
  isDragging: boolean; isDropAnimating: false; isClone: false;
  dropAnimation: null; draggingOver: string | null;
  combineWith: null; combineTargetFor: null; mode: MovementMode | null;
}
export type DraggableChildrenFn = (provided: DraggableProvided, snapshot: DraggableStateSnapshot, rubric: DraggableRubric) => React.ReactNode;
export interface DraggableProps {
  draggableId: string; index: number; children: DraggableChildrenFn;
  isDragDisabled?: boolean | undefined;
  disableInteractiveElementBlocking?: boolean | undefined;
}
export interface DroppableProvidedProps { 'data-rfd-droppable-id': string; 'data-rfd-droppable-context-id': string }
export interface DroppableProvided { innerRef: (element?: HTMLElement | null) => void; placeholder: React.ReactNode; droppableProps: DroppableProvidedProps }
export interface DroppableStateSnapshot { isDraggingOver: boolean; draggingOverWith: string | null; draggingFromThisWith: string | null; isUsingPlaceholder: boolean }
export interface DroppableProps {
  droppableId: string; children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactNode;
  type?: string | undefined; direction?: Direction | undefined; isDropDisabled?: boolean | undefined; mode?: 'standard' | undefined;
}
export declare function DragDropContext(props: DragDropContextProps): React.JSX.Element;
export declare function Droppable(props: DroppableProps): React.JSX.Element;
export declare function Draggable(props: DraggableProps): React.ReactNode;
