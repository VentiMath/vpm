# Rectangle observation controls

Pinned `@radix-ui/rect` 1.1.3 and its actual `@radix-ui/react-use-rect` 1.1.4 caller,
with React 19.2.4 and jsdom. Test fixtures only, excluded from package archives.
The runner evaluates the unchanged caller with only its rectangle import replaced;
this works on Node and Bun without relying on Module._load interception.

Run `node run.cjs upstream`, `node run.cjs vpm`, and the same commands with Bun.
Original controls demonstrate the callback-cleanup leak, duplicate unsubscribe,
mutable rectangle and exception behavior. VPM-only checks exercise deterministic
reentrant subscription delivery and rollback. `node archives.cjs` checks clean
npm/Bun packages, both runtimes, TS7 and a browser bundle.
