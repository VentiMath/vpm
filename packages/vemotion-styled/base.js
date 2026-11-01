import {withEmotionCache} from 'vemotion-react';
import isDevelopment from '#is-development';
import {StyleDefinition} from './src/definition.js';
import {renderStyled} from './src/render.js';

// Construction only: rendering, serialization and insertion share one pipeline.
export default function createStyled(tag, options) {
  if (isDevelopment && tag === undefined) throw new Error('You are trying to create a styled element with an undefined component.\nYou may have forgotten to import it.');
  const definition = new StyleDefinition(tag, options);
  return (...arguments_) => defineComponent(definition, arguments_);
}

function defineComponent(definition, arguments_) {
  const styles = definition.collect(arguments_);
  const Component = withEmotionCache((props, cache, ref) => renderStyled(definition, styles, props, cache, ref));
  const label = definition.options?.label;
  const target = definition.options?.target;
  Component.displayName = label === undefined ? `Styled(${typeof definition.element === 'string' ? definition.element : definition.element.displayName || definition.element.name || 'Component'})` : label;
  Component.defaultProps = definition.source.defaultProps;

  // This facade is part of the MUI/Emotion contract. In particular, MUI can
  // replace __emotion_styles before constructing a derived component. The
  // original component still renders its captured styles, as Emotion does.
  Component.__emotion_real = Component;
  Component.__emotion_base = definition.element;
  Component.__emotion_styles = styles;
  Component.__emotion_forwardProp = definition.filter;
  Object.defineProperty(Component, 'toString', {value: () => target === undefined && isDevelopment ? 'NO_COMPONENT_SELECTOR' : `.${target}`});
  Component.withComponent = (element, options) => defineComponent(definition.retarget(element, options), styles);
  return Component;
}
