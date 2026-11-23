import { rimraf, rimrafSync, isRimrafOptions, assertRimrafOptions } from '../index.cjs';
const one: Promise<boolean> = rimraf('build', {
  filter: async (name, entry) => entry.isDirectory() || name.endsWith('.tmp'),
});
const two: boolean = rimraf.sync(['build', 'cache'], { glob: true });
const three: boolean = rimrafSync('build', { signal: { aborted: false }, maxRetries: 2 });
const options: unknown = { glob: { dot: true } };
if (isRimrafOptions(options)) rimraf('build', options);
assertRimrafOptions(options);
// @ts-expect-error Async filters cannot be passed to the sync API.
rimrafSync('build', { filter: async () => true });
// @ts-expect-error URL targets are outside the string-path contract.
rimraf({ href: 'file:///tmp/build' });
void [one, two, three];
