import {log, getNodeBackend, getStructuredBackend, getDebugBackend, setBackend, AdhocDebugLogger, DebugLogBackendBase, LogSeverity, type LogFields, type DebugLogBackend} from 'vgoogle-logging-utils';
const backend: DebugLogBackend = {log(namespace, fields, ...args) { void [namespace, fields, args]; }, setFilters(filters) { void filters; }};
setBackend(getStructuredBackend(backend)); setBackend(undefined);
const logger = log('types'); logger.on('log', (fields, args) => { void [fields.severity, args]; }).info('chained');
logger.sublog('child').warn('message');
const instance = new AdhocDebugLogger('types', () => {}); instance.once('log', () => {}); instance.removeAllListeners();
class Custom extends DebugLogBackendBase { makeLogger(namespace: string) { return (fields: LogFields) => { void [namespace, fields]; }; } setFilters() {} }
new Custom().log('types', {severity: LogSeverity.INFO}, 'hello');
getNodeBackend().setFilters(['types'] as const);
getDebugBackend(Object.assign((_namespace: string) => (..._args: unknown[]) => {}, {enable(_filters: string) {}}));
// @ts-expect-error namespace must be a string
log(42);
