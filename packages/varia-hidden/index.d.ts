export type Undo = () => void;
export declare function hideOthers(
  targets: Element | readonly Element[],
  parent?: HTMLElement,
  marker?: string,
): Undo;
export declare function inertOthers(
  targets: Element | readonly Element[],
  parent?: HTMLElement,
  marker?: string,
): Undo;
export declare function suppressOthers(
  targets: Element | readonly Element[],
  parent?: HTMLElement,
  marker?: string,
): Undo;
export declare function supportsInert(): boolean;
