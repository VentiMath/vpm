# vemotion-styled

A source-informed implementation of Emotion's styled-component API, targeting **@emotion/styled 11.14.1**, the latest
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

## Implementation and scope

Component definitions collect templates and inherited styles, compose explicit
prop predicates and retarget elements. A shared renderer resolves the theme,
registered classes and style insertion. The Emotion metadata fields remain a
compatibility facade: MUI replaces `__emotion_styles` before extending a
component. That replacement affects derived components, while the original
continues rendering its captured styles.

This replaces the earlier close translation of upstream `createStyled`.
Upstream source and tests were inspected; this is not a clean-room claim.
Declarations, shorthand element names and diagnostic wording retain upstream
attribution. The macro entry is outside the supported surface.

## Differences from @emotion/styled 11.14.1

| @emotion/styled | vemotion-styled |
| --- | --- |
| Reads the theme context only when the `theme` prop is null, so a component whose `theme` prop comes and goes changes the order of its hooks (React warns in development) | Reads it on every render |
| Drops current HTML attributes such as `command`, `commandFor`, `part` and `shadowRootMode` (@emotion/is-prop-valid) | Forwards them |
| Depends on @emotion/babel-plugin and @babel/runtime (for the `macro` entry) | No macro entry: 4 direct dependencies, all VPM |

The complete fixture has 413 passing assertions under React 16 and 416 under
React 18, with two existing Babel-plugin differences and respectively eight
and five skips. The production configuration executes five assertions; it
does not provide the same coverage as development. The original hook-order
regression stays fixed on Node 24 and Bun.

Ten caller renders using MUI system 7.2.0, styled-engine 7.3.9 and React 19.1.0
produce identical HTML and CSS to the original on both runtimes. They cover
theme overrides, variants, `sx`, owner-state filtering, `as`, style inheritance
and MUI's style-mutation API. See the
[conformance record](../../scripts/emotion-conformance/README.md).

[Isolated-process measurements](bench/results/README.md) cover construction and
server rendering using each complete Emotion stack. They do not isolate this
package from the serializer/cache below it or predict browser frame times.

In this recording, Node inherited-component construction took 6.7% more time
(about 11 ns), while cached server rendering took 3.7% less. The other Node
comparisons were inconclusive; the DOM-construction control varied by 24%.
Bun construction took 12% less time for DOM components and 13.4% less for
inherited components, in every pair beyond the control spread. Both Bun
server-render comparisons were inconclusive. These measurements support no
general rendering speedup claim.
