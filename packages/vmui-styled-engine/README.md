# vmui-styled-engine

MUI's styling adapter over VPM Emotion, targeting **@mui/styled-engine 9.5.0** and verified with unchanged MUI System 9.5.0 and VentiMath's 7.2.0 caller on React 19.3.

```jsx
import styled, { GlobalStyles } from 'vmui-styled-engine';
const ContestButton = styled('button')({ padding: 8, color: 'blue' });
<ContestButton>Open contest</ContestButton>;
```

The adapter supplies `styled`, `ThemeContext`, `css`, `keyframes`, `GlobalStyles`, and the style mutation/serialization hooks MUI System uses. It reuses `vemotion-react`, `vemotion-styled` and `vemotion-serialize`; no Babel runtime or prop-types dependency is added. Type declarations preserve MUI's supplied theme and component props.

VentiMath owns its Emotion cache, LTR/RTL plugins and CSS layers. `StyledEngineProvider` is transparent with its default options. `injectFirst` and `enableCssLayer` cache-management modes are outside this contract and reject `true` explicitly. Keep the application's existing CacheProvider configuration. MUI System/material components remain separate packages; the adapter alone does not replace them.

Global styles use `defaultTheme` only when the context has no populated theme. Style serialization is reentrant without a shared scratch array. Invalid style-processor results fail explicitly. Matching development-warning wording and upstream-only declaration utilities are outside the verified surface.

[Conformance](../../scripts/mui-engine-conformance/README.md) includes actual MUI callers, CSS layering, LTR/RTL cache changes, focus preservation, global cleanup and clean packed consumers on Node 24/Bun 1.4.4. [Benchmarks](bench/results/README.md) compare adapter and Emotion work together. This new adapter is independent; the existing Emotion dependencies retain their own source-informed provenance and licenses. See [provenance](PROVENANCE.json).

In the recorded balanced runs, Node component creation is 49% faster, while style serialization is 14% slower (957 ns versus 829 ns). The SSR cases and all four Bun comparisons are unestablished against their control spread. These timings include the chosen Emotion implementation; they are not a browser-performance claim.

Source implementation is complete for that scope. Publication and application adoption remain separate.
