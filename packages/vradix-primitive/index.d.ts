export declare const canUseDOM: boolean;
export declare function composeEventHandlers<E extends {defaultPrevented: boolean}>(first?: (event: E) => void, second?: (event: E) => void, options?: {checkForDefaultPrevented?: boolean}): (event: E) => void;
export declare function getOwnerDocument(node: Node | null | undefined): Document;
export declare function getOwnerWindow(node: Node | null | undefined): Window & typeof globalThis;
export declare function getActiveElement(node: Node | null | undefined, activeDescendant?: boolean): HTMLElement | null;
export declare function isFrame(node: Element): node is HTMLIFrameElement;
export type Timeout = ReturnType<typeof setTimeout>;
export type Interval = ReturnType<typeof setInterval>;
// Browsers do not declare setImmediate; Node consumers retain its own handle.
export type Immediate = typeof globalThis extends {setImmediate: (...args: any[]) => infer R} ? R : number;
