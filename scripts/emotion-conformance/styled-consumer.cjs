'use strict';
const assert = require('node:assert/strict'), {spawnSync} = require('node:child_process');

if (process.argv[2] === '--child') {
  const tree = require('./consumer-tree.cjs')(process.argv[3]);
  try {
    const load = tree.require, React = load('react'), {renderToStaticMarkup} = load('react-dom/server');
    const styled = load('@emotion/styled').default;
    const {ThemeProvider, CacheProvider} = load('@emotion/react');
    const createCache = load('@emotion/cache').default;
    const muiStyled = load('@mui/system/createStyled').default();
    const {internal_mutateStyles} = load('@mui/styled-engine');
    const {createTheme, ThemeProvider: MuiThemeProvider} = load('@mui/system');
    assert.equal(load('react/package.json').version, '19.1.0');
    assert.equal(load('@mui/system/package.json').version, '7.2.0');
    const h = React.createElement, rows = [];
    function record(element, theme = {ink: '#123456'}) {
      const cache = createCache({key: 'fixture', nonce: 'fixture-nonce'});
      rows.push(renderToStaticMarkup(h(CacheProvider, {value: cache}, h(ThemeProvider, {theme}, element))));
    }

    const Box = styled('div', {label: 'Box', target: 'fixture-box'})(props => ({color: props.theme.ink, padding: props.amount}));
    record(h(Box, {amount: 3, id: 'first', className: 'external', children: 'content'}));
    record(h(Box, {as: 'a', href: '/next', amount: 5, theme: {ink: '#abcdef'}}));
    const Custom = props => h('output', {'data-extra': props.extra, className: props.className}, props.children);
    record(h(Box, {as: Custom, extra: 'kept', amount: 2, children: 'custom'}));
    record(h(styled('div', false)({color: 'red'}), {as: Custom, extra: 'false-options', children: 'custom'}));
    const Filtered = styled(Box, {shouldForwardProp: name => name !== 'amount'})({margin: 1});
    record(h(Filtered.withComponent('section'), {amount: 7, 'data-id': 'retargeted'}));
    const Template = styled.section`padding: ${props => props.amount}px; color: ${props => props.theme.ink};`;
    record(h(Template, {amount: 4}));

    // The actual MUI engine mutates the public facade before inheriting it.
    const Base = styled.div({color: 'red'}, {padding: 1});
    internal_mutateStyles(Base, styles => styles.filter(style => !style.color));
    const Derived = styled(Base)({margin: 2});
    record(h(Base)); // Captured render styles are unaffected by facade replacement.
    record(h(Derived));

    // VentiMath's styled(Box/DOM) patterns: ownerState, sx, theme overrides,
    // variants and extending another MUI styled component.
    const theme = createTheme({palette: {primary: {main: '#123456'}}, components: {VentiButton: {
      styleOverrides: {root: {borderRadius: 4}},
      variants: [{props: {variant: 'solid'}, style: {fontWeight: 700}}],
    }}});
    const Button = muiStyled('button', {name: 'VentiButton', slot: 'Root'})(({theme, ownerState}) => ({color: theme.palette.primary.main, padding: ownerState.compact ? 4 : 8}));
    const LargeButton = muiStyled(Button)({lineHeight: 2});
    for (const Component of [Button, LargeButton]) record(h(MuiThemeProvider, {theme}, h(Component, {
      ownerState: {compact: true}, variant: 'solid', sx: {marginTop: 2}, as: 'a', href: '/calendar', children: 'Open calendar',
    })));
    assert.equal(rows.length, 10);
    assert.match(rows[3], /data-extra="false-options"/);
    assert.match(rows[8], /font-weight:700/);
    assert.match(rows[8], /margin-top:16px/);
    assert.match(rows[8], /border-radius:4px/);
    assert.doesNotMatch(rows[8], /ownerState=|sx=| as=/);
    process.stdout.write(JSON.stringify(rows));
  } finally {tree.cleanup();}
} else {
  const outputs = {};
  for (const library of ['upstream', 'vpm']) {
    const result = spawnSync(process.execPath, ['--preserve-symlinks', __filename, '--child', library], {encoding: 'utf8', timeout: 120000, env: {...process.env, NODE_ENV: 'production'}});
    assert.equal(result.status, 0, library + '\n' + result.stderr);
    outputs[library] = JSON.parse(result.stdout);
  }
  assert.deepEqual(outputs.vpm, outputs.upstream);
  console.log('10 styled-component/MUI caller renders: identical markup and CSS on React 19.1, MUI system 7.2.0 and styled-engine 7.3.9.');
}
