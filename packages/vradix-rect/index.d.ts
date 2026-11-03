export type Measurable = { getBoundingClientRect(): DOMRect };
export declare function observeElementRect(element: Measurable, callback: (rect: DOMRect) => void): () => void;
