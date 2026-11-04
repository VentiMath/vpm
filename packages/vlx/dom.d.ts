/** Observe rendered VLX HTML; make only overflowed formulas keyboard-scrollable.
 * Call the returned function when the container unmounts. No global DOM access
 * occurs on import. Requires the DOM library in browser TypeScript consumers. */
export declare function observeMath(root:Element|DocumentFragment,options?:{scrollLabel?:string}):()=>void;
