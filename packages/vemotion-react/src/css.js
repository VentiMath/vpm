import {serializeStyles} from 'vemotion-serialize';

/** Serializes styles (a template literal or interpolations) for the css prop, styled and Global. */
export function css(...args) {
  return serializeStyles(args);
}

/** Keyframes: interpolated into styles, they insert the animation and stand for its name. */
export function keyframes(...args) {
  const insertable = serializeStyles(args);
  const name = `animation-${insertable.name}`;
  return {
    name,
    styles: `@keyframes ${name}{${insertable.styles}}`,
    anim: 1,
    toString() {
      return `_EMO_${this.name}_${this.styles}_EMO_`;
    },
  };
}
