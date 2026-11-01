# vemotion-styled

Emotion's styled components, targeting **@emotion/styled 11.14.1**, the latest
release checked November 1, 2026. On VPM's Emotion packages; React 16.8 or
later and [vemotion-react](../vemotion-react) are peers. ES modules for
browsers and server rendering.

```jsx
import styled from 'vemotion-styled';

const Button = styled.button(({theme, variant}) => ({
  padding: '6px 16px',
  color: variant === 'primary' ? theme.palette.primary : 'inherit',
}));
const Card = styled('section', {shouldForwardProp: prop => prop !== 'elevated'})`
  box-shadow: ${props => (props.elevated ? '0 1px 4px rgba(0, 0, 0, 0.3)' : 'none')};
`;
```

`styled(tag or component, {label, target, shouldForwardProp})` takes styles (a
template literal or interpolations of props and theme) and returns a component;
`styled.div`, `styled.svg` and the other elements are shorthands. DOM elements
receive only DOM attributes and event handlers ([vemotion-is-prop-valid](../vemotion-is-prop-valid)),
components every prop but `theme`; `as` changes the element rendered;
`withComponent` reuses the styles with another tag; styling a styled component
extends its styles. Use it as MUI's styled engine by aliasing
`@emotion/styled` to it (see [vemotion-react](../vemotion-react)).

## Differences from @emotion/styled 11.14.1

| @emotion/styled | vemotion-styled |
| --- | --- |
| Reads the theme context only when the `theme` prop is null, so a component whose `theme` prop comes and goes changes the order of its hooks (React warns in development) | Reads it on every render |
| Drops current HTML attributes such as `command`, `commandFor`, `part` and `shadowRootMode` (@emotion/is-prop-valid) | Forwards them |
| Depends on @emotion/babel-plugin and @babel/runtime (for the `macro` entry) | No macro entry: 4 direct dependencies, all VPM |

Emotion's suite passes with this package and the other VPM Emotion packages in
place of every original, under React 16 and 18; see the
[conformance record](../../scripts/emotion-conformance/README.md).
