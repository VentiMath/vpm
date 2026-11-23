import envPaths from '../index.cjs';
const options: envPaths.Options = {suffix: ''};
const paths: envPaths.Paths = envPaths('capacitor', options);
const config: string = paths.config;
const callable: typeof envPaths = envPaths.default;
callable(config, {suffix: 'nodejs'});
// @ts-expect-error Names must be strings.
envPaths(42);
// @ts-expect-error Suffixes must be strings.
envPaths('app', {suffix: 3});
// @ts-expect-error Returned locations are readonly in the declaration.
paths.log = 'elsewhere';
