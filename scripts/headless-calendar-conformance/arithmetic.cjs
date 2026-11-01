'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
(async () => {
  const upstream = await import(path.join(__dirname, 'node_modules/@full-ui/headless-calendar/index.js'));
  const vpm = await import('../../packages/vfull-ui-headless-calendar/index.js');
  const locale = {codes: ['en-US'], week: {dow: 0, doy: 1}, simpleNumberFormat: new Intl.NumberFormat('en-US'), options: {}};
  const make = lib => new lib.DateEnv({timeZone: 'UTC', calendarSystem: 'gregory', locale});
  const oldEnv = make(upstream), newEnv = make(vpm);
  let seed = 1234567, checked = 0;
  const random = limit => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) % limit);
  const same = (left, right, name) => {assert.deepEqual(left, right, name); checked++;};
  for (let i = 0; i < 2500; i++) {
    const a = new Date(Date.UTC(1600 + random(600), random(12), 1 + random(28), random(24), random(60), random(60), random(1000)));
    const b = new Date(+a + random(3000000000) - 1500000000);
    for (const name of ['diffWeeks','diffDays','diffHours','diffMinutes','diffSeconds','diffWholeDays','diffWholeWeeks','diffDayAndTime']) same(vpm[name](a,b), upstream[name](a,b), name);
    for (const name of ['startOfDay','startOfHour','startOfMinute','startOfSecond','dateToUtcArray','dateToLocalArray','formatDayString','formatIsoMonthStr','formatIsoTimeString']) same(vpm[name](a), upstream[name](a), name);
    const amount = random(100) - 50;
    for (const name of ['addWeeks','addDays','addMs']) same(vpm[name](a,amount), upstream[name](a,amount), name);
    for (const [dow,doy] of [[0,1],[1,4],[6,12]]) same(vpm.weekOfYear(a,dow,doy), upstream.weekOfYear(a,dow,doy), 'week');
    const input = {years: random(3)-1, months: random(25)-12, weeks: random(3), days: random(31), hours: random(24), minutes: random(60), milliseconds: random(1000)};
    const duration = upstream.createDuration(input);
    same(vpm.createDuration(input), duration, 'duration');
    for (const name of ['add','subtract']) same(newEnv[name](a,duration), oldEnv[name](a,duration), name);
    for (const name of ['diffWholeYears','diffWholeMonths','greatestWholeUnit']) same(newEnv[name](a,b), oldEnv[name](a,b), name);
    same(newEnv.countDurationsBetween(a,b,duration), oldEnv.countDurationsBetween(a,b,duration), 'duration count');
    for (const name of ['asRoughMs','asRoughDays','asRoughMonths','asRoughYears','greatestDurationDenominator']) same(vpm[name](duration), upstream[name](duration), name);
    for (const text of [a.toISOString(), a.toISOString().replace(/[-:]/g,''), a.toISOString().slice(0,10), a.toISOString().replace('Z','+05:30')]) same(vpm.parseMarker(text), upstream.parseMarker(text), 'parse '+text);
    const range = {start:a,end:new Date(+a+3000000000)}, other = {start:b,end:new Date(+b+2000000000)};
    for (const name of ['intersectRanges','rangesEqual','rangesIntersect','rangeContainsRange']) same(vpm[name](range,other),upstream[name](range,other),name);
  }
  console.log(`${checked} deterministic arithmetic, duration, range and parsing comparisons match 7.1.3.`);
})().catch(error => {console.error(error); process.exitCode=1;});
