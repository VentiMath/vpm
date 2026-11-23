# venv-paths

Independent application-directory selection for VentiMath's build tools, targeting
[env-paths 4.0.0](https://github.com/sindresorhus/env-paths) and the app's 2.2.1
Capacitor caller. Zero package dependencies.

```js
import envPaths from 'venv-paths';
const locations = envPaths('capacitor', {suffix: ''});
// locations.data, config, cache, log, temp
```

CommonJS `require('venv-paths')` returns the same callable as its `.default`.
The default suffix is `nodejs`; an empty suffix keeps Capacitor's existing paths.
Only strings are returned: the package does not create directories or write files.

| Platform | Data / configuration / cache / logs |
| --- | --- |
| macOS | Home Library: Application Support / Preferences / Caches / Logs |
| Windows | LOCALAPPDATA for Data, Cache and Log; APPDATA for Config, with home-directory defaults |
| Linux and other Unix | XDG_DATA_HOME / XDG_CONFIG_HOME / XDG_CACHE_HOME / XDG_STATE_HOME, with home-directory defaults |

Home and the temporary base are captured at module initialization, matching the
current API. Environment entries remain live on each call. Each result is a fresh
object. Unix temporary paths include the home-directory basename.

Names and suffixed names reject empty/whitespace-only input, dot-only segments,
path separators and NUL. This matches 4.0.0's validation without another package.
Version 2.2.1 accepted unsafe names and treated an explicit `suffix: undefined`
differently; Capacitor's constant name and empty suffix are unchanged. Validation
does not promise that every accepted string is a legal Windows filename.
Environment path overrides retain upstream behavior, including relative paths;
they are configuration, not a security boundary.

Seven focused tests, 11 unchanged upstream assertions (five macOS, six Linux),
13,152 current-version comparisons and 1,920 app-version comparisons pass on
Node and Bun. OS branches are simulated, not native Windows certification.
Unchanged Capacitor config reads/writes and IPC log opening use real temporary
files; process forking and network are stubbed. Clean npm/Bun original-name
installs and TypeScript consumers are checked separately.

[Verification](../../scripts/env-paths-conformance/README.md) ·
[Measurements](bench/README.md) · [Provenance](PROVENANCE.json)

The source package is built. A public release, application repin and deployment
are separate steps.
