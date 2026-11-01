/** Whether a prop is a DOM attribute (or data-, aria- or x- attribute) or an event handler, which styled() forwards to DOM elements. */
declare const isPropValid: (prop: string) => boolean;
export default isPropValid;
