import debug = require('..');
import debugDefault from '..';
const log = debug('app');
log('value %s', 'test');
log.enabled = true; log.enabled = null;
const enabled: boolean = log.enabled;
const child: debug.Debugger = log.extend('http');
debug.enable('app:*');
debug.log = (...args: unknown[]) => args.length;
debug.formatters.h = function (value: unknown) { return this.namespace + String(value); };
const duration: string = debug.humanize(1000);
const parsed: number | undefined = debug.humanize('1s');
debugDefault('other')('message');
const factory: debug.Debug = debug.default;
debug.debug('alias')('message');
factory('default-alias')('message');
void [enabled, child, duration, parsed];
// @ts-expect-error Patterns are immutable.
debug.names.push('other');
// @ts-expect-error Namespace must be a string.
debug(1);
// @ts-expect-error Enabled override is boolean or null.
log.enabled = 'yes';
