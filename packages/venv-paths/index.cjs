'use strict';
const path = require('node:path');
const os = require('node:os');
const home = os.homedir(), temporary = os.tmpdir(), environment = process.env;
// Stable OS defaults are assembled once. Environment overrides remain live.
const defaults = {
  darwin: ['Library/Application Support', 'Library/Preferences', 'Library/Caches', 'Library/Logs'].map(part => path.join(home, part)),
  win32: ['AppData/Local', 'AppData/Roaming'].map(part => path.join(home, part)),
  xdg: ['.local/share', '.config', '.cache', '.local/state'].map(part => path.join(home, part)),
};
const xdgKeys = ['XDG_DATA_HOME', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME'];
const windowsParts = ['Data', 'Config', 'Cache', 'Log'];
function validate(name) {
  if (typeof name !== 'string') throw new TypeError('Expected a string');
  const trimmed = name.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..' || /[\\/\0]/.test(name)) {
    throw new Error('Unsafe filename: ' + JSON.stringify(name));
  }
}
function envPaths(name, {suffix = 'nodejs'} = {}) {
  validate(name);
  if (suffix) { name = `${name}-${suffix}`; validate(name); }
  let directories, temp;
  if (process.platform === 'darwin') {
    directories = defaults.darwin.map(base => path.join(base, name));
    temp = path.join(temporary, name);
  } else if (process.platform === 'win32') {
    const local = environment.LOCALAPPDATA || defaults.win32[0];
    const roaming = environment.APPDATA || defaults.win32[1];
    directories = windowsParts.map((part, i) => path.join(i === 1 ? roaming : local, name, part));
    temp = path.join(temporary, name);
  } else {
    directories = xdgKeys.map((key, i) => path.join(environment[key] || defaults.xdg[i], name));
    temp = path.join(temporary, path.basename(home), name);
  }
  return {data: directories[0], config: directories[1], cache: directories[2], log: directories[3], temp};
}
module.exports = envPaths;
module.exports.default = envPaths;
