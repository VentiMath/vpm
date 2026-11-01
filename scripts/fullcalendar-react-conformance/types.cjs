'use strict';
// Declarations, as an application sees them: a React component using the
// calendar, its plugins, option and callback types and the JSON feed error,
// compiled against the original and vfullcalendar-react with DOM and React 19
// types under the configured TypeScript 7 compiler (strict, bundler resolution,
// library checks on).
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {compile, compiler} = require('../platform-types.cjs');
const modules = path.join(__dirname, 'node_modules'), packages = path.resolve(__dirname, '../../packages');
const compilers = {[compiler().version]: compiler().path};

const app = name => `import { useRef } from 'react';
import FullCalendar, { JsonRequestError, formatDate, type CalendarRef } from '${name}';
import type { CalendarOptions, EventApi, EventClickInfo, DateSelectInfo, EventInput, EventSourceInput, EventDropInfo } from '${name}';
import dayGridPlugin from '${name}/daygrid';
import timeGridPlugin from '${name}/timegrid';
import interactionPlugin from '${name}/interaction';
import classicThemePlugin from '${name}/themes/classic';
import frLocale from '${name}/locales/fr';

const events: EventInput[] = [{ title: 'Seminar', start: '2026-11-03T10:00:00', end: '2026-11-03T11:00:00', extendedProps: { room: 7 } }];
const feed: EventSourceInput = { url: '/api/events#week', extraParams: { calendar: 7 }, failure: (error: Error) => {
  if (error instanceof JsonRequestError) console.warn(error.response.status);
} };
const options: CalendarOptions = { initialView: 'timeGridWeek', timeZone: 'America/New_York', locale: frLocale, editable: true, selectable: true };

export function Schedule(props: { onPick(event: EventApi): void }) {
  const calendar = useRef<CalendarRef>(null);
  const label: string = formatDate('2026-11-03', { month: 'long', day: 'numeric' });
  return <FullCalendar ref={calendar} plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, classicThemePlugin]} {...options}
    eventSources={[events, feed]} headerToolbar={{ start: 'prev,next today', center: 'title', end: label }}
    eventClick={(info: EventClickInfo) => props.onPick(info.event)}
    select={(info: DateSelectInfo) => calendar.current?.getApi().unselect() ?? info.startStr}
    eventDrop={(info: EventDropInfo) => { if (!info.event.start) info.revert(); }} />;
}
`;
const results = {};
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fullcalendar-react-types-'));
try {
  for (const [library, name] of [['upstream', '@fullcalendar/react'], ['vpm', 'vfullcalendar-react']]) {
    const root = path.join(directory, library), nodeModules = path.join(root, 'node_modules');
    fs.mkdirSync(path.join(nodeModules, '@types'), {recursive: true});
    fs.mkdirSync(path.join(nodeModules, '@fullcalendar'), {recursive: true});
    fs.mkdirSync(path.join(nodeModules, '@full-ui'), {recursive: true});
    const links = {'@types/react': path.join(modules, '@types/react'), '@types/react-dom': path.join(modules, '@types/react-dom'), csstype: path.join(modules, 'csstype'),
      react: path.join(modules, 'react'), 'react-dom': path.join(modules, 'react-dom')};
    if (library === 'upstream') Object.assign(links, {'@fullcalendar/react': path.join(modules, '@fullcalendar/react'), '@fullcalendar/core': path.join(modules, '@fullcalendar/core'),
      '@full-ui/headless-calendar': path.join(modules, '@full-ui/headless-calendar'), 'temporal-polyfill': path.join(modules, 'temporal-polyfill')});
    else for (const pkg of ['vfullcalendar-react', 'vfullcalendar-core', 'vfull-ui-headless-calendar']) links[pkg] = path.join(packages, pkg);
    for (const [link, target] of Object.entries(links)) fs.symlinkSync(target, path.join(nodeModules, link), 'dir');
    const file = path.join(root, 'schedule.tsx');
    fs.writeFileSync(file, app(name));
    for (const [version, tsc] of Object.entries(compilers)) {
      const result = compile({files: [file], compilerOptions: {strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext',
        moduleResolution: 'Bundler', jsx: 'react-jsx', types: [], typeRoots: [path.join(nodeModules, '@types')], preserveSymlinks: true, skipLibCheck: false}}, tsc);
      results[`${library} ${version}`] = result.output.split('\n').filter(line => /error TS/.test(line)).map(line => line.replace(directory, '').slice(0, 300));
    }
  }
} finally {
  fs.rmSync(directory, {recursive: true, force: true});
}
for (const [key, errors] of Object.entries(results)) if (errors.length) console.log(key, errors.slice(0, 5));
for (const version of Object.keys(compilers)) assert.deepEqual(results['vpm ' + version], [], 'vpm ' + version);
console.log(`FullCalendar React declarations: an application using the calendar, plugins, locale, option and callback types compiles against VPM with TypeScript ${Object.keys(compilers).join(', ')}${Object.keys(compilers).every(v => results['upstream ' + v].length === 0) ? ', as against the original' : '; the original reports ' + Object.keys(compilers).map(v => results['upstream ' + v].length + ' errors with ' + v).join(', ')}.`);
module.exports.results = results;
